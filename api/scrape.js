// Vercel serverless function: fetches a job posting URL server-side and extracts
// role/company/salary, mirroring the bookmarklet's extraction logic but without
// the CORS restrictions a browser would hit.
//
// Hardening (Tier 1): requires a signed-in caller (JWT-verified, same pattern as
// delete-account.js — ties usage to an account instead of leaving this an open
// public proxy), SSRF blocklist (rejects private/internal targets), DNS-rebinding
// protection (the validated IP is pinned for the actual connection instead of
// letting fetch() re-resolve independently), manual redirect re-validation,
// request timeout, response-size cap, and a lightweight in-instance rate limiter.
import dns from "node:dns/promises";
import net from "node:net";
import { Agent } from "undici";
import { createClient } from "@supabase/supabase-js";

// URL + anon key are both public by design (already shipped to the browser in
// src/supabase.js) — only used here to verify the caller's JWT via Supabase's
// auth server, no elevated privileges needed for that.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mugglrshrdgrpisidcur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11Z2dscnNocmRncnBpc2lkY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDIxODUsImV4cCI6MjA5NTk3ODE4NX0.11_wpfaSTfZBSI7My7UJS0tM3IBU_8wzuKH_fQXpJB8";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000; // ~1.5 MB
const MAX_REDIRECTS = 4;

// --- Rate limiting (per-IP, best-effort; resets on cold start) ---
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hits = new Map(); // ip -> number[] (timestamps)

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

// --- SSRF protection ---
function deny(status, message) {
  const e = new Error(message);
  e.httpStatus = status;
  return e;
}

function ipIsPrivate(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0) return true;            // "this" network
    if (p[0] === 10) return true;           // private
    if (p[0] === 127) return true;          // loopback
    if (p[0] === 169 && p[1] === 254) return true; // link-local + cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // private
    if (p[0] === 192 && p[1] === 168) return true; // private
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true;           // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80")) return true;            // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/); // IPv4-mapped
    if (mapped) return ipIsPrivate(mapped[1]);
    return false;
  }
  return true; // unrecognized -> treat as unsafe
}

// Returns the URL plus the exact IP that was validated as safe, so the caller
// can pin the actual TCP connection to it — resolving again inside fetch()
// would let a malicious DNS server (TTL=0 "rebinding") pass this check with a
// public IP and then hand the real connection a private/internal one.
async function assertSafeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw deny(400, "Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw deny(400, "Only http(s) URLs are allowed");
  }
  const host = u.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw deny(400, "URL not allowed");
  }
  if (net.isIP(host)) {
    if (ipIsPrivate(host)) throw deny(400, "URL not allowed");
    return { u, pinnedIp: host, family: net.isIPv6(host) ? 6 : 4 };
  }
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw deny(400, "Could not resolve host");
  }
  if (!addrs.length || addrs.some((a) => ipIsPrivate(a.address))) {
    throw deny(400, "URL not allowed");
  }
  return { u, pinnedIp: addrs[0].address, family: addrs[0].family };
}

// Fetch with manual redirect handling so each hop is re-validated against the
// SSRF blocklist (a public URL must not be able to redirect us internally).
async function safeFetch(startUrl) {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const { u, pinnedIp, family } = await assertSafeUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    // Pin the connection to the exact IP we just validated (SNI/Host stay on
    // the original hostname via the dispatcher's own TLS handling — only the
    // TCP-level DNS resolution is overridden).
    const dispatcher = new Agent({
      connect: { lookup: (_hostname, _options, callback) => callback(null, pinnedIp, family) },
    });
    let resp;
    try {
      resp = await fetch(u.href, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "manual",
        signal: controller.signal,
        dispatcher,
      });
    } catch (e) {
      throw deny(502, e.name === "AbortError" ? "Upstream timed out" : "Failed to fetch URL");
    } finally {
      clearTimeout(timer);
    }
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) return resp;
      current = new URL(loc, u.href).href; // resolve relative redirects
      continue;
    }
    return resp;
  }
  throw deny(502, "Too many redirects");
}

async function readCapped(resp) {
  const declared = Number(resp.headers.get("content-length"));
  if (declared && declared > MAX_BYTES) throw deny(502, "Response too large");
  const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
  if (!reader) return await resp.text();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_BYTES) {
      reader.cancel().catch(() => {});
      break; // keep what we have; head of the document is enough for extraction
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many requests, slow down a moment." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Missing authorization token." });
    return;
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    return;
  }

  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: "Missing or invalid url parameter" });
    return;
  }

  let html;
  try {
    const resp = await safeFetch(url);
    if (!resp.ok) {
      res.status(502).json({ error: `Fetch failed with status ${resp.status}` });
      return;
    }
    html = await readCapped(resp);
  } catch (e) {
    res.status(e.httpStatus || 502).json({ error: e.message || "Failed to fetch URL" });
    return;
  }

  let role = "", company = "", salaryMin = "", salaryMax = "";

  // JSON-LD JobPosting
  const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const arr = Array.isArray(data) ? data : (Array.isArray(data["@graph"]) ? data["@graph"] : [data]);
      for (const d of arr) {
        if (d && d["@type"] === "JobPosting") {
          role = d.title || role;
          company = (d.hiringOrganization && d.hiringOrganization.name) || company;
          const bs = d.baseSalary && (d.baseSalary.value || d.baseSalary);
          if (bs) {
            if (bs.minValue != null) salaryMin = bs.minValue;
            if (bs.maxValue != null) salaryMax = bs.maxValue;
            if (bs.value != null && !salaryMin && !salaryMax) salaryMin = salaryMax = bs.value;
          }
        }
      }
    } catch {}
  }

  function meta(name) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
    const m = html.match(re) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`, "i"));
    return m ? m[1] : "";
  }

  if (!role) {
    role = meta("og:title");
    if (!role) {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      role = m ? m[1].trim() : "";
    }
    role = role.replace(/\s*[|\-–]\s*(LinkedIn|Indeed.*|Glassdoor.*)$/i, "").trim();
  }
  if (!company) company = meta("og:site_name");

  if (!salaryMin && !salaryMax) {
    const text = html.replace(/<[^>]+>/g, " ");
    const m = text.match(/\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?\s?[kK])\s*(?:-|–|to)\s*\$?\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?\s?[kK])/);
    if (m) {
      const parse = s => /k$/i.test(s) ? Math.round(parseFloat(s) * 1000) : Math.round(parseFloat(s.replace(/,/g, "")));
      salaryMin = parse(m[1]);
      salaryMax = parse(m[2]);
    }
  }

  const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  res.status(200).json({
    role: decode(role).slice(0, 200),
    company: decode(company).slice(0, 120),
    salaryMin: salaryMin || "",
    salaryMax: salaryMax || "",
  });
}

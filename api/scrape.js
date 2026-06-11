// Vercel serverless function: fetches a job posting URL server-side and extracts
// role/company/salary, mirroring the bookmarklet's extraction logic but without
// the CORS restrictions a browser would hit.
export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: "Missing or invalid url parameter" });
    return;
  }

  let html;
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) {
      res.status(502).json({ error: `Fetch failed with status ${resp.status}` });
      return;
    }
    html = await resp.text();
  } catch (e) {
    res.status(502).json({ error: "Failed to fetch URL" });
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

// Vercel serverless function: permanently deletes the authenticated user's account.
//
// Security model:
//   - JWT-verified: the caller's identity is read from their access token via the
//     Supabase auth server, never from client-supplied input, so a user can only
//     ever delete themselves.
//   - Service-role key stays server-only (never shipped to the browser).
//
// Deletion order matters: public.jobs and public.user_data both have foreign keys
// to auth.users(id). The data rows are removed FIRST, then the auth user — this is
// correct under every on-delete behavior (RESTRICT would otherwise block the user
// delete; CASCADE just makes the explicit row-deletes redundant).
import { createClient } from "@supabase/supabase-js";

// URL is public (already in src/supabase.js); only the service-role key is secret,
// so Jin only needs to set SUPABASE_SERVICE_ROLE_KEY in Vercel to enable this.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://mugglrshrdgrpisidcur.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!SERVICE_KEY) {
    res.status(500).json({ error: "Account deletion isn't configured on the server yet." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Missing authorization token." });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller from the token itself — the token is the source of truth for
  // whose account gets deleted.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    return;
  }
  const uid = userData.user.id;

  const { error: jobsErr } = await admin.from("jobs").delete().eq("user_id", uid);
  if (jobsErr) {
    res.status(500).json({ error: "Couldn't delete your job data. Nothing was removed — please try again." });
    return;
  }

  const { error: dataErr } = await admin.from("user_data").delete().eq("user_id", uid);
  if (dataErr) {
    res.status(500).json({ error: "Couldn't delete your account data. Please try again." });
    return;
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    // Data rows are already gone at this point; surface a distinct message so a
    // rare partial failure is recoverable via support rather than silently "done".
    res.status(500).json({ error: "Your data was removed, but we couldn't fully close the login. Please contact support to finish." });
    return;
  }

  res.status(200).json({ ok: true });
}

import { useState, useEffect, useRef, useId } from "react";
import { supabase } from './supabase';
import { useSwipeGesture } from './useSwipeGesture';
import { initAnalytics, track, identifyUser, setPersonProps, resetAnalytics } from './analytics';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ── Icon system — Lucide-style inline strokes replacing emoji in nav/primary actions ──
function Icon({ name, size = 18, style }) {
  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round", strokeLinejoin:"round", style, "aria-hidden":true };
  switch (name) {
    case "inbox": return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>;
    case "briefcase": return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>;
    case "sun": return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "moon": return <svg {...common}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>;
    case "bell": return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>;
    case "archive": return <svg {...common}><rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" /></svg>;
    case "trash": return <svg {...common}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
    case "pencil": return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
    case "sliders": return <svg {...common}><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-1" /><circle cx="15" cy="6" r="2" /><circle cx="7" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
    case "x": return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    default: return null;
  }
}

// ── Skeleton loading screen — replaces "Loading your data…" text ────────────────
function SkeletonScreen() {
  return (
    <div style={{ padding:"1rem", maxWidth:1200, margin:"0 auto" }}>
      <div className="skeleton" style={{ height:64, marginBottom:20 }} />
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:48, flex:"1 1 120px" }} />)}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ border:"1px solid var(--border)", borderRadius:10, padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
            <div className="skeleton" style={{ height:14, width:"45%" }} />
            <div className="skeleton" style={{ height:11, width:"65%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, style, required, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        style={{ ...style, paddingRight:38 }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        onMouseDown={e => e.preventDefault()}
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{ position:"absolute", right:4, top:0, bottom:0, background:"none", border:"none", padding:"0 8px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)" }}>
        {visible ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

const STATUS_CONFIG = {
  "Applied":      { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
  "Phone Screen": { bg: "#FAEEDA", text: "#633806", border: "#FAC775" },
  "Interview":    { bg: "#EEEDFE", text: "#3C3489", border: "#CECBF6" },
  "Offer":        { bg: "#EAF3DE", text: "#27500A", border: "#C0DD97" },
  "Rejected":     { bg: "#FCEBEB", text: "#791F1F", border: "#F7C1C1" },
  "Withdrawn":    { bg: "#F1EFE8", text: "#444441", border: "#D3D1C7" },
};
const STATUS_CONFIG_DARK = {
  "Applied":      { bg: "#1a3550", text: "#7BB8F0", border: "#2d5580" },
  "Phone Screen": { bg: "#3d2b10", text: "#FAC775", border: "#5c4020" },
  "Interview":    { bg: "#252350", text: "#B5B0F8", border: "#3c3a80" },
  "Offer":        { bg: "#1a3010", text: "#90C855", border: "#2a5020" },
  "Rejected":     { bg: "#3d1515", text: "#F08080", border: "#5c2525" },
  "Withdrawn":    { bg: "#282828", text: "#B0AFA8", border: "#3c3c3a" },
};

// ── Tags config ───────────────────────────────────────────────────────────────
const TAG_CONFIG = {
  workType:  { label:"Work type",  values:["Remote","Hybrid","On-site"],          bg:"#E6F1FB", text:"#0C447C", border:"#B5D4F4" },
  industry:  { label:"Industry",   values:["Tech","Finance","Healthcare","Education","Retail","Gov/Non-profit","Other"], bg:"#EEEDFE", text:"#3C3489", border:"#CECBF6" },
  source:    { label:"Source",     values:["LinkedIn","Indeed","Referral","Company site","Recruiter","Other"], bg:"#EAF3DE", text:"#27500A", border:"#C0DD97" },
};
const TAG_CONFIG_DARK = {
  workType:  { ...TAG_CONFIG.workType,  bg:"#1a3550", text:"#7BB8F0", border:"#2d5580" },
  industry:  { ...TAG_CONFIG.industry,  bg:"#252350", text:"#B5B0F8", border:"#3c3a80" },
  source:    { ...TAG_CONFIG.source,    bg:"#1a3010", text:"#90C855", border:"#2a5020" },
};
// Legacy aliases so existing references keep working
const TAG_OPTIONS = TAG_CONFIG;
const TAG_COLORS  = Object.fromEntries(Object.entries(TAG_CONFIG).map(([k,v]) => [k, {bg:v.bg,text:v.text,border:v.border}]));

// ── Theme-aware color helpers ─────────────────────────────────────────────────
// _isDark is set synchronously at the top of the App render so all child
// components read the correct theme during the same render pass.
let _isDark = localStorage.getItem("dark_mode") === "true";
const isDark = () => _isDark;
const getStatusCfg = (s) => ((isDark() ? STATUS_CONFIG_DARK : STATUS_CONFIG)[s] || {});
const getTagColors = (cat) => {
  const cfg = (isDark() ? TAG_CONFIG_DARK : TAG_CONFIG)[cat];
  return cfg ? { bg: cfg.bg, text: cfg.text, border: cfg.border } : { bg:"#f5f5f5", text:"#555", border:"#ddd" };
};

function TagBadge({ category, value }) {
  const c = getTagColors(category);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:6, padding:"2px 6px", fontSize:11, fontWeight:500, whiteSpace:"nowrap" }}>
      {value}
    </span>
  );
}

function TagSelector({ tags = {}, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {Object.entries(TAG_OPTIONS).map(([cat, cfg]) => (
        <div key={cat}>
          <div style={{ fontSize:12, color:"var(--text-secondary)", fontWeight:500, marginBottom:6 }}>{cfg.label}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {cfg.values.map(v => {
              const active = tags[cat] === v;
              const c = getTagColors(cat);
              return (
                <button key={v} onClick={() => onChange({ ...tags, [cat]: active ? "" : v })}
                  style={{ fontSize:12, padding:"4px 12px", borderRadius:6, cursor:"pointer", fontWeight:500,
                    background: active ? c.bg : "var(--surface-hover)", color: active ? c.text : "var(--text-secondary)",
                    border: `1.5px solid ${active ? c.border : "var(--border)"}` }}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const INTERVIEW_STATUSES = ["Phone Screen", "Interview"];
const STATUS_STEPS = ["Applied", "Phone Screen", "Interview", "Offer"]; // linear pipeline for the stepper (TERMINAL_STATUSES declared below)
let FOLLOWUP_DAYS = { "Applied": 7, "Phone Screen": 3, "Interview": 3 };

const EMPTY = {
  id: null, role: "", company: "", link: "", salaryMin: "", salaryMax: "",
  dateApplied: "", status: "Applied", contact: "", customFollowup: "", notes: "",
  createdAt: null, updatedAt: null, lastStatus: null, timeline: [], interviewDate: "",
  interviewTime: "",
  interest: 0,
  tags: {}, prepChecklist: [], archived: false, followupDismissed: false,
  offerBase: "", offerBonus: "", offerEquity: "", offerStartDate: "", offerDeadline: "", offerNotes: "",
  documentIds: [],
};

// Document library: resumes, cover letters, portfolios, etc. live in one array
// (persisted to the legacy `resumes` column) and are tagged by `type`. Entries
// created before types existed have no `type` and default to "Resume".
const DOC_TYPES = ["Resume", "Cover letter", "Portfolio", "Other"];
const docType = d => d.type || "Resume";
// A job's attached document ids — migrates the legacy single `resumeId`.
const jobDocIds = job => job.documentIds || (job.resumeId != null ? [job.resumeId] : []);

// Brand mark: a message bubble with an up arrow (a follow-up is a message; the
// arrow is the "up" in Followup). On light surfaces it sits on the blue→indigo
// gradient tile; pass `onDark` for the gradient header (white glyph, faint tile).
// Mirrors public/favicon.svg — keep the two in sync if the mark changes.
function FollowupMark({ size = 32, onDark = false }) {
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display:"block", flexShrink:0 }}>
      {onDark ? (
        <rect width="64" height="64" rx="15" fill="#ffffff" opacity="0.16" />
      ) : (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#185FA5" />
              <stop offset="1" stopColor="#3C3489" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="15" fill={`url(#${gid})`} />
        </>
      )}
      <rect x="16" y="16" width="32" height="22" rx="6.5" fill="none" stroke="#fff" strokeWidth="3.4" />
      <path d="M24 38 L21 45 L29 38" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 33 V22" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M27 27 L32 22 L37 27" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PREP_DEFAULTS = {
  "Phone Screen": [
    "Research the company (mission, products, recent news)",
    "Review the job description thoroughly",
    "Prepare your 60-second career summary",
    "Write 3 questions to ask the recruiter",
    "Check your LinkedIn profile is up to date",
  ],
  "Interview": [
    "Research the company deeply (competitors, culture, financials)",
    "Prepare 5+ STAR story examples",
    "Practice answers to common interview questions",
    "Prepare thoughtful questions for the team",
    "Plan logistics (location, time, parking / virtual setup)",
    "Review your resume and be ready to speak to every line",
  ],
};

// Only render user-supplied links (job postings, documents, spreadsheet cells)
// as real <a href> when the scheme is http(s) — blocks javascript:/data: URIs
// smuggled in via a malicious JSON backup or CSV import from turning into
// stored XSS when someone clicks "View job" / "View file".
function isSafeUrl(url) {
  if (!url) return false;
  try { return /^https?:$/i.test(new URL(url, window.location.href).protocol); } catch { return false; }
}

function formatTime12(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
// Contact subtitle ("Title @ Company") — skips the company half if the title already names it
// (e.g. a title typed as "Senior TA Partner @ Walmart"), so it never renders "@ Walmart @ Walmart".
function contactSubtitle(c) {
  const title = (c.title||"").trim();
  const company = (c.company||"").trim();
  if (title && company && title.toLowerCase().includes(company.toLowerCase())) return title;
  return [title, company].filter(Boolean).join(" @ ");
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateInNDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function startOfWeekDate() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; }
function followupsSentThisWeek(jobsList) {
  const weekStart = startOfWeekDate();
  return jobsList.reduce((sum, j) => sum + (j.timeline||[]).filter(e => e.notes==="Follow-up sent" && new Date(e.date) >= weekStart).length, 0);
}
function daysAgoStr(dateStr) {
  if (!dateStr) return "";
  const d = Math.floor((new Date() - new Date(dateStr + "T00:00:00")) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function getFollowupStatus(job) {
  if (!job.dateApplied) return null;
  if (job.archived) return null;
  if (job.followupDismissed) return null;
  const applied = new Date(job.dateApplied + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const days = FOLLOWUP_DAYS[job.status];
  if (!days) return null;
  let dueDate = job.customFollowup ? new Date(job.customFollowup + "T00:00:00") : new Date(applied);
  if (!job.customFollowup) dueDate.setDate(dueDate.getDate() + days);
  const diff = Math.floor((dueDate - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, urgent: true, diff };
  if (diff === 0) return { label: "Follow up today", urgent: true, diff };
  if (diff <= 2) return { label: `Follow up in ${diff}d`, urgent: false, diff };
  return null;
}

// Returns the effective follow-up due date string (YYYY-MM-DD) for a job, or null.
function getFollowupDate(job) {
  if (!job.dateApplied || !FOLLOWUP_DAYS[job.status] || job.followupDismissed || job.archived) return null;
  if (job.customFollowup) return job.customFollowup;
  const d = new Date(job.dateApplied + "T00:00:00");
  d.setDate(d.getDate() + FOLLOWUP_DAYS[job.status]);
  return d.toISOString().slice(0, 10);
}

let STALE_DAYS = 14;
// Lets Settings override the follow-up cadence + cold-flag threshold (synced from App, like _isDark).
function applyFollowupSettings(appliedDays, warmDays, staleDays) {
  const a = appliedDays > 0 ? appliedDays : 7;
  const w = warmDays > 0 ? warmDays : 3;
  FOLLOWUP_DAYS = { "Applied": a, "Phone Screen": w, "Interview": w };
  STALE_DAYS = staleDays > 0 ? staleDays : 14;
}
const ACTIVE_STATUSES = new Set(["Applied", "Phone Screen", "Interview"]);

function lastActivity(job) {
  const tl = (job.timeline || []).filter(e => e.date);
  if (!tl.length) return null;
  // Sort descending by date to find the most recent
  const sorted = [...tl].sort((a, b) => b.date.localeCompare(a.date));
  const entry = sorted[0];
  // Build a human label
  const isInitialApply = !entry.type && entry.status === "Applied" && !entry.notes;
  const label = entry.type === "manual"
    ? (entry.label || "Note")
    : entry.notes
      ? entry.notes
      : entry.status || "Update";
  const ago = timeAgo(entry.date);
  return { label, ago, isInitialApply };
}

// Timestamp of a job's most recent real activity — the latest timeline event,
// falling back to when it was added. Deliberately ignores updatedAt, which gets
// bumped by silent edits (snooze, interest, etc.) that aren't "activity".
function activityTime(job) {
  const tl = (job.timeline || []).filter(e => e.date).map(e => e.date);
  if (tl.length) { tl.sort(); return tl[tl.length - 1]; }
  return job.createdAt || job.dateApplied || "";
}

const TERMINAL_STATUSES = ["Rejected", "Withdrawn"];
// Date a job entered a terminal (Rejected/Withdrawn) status, else null.
function terminalSince(job) {
  if (!TERMINAL_STATUSES.includes(job.status)) return null;
  const tl = (job.timeline || []).filter(e => e.date && TERMINAL_STATUSES.includes(e.status)).map(e => e.date);
  if (tl.length) { tl.sort(); return tl[tl.length - 1]; }
  return job.updatedAt || job.createdAt || null;
}

function hasOutreach(job) {
  return (job.timeline || []).some(e =>
    (e.notes && e.notes.toLowerCase().includes("follow-up sent")) ||
    (e.type === "manual" && e.label && /contact|reach|message|email|call|recruiter|linkedin|outreach/i.test(e.label + " " + (e.notes || "")))
  );
}

function isStale(job) {
  if (!ACTIVE_STATUSES.has(job.status)) return false;
  const ref = job.updatedAt || job.createdAt;
  if (!ref) return false;
  return Math.floor((Date.now() - new Date(ref)) / 86400000) >= STALE_DAYS;
}


function StaleBadge() {
  const c = getStatusCfg("Withdrawn");
  return <span style={{ background:c.bg, color:c.text, border:`0.5px solid ${c.border}`, borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:500, whiteSpace:"nowrap" }}>Stale</span>;
}

function FollowupBadge({ info }) {
  if (!info) return null;
  const c = getStatusCfg(info.urgent ? "Rejected" : "Phone Screen");
  return <span style={{ background:c.bg, color:c.text, border:`0.5px solid ${c.border}`, borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:500, whiteSpace:"nowrap" }}>{info.label}</span>;
}

function FollowupActions({ job, onUpdateJob, onWin }) {
  const [open, setOpen] = useState(false);
  const fu = getFollowupStatus(job);
  if (!fu) return null;

  function snooze(days) {
    onUpdateJob(job.id, { customFollowup: dateInNDays(days) });
    track("followup_snoozed", { days });
    setOpen(false);
  }
  function logOutreach() {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    onUpdateJob(job.id, {
      customFollowup: dateInNDays(resetDays),
      timeline: [...(job.timeline||[]), { id:crypto.randomUUID(), status:job.status, date:now, notes:"Follow-up sent" }],
    });
    track("draft_actioned", { action:"mark_contacted_no_draft" });
    onWin?.();
    setOpen(false);
  }
  function dismiss() {
    onUpdateJob(job.id, { followupDismissed: true });
    track("followup_dismissed");
    setOpen(false);
  }

  return (
    <span style={{ position:"relative", display:"inline-flex" }}>
      <span onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ ...(() => { const c = getStatusCfg(fu.urgent ? "Rejected" : "Phone Screen"); return { background:c.bg, color:c.text, border:`0.5px solid ${c.border}` }; })(), borderRadius:6, padding:"2px 6px", fontSize:10, fontWeight:500, whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" }}>
        {fu.label} ▾
      </span>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }} />
          <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:100, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px", boxShadow:"0 4px 16px rgba(0,0,0,0.14)", display:"flex", flexDirection:"column", gap:6, minWidth:155 }}>
            <button onClick={logOutreach} style={{ fontSize:11, padding:"5px 10px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap", textAlign:"left" }}>
              ✓ Contacted
            </button>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={() => snooze(3)} title="Remind me in 3 days" style={{ flex:1, fontSize:11, padding:"8px 4px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44 }}>+3d</button>
              <button onClick={() => snooze(7)} title="Remind me in 7 days" style={{ flex:1, fontSize:11, padding:"8px 4px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44 }}>+7d</button>
              <button onClick={dismiss} title="Stop reminding me" style={{ flex:1, fontSize:11, padding:"8px 4px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44 }}>✕</button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

// ── Supabase data helpers ─────────────────────────────────────────────────────
let _uid = null; // set by App on auth change
let _addSource = "manual"; // set right before opening the Add-job modal from a non-manual entry point

// Tracks job IDs from the last load/save so saveJobs can detect deletions.
let _lastJobIds = new Set();

async function loadUserData() {
  if (!_uid) return { jobs: [], tasks: [], contacts: [], resumes: [], settings: null };
  const [{ data: jobsData, error: jobsErr }, { data: userData, error: udErr }] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', _uid),
    // maybeSingle: returns null (not an error) when the user has no user_data row yet,
    // so brand-new accounts load fine while real query errors still surface below.
    supabase.from('user_data').select('tasks,contacts,resumes,settings').eq('user_id', _uid).maybeSingle(),
  ]);
  // Treat any query error as a failure rather than silently falling back to empty —
  // otherwise a later save would write that empty state back over the real data.
  if (jobsErr || udErr) throw new Error((jobsErr || udErr).message || 'Failed to load data');
  const jobs = jobsData || [];
  _lastJobIds = new Set(jobs.map(j => j.id));
  return { jobs, tasks: userData?.tasks || [], contacts: userData?.contacts || [], resumes: userData?.resumes || [], settings: userData?.settings || null };
}

// Set by App so saveJobs/saveTasks can report status to the UI.
let _onSaveStatus = null;
function setSaveStatusHandler(fn) { _onSaveStatus = fn; }

function saveJobs(jobs) {
  if (!_uid) return;
  _onSaveStatus?.("saving");
  const currentIds = new Set(jobs.map(j => j.id));
  const removedIds = [..._lastJobIds].filter(id => !currentIds.has(id));
  const rows = jobs.map(j => ({ ...j, user_id: _uid }));
  Promise.all([
    rows.length > 0 ? supabase.from('jobs').upsert(rows) : Promise.resolve({ error: null }),
    removedIds.length > 0 ? supabase.from('jobs').delete().in('id', removedIds) : Promise.resolve({ error: null }),
  ]).then(([upsertRes, deleteRes]) => {
    const error = upsertRes.error || deleteRes.error;
    if (!error) _lastJobIds = currentIds;
    _onSaveStatus?.(error ? "error" : "saved");
  });
}

function saveTasks(tasks) {
  if (!_uid) return;
  _onSaveStatus?.("saving");
  supabase.from('user_data').upsert({ user_id: _uid, tasks, updated_at: new Date().toISOString() }).then(({ error }) => {
    _onSaveStatus?.(error ? "error" : "saved");
  });
}

function saveContacts(contacts) {
  if (!_uid) return;
  _onSaveStatus?.("saving");
  supabase.from('user_data').upsert({ user_id: _uid, contacts, updated_at: new Date().toISOString() }).then(({ error }) => {
    _onSaveStatus?.(error ? "error" : "saved");
  });
}

// Persisted to the legacy `resumes` column, which now holds all document types.
function saveDocuments(documents) {
  if (!_uid) return;
  _onSaveStatus?.("saving");
  supabase.from('user_data').upsert({ user_id: _uid, resumes: documents, updated_at: new Date().toISOString() }).then(({ error }) => {
    _onSaveStatus?.(error ? "error" : "saved");
  });
}

// Account-level preferences (follow-up timing, auto-archive, name) — synced across devices.
function saveSettings(settings) {
  if (!_uid) return;
  _onSaveStatus?.("saving");
  supabase.from('user_data').upsert({ user_id: _uid, settings, updated_at: new Date().toISOString() }).then(({ error }) => {
    _onSaveStatus?.(error ? "error" : "saved");
  });
}

function applyStatusChange(jobs, id, newStatus, interviewDate, interviewTime) {
  const now = new Date().toISOString();
  return jobs.map(j => {
    if (j.id !== id) return j;
    const tl = j.timeline || [];
    const newTimeline = tl.find(e => e.status === newStatus) ? tl : [...tl, { status: newStatus, date: now, notes: "" }];
    // Auto-populate prep checklist defaults when first reaching an interview stage
    let prepChecklist = j.prepChecklist || [];
    const defaults = PREP_DEFAULTS[newStatus];
    if (defaults && prepChecklist.length === 0) {
      prepChecklist = defaults.map((text, i) => ({ id: `${newStatus}-${i}`, text, done: false }));
    }
    return {
      ...j, status: newStatus, updatedAt: now, lastStatus: { status: newStatus, at: now },
      timeline: newTimeline, prepChecklist,
      ...(interviewDate !== undefined ? { interviewDate } : {}),
      ...(interviewTime !== undefined ? { interviewTime } : {}),
    };
  });
}

function applyNotesChange(jobs, id, notes, timeline, prepChecklist) {
  const now = new Date().toISOString();
  return jobs.map(j => j.id === id ? {
    ...j,
    ...(notes !== null ? { notes } : {}),
    ...(timeline !== undefined && timeline !== null ? { timeline } : {}),
    ...(prepChecklist !== undefined ? { prepChecklist } : {}),
    updatedAt: now,
  } : j);
}

// ── Undo toast ────────────────────────────────────────────────────────────────
function UndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t); }, [message]);
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#222", color:"#fff", borderRadius:10, padding:"12px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", zIndex:300, fontSize:13, whiteSpace:"nowrap" }}>
      <span>{message}</span>
      <button onClick={onUndo} style={{ fontSize:12, padding:"4px 12px", background:"#fff", color:"#222", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Undo</button>
      <button onClick={onDismiss} style={{ fontSize:12, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}><Icon name="x" size={14} /></button>
    </div>
  );
}

// ── Weekly goal ring ──────────────────────────────────────────────────────────
function WeeklyGoalRing({ count, goal }) {
  const pct = goal > 0 ? Math.min(1, count / goal) : 0;
  const r = 16, circumference = 2 * Math.PI * r;
  const dash = circumference * pct;
  const hit = count >= goal && goal > 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink:0 }} aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={hit?getStatusCfg("Offer").text:"#185FA5"} strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" transform="rotate(-90 20 20)" />
      </svg>
      <div style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.4 }}>
        <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:12 }}>{count} of {goal}</div>
        <div>follow-ups this week</div>
      </div>
    </div>
  );
}

// ── Wins toast — momentum copy, not gamification ────────────────────────────────
function WinsToast({ message, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t); }, [message]);
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", maxWidth:360, width:"calc(100% - 32px)", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:10, padding:"11px 16px", boxShadow:"0 4px 20px rgba(0,0,0,0.15)", zIndex:300, fontSize:13, fontWeight:500, textAlign:"center" }}>
      {message}
    </div>
  );
}

// ── The 60-second aha: draft demo after job #1 ─────────────────────────────────
function AhaDemoBanner({ job, onSeeDraft, onDismiss }) {
  const fuDate = getFollowupDate(job);
  const fuLabel = fuDate ? new Date(fuDate + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "the right day";
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:420, background:"#0B1F38", color:"#fff", borderRadius:12, padding:"14px 16px", boxShadow:"0 4px 24px rgba(0,0,0,0.25)", zIndex:300, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:13, lineHeight:1.5 }}>
        <b>{job.company}</b> is tracked ✓. Followup will nudge you on <b>{fuLabel}</b> and draft the email.
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button onClick={onDismiss} style={{ fontSize:12, padding:"6px 12px", background:"rgba(255,255,255,0.12)", color:"#fff", border:"none", borderRadius:6, cursor:"pointer" }}>Not now</button>
        <button onClick={onSeeDraft} style={{ fontSize:12, padding:"6px 14px", background:"#fff", color:"#0B1F38", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>See the draft now →</button>
      </div>
    </div>
  );
}

// ── Interview date prompt ─────────────────────────────────────────────────────
function InterviewDatePrompt({ status, job, anchorRef, onConfirm, onSkip }) {
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("10:00");
  const ref = useRef(null);
  const [pos, setPos] = useState({ top:0, left:0 });
  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    }
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onSkip(); }
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onSkip]);

  function buildCalUrl() {
    const [h, m] = time.split(":").map(Number);
    const endH = String(h + 1).padStart(2, "0");
    const startDt = date.replace(/-/g, "") + "T" + String(h).padStart(2,"0") + String(m).padStart(2,"0") + "00";
    const endDt   = date.replace(/-/g, "") + "T" + endH + String(m).padStart(2,"0") + "00";
    const title   = encodeURIComponent(`${status} – ${job?.company || ""}`);
    const details = encodeURIComponent(`Role: ${job?.role || ""}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&details=${details}`;
  }

  return (
    <div ref={ref} style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:500, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", padding:"14px 16px", width:270 }}>
      <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:8 }}>{status} date & time</div>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex:3, fontSize: window.innerWidth<640?16:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 8px", boxSizing:"border-box" }} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ flex:2, fontSize: window.innerWidth<640?16:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 8px", boxSizing:"border-box" }} />
      </div>
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap" }}>
        <button onClick={onSkip} style={{ fontSize:12, padding:"8px 10px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44 }}>Skip</button>
        <button onClick={() => onConfirm(date, time)} style={{ fontSize:12, padding:"8px 10px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>Save</button>
        <a href={buildCalUrl()} target="_blank" rel="noreferrer"
          onClick={() => onConfirm(date, time)}
          style={{ fontSize:12, padding:"8px 10px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:500, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, minHeight:44 }}>
          📅 + Calendar
        </a>
      </div>
    </div>
  );
}

// ── Status select ─────────────────────────────────────────────────────────────
function StatusSelect({ job, onChange }) {
  const [prompt, setPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const cfg = getStatusCfg(job.status);
  const anchorRef = useRef(null);
  function handleChange(e) {
    const s = e.target.value;
    if (INTERVIEW_STATUSES.includes(s)) { setPendingStatus(s); setPrompt(true); }
    else onChange(s, "", "");
  }
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <select ref={anchorRef} value={job.status} onChange={handleChange} style={{ fontSize:12, fontWeight:500, padding:"2px 6px", borderRadius:6, cursor:"pointer", background:cfg.bg, color:cfg.text, border:`1.5px solid ${cfg.border}` }}>
        {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
      </select>
      {prompt && <InterviewDatePrompt status={pendingStatus} job={job} anchorRef={anchorRef} onConfirm={(date, time) => { onChange(pendingStatus, date, time); setPrompt(false); }} onSkip={() => { onChange(pendingStatus, "", ""); setPrompt(false); }} />}
    </div>
  );
}

// ── Status stepper (DetailPanel) ──────────────────────────────────────────────
// Horizontal progress track over the 4 pipeline stages. Tapping a stage sets that
// status (prompting for a date on Phone Screen / Interview). Rejected & Withdrawn
// are terminal side-states shown as a separate control, not on the track.
function StatusStepper({ job, onChange }) {
  const [prompt, setPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const anchorRef = useRef(null);
  const isTerminal = TERMINAL_STATUSES.includes(job.status);
  const currentIdx = STATUS_STEPS.indexOf(job.status);

  function pick(s) {
    if (s === job.status) return;
    if (INTERVIEW_STATUSES.includes(s)) { setPendingStatus(s); setPrompt(true); }
    else onChange(s, "", "");
  }

  return (
    <div>
      <div ref={anchorRef} style={{ display:"flex", alignItems:"stretch", gap:4 }}>
        {STATUS_STEPS.map((s, i) => {
          const cfg = getStatusCfg(s);
          const done = !isTerminal && i <= currentIdx;
          const isCurrent = !isTerminal && i === currentIdx;
          return (
            <button key={s} onClick={() => pick(s)} title={s}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:0, minHeight:44 }}>
              <div style={{ width:"100%", height:6, borderRadius:3, background: done ? cfg.border : "var(--border)" }} />
              <span style={{ fontSize:10, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? cfg.text : (done ? "var(--text-secondary)" : "var(--text-muted)"), textAlign:"center", lineHeight:1.2 }}>{s}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:6, marginTop:8, alignItems:"center", flexWrap:"wrap" }}>
        {TERMINAL_STATUSES.map(s => {
          const cfg = getStatusCfg(s);
          const active = job.status === s;
          return (
            <button key={s} onClick={() => onChange(s, "", "")}
              style={{ fontSize:11, padding:"5px 10px", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:32,
                background: active ? cfg.bg : "var(--surface)", color: active ? cfg.text : "var(--text-muted)",
                border: `1.5px solid ${active ? cfg.border : "var(--border)"}` }}>
              {s === "Rejected" ? "❌" : "↩️"} {s}
            </button>
          );
        })}
      </div>
      {prompt && <InterviewDatePrompt status={pendingStatus} job={job} anchorRef={anchorRef} onConfirm={(date, time) => { onChange(pendingStatus, date, time); setPrompt(false); }} onSkip={() => { onChange(pendingStatus, "", ""); setPrompt(false); }} />}
    </div>
  );
}

// ── Notes popover ─────────────────────────────────────────────────────────────
function NotesPopover({ job, onSave, onClose }) {
  const [text, setText] = useState(job.notes || "");
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} style={{ position:"absolute", zIndex:50, top:"100%", left:0, marginTop:4, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"12px", width:280 }}>
      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>Notes: {job.company} · {job.role}</div>
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={5} style={{ width:"100%", fontSize:12, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 8px", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }} />
      <div style={{ display:"flex", gap:6, marginTop:8, justifyContent:"flex-end" }}>
        <button onClick={onClose} style={{ fontSize:12, padding:"4px 10px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>Cancel</button>
        <button onClick={() => { onSave(text); onClose(); }} style={{ fontSize:12, padding:"4px 10px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Save</button>
      </div>
    </div>
  );
}

function NotesButton({ job, onSave }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button onClick={() => setOpen(o => !o)} style={{ fontSize:11, padding:"2px 8px", borderRadius:6, cursor:"pointer", fontWeight:400, background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>{job.notes ? "Notes ✎" : "Add note"}</button>
      {open && <NotesPopover job={job} onSave={onSave} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ── Timeline (unified compact + full) ────────────────────────────────────────
function Timeline({ timeline, onUpdate, compact = false }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ label:"", date:todayStr(), notes:"" });

  // Sort all entries chronologically; manual entries have an `id` field.
  // The first status reached always leads the timeline — manual entries (pinned
  // to noon) can otherwise sort ahead of a same-day status set later in the day.
  const genesis = (timeline||[]).find(e => e.type !== "manual");
  const sorted = [...(timeline||[])].sort((a,b) => {
    if (a === genesis) return -1;
    if (b === genesis) return 1;
    return (a.date||"").localeCompare(b.date||"");
  });
  const dot = compact ? 10 : 12;
  const trackW = compact ? 20 : 24;
  const gap = compact ? 10 : 12;

  function entryKey(e) { return e.id || e.status; }

  function saveNotes(key) {
    onUpdate((timeline||[]).map(e => entryKey(e)===key ? { ...e, notes:draft } : e));
    setEditing(null);
  }

  function deleteEntry(key) { onUpdate((timeline||[]).filter(e => entryKey(e) !== key)); }

  function addEntry() {
    if (!newEntry.label.trim() || !newEntry.date) return;
    const e = { id:crypto.randomUUID(), type:"manual", label:newEntry.label.trim(), date:new Date(newEntry.date+"T12:00:00").toISOString(), notes:newEntry.notes };
    onUpdate([...(timeline||[]), e]);
    setNewEntry({ label:"", date:todayStr(), notes:"" });
    setAddOpen(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, ...(compact ? { paddingTop:4 } : {}) }}>
      {sorted.length===0 && !addOpen && (
        <div style={{ fontSize: compact?12:13, color:"var(--text-muted)", fontStyle:"italic", padding: compact?"8px 0":"2rem 0", textAlign: compact?"left":"center" }}>
          No timeline entries yet.
        </div>
      )}

      {sorted.map((entry, i) => {
        const isManual = entry.type === "manual";
        const cfg = isManual
          ? { bg:"var(--surface-hover)", text:"var(--text-secondary)", border:"var(--border)" }
          : getStatusCfg(entry.status);
        const key = entryKey(entry);
        const isEditing = editing === key;
        const label = isManual ? entry.label : entry.status;

        return (
          <div key={key} style={{ display:"flex", gap }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:trackW, flexShrink:0 }}>
              <div style={{ width:dot, height:dot, borderRadius:"50%",
                background: isManual ? "var(--text-muted)" : cfg.border,
                border:`2px solid ${isManual ? "var(--border)" : cfg.text}`,
                marginTop: compact ? 3 : 4, flexShrink:0 }} />
              {i < sorted.length - 1 && <div style={{ width:2, flex:1, background:"var(--border)", marginTop:2 }} />}
            </div>
            <div style={{ flex:1, paddingBottom: i < sorted.length - 1 ? (compact?14:20) : (compact?4:0) }}>
              <div style={{ display:"flex", alignItems:"center", gap: compact?6:8, marginBottom: compact?4:6, flexWrap:"wrap" }}>
                <span style={{ fontSize: compact?11:12, fontWeight:500, background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`, borderRadius: compact?5:6, padding: compact?"1px 6px":"2px 8px" }}>{label}</span>
                <span style={{ fontSize: compact?10:11, color:"var(--text-muted)" }}>{fmtDate(entry.date)}</span>
                {compact ? (
                  <div style={{ marginLeft:"auto", display:"flex", gap:3, alignItems:"center" }}>
                    {isEditing && <button onClick={() => saveNotes(key)} style={{ fontSize:10, padding:"1px 7px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:4, cursor:"pointer" }}>Save</button>}
                    {isEditing && <button onClick={() => setEditing(null)} style={{ fontSize:10, padding:"1px 7px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:4, cursor:"pointer" }}>Cancel</button>}
                    {!isEditing && <button onClick={() => deleteEntry(key)} style={{ fontSize:10, padding:"1px 6px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:4, cursor:"pointer" }} title="Delete entry">✕</button>}
                  </div>
                ) : (
                  <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                    {isEditing && <button onClick={() => saveNotes(key)} style={{ fontSize:11, padding:"2px 8px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:6, cursor:"pointer" }}>Save</button>}
                    {isEditing && <button onClick={() => setEditing(null)} style={{ fontSize:11, padding:"2px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>Cancel</button>}
                    {!isEditing && <button onClick={() => deleteEntry(key)} style={{ fontSize:11, padding:"2px 8px", background:"var(--surface-hover)", color:"#A32D2D", border:"1px solid #F09595", borderRadius:6, cursor:"pointer" }}>Delete</button>}
                  </div>
                )}
              </div>
              {isEditing
                ? <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onBlur={() => saveNotes(key)}
                    rows={3} placeholder={`Notes for "${label}"...`}
                    style={{ width:"100%", fontSize:12, border:"1px solid #B5D4F4", borderRadius:6, padding:"6px 8px", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
                : <div onClick={() => { setEditing(key); setDraft(entry.notes||""); }}
                    style={{ fontSize:12, color:entry.notes?"var(--text-secondary)":"var(--text-placeholder)", lineHeight:1.5, fontStyle:entry.notes?"normal":"italic", cursor:"text", padding:"5px 8px", borderRadius:6, minHeight:32, background:"var(--surface-subtle)" }}
                    title="Click to edit">
                    {entry.notes || "Click to add notes..."}
                  </div>
              }
            </div>
          </div>
        );
      })}

      {/* Add entry */}
      {addOpen ? (
        <div style={{ marginTop:sorted.length?10:0, padding:"10px 12px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.04em" }}>New entry</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <input autoFocus type="text" placeholder="e.g. Reached out to recruiter" value={newEntry.label}
              onChange={e => setNewEntry(n=>({...n,label:e.target.value}))}
              onKeyDown={e => e.key==="Enter" && addEntry()}
              style={{ flex:"2 1 160px", fontSize:12, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", background:"var(--input-bg)", color:"var(--text-primary)" }} />
            <input type="date" value={newEntry.date} onChange={e => setNewEntry(n=>({...n,date:e.target.value}))}
              style={{ flex:"1 1 120px", fontSize:12, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", background:"var(--input-bg)", color:"var(--text-primary)" }} />
          </div>
          <textarea placeholder="Notes (optional)" value={newEntry.notes} onChange={e => setNewEntry(n=>({...n,notes:e.target.value}))} rows={2}
            style={{ width:"100%", fontSize:12, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", background:"var(--input-bg)", color:"var(--text-primary)" }} />
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
            <button onClick={() => { setAddOpen(false); setNewEntry({ label:"", date:todayStr(), notes:"" }); }}
              style={{ fontSize:12, padding:"3px 10px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>Cancel</button>
            <button onClick={addEntry} disabled={!newEntry.label.trim()}
              style={{ fontSize:12, padding:"3px 10px", background:newEntry.label.trim()?"#185FA5":"#ccc", color:"#fff", border:"none", borderRadius:6, cursor:newEntry.label.trim()?"pointer":"default", fontWeight:500 }}>Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddOpen(true)}
          style={{ alignSelf:"flex-start", fontSize:11, padding:"3px 10px", background:"var(--surface-hover)", color:"#185FA5", border:"1px solid #B5D4F4", borderRadius:6, cursor:"pointer", marginTop: sorted.length?8:0 }}>
          + Add entry
        </button>
      )}
    </div>
  );
}

// ── Inline notes ──────────────────────────────────────────────────────────────
function InlineNotes({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  function save(val) { onSave(val); setEditing(false); }
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>{label}</div>
      {editing
        ? <>
            <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => save(draft)} rows={4} placeholder="Write your notes here..." style={{ width:"100%", fontSize:12, border:"1px solid #B5D4F4", borderRadius:6, padding:"6px 8px", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", outline:"none" }} />
            <div style={{ display:"flex", gap:6, marginTop:4, justifyContent:"flex-end" }}>
              <button onClick={() => save(draft)} style={{ fontSize:11, padding:"2px 8px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:4, cursor:"pointer" }}>Save</button>
              <button onClick={() => { setDraft(value); setEditing(false); }} style={{ fontSize:11, padding:"2px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:4, cursor:"pointer" }}>Cancel</button>
            </div>
          </>
        : <div onClick={() => { setDraft(value); setEditing(true); }} style={{ fontSize:12, color:value?"var(--text-secondary)":"var(--text-placeholder)", lineHeight:1.6, fontStyle:value?"normal":"italic", cursor:"text", padding:"6px 8px", borderRadius:6, minHeight:36, background:"var(--surface-subtle)" }} title="Click to edit">
            {value || "Click to add notes..."}
          </div>
      }
    </div>
  );
}

// ── Prep checklist ────────────────────────────────────────────────────────────
function PrepChecklist({ job, onUpdate }) {
  const [newText, setNewText] = useState("");
  const checklist = job.prepChecklist || [];
  const done = checklist.filter(i => i.done).length;
  function toggle(id) { onUpdate(checklist.map(i => i.id === id ? { ...i, done: !i.done } : i)); }
  function remove(id) { onUpdate(checklist.filter(i => i.id !== id)); }
  function addItem() {
    const text = newText.trim();
    if (!text) return;
    onUpdate([...checklist, { id: `custom-${Date.now()}`, text, done: false }]);
    setNewText("");
  }
  function populateDefaults(status) {
    const defaults = PREP_DEFAULTS[status] || [];
    const newItems = defaults.filter(t => !checklist.some(i => i.text === t)).map((text, i) => ({ id: `${status}-${Date.now()}-${i}`, text, done: false }));
    onUpdate([...checklist, ...newItems]);
  }
  const hasPrepDefaults = PREP_DEFAULTS[job.status] && checklist.length === 0;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)" }}>Prep checklist</span>
        {checklist.length > 0 && (
          <span style={{ fontSize:11, background: done===checklist.length?getStatusCfg("Offer").bg:"var(--surface-hover)", color: done===checklist.length?getStatusCfg("Offer").text:"var(--text-muted)", border:`1px solid ${done===checklist.length?getStatusCfg("Offer").border:"var(--border)"}`, borderRadius:10, padding:"1px 7px", fontWeight:500 }}>{done}/{checklist.length}</span>
        )}
      </div>
      {hasPrepDefaults && (
        <button onClick={() => populateDefaults(job.status)} style={{ fontSize:12, padding:"5px 12px", background:getStatusCfg("Applied").bg, color:getStatusCfg("Applied").text, border:`1px solid ${getStatusCfg("Applied").border}`, borderRadius:6, cursor:"pointer", fontWeight:500, marginBottom:8, width:"100%" }}>
          + Load {job.status} prep items
        </button>
      )}
      {checklist.length === 0 && !hasPrepDefaults && (
        <div style={{ fontSize:12, color:"var(--text-muted)", fontStyle:"italic", marginBottom:6 }}>No items yet. Add one below.</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {checklist.map(item => (
          <div key={item.id} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"4px 6px", borderRadius:6, background:"var(--surface-subtle)", border:"1px solid var(--border-subtle)" }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)} style={{ marginTop:2, cursor:"pointer", accentColor:"#185FA5", flexShrink:0 }} />
            <span style={{ flex:1, fontSize:12, color:item.done?"var(--text-muted)":"var(--text-primary)", textDecoration:item.done?"line-through":"none", lineHeight:1.5 }}>{item.text}</span>
            <button onClick={() => remove(item.id)} style={{ fontSize:10, padding:0, background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", flexShrink:0, lineHeight:1 }} title="Remove">✕</button>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginTop:8 }}>
        <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key==="Enter" && addItem()} placeholder="Add a prep item..." style={{ flex:1, fontSize:12, border:"1px solid var(--border)", borderRadius:6, padding:"5px 8px", outline:"none" }} />
        <button onClick={addItem} disabled={!newText.trim()} style={{ fontSize:12, padding:"5px 10px", background:newText.trim()?"#185FA5":"#eee", color:newText.trim()?"#fff":"#aaa", border:"none", borderRadius:6, cursor:newText.trim()?"pointer":"default", fontWeight:500 }}>Add</button>
      </div>
    </div>
  );
}

// ── Panel reminders section ───────────────────────────────────────────────────
function PanelReminders({ job, tasks, onAddReminder, onTaskDone, onTaskDelete }) {
  const [open, setOpen] = useState(false);
  const today = todayStr();
  const linked = (tasks||[]).filter(t => t.jobId === job.id).sort((a,b) => (a.dueDate||"").localeCompare(b.dueDate||""));
  const upcoming = linked.filter(t => !t.done && t.dueDate >= today);
  const past     = linked.filter(t => t.done || t.dueDate < today);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: (linked.length||open) ? 8 : 0 }}>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)" }}>Reminders{upcoming.length>0?` (${upcoming.length})`:""}</span>
        <button onClick={() => setOpen(o=>!o)} style={{ fontSize:11, padding:"2px 9px", background:open?getStatusCfg("Applied").bg:"var(--surface-hover)", color:open?getStatusCfg("Applied").text:"var(--text-secondary)", border:`1px solid ${open?getStatusCfg("Applied").border:"var(--border)"}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>
          {open ? "✕ Cancel" : "+ Add"}
        </button>
      </div>
      {open && <ReminderMini job={job} onSave={(date,note) => { onAddReminder(job.id,date,note); setOpen(false); }} onClose={() => setOpen(false)} />}
      {upcoming.map(t => (
        <div key={t.id} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"5px 0", borderBottom:"0.5px solid var(--border-subtle)" }}>
          <input type="checkbox" checked={false} onChange={() => onTaskDone && onTaskDone(t.id)} style={{ cursor:"pointer", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <span style={{ color:"var(--text-primary)", fontWeight:500 }}>{t.text}</span>
            <span style={{ color: t.dueDate===today?getStatusCfg("Rejected").text:"var(--text-muted)", marginLeft:6, fontSize:11 }}>
              {t.dueDate===today ? "Today" : t.dueDate<today ? `Overdue · ${t.dueDate}` : t.dueDate}
            </span>
          </div>
          <button onClick={() => onTaskDelete && onTaskDelete(t.id)} style={{ fontSize:11, padding:"0 4px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", lineHeight:1 }} title="Remove">✕</button>
        </div>
      ))}
      {past.length>0 && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"var(--text-muted)", marginTop:4 }}>
          <span>{past.length} completed</span>
          <button onClick={() => past.forEach(t => onTaskDelete && onTaskDelete(t.id))} style={{ fontSize:11, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>Clear</button>
        </div>
      )}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function PanelSection({ label, count, defaultOpen = false, forceOpen, onOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  useEffect(() => { if (open && onOpen) onOpen(); }, [open]);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", borderTop:"1px solid var(--border)", padding:"10px 0 8px", cursor:"pointer", textAlign:"left" }}>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)" }}>{label}{count != null && count !== 0 ? <span style={{ marginLeft:6, fontSize:11, color:"var(--text-muted)", fontWeight:400 }}>({count})</span> : ""}</span>
        <span style={{ fontSize:10, color:"var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ paddingBottom:8 }}>{children}</div>}
    </div>
  );
}

function DetailPanel({ job, onClose, onSave, onDelete, onArchive, onRestore, onNotesSave, onStatusChange, onUpdateJob, tasks, onAddReminder, onTaskDone, onTaskDelete, contacts, onLinkContact, onUnlinkContact, onCreateContact, onOpenContact, documents, profileName, onLogOutreach, onLogReply }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [addingContact, setAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [showOverflow, setShowOverflow] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tab, setTab] = useState("overview"); // overview | activity | notes
  const [showDraft, setShowDraft] = useState(false);
  const [remindSignal, setRemindSignal] = useState(0);
  const isMobile = useIsMobile();

  function startEdit() {
    setForm({ ...job, tags: job.tags||{}, timeline: job.timeline||[], documentIds: jobDocIds(job) });
    setEditing(true);
  }
  function cancelEdit() { setEditing(false); }
  function saveEdit() {
    if (!form.role || !form.company) return;
    onSave(form);
    setEditing(false);
  }

  const fu = getFollowupStatus(job);
  const jobTags = job.tags || {};
  const activeTags = Object.entries(jobTags).filter(([,v]) => v);
  const timelineCount = (job.timeline || []).length;
  const checklistCount = (job.prepChecklist || []).length;
  const linkedTasks = (tasks||[]).filter(t => t.jobId === job.id).length;
  const linkedContacts = (contacts||[]).filter(c => (c.relatedJobIds||[]).includes(job.id));
  const availableContacts = (contacts||[]).filter(c => !(c.relatedJobIds||[]).includes(job.id));
  const showInterviewDate = editing && INTERVIEW_STATUSES.includes(form.status);

  const inputStyle = { fontSize: isMobile ? 16 : 13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };

  // Responsive shell: bottom sheet on mobile, right drawer (420px) on desktop.
  const shellStyle = isMobile
    ? { position:"fixed", left:0, right:0, bottom:0, top:"8vh", background:"var(--surface)", borderTop:"1px solid var(--border)", borderRadius:"16px 16px 0 0", zIndex:150, display:"flex", flexDirection:"column", boxShadow:"0 -4px 24px rgba(0,0,0,0.2)" }
    : { position:"fixed", top:0, right:0, bottom:0, width:420, background:"var(--surface)", borderLeft:"1px solid var(--border)", zIndex:150, display:"flex", flexDirection:"column", boxShadow:"-4px 0 20px rgba(0,0,0,0.12)" };

  const quickBtn = { display:"flex", alignItems:"center", justifyContent:"center", gap:5, flex:1, fontSize:12, padding:"9px 8px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:500, minHeight:44 };

  return (
    <>
      {isMobile && <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:149 }} />}
    <div className="detail-panel" style={shellStyle}>
      {/* Pinned header */}
      <div style={{ flexShrink:0 }}>
        {isMobile && <div style={{ display:"flex", justifyContent:"center", paddingTop:8 }}><div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.5)", position:"relative", top:8 }} /></div>}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:"linear-gradient(90deg,#185FA5 0%,#3C3489 100%)", borderRadius: isMobile ? "16px 16px 0 0" : 0 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, color:"#fff", fontWeight:700, marginBottom:2 }}>{job.company}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{job.role}</div>
            <div style={{ marginTop:7 }}><InterestStars value={job.interest||0} onChange={n=>onUpdateJob(job.id,{interest:n})} size={16} filledColor="#FFD37A" emptyColor="rgba(255,255,255,0.55)" showLabel /></div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", cursor:"pointer", borderRadius:6, padding:"2px 8px", flexShrink:0, minHeight:44, minWidth:44, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="x" size={16} /></button>
        </div>
        {!editing && (
          <div style={{ padding:"14px 20px 12px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:12, background:"var(--surface)" }}>
            {/* Status stepper */}
            <StatusStepper job={job} onChange={(s, d, t) => onStatusChange(job.id, s, d, t)} />
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              {fu && <FollowupBadge info={fu} />}
              {job.followupDismissed && (
                <span style={{ fontSize:10, color:"var(--text-muted)", background:"var(--surface-hover)", border:"1px solid var(--border)", borderRadius:6, padding:"2px 7px", display:"flex", alignItems:"center", gap:5 }}>
                  🔕 Reminders off
                  <button onClick={() => onUpdateJob(job.id, { followupDismissed: false })} style={{ fontSize:10, color:"#185FA5", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>Re-enable</button>
                </span>
              )}
            </div>
            {/* Quick actions */}
            {!job.archived && (
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { track("draft_opened", { job_status: job.status, source: "panel" }); setShowDraft(true); }} style={{ ...quickBtn, background:"#185FA5", color:"#fff", border:"1px solid #0C447C" }}><Icon name="pencil" size={13} /> Draft follow-up</button>
                <button onClick={() => { setTab("activity"); setRemindSignal(s => s + 1); }} style={quickBtn}><Icon name="bell" size={13} /> Remind</button>
              </div>
            )}
            {/* Tabs */}
            <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
              {[["overview","Overview"],["activity","Activity"],["notes","Notes"]].map(([key,label]) => (
                <button key={key} onClick={() => setTab(key)} style={{ flex:1, fontSize:12, padding:"8px 4px", border:"none", cursor:"pointer", fontWeight: tab===key?600:500, background: tab===key?"#185FA5":"var(--surface)", color: tab===key?"#fff":"var(--text-secondary)", minHeight:40 }}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:14, background:"var(--surface)" }}>
        {editing ? (
          /* ── Edit mode ── */
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Editing</div>
            {[["Company *","company"],["Role *","role"],["Job posting URL","link"],["Contact / recruiter","contact"]].map(([label,key]) => (
              <label key={key} style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>{label}
                <input type={key==="link"?"url":"text"} value={form[key]||""} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} style={inputStyle} />
              </label>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Salary min
                <input type="number" value={form.salaryMin||""} onChange={e=>setForm(f=>({...f,salaryMin:e.target.value}))} style={inputStyle} placeholder="90000" />
              </label>
              <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Salary max
                <input type="number" value={form.salaryMax||""} onChange={e=>setForm(f=>({...f,salaryMax:e.target.value}))} style={inputStyle} placeholder="120000" />
              </label>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Date applied
                <input type="date" value={form.dateApplied||""} onChange={e=>setForm(f=>({...f,dateApplied:e.target.value}))} style={inputStyle} />
              </label>
              <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Status
                <select value={form.status||"Applied"} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={inputStyle}>
                  {Object.keys(STATUS_CONFIG).map(s=><option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {showInterviewDate && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>{form.status} date
                  <input type="date" value={form.interviewDate||""} onChange={e=>setForm(f=>({...f,interviewDate:e.target.value}))} style={inputStyle} />
                </label>
                <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Time
                  <input type="time" value={form.interviewTime||""} onChange={e=>setForm(f=>({...f,interviewTime:e.target.value}))} style={inputStyle} />
                </label>
              </div>
            )}
            <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Custom follow-up date
              <input type="date" value={form.customFollowup||""} onChange={e=>setForm(f=>({...f,customFollowup:e.target.value}))} style={inputStyle} />
            </label>
            {documents && documents.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <span style={{ fontSize:13, color:"var(--text-secondary)" }}>Documents used</span>
                <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"8px 10px", border:"1px solid var(--input-border)", borderRadius:6, background:"var(--input-bg)" }}>
                  {DOC_TYPES.filter(t => documents.some(d => docType(d)===t)).map(t => (
                    <div key={t} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{t}</div>
                      {documents.filter(d => docType(d)===t).map(d => (
                        <label key={d.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-primary)", cursor:"pointer" }}>
                          <input type="checkbox" checked={(form.documentIds||[]).includes(d.id)}
                            onChange={e=>setForm(f=>{ const ids=new Set(f.documentIds||[]); if(e.target.checked)ids.add(d.id); else ids.delete(d.id); return {...f,documentIds:[...ids]}; })} />
                          {d.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {form.status === "Offer" && (
              <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"10px 12px", background:"var(--surface-subtle)", border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:getStatusCfg("Offer").text, textTransform:"uppercase", letterSpacing:"0.05em" }}>Offer details</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Base salary
                    <input type="number" value={form.offerBase||""} onChange={e=>setForm(f=>({...f,offerBase:e.target.value}))} style={inputStyle} placeholder="110000" />
                  </label>
                  <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Signing bonus
                    <input type="number" value={form.offerBonus||""} onChange={e=>setForm(f=>({...f,offerBonus:e.target.value}))} style={inputStyle} placeholder="10000" />
                  </label>
                </div>
                <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Equity
                  <input type="text" value={form.offerEquity||""} onChange={e=>setForm(f=>({...f,offerEquity:e.target.value}))} style={inputStyle} placeholder="e.g. $40,000 RSUs over 4 years" />
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Start date
                    <input type="date" value={form.offerStartDate||""} onChange={e=>setForm(f=>({...f,offerStartDate:e.target.value}))} style={inputStyle} />
                  </label>
                  <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Decision deadline
                    <input type="date" value={form.offerDeadline||""} onChange={e=>setForm(f=>({...f,offerDeadline:e.target.value}))} style={inputStyle} />
                  </label>
                </div>
                <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Benefits / notes
                  <textarea rows={2} value={form.offerNotes||""} onChange={e=>setForm(f=>({...f,offerNotes:e.target.value}))} style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit" }} placeholder="PTO, healthcare, remote policy, etc." />
                </label>
              </div>
            )}
            <div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:6 }}>Tags</div>
              <TagSelector tags={form.tags||{}} onChange={tags=>setForm(f=>({...f,tags}))} />
            </div>
          </div>
        ) : tab === "overview" ? (
          /* ── Overview tab ── */
          <>
            {activeTags.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {activeTags.map(([cat, val]) => <TagBadge key={cat} category={cat} value={val} />)}
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {[
                ["Date applied", job.dateApplied ? { display: job.dateApplied, sub: daysAgoStr(job.dateApplied) } : null],
                ["Salary", (job.salaryMin||job.salaryMax)?`${job.salaryMin?`$${parseInt(job.salaryMin).toLocaleString()}`:"?"} – ${job.salaryMax?`$${parseInt(job.salaryMax).toLocaleString()}`:"?"}`:null],
                ["Contact", job.contact],
                ["Interview date", job.interviewDate ? `${fmtDate(job.interviewDate+"T00:00:00")}${job.interviewTime ? ` · ${formatTime12(job.interviewTime)}` : ""}` : null],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label} style={{ display:"flex", gap:8, fontSize:12 }}>
                  <span style={{ color:"var(--text-muted)", minWidth:100 }}>{label}</span>
                  <span style={{ color:"var(--text-primary)", fontWeight:500 }}>
                    {val && typeof val === "object" ? <>{val.display} <span style={{ color:"var(--text-muted)", fontWeight:400 }}>· {val.sub}</span></> : val}
                  </span>
                </div>
              ))}
              {job.link && isSafeUrl(job.link) && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:100 }}>Posting</span><a href={job.link} target="_blank" rel="noreferrer" style={{ color:"#185FA5", textDecoration:"none", fontWeight:500 }}>View job ↗</a></div>}
              {jobDocIds(job).map(id => (documents||[]).find(d=>d.id===id)).filter(Boolean).map(d => (
                <div key={d.id} style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:100 }}>{docType(d)}</span>
                  {d.link && isSafeUrl(d.link) ? <a href={d.link} target="_blank" rel="noreferrer" style={{ color:"#185FA5", textDecoration:"none", fontWeight:500 }}>{d.name} ↗</a> : <span style={{ color:"var(--text-primary)", fontWeight:500 }}>{d.name}</span>}
                </div>
              ))}
              {job.createdAt && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:100 }}>Added</span><span style={{ color:"var(--text-muted)" }}>{timeAgo(job.createdAt)}</span></div>}
            </div>
            {(job.offerBase || job.offerBonus || job.offerEquity || job.offerStartDate || job.offerDeadline || job.offerNotes) && (
              <div style={{ display:"flex", flexDirection:"column", gap:7, padding:"10px 12px", background:"var(--surface-subtle)", border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:getStatusCfg("Offer").text, textTransform:"uppercase", letterSpacing:"0.05em" }}>Offer details</div>
                {[
                  ["Base salary", job.offerBase ? `$${parseInt(job.offerBase).toLocaleString()}` : null],
                  ["Signing bonus", job.offerBonus ? `$${parseInt(job.offerBonus).toLocaleString()}` : null],
                  ["Equity", job.offerEquity || null],
                  ["Start date", job.offerStartDate ? fmtDate(job.offerStartDate+"T00:00:00") : null],
                  ["Decision deadline", job.offerDeadline ? fmtDate(job.offerDeadline+"T00:00:00") : null],
                ].filter(([,v]) => v).map(([label,val]) => (
                  <div key={label} style={{ display:"flex", gap:8, fontSize:12 }}>
                    <span style={{ color:"var(--text-muted)", minWidth:110 }}>{label}</span>
                    <span style={{ color:"var(--text-primary)", fontWeight:500 }}>{val}</span>
                  </div>
                ))}
                {job.offerNotes && <div style={{ fontSize:12, color:"var(--text-secondary)", whiteSpace:"pre-wrap", lineHeight:1.5 }}>{job.offerNotes}</div>}
              </div>
            )}
            <PanelSection label="🤝 Contacts" count={linkedContacts.length || null} defaultOpen={linkedContacts.length > 0}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {linkedContacts.map(c => (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 8px", background:"var(--surface-subtle)", border:"1px solid var(--border-subtle)", borderRadius:6 }}>
                    <div onClick={() => onOpenContact(c)} style={{ cursor:"pointer", flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-primary)" }}>{c.name}</div>
                      {(c.title||c.company) && <div style={{ fontSize:11, color:"var(--text-muted)" }}>{contactSubtitle(c)}</div>}
                    </div>
                    <button onClick={() => onUnlinkContact(c.id)} title="Unlink" style={{ fontSize:11, padding:"6px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border-subtle)", borderRadius:4, cursor:"pointer", minHeight:44, minWidth:44 }}>✕</button>
                  </div>
                ))}
                {availableContacts.length > 0 && (
                  <select value="" onChange={e => { if (e.target.value) onLinkContact(Number(e.target.value)); }}
                    style={{ fontSize:12, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", background:"var(--input-bg)", color:"var(--text-primary)" }}>
                    <option value="">+ Link existing contact…</option>
                    {availableContacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company?` (${c.company})`:""}</option>)}
                  </select>
                )}
                {addingContact ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <input autoFocus type="text" placeholder="Contact name" value={newContactName} onChange={e=>setNewContactName(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter" && newContactName.trim()) { onCreateContact(newContactName.trim()); setNewContactName(""); setAddingContact(false); } if (e.key==="Escape") { setAddingContact(false); setNewContactName(""); } }}
                      style={{ fontSize: isMobile ? 16 : 12, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 8px", background:"var(--input-bg)", color:"var(--text-primary)", flex:1 }} />
                    <button onClick={() => { if (newContactName.trim()) { onCreateContact(newContactName.trim()); setNewContactName(""); setAddingContact(false); } }} style={{ fontSize:12, padding:"8px 10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>Add</button>
                    <button onClick={() => { setAddingContact(false); setNewContactName(""); }} style={{ fontSize:12, padding:"8px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44, minWidth:44 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setNewContactName(job.contact || ""); setAddingContact(true); }} style={{ fontSize:12, padding:"8px 8px", background:"none", color:"var(--accent)", border:"1px dashed var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, textAlign:"left", minHeight:44 }}>+ New contact</button>
                )}
              </div>
            </PanelSection>
          </>
        ) : tab === "activity" ? (
          /* ── Activity tab ── */
          <>
            <PanelSection label="📋 Timeline" count={timelineCount || null} defaultOpen={true}>
              <button onClick={() => onLogReply(job)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, padding:"5px 10px", marginBottom:8, background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500 }}>📨 Got a reply</button>
              <Timeline compact timeline={job.timeline} onUpdate={tl => onNotesSave(job.id, null, tl)} />
            </PanelSection>
            <PanelSection label="🔔 Reminders" count={linkedTasks || null} defaultOpen={linkedTasks > 0} forceOpen={remindSignal}>
              <PanelReminders job={job} tasks={tasks} onAddReminder={onAddReminder} onTaskDone={onTaskDone} onTaskDelete={onTaskDelete} />
            </PanelSection>
            <PanelSection label="✅ Prep checklist" count={checklistCount > 0 ? `${(job.prepChecklist||[]).filter(i=>i.done).length}/${checklistCount}` : null} defaultOpen={checklistCount > 0}>
              <PrepChecklist job={job} onUpdate={cl => onNotesSave(job.id, null, undefined, cl)} />
            </PanelSection>
          </>
        ) : (
          /* ── Notes tab ── */
          <InlineNotes label="General notes" value={job.notes || ""} onSave={notes => onNotesSave(job.id, notes, null)} />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--surface)", gap:8, flexWrap:"wrap" }}>
        {editing ? (
          <>
            <button onClick={cancelEdit} style={{ fontSize:13, padding:"8px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>Cancel</button>
            <button onClick={saveEdit} disabled={!form.role||!form.company} style={{ fontSize:13, padding:"8px 20px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500, marginLeft:"auto", minHeight:44 }}>Save changes</button>
          </>
        ) : (
          <>
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowOverflow(!showOverflow)} style={{ fontSize:14, padding:"8px 10px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>⋯</button>
              {showOverflow && (
                <div style={{ position:"absolute", top:50, left:0, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", zIndex:200, minWidth:150 }}>
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"10px 14px", fontSize:13, background:"none", color:getStatusCfg("Rejected").text, border:"none", cursor:"pointer", textAlign:"left", fontWeight:500, minHeight:44 }}><Icon name="trash" size={14} /> Delete</button>
                </div>
              )}
            </div>
            {showDeleteConfirm && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
                <div style={{ background:"var(--surface)", borderRadius:8, padding:"20px", maxWidth:300, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>Delete this job?</div>
                  <div style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.5 }}>This action cannot be undone.</div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => { setShowDeleteConfirm(false); setShowOverflow(false); }} style={{ fontSize:13, padding:"8px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>Cancel</button>
                    <button onClick={() => { onDelete(job.id); onClose(); }} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, padding:"8px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}><Icon name="trash" size={14} /> Delete</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
              {job.archived
                ? <button onClick={() => { onRestore(job.id); onClose(); }} style={{ fontSize:13, padding:"8px 14px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1.5px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>↩ Restore</button>
                : <button onClick={() => { onArchive(job.id); onClose(); }} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, padding:"8px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}><Icon name="archive" size={14} /> Archive</button>
              }
              {!job.archived && <button onClick={startEdit} style={{ fontSize:13, padding:"8px 16px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>Edit</button>}
            </div>
          </>
        )}
      </div>
    </div>
    {showDraft && (
      <DraftComposer job={job} profileName={profileName} onClose={() => setShowDraft(false)}
        onMarkContacted={() => { onLogOutreach(job); track("draft_actioned", { action:"mark_contacted" }); setShowDraft(false); }} />
    )}
    </>
  );
}

// ── Email templates ───────────────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    id: "followup",
    label: "Application follow-up",
    hint: "1–2 weeks after applying with no response",
    subject: (j) => `Following up on my ${j.role} application`,
    body: (j) => `Hi [Hiring Manager's name],

I wanted to follow up on my application for the ${j.role} position at ${j.company}. I remain very interested in this opportunity and would love to learn more about the next steps in your process.

Please let me know if you need any additional information from me.

Thank you for your time,
[Your name]`,
  },
  {
    id: "thankyou",
    label: "Post-interview thank you",
    hint: "Same day or next morning after any interview",
    subject: (j) => `Thank you for the ${j.role} interview`,
    body: (j) => `Hi [Interviewer's name],

Thank you for taking the time to speak with me about the ${j.role} role at ${j.company}. I really enjoyed our conversation and learning more about the team and what you're building.

I'm genuinely excited about this opportunity and look forward to hearing about next steps.

Best regards,
[Your name]`,
  },
  {
    id: "statuscheck",
    label: "Status update request",
    hint: "After interview with no update in 1+ weeks",
    subject: (j) => `Checking in on the ${j.role} role at ${j.company}`,
    body: (j) => `Hi [Name],

I hope you're doing well. I wanted to check in regarding the ${j.role} position at ${j.company} that I interviewed for. I remain very enthusiastic about the opportunity and would appreciate any update on your timeline.

Thank you for your consideration.

Best,
[Your name]`,
  },
  {
    id: "recruiter",
    label: "Recruiter outreach",
    hint: "Cold message to a recruiter about this role",
    subject: (j) => `Interested in ${j.role} at ${j.company}`,
    body: (j) => `Hi [Recruiter's name],

I came across the ${j.role} opening at ${j.company} and I'm very interested in learning more. My background aligns well with the requirements, and I'd love to connect briefly.

Would you have 15 minutes for a quick call this week?

Best,
[Your name]`,
  },
];

// ── Draft follow-up composer ───────────────────────────────────────────────────
function defaultTemplateId(status) {
  if (status === "Phone Screen" || status === "Interview") return "statuscheck";
  return "followup";
}

function fillDraft(text, profileName, contact) {
  let out = text;
  if (profileName) out = out.replace(/\[Your name\]/g, profileName);
  if (contact && !/@/.test(contact)) {
    out = out.replace(/\[(?:Hiring Manager's name|Interviewer's name|Recruiter's name|Hiring Manager|Name)\]/g, contact);
  }
  return out;
}

function DraftComposer({ job, profileName, onClose, onMarkContacted }) {
  const initial = EMAIL_TEMPLATES.find(t => t.id === defaultTemplateId(job.status)) || EMAIL_TEMPLATES[0];
  const [tplId, setTplId] = useState(initial.id);
  const [subject, setSubject] = useState(() => initial.subject(job));
  const [body, setBody] = useState(() => fillDraft(initial.body(job), profileName, job.contact));
  const [copied, setCopied] = useState(false);

  function pickTemplate(id) {
    const t = EMAIL_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setTplId(id);
    setSubject(t.subject(job));
    setBody(fillDraft(t.body(job), profileName, job.contact));
  }
  function copyAll() {
    navigator.clipboard.writeText(`${subject}\n\n${body}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    track("draft_actioned", { action:"copy" });
  }
  const mailto = `mailto:${/@/.test(job.contact || "") ? job.contact : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const chip = (active) => ({ fontSize:11, padding:"4px 10px", borderRadius:20, cursor:"pointer", fontWeight:500, whiteSpace:"nowrap",
    background: active ? getStatusCfg("Applied").bg : "var(--surface-hover)", color: active ? getStatusCfg("Applied").text : "var(--text-secondary)",
    border: `1px solid ${active ? getStatusCfg("Applied").border : "var(--border)"}` });
  const fieldStyle = { fontSize:13, padding:"8px 10px", border:"1px solid var(--input-border)", borderRadius:8, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const labelStyle = { fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6 };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", background:"var(--surface)", borderRadius:12, border:"1px solid var(--border)", boxShadow:"0 4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>📧</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>Draft follow-up</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.company} · {job.role}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", flexShrink:0, display:"flex" }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={labelStyle}>Template</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {EMAIL_TEMPLATES.map(t => <button key={t.id} onClick={() => pickTemplate(t.id)} style={chip(tplId === t.id)}>{t.label}</button>)}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Body</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={11} style={{ ...fieldStyle, resize:"vertical", lineHeight:1.6 }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 11px", border:"1px dashed var(--border)", borderRadius:8 }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>✨ Improve with AI: personalizes from your history</span>
            <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:10, background:"var(--surface-hover)", color:"var(--text-muted)", flexShrink:0 }}>Soon</span>
          </div>
        </div>
        <div style={{ padding:"12px 18px", borderTop:"1px solid var(--border)", display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={copyAll} style={{ fontSize:13, padding:"7px 12px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:500 }}>{copied ? "✓ Copied" : "Copy"}</button>
          <a href={mailto} onClick={() => track("draft_actioned", { action:"mailto" })} style={{ fontSize:13, padding:"7px 12px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:500, textDecoration:"none" }}>Open in email ↗</a>
          <button onClick={onMarkContacted} style={{ fontSize:13, padding:"7px 14px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>✓ Mark contacted</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ form, setForm, onSave, onClose, onDelete, isEdit }) {
  const [tab, setTab] = useState("details");
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetchState, setFetchState] = useState("idle"); // idle | loading | error
  const [errors, setErrors] = useState(new Set());
  const isMobile = useIsMobile();
  const showInterviewDate = INTERVIEW_STATUSES.includes(form.status);
  // On mobile, a fresh Add starts paste-first — the manual form collapses until fetch fails,
  // succeeds (for review), or the user asks for it. Desktop and Edit always show the full form.
  const [manualOpen, setManualOpen] = useState(!isMobile || isEdit);

  function handleSave() {
    const missing = [];
    if (!form.company || !form.company.trim()) missing.push("company");
    if (!form.role || !form.role.trim()) missing.push("role");
    if (missing.length) { setErrors(new Set(missing)); setTab("details"); setManualOpen(true); return; }
    setErrors(new Set());
    onSave();
  }

  async function fetchFromLink() {
    const url = fetchUrl.trim();
    if (!url) return;
    setFetchState("loading");
    try {
      const resp = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to fetch");
      setForm(f => ({
        ...f,
        link: url,
        role: data.role || f.role,
        company: data.company || f.company,
        salaryMin: data.salaryMin || f.salaryMin,
        salaryMax: data.salaryMax || f.salaryMax,
      }));
      setFetchState("idle");
      setManualOpen(true); // let them review/edit what came back
    } catch (e) {
      setFetchState("error");
      setManualOpen(true); // fall back to manual entry
    }
  }
  return (
    <div className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"1rem" }}>
      <div className="modal-inner" style={{ background:"var(--surface)", borderRadius:12, border:"0.5px solid var(--border)", padding:"1.5rem", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 1rem", fontWeight:500, fontSize:16, color:"var(--text-primary)" }}>{isEdit?"Edit application":"Add application"}</h3>
        <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", marginBottom:"1rem" }}>
          {["details","tags","timeline"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, fontSize:13, padding:"8px 10px", border:"none", cursor:"pointer", fontWeight:500, background:tab===t?"#185FA5":"var(--surface)", color:tab===t?"#fff":"var(--text-secondary)", textTransform:"capitalize", minHeight:44 }}>{t}</button>
          ))}
        </div>
        <style>{`.mf input,.mf select,.mf textarea{border:1px solid #bbb !important;border-radius:6px !important;padding:6px 10px !important;background:#fafafa !important;}.mf input:focus,.mf select:focus,.mf textarea:focus{border-color:#888 !important;outline:none !important;}.mf input.err{border-color:#D4453E !important;background:#FFF5F5 !important;}`}</style>

        {tab === "details" && (
          <div className="mf" style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {!isEdit && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, padding: isMobile&&!manualOpen ? "18px 14px" : "10px 12px", background: isMobile&&!manualOpen ? "#E6F1FB" : "var(--surface-subtle)", border:`1px solid ${isMobile&&!manualOpen?"#B5D4F4":"var(--border)"}`, borderRadius:8 }}>
                <label style={{ fontSize: isMobile&&!manualOpen ? 13 : 12, fontWeight:600, color: isMobile&&!manualOpen ? "#0C447C" : "var(--text-secondary)" }}>Paste a job posting link</label>
                <div style={{ display:"flex", gap:6 }}>
                  <input type="url" placeholder="https://..." value={fetchUrl} onChange={e=>setFetchUrl(e.target.value)} style={{ fontSize: isMobile ? 16 : 13, flex:1 }} />
                  <button type="button" onClick={fetchFromLink} disabled={fetchState==="loading"||!fetchUrl.trim()}
                    style={{ fontSize:12, padding:"8px 12px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor: fetchUrl.trim()?"pointer":"not-allowed", fontWeight:500, opacity: fetchState==="loading"?0.7:1, whiteSpace:"nowrap", minHeight:44 }}>
                    {fetchState==="loading" ? "Fetching…" : "Fetch details"}
                  </button>
                </div>
                {fetchState==="error" && <div style={{ fontSize:11, color:"#A32D2D" }}>Couldn't read that page automatically. Fill in the details manually below.</div>}
                {isMobile && !manualOpen && (
                  <button type="button" onClick={() => setManualOpen(true)} style={{ alignSelf:"flex-start", marginTop:4, fontSize:12, color:"#0C447C", background:"none", border:"none", textDecoration:"underline", cursor:"pointer", padding:0, fontWeight:500 }}>
                    or enter details manually
                  </button>
                )}
              </div>
            )}
            {manualOpen && (
              <>
                {[["Company *","company","text","e.g. Acme Corp"],["Role title *","role","text","e.g. Senior Product Manager"],["Job posting URL","link","url","https://..."],["Contact / recruiter","contact","text","Name or email"]].map(([label,key,type,ph]) => (
                  <label key={key} style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>{label}
                    <input type={type} placeholder={ph} value={form[key]} className={errors.has(key) ? "err" : undefined}
                      onChange={e => { const v=e.target.value; setForm(f => ({...f,[key]:v})); if (errors.has(key) && v.trim()) setErrors(p => { const n=new Set(p); n.delete(key); return n; }); }} style={{ fontSize: isMobile ? 16 : 13 }} />
                    {errors.has(key) && <span style={{ fontSize:11, color:"#D4453E", fontWeight:500 }}>This field is required.</span>}
                  </label>
                ))}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Salary min<input type="number" placeholder="90000" value={form.salaryMin} onChange={e => setForm(f=>({...f,salaryMin:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} /></label>
                  <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Salary max<input type="number" placeholder="120000" value={form.salaryMax} onChange={e => setForm(f=>({...f,salaryMax:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} /></label>
                </div>
                <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Interest
                  <div style={{ paddingTop:3 }}><InterestStars value={form.interest||0} onChange={n=>setForm(f=>({...f,interest:n}))} size={22} showLabel /></div>
                </label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Date applied<input type="date" value={form.dateApplied} onChange={e => setForm(f=>({...f,dateApplied:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} /></label>
                  <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Status
                    <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }}>
                      {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                {showInterviewDate && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>{form.status} date
                      <input type="date" value={form.interviewDate||""} onChange={e => setForm(f=>({...f,interviewDate:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} />
                    </label>
                    <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Time
                      <input type="time" value={form.interviewTime||""} onChange={e => setForm(f=>({...f,interviewTime:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} />
                    </label>
                  </div>
                )}
                <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>
                  Custom follow-up date <span style={{ fontWeight:400, color:"var(--text-secondary)" }}>(overrides auto)</span>
                  <input type="date" value={form.customFollowup} onChange={e => setForm(f=>({...f,customFollowup:e.target.value}))} style={{ fontSize: isMobile ? 16 : 13 }} />
                </label>
              </>
            )}
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"4px 0 0" }}>Notes can be added from the detail panel after saving.</p>
          </div>
        )}

        {tab === "tags" && (
          <div>
            <p style={{ fontSize:13, color:"var(--text-muted)", marginTop:0, marginBottom:16 }}>Categorize this job. Select one per category.</p>
            <TagSelector tags={form.tags || {}} onChange={tags => setForm(f => ({ ...f, tags }))} />
          </div>
        )}

        {tab === "timeline" && <Timeline timeline={form.timeline||[]} onUpdate={tl => setForm(f=>({...f,timeline:tl}))} />}

        {errors.size > 0 && <p style={{ fontSize:12, color:"#D4453E", fontWeight:500, margin:"14px 0 0", textAlign:"right" }}>Please fill in the required field{errors.size>1?"s":""} highlighted above.</p>}
        <div style={{ display:"flex", gap:8, marginTop: errors.size>0 ? "8px" : "1.25rem", justifyContent:"space-between", alignItems:"center" }}>
          {isEdit && <button onClick={onDelete} style={{ fontSize:13, padding:"8px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>Delete job</button>}
          <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
            <button onClick={onClose} style={{ fontSize:13, padding:"8px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>Cancel</button>
            <button onClick={handleSave} style={{ fontSize:13, padding:"8px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reminder mini-form (shared by ListCard + DetailPanel) ─────────────────────
function ReminderMini({ job, onSave, onClose }) {
  const [date, setDate] = useState(dateInNDays(1));
  const [note, setNote] = useState(`Follow up with ${job.company}`);
  const isMobile = useIsMobile();
  function save() { if (!date) return; onSave(date, note); onClose(); }
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", padding:"8px 10px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, marginTop:6 }}>
      <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:500, whiteSpace:"nowrap" }}>🔔 Remind me on</span>
      <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
        style={{ fontSize: isMobile ? 16 : 12, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px", background:"var(--input-bg)", color:"var(--text-primary)" }} />
      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        style={{ fontSize: isMobile ? 16 : 12, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 8px", flex:1, minWidth:120, background:"var(--input-bg)", color:"var(--text-primary)" }}
        onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") onClose(); }} />
      <button onClick={save} style={{ fontSize:12, padding:"6px 10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44, minWidth:44 }}>Set</button>
      <button onClick={onClose} style={{ padding:"6px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", minHeight:44, minWidth:44, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="x" size={14} /></button>
    </div>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────
// ── Interest rating (Low / Medium / High = 1 / 2 / 3 stars) ───────────────────
const INTEREST_LABELS = ["Set interest", "Low interest", "Medium interest", "High interest"];
function InterestStars({ value = 0, onChange, size = 14, filledColor = "#E8A317", emptyColor = "var(--text-muted)", showLabel = false }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const ro = !onChange;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: showLabel ? 6 : 1 }} title={INTEREST_LABELS[value]} onMouseLeave={() => setHover(0)}>
      <span style={{ display: "inline-flex", gap: 1 }}>
        {[1, 2, 3].map(n => (
          <span key={n}
            onClick={ro ? undefined : (e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
            onMouseEnter={ro ? undefined : () => setHover(n)}
            style={{ fontSize: size, lineHeight: 1, cursor: ro ? "default" : "pointer", color: n <= active ? filledColor : emptyColor, opacity: n <= active ? 1 : 0.5, userSelect: "none" }}>★</span>
        ))}
      </span>
      {showLabel && value > 0 && <span style={{ fontSize: 11, color: emptyColor, fontWeight: 500 }}>{["", "Low", "Medium", "High"][value]}</span>}
    </span>
  );
}

function ListCard({ job, isFirst, onEdit, onStatusChange, onNotesSave, onAddReminder, onUpdateJob, onDuplicate, onOpenPanel, onArchive, tasks, onWin }) {
  const fu = getFollowupStatus(job);
  const stale = isStale(job);
  const reminderCount = (tasks||[]).filter(t => t.jobId===job.id && !t.done).length;
  const [hovered, setHovered] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const hasTimeline = job.timeline && job.timeline.length > 0;
  const activeTags = Object.entries(job.tags || {}).filter(([,v]) => v);
  const isMobile = useIsMobile();

  // Swipe right = log a follow-up now (same effect as FollowupActions'
  // "✓ Contacted"); swipe left = archive. Mobile only — hover actions below
  // cover the desktop case.
  function swipeFollowUp() {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    onUpdateJob(job.id, {
      customFollowup: dateInNDays(resetDays),
      timeline: [...(job.timeline||[]), { id:crypto.randomUUID(), status:job.status, date:now, notes:"Follow-up sent" }],
    });
  }
  function swipeArchive() { onArchive?.(job.id); }
  const { ref: swipeRef, dx } = useSwipeGesture({
    onSwipeRight: swipeFollowUp,
    onSwipeLeft: swipeArchive,
    disabled: !isMobile || !onArchive,
  });

  // One-time swipe-affordance nudge on the first card, so the gesture discovers itself.
  const [hintDx, setHintDx] = useState(0);
  useEffect(() => {
    if (!isFirst || !isMobile || !onArchive) return;
    let seen = false;
    try { seen = localStorage.getItem("followup_swipe_hint_seen") === "1"; } catch {}
    if (seen) return;
    try { localStorage.setItem("followup_swipe_hint_seen", "1"); } catch {}
    const t1 = setTimeout(() => setHintDx(-26), 500);
    const t2 = setTimeout(() => setHintDx(18), 950);
    const t3 = setTimeout(() => setHintDx(0), 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isFirst, isMobile, onArchive]);
  const displayDx = dx !== 0 ? dx : hintDx;

  const btnStyle = (active) => { const ac = getStatusCfg("Applied"); return { fontSize:11, padding:"2px 8px", background:active?ac.bg:"var(--surface-hover)", color:active?ac.text:"var(--text-muted)", border:`1px solid ${active?ac.border:"var(--border)"}`, borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" }; };

  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      {isMobile && onArchive && (
        <div style={{ position:"absolute", inset:0, display:"flex" }}>
          <div style={{ width: Math.max(displayDx,0), background:getStatusCfg("Offer").bg, display:"flex", alignItems:"center", paddingLeft:16, overflow:"hidden", transition: dx===0 ? "width 0.4s ease-in-out" : "none" }}>
            <span style={{ fontSize:12, fontWeight:700, color:getStatusCfg("Offer").text, whiteSpace:"nowrap" }}>✓ Follow up</span>
          </div>
          <div style={{ flex:1 }} />
          <div style={{ width: Math.max(-displayDx,0), background:getStatusCfg("Rejected").bg, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:16, overflow:"hidden", transition: dx===0 ? "width 0.4s ease-in-out" : "none" }}>
            <span style={{ fontSize:12, fontWeight:700, color:getStatusCfg("Rejected").text, whiteSpace:"nowrap" }}>🗑 Archive</span>
          </div>
        </div>
      )}
    <div ref={swipeRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background:fu?.urgent?(isDark()?"#2d1a1a":"#FFF8F8"):"var(--surface)", padding:"12px 16px", position:"relative", transform: isMobile ? `translateX(${displayDx}px)` : undefined, transition: dx===0 ? "transform 0.4s ease-in-out" : "none" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>

        {/* Row 1: Company · Role · edit icon · Status · badges */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
          <span onClick={() => onOpenPanel && onOpenPanel(job)}
            style={{ fontSize:13, color:"var(--text-primary)", fontWeight:700, cursor:onOpenPanel?"pointer":"default" }}>
            {job.company}
          </span>
          <span onClick={() => onOpenPanel && onOpenPanel(job)}
            style={{ fontWeight:500, fontSize:14, color:"var(--accent)", cursor:"pointer" }}>
            {job.role}
          </span>
          <InterestStars value={job.interest||0} onChange={onUpdateJob ? (n=>onUpdateJob(job.id,{interest:n})) : undefined} size={13} />
          <StatusSelect job={job} onChange={(s, d, t) => onStatusChange(job.id, s, d, t)} />
          {onUpdateJob ? <FollowupActions job={job} onUpdateJob={onUpdateJob} onWin={onWin} /> : <FollowupBadge info={fu} />}
          {stale && !fu && <StaleBadge />}
        </div>

        {/* Row 2: Tags */}
        {activeTags.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {activeTags.map(([cat, val]) => <TagBadge key={cat} category={cat} value={val} />)}
          </div>
        )}

        {/* Row 3: Details — tightened */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"3px 14px", fontSize:12, color:"var(--text-secondary)" }}>
          {job.dateApplied && <span title={job.dateApplied}>Applied {daysAgoStr(job.dateApplied)}</span>}
          {job.interviewDate && <span style={{ color:getStatusCfg("Interview").text, fontWeight:500 }}>📅 {INTERVIEW_STATUSES.includes(job.status)?job.status:"Interview"}: {fmtDate(job.interviewDate+"T00:00:00")}{job.interviewTime ? ` · ${formatTime12(job.interviewTime)}` : ""}</span>}
          {(job.salaryMin||job.salaryMax) && <span>{job.salaryMin?`$${parseInt(job.salaryMin).toLocaleString()}`:"?"} – {job.salaryMax?`$${parseInt(job.salaryMax).toLocaleString()}`:"?"}</span>}
          {job.contact && <span>📇 {job.contact}</span>}
          {job.link && isSafeUrl(job.link) && <a href={job.link} target="_blank" rel="noreferrer" style={{ color:"var(--accent)", textDecoration:"none" }}>View posting ↗</a>}
        </div>

        {/* Row 4: Notes — inline, click to edit */}
        {notesEditing ? (
          <textarea autoFocus defaultValue={job.notes||""}
            onBlur={e => { onNotesSave(job.id, e.target.value, null); setNotesEditing(false); }}
            onKeyDown={e => { if (e.key==="Escape") setNotesEditing(false); }}
            style={{ fontSize:11, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", resize:"vertical", minHeight:50, background:"var(--input-bg)", color:"var(--text-primary)", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }} />
        ) : (
          <div onClick={() => setNotesEditing(true)}
            style={{ fontSize:11, fontStyle:"italic", cursor:"text", color: job.notes ? "var(--text-muted)" : "transparent", minHeight:14 }}>
            {job.notes || (hovered ? <span style={{ color:"var(--text-muted)", opacity:0.5 }}>Add notes…</span> : "")}
          </div>
        )}

        {/* Row 5: Last activity + hover actions */}
        <div style={{ paddingTop:5, borderTop:"0.5px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8, fontSize:11, color:"var(--text-muted)", minHeight:24 }}>
          {(() => {
            const act = lastActivity(job);
            if (!act) return job.createdAt ? <span>Added {timeAgo(job.createdAt)}</span> : null;
            if (act.isInitialApply) return <span style={{ fontStyle:"italic" }}>No activity beyond application</span>;
            const isContact = /follow.up|contact/i.test(act.label);
            return <span>Last: <span style={{ color:isContact?getStatusCfg("Offer").text:"var(--text-secondary)", fontWeight:500 }}>{isContact?"📤 ":"📋 "}{act.label}</span> · {act.ago}</span>;
          })()}
          {hovered && (
            <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
              <button onClick={() => { setReminderOpen(o=>!o); setTimelineOpen(false); }} title="Set a reminder" style={btnStyle(reminderOpen)}>🔔 Remind{reminderCount>0?` (${reminderCount})`:""}</button>
              {onDuplicate && <button onClick={() => onDuplicate(job)} title="Duplicate" style={btnStyle(false)}>⧉</button>}
              <button onClick={() => { setTimelineOpen(o=>!o); setReminderOpen(false); }} style={btnStyle(timelineOpen)}>
                {timelineOpen ? "▲ Hide" : `▼ Timeline${hasTimeline?` (${job.timeline.length})`:""}`}
              </button>
            </div>
          )}
        </div>

        {reminderOpen && <ReminderMini job={job} onSave={(date, note) => onAddReminder(job.id, date, note)} onClose={() => setReminderOpen(false)} />}
      </div>
      {timelineOpen && <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #e5e5e5" }}><Timeline compact timeline={job.timeline} onUpdate={tl => onNotesSave(job.id, null, tl)} /></div>}
    </div>
    </div>
  );
}

// ── Spreadsheet cell ──────────────────────────────────────────────────────────
function Cell({ value, type = "text", options, onChange, align = "left", style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  function commit() { onChange(draft); setEditing(false); }
  function handleKey(e) { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(value); setEditing(false); } }
  const cellStyle = { padding:"0 8px", height:34, display:"flex", alignItems:"center", borderRight:"1px solid var(--border)", cursor:"text", fontSize:13, justifyContent:align==="right"?"flex-end":"flex-start", background:editing?"var(--surface-subtle)":"transparent", outline:editing?"2px solid #185FA5":"none", outlineOffset:-2, minWidth:0, overflow:"hidden", ...style };
  if (editing) {
    if (type === "select") return <div style={cellStyle}><select ref={ref} value={draft} onChange={e => { onChange(e.target.value); setEditing(false); }} onBlur={commit} style={{ width:"100%", border:"none", background:"transparent", fontSize:13, outline:"none", cursor:"pointer" }}>{options.map(o => <option key={o} value={o}>{o||"-"}</option>)}</select></div>;
    return <div style={cellStyle}><input ref={ref} type={type==="link"?"url":type} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder={type==="link"?"https://...":undefined} style={{ width:"100%", border:"none", background:"transparent", fontSize:13, outline:"none" }} /></div>;
  }
  if (type === "select" && options === Object.keys(STATUS_CONFIG)) {
    const cfg = getStatusCfg(value || "Applied");
    return <div style={{ ...cellStyle, cursor:"pointer" }} onClick={() => setEditing(true)}><span style={{ background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>{value || "Applied"}</span></div>;
  }
  if (type === "select" && value) {
    const tagCfg = Object.values(TAG_CONFIG).find(c => c.values.includes(value));
    if (tagCfg) return <div style={{ ...cellStyle, cursor:"pointer" }} onClick={() => setEditing(true)}><span style={{ background:tagCfg.bg, color:tagCfg.text, border:`1px solid ${tagCfg.border}`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:500, whiteSpace:"nowrap" }}>{value}</span></div>;
  }
  if (type === "link") {
    return <div style={{ ...cellStyle, gap:6 }} onClick={() => setEditing(true)}>
      {value
        ? (isSafeUrl(value)
          ? <><a href={value} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color:"#185FA5", fontSize:12, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>View ↗</a><span style={{ fontSize:10, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:3 }}>{value}</span></>
          : <span style={{ fontSize:10, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</span>)
        : <span style={{ color:"var(--text-placeholder)", fontSize:13 }}>-</span>}
    </div>;
  }
  return <div style={{ ...cellStyle, color:value?"var(--text-primary)":"var(--text-placeholder)" }} onClick={() => setEditing(true)}><span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%" }}>{value || "-"}</span></div>;
}

// ── Spreadsheet view ──────────────────────────────────────────────────────────
function SpreadsheetView({ jobs, setJobs, onStatusChange, onNotesSave }) {
  const [sortCol, setSortCol] = useState("dateApplied");
  const [sortDir, setSortDir] = useState("desc");
  const COLS = [
    { key:"role", label:"Role", width:220, type:"text" },
    { key:"company", label:"Company", width:160, type:"text" },
    { key:"status", label:"Status", width:140, type:"select", options:Object.keys(STATUS_CONFIG) },
    { key:"dateApplied", label:"Date Applied", width:120, type:"date" },
    { key:"interviewDate", label:"Interview Date", width:130, type:"date" },
    { key:"salaryMin", label:"Salary Min", width:110, type:"number", align:"right" },
    { key:"salaryMax", label:"Salary Max", width:110, type:"number", align:"right" },
    { key:"contact", label:"Contact", width:150, type:"text" },
    { key:"link", label:"Link", width:180, type:"link" },
    { key:"tags.workType", label:"Work Type", width:110, type:"select", options:["", ...TAG_CONFIG.workType.values] },
    { key:"tags.industry", label:"Industry", width:120, type:"select", options:["", ...TAG_CONFIG.industry.values] },
    { key:"tags.source", label:"Source", width:120, type:"select", options:["", ...TAG_CONFIG.source.values] },
    { key:"notes", label:"Notes", width:260, type:"text" },
  ];
  const [colWidths, setColWidths] = useState(() => Object.fromEntries(COLS.map(c => [c.key, c.width])));
  const [hiddenCols, setHiddenCols] = useState({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [headerHover, setHeaderHover] = useState(null);
  const colMenuRef = useRef(null);
  useEffect(() => {
    function onClick(e) { if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setColMenuOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const visibleCols = COLS.filter(c => !hiddenCols[c.key]);
  const hiddenCount = COLS.filter(c => hiddenCols[c.key]).length;
  function startResize(e, key) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startW = colWidths[key];
    function onMove(ev) { setColWidths(w => ({ ...w, [key]: Math.max(40, startW + ev.clientX - startX) })); }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  function getVal(job, key) { return key.startsWith("tags.") ? (job.tags?.[key.slice(5)] || "") : (job[key] || ""); }
  function toggleSort(key) { if (sortCol===key) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortCol(key); setSortDir("asc"); } }
  const sorted = [...jobs].sort((a,b) => { const av=getVal(a,sortCol); const bv=getVal(b,sortCol); const cmp=av<bv?-1:av>bv?1:0; return sortDir==="asc"?cmp:-cmp; });
  function updateCell(id,key,val) {
    const now=new Date().toISOString();
    if (key==="status") { onStatusChange(id,val,""); return; }
    if (key==="notes") { onNotesSave(id,val,null); return; }
    if (key.startsWith("tags.")) {
      const tagKey = key.slice(5);
      const u = jobs.map(j => j.id===id ? { ...j, tags:{ ...(j.tags||{}), [tagKey]:val }, updatedAt:now } : j);
      setJobs(u); saveJobs(u); return;
    }
    const u=jobs.map(j=>j.id===id?{...j,[key]:val,updatedAt:now}:j); setJobs(u); saveJobs(u);
  }
  function addRow() { const now=new Date().toISOString(); const j={...EMPTY,id:Date.now(),dateApplied:todayStr(),status:"Applied",createdAt:now,updatedAt:now,timeline:[{status:"Applied",date:now,notes:""}],tags:{}}; const u=[...jobs,j]; setJobs(u); saveJobs(u); }
  const totalWidth = visibleCols.reduce((s,c)=>s+(colWidths[c.key]||c.width),0)+50;
  const mainScrollRef = useRef(null);
  const topScrollRef  = useRef(null);
  function syncFromTop()  { if (mainScrollRef.current) mainScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft; }
  function syncFromMain() { if (topScrollRef.current)  topScrollRef.current.scrollLeft  = mainScrollRef.current.scrollLeft; }
  return (
    <div>
      {/* Columns toggle button */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:6, position:"relative" }} ref={colMenuRef}>
        <button onClick={() => setColMenuOpen(o=>!o)}
          style={{ fontSize:12, padding:"4px 10px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
          ⊞ Columns {hiddenCount > 0 && <span style={{ background:"#185FA5", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:600 }}>{hiddenCount} hidden</span>}
        </button>
        {colMenuOpen && (
          <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:200, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"8px 0", minWidth:180 }}>
            <div style={{ padding:"4px 12px 8px", fontSize:11, color:"var(--text-muted)", fontWeight:600, borderBottom:"1px solid var(--border-subtle)", marginBottom:4 }}>SHOW / HIDE COLUMNS</div>
            {COLS.map(col => (
              <label key={col.key} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", cursor:"pointer", fontSize:13, color:"var(--text-primary)" }}
                onMouseEnter={e=>e.currentTarget.style.background="var(--surface-hover)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={!hiddenCols[col.key]} onChange={() => setHiddenCols(h => ({ ...h, [col.key]: !h[col.key] }))} style={{ cursor:"pointer" }} />
                {col.label}
              </label>
            ))}
            {hiddenCount > 0 && (
              <div style={{ borderTop:"1px solid var(--border-subtle)", marginTop:4, padding:"6px 12px" }}>
                <button onClick={() => setHiddenCols({})} style={{ fontSize:11, color:"#185FA5", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:500 }}>Show all columns</button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Mirror scrollbar at top */}
      <div ref={topScrollRef} onScroll={syncFromTop}
        style={{ overflowX:"auto", overflowY:"hidden", height:14, border:"1px solid var(--border)", borderBottom:"none", borderRadius:"10px 10px 0 0", background:"var(--surface-hover)" }}>
        <div style={{ width:totalWidth, height:1 }} />
      </div>
    <div ref={mainScrollRef} onScroll={syncFromMain} style={{ overflowX:"auto", overflowY:"auto", maxHeight:"calc(100vh - 164px)", border:"1px solid var(--border)", borderRadius:"0 0 10px 10px" }}>
      <div style={{ minWidth:totalWidth }}>
        <div style={{ display:"flex", background:"var(--surface-hover)", borderBottom:"2px solid var(--border)", position:"sticky", top:0, zIndex:10 }}>
          <div style={{ width:50, flexShrink:0, borderRight:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:11, color:"var(--text-muted)" }}>#</span></div>
          {visibleCols.map(col => {
            const w = colWidths[col.key] || col.width;
            const isHovered = headerHover === col.key;
            return (
              <div key={col.key} onClick={() => toggleSort(col.key)}
                onMouseEnter={() => setHeaderHover(col.key)} onMouseLeave={() => setHeaderHover(null)}
                style={{ width:w, flexShrink:0, padding:"8px", paddingRight:14, borderRight:"1px solid var(--border)", fontSize:12, fontWeight:600, color:"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:4, userSelect:"none", justifyContent:col.align==="right"?"flex-end":"flex-start", position:"relative", overflow:"hidden" }}>
                {col.label}
                <span style={{ fontSize:10, color:sortCol===col.key?"#185FA5":"#ccc" }}>{sortCol===col.key?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>
                {/* Hide button — visible on hover */}
                {isHovered && (
                  <button onClick={e => { e.stopPropagation(); setHiddenCols(h => ({ ...h, [col.key]: true })); }}
                    title="Hide column"
                    style={{ marginLeft:"auto", flexShrink:0, fontSize:10, lineHeight:1, padding:"1px 4px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:3, cursor:"pointer" }}>✕</button>
                )}
                {/* Resize handle */}
                <div onMouseDown={e => startResize(e, col.key)} onClick={e => e.stopPropagation()}
                  onDoubleClick={e => { e.stopPropagation(); setColWidths(w => ({ ...w, [col.key]: col.width })); }}
                  style={{ position:"absolute", right:0, top:0, bottom:0, width:6, cursor:"col-resize", zIndex:1 }}
                  title="Drag to resize · Double-click to reset" />
              </div>
            );
          })}
        </div>
        {sorted.length===0 && <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No jobs yet. Click "+ Add row" below.</div>}
        {sorted.map((job,idx) => (
          <div key={job.id} style={{ display:"flex", borderBottom:"1px solid var(--border)", background:idx%2===0?"var(--surface)":"var(--surface-subtle)" }} onMouseEnter={e=>e.currentTarget.style.background="#F0F6FF"} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"var(--surface)":"var(--surface-subtle)"}>
            <div style={{ width:50, flexShrink:0, borderRight:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:11, color:"var(--text-muted)" }}>{idx+1}</span></div>
            {visibleCols.map(col => <div key={col.key} style={{ width:colWidths[col.key]||col.width, flexShrink:0 }}><Cell value={getVal(job,col.key)} type={col.type} options={col.options} align={col.align} onChange={val=>updateCell(job.id,col.key,val)} /></div>)}
          </div>
        ))}
        <div onClick={addRow} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", cursor:"pointer", color:"#185FA5", fontSize:13, fontWeight:500 }} onMouseEnter={e=>e.currentTarget.style.background="#F0F6FF"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{ fontSize:16 }}>+</span> Add row
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Pipeline funnel analytics ─────────────────────────────────────────────────
function PipelineFunnel({ jobs }) {
  const active   = ["Applied", "Phone Screen", "Interview", "Offer"];
  const terminal = ["Rejected", "Withdrawn"];
  const counts   = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s => [s, jobs.filter(j => j.status === s).length]));
  const total    = jobs.length;
  const activeCount = active.reduce((s, k) => s + (counts[k] || 0), 0);
  const responseRate = total > 0 ? Math.round(((counts["Phone Screen"]||0) + (counts["Interview"]||0) + (counts["Offer"]||0)) / total * 100) : 0;
  const offerRate    = total > 0 ? Math.round((counts["Offer"]||0) / total * 100) : 0;

  // "Ever reached" counts — a job that moved Applied→Interview counts for all three stages
  const everReached = {};
  active.forEach(s => {
    everReached[s] = jobs.filter(j =>
      j.status === s || (j.timeline || []).some(e => e.status === s)
    ).length;
  });

  // Funnel steps: Applied → Phone Screen → Interview → Offer
  const funnelSteps = active.map((s, i) => {
    const count = everReached[s] || 0;
    const prev  = i > 0 ? (everReached[active[i - 1]] || 0) : null;
    const conv  = prev && prev > 0 ? Math.round(count / prev * 100) : null;
    const cfg   = getStatusCfg(s);
    return { s, count, conv, cfg };
  });

  // Recalculate response/offer rates using ever-reached
  const correctedResponseRate = total > 0 ? Math.round((everReached["Phone Screen"] || 0) / total * 100) : 0;
  const correctedOfferRate    = total > 0 ? Math.round((everReached["Offer"] || 0) / total * 100) : 0;
  const repliesCount = jobs.reduce((sum, j) => sum + (j.timeline||[]).filter(e => e.kind==="reply").length, 0);

  // Avg days per stage (uses timeline)
  const avgDays = active.reduce((acc, status) => {
    const entries = jobs.flatMap(j => {
      const tl = j.timeline || [];
      const idx = tl.findIndex(e => e.status === status);
      if (idx < 0) return [];
      const next = tl[idx + 1];
      if (!next) return [];
      const diff = Math.round((new Date(next.date) - new Date(tl[idx].date)) / 86400000);
      return diff >= 0 ? [diff] : [];
    });
    acc[status] = entries.length ? Math.round(entries.reduce((a, b) => a + b, 0) / entries.length) : null;
    return acc;
  }, {});

  if (total === 0) return null;

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
      {/* Top stats */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        {[
          { label:"Total applications", val:total },
          { label:"Active pipeline",    val:activeCount },
          { label:"Response rate",      val:`${correctedResponseRate}%` },
          { label:"Offer rate",         val:`${correctedOfferRate}%`, accent:correctedOfferRate > 0 },
          { label:"Rejected / Withdrawn", val:`${(counts["Rejected"]||0)} / ${(counts["Withdrawn"]||0)}` },
          ...(repliesCount > 0 ? [{ label:"📨 Replies to follow-ups", val:repliesCount, accent:true }] : []),
        ].map(c => (
          <div key={c.label} style={{ background:"var(--surface-subtle)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"8px 14px", minWidth:110 }}>
            <div style={{ fontSize:10, color:"var(--text-muted)", marginBottom:3 }}>{c.label}</div>
            <div style={{ fontSize:17, fontWeight:500, color: c.accent ? getStatusCfg("Offer").text : getStatusCfg("Applied").text }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Funnel bars */}
      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:10 }}>Application funnel</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:0 }}>
        {funnelSteps.map(({ s, count, conv, cfg }, i) => {
          const maxCount = Math.max(...funnelSteps.map(f => f.count), 1);
          const barH = Math.max(count / maxCount * 80, count > 0 ? 8 : 4);
          return (
            <div key={s} style={{ display:"flex", alignItems:"flex-end", flex:1 }}>
              {/* Stage column */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:12, fontWeight:500, color:cfg.text }}>{count}</div>
                <div style={{ width:"100%", height:barH, background:count > 0 ? cfg.bg : "var(--surface-hover)", border:`1.5px solid ${count > 0 ? cfg.border : "var(--border)"}`, borderRadius:"4px 4px 0 0", transition:"height 0.3s" }} />
                <div style={{ fontSize:10, color:"var(--text-muted)", textAlign:"center", lineHeight:1.3 }}>{s}</div>
                {avgDays[s] != null && <div style={{ fontSize:9, color:"var(--text-muted)" }}>~{avgDays[s]}d</div>}
              </div>
              {/* Arrow + conversion between steps */}
              {i < funnelSteps.length - 1 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingBottom:28, width:36, flexShrink:0 }}>
                  {conv != null && <div style={{ fontSize:9, color:"var(--text-muted)", marginBottom:2 }}>{conv}%</div>}
                  <div style={{ fontSize:14, color:"var(--text-muted)" }}>→</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────
function JobCardBody({ job, onPanelOpen, onUpdateJob, onWin }) {
  const activeTags = Object.entries(job?.tags || {}).filter(([,v]) => v);
  return (
    <>
      <div style={{ fontSize:12, color:"var(--text-primary)", fontWeight:700, marginBottom:2 }}>{job.company}</div>
      <div onClick={() => onPanelOpen(job)} style={{ fontWeight:500, fontSize:13, color:"var(--accent)", marginBottom:2, cursor:"pointer" }}>{job.role}</div>
      {(job.interest||0) > 0 && <div style={{ marginBottom:3 }}><InterestStars value={job.interest} onChange={onUpdateJob ? (n=>onUpdateJob(job.id,{interest:n})) : undefined} size={12} /></div>}
      {activeTags.length > 0 && <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:4 }}>{activeTags.map(([cat,val]) => <TagBadge key={cat} category={cat} value={val} />)}</div>}
      {job.interviewDate && <div style={{ fontSize:10, color:getStatusCfg("Interview").text, marginBottom:3, fontWeight:500 }}>📅 {fmtDate(job.interviewDate+"T00:00:00")}</div>}
      {getFollowupStatus(job) && <div style={{ marginBottom:4 }}>{onUpdateJob ? <FollowupActions job={job} onUpdateJob={onUpdateJob} onWin={onWin} /> : <FollowupBadge info={getFollowupStatus(job)} />}</div>}
      {isStale(job) && !getFollowupStatus(job) && <div style={{ marginBottom:4 }}><StaleBadge /></div>}
      {(() => {
        const act = lastActivity(job);
        if (!act) return job.dateApplied ? <div style={{ fontSize:11, color:"var(--text-muted)" }}>Applied {daysAgoStr(job.dateApplied)}</div> : null;
        if (act.isInitialApply) return (
          <div style={{ fontSize:11, color:"var(--text-muted)", fontStyle:"italic" }}>Applied {daysAgoStr(job.dateApplied)}, no further activity</div>
        );
        return (
          <div style={{ fontSize:11, display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
            <span style={{ color: act.label.toLowerCase().includes("follow-up") || act.label.toLowerCase().includes("contact") ? getStatusCfg("Offer").text : "var(--accent)", fontWeight:500 }}>
              {act.label.toLowerCase().includes("follow-up") || act.label.toLowerCase().includes("contact") ? "📤" : "📋"} {act.label}
            </span>
            <span style={{ color:"var(--text-muted)" }}>· {act.ago}</span>
          </div>
        );
      })()}
    </>
  );
}

function BoardTable({ jobs, search, visibleStatuses, onDrop, onPanelOpen, dragId, onUpdateJob, onWin }) {
  const isMobile = useIsMobile();
  const [overCol, setOverCol] = useState(null);
  const colCount = visibleStatuses.length;
  const colJobs = visibleStatuses.map(s => jobs.filter(j => j.status===s && (!search||`${j.role} ${j.company}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b) => (b.dateApplied||"").localeCompare(a.dateApplied||"")));
  const maxRows = Math.max(...colJobs.map(c => c.length), 1);

  // Mobile: one status column at a time, swiped between — desktop drag-and-drop
  // doesn't translate to touch, so status changes here go through the <select>.
  const [colIdx, setColIdx] = useState(0);
  useEffect(() => { setColIdx(i => Math.min(i, Math.max(0, colCount-1))); }, [colCount]);
  const { ref: pipelineSwipeRef, dx: pipelineDx } = useSwipeGesture({
    onSwipeLeft: () => setColIdx(i => Math.min(colCount-1, i+1)),
    onSwipeRight: () => setColIdx(i => Math.max(0, i-1)),
    disabled: !isMobile,
  });

  if (isMobile) {
    const cfg = getStatusCfg(visibleStatuses[colIdx]);
    const list = colJobs[colIdx] || [];
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, gap:8 }}>
          <button onClick={() => setColIdx(i => Math.max(0,i-1))} disabled={colIdx===0}
            style={{ fontSize:16, padding:"6px 10px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, color: colIdx===0 ? "var(--text-muted)" : "var(--accent)", opacity: colIdx===0?0.4:1, cursor: colIdx===0?"default":"pointer", minHeight:44, minWidth:44 }}>‹</button>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:cfg.text }}>{visibleStatuses[colIdx]} ({list.length})</span>
            <div style={{ display:"flex", gap:5 }}>
              {visibleStatuses.map((s,i) => (
                <span key={s} onClick={() => setColIdx(i)}
                  style={{ width:6, height:6, borderRadius:"50%", background: i===colIdx ? "var(--accent)" : "var(--border)", cursor:"pointer" }} />
              ))}
            </div>
          </div>
          <button onClick={() => setColIdx(i => Math.min(colCount-1,i+1))} disabled={colIdx===colCount-1}
            style={{ fontSize:16, padding:"6px 10px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, color: colIdx===colCount-1 ? "var(--text-muted)" : "var(--accent)", opacity: colIdx===colCount-1?0.4:1, cursor: colIdx===colCount-1?"default":"pointer", minHeight:44, minWidth:44 }}>›</button>
        </div>
        <div ref={pipelineSwipeRef} style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", transform:`translateX(${pipelineDx}px)`, transition: pipelineDx===0 ? "transform 0.15s ease-out" : "none" }}>
          {list.length === 0 ? (
            <div style={{ padding:"10px 12px", fontSize:12, color:"var(--text-muted)", background:"var(--surface)" }}>No jobs</div>
          ) : list.map((job, idx) => (
            <div key={job.id} style={{ padding:"10px 12px", borderTop:idx>0?"1px solid var(--border)":"none", background:"var(--surface)" }}>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:6 }}>
                <select value={job.status} onChange={e => onUpdateJob(job.id, { status: e.target.value })}
                  style={{ fontSize:11, padding:"3px 6px", borderRadius:6, border:"1px solid var(--input-border)", background:"var(--input-bg)", color:"var(--text-primary)" }}>
                  {Object.keys(STATUS_CONFIG).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <JobCardBody job={job} onPanelOpen={onPanelOpen} onUpdateJob={onUpdateJob} onWin={onWin} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"relative", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}
      onDragOver={e => { e.preventDefault(); const rect=e.currentTarget.getBoundingClientRect(); const idx=Math.min(Math.floor((e.clientX-rect.left)/(rect.width/colCount)),colCount-1); setOverCol(visibleStatuses[idx]); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null); }}
      onDrop={e => { e.preventDefault(); if (overCol) onDrop(overCol); setOverCol(null); }}
    >
      <div style={{ position:"absolute", inset:0, display:"grid", gridTemplateColumns:`repeat(${colCount},1fr)`, pointerEvents:"none", zIndex:1 }}>
        {visibleStatuses.map(s => { const cfg=getStatusCfg(s); const isOver=overCol===s; return <div key={s} style={{ background:isOver?cfg.border:"transparent", opacity:isOver?0.45:0, transition:"opacity 0.12s" }} />; })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${colCount},minmax(0,1fr))`, borderBottom:"1px solid var(--border)", position:"relative", zIndex:2 }}>
        {visibleStatuses.map((s,i) => { const cfg=getStatusCfg(s); return <div key={s} style={{ background:cfg.bg, padding:"8px 12px", borderRight:i<colCount-1?"1px solid var(--border)":"none", display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:12, fontWeight:500, color:cfg.text }}>{s}</span><span style={{ fontSize:11, fontWeight:500, color:cfg.text, background:isDark()?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.7)", borderRadius:10, padding:"1px 7px" }}>{colJobs[i].length}</span></div>; })}
      </div>
      <div style={{ position:"relative", zIndex:2 }}>
        {Array.from({ length:maxRows }).map((_,rowIdx) => (
          <div key={rowIdx} style={{ display:"grid", gridTemplateColumns:`repeat(${colCount},minmax(0,1fr))`, borderBottom:rowIdx<maxRows-1?"1px solid var(--border)":"none" }}>
            {visibleStatuses.map((s,colIdx) => {
              const job = colJobs[colIdx][rowIdx];
              return (
                <div key={s} style={{ borderRight:colIdx<colCount-1?"1px solid var(--border)":"none", padding:"8px 10px", minHeight:56, background:"var(--surface)" }}>
                  {job && (
                    <div draggable onDragStart={e => { e.dataTransfer.effectAllowed="move"; dragId.current=job.id; }} onDragEnd={() => setOverCol(null)} style={{ cursor:"grab", userSelect:"none", paddingBottom:8, borderBottom:"1px solid var(--border)" }}>
                      <JobCardBody job={job} onPanelOpen={onPanelOpen} onUpdateJob={onUpdateJob} onWin={onWin} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Salary chart ─────────────────────────────────────────────────────────────
function SalaryChart({ jobs, onOpenPanel }) {
  const [hover, setHover] = useState(null);
  const [sortBy, setSortBy] = useState("dateApplied");
  const [sortDir, setSortDir] = useState("desc");

  const withSalary = jobs.filter(j => j.salaryMin || j.salaryMax).map(j => ({
    ...j,
    min: j.salaryMin ? parseInt(j.salaryMin) : null,
    max: j.salaryMax ? parseInt(j.salaryMax) : null,
    mid: j.salaryMin && j.salaryMax ? (parseInt(j.salaryMin) + parseInt(j.salaryMax)) / 2
       : j.salaryMin ? parseInt(j.salaryMin)
       : parseInt(j.salaryMax),
  })).sort((a, b) => {
    let cmp = 0;
    if (sortBy === "dateApplied") cmp = (a.dateApplied||"").localeCompare(b.dateApplied||"");
    else if (sortBy === "company")  cmp = a.company.localeCompare(b.company);
    else if (sortBy === "status")   cmp = a.status.localeCompare(b.status);
    else if (sortBy === "salary")   cmp = a.mid - b.mid;
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (withSalary.length === 0) {
    return <EmptyState icon="💰" title="No salary data yet" desc="Add a salary min/max to any job to see ranges and comparisons here." />;
  }

  const allVals = withSalary.flatMap(j => [j.min, j.max].filter(Boolean));
  const globalMin = Math.min(...allVals);
  const globalMax = Math.max(...allVals);
  const pad = (globalMax - globalMin) * 0.05 || 10000;
  const domainMin = Math.max(0, globalMin - pad);
  const domainMax = globalMax + pad;
  const range = domainMax - domainMin;

  function pct(val) { return ((val - domainMin) / range) * 100; }
  function fmt(n) { return n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`; }

  // Summary stats
  const mids = withSalary.map(j => j.mid);
  const avgMid = Math.round(mids.reduce((a,b) => a+b, 0) / mids.length);
  const medMid = [...mids].sort((a,b)=>a-b)[Math.floor(mids.length/2)];

  // Group averages by status
  const byStatus = Object.entries(
    withSalary.reduce((acc, j) => {
      if (!acc[j.status]) acc[j.status] = [];
      acc[j.status].push(j.mid);
      return acc;
    }, {})
  ).map(([status, vals]) => ({
    status,
    avg: Math.round(vals.reduce((a,b)=>a+b,0)/vals.length),
    count: vals.length,
  })).sort((a,b) => b.avg - a.avg);

  // Axis ticks
  const tickCount = 5;
  const ticks = Array.from({length: tickCount}, (_, i) => domainMin + (range * i / (tickCount - 1)));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
        {[
          { label:"Jobs with salary", val: withSalary.length, sub:`of ${jobs.length} total` },
          { label:"Average midpoint", val: fmt(avgMid) },
          { label:"Median midpoint", val: fmt(medMid) },
          { label:"Salary range", val: `${fmt(globalMin)} – ${fmt(globalMax)}` },
        ].map(c => (
          <div key={c.label} style={{ background:"var(--surface-subtle)", border:"1px solid var(--border-subtle)", borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:18, fontWeight:500, color:"#185FA5" }}>{c.val}</div>
            {c.sub && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Average by status */}
      {byStatus.length > 1 && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:12 }}>Average midpoint by status</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {byStatus.map(({ status, avg, count }) => {
              const cfg = getStatusCfg(status);
              return (
                <div key={status} style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:8, padding:"8px 14px", minWidth:120 }}>
                  <div style={{ fontSize:11, color:cfg.text, fontWeight:500, marginBottom:3 }}>{status} ({count})</div>
                  <div style={{ fontSize:16, fontWeight:500, color:cfg.text }}>{fmt(avg)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Horizontal range bars */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>Salary ranges by job</div>
          <div style={{ display:"flex", border:"1px solid var(--input-border)", borderRadius:6, overflow:"hidden" }}>
            <select value={sortBy} onChange={e=>{ setSortBy(e.target.value); setSortDir("desc"); }} style={{ fontSize:12, border:"none", borderRight:"1px solid var(--input-border)", padding:"4px 8px", background:"var(--surface)", color:"var(--text-primary)", cursor:"pointer" }}>
              <option value="dateApplied">Date</option>
              <option value="company">Company</option>
              <option value="status">Status</option>
              <option value="salary">Salary</option>
            </select>
            <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")} title={sortDir==="desc"?"Highest/Newest first":"Lowest/Oldest first"} style={{ fontSize:13, padding:"4px 10px", border:"none", background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", fontWeight:500, lineHeight:1 }}>
              {sortDir==="desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {/* Axis */}
        <div style={{ position:"relative", marginBottom:6, paddingLeft:220 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            {ticks.map((t,i) => (
              <span key={i} style={{ fontSize:10, color:"var(--text-muted)", textAlign:"center", minWidth:40 }}>{fmt(Math.round(t))}</span>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {withSalary.map((job) => {
            const cfg = getStatusCfg(job.status);
            const isHovered = hover === job.id;
            const barLeft = job.min ? pct(job.min) : pct(job.mid);
            const barRight = job.max ? 100 - pct(job.max) : 100 - pct(job.mid);
            const midLeft = pct(job.mid);
            return (
              <div key={job.id} style={{ display:"flex", alignItems:"center", gap:10, height:28 }}
                onMouseEnter={() => setHover(job.id)} onMouseLeave={() => setHover(null)}>
                {/* Label */}
                <div onClick={() => onOpenPanel && onOpenPanel(job)}
                  style={{ width:220, flexShrink:0, fontSize:12, color:isHovered?"var(--accent)":"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer", fontWeight:isHovered?500:400, textDecoration:isHovered?"underline":"none" }}
                  title={`${job.company} · ${job.role}, click to open`}>
                  <span style={{ fontWeight:700 }}>{job.company}</span> <span style={{ color:isHovered?"var(--accent)":"var(--text-muted)", fontWeight:400 }}>· {job.role}</span>
                </div>
                {/* Bar track */}
                <div style={{ flex:1, position:"relative", height:10, background:"var(--surface-hover)", borderRadius:6 }}>
                  {/* Range bar */}
                  {job.min && job.max && (
                    <div style={{ position:"absolute", top:0, bottom:0, left:`${barLeft}%`, right:`${barRight}%`, background:isHovered?cfg.border:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:6, transition:"background 0.1s" }} />
                  )}
                  {/* Midpoint dot */}
                  <div style={{ position:"absolute", top:"50%", left:`${midLeft}%`, transform:"translate(-50%,-50%)", width:isHovered?12:8, height:isHovered?12:8, background:cfg.text, borderRadius:"50%", border:"2px solid #fff", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"all 0.1s", zIndex:2 }} />
                  {/* Hover tooltip */}
                  {isHovered && (
                    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:`${midLeft}%`, transform:"translateX(-50%)", background:"#222", color:"#fff", borderRadius:6, padding:"6px 10px", fontSize:11, whiteSpace:"nowrap", zIndex:10, boxShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>
                      <div style={{ fontWeight:500, marginBottom:2 }}>{job.company} · {job.role}</div>
                      <div style={{ color:"var(--text-muted)" }}>
                        {job.min && job.max ? `${fmt(job.min)} – ${fmt(job.max)}` : job.min ? `Min ${fmt(job.min)}` : `Max ${fmt(job.max)}`}
                      </div>
                      <div style={{ color:cfg.border, marginTop:2, fontSize:10 }}>{job.status}</div>
                    </div>
                  )}
                </div>
                {/* Value label */}
                <div style={{ width:90, flexShrink:0, fontSize:11, color:"var(--text-muted)", textAlign:"right" }}>
                  {job.min && job.max ? `${fmt(job.min)}–${fmt(job.max)}` : job.min ? `≥${fmt(job.min)}` : `≤${fmt(job.max)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Today tab ─────────────────────────────────────────────────────────────────
function TodayTab({ jobs, tasks, setTasks, onOpenPanel, onUpdateJob, profileName, onAddJob, onLoadSample, onLogReply, weeklyGoal, onWin, isMobile, checklistProgress, onChecklistDone, onNavigate, onEnableReminders, demoMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text:"", jobId:"", dueDate:todayStr() });
  const [draftJob, setDraftJob] = useState(null);
  const today = todayStr();
  const repliesCount = jobs.reduce((sum, j) => sum + (j.timeline||[]).filter(e => e.kind==="reply").length, 0);

  // Auto-generated urgent items
  const rawAuto = [];
  jobs.forEach(job => {
    if (job.archived) return;
    if (job.interviewDate === today)
      rawAuto.push({ id:`auto-interview-${job.id}`, type:"interview", job, diff:0 });
    const fu = getFollowupStatus(job);
    if (fu?.urgent && fu.diff >= -30)
      rawAuto.push({ id:`auto-followup-${job.id}`, type:"followup", job, diff:fu.diff, fu });
  });
  const autoTasks = rawAuto.sort((a,b) => {
    // High-interest jobs surface first, then by urgency.
    const ib = (b.job.interest||0) - (a.job.interest||0);
    if (ib) return ib;
    const key = d => d===0 ? 0 : d<0 ? -d : 1000+d;
    return key(a.diff) - key(b.diff);
  });

  function snooze(job, days) { onUpdateJob(job.id, { customFollowup: dateInNDays(days) }); track("followup_snoozed", { days }); }
  function dismissFollowup(job) { onUpdateJob(job.id, { followupDismissed: true }); track("followup_dismissed"); }
  function logOutreach(job) {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    onUpdateJob(job.id, {
      customFollowup: dateInNDays(resetDays),
      timeline: [...(job.timeline||[]), { id:crypto.randomUUID(), status:job.status, date:now, notes:"Follow-up sent" }],
    });
    const n = followupsSentThisWeek(jobs) + 1;
    onWin(`Sent 📤. That's ${n} this week. Most people never send one.`);
  }

  function tierStyle(diff, type) {
    const d = isDark();
    if (type==="interview") return { border: d?"#2d5580":"#185FA5", bg: d?"#1a3550":"#F0F6FF", tag:null };
    if (diff===0)            return { border: d?"#2d5580":"#185FA5", bg: d?"#1a3550":"#F0F6FF", tag:null };
    if (diff >= -7)          return { border: d?"#5c4020":"#C27209", bg: d?"#3d2b10":"#FFF8F0", tag:{ label:`${-diff}d overdue`, color: d?"#FAC775":"#7A4500", bg: d?"#3d2b10":"#FDEEC8" } };
    return                          { border: d?"#5c2525":"#A32D2D", bg: d?"#3d1515":"#FFF5F5", tag:{ label:`${-diff}d overdue`, color: d?"#F08080":"#791F1F", bg: d?"#3d1515":"#FCEBEB" } };
  }

  function AutoCard({ task }) {
    const { job, diff, type, fu } = task;
    const { border, bg, tag } = tierStyle(diff, type);
    const label = type==="interview" ? `${job.status}: ${job.company} · ${job.role}` : `${job.company} · ${job.role}`;
    const sublabel = type==="interview" ? "Scheduled for today" : `Status: ${job.status} · ${fu?.label}`;
    return (
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"11px 12px 11px 14px", background:bg, border:`1px solid ${border}33`, borderLeft:`3px solid ${border}`, borderRadius:8, marginBottom:6 }}>
        <span style={{ fontSize:15, marginTop:1, flexShrink:0 }}>{type==="interview"?"📅":"🔔"}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span onClick={() => onOpenPanel(job)} style={{ fontSize:13, fontWeight:500, color:"#185FA5", cursor:"pointer" }}>{label}</span>
            {tag && <span style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:10, background:tag.bg, color:tag.color, flexShrink:0 }}>{tag.label}</span>}
            {(job.interest||0) > 0 && <InterestStars value={job.interest} size={11} />}
          </div>
          <div style={{ fontSize:11, color:border, marginTop:2, fontWeight:500 }}>{sublabel}</div>
          {(() => {
            const act = lastActivity(job);
            if (!act) return null;
            if (act.isInitialApply) return <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:3, fontStyle:"italic" }}>No activity beyond initial application</div>;
            const isContact = /follow.up|contact/i.test(act.label);
            return (
              <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:3 }}>
                Last: <span style={{ color: isContact?getStatusCfg("Offer").text:"var(--text-secondary)", fontWeight:500 }}>{isContact?"📤 ":"📋 "}{act.label}</span> · {act.ago}
              </div>
            );
          })()}
        </div>
        {type==="followup" && (
          <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0, alignItems:"flex-end" }}>
            <button onClick={() => { track("draft_opened", { job_status: job.status, source: "today" }); setDraftJob(job); }} style={{ fontSize:11, padding:"4px 9px", background:"var(--surface-hover)", color:"#185FA5", border:"1px solid #B5D4F4", borderRadius:6, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>✍️ Draft</button>
            <button onClick={() => { logOutreach(job); track("draft_actioned", { action:"mark_contacted_no_draft" }); }} style={{ fontSize:11, padding:"4px 9px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>✓ Contacted</button>
            <button onClick={() => onLogReply(job)} style={{ fontSize:10, padding:"3px 8px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" }}>📨 Got a reply</button>
            <div style={{ display:"flex", gap:3 }}>
              <button onClick={() => snooze(job,3)} title="Remind me in 3 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>+3d</button>
              <button onClick={() => snooze(job,7)} title="Remind me in 7 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>+7d</button>
              <button onClick={() => snooze(job, 30)} title="Snooze 30 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>−30d</button>
            </div>
            <button onClick={() => dismissFollowup(job)} title="Cancel this follow-up entirely, stop reminding me" style={{ fontSize:10, padding:"2px 6px", background:"none", color:"var(--text-muted)", border:"none", cursor:"pointer", textDecoration:"underline", whiteSpace:"nowrap" }}>✕ Stop following up</button>
          </div>
        )}
      </div>
    );
  }

  function TaskCard({ task }) {
    const linkedJob = jobs.find(j => j.id===task.jobId);
    return (
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, marginBottom:6 }}>
        <input type="checkbox" checked={task.done||false} onChange={() => { const u=tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t); setTasks(u); saveTasks(u); if (!task.done) track("reminder_completed"); }} style={{ marginTop:2, cursor:"pointer" }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, color:"var(--text-primary)" }}>{task.text}</div>
          {linkedJob && <div style={{ fontSize:11, color:"#185FA5", marginTop:2, cursor:"pointer" }} onClick={() => onOpenPanel(linkedJob)}>→ {linkedJob.company} · {linkedJob.role}</div>}
          {task.dueDate && <div style={{ fontSize:10, color: task.dueDate<today?"#A32D2D":"var(--text-muted)", marginTop:2 }}>{task.dueDate===today?"Due today":`Overdue · ${task.dueDate}`}</div>}
        </div>
        {linkedJob && <button onClick={() => { track("draft_opened", { job_status: linkedJob.status, source: "reminder" }); setDraftJob(linkedJob); }} style={{ fontSize:10, padding:"3px 8px", background:"var(--surface-hover)", color:"#185FA5", border:"1px solid #B5D4F4", borderRadius:6, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>✍️ Draft</button>}
        <button onClick={() => { const u=tasks.filter(t=>t.id!==task.id); setTasks(u); saveTasks(u); }} style={{ fontSize:10, padding:"2px 6px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border-subtle)", borderRadius:4, cursor:"pointer" }}>✕</button>
      </div>
    );
  }

  function Section({ title, color, children, count }) {
    if (count===0) return null;
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:600, color, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>{title} ({count})</div>
        {children}
      </div>
    );
  }

  function addTask() {
    if (!newTask.text) return;
    const t = { id:Date.now(), text:newTask.text, jobId:newTask.jobId||null, dueDate:newTask.dueDate, done:false, createdAt:new Date().toISOString() };
    const u = [...tasks,t]; setTasks(u); saveTasks(u);
    track("reminder_created", { source: "manual" });
    setNewTask({ text:"", jobId:"", dueDate:todayStr() }); setShowAdd(false);
  }

  const manualOverdue = tasks.filter(t => !t.done && t.dueDate < today);
  const manualToday   = tasks.filter(t => !t.done && t.dueDate === today);
  const recentJobs    = jobs.filter(j => !j.archived).map(j => ({ job:j, t:activityTime(j) })).filter(x => x.t).sort((a,b) => b.t.localeCompare(a.t)).slice(0, 12).map(x => x.job);
  const totalPending  = autoTasks.length + manualOverdue.length + manualToday.length;

  if (jobs.filter(j => !j.archived).length === 0) {
    return <OnboardingCard onAdd={onAddJob} onLoadSample={onLoadSample} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"var(--text-primary)" }}>
            {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
          <div style={{ fontSize:12, color: totalPending>0?getStatusCfg("Rejected").text:getStatusCfg("Offer").text, marginTop:3, fontWeight:500 }}>
            {totalPending===0 ? "✓ All clear" : `${totalPending} item${totalPending!==1?"s":""} need attention`}
          </div>
          {repliesCount > 0 && <div style={{ fontSize:11, color:getStatusCfg("Offer").text, marginTop:3, fontWeight:500 }}>📨 {repliesCount} repl{repliesCount!==1?"ies":"y"} to your follow-ups</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <WeeklyGoalRing count={followupsSentThisWeek(jobs)} goal={parseInt(weeklyGoal) || 5} />
          <button onClick={() => setShowAdd(o=>!o)} style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, padding:"6px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer" }}><Icon name="plus" size={13} /> Add task</button>
        </div>
      </div>

      {!demoMode && (
        <GettingStartedChecklist
          jobsCount={jobs.filter(j=>!j.archived).length}
          profileName={profileName}
          isMobile={isMobile}
          progress={checklistProgress || {}}
          onMarkDone={onChecklistDone}
          onNavigate={onNavigate}
          onEnableReminders={onEnableReminders}
          onTryDraft={() => { const job = jobs.find(j=>!j.archived); if (job) { track("draft_opened", { job_status: job.status, source: "checklist" }); setDraftJob(job); } }}
        />
      )}

      {/* Add task form */}
      {showAdd && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input autoFocus placeholder="Task description..." value={newTask.text} onChange={e=>setNewTask(t=>({...t,text:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addTask()} style={{ fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 10px" }} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <label style={{ fontSize:12, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:4 }}>Due date
                <input type="date" value={newTask.dueDate} onChange={e=>setNewTask(t=>({...t,dueDate:e.target.value}))} style={{ fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px" }} />
              </label>
              <label style={{ fontSize:12, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:4 }}>Link to job (optional)
                <select value={newTask.jobId} onChange={e=>setNewTask(t=>({...t,jobId:e.target.value}))} style={{ fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px" }}>
                  <option value="">None</option>
                  {jobs.filter(j=>!j.archived).map(j=><option key={j.id} value={j.id}>{j.role} @ {j.company}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowAdd(false)} style={{ fontSize:12, padding:"5px 12px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>Cancel</button>
              <button onClick={addTask} style={{ fontSize:12, padding:"5px 12px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Save task</button>
            </div>
          </div>
        </div>
      )}

      {/* All clear */}
      {totalPending===0 && autoTasks.length===0 && (
        <div style={{ textAlign:"center", padding:"4rem 1rem", color:"var(--text-muted)", fontSize:14 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>✓</div>
          You're all caught up. No follow-ups or tasks need your attention today.
        </div>
      )}

      <Section title="Interviews today" color={getStatusCfg("Interview").text} count={autoTasks.filter(t=>t.type==="interview").length}>
        {autoTasks.filter(t=>t.type==="interview").map(t => <AutoCard key={t.id} task={t} />)}
      </Section>
      <Section title="Follow-ups due" color={getStatusCfg("Phone Screen").text} count={autoTasks.filter(t=>t.type==="followup").length}>
        {autoTasks.filter(t=>t.type==="followup").map(t => <AutoCard key={t.id} task={t} />)}
      </Section>
      <Section title="Overdue reminders" color={getStatusCfg("Rejected").text} count={manualOverdue.length}>
        {manualOverdue.map(t => <TaskCard key={t.id} task={t} />)}
      </Section>
      <Section title="Reminders due today" color={getStatusCfg("Applied").text} count={manualToday.length}>
        {manualToday.map(t => <TaskCard key={t.id} task={t} />)}
      </Section>
      <Section title="Recent activity" color="var(--text-muted)" count={recentJobs.length}>
        {recentJobs.map(job => {
          const act = lastActivity(job);
          const isContact = act && /follow.up|contact/i.test(act.label);
          return (
            <div key={job.id} onClick={() => onOpenPanel(job)}
              style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderLeft:`3px solid ${getStatusCfg(job.status).border}`, borderRadius:8, marginBottom:6, cursor:"pointer" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.company} · {job.role}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  <span style={{ ...(() => { const c=getStatusCfg(job.status); return { background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:500 }; })() }}>{job.status}</span>
                  {act && !act.isInitialApply
                    ? <span style={{ marginLeft:6 }}>· {isContact ? "📤 " : "📋 "}<span style={{ color: isContact ? getStatusCfg("Offer").text : "var(--text-secondary)", fontWeight:500 }}>{act.label}</span> · {act.ago}</span>
                    : <span style={{ marginLeft:6 }}>· {job.dateApplied ? `applied ${daysAgoStr(job.dateApplied)}` : `added ${timeAgo(job.createdAt)}`}</span>}
                </div>
              </div>
              <span style={{ fontSize:11, color:"var(--text-muted)", flexShrink:0 }}>›</span>
            </div>
          );
        })}
      </Section>
      {draftJob && <DraftComposer job={draftJob} profileName={profileName} onClose={() => setDraftJob(null)} onMarkContacted={() => { logOutreach(draftJob); track("draft_actioned", { action:"mark_contacted" }); setDraftJob(null); }} />}
    </div>
  );
}

// ── Sample data for onboarding ────────────────────────────────────────────────
function makeSampleJobs() {
  const now = new Date();
  const daysAgo = n => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
  return [
    { id:Date.now()+1, company:"Acme Corp", role:"Product Manager", status:"Interview", dateApplied:daysAgo(14), link:"", salaryMin:"90000", salaryMax:"120000", contact:"Sarah Lee", notes:"Great culture fit, hybrid role", tags:{workType:"Hybrid",industry:"Tech",source:"LinkedIn"}, timeline:[{id:crypto.randomUUID(),status:"Applied",date:new Date(now.getTime()-14*86400000).toISOString(),notes:""},{id:crypto.randomUUID(),status:"Phone Screen",date:new Date(now.getTime()-7*86400000).toISOString(),notes:"Good call with recruiter"},{id:crypto.randomUUID(),status:"Interview",date:new Date(now.getTime()-2*86400000).toISOString(),notes:"Panel interview scheduled"}], interviewDate:daysAgo(-2), createdAt:new Date(now.getTime()-14*86400000).toISOString(), updatedAt:new Date().toISOString(), archived:false, followupDismissed:false, prepChecklist:[], lastStatus:null, customFollowup:"" },
    { id:Date.now()+2, company:"Bright Labs", role:"UX Designer", status:"Phone Screen", dateApplied:daysAgo(10), link:"", salaryMin:"75000", salaryMax:"95000", contact:"", notes:"Startup, Series B", tags:{workType:"Remote",industry:"Tech",source:"Indeed"}, timeline:[{id:crypto.randomUUID(),status:"Applied",date:new Date(now.getTime()-10*86400000).toISOString(),notes:""},{id:crypto.randomUUID(),status:"Phone Screen",date:new Date(now.getTime()-3*86400000).toISOString(),notes:"Intro call with hiring manager"}], interviewDate:"", createdAt:new Date(now.getTime()-10*86400000).toISOString(), updatedAt:new Date().toISOString(), archived:false, followupDismissed:false, prepChecklist:[], lastStatus:null, customFollowup:"" },
    { id:Date.now()+3, company:"Metro Health", role:"Data Analyst", status:"Applied", dateApplied:daysAgo(5), link:"", salaryMin:"65000", salaryMax:"80000", contact:"", notes:"", tags:{workType:"On-site",industry:"Healthcare",source:"Company site"}, timeline:[{id:crypto.randomUUID(),status:"Applied",date:new Date(now.getTime()-5*86400000).toISOString(),notes:""}], interviewDate:"", createdAt:new Date(now.getTime()-5*86400000).toISOString(), updatedAt:new Date().toISOString(), archived:false, followupDismissed:false, prepChecklist:[], lastStatus:null, customFollowup:"" },
    { id:Date.now()+4, company:"Greenfield Co", role:"Marketing Manager", status:"Rejected", dateApplied:daysAgo(21), link:"", salaryMin:"", salaryMax:"", contact:"", notes:"Position was filled internally", tags:{workType:"Hybrid",industry:"Retail",source:"Referral"}, timeline:[{id:crypto.randomUUID(),status:"Applied",date:new Date(now.getTime()-21*86400000).toISOString(),notes:""},{id:crypto.randomUUID(),status:"Rejected",date:new Date(now.getTime()-8*86400000).toISOString(),notes:"Position filled internally"}], interviewDate:"", createdAt:new Date(now.getTime()-21*86400000).toISOString(), updatedAt:new Date().toISOString(), archived:false, followupDismissed:false, prepChecklist:[], lastStatus:null, customFollowup:"" },
  ];
}

// ── Onboarding card (shown when user has no jobs) ─────────────────────────────
function OnboardingCard({ onAdd, onLoadSample }) {
  const steps = [
    { icon:"📝", title:"Add a job", desc:"Paste any role you've applied to, or use the paste-a-link box and it fills in the details for you." },
    { icon:"🔔", title:"Get told when to follow up", desc:"Your Today list flags applications going cold so you never let one die." },
    { icon:"✍️", title:"Send it in one tap", desc:"It drafts the follow-up email for you. Just review and send." },
  ];
  return (
    <div style={{ maxWidth:580, margin:"2rem auto", padding:"2rem", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><FollowupMark size={44} /></div>
        <div style={{ fontSize:18, fontWeight:700, color:"var(--text-primary)", marginBottom:6 }}>Welcome to Followup</div>
        <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.5 }}>The job tracker that makes you follow up, so applications don't go cold and warm intros don't slip.</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:"1.75rem" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"12px 14px", background:"var(--surface-subtle)", borderRadius:10, border:"1px solid var(--border-subtle)" }}>
            <div style={{ fontSize:22, flexShrink:0, marginTop:1 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", marginBottom:2 }}>{s.title}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={onAdd} style={{ fontSize:14, padding:"10px 24px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>+ Add your first job</button>
        <button onClick={onLoadSample} style={{ fontSize:13, padding:"10px 18px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer" }}>Explore with sample data</button>
      </div>
    </div>
  );
}

// ── Getting-started checklist (shown on Today until dismissed or all steps done) ──
function GettingStartedChecklist({ jobsCount, profileName, isMobile, progress, onMarkDone, onNavigate, onEnableReminders, onTryDraft }) {
  const remindersOn = typeof Notification !== "undefined" && Notification.permission === "granted";
  const steps = [
    { key:"addJob", icon:"📝", label:"Add a job", done: jobsCount > 0 },
    { key:"setName", icon:"✍️", label:"Set your name", done: !!(profileName && profileName.trim()), onClick: () => onNavigate("profile") },
    { key:"tryDraft", icon:"📤", label:"Try a follow-up draft", done: !!progress.tryDraft, onClick: () => { onMarkDone("tryDraft"); onTryDraft(); } },
    { key:"setTiming", icon:"⏱️", label:"Set your follow-up timing", done: !!progress.setTiming, onClick: () => onNavigate("automation") },
    { key:"enableReminders", icon:"🔔", label:"Enable browser reminders", done: remindersOn, onClick: onEnableReminders },
  ];
  if (!isMobile) steps.push({ key:"bookmarklet", icon:"🔖", label:"Get the capture bookmarklet", done: !!progress.bookmarklet, onClick: () => onNavigate("bookmarklet") });

  useEffect(() => {
    steps.forEach(s => { if (s.done && !progress[s.key]) onMarkDone(s.key); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsCount, profileName, remindersOn, progress]);

  if (progress.dismissed) return null;
  const doneCount = steps.filter(s=>s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: allDone ? 0 : 10 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>
          {allDone ? "🎉 You're all set up!" : `Getting started (${doneCount}/${steps.length})`}
        </div>
        <button onClick={() => onMarkDone("dismissed")} style={{ padding:"2px 6px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", display:"flex" }}><Icon name="x" size={12} /></button>
      </div>
      {!allDone && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {steps.map(s => (
            <div key={s.key} onClick={!s.done && s.onClick ? s.onClick : undefined}
              style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, padding:"6px 8px", borderRadius:6, cursor: !s.done && s.onClick ? "pointer" : "default", background: s.done ? "transparent" : "var(--surface-subtle)" }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{s.done ? "✅" : s.icon}</span>
              <span style={{ color: s.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Guide & help ──────────────────────────────────────────────────────────────
function HelpSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", padding: "12px 2px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 2px 16px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{children}</div>}
    </div>
  );
}

// Feedback form — relays to the owner's email via Web3Forms (email stays private;
// only this anonymous access key is public). Get a free key at https://web3forms.com
const WEB3FORMS_ACCESS_KEY = "f316ea86-ef75-48c2-ad7f-1cec6ca78066";

function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  async function submit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    try {
      const resp = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Followup: new feedback",
          from_name: "Followup app",
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = await resp.json();
      if (data.success) { setState("sent"); setMessage(""); setEmail(""); track("feedback_sent"); }
      else setState("error");
    } catch { setState("error"); }
  }

  if (state === "sent") {
    return <div style={{ fontSize: 13, color: "#27500A", background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "10px 12px" }}>Thanks. Your feedback was sent. 🙏</div>;
  }
  const field = { fontSize: 13, padding: "9px 11px", border: "1px solid var(--input-border)", borderRadius: 8, background: "var(--input-bg)", color: "var(--text-primary)", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4}
        placeholder="What's working, what's broken, what you'd love to see…"
        style={{ ...field, resize: "vertical", lineHeight: 1.5 }} />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Your email (optional, so we can reply)" style={field} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={state === "sending" || !message.trim()}
          style={{ fontSize: 13, padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, cursor: message.trim() ? "pointer" : "not-allowed", fontWeight: 600, opacity: state === "sending" ? 0.7 : 1 }}>
          {state === "sending" ? "Sending…" : "Send feedback"}
        </button>
        {state === "error" && <span style={{ fontSize: 12, color: "#A32D2D" }}>Couldn't send. Please try again.</span>}
      </div>
    </form>
  );
}

function HelpModal({ onClose }) {
  const item = (name, desc) => (
    <div style={{ marginBottom: 8 }}>
      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{name}</span>: {desc}
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Guide &amp; help</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display:"flex" }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "4px 20px 16px", overflowY: "auto" }}>
          <HelpSection title="Start here" defaultOpen>
            <p style={{ marginBottom: 10 }}>Followup is a job tracker that does more than store applications. It tells you what to do each day and helps you follow up.</p>
            <p>The simplest routine: <b>add the jobs you apply to</b>, then <b>open the Today tab each morning</b> and clear what it surfaces: follow-ups that are due, interviews, and reminders.</p>
          </HelpSection>

          <HelpSection title="Getting started in 2 minutes">
            <p style={{ marginBottom: 10 }}>1. <b>Add a job</b>: paste a posting link (fills in details) or enter one manually.</p>
            <p style={{ marginBottom: 10 }}>2. <b>Set your name</b> in Profile. It signs off your follow-up drafts automatically.</p>
            <p style={{ marginBottom: 10 }}>3. <b>Open Today</b> once a job goes quiet and hit <b>✍️ Draft</b>: review the email, then copy it or mark it sent.</p>
            <p style={{ marginBottom: 10 }}>4. <b>Enable browser reminders</b> in Profile → Backup &amp; data so overdue follow-ups surface when you open the app.</p>
            <p>5. On desktop, drag the <b>capture bookmarklet</b> (Profile → Capture jobs from any site) to your bookmarks bar to save postings in one click. The Today tab's getting-started checklist walks through all of this too.</p>
          </HelpSection>

          <HelpSection title="The views">
            {item("Today", "Your daily action inbox: follow-ups due (highest-interest first), interviews today, overdue reminders, plus a recent-activity feed of your latest moves. Start here.")}
            {item("List", "Every application as a card. Search, filter by status or tag, change status inline, add notes, and run bulk actions.")}
            {item("Pipeline", "A drag-and-drop board grouped by status, plus a conversion funnel and a salary-range chart.")}
            {item("Table", "A sortable spreadsheet view, good for scanning or comparing lots of applications at once.")}
            {item("Calendar", "Interviews, follow-ups, and reminders on a month / week / day / agenda calendar. Each event color- and icon-coded by type. Turn on \"Milestones\" (off by default) in the sidebar to also see every status-change entry from each job's timeline.")}
            {item("Offers", "A focused view of roles at the offer stage so you can compare them side by side.")}
            {item("Contacts", "A lightweight CRM for recruiters and contacts. Track who you've reached out to and when.")}
          </HelpSection>

          <HelpSection title="Adding jobs">
            {item("+ Add job", "Add a role manually, or paste a job posting link and Followup fills in the title, company, and salary for you.")}
            {item("Capture button", "On desktop, drag the capture bookmarklet (Settings → Job capture) to your bookmarks bar. On any job posting, one click saves it with the details pre-filled.")}
          </HelpSection>

          <HelpSection title="Following up">
            <p style={{ marginBottom: 10 }}>Followup reminds you on a set cadence. By default <b>7 days</b> after applying and <b>3 days</b> after a phone screen or interview, with anything quiet for <b>14 days</b> flagged as going cold. Change all three in Settings → Automation. High-interest jobs rise to the top of your follow-ups.</p>
            {item("✍️ Draft", "Drafts the email for you: pick a template, tweak it, then copy it, open it in your mail app, or mark it sent. Available on due follow-ups and job-linked reminders in Today, and from \"✍️ Draft follow-up\" in each job's detail panel.")}
            {item("✓ Contacted", "Logs the follow-up to the job's timeline and resets the timer.")}
            {item("Snooze", "Not yet? Push the reminder out +3 days, +7 days, or −30 days.")}
            {item("✕ Stop following up", "Cancel a follow-up entirely so it stops reminding you. Reversible anytime from the job's detail panel.")}
          </HelpSection>

          <HelpSection title="Reminders & interviews">
            {item("Interview dates", "Set a date and time on a job and Followup auto-creates a day-before reminder, plus a button to add it to Google Calendar.")}
            {item("Manual reminders", "Use 🔔 Remind in a job's detail panel (opens the Reminders section) or “+ Add task” in Today to set your own reminders.")}
            {item("Browser reminders", "Turn on desktop notifications from your Profile screen (Backup & data). Followup checks for overdue follow-ups when you open it in that browser and shows a notification. It won't nudge you while the app is closed.")}
          </HelpSection>

          <HelpSection title="Organizing & finding jobs">
            {item("Interest ⭐", "Rate how much you want each job. Tap the stars (Low / Medium / High) on any card or in the detail panel. High-interest jobs sort up and get prioritized in Today. Sort by interest from the Filters menu.")}
            {item("Statuses & tags", "Move jobs through stages, and tag them by work type, industry, and source.")}
            {item("Salary & notes", "Record a salary range, free-form notes, and a timeline of every step on each job.")}
            {item("Filters & search", "Filter by status (the bubbles), or by tag, outreach, and sort order (the Filters menu). Press / to jump to search.")}
            {item("Archive", "Archive a finished role from its detail panel (or bulk-select in List) to hide it without deleting it. To view archived jobs, open Filters → “Show archived jobs.”")}
          </HelpSection>

          <HelpSection title="Settings, data & shortcuts">
            {item("Profile", "Set your name (used to sign off follow-up drafts), change your password, manage your documents (resumes, cover letters, portfolios), and get the capture bookmarklet, all in your Profile screen (👤 Profile tab on mobile, Profile button on desktop).")}
            {item("Automation", "In Profile → Follow-up automation, tune your follow-up timing, auto-archiving of rejected/withdrawn jobs, and the quiet-job review prompt. These preferences sync across all your devices.")}
            {item("Backup & export", "In Profile → Backup & data, export a JSON backup (or restore one), and export your jobs to CSV.")}
            {item("Dark mode", "Toggle the 🌙 / ☀️ switch in the header.")}
            {item("Shortcuts", "N = new job · / = search · Esc = close.")}
          </HelpSection>

          <HelpSection title="FAQ">
            {item("Is it free?", "Yes. Everything in Followup is free to use right now, no account limits or paywalls.")}
            {item("Is my data private?", "Your job data is yours, stored securely with Supabase and never sold or used for ads. We use PostHog analytics to see which features get used, not the content of your entries. Full details in our Privacy Policy.")}
            {item("How does the follow-up timer work?", "By default Followup flags a job 7 days after applying, 3 days after a phone screen or interview, and marks anything quiet for 14+ days as going cold. All three (plus your weekly goal) are adjustable in Profile → Follow-up automation.")}
            {item("Will it notify me if I close the app?", "Not yet, honestly. Browser reminders only fire when you open Followup in that browser; there's no push notification while it's closed. That's on the roadmap.")}
            {item("Can I get my data out, or delete my account?", "Yes to both, any time, no email needed. Export a full JSON backup or CSV from Profile → Backup & data, and permanently delete your account and all its data from Profile → Danger zone.")}
            {item("Is there a phone app?", "Not a native app yet. Followup is a responsive web app, and on mobile you can \"Add to Home Screen\" for an app-like icon and full-screen view. A real App Store app is on the roadmap.")}
            {item("What's coming next?", "AI-drafted follow-up emails and AI resume tailoring are both in development. Nothing's paywalled today. If that changes, we'll say so clearly before it does.")}
          </HelpSection>

          <HelpSection title="Need help?">
            <p style={{ marginBottom: 10 }}>Your data is saved to your account automatically. If something looks off, refreshing the page or signing out and back in fixes most issues.</p>
            <p style={{ marginBottom: 12 }}>Have feedback or found a bug? Send it straight to us. Followup is in active development and more is on the way.</p>
            <FeedbackForm />
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>Prefer email? Reach us directly at <a href="mailto:jinkweon@gmail.com" style={{ color: "var(--accent)" }}>jinkweon@gmail.com</a>.</p>
          </HelpSection>
        </div>
      </div>
    </div>
  );
}

// ── Documents (part of Profile → Your stuff) ──────────────────────────────────
function DocumentsView({ documents, onDocumentsChange }) {
  const [newDoc, setNewDoc] = useState({ type:"Resume", name:"", link:"", notes:"" });
  const inputStyle = { fontSize:13, padding:"8px 10px", border:"1px solid var(--input-border)", borderRadius:8, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };

  function addDocument() {
    if (!newDoc.name.trim()) return;
    onDocumentsChange([...documents, { id: Date.now(), type: newDoc.type, name: newDoc.name.trim(), link: newDoc.link.trim(), notes: newDoc.notes.trim(), createdAt: new Date().toISOString() }]);
    setNewDoc(d => ({ type:d.type, name:"", link:"", notes:"" })); // keep the type selected for adding several in a row
  }
  function deleteDocument(id) {
    onDocumentsChange(documents.filter(d => d.id !== id));
  }

  return (
    <div style={{ maxWidth:480 }}>
      <div style={{ fontSize:16, fontWeight:600, color:"var(--text-primary)", marginBottom:6 }}>📁 Documents</div>
      <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:16 }}>
        Track resumes, cover letters, portfolios, and other files (with a link to each). Then attach the ones you used on each job's detail panel.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:14 }}>
        {documents.length === 0 && <div style={{ fontSize:12, color:"var(--text-muted)" }}>No documents yet.</div>}
        {DOC_TYPES.filter(t => documents.some(d => docType(d)===t)).map(t => (
          <div key={t} style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{t}</div>
            {documents.filter(d => docType(d)===t).map(d => (
              <div key={d.id} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, padding:"8px 10px", background:"var(--surface-subtle)", border:"1px solid var(--border-subtle)", borderRadius:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{d.name}</div>
                  {d.link && isSafeUrl(d.link) && <a href={d.link} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"var(--accent)", textDecoration:"none" }}>View file ↗</a>}
                  {d.notes && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{d.notes}</div>}
                </div>
                <button onClick={() => deleteDocument(d.id)} title="Delete" style={{ fontSize:11, padding:"6px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border-subtle)", borderRadius:4, cursor:"pointer", flexShrink:0, minHeight:44, minWidth:44 }}>✕</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, paddingTop:10, borderTop:"1px solid var(--border)" }}>
        <select value={newDoc.type} onChange={e=>setNewDoc(f=>({...f,type:e.target.value}))} style={inputStyle}>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="text" placeholder="Name (e.g. Resume: PM roles)" value={newDoc.name} onChange={e=>setNewDoc(f=>({...f,name:e.target.value}))} style={inputStyle} />
        <input type="url" placeholder="Link to file (Google Drive, Dropbox, etc.)" value={newDoc.link} onChange={e=>setNewDoc(f=>({...f,link:e.target.value}))} style={inputStyle} />
        <input type="text" placeholder="Notes (optional)" value={newDoc.notes} onChange={e=>setNewDoc(f=>({...f,notes:e.target.value}))} style={inputStyle} />
        <button onClick={addDocument} disabled={!newDoc.name.trim()} style={{ fontSize:13, padding:"9px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, minHeight:44 }}>+ Add document</button>
      </div>
    </div>
  );
}

// ── Profile screen — merges the old Settings modal + ☰ hamburger menu into one
// unified screen (tab destination on mobile, route on desktop). "Your stuff"
// groups Contacts/Documents/Archived; the bookmarklet section is desktop-only.
function ProfileScreen({
  user, isMobile,
  profileName, onProfileNameChange,
  autoArchiveDays, onAutoArchiveDaysChange,
  quietPromptDays, onQuietPromptDaysChange,
  followupAppliedDays, onFollowupAppliedChange,
  followupWarmDays, onFollowupWarmChange,
  staleDays, onStaleDaysChange,
  weeklyGoal, onWeeklyGoalChange,
  contactsCount, documentsCount, archivedCount,
  onOpenContacts, onOpenDocuments, onOpenArchived, onShowHelp,
  exportJSON, importJSON, exportCSV, importCSV, enableNotifications,
  automationSignal, onAutomationOpen, bookmarkletSignal, onBookmarkletOpen,
}) {
  const [nameField, setNameField] = useState(profileName || "");
  const [nameMsg, setNameMsg] = useState("");
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [conf, setConf] = useState("");
  const [pwError, setPwError] = useState(""); const [pwMsg, setPwMsg] = useState(""); const [pwLoading, setPwLoading] = useState(false);
  const [delOpen, setDelOpen] = useState(false); const [delConfirm, setDelConfirm] = useState(""); const [delError, setDelError] = useState(""); const [delLoading, setDelLoading] = useState(false);
  const bookmarkletRef = useRef(null);

  async function deleteAccount() {
    setDelError(""); setDelLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setDelError("Your session expired. Please sign in again."); setDelLoading(false); return; }
      const resp = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setDelError(data.error || "Couldn't delete your account. Please try again."); setDelLoading(false); return; }
      track("account_deleted");
      // Account is gone; sign out to clear the dead session and return to the auth screen.
      await supabase.auth.signOut();
    } catch {
      setDelError("Couldn't reach the server. Please try again."); setDelLoading(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault(); setPwError(""); setPwMsg("");
    if (pw !== conf) { setPwError("Passwords don't match"); return; }
    if (pw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    setPwLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: cur });
    if (signInErr) { setPwError("Current password is incorrect"); setPwLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setPwError(error.message); } else { setPwMsg("Password updated successfully."); setCur(""); setPw(""); setConf(""); }
    setPwLoading(false);
  }

  const inputStyle = { fontSize:13, padding:"8px 10px", border:"1px solid var(--input-border)", borderRadius:8, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };
  const navRow = { display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"12px 14px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontSize:14, color:"var(--text-primary)", fontWeight:500, minHeight:44, textAlign:"left" };

  const bookmarkletCode = `javascript:(function(){function m(n){var e=document.querySelector('meta[property="'+n+'"]')||document.querySelector('meta[name="'+n+'"]');return e?e.content:'';}function t(sels){for(var i=0;i<sels.length;i++){var e=document.querySelector(sels[i]);if(e&&e.textContent.trim())return e.textContent.trim();}return '';}function p(s){s=String(s).trim();if(/k$/i.test(s))return Math.round(parseFloat(s)*1000);return Math.round(parseFloat(s.replace(/,/g,'')));}var role='',company='',salMin='',salMax='';try{var ld=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<ld.length;i++){var data=JSON.parse(ld[i].textContent);var arr=Array.isArray(data)?data:[data];for(var j=0;j<arr.length;j++){var d=arr[j];if(d['@type']==='JobPosting'){role=d.title||role;company=(d.hiringOrganization&&d.hiringOrganization.name)||company;if(d.baseSalary){var bs=d.baseSalary.value||d.baseSalary;if(bs){if(bs.minValue!=null)salMin=bs.minValue;if(bs.maxValue!=null)salMax=bs.maxValue;if(bs.value!=null&&!salMin&&!salMax)salMin=salMax=bs.value;}}}}}}catch(e){}if(!role)role=t(['h1.job-details-jobs-unified-top-card__job-title','.t-24.job-details-jobs-unified-top-card__job-title','h1.top-card-layout__title','[data-testid="jobsearch-JobInfoHeader-title"]','.jobsearch-JobInfoHeader-title']);if(!company)company=t(['.job-details-jobs-unified-top-card__company-name','.topcard__org-name-link','[data-testid="inlineHeader-companyName"]','.jobsearch-CompanyInfoContainer a']);if(!role){role=m('og:title')||document.title;role=role.replace(/\\s*[|\\-–]\\s*(LinkedIn|Indeed.*|Glassdoor.*)$/i,'').trim();}if(!company)company=m('og:site_name');if(!salMin&&!salMax){try{var bodyTxt=document.body.innerText||'';var rx=/\\$\\s?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s?[kK])\\s*(?:-|–|to)\\s*\\$?\\s?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s?[kK])/;var mm=bodyTxt.match(rx);if(mm){salMin=p(mm[1]);salMax=p(mm[2]);}}catch(e){}}var link=location.href;var jk=new URLSearchParams(location.search).get('vjk')||new URLSearchParams(location.search).get('jk');if(jk&&location.hostname.indexOf('indeed.')>-1)link='https://'+location.hostname+'/viewjob?jk='+jk;var url='https://job-tracker-tau-eight.vercel.app/?capture=1&role='+encodeURIComponent(role)+'&company='+encodeURIComponent(company)+'&link='+encodeURIComponent(link)+'&salMin='+encodeURIComponent(salMin)+'&salMax='+encodeURIComponent(salMax);window.open(url,'_blank');})();`;

  // React 19 blocks javascript: hrefs set via JSX as an XSS precaution — set it via the DOM API instead.
  useEffect(() => {
    if (bookmarkletRef.current) bookmarkletRef.current.setAttribute('href', bookmarkletCode);
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:560 }}>
      <div>
        <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>Signed in as</div>
        <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>{user.email}</div>
      </div>

      <div style={{ padding:"14px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>Your name</div>
        <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:10 }}>Used to sign off your follow-up email drafts. It replaces "[Your name]" automatically.</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input type="text" placeholder="e.g. Jin Kweon" value={nameField} onChange={e=>setNameField(e.target.value)} style={{ ...inputStyle, flex:1, minWidth:160 }} />
          <button onClick={() => { onProfileNameChange(nameField.trim()); setNameMsg("Saved."); setTimeout(()=>setNameMsg(""),2000); }} style={{ fontSize:13, padding:"8px 16px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, minHeight:44 }}>Save</button>
        </div>
        {nameMsg && <div style={{ fontSize:12, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:6, padding:"8px 10px", marginTop:10 }}>{nameMsg}</div>}
      </div>

      <div>
        <div style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>🗂 Your stuff</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={onOpenContacts} style={navRow}><span>🤝 Contacts</span><span style={{ color:"var(--text-muted)", fontWeight:400 }}>{contactsCount} ›</span></button>
          <button onClick={onOpenDocuments} style={navRow}><span>📁 Documents</span><span style={{ color:"var(--text-muted)", fontWeight:400 }}>{documentsCount} ›</span></button>
          <button onClick={onOpenArchived} style={navRow}><span>📦 Archived jobs</span><span style={{ color:"var(--text-muted)", fontWeight:400 }}>{archivedCount} ›</span></button>
        </div>
      </div>

      <PanelSection label="🔔 Follow-up automation" defaultOpen={false} forceOpen={automationSignal} onOpen={onAutomationOpen}>
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:10 }}>How long Followup waits before nudging you to follow up, and when it flags a job as going cold.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}><input type="number" min="1" value={followupAppliedDays} onChange={e=>onFollowupAppliedChange(e.target.value)} style={{ ...inputStyle, width:70 }} /> days after applying</label>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}><input type="number" min="1" value={followupWarmDays} onChange={e=>onFollowupWarmChange(e.target.value)} style={{ ...inputStyle, width:70 }} /> days after a phone screen or interview</label>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}><input type="number" min="1" value={staleDays} onChange={e=>onStaleDaysChange(e.target.value)} style={{ ...inputStyle, width:70 }} /> days with no activity → flag as going cold</label>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}><input type="number" min="1" value={weeklyGoal} onChange={e=>onWeeklyGoalChange(e.target.value)} style={{ ...inputStyle, width:70 }} /> follow-ups per week, your Today goal ring</label>
            </div>
          </div>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>Auto-archive rejected &amp; withdrawn jobs</div>
            <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:10 }}>Jobs you've marked Rejected or Withdrawn move to Archived automatically after this many days. They stay recoverable in the Archived view. Set to 0 to turn this off.</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="number" min="0" value={autoArchiveDays} onChange={e=>onAutoArchiveDaysChange(e.target.value)} style={{ ...inputStyle, width:90 }} />
              <span style={{ fontSize:13, color:"var(--text-secondary)" }}>days</span>
            </div>
          </div>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 }}>Prompt to review quiet applications</div>
            <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:10 }}>When an active job you haven't rated Medium or High has had no activity for this many days, the Today page offers to archive it. Nothing happens until you choose. Set to 0 to turn this off.</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="number" min="0" value={quietPromptDays} onChange={e=>onQuietPromptDaysChange(e.target.value)} style={{ ...inputStyle, width:90 }} />
              <span style={{ fontSize:13, color:"var(--text-secondary)" }}>days</span>
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection label="🔑 Password" defaultOpen={false}>
        <form onSubmit={changePassword} style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <PasswordInput placeholder="Current password" value={cur} onChange={e=>setCur(e.target.value)} required autoComplete="current-password" style={inputStyle} />
          <PasswordInput placeholder="New password" value={pw} onChange={e=>setPw(e.target.value)} required autoComplete="new-password" style={inputStyle} />
          <PasswordInput placeholder="Confirm new password" value={conf} onChange={e=>setConf(e.target.value)} required autoComplete="new-password" style={inputStyle} />
          {pwError && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:6, padding:"8px 10px" }}>{pwError}</div>}
          {pwMsg && <div style={{ fontSize:12, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:6, padding:"8px 10px" }}>{pwMsg}</div>}
          <button type="submit" disabled={pwLoading} style={{ fontSize:13, padding:"9px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, opacity:pwLoading?0.7:1, minHeight:44 }}>
            {pwLoading ? "Saving…" : "Update password"}
          </button>
        </form>
      </PanelSection>

      {!isMobile && (
        <PanelSection label="🔖 Capture jobs from any site" defaultOpen={false} forceOpen={bookmarkletSignal} onOpen={onBookmarkletOpen}>
          <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:14 }}>
            Drag the button below to your browser's bookmarks bar. While viewing a job posting (LinkedIn, Indeed, Greenhouse, etc.), click it to open Followup with the role, company, and link pre-filled.
          </div>
          <a ref={bookmarkletRef} onClick={e => e.preventDefault()} draggable
            style={{ display:"inline-block", fontSize:13, padding:"9px 18px", background:"#185FA5", color:"#fff", borderRadius:8, fontWeight:600, textDecoration:"none", cursor:"grab", userSelect:"none" }}>
            📋 Capture job
          </a>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:14, lineHeight:1.6 }}>
            Tip: if your bookmarks bar is hidden, enable it first (Ctrl/Cmd+Shift+B), then drag the button onto it. Some sites may not expose a title/company automatically. You can edit the prefilled details before saving.
          </div>
        </PanelSection>
      )}

      <PanelSection label="💾 Backup & data" defaultOpen={false}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={exportJSON} style={navRow}>💾 Export backup (JSON)</button>
          <label style={navRow}>📂 Restore backup (JSON)<input type="file" accept=".json" onChange={importJSON} style={{ display:"none" }} /></label>
          <button onClick={exportCSV} style={navRow}>Export CSV</button>
          <label style={navRow}>Import CSV<input type="file" accept=".csv" onChange={importCSV} style={{ display:"none" }} /></label>
          <button onClick={enableNotifications} style={navRow}>{typeof Notification !== "undefined" && Notification.permission==="granted" ? "🔔 Reminders on" : "🔔 Enable reminders"}</button>
          <div style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.6, padding:"0 2px" }}>
            Shows a browser notification for overdue follow-ups when you open Followup in this browser, not a push notification while it's closed.
          </div>
        </div>
      </PanelSection>

      <button onClick={onShowHelp} style={navRow}><span>❓ Guide &amp; help</span><span style={{ color:"var(--text-muted)" }}>›</span></button>

      {/* Danger zone */}
      <div style={{ marginTop:8, padding:"14px 16px", background:"var(--surface)", border:"1px solid #F0B4B0", borderRadius:10 }}>
        <div style={{ fontSize:13, fontWeight:600, color:getStatusCfg("Rejected").text, marginBottom:6 }}>Danger zone</div>
        {!delOpen ? (
          <>
            <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6, marginBottom:10 }}>
              Permanently delete your account and all your data: jobs, contacts, documents, reminders, and settings. This can't be undone. Want a copy first? Export a backup from <b>Backup &amp; data</b> above.
            </div>
            <button onClick={() => { setDelOpen(true); setDelConfirm(""); setDelError(""); }} style={{ fontSize:13, padding:"8px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:8, cursor:"pointer", fontWeight:600, minHeight:44 }}>Delete account</button>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.6, marginBottom:10 }}>
              This will <b>permanently delete everything</b> for <b>{user.email}</b>. Type <b>DELETE</b> below to confirm.
            </div>
            <input value={delConfirm} onChange={e => { setDelConfirm(e.target.value); setDelError(""); }} placeholder="Type DELETE" autoComplete="off" style={{ ...inputStyle, marginBottom:10 }} />
            {delError && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:6, padding:"8px 10px", marginBottom:10 }}>{delError}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={() => { setDelOpen(false); setDelConfirm(""); setDelError(""); }} disabled={delLoading} style={{ fontSize:13, padding:"8px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:500, minHeight:44 }}>Cancel</button>
              <button onClick={deleteAccount} disabled={delConfirm.trim() !== "DELETE" || delLoading} style={{ fontSize:13, padding:"8px 14px", background: delConfirm.trim()==="DELETE" && !delLoading ? "#A32D2D" : "var(--surface-hover)", color: delConfirm.trim()==="DELETE" && !delLoading ? "#fff" : "var(--text-muted)", border:"1.5px solid " + (delConfirm.trim()==="DELETE" && !delLoading ? "#791F1F" : "var(--border)"), borderRadius:8, cursor: delConfirm.trim()==="DELETE" && !delLoading ? "pointer" : "not-allowed", fontWeight:600, minHeight:44 }}>{delLoading ? "Deleting…" : "Permanently delete"}</button>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign:"center", fontSize:12, color:"var(--text-muted)", marginTop:4 }}>
        <a href="/privacy.html" target="_blank" rel="noopener" style={{ color:"var(--text-muted)" }}>Privacy</a> · <a href="/terms.html" target="_blank" rel="noopener" style={{ color:"var(--text-muted)" }}>Terms</a>
      </div>
    </div>
  );
}

// ── First-visit coach mark (one dismissible hint per view, no tour library) ────
function ViewHint({ viewKey, text }) {
  const storageKey = `followup_hint_seen_${viewKey}`;
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(storageKey) === "1"; } catch { return false; } });
  if (dismissed) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"space-between", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, padding:"9px 12px", marginBottom:12, fontSize:12, color:"var(--text-secondary)" }}>
      <span>{text}</span>
      <button onClick={() => { setDismissed(true); try { localStorage.setItem(storageKey, "1"); } catch {} }} style={{ flexShrink:0, padding:"2px 6px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", display:"flex" }}><Icon name="x" size={12} /></button>
    </div>
  );
}

// ── Shared empty state ─────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc, action, onAction }) {
  return (
    <div style={{ textAlign:"center", padding:"4rem 1rem" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.6, maxWidth:340, margin:"0 auto" }}>{desc}</div>
      {action && <button onClick={onAction} style={{ marginTop:16, fontSize:13, padding:"8px 20px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:500 }}>{action}</button>}
    </div>
  );
}

// ── Contacts ────────────────────────────────────────────────────────────────────
function ContactsView({ contacts, jobs, search, onOpenPanel, onAdd }) {
  const q = (search||"").trim().toLowerCase();
  const filtered = contacts.filter(c => !q ||
    (c.name||"").toLowerCase().includes(q) ||
    (c.company||"").toLowerCase().includes(q) ||
    (c.title||"").toLowerCase().includes(q));

  if (contacts.length === 0) {
    return <EmptyState icon="👥" title="No contacts yet" desc="Track recruiters, hiring managers, and referrals here, and link them to the jobs you're applying to." action="+ Add contact" onAction={onAdd} />;
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:12 }}>
      {filtered.map(c => {
        const linkedCount = (c.relatedJobIds||[]).length;
        return (
          <div key={c.id} onClick={() => onOpenPanel(c)}
            style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 14px", cursor:"pointer", display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)" }}>{c.name}</div>
            {(c.title || c.company) && <div style={{ fontSize:12, color:"var(--text-secondary)" }}>{contactSubtitle(c)}</div>}
            {c.email && <div style={{ fontSize:11, color:"var(--text-muted)" }}>✉️ {c.email}</div>}
            {c.phone && <div style={{ fontSize:11, color:"var(--text-muted)" }}>📞 {c.phone}</div>}
            {linkedCount > 0 && <div style={{ fontSize:11, color:"var(--accent)", fontWeight:500, marginTop:2 }}>🔗 {linkedCount} job{linkedCount>1?"s":""}</div>}
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"2rem" }}>No contacts match "{search}"</div>}
    </div>
  );
}

function ContactModal({ contact, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(() => contact ? { ...contact } : { name:"", title:"", company:"", email:"", phone:"", linkedin:"", notes:"" });
  const inputStyle = { fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 10px", background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };
  return (
    <div className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"1rem" }}>
      <div className="modal-inner" style={{ background:"var(--surface)", borderRadius:12, border:"0.5px solid var(--border)", padding:"1.5rem", width:"100%", maxWidth:420, maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 1rem", fontWeight:500, fontSize:16, color:"var(--text-primary)" }}>{contact ? "Edit contact" : "Add contact"}</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[["Name *","name","text","e.g. Jane Smith"],["Title","title","text","e.g. Technical Recruiter"],["Company","company","text","e.g. Acme Corp"],["Email","email","email","jane@acme.com"],["Phone","phone","tel","(555) 123-4567"],["LinkedIn","linkedin","url","https://linkedin.com/in/..."]].map(([label,key,type,ph]) => (
            <label key={key} style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>{label}
              <input type={type} placeholder={ph} value={form[key]||""} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} style={inputStyle} />
            </label>
          ))}
          <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Notes
            <textarea rows={3} value={form.notes||""} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit" }} />
          </label>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:"1.25rem", justifyContent:"space-between", alignItems:"center" }}>
          {onDelete && <button onClick={onDelete} style={{ fontSize:13, padding:"6px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>Delete</button>}
          <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
            <button onClick={onClose} style={{ fontSize:13, padding:"6px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Cancel</button>
            <button onClick={() => onSave(form)} disabled={!form.name} style={{ fontSize:13, padding:"6px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPanel({ contact, jobs, onClose, onEdit, onOpenJob, onUnlinkJob }) {
  const linkedJobs = jobs.filter(j => (contact.relatedJobIds||[]).includes(j.id));
  return (
    <div className="detail-panel" style={{ position:"fixed", top:0, right:0, bottom:0, width:360, background:"var(--surface)", borderLeft:"1px solid var(--border)", zIndex:150, display:"flex", flexDirection:"column", boxShadow:"-4px 0 20px rgba(0,0,0,0.12)" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:"linear-gradient(90deg,#185FA5 0%,#3C3489 100%)" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, color:"#fff", fontWeight:700, marginBottom:2 }}>{contact.name}</div>
          {(contact.title || contact.company) && <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{contactSubtitle(contact)}</div>}
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", cursor:"pointer", borderRadius:6, padding:"2px 8px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="x" size={16} /></button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:14, background:"var(--surface)" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {contact.email && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:80 }}>Email</span><a href={`mailto:${contact.email}`} style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>{contact.email}</a></div>}
          {contact.phone && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:80 }}>Phone</span><span style={{ color:"var(--text-primary)", fontWeight:500 }}>{contact.phone}</span></div>}
          {contact.linkedin && isSafeUrl(contact.linkedin) && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:80 }}>LinkedIn</span><a href={contact.linkedin} target="_blank" rel="noreferrer" style={{ color:"var(--accent)", textDecoration:"none", fontWeight:500 }}>View profile ↗</a></div>}
        </div>
        {contact.notes && <div style={{ fontSize:12, color:"var(--text-secondary)", whiteSpace:"pre-wrap", lineHeight:1.5 }}>{contact.notes}</div>}
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>Linked jobs{linkedJobs.length > 0 ? ` (${linkedJobs.length})` : ""}</div>
          {linkedJobs.length === 0 && <div style={{ fontSize:12, color:"var(--text-muted)" }}>No jobs linked yet. Link this contact from a job's detail panel.</div>}
          {linkedJobs.map(j => (
            <div key={j.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"6px 0", borderBottom:"1px solid var(--border-subtle)" }}>
              <div onClick={() => onOpenJob(j)} style={{ cursor:"pointer", flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)" }}>{j.role}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)" }}>{j.company}</div>
              </div>
              <button onClick={() => onUnlinkJob(j.id)} title="Unlink" style={{ fontSize:11, padding:"2px 6px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border-subtle)", borderRadius:4, cursor:"pointer" }}>✕</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)" }}>
        <button onClick={onEdit} style={{ width:"100%", fontSize:13, padding:"8px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Edit contact</button>
      </div>
    </div>
  );
}

// ── Offer comparison ───────────────────────────────────────────────────────────
function OffersView({ jobs, onOpenPanel }) {
  const offers = jobs.filter(j => !j.archived && (j.offerBase || j.offerBonus || j.offerEquity || j.offerStartDate || j.offerDeadline));

  if (offers.length === 0) {
    return <EmptyState icon="🎉" title="No offers yet" desc="Once a job reaches the Offer stage, fill in salary, bonus, equity, and deadline details from its detail panel. They'll show up here for side-by-side comparison." />;
  }

  const today = todayStr();
  const cols = [
    ["Role", j => <><div style={{ fontWeight:600, color:"var(--text-primary)" }}>{j.company}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{j.role}</div></>],
    ["Base salary", j => j.offerBase ? `$${parseInt(j.offerBase).toLocaleString()}` : "-"],
    ["Signing bonus", j => j.offerBonus ? `$${parseInt(j.offerBonus).toLocaleString()}` : "-"],
    ["Total (base+bonus)", j => (j.offerBase||j.offerBonus) ? `$${(parseInt(j.offerBase||0)+parseInt(j.offerBonus||0)).toLocaleString()}` : "-"],
    ["Equity", j => j.offerEquity || "-"],
    ["Start date", j => j.offerStartDate ? fmtDate(j.offerStartDate+"T00:00:00") : "-"],
    ["Deadline", j => j.offerDeadline ? fmtDate(j.offerDeadline+"T00:00:00") : "-"],
  ];

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr>
            {cols.map(([label]) => (
              <th key={label} style={{ textAlign:"left", padding:"8px 12px", borderBottom:`2px solid var(--border)`, color:"var(--text-secondary)", fontWeight:600, whiteSpace:"nowrap" }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {offers.map(j => {
            const deadlineSoon = j.offerDeadline && j.offerDeadline >= today && (new Date(j.offerDeadline) - new Date(today)) / 86400000 <= 3;
            return (
              <tr key={j.id} onClick={() => onOpenPanel(j)} style={{ cursor:"pointer" }}>
                {cols.map(([label, render], i) => (
                  <td key={label} style={{ padding:"10px 12px", borderBottom:"1px solid var(--border-subtle)", whiteSpace:"nowrap",
                    color: label==="Deadline" && deadlineSoon ? getStatusCfg("Rejected").text : "var(--text-primary)",
                    fontWeight: label==="Deadline" && deadlineSoon ? 600 : 400 }}>
                    {render(j)}{label==="Deadline" && deadlineSoon ? " ⚠" : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Interview calendar view ────────────────────────────────────────────────────
const CAL_TYPES = {
  interview: { label:"Interviews", icon:"🗓️", bg:"#185FA5",          text:"#fff",                    border:"#0C447C" },
  followup:  { label:"Follow-ups", icon:"🔔", bg:"#FAEEDA",          text:"#633806",                 border:"#FAC775" },
  task:      { label:"Reminders",  icon:"⏰", bg:"#EAF3DE",          text:"#27500A",                 border:"#C0DD97" },
  timeline:  { label:"Milestones", icon:"📋", bg:"var(--surface-hover)", text:"var(--text-secondary)", border:"var(--border)" },
};
const CAL_TYPES_DARK = {
  interview: { label:"Interviews", icon:"🗓️", bg:"#1a3550", text:"#7BB8F0", border:"#2d5580" },
  followup:  { label:"Follow-ups", icon:"🔔", bg:"#3d2b10", text:"#FAC775", border:"#5c4020" },
  task:      { label:"Reminders",  icon:"⏰", bg:"#1a3010", text:"#90C855", border:"#2a5020" },
  timeline:  { label:"Milestones", icon:"📋", bg:"var(--surface-hover)", text:"var(--text-secondary)", border:"var(--border)" },
};
const getCalCfg = (type) => ((isDark() ? CAL_TYPES_DARK : CAL_TYPES)[type] || {});

// Per-milestone icon + pipeline-stage colors so each calendar event reads at a glance.
const MILESTONE_ICONS = { Applied:"📨", "Phone Screen":"📞", Interview:"🗓️", Offer:"🎉", Rejected:"❌", Withdrawn:"↩️", Note:"📝" };
const CAL_TYPE_NAMES = { interview:"Interview", followup:"Follow-up", task:"Reminder" };
function eventStyle(ev) {
  if (ev.type === "timeline") {
    const m = ev.milestone || "Note";
    const icon = MILESTONE_ICONS[m] || "📋";
    if (STATUS_CONFIG[m]) { const c = getStatusCfg(m); return { icon, bg:c.bg, text:c.text, border:c.border, name:m }; }
    const c = getCalCfg("timeline"); return { icon, bg:c.bg, text:c.text, border:c.border, name:m };
  }
  const c = getCalCfg(ev.type);
  return { icon:c.icon, bg:c.bg, text:c.text, border:c.border, name: CAL_TYPE_NAMES[ev.type] || c.label };
}

function CalendarView({ jobs, tasks, onOpenPanel }) {
  const isMobile = useIsMobile();
  const [calView, setCalView] = useState(() => isMobile ? "agenda" : "month"); // "month" | "week" | "day" | "agenda" — agenda is the mobile default (month grid doesn't fit 375px)
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  // Mini-month sidebar has its own browsable month independent of anchor
  const [miniMonth, setMiniMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [show, setShow] = useState({ interview:true, followup:true, task:true, timeline:false });
  const toggleType = (t) => setShow(s => ({ ...s, [t]: !s[t] }));
  const [sidebarOpen, setSidebarOpen] = useState(() => { try { return window.innerWidth >= 640; } catch { return true; } });

  const today_ = todayStr();

  // Build events map: date → [{type, label, sub, job, task}]
  const byDate = {};
  function addEv(date, ev) {
    if (!date) return;
    const key = date.slice(0,10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }
  if (show.interview)
    jobs.filter(j => !j.archived && j.interviewDate).forEach(j =>
      addEv(j.interviewDate, { type:"interview", label:j.company, sub:j.role, job:j }));
  if (show.followup)
    jobs.filter(j => !j.archived).forEach(j => {
      const fuDate = getFollowupDate(j);
      if (fuDate && fuDate >= today_) addEv(fuDate, { type:"followup", label:j.company, sub:`Follow-up · ${j.status}`, job:j });
    });
  if (show.task)
    (tasks||[]).filter(t => !t.done && t.dueDate).forEach(t => {
      const linkedJob = t.jobId ? jobs.find(j => j.id == t.jobId) : null;
      addEv(t.dueDate, { type:"task", label:t.text, sub:linkedJob?.company||null, job:linkedJob, task:t });
    });
  if (show.timeline)
    jobs.filter(j => !j.archived).forEach(j =>
      (j.timeline||[]).forEach(e => {
        if (!e.date) return;
        // Interview/Phone Screen milestones duplicate the real appointment (the "interview" event type) once one is scheduled.
        if ((e.status==="Interview" || e.status==="Phone Screen") && j.interviewDate) return;
        const isManual = e.type==="manual";
        const label = isManual ? (e.label||"Note") : e.status;
        addEv(e.date, { type:"timeline", label:j.company, sub:label, job:j, milestone: isManual ? "Note" : (e.status || "Note") });
      }));

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // ── Navigation ──
  function navigate(dir) {
    setAnchor(prev => {
      const d = new Date(prev);
      if (calView === "month") { d.setMonth(d.getMonth() + dir); setMiniMonth({ y: d.getFullYear(), m: d.getMonth() }); }
      else if (calView === "week") d.setDate(d.getDate() + dir * 7);
      else if (calView === "agenda") d.setDate(d.getDate() + dir * 14);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }
  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0);
    setAnchor(d);
    setMiniMonth({ y: d.getFullYear(), m: d.getMonth() });
  }
  function jumpToDay(date) {
    const d = new Date(date); d.setHours(0,0,0,0);
    setAnchor(d);
    if (calView === "month") setMiniMonth({ y: d.getFullYear(), m: d.getMonth() });
  }

  // ── Header label ──
  function navLabel() {
    if (calView === "month") return `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (calView === "week") {
      const start = new Date(anchor);
      start.setDate(anchor.getDate() - anchor.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      if (start.getMonth() === end.getMonth()) return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      return `${monthNames[start.getMonth()]} – ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }
    if (calView === "agenda") return `Upcoming events`;
    return `${dayNames[anchor.getDay()]}, ${monthNames[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`;
  }

  // ── Event pill ──
  function EventPill({ ev, compact }) {
    const cfg = eventStyle(ev);
    return (
      <div
        title={`${cfg.name}: ${ev.label}${ev.sub && ev.sub !== cfg.name ? `, ${ev.sub}` : ""}`}
        style={{ fontSize: compact?9:11, padding: compact?"2px 4px":"4px 8px", background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`, borderRadius:4, marginBottom:2, cursor:ev.job?"pointer":"default", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.5 }}
        onClick={e => { e.stopPropagation(); ev.job && onOpenPanel(ev.job); }}>
        {cfg.icon} {ev.label}{!compact && ev.sub ? <span style={{ opacity:0.75 }}> · {ev.sub}</span> : ""}
      </div>
    );
  }

  // ── Mini month sidebar ──
  function MiniMonth() {
    const { y, m } = miniMonth;
    const prefix = `${y}-${String(m+1).padStart(2,"0")}`;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
    const anchorKey = anchor.toISOString().slice(0,10);
    return (
      <div>
        {/* Mini month nav */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <button onClick={() => setMiniMonth(({y,m}) => m===0?{y:y-1,m:11}:{y,m:m-1})}
            style={{ fontSize:12, padding:"2px 7px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", lineHeight:1.4 }}>‹</button>
          <span style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)" }}>{monthNames[m].slice(0,3)} {y}</span>
          <button onClick={() => setMiniMonth(({y,m}) => m===11?{y:y+1,m:0}:{y,m:m+1})}
            style={{ fontSize:12, padding:"2px 7px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", lineHeight:1.4 }}>›</button>
        </div>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:2 }}>
          {["S","M","T","W","T","F","S"].map((d,i) => (
            <div key={i} style={{ fontSize:9, fontWeight:600, color:"var(--text-muted)", textAlign:"center", padding:"2px 0" }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const dateKey = `${prefix}-${String(day).padStart(2,"0")}`;
            const isToday = dateKey === today_;
            const isSelected = dateKey === anchorKey;
            const hasEvs = (byDate[dateKey]||[]).length > 0;
            return (
              <div key={dateKey} onClick={() => { jumpToDay(new Date(dateKey + "T00:00:00")); if (calView==="month") setMiniMonth({y,m}); }}
                style={{ fontSize:10, height:22, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRadius:4, cursor:"pointer",
                  background: isSelected ? "var(--accent)" : isToday ? (isDark()?"#1a3550":"#EFF5FB") : "transparent",
                  color: isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--text-primary)",
                  fontWeight: isToday||isSelected ? 700 : 400 }}>
                {day}
                {hasEvs && !isSelected && <div style={{ width:3, height:3, borderRadius:"50%", background: isToday?"var(--accent)":getStatusCfg("Applied").border, marginTop:1 }} />}
              </div>
            );
          })}
        </div>
        {/* Event type toggles below mini month */}
        <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:5 }}>
          <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>Show</div>
          {Object.entries(CAL_TYPES).map(([type]) => { const cfg = getCalCfg(type); const on = show[type]; return (
            <button key={type} onClick={() => toggleType(type)}
              style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, padding:"5px 8px", borderRadius:6, cursor:"pointer", fontWeight: on ? 600 : 400, textAlign:"left",
                background: on ? cfg.bg : "var(--surface-hover)",
                color:       on ? cfg.text : "var(--text-muted)",
                border:     `${on ? "2px" : "1px"} solid ${on ? cfg.border : "var(--border)"}`,
                opacity:     on ? 1 : 0.5 }}>
              <span style={{ fontSize:9, lineHeight:1 }}>{on ? "●" : "○"}</span> {cfg.icon} {cfg.label}
            </button>
          ); })}
        </div>
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--border-subtle)" }}>
          <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>Milestone key</div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {[["📨","Applied"],["📞","Phone screen"],["🗓️","Interview"],["🎉","Offer"],["❌","Rejected"],["↩️","Withdrawn"]].map(([ic,nm]) => (
              <div key={nm} style={{ fontSize:11, color:"var(--text-secondary)", display:"flex", gap:7, alignItems:"center" }}><span style={{ width:16, textAlign:"center" }}>{ic}</span> {nm}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Month view ──
  function MonthView() {
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const monthPrefix = `${y}-${String(m+1).padStart(2,"0")}`;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
    const hasEvents = Object.keys(byDate).some(d => d.startsWith(monthPrefix));
    const MAX = 3;
    return (
      <>
        <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", background:"var(--border)" }}>
          {/* Day-of-week header */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
            {dayShort.map(d => (
              <div key={d} style={{ minWidth:0, fontSize:11, fontWeight:600, color:"var(--text-muted)", textAlign:"center", padding:"7px 0", background:"var(--surface-subtle)", borderBottom:"1px solid var(--border)" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ background:"var(--surface-subtle)", minHeight:78, minWidth:0 }} />;
              const dateKey = `${monthPrefix}-${String(day).padStart(2,"0")}`;
              const evs = byDate[dateKey] || [];
              const isToday = dateKey === today_;
              return (
                <div key={dateKey}
                  onClick={() => { const d=new Date(anchor); d.setFullYear(y,m,day); setAnchor(d); setCalView("day"); }}
                  style={{ minHeight:78, minWidth:0, overflow:"hidden", padding:"5px 6px", background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface)", cursor:"pointer" }}>
                  <div style={{ fontSize:11, fontWeight:isToday?700:400, color:isToday?"var(--accent)":"var(--text-muted)", marginBottom:3 }}>{day}</div>
                  {isMobile ? (
                    evs.length > 0 && (
                      <div style={{ display:"flex", alignItems:"center", gap:2, flexWrap:"wrap" }}>
                        {evs.slice(0,3).map((ev,ei) => <div key={ei} style={{ width:5, height:5, borderRadius:"50%", flexShrink:0, background:eventStyle(ev).border }} />)}
                        {evs.length > 3 && <span style={{ fontSize:8, color:"var(--text-muted)", marginLeft:1 }}>+{evs.length-3}</span>}
                      </div>
                    )
                  ) : (
                    <>
                      {evs.slice(0,MAX).map((ev,ei) => <EventPill key={ei} ev={ev} compact />)}
                      {evs.length > MAX && <div style={{ fontSize:9, color:"var(--text-muted)", paddingLeft:2 }}>+{evs.length-MAX} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {!hasEvents && <EmptyState icon="📅" title="Nothing this month" desc="No events found. Try toggling event types above or navigate to another month." />}
      </>
    );
  }

  // ── Week view ──
  function WeekView() {
    const startOfWeek = new Date(anchor);
    startOfWeek.setDate(anchor.getDate() - anchor.getDay());
    const days = Array.from({length:7}, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); return d; });
    return (
      <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", background:"var(--border)" }}>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
          {days.map(day => {
            const dateKey = day.toISOString().slice(0,10);
            const isToday = dateKey === today_;
            return (
              <div key={dateKey} onClick={() => { setAnchor(day); setCalView("day"); }}
                style={{ minWidth:0, background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface-subtle)", padding:"7px 8px", cursor:"pointer", textAlign:"center", borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontSize:10, fontWeight:600, color:isToday?"var(--accent)":"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{dayShort[day.getDay()]}</div>
                <div style={{ fontSize:17, fontWeight:isToday?700:400, color:isToday?"#fff":"var(--text-primary)", background:isToday?"var(--accent)":"transparent", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", margin:"2px auto 0" }}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* Event cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
          {days.map(day => {
            const dateKey = day.toISOString().slice(0,10);
            const evs = byDate[dateKey] || [];
            const isToday = dateKey === today_;
            return (
              <div key={dateKey} style={{ padding:"6px", background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface)", minHeight:120, minWidth:0, overflow:"hidden" }}>
                {evs.length === 0 && <div style={{ fontSize:10, color:"var(--text-muted)", fontStyle:"italic", textAlign:"center", paddingTop:6 }}>-</div>}
                {evs.map((ev,ei) => <EventPill key={ei} ev={ev} compact />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Day view ──
  function DayView() {
    const dateKey = anchor.toISOString().slice(0,10);
    const evs = byDate[dateKey] || [];
    const isToday = dateKey === today_;
    return (
      <div style={{ maxWidth:520, margin:"0 auto", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface-subtle)", borderBottom:"1px solid var(--border)", textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:600, color:isToday?"var(--accent)":"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{dayNames[anchor.getDay()]}</div>
          <div style={{ fontSize:28, fontWeight:700, color:isToday?"var(--accent)":"var(--text-primary)", lineHeight:1.2 }}>{anchor.getDate()}</div>
          <div style={{ fontSize:12, color:"var(--text-muted)" }}>{monthNames[anchor.getMonth()]} {anchor.getFullYear()}</div>
          {isToday && <div style={{ fontSize:11, fontWeight:600, color:"var(--accent)", marginTop:4 }}>Today</div>}
        </div>
        <div style={{ padding:"14px", background:"var(--surface)" }}>
        {evs.length === 0
          ? <EmptyState icon="📅" title="Nothing scheduled" desc="No events on this day. Try toggling event types or pick another day." />
          : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {evs.map((ev, i) => {
                const cfg = eventStyle(ev);
                const scfg = ev.job ? getStatusCfg(ev.job.status) : null;
                return (
                  <div key={i} onClick={() => ev.job && onOpenPanel(ev.job)}
                    style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderLeft:`4px solid ${cfg.border}`, borderRadius:8, cursor:ev.job?"pointer":"default" }}>
                    <span style={{ fontSize:18, flexShrink:0, marginTop:2 }}>{cfg.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:cfg.text, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{cfg.name}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:cfg.text, marginBottom:2 }}>{ev.label}</div>
                      {ev.sub && <div style={{ fontSize:12, color:cfg.text, opacity:0.8, marginBottom:4 }}>{ev.sub}</div>}
                      {scfg && <span style={{ fontSize:10, fontWeight:500, background:scfg.bg, color:scfg.text, border:`1px solid ${scfg.border}`, borderRadius:4, padding:"1px 6px" }}>{ev.job.status}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
        }
        </div>
      </div>
    );
  }

  // ── Agenda view ──
  function AgendaView() {
    // Collect all event dates from today_ forward, sorted
    const startDate = new Date(today_);
    const eventDates = Object.keys(byDate)
      .filter(d => d >= today_)
      .sort();
    if (eventDates.length === 0)
      return <EmptyState icon="📅" title="No upcoming events" desc="Nothing scheduled ahead. Try toggling event types above." />;

    // Group by month for section headers
    let lastMonth = null;
    return (
      <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", background:"var(--surface)" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:0, padding:"0 16px" }}>
        {eventDates.map(dateKey => {
          const evs = byDate[dateKey];
          if (!evs?.length) return null;
          const d = new Date(dateKey + "T00:00:00");
          const isToday = dateKey === today_;
          const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
          const showMonthHeader = monthKey !== lastMonth;
          lastMonth = monthKey;
          return (
            <div key={dateKey}>
              {showMonthHeader && (
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", padding:"14px 0 6px", borderBottom:"1px solid var(--border-subtle)", marginBottom:6 }}>
                  {monthNames[d.getMonth()]} {d.getFullYear()}
                </div>
              )}
              <div style={{ display:"flex", gap:0, marginBottom:10 }}>
                {/* Date column */}
                <div style={{ width:68, flexShrink:0, paddingTop:2, cursor:"pointer" }}
                  onClick={() => { jumpToDay(d); setCalView("day"); }}>
                  <div style={{ fontSize:10, fontWeight:600, color: isToday?"#185FA5":"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>{dayShort[d.getDay()]}</div>
                  <div style={{ fontSize:22, fontWeight:700, lineHeight:1.1,
                    color: isToday?"#fff":"var(--text-primary)",
                    background: isToday?"#185FA5":"transparent",
                    borderRadius:"50%", width:36, height:36,
                    display:"flex", alignItems:"center", justifyContent:"center", marginTop:2 }}>
                    {d.getDate()}
                  </div>
                </div>
                {/* Events column */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                  {evs.map((ev, ei) => {
                    const cfg = eventStyle(ev);
                    const scfg = ev.job ? getStatusCfg(ev.job.status) : null;
                    return (
                      <div key={ei} onClick={() => ev.job && onOpenPanel(ev.job)}
                        style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderLeft:`3px solid ${cfg.border}`, borderRadius:8, cursor:ev.job?"pointer":"default" }}
                        onMouseEnter={e => { if(ev.job) e.currentTarget.style.filter="brightness(0.96)"; }}
                        onMouseLeave={e => { e.currentTarget.style.filter="none"; }}>
                        <span style={{ fontSize:15, flexShrink:0 }}>{cfg.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:cfg.text, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{cfg.name}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:cfg.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.label}</div>
                          {ev.sub && <div style={{ fontSize:11, color:cfg.text, opacity:0.75, marginTop:1 }}>{ev.sub}</div>}
                        </div>
                        {scfg && <span style={{ fontSize:10, fontWeight:500, background:scfg.bg, color:scfg.text, border:`1px solid ${scfg.border}`, borderRadius:4, padding:"1px 6px", flexShrink:0, whiteSpace:"nowrap" }}>{ev.job.status}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    );
  }

  const viewLabels = { month:"Month", week:"Week", day:"Day", agenda:"Agenda" };

  return (
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 16, alignItems: isMobile ? "stretch" : "flex-start" }}>
      {/* ── Left sidebar: mini month + toggles (stacks above the grid on mobile) ── */}
      <div style={{ flexShrink:0, width: isMobile ? "100%" : (sidebarOpen ? 204 : 36), transition: isMobile ? "none" : "width 0.18s ease" }}>
        {isMobile && !sidebarOpen ? (
          <button onClick={() => setSidebarOpen(true)} title="Show mini calendar & filters"
            style={{ fontSize:12, fontWeight:500, padding:"5px 11px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:6, color:"var(--text-secondary)", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
            🗓️ Calendar options <span style={{ fontSize:13 }}>»</span>
          </button>
        ) : (
        <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
          {/* Sidebar header with collapse toggle */}
          <div style={{ padding:"7px 10px", background:"var(--surface-subtle)", borderBottom: sidebarOpen ? "1px solid var(--border)" : "none", display:"flex", alignItems:"center", justifyContent: sidebarOpen ? "space-between" : "center", minHeight:36 }}>
            {sidebarOpen && <span style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Calendar</span>}
            <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "Collapse" : "Expand"}
              style={{ fontSize:14, lineHeight:1, padding:"2px 5px", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", flexShrink:0 }}>
              {sidebarOpen ? "«" : "»"}
            </button>
          </div>
          {/* Collapsible content */}
          {sidebarOpen && (
            <div style={{ padding:"12px" }}>
              <MiniMonth />
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex:1, minWidth:0 }}>
        {/* Top bar: Today + nav + view switcher */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          <button onClick={goToday}
            style={{ fontSize:12, padding:"5px 12px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", fontWeight:500 }}>Today</button>
          {calView !== "agenda" && <>
            <button onClick={() => navigate(-1)}
              style={{ fontSize:13, padding:"4px 10px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer" }}>‹</button>
            <button onClick={() => navigate(1)}
              style={{ fontSize:13, padding:"4px 10px", border:"1px solid var(--border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer" }}>›</button>
          </>}
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-primary)", flex:1 }}>{navLabel()}</div>
          {/* View switcher */}
          <div style={{ display:"flex", border:"1.5px solid var(--border)", borderRadius:6, overflow:"hidden" }}>
            {["month","week","day","agenda"].map((v,i,arr) => (
              <button key={v} onClick={() => setCalView(v)}
                style={{ fontSize:12, padding:"5px 13px", border:"none", cursor:"pointer", fontWeight:500,
                  borderRight:i<arr.length-1?"1px solid var(--border)":"none",
                  background:calView===v?"var(--accent)":"var(--surface)",
                  color:calView===v?"#fff":"var(--accent)" }}>
                {viewLabels[v]}
              </button>
            ))}
          </div>
        </div>

        {calView === "month"  && <MonthView />}
        {calView === "week"   && <WeekView />}
        {calView === "day"    && <DayView />}
        {calView === "agenda" && <AgendaView />}
      </div>
    </div>
  );
}

// ── Reset password screen (after clicking email link) ─────────────────────────
function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(""); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(onDone, 2000);
  }

  const inputStyle = { fontSize:14, padding:"9px 12px", border:"1px solid var(--input-border)", borderRadius:8, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--page-bg)", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:380, background:"var(--surface)", borderRadius:14, border:"1px solid var(--border)", padding:"2rem", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:6 }}>
            <FollowupMark size={30} />
            <span style={{ fontSize:24, fontWeight:700, background:"linear-gradient(90deg,#185FA5,#3C3489)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Followup</span>
          </div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Set a new password</div>
        </div>
        {done ? (
          <div style={{ fontSize:13, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
            ✓ Password updated, signing you in…
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <PasswordInput placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={inputStyle} />
            <PasswordInput placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" style={inputStyle} />
            {error && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ fontSize:14, padding:"10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:loading?"default":"pointer", fontWeight:600, marginTop:4, opacity:loading?0.7:1 }}>
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Auth screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError(""); setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://job-tracker-tau-eight.vercel.app/" },
    });
    if (error) setError(error.message);
  }

  async function submit(e) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMessage("Check your email for a confirmation link.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://job-tracker-tau-eight.vercel.app/",
        });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { fontSize:14.5, padding:"12px 14px", border:"1px solid var(--input-border)", borderRadius:11, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };
  const labelStyle = { display:"block", fontSize:12.5, fontWeight:600, color:"var(--text-secondary)", marginBottom:6 };
  const headings = { signin:"Welcome back", signup:"Create your account", forgot:"Reset your password" };
  const subtitles = { signin:"Sign in to keep your job search moving.", signup:"Free to use. Track applications and get reminded to follow up.", forgot:"We'll email you a link to get back in." };
  const btnLabels = { signin:"Sign in", signup:"Create account", forgot:"Send reset email" };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--page-bg)", padding:"1.5rem" }}>
      <div style={{ width:"100%", maxWidth:400, background:"var(--surface)", borderRadius:18, border:"1px solid var(--border)", padding:"2.75rem 2.5rem", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16 }}>
            <FollowupMark size={30} />
            <span style={{ fontSize:22, fontWeight:700, background:"linear-gradient(90deg,#185FA5,#3C3489)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Followup</span>
          </div>
          <div style={{ fontSize:21, fontWeight:700, color:"var(--text-primary)", marginBottom:8, letterSpacing:"-0.01em" }}>{headings[mode]}</div>
          <div style={{ fontSize:13.5, color:"var(--text-muted)", lineHeight:1.5 }}>{subtitles[mode]}</div>
        </div>
        {mode !== "forgot" && (
          <>
            <button type="button" onClick={signInWithGoogle}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", fontSize:14.5, padding:"12px", background:"var(--surface)", color:"var(--text-primary)", border:"1px solid var(--input-border)", borderRadius:11, cursor:"pointer", fontWeight:500, marginBottom:22, boxSizing:"border-box" }}>
              <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.1-5.1C33.4 6.1 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.7 15.5 18.5 12.4 24 12.4c3.1 0 5.8 1.1 7.9 3l5.1-5.1C33.4 6.1 28.9 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c4.8 0 9.2-1.8 12.5-4.8l-5.8-4.9C28.8 35.7 26.5 36.4 24 36.4c-5.2 0-9.6-3.5-11.2-8.2l-6 4.6C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5h-1.9V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.5l5.8 4.9C40.4 34.7 44 30 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
              Continue with Google
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
              <div style={{ flex:1, height:1, background:"var(--border)" }} />
              <span style={{ fontSize:11, color:"var(--text-muted)" }}>or</span>
              <div style={{ flex:1, height:1, background:"var(--border)" }} />
            </div>
          </>
        )}
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={labelStyle} htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          {mode !== "forgot" && (
            <div>
              <label style={labelStyle} htmlFor="auth-password">Password</label>
              <PasswordInput placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode==="signup"?"new-password":"current-password"} style={inputStyle} />
            </div>
          )}
          {error && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:8, padding:"9px 12px" }}>{error}</div>}
          {message && <div style={{ fontSize:12, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:8, padding:"9px 12px" }}>{message}</div>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", boxSizing:"border-box", fontSize:15, padding:"13px", background:"#185FA5", color:"#fff", border:"none", borderRadius:11, cursor:loading?"default":"pointer", fontWeight:600, marginTop:6, opacity:loading?0.7:1 }}>
            {loading ? "Please wait…" : btnLabels[mode]}
          </button>
        </form>
        {mode === "signin" && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 14px", background:"var(--surface-subtle, rgba(24,95,165,0.06))", border:"1px solid var(--blue-light, #B5D4F4)", borderRadius:10, marginTop:20, fontSize:12, color:"var(--text-secondary)", lineHeight:1.5 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>✍️</span>
            <span>The tracker that tells you who to follow up with, and drafts the message for you.</span>
          </div>
        )}
        <div style={{ textAlign:"center", marginTop:"1.75rem", fontSize:13.5, color:"var(--text-muted)", display:"flex", flexDirection:"column", gap:10 }}>
          {mode === "signin" && <>
            <span>No account? <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:600, padding:0, fontSize:13.5 }}>Sign up</button></span>
            <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", padding:0, fontSize:12.5 }}>Forgot password?</button>
          </>}
          {mode === "signup" && <span>Have an account? <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:600, padding:0, fontSize:13.5 }}>Sign in</button></span>}
          {mode === "forgot" && <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:600, padding:0, fontSize:13.5 }}>← Back to sign in</button>}
        </div>
        <div style={{ textAlign:"center", marginTop:"1.75rem", fontSize:11, color:"var(--text-muted)" }}>
          <a href="/privacy.html" target="_blank" rel="noopener" style={{ color:"var(--text-muted)" }}>Privacy</a> · <a href="/terms.html" target="_blank" rel="noopener" style={{ color:"var(--text-muted)" }}>Terms</a>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [contactModal, setContactModal] = useState(null); // null | "new" | contact object being edited
  const [panelContact, setPanelContact] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState("All");
  const [outreachFilter, setOutreachFilter] = useState("all");
  const [listFilterOpen, setListFilterOpen] = useState(false);
  const [boardFilterOpen, setBoardFilterOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState({});
  const [sortBy, setSortBy] = useState("dateApplied");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("today");
  const [hiddenCols, setHiddenCols] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const [profileName, setProfileName] = useState(() => { try { return localStorage.getItem("followup_profile_name") || ""; } catch { return ""; } });
  const [autoArchiveDays, setAutoArchiveDays] = useState(() => { try { return localStorage.getItem("followup_autoarchive_days") ?? "30"; } catch { return "30"; } });
  const [quietPromptDays, setQuietPromptDays] = useState(() => { try { return localStorage.getItem("followup_quietprompt_days") ?? "60"; } catch { return "60"; } });
  const [quietDismissed, setQuietDismissed] = useState(false);
  const [followupAppliedDays, setFollowupAppliedDays] = useState(() => { try { return localStorage.getItem("followup_applied_days") ?? "7"; } catch { return "7"; } });
  const [followupWarmDays, setFollowupWarmDays] = useState(() => { try { return localStorage.getItem("followup_warm_days") ?? "3"; } catch { return "3"; } });
  const [staleDays, setStaleDays] = useState(() => { try { return localStorage.getItem("followup_stale_days") ?? "14"; } catch { return "14"; } });
  const [weeklyGoal, setWeeklyGoal] = useState(() => { try { return localStorage.getItem("followup_weekly_goal") ?? "5"; } catch { return "5"; } });
  const [checklistProgress, setChecklistProgress] = useState(() => { try { return JSON.parse(localStorage.getItem("followup_checklist_progress") || "{}"); } catch { return {}; } });
  const [automationSignal, setAutomationSignal] = useState(0);
  const [bookmarkletSignal, setBookmarkletSignal] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dark_mode") === "true");
  _isDark = darkMode; // keep module-level flag current for getStatusCfg/getTagColors/getCalCfg
  applyFollowupSettings(parseInt(followupAppliedDays), parseInt(followupWarmDays), parseInt(staleDays));
  function persistSettings(extra) { saveSettings({ profileName, autoArchiveDays, quietPromptDays, followupAppliedDays, followupWarmDays, staleDays, weeklyGoal, checklistProgress, ...extra }); }
  function markChecklist(key) {
    if (checklistProgress[key]) return;
    const next = { ...checklistProgress, [key]: true };
    setChecklistProgress(next);
    try { localStorage.setItem("followup_checklist_progress", JSON.stringify(next)); } catch {}
    persistSettings({ checklistProgress: next });
    track("checklist_item_done", { item: key });
  }
  function navigateChecklist(target) {
    if (target === "profile") setView("profile");
    else if (target === "automation") { setView("profile"); setAutomationSignal(s => s + 1); }
    else if (target === "bookmarklet") { setView("profile"); setBookmarkletSignal(s => s + 1); }
  }
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [panelJob, setPanelJob] = useState(null);
  const togglePanel = (job) => setPanelJob(p => {
    const next = p?.id === job?.id ? null : job;
    if (next) track("panel_opened", { job_status: next.status });
    return next;
  });
  const [undoStack, setUndoStack] = useState(null);
  const [ahaJob, setAhaJob] = useState(null);
  const [ahaDraftJob, setAhaDraftJob] = useState(null);
  const [winsToast, setWinsToast] = useState(null);
  function showWinsToast(message) { setWinsToast(message); }
  const [selected, setSelected] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const dragId = useRef(null);

  // ── Auth + data loading ──
  useEffect(() => {
    initAnalytics();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u); _uid = u?.id ?? null;
      if (u) identifyUser(u, { method: u.app_metadata?.provider || "email" });
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setPasswordRecovery(true); return; }
      const u = session?.user ?? null;
      setUser(u); _uid = u?.id ?? null;
      if (event === "SIGNED_IN" && u) {
        const method = u.app_metadata?.provider || "email";
        const isNew = Date.now() - new Date(u.created_at).getTime() < 15000;
        identifyUser(u, { method });
        track(isNew ? "signed_up" : "logged_in", { method });
      } else if (event === "SIGNED_OUT") {
        resetAnalytics();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setJobs([]); setTasks([]); setContacts([]); setDocuments([]); setLoaded(false); return; }
    setLoadError(false);
    loadUserData().then(({ jobs: j, tasks: t, contacts: c, resumes: r, settings: s }) => {
      setJobs(j); setTasks(t); setContacts(c); setDocuments(r);
      if (s) {
        if (s.profileName != null) setProfileName(s.profileName);
        if (s.autoArchiveDays != null) setAutoArchiveDays(String(s.autoArchiveDays));
        if (s.quietPromptDays != null) setQuietPromptDays(String(s.quietPromptDays));
        if (s.followupAppliedDays != null) setFollowupAppliedDays(String(s.followupAppliedDays));
        if (s.followupWarmDays != null) setFollowupWarmDays(String(s.followupWarmDays));
        if (s.staleDays != null) setStaleDays(String(s.staleDays));
        if (s.weeklyGoal != null) setWeeklyGoal(String(s.weeklyGoal));
        if (s.checklistProgress != null) setChecklistProgress(s.checklistProgress);
      }
      setLoaded(true);
    }).catch(() => {
      // Leave `loaded` false so the app (and its auto-saves) never run on empty data.
      setLoadError(true);
    });
  }, [user]);

  // ── Demo mode ("Try it first — no account", from the landing page) ──
  useEffect(() => {
    if (!authChecked || user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "1") return;
    setDemoMode(true);
    setJobs(makeSampleJobs()); setTasks([]); setContacts([]); setDocuments([]); setLoaded(true);
    track("demo_started");
    window.history.replaceState({}, "", window.location.pathname);
  }, [authChecked, user]);

  useEffect(() => {
    if (!loaded || demoMode) return;
    setPersonProps({ jobs_total: jobs.filter(j => !j.archived).length, platform: isMobile ? "mobile" : "desktop" });
  }, [loaded, jobs, isMobile, demoMode]);

  useEffect(() => {
    if (!loaded) return;
    track("view_changed", { view });
    if (view === "today") {
      const todayStrNow = todayStr();
      track("today_opened", {
        followups_due: jobs.filter(j => { const fu = getFollowupStatus(j); return !j.archived && fu?.urgent && fu.diff >= -30; }).length,
        interviews: jobs.filter(j => !j.archived && j.interviewDate === todayStrNow).length,
        overdue: tasks.filter(t => !t.done && t.dueDate <= todayStrNow).length,
      });
    }
  }, [view, loaded]);

  // Auto-archive terminal (Rejected/Withdrawn) jobs after the configured number of days.
  useEffect(() => {
    if (!loaded) return;
    const days = parseInt(autoArchiveDays);
    if (!days || days <= 0) return;
    const cutoff = Date.now() - days * 86400000;
    const ids = new Set(jobs.filter(j => { const t = terminalSince(j); return !j.archived && t && new Date(t).getTime() < cutoff; }).map(j => j.id));
    if (ids.size === 0) return;
    const u = jobs.map(j => ids.has(j.id) ? { ...j, archived: true } : j);
    setJobs(u); saveJobs(u);
  }, [loaded]);
  // ── Browser job capture (bookmarklet) ──
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "1") return;
    const role = params.get("role") || "";
    const company = params.get("company") || "";
    const link = params.get("link") || "";
    const salaryMin = params.get("salMin") || "";
    const salaryMax = params.get("salMax") || "";
    setForm({ ...EMPTY, id: Date.now(), timeline: [], tags: {}, role, company, link, salaryMin, salaryMax, dateApplied: todayStr() });
    _addSource = "bookmarklet";
    setModal(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [loaded]);

  // ── PWA manifest shortcuts ("Add job" / "Today", long-press the home-screen icon) ──
  useEffect(() => {
    if (!loaded) return;
    const params = new URLSearchParams(window.location.search);
    const shortcut = params.get("shortcut");
    if (!shortcut) return;
    if (shortcut === "add") openAdd();
    else if (shortcut === "today") setView("today");
    window.history.replaceState({}, "", window.location.pathname);
  }, [loaded]);

  useEffect(() => {
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("dark_mode", darkMode);
  }, [darkMode]);
  useEffect(() => {
    setSaveStatusHandler(setSaveStatus);
    return () => setSaveStatusHandler(null);
  }, []);
  useEffect(() => {
    if (saveStatus === "saved") {
      const t = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);
  useEffect(() => {
    if (panelJob) { const u = jobs.find(j => j.id===panelJob.id); if (u) setPanelJob(u); }
  }, [jobs]);
  useEffect(() => {
    if (isMobile && view === "sheet") setView("list");
  }, [isMobile, view]);

  // ── Follow-up notifications ──
  function fireNotification(title, body) {
    try {
      const n = new Notification(title, { body, icon: "/vite.svg" });
      setTimeout(() => n.close(), 6000); // auto-dismiss after 6 s
    } catch {}
  }

  useEffect(() => {
    if (!loaded || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("notified_date") === today) return;
    const overdue = jobs.filter(j => { const fu = getFollowupStatus(j); return !j.archived && fu && fu.urgent && fu.diff >= -30; });
    if (overdue.length === 0) return;
    localStorage.setItem("notified_date", today);
    // Single batched notification instead of one per job
    if (overdue.length === 1) {
      const j = overdue[0];
      fireNotification("Followup: follow-up needed", `${j.company} · ${j.role}`);
    } else {
      const preview = overdue.slice(0, 2).map(j => j.company).join(", ");
      const more = overdue.length > 2 ? ` + ${overdue.length - 2} more` : "";
      fireNotification(`Followup: ${overdue.length} follow-ups needed`, `${preview}${more}`);
    }
  }, [loaded]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") { alert("Your browser does not support notifications."); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.removeItem("notified_date"); // reset so today fires immediately
      alert("✅ Notifications enabled! You'll be reminded about overdue follow-ups each day.");
    } else {
      alert("Notifications were blocked. To enable them, update your browser site settings for this page.");
    }
    setMenuOpen(false);
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT") return;
      if (e.key==="n"||e.key==="N") { e.preventDefault(); openAdd(); }
      if (e.key==="/") { e.preventDefault(); document.querySelector("input[placeholder*='Search']")?.focus(); }
      if (e.key==="Escape") { setPanelJob(null); setModal(false); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function pushUndo(message, prevJobs) { setUndoStack({ message, prevJobs }); }
  function undo() {
    if (!undoStack) return;
    setJobs(undoStack.prevJobs); saveJobs(undoStack.prevJobs);
    if (panelJob) { const r=undoStack.prevJobs.find(j=>j.id===panelJob.id); setPanelJob(r||null); }
    setUndoStack(null);
  }

  function openAdd() { setForm({...EMPTY, id:Date.now(), timeline:[], tags:{}}); setModal(true); }
  function openEdit(job) { setForm({...job, timeline:job.timeline||[], tags:job.tags||{}}); setModal(true); }

  // Auto-create/link a Contacts CRM entry from a job's free-text "Contact / recruiter" field.
  function syncContactFromField(job) {
    const name = (job.contact || "").trim();
    if (!name) return;
    const existing = contacts.find(c => c.name.trim().toLowerCase() === name.toLowerCase());
    let u;
    if (existing) {
      if ((existing.relatedJobIds||[]).includes(job.id)) return;
      u = contacts.map(c => c.id===existing.id ? { ...c, relatedJobIds:[...new Set([...(c.relatedJobIds||[]), job.id])] } : c);
    } else {
      const newContact = { id: Date.now(), name, title:"", company: job.company, email:"", phone:"", linkedin:"", notes:"", createdAt: new Date().toISOString(), relatedJobIds:[job.id] };
      u = [...contacts, newContact];
    }
    setContacts(u); saveContacts(u);
  }

  function save() {
    if (!form.role || !form.company) return;
    const now = new Date().toISOString();
    const existing = jobs.find(j => j.id===form.id);
    const statusChanged = existing && existing.status!==form.status;
    let tl = form.timeline ? [...form.timeline] : [];
    if (!tl.find(e => e.status===form.status)) tl = [...tl, { status:form.status, date:now, notes:"" }];
    const enriched = { ...form, timeline:tl, createdAt:existing?existing.createdAt:now, updatedAt:now, lastStatus:statusChanged?{status:form.status,at:now}:(existing?.lastStatus||null) };
    const updated = existing ? jobs.map(j=>j.id===form.id?enriched:j) : [...jobs,enriched];
    setJobs(updated); saveJobs(updated); setModal(false);
    syncContactFromField(enriched);
    if (!existing) {
      track("job_added", { source: _addSource, jobs_total: updated.filter(j => !j.archived).length });
      _addSource = "manual";
      if (jobs.filter(j => !j.archived).length === 0) {
        let ahaShown = false;
        try { ahaShown = localStorage.getItem("followup_aha_shown") === "1"; } catch {}
        if (!ahaShown) {
          try { localStorage.setItem("followup_aha_shown", "1"); } catch {}
          track("aha_draft_demo", { action: "shown" });
          setAhaJob(enriched);
        }
      }
    }
  }

  function del(id) {
    const job = jobs.find(j => j.id===id);
    pushUndo(`Deleted "${job?.company} · ${job?.role}"`, jobs);
    const u = jobs.filter(j => j.id!==id); setJobs(u); saveJobs(u);
    if (panelJob?.id===id) setPanelJob(null);
  }

  function duplicateJob(job) {
    const now = new Date().toISOString();
    const copy = { ...job, id: Date.now(), createdAt: now, updatedAt: now, followupDismissed: false, timeline: [], lastStatus: null };
    const idx = jobs.findIndex(j => j.id === job.id);
    const u = [...jobs.slice(0, idx + 1), copy, ...jobs.slice(idx + 1)];
    setJobs(u); saveJobs(u);
  }

  function onStatusChange(id, newStatus, interviewDate, interviewTime) {
    const job = jobs.find(j => j.id===id);
    const isFirstInterviewEver = newStatus==="Interview" && !jobs.some(j => j.status==="Interview" || (j.timeline||[]).some(e=>e.status==="Interview"));
    pushUndo(`Status changed: "${job?.company} · ${job?.role}" → ${newStatus}`, jobs);
    const u = applyStatusChange(jobs, id, newStatus, interviewDate, interviewTime);
    setJobs(u); saveJobs(u);
    track("job_status_changed", { from: job?.status, to: newStatus });
    if (newStatus === "Offer") track("offer_logged");
    if (isFirstInterviewEver) showWinsToast("🎉 First interview scheduled. You're doing great.");
    // Auto-create a day-before reminder when an interview date is set
    if (interviewDate && INTERVIEW_STATUSES.includes(newStatus)) {
      track("interview_scheduled");
      const d = new Date(interviewDate + "T00:00:00");
      d.setDate(d.getDate() - 1);
      const reminderDate = d.toISOString().slice(0, 10);
      const timeStr = interviewTime ? ` at ${formatTime12(interviewTime)}` : "";
      addReminder(id, reminderDate, `${newStatus} tomorrow${timeStr}: ${job?.company}`);
    }
  }

  function addReminder(jobId, date, note) {
    const job = jobs.find(j => j.id===jobId);
    const text = (note||"").trim() || `Follow up with ${job?.company||""}`;
    const t = { id: Date.now(), text, jobId, dueDate: date, done: false, createdAt: new Date().toISOString() };
    const u = [...tasks, t]; setTasks(u); saveTasks(u);
    track("reminder_created", { source: "job" });
  }

  function logOutreach(job) {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    const u = jobs.map(j => j.id===job.id ? {
      ...j,
      customFollowup: dateInNDays(resetDays),
      timeline: [...(j.timeline||[]), { id:crypto.randomUUID(), status:j.status, date:now, notes:"Follow-up sent" }],
    } : j);
    setJobs(u); saveJobs(u);
    showWinsToast(`Sent 📤. That's ${followupsSentThisWeek(u)} this week. Most people never send one.`);
  }

  function logReply(job) {
    const now = new Date().toISOString();
    const isFirstReplyEver = !jobs.some(j => (j.timeline||[]).some(e => e.kind==="reply"));
    const u = jobs.map(j => j.id===job.id ? {
      ...j,
      timeline: [...(j.timeline||[]), { id:crypto.randomUUID(), type:"manual", kind:"reply", label:"📨 Reply received", date:now, notes:"" }],
    } : j);
    setJobs(u); saveJobs(u);
    track("reply_logged", { job_status: job.status });
    if (isFirstReplyEver) showWinsToast("🎉 Your first reply! Followups are working.");
  }

  function onNotesSave(id, notes, timeline, prepChecklist) {
    const u = applyNotesChange(jobs, id, notes, timeline, prepChecklist); setJobs(u); saveJobs(u);
  }

  function onDrop(targetStatus) {
    if (!dragId.current) return;
    const job = jobs.find(j => j.id===dragId.current);
    if (!job || job.status===targetStatus) { dragId.current=null; return; }
    const u = applyStatusChange(jobs, dragId.current, targetStatus, undefined); setJobs(u); saveJobs(u); dragId.current=null;
  }

  function toggleCol(status) { setHiddenCols(h => ({...h,[status]:!h[status]})); }
  function toggleSelect(id) { setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function selectAll() { setSelected(new Set(filtered.map(j => j.id))); }
  function clearSelect() { setSelected(new Set()); }

  function archiveJob(id) {
    const job = jobs.find(j => j.id===id);
    pushUndo(`Archived "${job?.company} · ${job?.role}"`, jobs);
    const u = jobs.map(j => j.id===id ? { ...j, archived:true } : j); setJobs(u); saveJobs(u);
    if (panelJob?.id===id) setPanelJob(null);
  }

  function restoreJob(id) {
    const u = jobs.map(j => j.id===id ? { ...j, archived:false } : j); setJobs(u); saveJobs(u);
  }

  function bulkArchive() {
    pushUndo(`Archived ${selected.size} job${selected.size>1?"s":""}`, jobs);
    const u = jobs.map(j => selected.has(j.id) ? { ...j, archived:true } : j); setJobs(u); saveJobs(u);
    if (panelJob && selected.has(panelJob.id)) setPanelJob(null);
    clearSelect();
  }

  // Active, non-terminal jobs you haven't rated Medium/High that have gone quiet for the configured period.
  const quietPromptN = parseInt(quietPromptDays);
  const quietJobs = quietPromptN > 0 ? jobs.filter(j => {
    if (j.archived || TERMINAL_STATUSES.includes(j.status) || (j.interest||0) >= 2) return false;
    const t = activityTime(j);
    return t && (Date.now() - new Date(t).getTime()) > quietPromptN * 86400000;
  }) : [];
  function archiveQuiet() {
    const ids = new Set(quietJobs.map(j => j.id));
    pushUndo(`Archived ${ids.size} quiet job${ids.size>1?"s":""}`, jobs);
    const u = jobs.map(j => ids.has(j.id) ? { ...j, archived: true } : j);
    setJobs(u); saveJobs(u);
    setQuietDismissed(true);
  }

  function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} job${selected.size>1?"s":""}? You'll have 5 seconds to undo.`)) return;
    pushUndo(`Deleted ${selected.size} job${selected.size>1?"s":""}`, jobs);
    const u = jobs.filter(j => !selected.has(j.id)); setJobs(u); saveJobs(u);
    if (panelJob && selected.has(panelJob.id)) setPanelJob(null);
    clearSelect();
  }

  function bulkStatus(newStatus) {
    if (!newStatus) return;
    pushUndo(`Changed ${selected.size} job${selected.size>1?"s":""} to ${newStatus}`, jobs);
    const now = new Date().toISOString();
    const u = jobs.map(j => !selected.has(j.id) ? j : { ...j, status:newStatus, updatedAt:now, lastStatus:{status:newStatus,at:now}, timeline:j.timeline?.find(e=>e.status===newStatus)?j.timeline:[...(j.timeline||[]),{status:newStatus,date:now,notes:""}] });
    setJobs(u); saveJobs(u); clearSelect();
  }

  function exportJSON() {
    // Full account backup — every synced collection plus account settings.
    const settings = { profileName, autoArchiveDays, quietPromptDays, followupAppliedDays, followupWarmDays, staleDays };
    const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), jobs, tasks, contacts, documents, settings }, null, 2);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type:"application/json"})); a.download = `job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  }

  function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!Array.isArray(parsed.jobs)) { alert("Invalid backup file."); return; }
        // Back-compat: older backups stored the document library under `resumes`,
        // and pre-v2 backups omit contacts/documents/settings entirely.
        const docs = Array.isArray(parsed.documents) ? parsed.documents
          : (Array.isArray(parsed.resumes) ? parsed.resumes : null);
        const summary = [`${parsed.jobs.length} jobs`];
        if (Array.isArray(parsed.tasks)) summary.push(`${parsed.tasks.length} tasks`);
        if (Array.isArray(parsed.contacts)) summary.push(`${parsed.contacts.length} contacts`);
        if (docs) summary.push(`${docs.length} documents`);
        if (parsed.settings) summary.push("settings");
        if (!window.confirm(`This will overwrite your current data with the backup's ${summary.join(", ")}. Continue?`)) return;
        pushUndo("Restored from JSON backup", jobs);
        setJobs(parsed.jobs); saveJobs(parsed.jobs);
        if (Array.isArray(parsed.tasks)) { setTasks(parsed.tasks); saveTasks(parsed.tasks); }
        if (Array.isArray(parsed.contacts)) { setContacts(parsed.contacts); saveContacts(parsed.contacts); }
        if (docs) { setDocuments(docs); saveDocuments(docs); }
        if (parsed.settings) {
          const s = parsed.settings;
          const apply = (key, lsKey, setter) => { if (s[key] != null) { const v = String(s[key]); setter(v); try { localStorage.setItem(lsKey, v); } catch {} } };
          apply("profileName", "followup_profile_name", setProfileName);
          apply("autoArchiveDays", "followup_autoarchive_days", setAutoArchiveDays);
          apply("quietPromptDays", "followup_quietprompt_days", setQuietPromptDays);
          apply("followupAppliedDays", "followup_applied_days", setFollowupAppliedDays);
          apply("followupWarmDays", "followup_warm_days", setFollowupWarmDays);
          apply("staleDays", "followup_stale_days", setStaleDays);
          saveSettings({
            profileName: s.profileName ?? profileName, autoArchiveDays: s.autoArchiveDays ?? autoArchiveDays,
            quietPromptDays: s.quietPromptDays ?? quietPromptDays, followupAppliedDays: s.followupAppliedDays ?? followupAppliedDays,
            followupWarmDays: s.followupWarmDays ?? followupWarmDays, staleDays: s.staleDays ?? staleDays,
          });
        }
        e.target.value = "";
      } catch { alert("Could not read backup file. Make sure it's a valid JSON backup from this app."); }
    };
    reader.readAsText(file);
  }

  function exportCSV() {
    const headers = ["Role","Company","Link","Salary Min","Salary Max","Date Applied","Status","Contact","Custom Followup","Notes","Work Type","Industry","Source","Created At","Updated At"];
    const rows = jobs.map(j => { const t=j.tags||{}; return [j.role,j.company,j.link,j.salaryMin,j.salaryMax,j.dateApplied,j.status,j.contact,j.customFollowup,j.notes,t.workType||"",t.industry||"",t.source||"",j.createdAt,j.updatedAt].map(v=>`"${(v||"").toString().replace(/"/g,'""')}"`); });
    const csv = [headers.join(","),...rows.map(r=>r.join(","))].join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`job-tracker-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  function importCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      // ── CSV parser (handles quoted fields with commas / escaped quotes) ──
      const parseLine = line => {
        const vals=[]; let cur="",inQ=false;
        for (const ch of line) {
          if (ch==='"'){inQ=!inQ;}
          else if(ch===","&&!inQ){vals.push(cur);cur="";}
          else cur+=ch;
        }
        vals.push(cur);
        return vals.map(v=>v.replace(/^"|"$/g,"").replace(/""/g,'"').trim());
      };

      const lines = evt.target.result.split(/\r?\n/);

      // Find the first row that looks like a header (4+ populated cells)
      let headerIdx = 0;
      for (let i=0;i<Math.min(lines.length,5);i++) {
        if (parseLine(lines[i]).filter(c=>c.trim()).length >= 4) { headerIdx=i; break; }
      }
      const rawHeaders = parseLine(lines[headerIdx]);
      const headers = rawHeaders.map(h=>h.toLowerCase().replace(/[–—]/g,"-").trim());

      // ── Alias map: field → list of recognised column name variants ──
      const ALIASES = {
        role:          ["job title","role","position","title","job role","job name"],
        company:       ["company","employer","organization","company name"],
        link:          ["link","url","job url","job link","posting","apply link","application url","job posting"],
        salaryRange:   ["salary range","salary","compensation","comp","pay range","salary range (usd)","salary range usd"],
        salaryMin:     ["salary min","min salary","minimum salary","salary minimum"],
        salaryMax:     ["salary max","max salary","maximum salary","salary maximum"],
        dateApplied:   ["date applied","applied date","application date","applied on"],
        status:        ["status","stage","application status","current status"],
        notes:         ["notes","note","comments","additional info","description"],
        interviewDate: ["interview date","recruiter interview","phone screen date","phone screen","interview"],
        contact:       ["contact","recruiter","recruiter name","hiring manager","contact name"],
        workType:      ["work type","remote","location type","work arrangement","remote/hybrid/onsite"],
        industry:      ["industry","sector"],
        source:        ["source","channel","applied via","applied through","applied from"],
      };
      const colIdx = {};
      for (const [field,aliases] of Object.entries(ALIASES)) {
        for (const alias of aliases) {
          const idx = headers.indexOf(alias);
          if (idx !== -1) { colIdx[field]=idx; break; }
        }
      }
      const hasHeaders = Object.keys(colIdx).length >= 2;

      // ── Status normaliser ──
      const STATUS_MAP = {
        "awaiting response":"Applied","applied":"Applied","":"Applied",
        "on hold - role under review":"Phone Screen","on hold role under review":"Phone Screen",
        "follow-up sent":"Applied","follow up sent":"Applied","followup sent":"Applied",
        "phone screen":"Phone Screen","phone screen scheduled":"Phone Screen","phone screening":"Phone Screen",
        "interview":"Interview","interview scheduled":"Interview","interviewing":"Interview","first round":"Interview",
        "offer":"Offer","offer received":"Offer","offer extended":"Offer","offer accepted":"Offer",
        "rejected":"Rejected","closed - rejected":"Rejected","closed rejected":"Rejected",
        "declined":"Withdrawn","closed - declined by us":"Withdrawn","closed declined by us":"Withdrawn",
        "withdrawn":"Withdrawn","closed - relocation required":"Withdrawn","closed relocation required":"Withdrawn",
        "closed - role cancelled":"Withdrawn","not moving forward":"Rejected",
      };
      function mapStatus(raw) {
        const key = raw.toLowerCase().replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
        if (STATUS_MAP[key]) return STATUS_MAP[key];
        // exact case-insensitive match against known statuses
        const known = Object.keys(STATUS_CONFIG).find(s=>s.toLowerCase()===key);
        return known || "Applied";
      }

      // ── Salary range parser → { min, max } ──
      function parseSalary(str) {
        if (!str||str==="?") return {min:"",max:""};
        const clean = str.replace(/[^0-9k.–\-\s]/gi,"").replace(/–/g,"-").trim();
        // Range: "91700 - 128900" or "91700-128900" or "95k-130k"
        const range = clean.match(/([\d.]+k?)\s*-\s*([\d.]+k?)/i);
        if (range) {
          const toNum = s => { const n=parseFloat(s); return s.toLowerCase().endsWith("k")?Math.round(n*1000):Math.round(n); };
          // Three-tier salary: take first and last
          const thirdMatch = clean.match(/([\d.]+k?)\s*-\s*([\d.]+k?)\s*-\s*([\d.]+k?)/i);
          if (thirdMatch) return {min:String(toNum(thirdMatch[1])),max:String(toNum(thirdMatch[3]))};
          return {min:String(toNum(range[1])),max:String(toNum(range[2]))};
        }
        // Single value ending in k
        const kMatch = clean.match(/^([\d.]+)k\+?$/i);
        if (kMatch) return {min:String(Math.round(parseFloat(kMatch[1])*1000)),max:""};
        // Single plain number — only treat as salary if >= 10000
        const single = clean.match(/^([\d.]+)\+?$/);
        if (single) { const v=Math.round(parseFloat(single[1])); if(v>=10000) return {min:String(v),max:""}; }
        return {min:"",max:""};
      }

      // ── Date parser: M/D/YYYY or MM/DD/YYYY → YYYY-MM-DD ──
      function parseDate(str) {
        if (!str||!str.trim()) return "";
        const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
        return str.trim();
      }

      const getCol = (vals,field) => colIdx[field]!==undefined ? (vals[colIdx[field]]||"").trim() : "";

      const imported = [];
      const dataRows = lines.slice(headerIdx+1);

      for (const line of dataRows) {
        if (!line.trim()) continue;
        const vals = parseLine(line);
        if (!vals.some(v=>v.trim())) continue;

        let role,company,link,rawSalary,salMinStr,salMaxStr,dateApplied,rawStatus,notes,rawInterviewDate,contact,workType,industry,source;

        if (hasHeaders) {
          company          = getCol(vals,"company");
          role             = getCol(vals,"role");
          link             = getCol(vals,"link");
          rawSalary        = getCol(vals,"salaryRange");
          salMinStr        = getCol(vals,"salaryMin");
          salMaxStr        = getCol(vals,"salaryMax");
          dateApplied      = parseDate(getCol(vals,"dateApplied"));
          rawStatus        = getCol(vals,"status");
          notes            = getCol(vals,"notes");
          rawInterviewDate = getCol(vals,"interviewDate");
          contact          = getCol(vals,"contact");
          workType         = getCol(vals,"workType");
          industry         = getCol(vals,"industry");
          source           = getCol(vals,"source");
        } else {
          // Positional fallback — matches app's own CSV export column order
          const KEYS=["role","company","link","salaryMin","salaryMax","dateApplied","status","contact","customFollowup","notes"];
          const obj={}; KEYS.forEach((k,i)=>obj[k]=vals[i]||"");
          role=obj.role; company=obj.company; link=obj.link; rawStatus=obj.status;
          salMinStr=obj.salaryMin; salMaxStr=obj.salaryMax; rawSalary="";
          dateApplied=parseDate(obj.dateApplied); notes=obj.notes; contact=obj.contact;
          rawInterviewDate="";
          workType=vals[10]||""; industry=vals[11]||""; source=vals[12]||"";
        }

        if (!company && !role) continue;

        const status = mapStatus(rawStatus);

        // Salary: prefer pre-split min/max cols, else parse a range string
        let salaryMin, salaryMax;
        if (salMinStr||salMaxStr) { salaryMin=salMinStr; salaryMax=salMaxStr; }
        else { const s=parseSalary(rawSalary); salaryMin=s.min; salaryMax=s.max; }

        // "link" placeholder text is not a real URL
        const cleanLink = (link.toLowerCase()==="link"||link.toLowerCase()==="url") ? "" : link;

        const interviewDate = parseDate(rawInterviewDate);

        const now = new Date().toISOString();
        const tl = [{status:"Applied",date:now,notes:""}];
        if (status!=="Applied") tl.push({status,date:now,notes:""});

        imported.push({
          ...EMPTY,
          id: crypto.randomUUID(),
          role, company,
          link: cleanLink,
          salaryMin, salaryMax,
          dateApplied, interviewDate,
          status, contact, notes,
          createdAt: now, updatedAt: now,
          lastStatus: status!=="Applied"?{status,at:now}:null,
          timeline: tl,
          tags: { workType, industry, source },
          prepChecklist: [],
          archived: false,
        });
      }

      if (!imported.length) { alert("No jobs found. Make sure the file is a CSV with recognisable column headers."); e.target.value=""; return; }

      const fresh  = imported.filter(imp=>!jobs.find(j=>j.role===imp.role&&j.company===imp.company));
      const dupes  = imported.length - fresh.length;
      const merged = [...jobs,...fresh];
      setJobs(merged); saveJobs(merged); e.target.value="";
      pushUndo(`Imported ${fresh.length} job${fresh.length!==1?"s":""}`, jobs);
      alert(`✓ Imported ${fresh.length} job${fresh.length!==1?"s":""}${dupes>0?` · skipped ${dupes} duplicate${dupes!==1?"s":""} already in tracker`:""}.`);
    };
    reader.readAsText(file);
  }

  function toggleTagFilter(cat, val) { setTagFilter(f => ({...f,[cat]:f[cat]===val?"":val})); }
  const activeTagFilters = Object.entries(tagFilter).filter(([,v]) => v);

  const statuses = ["All",...Object.keys(STATUS_CONFIG)];
  const archivedCount = jobs.filter(j => j.archived).length;
  const filtered = jobs
    .filter(j => showArchived ? j.archived : !j.archived)
    .filter(j => filter==="All"||j.status===filter)
    .filter(j => !search||`${j.role} ${j.company}`.toLowerCase().includes(search.toLowerCase()))
    .filter(j => activeTagFilters.every(([cat,val]) => (j.tags||{})[cat]===val))
    .filter(j => outreachFilter==="all" || (outreachFilter==="contacted" ? hasOutreach(j) : !hasOutreach(j)))
    .sort((a,b) => {
      let cmp = 0;
      if (sortBy==="dateApplied") cmp = (a.dateApplied||"").localeCompare(b.dateApplied||"");
      else if (sortBy==="company") cmp = a.company.localeCompare(b.company);
      else if (sortBy==="status") cmp = a.status.localeCompare(b.status);
      else if (sortBy==="interest") cmp = (a.interest||0) - (b.interest||0);
      return sortDir==="asc" ? cmp : -cmp;
    });

  const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s=>[s,jobs.filter(j=>j.status===s&&!j.archived).length]));
  const todayTasks = tasks.filter(t=>!t.done&&t.dueDate<=todayStr()).length + jobs.filter(j=>!j.archived&&j.interviewDate===todayStr()).length + jobs.filter(j=>{ const fu=getFollowupStatus(j); return fu?.urgent && fu.diff >= -30; }).length;

  if (!authChecked) return <SkeletonScreen />;
  if (passwordRecovery) return <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />;
  if (!user && !demoMode) return <AuthScreen />;
  if (loadError) return (
    <div style={{ padding:"3rem 1.5rem", maxWidth:420, margin:"3rem auto", textAlign:"center", color:"var(--text-primary)" }}>
      <div style={{ fontSize:28, marginBottom:10 }}>⚠️</div>
      <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Couldn't load your data</div>
      <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.6, marginBottom:18 }}>We hit a problem reaching the server, so we've paused to keep your data safe. Nothing has been changed. Please try again.</div>
      <button onClick={() => window.location.reload()} style={{ fontSize:13, padding:"9px 20px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 }}>Retry</button>
    </div>
  );
  if (!loaded) return <SkeletonScreen />;

  return (
    <div style={{ padding: isMobile ? "1rem 1rem 84px" : "1rem", fontFamily:"system-ui, sans-serif", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:"1.25rem", padding:"14px 20px", background:"linear-gradient(90deg,#185FA5 0%,#3C3489 100%)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FollowupMark size={26} onDark />
          <h2 style={{ fontSize:20, fontWeight:500, color:"#fff", margin:0 }}>Followup</h2>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span className="header-hint" style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>N = new · / = search · Esc = close</span>
          {saveStatus !== "idle" && (
            <span style={{ fontSize:11, color: saveStatus==="error" ? "#ffb4b4" : "rgba(255,255,255,0.7)", display:"flex", alignItems:"center", gap:4 }}>
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "✓ Saved"}
              {saveStatus === "error" && "⚠ Save failed"}
            </span>
          )}
          {!isMobile && user && <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>{user.email}</span>}
          <button onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{ display:"flex", alignItems:"center", padding:"5px 8px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer" }}>
            <Icon name={darkMode ? "sun" : "moon"} size={15} />
          </button>
          {demoMode
            ? <button onClick={() => { track("demo_signup_clicked", { source:"header" }); setDemoMode(false); }} style={{ fontSize:11, padding:"3px 10px", background:"#fff", color:"#185FA5", border:"1px solid #fff", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Sign up free</button>
            : <button onClick={() => supabase.auth.signOut()} style={{ fontSize:11, padding:"3px 10px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer" }}>Sign out</button>}
        </div>
      </div>

      {demoMode && (
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", justifyContent:"space-between", background:"#FFF8F0", border:"1px solid #F0D9B5", borderRadius:10, padding:"10px 16px", marginBottom:"0.75rem" }}>
          <span style={{ fontSize:12.5, color:"#7A4500" }}>👋 You're viewing sample data. Nothing you do here is saved. Sign up free to start tracking your own applications.</span>
          <button onClick={() => { track("demo_signup_clicked", { source:"banner" }); setDemoMode(false); }} style={{ fontSize:12, padding:"6px 14px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, flexShrink:0 }}>Sign up free</button>
        </div>
      )}

      {/* Slim summary strip */}
      <div style={{ marginBottom:"0.75rem", background:"var(--surface)", border:"1px solid var(--border-subtle)", borderRadius:10, padding:"9px 16px", display:"flex", gap:20, flexWrap:"wrap" }}>
        {[
          { label:"Total",       val: jobs.filter(j=>!j.archived).length,                                                          color:"#185FA5" },
          { label:"Active",      val: (counts["Applied"]||0)+(counts["Phone Screen"]||0)+(counts["Interview"]||0),                 color:"#3B3489" },
          { label:"Offers",      val: counts["Offer"]||0,                                                                          color:"#3B6D11" },
          { label:"Tasks today", val: todayTasks,                                                                                  color: todayTasks>0?"#A32D2D":"var(--text-muted)" },
        ].map(c => (
          <div key={c.label} style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:18, fontWeight:700, color:c.color, lineHeight:1 }}>{c.val}</span>
            <span style={{ fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Mobile Jobs sub-header — List/Pipeline toggle + Offers shortcut (Table stays desktop-only) */}
      {isMobile && (view==="list"||view==="board") && (
        <div style={{ display:"flex", gap:8, marginBottom:"0.75rem", alignItems:"center" }}>
          <div style={{ display:"flex", border:"1.5px solid #B5D4F4", borderRadius:6, overflow:"hidden", flex:1 }}>
            <button onClick={() => setView("list")} style={{ flex:1, fontSize:12, padding:"8px 4px", border:"none", cursor:"pointer", fontWeight:500, background: view==="list"?"#185FA5":"var(--surface)", color: view==="list"?"#fff":"#185FA5", minHeight:44 }}>List</button>
            <button onClick={() => setView("board")} style={{ flex:1, fontSize:12, padding:"8px 4px", border:"none", cursor:"pointer", fontWeight:500, background: view==="board"?"#185FA5":"var(--surface)", color: view==="board"?"#fff":"#185FA5", minHeight:44 }}>Pipeline</button>
          </div>
          <button onClick={() => setView("offers")} style={{ fontSize:12, padding:"8px 10px", whiteSpace:"nowrap", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500, minHeight:44 }}>🎉 Offers</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:"0.75rem" }}>
        {/* Row 2 — view controls (search + filters), only where relevant */}
        <div style={{ order:2, display: (view==="list"||view==="board") ? "flex" : "none", gap:8, alignItems:"center", minWidth:0, width:"100%" }}>
          {(view==="list"||view==="board") && <input placeholder="Search role or company..." value={search} onChange={e=>{ const v=e.target.value; if (!search && v) track("search_used"); setSearch(v); }} style={{ flex:"1 1 160px", minWidth:0, fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 10px" }} />}
          {view==="list" && (() => {
            const activeFilterCount = (filter!=="All"?1:0) + (outreachFilter!=="all"?1:0) + (sortBy!=="dateApplied"||sortDir!=="desc"?1:0) + activeTagFilters.length;
            const filterOpen = listFilterOpen; const setFilterOpen = setListFilterOpen;
            return (
              <div style={{ position:"relative", flexShrink:0 }}>
                <button onClick={() => setFilterOpen(o=>!o)}
                  style={{ fontSize:13, padding:"6px 10px", border:`1px solid ${activeFilterCount>0?"#185FA5":"var(--input-border)"}`, borderRadius:6, background:activeFilterCount>0?"#E6F1FB":"var(--surface)", color:activeFilterCount>0?"#185FA5":"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, whiteSpace:"nowrap" }}>
                  <Icon name="sliders" size={14} /> Filters
                  {activeFilterCount > 0 && <span style={{ background:"#185FA5", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{activeFilterCount}</span>}
                </button>
                {filterOpen && (
                  <>
                    <div onClick={() => setFilterOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }} />
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:100, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"14px 16px", minWidth:240, display:"flex", flexDirection:"column", gap:12 }}>
                      {/* Sort */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>SORT BY</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <select value={sortBy} onChange={e=>{ setSortBy(e.target.value); setSortDir("desc"); }} style={{ fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", flex:1, background:"var(--surface)", color:"var(--text-primary)" }}>
                            <option value="dateApplied">Date applied</option>
                            <option value="company">Company</option>
                            <option value="status">Status</option>
                            <option value="interest">Interest</option>
                          </select>
                          <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")} title={sortDir==="desc"?"Newest first":"Oldest first"} style={{ fontSize:13, padding:"5px 10px", border:"1px solid var(--input-border)", borderRadius:6, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", fontWeight:600 }}>
                            {sortDir==="desc" ? "↓" : "↑"}
                          </button>
                        </div>
                      </div>
                      {/* Outreach */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>OUTREACH</div>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          {[{key:"all",label:"All"},{key:"contacted",label:"📤 Contacted"},{key:"not-contacted",label:"⬜ Not contacted"}].map(({key,label}) => {
                            const active = outreachFilter===key;
                            return <button key={key} onClick={()=>setOutreachFilter(key)} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, cursor:"pointer", fontWeight:500, background:active?"#185FA5":"var(--surface-hover)", color:active?"#fff":"var(--text-secondary)", border:`1.5px solid ${active?"#0C447C":"var(--border)"}` }}>{label}</button>;
                          })}
                        </div>
                      </div>
                      {/* Tags */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>TAGS</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {Object.entries(TAG_CONFIG).map(([cat, cfg]) => {
                            const active = tagFilter[cat];
                            const c = getTagColors(cat);
                            return (
                              <div key={cat} style={{ position:"relative" }}>
                                <select value={active || ""} onChange={e => setTagFilter(f => ({ ...f, [cat]: e.target.value }))}
                                  style={{ fontSize:12, border:`1px solid ${active ? c.border : "var(--input-border)"}`, borderRadius:6, padding:"5px 28px 5px 8px", width:"100%", background: active ? c.bg : "var(--surface)", color: active ? c.text : "var(--text-primary)", appearance:"none", WebkitAppearance:"none", outline:"none", cursor:"pointer" }}>
                                  <option value="">{cfg.label}</option>
                                  {cfg.values.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <span style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:9, color: active ? c.text : "var(--text-muted)" }}>▾</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Archived */}
                      {archivedCount > 0 && (
                        <div style={{ borderTop:"1px solid var(--border-subtle)", paddingTop:10 }}>
                          <button onClick={() => { setShowArchived(a => !a); setSelected(new Set()); setFilterOpen(false); }}
                            style={{ fontSize:12, padding:"6px 10px", width:"100%", textAlign:"left", background:showArchived?"#FBEFD9":"var(--surface-hover)", color:showArchived?"#633806":"var(--text-secondary)", border:`1px solid ${showArchived?"#FAC775":"var(--border)"}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>
                            📦 {showArchived ? "Showing archived, back to active" : `Show archived jobs (${archivedCount})`}
                          </button>
                        </div>
                      )}
                      {/* Reset */}
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setFilter("All"); setSortBy("dateApplied"); setSortDir("desc"); setOutreachFilter("all"); setTagFilter({}); }}
                          style={{ fontSize:12, color:"#A32D2D", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left", fontWeight:500 }}>
                          ✕ Reset all filters
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          {view==="board" && (() => {
            const boardActiveCount = (outreachFilter!=="all"?1:0) + activeTagFilters.length;
            return (
              <div style={{ position:"relative", flexShrink:0 }}>
                <button onClick={() => setBoardFilterOpen(o=>!o)}
                  style={{ fontSize:13, padding:"6px 10px", border:`1px solid ${boardActiveCount>0?"#185FA5":"var(--input-border)"}`, borderRadius:6, background:boardActiveCount>0?"#E6F1FB":"var(--surface)", color:boardActiveCount>0?"#185FA5":"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, whiteSpace:"nowrap" }}>
                  <Icon name="sliders" size={14} /> Filters
                  {boardActiveCount > 0 && <span style={{ background:"#185FA5", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{boardActiveCount}</span>}
                </button>
                {boardFilterOpen && (
                  <>
                    <div onClick={() => setBoardFilterOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }} />
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:100, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"14px 16px", minWidth:240, display:"flex", flexDirection:"column", gap:12 }}>
                      {/* Outreach */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>OUTREACH</div>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          {[{key:"all",label:"All"},{key:"contacted",label:"📤 Contacted"},{key:"not-contacted",label:"⬜ Not contacted"}].map(({key,label}) => {
                            const active = outreachFilter===key;
                            return <button key={key} onClick={()=>setOutreachFilter(key)} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, cursor:"pointer", fontWeight:500, background:active?"#185FA5":"var(--surface-hover)", color:active?"#fff":"var(--text-secondary)", border:`1.5px solid ${active?"#0C447C":"var(--border)"}` }}>{label}</button>;
                          })}
                        </div>
                      </div>
                      {/* Tags */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>TAGS</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {Object.entries(TAG_CONFIG).map(([cat, cfg]) => {
                            const active = tagFilter[cat];
                            const c = getTagColors(cat);
                            return (
                              <div key={cat} style={{ position:"relative" }}>
                                <select value={active || ""} onChange={e => setTagFilter(f => ({ ...f, [cat]: e.target.value }))}
                                  style={{ fontSize:12, border:`1px solid ${active ? c.border : "var(--input-border)"}`, borderRadius:6, padding:"5px 28px 5px 8px", width:"100%", background: active ? c.bg : "var(--surface)", color: active ? c.text : "var(--text-primary)", appearance:"none", WebkitAppearance:"none", outline:"none", cursor:"pointer" }}>
                                  <option value="">{cfg.label}</option>
                                  {cfg.values.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <span style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:9, color: active ? c.text : "var(--text-muted)" }}>▾</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Archived */}
                      {archivedCount > 0 && (
                        <div style={{ borderTop:"1px solid var(--border-subtle)", paddingTop:10 }}>
                          <button onClick={() => { setShowArchived(a => !a); setSelected(new Set()); setBoardFilterOpen(false); }}
                            style={{ fontSize:12, padding:"6px 10px", width:"100%", textAlign:"left", background:showArchived?"#FBEFD9":"var(--surface-hover)", color:showArchived?"#633806":"var(--text-secondary)", border:`1px solid ${showArchived?"#FAC775":"var(--border)"}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>
                            📦 {showArchived ? "Showing archived, back to active" : `Show archived jobs (${archivedCount})`}
                          </button>
                        </div>
                      )}
                      {/* Reset */}
                      {boardActiveCount > 0 && (
                        <button onClick={() => { setOutreachFilter("all"); setTagFilter({}); }}
                          style={{ fontSize:12, color:"#A32D2D", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left", fontWeight:500 }}>
                          ✕ Reset all filters
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
        {/* Row 1 — navigation: view switcher + primary actions (desktop only; mobile uses bottom tab bar) */}
        {!isMobile && (
          <div style={{ order:1, display:"flex", flexDirection:"row", gap:8, alignItems:"center", width:"100%", justifyContent:"space-between" }}>
            <div className="view-switcher" style={{ flexShrink:1, minWidth:0, paddingTop:8, marginTop:-8 }}>
              <div style={{ display:"flex", border:"1.5px solid #B5D4F4", borderRadius:6, overflow:"visible", width:"auto" }}>
                {[["list","List"],["board","Pipeline"],["sheet","Table"],["calendar","Calendar"],["today","Today"],["offers","Offers"],["contacts","Contacts"]].map(([v,label],i,arr) => (
                  <button key={v} onClick={() => setView(v)}
                    style={{ fontSize:12, padding:"5px 12px", cursor:"pointer", fontWeight:500, border:"none", flexShrink:0,
                      background:view===v?"#185FA5":"var(--surface)", color:view===v?"#fff":"#185FA5",
                      borderRight: i<arr.length-1 ? "1px solid #B5D4F4" : "none", position:"relative",
                      borderRadius: i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":0, whiteSpace:"nowrap", textAlign:"center" }}>
                    {label}
                    {v==="today"&&todayTasks>0&&<span style={{ position:"absolute", top:-6, right:-6, background:"#A32D2D", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, zIndex:10 }}>{todayTasks}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"flex-end" }}>
              {showArchived && (
                <button onClick={() => { setShowArchived(false); setSelected(new Set()); }} style={{ fontSize:12, padding:"5px 12px", whiteSpace:"nowrap", background:"#633806", color:"#fff", border:"1.5px solid #FAC775", borderRadius:6, cursor:"pointer", fontWeight:500 }}>
                  📦 ← Back to active jobs
                </button>
              )}
              {!showArchived && view==="contacts" && <button onClick={() => setContactModal("new")} style={{ fontSize:13, padding:"6px 14px", whiteSpace:"nowrap", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer" }}>+ Add contact</button>}
              {!showArchived && !["contacts","profile","documents"].includes(view) && <button onClick={openAdd} style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, padding:"6px 14px", whiteSpace:"nowrap", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer" }}><Icon name="plus" size={13} /> Add job</button>}
              <button onClick={() => setView("profile")} style={{ fontSize:13, padding:"6px 14px", whiteSpace:"nowrap", background: view==="profile"?"#185FA5":"var(--surface)", color: view==="profile"?"#fff":"var(--text-secondary)", border:`1.5px solid ${view==="profile"?"#0C447C":"var(--border)"}`, borderRadius:6, cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                👤 Profile
              </button>
            </div>
          </div>
        )}
      </div>

      {view==="list" && <ViewHint viewKey="list" text="💡 Tip: paste a job posting link when adding a job and Followup fills in the title, company, and salary for you." />}

      {/* Status bubble bar */}
      {view === "list" && (
        <div style={{ display:"flex", gap:6, marginBottom:"1rem", alignItems:"center", flexWrap:"wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([s]) => {
            const c = getStatusCfg(s);
            // Count only jobs matching all active filters except the status filter itself
            const count = jobs
              .filter(j => showArchived ? j.archived : !j.archived)
              .filter(j => j.status === s)
              .filter(j => !search || `${j.role} ${j.company}`.toLowerCase().includes(search.toLowerCase()))
              .filter(j => activeTagFilters.every(([cat,val]) => (j.tags||{})[cat]===val))
              .filter(j => outreachFilter==="all" || (outreachFilter==="contacted" ? hasOutreach(j) : !hasOutreach(j)))
              .length;
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(active ? "All" : s)}
                style={{ fontSize:11, padding:"3px 10px", borderRadius:20, cursor:"pointer", fontWeight:500,
                  background: active ? c.bg : "var(--surface)",
                  color: active ? c.text : "var(--text-muted)",
                  border: `1.5px solid ${active ? c.border : "var(--border)"}` }}>
                {s} <span style={{ fontWeight:700 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view==="list" && (
        filtered.length===0
          ? <div>
              {!showArchived && jobs.filter(j=>!j.archived).length===0
                ? <OnboardingCard onAdd={openAdd} onLoadSample={() => { const s=makeSampleJobs(); setJobs(s); saveJobs(s); track("job_added", { source:"sample", jobs_total:s.length }); }} />
                : <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--text-muted)", fontSize:14 }}>{showArchived?"No archived jobs.":"No results for this filter."}</div>}
            </div>
          : <div>
              {showArchived && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"var(--text-secondary)" }}>📦 Showing {filtered.length} archived job{filtered.length!==1?"s":""}, hidden from active views.</span>
                </div>
              )}
              {/* Floating bulk-action bar — fixed to bottom of viewport */}
              {selected.size > 0 && (
                <div className="bulk-action-bar" style={{
                  position:"fixed", bottom: isMobile ? 76 : 28, left:"50%", transform:"translateX(-50%)",
                  display:"flex", gap: isMobile ? 5 : 8, alignItems:"center",
                  padding: isMobile ? "9px 10px" : "11px 18px",
                  background:"#185FA5",
                  borderRadius:14,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
                  zIndex:600,
                  flexWrap:"nowrap",
                  whiteSpace:"nowrap",
                  backdropFilter:"blur(4px)",
                  maxWidth: isMobile ? "calc(100vw - 24px)" : undefined,
                  overflowX: isMobile ? "auto" : undefined,
                }}>
                  <span style={{ fontSize:13, color:"#fff", fontWeight:600, marginRight: isMobile ? 0 : 4 }}>
                    {selected.size}{!isMobile && " selected"}
                  </span>
                  {!isMobile && <div style={{ width:1, height:18, background:"rgba(255,255,255,0.3)", margin:"0 4px" }} />}
                  <select defaultValue="" onChange={e => { bulkStatus(e.target.value); e.target.value=""; }} style={{ fontSize:12, borderRadius:6, padding: isMobile ? "5px 4px" : "5px 8px", border:"none", cursor:"pointer", background:"rgba(255,255,255,0.15)", color:"#fff", maxWidth: isMobile ? 76 : undefined }}>
                    <option value="" disabled style={{ color:"#000" }}>{isMobile ? "Status…" : "Change status…"}</option>
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s} style={{ color:"#000" }}>{s}</option>)}
                  </select>
                  {!showArchived && (
                    <button onClick={bulkArchive} style={{ display:"flex", alignItems:"center", gap: isMobile ? 3 : 6, fontSize:12, padding: isMobile ? "5px 8px" : "5px 13px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                      <Icon name="archive" size={13} /> {!isMobile && "Archive"}
                    </button>
                  )}
                  {showArchived && (
                    <button onClick={() => { selected.forEach(id => restoreJob(id)); clearSelect(); }} style={{ fontSize:12, padding: isMobile ? "5px 8px" : "5px 13px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                      ↩{!isMobile && " Restore"}
                    </button>
                  )}
                  <button onClick={bulkDelete} style={{ fontSize:12, padding: isMobile ? "5px 8px" : "5px 13px", background:"#FCEBEB", color:"#791F1F", border:"1.5px solid #F09595", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                    🗑{!isMobile && " Delete"}
                  </button>
                  {!isMobile && <div style={{ width:1, height:18, background:"rgba(255,255,255,0.3)", margin:"0 4px" }} />}
                  <button onClick={clearSelect} style={{ fontSize:12, padding: isMobile ? "5px 8px" : "5px 11px", background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              )}
              <div style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", marginBottom: selected.size > 0 ? 80 : 0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", background:"var(--surface-subtle)", borderBottom:"1px solid var(--border)" }}>
                  <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0} onChange={e=>e.target.checked?selectAll():clearSelect()} style={{ cursor:"pointer" }} />
                  <span style={{ fontSize:12, color:"var(--text-muted)" }}>{selected.size>0?`${selected.size} of ${filtered.length} selected`:`${filtered.length} job${filtered.length!==1?"s":""}`}</span>
                </div>
                {filtered.map((job,i) => (
                  <div key={job.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none", display:"flex", alignItems:"flex-start", background:selected.has(job.id)?"#F0F6FF":"transparent" }}>
                    <div style={{ padding:"16px 8px 16px 16px", flexShrink:0 }}>
                      <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)} style={{ cursor:"pointer" }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <ListCard job={job} isFirst={i===0} onEdit={openEdit} onStatusChange={onStatusChange} onNotesSave={onNotesSave} onAddReminder={addReminder} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} onDuplicate={duplicateJob} onOpenPanel={togglePanel} onArchive={archiveJob} tasks={tasks} onWin={() => showWinsToast(`Sent 📤. That's ${followupsSentThisWeek(jobs) + 1} this week. Most people never send one.`)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
      )}

      {/* Board view */}
      {view==="board" && (jobs.filter(j=>!j.archived).length===0
        ? <EmptyState icon="📋" title="No applications yet" desc="Add jobs from the List view and they'll appear here as cards you can drag through your pipeline." action="Go to List view" onAction={() => setView("list")} />
        : <div>
          <ViewHint viewKey="board" text="💡 Tip: drag cards between columns to update status. The funnel above tracks your conversion rate." />
          <PipelineFunnel jobs={jobs.filter(j => !j.archived)} />
          {jobs.filter(j => !j.archived && (j.salaryMin || j.salaryMax)).length > 0 && (
            <div style={{ marginBottom:16, border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
              <button onClick={() => setSalaryOpen(o => !o)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"var(--surface-subtle)", border:"none", cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontSize:13, fontWeight:600, color:"var(--text-secondary)" }}>💰 Salary ranges</span>
                <span style={{ fontSize:11, color:"var(--text-muted)" }}>{salaryOpen ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {salaryOpen && (
                <div style={{ padding:"16px" }}>
                  <SalaryChart jobs={jobs.filter(j => !j.archived)} onOpenPanel={togglePanel} />
                </div>
              )}
            </div>
          )}
          {/* Column toggles + tag filters */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
            {Object.entries(STATUS_CONFIG).map(([status]) => { const cfg = getStatusCfg(status); return (
              <button key={status} onClick={() => toggleCol(status)} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, cursor:"pointer", fontWeight:500, background:hiddenCols[status]?"var(--surface)":cfg.bg, color:hiddenCols[status]?"var(--text-muted)":cfg.text, border:`1.5px solid ${hiddenCols[status]?"var(--border)":cfg.border}` }}>
                {hiddenCols[status]?"+":" −"} {status}
              </button>
            ); })}
          </div>
          <BoardTable jobs={(activeTagFilters.length>0 ? jobs.filter(j=>activeTagFilters.every(([cat,val])=>(j.tags||{})[cat]===val)) : jobs).filter(j=>!j.archived)} visibleStatuses={Object.keys(STATUS_CONFIG).filter(s=>!hiddenCols[s])} search={search} onDrop={onDrop} onPanelOpen={togglePanel} dragId={dragId} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} onWin={() => showWinsToast(`Sent 📤. That's ${followupsSentThisWeek(jobs) + 1} this week. Most people never send one.`)} />
        </div>)}

      {/* Sheet view */}
      {view==="sheet" && (jobs.filter(j=>!j.archived).length===0
        ? <EmptyState icon="📊" title="No jobs to display" desc="Add your first job from the List view and it will appear here in the spreadsheet." />
        : <>
            <ViewHint viewKey="sheet" text="💡 Tip: click any cell to edit it inline, good for scanning or comparing lots of applications at once." />
            <SpreadsheetView jobs={jobs} setJobs={setJobs} onStatusChange={onStatusChange} onNotesSave={onNotesSave} />
          </>)}

      {/* Calendar view */}
      {view==="calendar" && <>
        <ViewHint viewKey="calendar" text={`💡 Tip: turn on "Milestones" in the sidebar to also see every status change from each job's timeline.`} />
        <CalendarView jobs={jobs} tasks={tasks} onOpenPanel={togglePanel} />
      </>}

      {/* Today view */}
      {view==="today" && <>
        {quietJobs.length > 0 && !quietDismissed && (
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", justifyContent:"space-between", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderLeft:"3px solid #C27209", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:13, color:"var(--text-secondary)" }}>📥 <b style={{ color:"var(--text-primary)", fontWeight:600 }}>{quietJobs.length}</b> application{quietJobs.length>1?"s have":" has"} had no activity in {quietPromptN}+ days.</div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={archiveQuiet} style={{ fontSize:12, padding:"5px 12px", background:"#185FA5", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Archive {quietJobs.length}</button>
              <button onClick={()=>setQuietDismissed(true)} style={{ fontSize:12, padding:"5px 10px", background:"var(--surface)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:6, cursor:"pointer" }}>Dismiss</button>
            </div>
          </div>
        )}
        <TodayTab jobs={jobs} tasks={tasks} setTasks={setTasks} onOpenPanel={togglePanel} profileName={profileName || user?.user_metadata?.full_name || ""} onAddJob={openAdd} onLoadSample={() => { const s=makeSampleJobs(); setJobs(s); saveJobs(s); track("job_added", { source:"sample", jobs_total:s.length }); }} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} onLogReply={logReply} weeklyGoal={weeklyGoal} onWin={showWinsToast} isMobile={isMobile} checklistProgress={checklistProgress} onChecklistDone={markChecklist} onNavigate={navigateChecklist} onEnableReminders={enableNotifications} demoMode={demoMode} />
      </>}

      {/* Offers view */}
      {view==="offers" && <>
        {isMobile && <button onClick={() => setView("list")} style={{ display:"block", fontSize:13, padding:"8px 10px", marginBottom:8, background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontWeight:500, minHeight:44 }}>← Back to Jobs</button>}
        <ViewHint viewKey="offers" text="💡 Tip: this view only shows jobs at the Offer stage, so you can compare them side by side." />
        <OffersView jobs={jobs} onOpenPanel={togglePanel} />
      </>}

      {/* Contacts view */}
      {view==="contacts" && (
        <>
          {isMobile && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:8 }}>
              <button onClick={() => setView("profile")} style={{ fontSize:13, padding:"8px 10px", background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontWeight:500, minHeight:44 }}>← Back</button>
              <button onClick={() => setContactModal("new")} style={{ fontSize:13, padding:"8px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer", minHeight:44 }}>+ Add contact</button>
            </div>
          )}
          <ViewHint viewKey="contacts" text="💡 Tip: link a contact to a job from that job's detail panel so you always know who to follow up with." />
          <ContactsView contacts={contacts} jobs={jobs} search={search}
            onOpenPanel={c => setPanelContact(p => p?.id === c?.id ? null : c)}
            onAdd={() => setContactModal("new")} />
        </>
      )}

      {/* Profile screen — merges old Settings modal + ☰ hamburger menu; tab on mobile, route on desktop */}
      {view==="profile" && demoMode && (
        <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>👤</div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-primary)", marginBottom:8 }}>Your profile lives in your account</div>
          <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.6, maxWidth:340, margin:"0 auto" }}>Sign up free to set your name, tune follow-up timing, and save the applications you're tracking here.</div>
          <button onClick={() => { track("demo_signup_clicked", { source:"profile" }); setDemoMode(false); }} style={{ marginTop:16, fontSize:13, padding:"8px 20px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:500 }}>Sign up free</button>
        </div>
      )}
      {view==="profile" && !demoMode && (
        <ProfileScreen
          user={user} isMobile={isMobile}
          profileName={profileName || user?.user_metadata?.full_name || ""}
          onProfileNameChange={n => { setProfileName(n); try { localStorage.setItem("followup_profile_name", n); } catch {} persistSettings({ profileName: n }); }}
          autoArchiveDays={autoArchiveDays}
          onAutoArchiveDaysChange={v => { setAutoArchiveDays(v); try { localStorage.setItem("followup_autoarchive_days", v); } catch {} persistSettings({ autoArchiveDays: v }); }}
          quietPromptDays={quietPromptDays}
          onQuietPromptDaysChange={v => { setQuietPromptDays(v); try { localStorage.setItem("followup_quietprompt_days", v); } catch {} persistSettings({ quietPromptDays: v }); }}
          followupAppliedDays={followupAppliedDays}
          onFollowupAppliedChange={v => { setFollowupAppliedDays(v); try { localStorage.setItem("followup_applied_days", v); } catch {} persistSettings({ followupAppliedDays: v }); }}
          followupWarmDays={followupWarmDays}
          onFollowupWarmChange={v => { setFollowupWarmDays(v); try { localStorage.setItem("followup_warm_days", v); } catch {} persistSettings({ followupWarmDays: v }); }}
          staleDays={staleDays}
          onStaleDaysChange={v => { setStaleDays(v); try { localStorage.setItem("followup_stale_days", v); } catch {} persistSettings({ staleDays: v }); }}
          weeklyGoal={weeklyGoal}
          onWeeklyGoalChange={v => { setWeeklyGoal(v); try { localStorage.setItem("followup_weekly_goal", v); } catch {} persistSettings({ weeklyGoal: v }); }}
          contactsCount={contacts.length}
          documentsCount={documents.length}
          archivedCount={archivedCount}
          onOpenContacts={() => setView("contacts")}
          onOpenDocuments={() => setView("documents")}
          onOpenArchived={() => { setShowArchived(true); setView("list"); }}
          onShowHelp={() => { track("help_opened"); setShowHelp(true); }}
          exportJSON={exportJSON} importJSON={importJSON} exportCSV={exportCSV} importCSV={importCSV} enableNotifications={enableNotifications}
          automationSignal={automationSignal} onAutomationOpen={() => markChecklist("setTiming")}
          bookmarkletSignal={bookmarkletSignal} onBookmarkletOpen={() => markChecklist("bookmarklet")}
        />
      )}

      {/* Documents view — reached from Profile → Your stuff */}
      {view==="documents" && (
        <>
          <button onClick={() => setView("profile")} style={{ display:"block", fontSize:13, padding:"8px 10px", marginBottom:8, background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontWeight:500, minHeight:44 }}>← Back to Profile</button>
          <DocumentsView documents={documents} onDocumentsChange={d => { setDocuments(d); saveDocuments(d); }} />
        </>
      )}

      {modal && <Modal form={form} setForm={setForm} onSave={save} onClose={() => setModal(false)} onDelete={() => { del(form.id); setModal(false); }} isEdit={!!jobs.find(j=>j.id===form.id)} />}
      {panelJob && <DetailPanel job={panelJob} onClose={() => setPanelJob(null)}
        onSave={updated => {
          const now = new Date().toISOString();
          const enriched = { ...updated, updatedAt: now };
          const u = jobs.map(j => j.id === enriched.id ? enriched : j);
          setJobs(u); saveJobs(u); setPanelJob(enriched);
          syncContactFromField(enriched);
        }}
        onDelete={del} onArchive={archiveJob} onRestore={restoreJob} onNotesSave={onNotesSave} onStatusChange={onStatusChange} tasks={tasks} onAddReminder={addReminder}
        onTaskDone={id => { const u=tasks.map(t=>t.id===id?{...t,done:true}:t); setTasks(u); saveTasks(u); track("reminder_completed"); }}
        onTaskDelete={id => { const u=tasks.filter(t=>t.id!==id); setTasks(u); saveTasks(u); }}
        onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); setPanelJob(u.find(j=>j.id===id)||null); }}
        contacts={contacts}
        onLinkContact={contactId => {
          const u = contacts.map(c => c.id===contactId ? { ...c, relatedJobIds:[...new Set([...(c.relatedJobIds||[]), panelJob.id])] } : c);
          setContacts(u); saveContacts(u);
        }}
        onUnlinkContact={contactId => {
          const u = contacts.map(c => c.id===contactId ? { ...c, relatedJobIds:(c.relatedJobIds||[]).filter(id=>id!==panelJob.id) } : c);
          setContacts(u); saveContacts(u);
        }}
        onCreateContact={name => {
          const now = new Date().toISOString();
          const newContact = { id: Date.now(), name, title:"", company: panelJob.company, email:"", phone:"", linkedin:"", notes:"", createdAt: now, relatedJobIds:[panelJob.id] };
          const u = [...contacts, newContact];
          setContacts(u); saveContacts(u);
        }}
        onOpenContact={contact => { setPanelJob(null); setPanelContact(contact); }}
        documents={documents} profileName={profileName || user?.user_metadata?.full_name || ""} onLogOutreach={logOutreach} onLogReply={logReply} />}
      {contactModal && (
        <ContactModal
          contact={contactModal === "new" ? null : contactModal}
          onSave={c => {
            const now = new Date().toISOString();
            let u;
            if (contactModal === "new") {
              u = [...contacts, { ...c, id: Date.now(), createdAt: now, relatedJobIds: c.relatedJobIds||[] }];
            } else {
              u = contacts.map(x => x.id === c.id ? { ...c } : x);
            }
            setContacts(u); saveContacts(u); setContactModal(null);
            if (panelContact && c.id === panelContact.id) setPanelContact(u.find(x=>x.id===c.id));
          }}
          onClose={() => setContactModal(null)}
          onDelete={contactModal !== "new" ? () => {
            const u = contacts.filter(x => x.id !== contactModal.id);
            setContacts(u); saveContacts(u); setContactModal(null); setPanelContact(null);
          } : null}
        />
      )}
      {panelContact && (
        <ContactPanel contact={panelContact} jobs={jobs}
          onClose={() => setPanelContact(null)}
          onEdit={() => setContactModal(panelContact)}
          onOpenJob={job => { setView("list"); setPanelContact(null); setPanelJob(job); }}
          onUnlinkJob={jobId => {
            const u = contacts.map(c => c.id===panelContact.id ? { ...c, relatedJobIds:(c.relatedJobIds||[]).filter(id=>id!==jobId) } : c);
            setContacts(u); saveContacts(u); setPanelContact(u.find(c=>c.id===panelContact.id));
          }}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {undoStack && <UndoToast message={undoStack.message} onUndo={undo} onDismiss={() => setUndoStack(null)} />}
      {winsToast && <WinsToast message={winsToast} onDismiss={() => setWinsToast(null)} />}
      {ahaJob && (
        <AhaDemoBanner job={ahaJob}
          onSeeDraft={() => { track("aha_draft_demo", { action:"accepted" }); track("draft_opened", { job_status: ahaJob.status, source:"aha_demo" }); setAhaDraftJob(ahaJob); setAhaJob(null); }}
          onDismiss={() => { track("aha_draft_demo", { action:"dismissed" }); setAhaJob(null); }} />
      )}
      {ahaDraftJob && (
        <DraftComposer job={ahaDraftJob} profileName={profileName || user?.user_metadata?.full_name || ""} onClose={() => setAhaDraftJob(null)}
          onMarkContacted={() => { logOutreach(ahaDraftJob); track("draft_actioned", { action:"mark_contacted" }); setAhaDraftJob(null); }} />
      )}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, height:60, background:"var(--surface)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"stretch", zIndex:400, boxShadow:"0 -2px 12px rgba(0,0,0,0.08)" }}>
          {[
            { key:"today", icon:"inbox", label:"Today", onClick:()=>setView("today"), active: view==="today", badge: todayTasks>0?todayTasks:null },
            { key:"jobs", icon:"briefcase", label:"Jobs", onClick:()=>setView("list"), active: ["list","board","offers"].includes(view) },
            { key:"add", icon:"plus", label:"Add", onClick:openAdd, active:false, isFab:true },
            { key:"calendar", icon:"calendar", label:"Calendar", onClick:()=>setView("calendar"), active: view==="calendar" },
            { key:"profile", icon:"user", label:"Profile", onClick:()=>setView("profile"), active: ["profile","contacts","documents"].includes(view) },
          ].map(tab => (
            <button key={tab.key} onClick={tab.onClick}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, border:"none", background:"none", cursor:"pointer", position:"relative", minHeight:44,
                color: tab.active ? "#185FA5" : "var(--text-secondary)" }}>
              <Icon name={tab.icon} size={tab.isFab ? 22 : 18} />
              <span style={{ fontSize:10, fontWeight: tab.active ? 600 : 500 }}>{tab.label}</span>
              {tab.badge && <span style={{ position:"absolute", top:2, right:"28%", background:"#A32D2D", color:"#fff", borderRadius:"50%", width:15, height:15, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{tab.badge}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

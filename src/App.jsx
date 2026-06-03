import { useState, useEffect, useRef } from "react";
import { supabase } from './supabase';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
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
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:5, padding:"2px 6px", fontSize:11, fontWeight:500, whiteSpace:"nowrap" }}>
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
const FOLLOWUP_DAYS = { "Applied": 7, "Phone Screen": 3, "Interview": 3 };

const EMPTY = {
  id: null, role: "", company: "", link: "", salaryMin: "", salaryMax: "",
  dateApplied: "", status: "Applied", contact: "", customFollowup: "", notes: "",
  createdAt: null, updatedAt: null, lastStatus: null, timeline: [], interviewDate: "",
  tags: {}, prepChecklist: [], archived: false, followupDismissed: false,
};

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
function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateInNDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
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

const STALE_DAYS = 14;
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

function FollowupActions({ job, onUpdateJob }) {
  const [open, setOpen] = useState(false);
  const fu = getFollowupStatus(job);
  if (!fu) return null;

  function snooze(days) {
    onUpdateJob(job.id, { customFollowup: dateInNDays(days) });
    setOpen(false);
  }
  function logOutreach() {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    onUpdateJob(job.id, {
      customFollowup: dateInNDays(resetDays),
      timeline: [...(job.timeline||[]), { id:crypto.randomUUID(), status:job.status, date:now, notes:"Follow-up sent" }],
    });
    setOpen(false);
  }
  function dismiss() {
    onUpdateJob(job.id, { followupDismissed: true });
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
              <button onClick={() => snooze(3)} title="Remind me in 3 days" style={{ flex:1, fontSize:11, padding:"4px 0", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>+3d</button>
              <button onClick={() => snooze(7)} title="Remind me in 7 days" style={{ flex:1, fontSize:11, padding:"4px 0", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>+7d</button>
              <button onClick={dismiss} title="Stop reminding me" style={{ flex:1, fontSize:11, padding:"4px 0", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>✕</button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}

// ── Supabase data helpers ─────────────────────────────────────────────────────
let _uid = null; // set by App on auth change

async function loadUserData() {
  if (!_uid) return { jobs: [], tasks: [] };
  const { data } = await supabase.from('user_data').select('jobs,tasks').eq('user_id', _uid).single();
  return { jobs: data?.jobs || [], tasks: data?.tasks || [] };
}

function saveJobs(jobs) {
  if (!_uid) return;
  supabase.from('user_data').upsert({ user_id: _uid, jobs, updated_at: new Date().toISOString() }).then(() => {});
}

function saveTasks(tasks) {
  if (!_uid) return;
  supabase.from('user_data').upsert({ user_id: _uid, tasks, updated_at: new Date().toISOString() }).then(() => {});
}

function applyStatusChange(jobs, id, newStatus, interviewDate) {
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
    return { ...j, status: newStatus, updatedAt: now, lastStatus: { status: newStatus, at: now }, timeline: newTimeline, prepChecklist, ...(interviewDate !== undefined ? { interviewDate } : {}) };
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
      <button onClick={onDismiss} style={{ fontSize:12, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", padding:0 }}>✕</button>
    </div>
  );
}

// ── Interview date prompt ─────────────────────────────────────────────────────
function InterviewDatePrompt({ status, anchorRef, onConfirm, onSkip }) {
  const [date, setDate] = useState(todayStr());
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
  return (
    <div ref={ref} style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:500, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", padding:"14px 16px", width:240 }}>
      <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", marginBottom:8 }}>{status} date</div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width:"100%", fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", boxSizing:"border-box", marginBottom:10 }} />
      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
        <button onClick={onSkip} style={{ fontSize:12, padding:"4px 10px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>Skip</button>
        <button onClick={() => onConfirm(date)} style={{ fontSize:12, padding:"4px 10px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:5, cursor:"pointer", fontWeight:500 }}>Save</button>
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
    else onChange(s, "");
  }
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <select ref={anchorRef} value={job.status} onChange={handleChange} style={{ fontSize:12, fontWeight:500, padding:"2px 6px", borderRadius:6, cursor:"pointer", background:cfg.bg, color:cfg.text, border:`1.5px solid ${cfg.border}` }}>
        {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
      </select>
      {prompt && <InterviewDatePrompt status={pendingStatus} anchorRef={anchorRef} onConfirm={date => { onChange(pendingStatus, date); setPrompt(false); }} onSkip={() => { onChange(pendingStatus, ""); setPrompt(false); }} />}
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
      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)", marginBottom:6 }}>Notes — {job.company} · {job.role}</div>
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
      <button onClick={() => setOpen(o => !o)} style={{ fontSize:11, padding:"2px 8px", borderRadius:5, cursor:"pointer", fontWeight:400, background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>{job.notes ? "Notes ✎" : "Add note"}</button>
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

  // Sort all entries chronologically; manual entries have an `id` field
  const sorted = [...(timeline||[])].sort((a,b) => (a.date||"").localeCompare(b.date||""));
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
                    {isEditing && <button onClick={() => saveNotes(key)} style={{ fontSize:11, padding:"2px 8px", background:"#185FA5", color:"#fff", border:"1px solid #0C447C", borderRadius:5, cursor:"pointer" }}>Save</button>}
                    {isEditing && <button onClick={() => setEditing(null)} style={{ fontSize:11, padding:"2px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>Cancel</button>}
                    {!isEditing && <button onClick={() => deleteEntry(key)} style={{ fontSize:11, padding:"2px 8px", background:"var(--surface-hover)", color:"#A32D2D", border:"1px solid #F09595", borderRadius:5, cursor:"pointer" }}>Delete</button>}
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
              style={{ fontSize:12, padding:"3px 10px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>Cancel</button>
            <button onClick={addEntry} disabled={!newEntry.label.trim()}
              style={{ fontSize:12, padding:"3px 10px", background:newEntry.label.trim()?"#185FA5":"#ccc", color:"#fff", border:"none", borderRadius:5, cursor:newEntry.label.trim()?"pointer":"default", fontWeight:500 }}>Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddOpen(true)}
          style={{ alignSelf:"flex-start", fontSize:11, padding:"3px 10px", background:"var(--surface-hover)", color:"#185FA5", border:"1px solid #B5D4F4", borderRadius:5, cursor:"pointer", marginTop: sorted.length?8:0 }}>
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
        <button onClick={() => setOpen(o=>!o)} style={{ fontSize:11, padding:"2px 9px", background:open?getStatusCfg("Applied").bg:"var(--surface-hover)", color:open?getStatusCfg("Applied").text:"var(--text-secondary)", border:`1px solid ${open?getStatusCfg("Applied").border:"var(--border)"}`, borderRadius:5, cursor:"pointer", fontWeight:500 }}>
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
function PanelSection({ label, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
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

function DetailPanel({ job, onClose, onSave, onDelete, onArchive, onRestore, onNotesSave, onStatusChange, onUpdateJob, tasks, onAddReminder, onTaskDone, onTaskDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  function startEdit() {
    setForm({ ...job, tags: job.tags||{}, timeline: job.timeline||[] });
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
  const showInterviewDate = editing && INTERVIEW_STATUSES.includes(form.status);

  const inputStyle = { fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };

  return (
    <div className="detail-panel" style={{ position:"fixed", top:0, right:0, bottom:0, width:360, background:"var(--surface)", borderLeft:"1px solid var(--border)", zIndex:150, display:"flex", flexDirection:"column", boxShadow:"-4px 0 20px rgba(0,0,0,0.12)" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:"linear-gradient(90deg,#185FA5 0%,#3C3489 100%)" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, color:"#fff", fontWeight:700, marginBottom:2 }}>{job.company}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{job.role}</div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:16, cursor:"pointer", borderRadius:6, padding:"2px 8px", flexShrink:0 }}>✕</button>
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
              <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>{form.status} date
                <input type="date" value={form.interviewDate||""} onChange={e=>setForm(f=>({...f,interviewDate:e.target.value}))} style={inputStyle} />
              </label>
            )}
            <label style={{ fontSize:13, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:3 }}>Custom follow-up date
              <input type="date" value={form.customFollowup||""} onChange={e=>setForm(f=>({...f,customFollowup:e.target.value}))} style={inputStyle} />
            </label>
            <div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:6 }}>Tags</div>
              <TagSelector tags={form.tags||{}} onChange={tags=>setForm(f=>({...f,tags}))} />
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <StatusSelect job={job} onChange={(s, d) => onStatusChange(job.id, s, d)} />
              {fu && <FollowupBadge info={fu} />}
              {job.followupDismissed && (
                <span style={{ fontSize:10, color:"var(--text-muted)", background:"var(--surface-hover)", border:"1px solid var(--border)", borderRadius:6, padding:"2px 7px", display:"flex", alignItems:"center", gap:5 }}>
                  🔕 Reminders off
                  <button onClick={() => onUpdateJob(job.id, { followupDismissed: false })} style={{ fontSize:10, color:"#185FA5", background:"none", border:"none", cursor:"pointer", padding:0, fontWeight:600 }}>Re-enable</button>
                </span>
              )}
            </div>
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
                ["Interview date", job.interviewDate ? fmtDate(job.interviewDate+"T00:00:00") : null],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label} style={{ display:"flex", gap:8, fontSize:12 }}>
                  <span style={{ color:"var(--text-muted)", minWidth:100 }}>{label}</span>
                  <span style={{ color:"var(--text-primary)", fontWeight:500 }}>
                    {val && typeof val === "object" ? <>{val.display} <span style={{ color:"var(--text-muted)", fontWeight:400 }}>· {val.sub}</span></> : val}
                  </span>
                </div>
              ))}
              {job.link && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:100 }}>Posting</span><a href={job.link} target="_blank" rel="noreferrer" style={{ color:"#185FA5", textDecoration:"none", fontWeight:500 }}>View job ↗</a></div>}
              {job.createdAt && <div style={{ display:"flex", gap:8, fontSize:12 }}><span style={{ color:"var(--text-muted)", minWidth:100 }}>Added</span><span style={{ color:"var(--text-muted)" }}>{timeAgo(job.createdAt)}</span></div>}
            </div>
            <InlineNotes label="General notes" value={job.notes || ""} onSave={notes => onNotesSave(job.id, notes, null)} />
            <PanelSection label="📧 Email templates" defaultOpen={false}>
              <EmailTemplates job={job} />
            </PanelSection>
            <PanelSection label="🔔 Reminders" count={linkedTasks || null} defaultOpen={linkedTasks > 0}>
              <PanelReminders job={job} tasks={tasks} onAddReminder={onAddReminder} onTaskDone={onTaskDone} onTaskDelete={onTaskDelete} />
            </PanelSection>
            <PanelSection label="✅ Prep checklist" count={checklistCount > 0 ? `${(job.prepChecklist||[]).filter(i=>i.done).length}/${checklistCount}` : null} defaultOpen={checklistCount > 0}>
              <PrepChecklist job={job} onUpdate={cl => onNotesSave(job.id, null, undefined, cl)} />
            </PanelSection>
            <PanelSection label="📋 Timeline" count={timelineCount || null} defaultOpen={timelineCount > 0}>
              <Timeline compact timeline={job.timeline} onUpdate={tl => onNotesSave(job.id, null, tl)} />
            </PanelSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--surface)", gap:8, flexWrap:"wrap" }}>
        {editing ? (
          <>
            <button onClick={cancelEdit} style={{ fontSize:13, padding:"6px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Cancel</button>
            <button onClick={saveEdit} disabled={!form.role||!form.company} style={{ fontSize:13, padding:"6px 20px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500, marginLeft:"auto" }}>Save changes</button>
          </>
        ) : (
          <>
            <button onClick={() => { onDelete(job.id); onClose(); }} style={{ fontSize:13, padding:"6px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>Delete</button>
            <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
              {job.archived
                ? <button onClick={() => { onRestore(job.id); onClose(); }} style={{ fontSize:13, padding:"6px 14px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1.5px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>↩ Restore</button>
                : <button onClick={() => { onArchive(job.id); onClose(); }} style={{ fontSize:13, padding:"6px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500 }}>📦 Archive</button>
              }
              {!job.archived && <button onClick={startEdit} style={{ fontSize:13, padding:"6px 16px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Edit</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Email templates ───────────────────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    id: "followup",
    label: "Application follow-up",
    hint: "1–2 weeks after applying with no response",
    subject: (j) => `Following up — ${j.role} application`,
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
    subject: (j) => `Thank you — ${j.role} interview`,
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
    subject: (j) => `Checking in — ${j.role} at ${j.company}`,
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

function EmailTemplates({ job }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null); // "subject" | "body" | "both"

  function copy(text, which) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const tpl = EMAIL_TEMPLATES.find(t => t.id === selected);

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:500, color:"var(--text-secondary)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
        <span style={{ fontSize:14 }}>📧</span> Email templates
        <span style={{ fontSize:10, color:"var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {EMAIL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}
                style={{ fontSize:11, padding:"4px 10px", borderRadius:20, cursor:"pointer", fontWeight:500, whiteSpace:"nowrap",
                  background: selected === t.id ? getStatusCfg("Applied").bg : "var(--surface-hover)",
                  color: selected === t.id ? getStatusCfg("Applied").text : "var(--text-secondary)",
                  border: `1px solid ${selected === t.id ? getStatusCfg("Applied").border : "var(--border)"}` }}>
                {t.label}
              </button>
            ))}
          </div>

          {tpl && (
            <div style={{ background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
              <div style={{ padding:"8px 12px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:"var(--text-muted)", fontStyle:"italic" }}>{tpl.hint}</span>
              </div>
              {/* Subject line */}
              <div style={{ padding:"8px 12px", borderBottom:"1px solid var(--border-subtle)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                  <span style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>Subject</span>
                  <button onClick={() => copy(tpl.subject(job), "subject")}
                    style={{ fontSize:10, padding:"2px 8px", background: copied==="subject"?getStatusCfg("Offer").bg:"var(--surface-hover)", color: copied==="subject"?getStatusCfg("Offer").text:"var(--text-muted)", border:`1px solid ${copied==="subject"?getStatusCfg("Offer").border:"var(--border)"}`, borderRadius:4, cursor:"pointer" }}>
                    {copied === "subject" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ fontSize:12, color:"var(--text-primary)" }}>{tpl.subject(job)}</div>
              </div>
              {/* Body */}
              <div style={{ padding:"8px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em" }}>Body</span>
                  <button onClick={() => copy(tpl.body(job), "body")}
                    style={{ fontSize:10, padding:"2px 8px", background: copied==="body"?getStatusCfg("Offer").bg:"var(--surface-hover)", color: copied==="body"?getStatusCfg("Offer").text:"var(--text-muted)", border:`1px solid ${copied==="body"?getStatusCfg("Offer").border:"var(--border)"}`, borderRadius:4, cursor:"pointer" }}>
                    {copied === "body" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <pre style={{ fontSize:11, color:"var(--text-secondary)", lineHeight:1.6, whiteSpace:"pre-wrap", margin:0, fontFamily:"inherit" }}>{tpl.body(job)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ form, setForm, onSave, onClose, onDelete, isEdit }) {
  const [tab, setTab] = useState("details");
  const showInterviewDate = INTERVIEW_STATUSES.includes(form.status);
  return (
    <div className="modal-overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"1rem" }}>
      <div className="modal-inner" style={{ background:"var(--surface)", borderRadius:12, border:"0.5px solid var(--border)", padding:"1.5rem", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 1rem", fontWeight:500, fontSize:16, color:"var(--text-primary)" }}>{isEdit?"Edit application":"Add application"}</h3>
        <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", marginBottom:"1rem" }}>
          {["details","tags","timeline"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, fontSize:13, padding:"7px", border:"none", cursor:"pointer", fontWeight:500, background:tab===t?"#185FA5":"var(--surface)", color:tab===t?"#fff":"var(--text-secondary)", textTransform:"capitalize" }}>{t}</button>
          ))}
        </div>
        <style>{`.mf input,.mf select,.mf textarea{border:1px solid #bbb !important;border-radius:6px !important;padding:6px 10px !important;background:#fafafa !important;}.mf input:focus,.mf select:focus,.mf textarea:focus{border-color:#888 !important;outline:none !important;}`}</style>

        {tab === "details" && (
          <div className="mf" style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[["Company *","company","text","e.g. Acme Corp"],["Role title *","role","text","e.g. Senior Product Manager"],["Job posting URL","link","url","https://..."],["Contact / recruiter","contact","text","Name or email"]].map(([label,key,type,ph]) => (
              <label key={key} style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>{label}
                <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} style={{ fontSize:13 }} />
              </label>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Salary min<input type="number" placeholder="90000" value={form.salaryMin} onChange={e => setForm(f=>({...f,salaryMin:e.target.value}))} style={{ fontSize:13 }} /></label>
              <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Salary max<input type="number" placeholder="120000" value={form.salaryMax} onChange={e => setForm(f=>({...f,salaryMax:e.target.value}))} style={{ fontSize:13 }} /></label>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Date applied<input type="date" value={form.dateApplied} onChange={e => setForm(f=>({...f,dateApplied:e.target.value}))} style={{ fontSize:13 }} /></label>
              <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>Status
                <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} style={{ fontSize:13 }}>
                  {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {showInterviewDate && (
              <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>{form.status} date
                <input type="date" value={form.interviewDate||""} onChange={e => setForm(f=>({...f,interviewDate:e.target.value}))} style={{ fontSize:13 }} />
              </label>
            )}
            <label style={{ fontSize:13, color:"var(--text-primary)", display:"flex", flexDirection:"column", gap:4 }}>
              Custom follow-up date <span style={{ fontWeight:400, color:"var(--text-secondary)" }}>(overrides auto)</span>
              <input type="date" value={form.customFollowup} onChange={e => setForm(f=>({...f,customFollowup:e.target.value}))} style={{ fontSize:13 }} />
            </label>
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

        <div style={{ display:"flex", gap:8, marginTop:"1.25rem", justifyContent:"space-between", alignItems:"center" }}>
          {isEdit && <button onClick={onDelete} style={{ fontSize:13, padding:"6px 14px", background:getStatusCfg("Rejected").bg, color:getStatusCfg("Rejected").text, border:`1.5px solid ${getStatusCfg("Rejected").border}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>Delete job</button>}
          <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
            <button onClick={onClose} style={{ fontSize:13, padding:"6px 14px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Cancel</button>
            <button onClick={onSave} disabled={!form.role||!form.company} style={{ fontSize:13, padding:"6px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, cursor:"pointer", fontWeight:500 }}>Save</button>
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
  function save() { if (!date) return; onSave(date, note); onClose(); }
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", padding:"8px 10px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, marginTop:6 }}>
      <span style={{ fontSize:11, color:"var(--text-secondary)", fontWeight:500, whiteSpace:"nowrap" }}>🔔 Remind me on</span>
      <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
        style={{ fontSize:12, border:"1px solid var(--input-border)", borderRadius:5, padding:"3px 6px", background:"var(--input-bg)", color:"var(--text-primary)" }} />
      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
        style={{ fontSize:12, border:"1px solid var(--input-border)", borderRadius:5, padding:"3px 8px", flex:1, minWidth:120, background:"var(--input-bg)", color:"var(--text-primary)" }}
        onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") onClose(); }} />
      <button onClick={save} style={{ fontSize:12, padding:"3px 10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontWeight:500 }}>Set</button>
      <button onClick={onClose} style={{ fontSize:12, padding:"3px 8px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>✕</button>
    </div>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────
function ListCard({ job, onEdit, onStatusChange, onNotesSave, onAddReminder, onUpdateJob, onDuplicate, onOpenPanel, tasks }) {
  const fu = getFollowupStatus(job);
  const stale = isStale(job);
  const reminderCount = (tasks||[]).filter(t => t.jobId===job.id && !t.done).length;
  const [hovered, setHovered] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const hasTimeline = job.timeline && job.timeline.length > 0;
  const activeTags = Object.entries(job.tags || {}).filter(([,v]) => v);

  const btnStyle = (active) => { const ac = getStatusCfg("Applied"); return { fontSize:11, padding:"2px 8px", background:active?ac.bg:"var(--surface-hover)", color:active?ac.text:"var(--text-muted)", border:`1px solid ${active?ac.border:"var(--border)"}`, borderRadius:5, cursor:"pointer", whiteSpace:"nowrap" }; };

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background:fu?.urgent?(isDark()?"#2d1a1a":"#FFF8F8"):"var(--surface)", padding:"12px 16px" }}>
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
          <StatusSelect job={job} onChange={(s, d) => onStatusChange(job.id, s, d)} />
          {onUpdateJob ? <FollowupActions job={job} onUpdateJob={onUpdateJob} /> : <FollowupBadge info={fu} />}
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
          {job.interviewDate && <span style={{ color:getStatusCfg("Interview").text, fontWeight:500 }}>📅 {INTERVIEW_STATUSES.includes(job.status)?job.status:"Interview"}: {fmtDate(job.interviewDate+"T00:00:00")}</span>}
          {(job.salaryMin||job.salaryMax) && <span>{job.salaryMin?`$${parseInt(job.salaryMin).toLocaleString()}`:"?"} – {job.salaryMax?`$${parseInt(job.salaryMax).toLocaleString()}`:"?"}</span>}
          {job.contact && <span>📇 {job.contact}</span>}
          {job.link && <a href={job.link} target="_blank" rel="noreferrer" style={{ color:"var(--accent)", textDecoration:"none" }}>View posting ↗</a>}
        </div>

        {/* Row 4: Notes — inline, click to edit */}
        {notesEditing ? (
          <textarea autoFocus defaultValue={job.notes||""}
            onBlur={e => { onNotesSave(job.id, e.target.value, null); setNotesEditing(false); }}
            onKeyDown={e => { if (e.key==="Escape") setNotesEditing(false); }}
            style={{ fontSize:11, border:"1px solid var(--input-border)", borderRadius:5, padding:"5px 8px", resize:"vertical", minHeight:50, background:"var(--input-bg)", color:"var(--text-primary)", fontFamily:"inherit", width:"100%", boxSizing:"border-box" }} />
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
    if (type === "select") return <div style={cellStyle}><select ref={ref} value={draft} onChange={e => { onChange(e.target.value); setEditing(false); }} onBlur={commit} style={{ width:"100%", border:"none", background:"transparent", fontSize:13, outline:"none", cursor:"pointer" }}>{options.map(o => <option key={o} value={o}>{o||"—"}</option>)}</select></div>;
    return <div style={cellStyle}><input ref={ref} type={type==="link"?"url":type} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder={type==="link"?"https://...":undefined} style={{ width:"100%", border:"none", background:"transparent", fontSize:13, outline:"none" }} /></div>;
  }
  if (type === "select" && options === Object.keys(STATUS_CONFIG)) {
    const cfg = getStatusCfg(value || "Applied");
    return <div style={{ ...cellStyle, cursor:"pointer" }} onClick={() => setEditing(true)}><span style={{ background:cfg.bg, color:cfg.text, border:`1px solid ${cfg.border}`, borderRadius:5, padding:"2px 8px", fontSize:12, fontWeight:500, whiteSpace:"nowrap" }}>{value || "Applied"}</span></div>;
  }
  if (type === "select" && value) {
    const tagCfg = Object.values(TAG_CONFIG).find(c => c.values.includes(value));
    if (tagCfg) return <div style={{ ...cellStyle, cursor:"pointer" }} onClick={() => setEditing(true)}><span style={{ background:tagCfg.bg, color:tagCfg.text, border:`1px solid ${tagCfg.border}`, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:500, whiteSpace:"nowrap" }}>{value}</span></div>;
  }
  if (type === "link") {
    return <div style={{ ...cellStyle, gap:6 }} onClick={() => setEditing(true)}>
      {value
        ? <><a href={value} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color:"#185FA5", fontSize:12, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>View ↗</a><span style={{ fontSize:10, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:3 }}>{value}</span></>
        : <span style={{ color:"var(--text-placeholder)", fontSize:13 }}>—</span>}
    </div>;
  }
  return <div style={{ ...cellStyle, color:value?"var(--text-primary)":"var(--text-placeholder)" }} onClick={() => setEditing(true)}><span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%" }}>{value || "—"}</span></div>;
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
        {sorted.length===0 && <div style={{ padding:"2rem", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No jobs yet — click "+ Add row" below.</div>}
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
function BoardTable({ jobs, search, visibleStatuses, onDrop, onPanelOpen, dragId, onUpdateJob }) {
  const [overCol, setOverCol] = useState(null);
  const colCount = visibleStatuses.length;
  const colJobs = visibleStatuses.map(s => jobs.filter(j => j.status===s && (!search||`${j.role} ${j.company}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b) => (b.dateApplied||"").localeCompare(a.dateApplied||"")));
  const maxRows = Math.max(...colJobs.map(c => c.length), 1);
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
              const activeTags = Object.entries(job?.tags || {}).filter(([,v]) => v);
              return (
                <div key={s} style={{ borderRight:colIdx<colCount-1?"1px solid var(--border)":"none", padding:"8px 10px", minHeight:56, background:"var(--surface)" }}>
                  {job && (
                    <div draggable onDragStart={e => { e.dataTransfer.effectAllowed="move"; dragId.current=job.id; }} onDragEnd={() => setOverCol(null)} style={{ cursor:"grab", userSelect:"none", paddingBottom:8, borderBottom:"1px solid var(--border)" }}>
                      <div style={{ fontSize:12, color:"var(--text-primary)", fontWeight:700, marginBottom:2 }}>{job.company}</div>
                      <div onClick={() => onPanelOpen(job)} style={{ fontWeight:500, fontSize:13, color:"var(--accent)", marginBottom:2, cursor:"pointer" }}>{job.role}</div>
                      {activeTags.length > 0 && <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:4 }}>{activeTags.map(([cat,val]) => <TagBadge key={cat} category={cat} value={val} />)}</div>}
                      {job.interviewDate && <div style={{ fontSize:10, color:getStatusCfg("Interview").text, marginBottom:3, fontWeight:500 }}>📅 {fmtDate(job.interviewDate+"T00:00:00")}</div>}
                      {getFollowupStatus(job) && <div style={{ marginBottom:4 }}>{onUpdateJob ? <FollowupActions job={job} onUpdateJob={onUpdateJob} /> : <FollowupBadge info={getFollowupStatus(job)} />}</div>}
                      {isStale(job) && !getFollowupStatus(job) && <div style={{ marginBottom:4 }}><StaleBadge /></div>}
                      {(() => {
                        const act = lastActivity(job);
                        if (!act) return job.dateApplied ? <div style={{ fontSize:11, color:"var(--text-muted)" }}>Applied {daysAgoStr(job.dateApplied)}</div> : null;
                        if (act.isInitialApply) return (
                          <div style={{ fontSize:11, color:"var(--text-muted)", fontStyle:"italic" }}>Applied {daysAgoStr(job.dateApplied)} — no further activity</div>
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
                  title={`${job.company} · ${job.role} — click to open`}>
                  <span style={{ fontWeight:700 }}>{job.company}</span> <span style={{ color:isHovered?"var(--accent)":"var(--text-muted)", fontWeight:400 }}>· {job.role}</span>
                </div>
                {/* Bar track */}
                <div style={{ flex:1, position:"relative", height:10, background:"var(--surface-hover)", borderRadius:5 }}>
                  {/* Range bar */}
                  {job.min && job.max && (
                    <div style={{ position:"absolute", top:0, bottom:0, left:`${barLeft}%`, right:`${barRight}%`, background:isHovered?cfg.border:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:5, transition:"background 0.1s" }} />
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
function TodayTab({ jobs, tasks, setTasks, onOpenPanel, onUpdateJob }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text:"", jobId:"", dueDate:todayStr() });
  const today = todayStr();

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
    const key = d => d===0 ? 0 : d<0 ? -d : 1000+d;
    return key(a.diff) - key(b.diff);
  });

  function snooze(job, days) { onUpdateJob(job.id, { customFollowup: dateInNDays(days) }); }
  function logOutreach(job) {
    const now = new Date().toISOString();
    const resetDays = FOLLOWUP_DAYS[job.status] || 7;
    onUpdateJob(job.id, {
      customFollowup: dateInNDays(resetDays),
      timeline: [...(job.timeline||[]), { id:crypto.randomUUID(), status:job.status, date:now, notes:"Follow-up sent" }],
    });
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
            <button onClick={() => logOutreach(job)} style={{ fontSize:11, padding:"4px 9px", background:getStatusCfg("Offer").bg, color:getStatusCfg("Offer").text, border:`1px solid ${getStatusCfg("Offer").border}`, borderRadius:6, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>✓ Contacted</button>
            <div style={{ display:"flex", gap:3 }}>
              <button onClick={() => snooze(job,3)} title="Remind me in 3 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>+3d</button>
              <button onClick={() => snooze(job,7)} title="Remind me in 7 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-secondary)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>+7d</button>
              <button onClick={() => snooze(job, 30)} title="Snooze 30 days" style={{ fontSize:10, padding:"3px 7px", background:"var(--surface-hover)", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, cursor:"pointer" }}>−30d</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function TaskCard({ task }) {
    const linkedJob = jobs.find(j => j.id===task.jobId);
    return (
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, marginBottom:6 }}>
        <input type="checkbox" checked={task.done||false} onChange={() => { const u=tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t); setTasks(u); saveTasks(u); }} style={{ marginTop:2, cursor:"pointer" }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, color:"var(--text-primary)" }}>{task.text}</div>
          {linkedJob && <div style={{ fontSize:11, color:"#185FA5", marginTop:2, cursor:"pointer" }} onClick={() => onOpenPanel(linkedJob)}>→ {linkedJob.company} · {linkedJob.role}</div>}
          {task.dueDate && <div style={{ fontSize:10, color: task.dueDate<today?"#A32D2D":"var(--text-muted)", marginTop:2 }}>{task.dueDate===today?"Due today":`Overdue · ${task.dueDate}`}</div>}
        </div>
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
    setNewTask({ text:"", jobId:"", dueDate:todayStr() }); setShowAdd(false);
  }

  const manualOverdue = tasks.filter(t => !t.done && t.dueDate < today);
  const manualToday   = tasks.filter(t => !t.done && t.dueDate === today);
  const staleJobs     = jobs.filter(j => !j.archived && isStale(j) && !getFollowupStatus(j));
  const totalPending  = autoTasks.length + manualOverdue.length + manualToday.length + staleJobs.length;

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
        </div>
        <button onClick={() => setShowAdd(o=>!o)} style={{ fontSize:13, padding:"6px 14px", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer" }}>+ Add task</button>
      </div>

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
          Nothing needs attention right now — check the Calendar for upcoming events.
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
      <Section title="No recent activity" color="var(--text-muted)" count={staleJobs.length}>
        {staleJobs.map(job => (
          <div key={job.id} onClick={() => onOpenPanel(job)}
            style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderLeft:`3px solid ${getStatusCfg(job.status).border}`, borderRadius:8, marginBottom:6, cursor:"pointer" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.company} · {job.role}</div>
              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>
                <span style={{ ...(() => { const c=getStatusCfg(job.status); return { background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:500 }; })() }}>{job.status}</span>
                <span style={{ marginLeft:6 }}>· last updated {timeAgo(job.updatedAt||job.createdAt)}</span>
              </div>
            </div>
            <span style={{ fontSize:11, color:"var(--text-muted)", flexShrink:0 }}>›</span>
          </div>
        ))}
      </Section>
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
    { icon:"📝", title:"Add a job", desc:"Paste in any role you've applied to or are interested in." },
    { icon:"📊", title:"Track your pipeline", desc:"Move jobs through stages as you hear back." },
    { icon:"🔔", title:"Never miss a follow-up", desc:"The app reminds you when it's time to follow up." },
  ];
  return (
    <div style={{ maxWidth:580, margin:"2rem auto", padding:"2rem", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>👋</div>
        <div style={{ fontSize:18, fontWeight:700, color:"var(--text-primary)", marginBottom:6 }}>Welcome to Job Tracker</div>
        <div style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.5 }}>Your personal hub for managing every application, follow-up, and interview in one place.</div>
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

// ── Account settings modal ────────────────────────────────────────────────────
function SettingsModal({ user, onClose }) {
  const [tab, setTab] = useState("password");
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [conf, setConf] = useState("");
  const [error, setError] = useState(""); const [msg, setMsg] = useState(""); const [loading, setLoading] = useState(false);

  async function changePassword(e) {
    e.preventDefault(); setError(""); setMsg("");
    if (pw !== conf) { setError("Passwords don't match"); return; }
    if (pw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    // Re-authenticate first
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: cur });
    if (signInErr) { setError("Current password is incorrect"); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setError(error.message); } else { setMsg("Password updated successfully."); setCur(""); setPw(""); setConf(""); }
    setLoading(false);
  }

  const inputStyle = { fontSize:13, padding:"8px 10px", border:"1px solid var(--input-border)", borderRadius:7, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:420, background:"var(--surface)", borderRadius:12, border:"1px solid var(--border)", boxShadow:"0 4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:15, fontWeight:600, color:"var(--text-primary)" }}>Account settings</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", color:"var(--text-muted)" }}>✕</button>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16 }}>Signed in as <span style={{ fontWeight:500, color:"var(--text-primary)" }}>{user.email}</span></div>
          <div style={{ fontSize:13, fontWeight:600, color:"var(--text-secondary)", marginBottom:12 }}>Change password</div>
          <form onSubmit={changePassword} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input type="password" placeholder="Current password" value={cur} onChange={e=>setCur(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="New password" value={pw} onChange={e=>setPw(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Confirm new password" value={conf} onChange={e=>setConf(e.target.value)} required style={inputStyle} />
            {error && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
            {msg && <div style={{ fontSize:12, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:6, padding:"8px 10px" }}>{msg}</div>}
            <button type="submit" disabled={loading} style={{ fontSize:13, padding:"9px", background:"#185FA5", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontWeight:600, opacity:loading?0.7:1 }}>
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
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
      {action && <button onClick={onAction} style={{ marginTop:16, fontSize:13, padding:"8px 20px", background:"#185FA5", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontWeight:500 }}>{action}</button>}
    </div>
  );
}

// ── Interview calendar view ────────────────────────────────────────────────────
const CAL_TYPES = {
  interview: { label:"Interviews", icon:"🗓️", bg:"#185FA5",          text:"#fff",                    border:"#0C447C" },
  followup:  { label:"Follow-ups", icon:"🔔", bg:"#FAEEDA",          text:"#633806",                 border:"#FAC775" },
  task:      { label:"Reminders",  icon:"🔔", bg:"#EAF3DE",          text:"#27500A",                 border:"#C0DD97" },
  timeline:  { label:"Timeline",   icon:"📋", bg:"var(--surface-hover)", text:"var(--text-secondary)", border:"var(--border)" },
};
const CAL_TYPES_DARK = {
  interview: { label:"Interviews", icon:"🗓️", bg:"#1a3550", text:"#7BB8F0", border:"#2d5580" },
  followup:  { label:"Follow-ups", icon:"🔔", bg:"#3d2b10", text:"#FAC775", border:"#5c4020" },
  task:      { label:"Reminders",  icon:"🔔", bg:"#1a3010", text:"#90C855", border:"#2a5020" },
  timeline:  { label:"Timeline",   icon:"📋", bg:"var(--surface-hover)", text:"var(--text-secondary)", border:"var(--border)" },
};
const getCalCfg = (type) => ((isDark() ? CAL_TYPES_DARK : CAL_TYPES)[type] || {});

function CalendarView({ jobs, tasks, onOpenPanel }) {
  const [calView, setCalView] = useState("month"); // "month" | "week" | "day" | "agenda"
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  // Mini-month sidebar has its own browsable month independent of anchor
  const [miniMonth, setMiniMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [show, setShow] = useState({ interview:true, followup:true, task:true, timeline:true });
  const toggleType = (t) => setShow(s => ({ ...s, [t]: !s[t] }));
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        const key = e.date.slice(0,10);
        if (e.status==="Interview" && key===j.interviewDate) return;
        const label = e.type==="manual" ? (e.label||"Note") : e.status;
        addEv(e.date, { type:"timeline", label:j.company, sub:label, job:j });
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
    const cfg = getCalCfg(ev.type);
    return (
      <div
        title={`${cfg.label}: ${ev.label}${ev.sub ? ` — ${ev.sub}` : ""}`}
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
            style={{ fontSize:12, padding:"2px 7px", border:"1px solid var(--border)", borderRadius:5, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", lineHeight:1.4 }}>‹</button>
          <span style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)" }}>{monthNames[m].slice(0,3)} {y}</span>
          <button onClick={() => setMiniMonth(({y,m}) => m===11?{y:y+1,m:0}:{y,m:m+1})}
            style={{ fontSize:12, padding:"2px 7px", border:"1px solid var(--border)", borderRadius:5, background:"var(--surface)", color:"var(--text-secondary)", cursor:"pointer", lineHeight:1.4 }}>›</button>
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
              <div key={d} style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textAlign:"center", padding:"7px 0", background:"var(--surface-subtle)", borderBottom:"1px solid var(--border)" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ background:"var(--surface-subtle)", minHeight:78 }} />;
              const dateKey = `${monthPrefix}-${String(day).padStart(2,"0")}`;
              const evs = byDate[dateKey] || [];
              const isToday = dateKey === today_;
              return (
                <div key={dateKey}
                  onClick={() => { const d=new Date(anchor); d.setFullYear(y,m,day); setAnchor(d); setCalView("day"); }}
                  style={{ minHeight:78, padding:"5px 6px", background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface)", cursor:"pointer" }}>
                  <div style={{ fontSize:11, fontWeight:isToday?700:400, color:isToday?"var(--accent)":"var(--text-muted)", marginBottom:3 }}>{day}</div>
                  {evs.slice(0,MAX).map((ev,ei) => <EventPill key={ei} ev={ev} compact />)}
                  {evs.length > MAX && <div style={{ fontSize:9, color:"var(--text-muted)", paddingLeft:2 }}>+{evs.length-MAX} more</div>}
                </div>
              );
            })}
          </div>
        </div>
        {!hasEvents && <EmptyState icon="📅" title="Nothing this month" desc="No events found — try toggling event types above or navigate to another month." />}
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
                style={{ background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface-subtle)", padding:"7px 8px", cursor:"pointer", textAlign:"center", borderBottom:"1px solid var(--border)" }}>
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
              <div key={dateKey} style={{ padding:"6px", background:isToday?(isDark()?"#1a3550":"#EFF5FB"):"var(--surface)", minHeight:120 }}>
                {evs.length === 0 && <div style={{ fontSize:10, color:"var(--text-muted)", fontStyle:"italic", textAlign:"center", paddingTop:6 }}>—</div>}
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
          ? <EmptyState icon="📅" title="Nothing scheduled" desc="No events on this day — try toggling event types or pick another day." />
          : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {evs.map((ev, i) => {
                const cfg = getCalCfg(ev.type);
                const scfg = ev.job ? getStatusCfg(ev.job.status) : null;
                return (
                  <div key={i} onClick={() => ev.job && onOpenPanel(ev.job)}
                    style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderLeft:`4px solid ${cfg.border}`, borderRadius:8, cursor:ev.job?"pointer":"default" }}>
                    <span style={{ fontSize:18, flexShrink:0, marginTop:2 }}>{cfg.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:cfg.text, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{cfg.label}</div>
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
      return <EmptyState icon="📅" title="No upcoming events" desc="Nothing scheduled ahead — try toggling event types above." />;

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
                    const cfg = getCalCfg(ev.type);
                    const scfg = ev.job ? getStatusCfg(ev.job.status) : null;
                    return (
                      <div key={ei} onClick={() => ev.job && onOpenPanel(ev.job)}
                        style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 12px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderLeft:`3px solid ${cfg.border}`, borderRadius:7, cursor:ev.job?"pointer":"default" }}
                        onMouseEnter={e => { if(ev.job) e.currentTarget.style.filter="brightness(0.96)"; }}
                        onMouseLeave={e => { e.currentTarget.style.filter="none"; }}>
                        <span style={{ fontSize:15, flexShrink:0 }}>{cfg.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:cfg.text, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{cfg.label}</div>
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
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
      {/* ── Left sidebar: mini month + toggles ── */}
      <div style={{ flexShrink:0, width: sidebarOpen ? 204 : 36, transition:"width 0.18s ease" }}>
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
          <div style={{ fontSize:22, fontWeight:700, background:"linear-gradient(90deg,#185FA5,#3C3489)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:6 }}>Job Tracker</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Set a new password</div>
        </div>
        {done ? (
          <div style={{ fontSize:13, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
            ✓ Password updated — signing you in…
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
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

  async function submit(e) {
    e.preventDefault();
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email for a confirmation link.");
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

  const inputStyle = { fontSize:14, padding:"9px 12px", border:"1px solid var(--input-border)", borderRadius:8, background:"var(--input-bg)", color:"var(--text-primary)", width:"100%", boxSizing:"border-box" };
  const subtitles = { signin:"Sign in to your account", signup:"Create a new account", forgot:"Reset your password" };
  const btnLabels = { signin:"Sign in", signup:"Create account", forgot:"Send reset email" };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--page-bg)", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:380, background:"var(--surface)", borderRadius:14, border:"1px solid var(--border)", padding:"2rem", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ fontSize:22, fontWeight:700, background:"linear-gradient(90deg,#185FA5,#3C3489)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:6 }}>Job Tracker</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>{subtitles[mode]}</div>
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          {mode !== "forgot" && <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />}
          {error && <div style={{ fontSize:12, color:"#A32D2D", background:"#FFF0F0", border:"1px solid #F7C1C1", borderRadius:6, padding:"8px 10px" }}>{error}</div>}
          {message && <div style={{ fontSize:12, color:"#27500A", background:"#EAF3DE", border:"1px solid #C0DD97", borderRadius:6, padding:"8px 10px" }}>{message}</div>}
          <button type="submit" disabled={loading}
            style={{ fontSize:14, padding:"10px", background:"#185FA5", color:"#fff", border:"none", borderRadius:8, cursor:loading?"default":"pointer", fontWeight:600, marginTop:4, opacity:loading?0.7:1 }}>
            {loading ? "Please wait…" : btnLabels[mode]}
          </button>
        </form>
        <div style={{ textAlign:"center", marginTop:"1.25rem", fontSize:13, color:"var(--text-muted)", display:"flex", flexDirection:"column", gap:6 }}>
          {mode === "signin" && <>
            <span>No account? <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:500, padding:0, fontSize:13 }}>Sign up</button></span>
            <button onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", padding:0, fontSize:12 }}>Forgot password?</button>
          </>}
          {mode === "signup" && <span>Have an account? <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:500, padding:0, fontSize:13 }}>Sign in</button></span>}
          {mode === "forgot" && <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ background:"none", border:"none", color:"#185FA5", cursor:"pointer", fontWeight:500, padding:0, fontSize:13 }}>← Back to sign in</button>}
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
  const [loaded, setLoaded] = useState(false);
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
  const [view, setView] = useState("list");
  const [hiddenCols, setHiddenCols] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dark_mode") === "true");
  _isDark = darkMode; // keep module-level flag current for getStatusCfg/getTagColors/getCalCfg
  const [panelJob, setPanelJob] = useState(null);
  const togglePanel = (job) => setPanelJob(p => p?.id === job?.id ? null : job);
  const [undoStack, setUndoStack] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const menuRef = useRef(null);
  const dragId = useRef(null);

  // ── Auth + data loading ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u); _uid = u?.id ?? null;
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setPasswordRecovery(true); return; }
      const u = session?.user ?? null;
      setUser(u); _uid = u?.id ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setJobs([]); setTasks([]); setLoaded(false); return; }
    loadUserData().then(({ jobs: j, tasks: t }) => {
      setJobs(j); setTasks(t); setLoaded(true);
    });
  }, [user]);
  useEffect(() => {
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("dark_mode", darkMode);
  }, [darkMode]);
  useEffect(() => {
    function h(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (panelJob) { const u = jobs.find(j => j.id===panelJob.id); if (u) setPanelJob(u); }
  }, [jobs]);

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
      fireNotification("Job Tracker — follow-up needed", `${j.company} · ${j.role}`);
    } else {
      const preview = overdue.slice(0, 2).map(j => j.company).join(", ");
      const more = overdue.length > 2 ? ` + ${overdue.length - 2} more` : "";
      fireNotification(`Job Tracker — ${overdue.length} follow-ups needed`, `${preview}${more}`);
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

  function onStatusChange(id, newStatus, interviewDate) {
    const job = jobs.find(j => j.id===id);
    pushUndo(`Status changed: "${job?.company} · ${job?.role}" → ${newStatus}`, jobs);
    const u = applyStatusChange(jobs, id, newStatus, interviewDate); setJobs(u); saveJobs(u);
  }

  function addReminder(jobId, date, note) {
    const job = jobs.find(j => j.id===jobId);
    const text = (note||"").trim() || `Follow up with ${job?.company||""}`;
    const t = { id: Date.now(), text, jobId, dueDate: date, done: false, createdAt: new Date().toISOString() };
    const u = [...tasks, t]; setTasks(u); saveTasks(u);
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
    const data = JSON.stringify({ jobs, tasks, exportedAt: new Date().toISOString() }, null, 2);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type:"application/json"})); a.download = `job-tracker-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  }

  function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!Array.isArray(parsed.jobs)) { alert("Invalid backup file."); return; }
        if (!window.confirm(`This will replace all current data with ${parsed.jobs.length} jobs from the backup. Continue?`)) return;
        setJobs(parsed.jobs); saveJobs(parsed.jobs);
        if (parsed.tasks) { setTasks(parsed.tasks); saveTasks(parsed.tasks); }
        e.target.value = "";
        pushUndo("Restored from JSON backup", jobs);
      } catch { alert("Could not read backup file — make sure it's a valid JSON backup from this app."); }
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
      return sortDir==="asc" ? cmp : -cmp;
    });

  const counts = Object.fromEntries(Object.keys(STATUS_CONFIG).map(s=>[s,jobs.filter(j=>j.status===s&&!j.archived).length]));
  const todayTasks = tasks.filter(t=>!t.done&&t.dueDate<=todayStr()).length + jobs.filter(j=>!j.archived&&j.interviewDate===todayStr()).length + jobs.filter(j=>{ const fu=getFollowupStatus(j); return fu?.urgent && fu.diff >= -30; }).length;

  if (!authChecked) return <div style={{ padding:"2rem", color:"var(--text-muted)", fontSize:14 }}>Loading…</div>;
  if (passwordRecovery) return <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />;
  if (!user) return <AuthScreen />;
  if (!loaded) return <div style={{ padding:"2rem", color:"var(--text-muted)", fontSize:14 }}>Loading your data…</div>;

  return (
    <div style={{ padding:"1rem", fontFamily:"system-ui, sans-serif", paddingRight:!isMobile&&panelJob?"356px":"1rem", transition:"padding-right 0.25s", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:"1.25rem", padding:"14px 20px", background:"linear-gradient(90deg,#185FA5 0%,#3C3489 100%)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h2 style={{ fontSize:20, fontWeight:500, color:"#fff", margin:0 }}>Job Tracker</h2>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span className="header-hint" style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>N = new · / = search · Esc = close</span>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>{user.email}</span>
          <button onClick={() => setDarkMode(d => !d)} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            style={{ fontSize:15, lineHeight:1, padding:"4px 8px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer" }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize:11, padding:"3px 10px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, cursor:"pointer" }}>Sign out</button>
        </div>
      </div>

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

      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:"0.75rem", alignItems:"center", flexWrap: isMobile ? "wrap" : "nowrap" }}>
        {/* Left side — view-specific controls */}
        <div style={{ display:"flex", gap:8, flex:1, alignItems:"center", minWidth:0, width: isMobile ? "100%" : "auto" }}>
          {(view==="list"||view==="board") && <input placeholder="Search role or company..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:"1 1 160px", minWidth:0, fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"6px 10px" }} />}
          {view==="list" && (() => {
            const activeFilterCount = (filter!=="All"?1:0) + (outreachFilter!=="all"?1:0) + (sortBy!=="dateApplied"||sortDir!=="desc"?1:0) + activeTagFilters.length;
            const filterOpen = listFilterOpen; const setFilterOpen = setListFilterOpen;
            return (
              <div style={{ position:"relative", flexShrink:0 }}>
                <button onClick={() => setFilterOpen(o=>!o)}
                  style={{ fontSize:13, padding:"6px 10px", border:`1px solid ${activeFilterCount>0?"#185FA5":"var(--input-border)"}`, borderRadius:6, background:activeFilterCount>0?"#E6F1FB":"var(--surface)", color:activeFilterCount>0?"#185FA5":"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontWeight:500, whiteSpace:"nowrap" }}>
                  ⊞ Filters
                  {activeFilterCount > 0 && <span style={{ background:"#185FA5", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{activeFilterCount}</span>}
                </button>
                {filterOpen && (
                  <>
                    <div onClick={() => setFilterOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }} />
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:100, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"14px 16px", minWidth:240, display:"flex", flexDirection:"column", gap:12 }}>
                      {/* Sort */}
                      <div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:6 }}>SORT BY</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <select value={sortBy} onChange={e=>{ setSortBy(e.target.value); setSortDir("desc"); }} style={{ fontSize:13, border:"1px solid var(--input-border)", borderRadius:6, padding:"5px 8px", flex:1, background:"var(--surface)", color:"var(--text-primary)" }}>
                            <option value="dateApplied">Date applied</option>
                            <option value="company">Company</option>
                            <option value="status">Status</option>
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
                  ⊞ Filters
                  {boardActiveCount > 0 && <span style={{ background:"#185FA5", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{boardActiveCount}</span>}
                </button>
                {boardFilterOpen && (
                  <>
                    <div onClick={() => setBoardFilterOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }} />
                    <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:100, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", padding:"14px 16px", minWidth:240, display:"flex", flexDirection:"column", gap:12 }}>
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
        {/* Right side — always fixed */}
        <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
          <div className="view-switcher" style={{ flexShrink:1, minWidth:0, paddingTop:8, marginTop:-8 }}>
            <div style={{ display:"flex", border:"1.5px solid #B5D4F4", borderRadius:6, overflow:"visible" }}>
              {[["list","List"],["board","Pipeline"],["sheet","Table"],["calendar","Calendar"],["today","Today"]].map(([v,label],i,arr) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ fontSize:12, padding:"5px 12px", cursor:"pointer", fontWeight:500, border:"none",
                    background:view===v?"#185FA5":"var(--surface)", color:view===v?"#fff":"#185FA5",
                    borderRight:i<arr.length-1?"1px solid #B5D4F4":"none", position:"relative",
                    borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":0, whiteSpace:"nowrap" }}>
                  {label}
                  {v==="today"&&todayTasks>0&&<span style={{ position:"absolute", top:-6, right:-6, background:"#A32D2D", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, zIndex:10 }}>{todayTasks}</span>}
                </button>
              ))}
            </div>
          </div>
          {archivedCount > 0 && (
            <button onClick={() => { setShowArchived(a => !a); setSelected(new Set()); }} style={{ fontSize:12, padding:"5px 12px", whiteSpace:"nowrap", background:showArchived?"#633806":"var(--surface)", color:showArchived?"#fff":"var(--text-secondary)", border:`1.5px solid ${showArchived?"#FAC775":"var(--border)"}`, borderRadius:6, cursor:"pointer", fontWeight:500 }}>
              📦 {showArchived ? "← Active jobs" : `Archived (${archivedCount})`}
            </button>
          )}
          {!showArchived && <button onClick={openAdd} style={{ fontSize:13, padding:"6px 14px", whiteSpace:"nowrap", background:"#185FA5", color:"#fff", border:"1.5px solid #0C447C", borderRadius:6, fontWeight:500, cursor:"pointer" }}>+ Add job</button>}
          <div style={{ position:"relative" }} ref={menuRef}>
            <button onClick={() => setMenuOpen(o=>!o)} style={{ fontSize:13, padding:"6px 12px", background:"var(--surface)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:6, cursor:"pointer", display:"flex", flexDirection:"column", gap:3, alignItems:"center", justifyContent:"center", height:34 }}>
              <span style={{ display:"block", width:16, height:1.5, background:"var(--text-secondary)", borderRadius:2 }} />
              <span style={{ display:"block", width:16, height:1.5, background:"var(--text-secondary)", borderRadius:2 }} />
              <span style={{ display:"block", width:16, height:1.5, background:"var(--text-secondary)", borderRadius:2 }} />
            </button>
            {menuOpen && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", zIndex:50, minWidth:180, overflow:"hidden" }}>
                <button onClick={() => { setShowSettings(true); setMenuOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", fontSize:13, padding:"9px 14px", background:"none", border:"none", borderBottom:"0.5px solid var(--border-subtle)", cursor:"pointer", color:"var(--text-primary)" }}>⚙️ Account settings</button>
                <button onClick={() => { exportJSON(); setMenuOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", fontSize:13, padding:"9px 14px", background:"none", border:"none", borderBottom:"0.5px solid var(--border-subtle)", cursor:"pointer", color:"var(--text-primary)" }}>💾 Export backup (JSON)</button>
                <label style={{ display:"block", fontSize:13, padding:"9px 14px", cursor:"pointer", color:"var(--text-primary)", borderBottom:"0.5px solid var(--border-subtle)" }}>📂 Restore backup (JSON)<input type="file" accept=".json" onChange={e=>{importJSON(e);setMenuOpen(false);}} style={{ display:"none" }} /></label>
                <button onClick={() => { exportCSV(); setMenuOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", fontSize:13, padding:"9px 14px", background:"none", border:"none", borderBottom:"0.5px solid var(--border-subtle)", cursor:"pointer", color:"var(--text-secondary)" }}>Export CSV</button>
                <label style={{ display:"block", fontSize:13, padding:"9px 14px", cursor:"pointer", color:"var(--text-secondary)", borderBottom:"0.5px solid var(--border-subtle)" }}>Import CSV<input type="file" accept=".csv" onChange={e=>{importCSV(e);setMenuOpen(false);}} style={{ display:"none" }} /></label>
                <button onClick={enableNotifications} style={{ display:"block", width:"100%", textAlign:"left", fontSize:13, padding:"9px 14px", background:"none", border:"none", borderBottom:"0.5px solid var(--border-subtle)", cursor:"pointer", color: typeof Notification !== "undefined" && Notification.permission==="granted" ? "#27500A" : "var(--text-secondary)" }}>
                  {typeof Notification !== "undefined" && Notification.permission==="granted" ? "🔔 Reminders on" : "🔔 Enable reminders"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                ? <OnboardingCard onAdd={openAdd} onLoadSample={() => { const s=makeSampleJobs(); setJobs(s); saveJobs(s); }} />
                : <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--text-muted)", fontSize:14 }}>{showArchived?"No archived jobs.":"No results for this filter."}</div>}
            </div>
          : <div>
              {showArchived && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--surface-subtle)", border:"1px solid var(--border)", borderRadius:8, marginBottom:10 }}>
                  <span style={{ fontSize:13, color:"var(--text-secondary)" }}>📦 Showing {filtered.length} archived job{filtered.length!==1?"s":""} — these are hidden from active views.</span>
                </div>
              )}
              {/* Floating bulk-action bar — fixed to bottom of viewport */}
              {selected.size > 0 && (
                <div className="bulk-action-bar" style={{
                  position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
                  display:"flex", gap:8, alignItems:"center",
                  padding:"11px 18px",
                  background:"#185FA5",
                  borderRadius:14,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
                  zIndex:600,
                  flexWrap:"nowrap",
                  whiteSpace:"nowrap",
                  backdropFilter:"blur(4px)",
                }}>
                  <span style={{ fontSize:13, color:"#fff", fontWeight:600, marginRight:4 }}>
                    {selected.size} selected
                  </span>
                  <div style={{ width:1, height:18, background:"rgba(255,255,255,0.3)", margin:"0 4px" }} />
                  <select defaultValue="" onChange={e => { bulkStatus(e.target.value); e.target.value=""; }} style={{ fontSize:12, borderRadius:6, padding:"5px 8px", border:"none", cursor:"pointer", background:"rgba(255,255,255,0.15)", color:"#fff" }}>
                    <option value="" disabled style={{ color:"#000" }}>Change status…</option>
                    {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s} style={{ color:"#000" }}>{s}</option>)}
                  </select>
                  {!showArchived && (
                    <button onClick={bulkArchive} style={{ fontSize:12, padding:"5px 13px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                      📦 Archive
                    </button>
                  )}
                  {showArchived && (
                    <button onClick={() => { selected.forEach(id => restoreJob(id)); clearSelect(); }} style={{ fontSize:12, padding:"5px 13px", background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                      ↩ Restore
                    </button>
                  )}
                  <button onClick={bulkDelete} style={{ fontSize:12, padding:"5px 13px", background:"#FCEBEB", color:"#791F1F", border:"1.5px solid #F09595", borderRadius:8, cursor:"pointer", fontWeight:500 }}>
                    🗑 Delete
                  </button>
                  <div style={{ width:1, height:18, background:"rgba(255,255,255,0.3)", margin:"0 4px" }} />
                  <button onClick={clearSelect} style={{ fontSize:12, padding:"5px 11px", background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, cursor:"pointer" }}>
                    ✕
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
                      <ListCard job={job} onEdit={openEdit} onStatusChange={onStatusChange} onNotesSave={onNotesSave} onAddReminder={addReminder} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} onDuplicate={duplicateJob} onOpenPanel={togglePanel} tasks={tasks} />
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
          <BoardTable jobs={(activeTagFilters.length>0 ? jobs.filter(j=>activeTagFilters.every(([cat,val])=>(j.tags||{})[cat]===val)) : jobs).filter(j=>!j.archived)} visibleStatuses={Object.keys(STATUS_CONFIG).filter(s=>!hiddenCols[s])} search={search} onDrop={onDrop} onPanelOpen={togglePanel} dragId={dragId} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} />
        </div>)}

      {/* Sheet view */}
      {view==="sheet" && (jobs.filter(j=>!j.archived).length===0
        ? <EmptyState icon="📊" title="No jobs to display" desc="Add your first job from the List view and it will appear here in the spreadsheet." />
        : <SpreadsheetView jobs={jobs} setJobs={setJobs} onStatusChange={onStatusChange} onNotesSave={onNotesSave} />)}

      {/* Calendar view */}
      {view==="calendar" && <CalendarView jobs={jobs} tasks={tasks} onOpenPanel={togglePanel} />}

      {/* Today view */}
      {view==="today" && <TodayTab jobs={jobs} tasks={tasks} setTasks={setTasks} onOpenPanel={togglePanel} onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); }} />}

      {modal && <Modal form={form} setForm={setForm} onSave={save} onClose={() => setModal(false)} onDelete={() => { del(form.id); setModal(false); }} isEdit={!!jobs.find(j=>j.id===form.id)} />}
      {panelJob && <DetailPanel job={panelJob} onClose={() => setPanelJob(null)}
        onSave={updated => {
          const now = new Date().toISOString();
          const enriched = { ...updated, updatedAt: now };
          const u = jobs.map(j => j.id === enriched.id ? enriched : j);
          setJobs(u); saveJobs(u); setPanelJob(enriched);
        }}
        onDelete={del} onArchive={archiveJob} onRestore={restoreJob} onNotesSave={onNotesSave} onStatusChange={onStatusChange} tasks={tasks} onAddReminder={addReminder}
        onTaskDone={id => { const u=tasks.map(t=>t.id===id?{...t,done:true}:t); setTasks(u); saveTasks(u); }}
        onTaskDelete={id => { const u=tasks.filter(t=>t.id!==id); setTasks(u); saveTasks(u); }}
        onUpdateJob={(id,patch) => { const now=new Date().toISOString(); const u=jobs.map(j=>j.id===id?{...j,...patch,updatedAt:now}:j); setJobs(u); saveJobs(u); setPanelJob(u.find(j=>j.id===id)||null); }} />}
      {showSettings && <SettingsModal user={user} onClose={() => setShowSettings(false)} />}
      {undoStack && <UndoToast message={undoStack.message} onUndo={undo} onDismiss={() => setUndoStack(null)} />}
    </div>
  );
}

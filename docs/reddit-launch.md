# Followup — Reddit launch kit (M1)

Written 2026-07-12. This is the durable copy of the M1 launch posts (the June drafts
lived only in a chat session and were lost — this file is the fix).

Link to use everywhere: **https://job-tracker-tau-eight.vercel.app/landing.html**

## Ground rules (read before posting)

- **Re-read each sub's rules the day you post — this is not optional.** Tried to verify
  the target-subs table below via an AI session on 2026-07-16; reddit.com is unreachable
  from that environment and no third-party mirror had current rules for the job-search
  subs. So every row below is **unverified as of 2026-07-16** — the "Notes" column
  reflects the original June 2026 read, not a current check. Self-promo policies change;
  some subs have a "Saturday self-promo thread" that's the only legal slot.
- **Stagger posts 2–4 days apart.** Same-day cross-posting of near-identical text gets
  flagged by mods and by Reddit's spam filter.
- **Don't paste the same body twice.** Vary the opening and title per sub (variants below).
- **Post Tue–Thu, morning US time** for best visibility.
- **Sit on the thread for 48 hours.** Answer every comment, take feature requests
  graciously, never argue. The comments ARE the marketing.
- **Always disclose you built it.** "I built this" framing is required by most subs and
  reads more honest anyway.
- **Attribution:** PostHog captures `$initial_referring_domain` on signup, so
  reddit.com cohorts will be visible. Note the date+sub of each post here so cohorts
  can be matched to subs later.

## Target subs

| Sub | Angle | Notes |
|---|---|---|
| r/SideProject | Variant A (builder story) | Self-promo is the point of the sub |
| r/alphaandbetausers | Variant A, tweaked ask ("looking for early users/feedback") | Tester-friendly |
| r/jobsearchhacks | Variant B (value-first) | Tools OK if genuinely useful; don't lead with the link |
| r/GetEmployed | Variant B | Smaller, tolerant |
| r/jobsearch / r/careerguidance | Variant B, extra caution | Value post; link low in the body |
| ~~r/jobs~~, ~~r/cscareerquestions~~ | — | **Skip: self-promo banned** (June guidance, still true) |

---

## Variant A — maker subs (r/SideProject, r/alphaandbetausers)

**Title options (pick one):**
1. I built a free job tracker that nags you to follow up, because 57% of candidates never do
2. My job search was dying in a spreadsheet, so I built a tracker that tells me what to do each day
3. Built a free tool that turns your job applications into a daily to-do list (and drafts your follow-up emails)

**Body:**

> During my own job search I noticed the problem wasn't tracking applications, it was
> that they'd quietly die. I'd apply, hear nothing, forget to follow up, and the
> application would just… expire. Turns out 57% of candidates never send a follow-up,
> while most hiring managers say follow-ups actually influence their decision.
>
> So I built **Followup**, a free job tracker whose whole point is the follow-through:
>
> - **A "Today" inbox:** open it and see exactly what needs you: follow-ups due,
>   interviews today, applications going cold. No hunting through a board.
> - **It drafts the follow-up email for you:** pulls in the role, company, and contact;
>   you tweak, copy, send, and it logs it.
> - **Opinionated timing:** nudges you 7 days after applying, 3 days after an
>   interview (you can change it), and flags anything going stale.
> - The usual tracker stuff too: kanban pipeline, calendar, salary ranges, contacts,
>   offer comparison, CSV import/export if you're escaping a spreadsheet (or another tracker).
>
> It's free, works on mobile, no credit card, and your data is exportable anytime:
> https://job-tracker-tau-eight.vercel.app/landing.html
>
> Would genuinely love feedback, especially on what would make you actually keep
> using a tool like this through a whole search. I read everything.

*(r/alphaandbetausers: change the last paragraph to "Looking for early users who'll
tell me what's broken or missing. There's a feedback form built into the app, or just
comment here.")*

---

## Variant B — job-seeker subs (r/jobsearchhacks, r/GetEmployed, r/jobsearch, r/careerguidance)

Lead with the insight, not the tool. The post should be useful even to people who never click.

**Title options (pick one):**
1. The highest-ROI job search habit nobody does: following up (57% of candidates never do)
2. Following up got me responses when applying didn't. Here's the cadence that worked for me
3. PSA: your applications aren't being rejected, they're being forgotten. Follow up.

**Body:**

> Something that changed my search: treating follow-ups as a system instead of a vibe.
> The numbers surprised me: a majority of candidates never send any follow-up, most
> hiring managers say follow-ups influence their decisions, and well-timed ones
> meaningfully raise callback rates. Which means just *sending one* puts you ahead of
> half the field.
>
> The cadence that worked for me:
>
> - **7 days after applying**, no response → short, polite follow-up to the recruiter
>   or hiring manager. Restate interest, one line on fit, done.
> - **Same day or next morning after any interview** → thank-you note referencing
>   something you discussed.
> - **1 week after an interview**, no update → status check. Enthusiastic, not pushy.
> - Keep every message under 100 words. You're nudging, not re-applying.
>
> The hard part isn't writing them, it's *remembering*, when you're juggling 30+
> applications. I ended up building a free tool for myself that turns this into a daily
> checklist and drafts the emails (Followup:
> https://job-tracker-tau-eight.vercel.app/landing.html, free, no card, disclosure: I
> made it). But honestly, a spreadsheet column with "follow up on X date" gets you 80%
> of the way. The system matters more than the tool.
>
> Happy to share the email templates I use if anyone wants them.

*(That last line matters: pasting templates in comments when asked is the most
credible engagement move available.)*

---

## After each post

1. Log it here: date, sub, title used, link to thread.
2. Watch PostHog for 48h: signups, activation funnel (`signed_up → job_added → draft_opened`),
   and D1 return of the cohort.
3. Harvest every piece of feedback into the Batch B/C backlog.
4. When a thread does well, comment-mine it: the questions people ask are landing-page copy.

## Post log

**Note (added 2026-07-19):** the three threads actually posted used a different title/body
than the drafted Variant A copy above ("I got laid off and create a job tracking app, wdyt?")
and included r/ProductivityApps, which isn't in the target-subs table. Exact post
dates/times aren't confirmed — reddit.com is unreachable from this AI environment
(blocked by policy for both WebFetch and the browser tool), so engagement stats
(upvotes/comments) need to be checked manually by Jin. PostHog shows no real signups or
pageviews attributable to any Reddit referrer as of 2026-07-19 — but see the caveat below:
`landing.html` has no PostHog SDK, so pageviews/click-throughs aren't captured at all,
only in-app signups. A visitor who read the thread and bounced without signing up would
leave zero trace in PostHog.

| Date | Sub | Title | Thread | Signups (48h) |
|---|---|---|---|---|
| unconfirmed | r/SideProject | "I got laid off and create a job tracking app, wdyt?" | https://www.reddit.com/r/SideProject/comments/1uym310/ | 0 tracked (see caveat above) |
| unconfirmed | r/ProductivityApps | "I got laid off and create a job tracking app, wdyt?" | https://www.reddit.com/r/ProductivityApps/comments/1uyxpy6/i_got_laid_off_and_create_a_job_tracking_app_wdyt/ | 0 tracked (see caveat above) |
| unconfirmed | r/alphaandbetausers | "I got laid off and create a job tracking app, wdyt?" | https://www.reddit.com/r/alphaandbetausers/comments/1uym4ec/i_got_laid_off_and_create_a_job_tracking_app_wdyt/ | 0 tracked (see caveat above) |
| 2026-07-19 | r/ClaudeAI | "Laid off, so I've been vibe-coding a job tracker with Claude for the last few months — feedback welcome" | https://www.reddit.com/r/ClaudeAI/comments/1v0r9x6/laid_off_so_ive_been_vibecoding_a_job_tracker/ | check 07-21 (landing.html pageview tracking now live as of `db7c257`, so this post's referral traffic should actually be visible) |

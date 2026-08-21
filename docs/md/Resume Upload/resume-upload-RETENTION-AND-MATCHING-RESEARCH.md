# Research Findings — Retention Defaults and Ambiguous Match Resolution

**Prepared:** 22 July 2026
**Scope:** the two items I previously answered from pattern-matching rather than evidence.
**Outcome:** both answers change. One was wrong in its numbers; the other was wrong in its principle.

---

# 1 · Retention

## 1.1 The framing was wrong, not just the numbers

I was about to apply recruitment-industry retention guidance. That guidance is real and well-established — <cite index="66-1">the safest baseline is 6 months after rejection, aligned with discrimination claim windows in Germany and the UK, while France's CNIL allows up to 2 years from last contact</cite>, and <cite index="71-1">the ICO is explicit that unless there is a clear business reason, recruitment records for unsuccessful applicants should not be kept beyond the statutory period in which a claim arising from the recruitment process may be brought.</cite>

**None of it applies to us.**

Every one of those rules governs a *recruiter holding a candidate's CV*. The lawful basis there is legitimate interest in defending a discrimination claim, and once that interest expires, so does the right to hold the file. <cite index="72-1">Under GDPR, the legal basis for processing data for a specific recruitment is taking steps prior to entering a contract; retaining CVs for future recruitment requires separate, voluntary candidate consent — failing to distinguish between these two bases is the most common mistake HR departments make.</cite>

Our situation is neither. **A talent uploads their own resume to their own profile on a platform where they are the user.** The file is their account content, held to provide the service they signed up for, like a profile photo or a portfolio piece. It persists because they want it to, and it goes when they say so.

Applying a 6-month deletion clock to a talent's own profile document would be actively user-hostile — deleting their file out from under them while their account is live and in good standing.

> **This is the more valuable finding than any number.** Had I applied the recruitment guidance, we would have built an automatic deletion job that quietly destroyed active users' files.

## 1.2 What best-in-class platforms actually do

**LinkedIn publishes exactly our case.** <cite index="76-1">When you upload your resume we'll save a copy and retain your four most recently uploaded resumes, enabling you to reuse them for future job applications. You can manage which resumes are saved and can opt out of saving resumes in your resume settings.</cite>

Four versions. Talent-managed. Opt-out available.

**On account closure**, LinkedIn is specific: <cite index="79-1">if you close your account, your information generally will be removed from LinkedIn's production system within 24 hours, and closed account information is generally deleted and logs or backup information de-identified within 30 days of account closure.</cite>

**Upwork** — the closest structural comparison, being a talent marketplace rather than a network — takes the user-controlled position: <cite index="78-1">personal data remains in the database until the user requests deletion or termination of their personal data, to the extent permitted by applicable law.</cite>

**Greenhouse**, on the ATS side, is worth noting for contrast: <cite index="80-1">data selected for deletion in a retention rule is removed from the candidate profile after a configured period when the candidate is rejected on all applications, or when the candidate requests deletion — including all attachments and resumes for every application associated with the candidate.</cite> That is the recruiter model, event-triggered on rejection. It is not ours.

## 1.3 Rulings

### R-1 · Version retention: keep the **4 most recent**, talent-managed
Adopt LinkedIn's number. It is not arbitrary — it is what the largest platform in this exact situation settled on, and four covers realistic use (a talent iterating on their resume over a year or two) without unbounded accumulation.

**My earlier "keep 5 or 12 months, whichever comes first" was invented.** The 12-month element was worse than the number: it would delete a version while the account was active, for no reason that serves the talent.

**No time-based expiry on versions at all.** Count-based only. A resume from three years ago on an active account is not a problem; it is history the talent chose to keep.

### R-2 · Account deletion: production within **24 hours**, backups within **30 days**
Adopt LinkedIn's published timeline. It is defensible under GDPR's erasure obligation, it is what users of comparable platforms already expect, and it gives operations a realistic window for backup propagation.

This closes RU-510 with a concrete number rather than deferring to a platform policy that does not exist.

### R-3 · `raw_result`: purge on resolution, **30 days** for an abandoned review
The parse result is working state, not account content. It exists to power a review that has not happened yet.

- Review resolved by any path → purge immediately.
- Review never resolved → purge after 30 days, and clear the pending-review prompt with it.

Thirty days is generous for a prompt sitting on the talent's own profile. Beyond that we are holding extracted personal data for a decision nobody is going to make.

### R-4 · Talent control, not just talent request
LinkedIn lets the talent **manage which resumes are saved and opt out of saving entirely**. We hold one resume at launch, so version management has nowhere to surface yet — but when multiple stored resumes ship (RU-512), the management interface ships with them, not after.

**Deletion is already immediate and available.** That is the part that matters and we already have it.

## 1.4 What changes

| Item | Was | Now |
|---|---|---|
| `resume_version` retention | Unowned gap | **4 most recent, count-based, no time expiry** |
| Account deletion (RU-510) | Deferred to a non-existent platform policy | **24 h production, 30 d backups** |
| `raw_result` retention | Undefined | **Purge on resolution; 30 d if abandoned** |
| Recruitment retention clocks | Considered | **Explicitly rejected as inapplicable** — different lawful basis |

---

# 2 · Ambiguous match resolution — EC-204

## 2.1 The discipline has a name for this, and a standard answer

One extracted work entry matching two existing profile entries is a textbook case in record linkage. The classical framework does **not** produce a binary outcome. Similarity scores <cite index="84-1">are fed into a classification model — either deterministic rule-based systems or probabilistic machine learning models — that decides whether a pair is a match, non-match, or **requires clerical review**.</cite>

Three outcomes, not two. Ambiguity is its own category, escalated rather than resolved.

The broader literature is consistent: <cite index="81-1">some records may look similar but refer to different entities, others lack enough information to be clearly resolved, and deciding how to handle ambiguous cases is non-trivial — often requiring thresholds, probabilistic reasoning, or human review.</cite>

And the failure mode has a name. **Over-resolution** is <cite index="90-1">incorrectly resolving two entities into a single entity when the two in fact refer to distinct individuals and should not be resolved.</cite>

The matching step <cite index="88-1">must ensure the matching criteria is sufficiently strong, to avoid incorrect mergers.</cite>

## 2.2 My previous answer was over-resolution with extra steps

I ruled: **match the most recently updated, leave the other untouched.** And I said it was "what every contact-merge system does when a match is ambiguous."

I did not check that, and it is wrong in principle. Picking the most recently updated record is not a tie-break — it is a coin flip dressed as a rule. It resolves ambiguity by fiat and then performs a **destructive write** against the record it happened to pick.

Worse, it fails silently. The talent sees one conflict row, approves it, and one of their two entries is overwritten with no indication that a choice was made on their behalf between two candidates.

## 2.3 The right answer follows from our own design

Our conflict model already encodes the correct principle: **additive applies immediately; destructive requires consent.** The conflict dialog exists precisely because overwriting needs the talent to agree.

An ambiguous match is the case where **meaningful consent cannot be obtained.** We cannot honestly ask "may we replace this?" when we do not know which *this* we mean. The dialog's premise breaks.

So it falls back to the safe half of our own rule.

### Ruling · An ambiguous match is not a match. Treat it as an addition.

Where one extracted entry matches two or more existing entries under the matching key:

1. **Do not overwrite anything.** Neither existing entry is touched.
2. **Do not present a conflict row.** We cannot state what would be replaced.
3. **Add the extracted entry as a new record**, reported in the summary like any other addition.
4. **Log it** as `ambiguous_match` for observability — frequency tells us whether pre-existing duplicates are common enough to warrant a merge tool.

### Why this is right

| Approach | Outcome if wrong |
|---|---|
| Auto-pick one *(my previous ruling)* | **Destructive and silent.** Overwrites a record the talent never chose between. Unrecoverable once Undo expires |
| Add a third entry *(this ruling)* | **Non-destructive and visible.** The talent sees a duplicate and deletes it in one action |

The asymmetry is decisive. And it is worth being clear about what the ambiguity means: **the profile already contained two entries that look like the same job.** That is pre-existing mess we did not create and should not silently tidy by deleting one. Surfacing a third makes the mess visible, which is closer to a fix than quietly overwriting one of them.

### The residual cost, stated plainly
The talent ends up with three similar entries instead of two. That is the cost, it is small, it is reversible in one click, and it is strictly better than the alternative — which is us destroying data we were not sure about.

## 2.4 What changes

| Item | Was | Now |
|---|---|---|
| EC-204 | ⚠ Needs decision — provisional "most recently updated wins" | **Settled: treat as an addition. Never auto-resolve ambiguity into a destructive write** |
| Doc 07 C-10 | Same provisional ruling | Same correction |
| Observability | — | `ambiguous_match` counter added |

---

# 3 · What I got wrong, recorded

**Retention.** I gave "keep the last 5 versions or 12 months, whichever comes first" as though it were a standard. Both numbers were invented. The 12-month element would have deleted active users' files while their accounts were live — and I nearly reached for recruitment-industry clocks that govern an entirely different lawful basis. LinkedIn's published answer for our exact case is four versions, count-based, no expiry.

**Ambiguous matching.** I asserted that most-recently-updated is "what every contact-merge system does." It is not. The discipline treats ambiguity as a third outcome requiring escalation, and names the failure I was proposing: over-resolution. My ruling would have performed a silent destructive write on a coin flip — in the one part of this feature specifically designed to prevent exactly that.

Both are the same mistake I made with the 20-skill cap: **a confident number or rule with nothing underneath it.** The tell is the same each time — I reach for something plausible rather than checking, and the plausibility is what makes it hard to spot afterwards.

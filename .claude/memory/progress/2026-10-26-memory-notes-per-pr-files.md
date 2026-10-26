# Memory notes: one file per PR instead of appending to progress.md

- Date: 2026-10-26
- Branch / PR: chore/memory-notes-per-pr-files
- Services / areas: repo process, `.claude/memory/`, CLAUDE.md, `.gitattributes`

## What changed
- CLAUDE.md "After finishing work": add one new file per PR under `.claude/memory/progress/`, and stop appending to the end of `progress.md` or to a service file's Gotchas / Agent Log.
- `progress/README.md` documents the file name and layout. `progress.md`'s "Recent Feature Work" is closed for new entries and kept as history. `MEMORY.md` and `services/_TEMPLATE.md` point to the new folder.
- `.gitattributes`: `.claude/memory/**/*.md merge=union`, so a local or Jenkins merge keeps both sides of a memory file instead of conflicting.

## Findings (not changed)
- Root cause: every PR appended a paragraph after the same last line of `progress.md` (20 of the last 90 dev-main commits). #813, #814 and #815 each conflicted only in memory files, and 5 open PRs (#815, #816, #819, #820, #821) still append there, so they will keep conflicting until they merge.
- GitHub's own PR merge check most likely ignores `.gitattributes` merge drivers, so `merge=union` alone would not stop GitHub from showing a conflict. That's why new notes go in new files.

## Verification
- `git check-attr merge` reports `union` for `.claude/memory/**/*.md` and `unspecified` for CLAUDE.md.
- Throwaway repo: two branches appending to the same memory file merged cleanly with both lines kept.

## Follow-ups
- Open PRs that already append to `progress.md` get resolved by keeping both sides as they merge.

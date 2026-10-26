# Per-PR progress notes

One new file per PR or ticket. **Never append your notes to `../progress.md` or
to the end of a `../services/<service>.md` file.**

## Why

Every PR used to append a paragraph to the end of `progress.md` (and often the
Gotchas / Agent Log of a service file). Two PRs opened from the same dev-main
both added text after the same last line, so whichever merged second always
had a merge conflict. A new file per PR can't conflict with another PR.

## File name

`YYYY-MM-DD-<ticket>-<short-slug>.md`, for example
`2026-10-26-BTB-350-offer-details-alignment.md`. Use the branch name as the slug
if there is no ticket. If you update the same ticket later, edit your own file.

## What goes in it

```markdown
# <TICKET>: <one-line title>

- Date: YYYY-MM-DD
- Branch / PR: <branch> (#<number> once opened)
- Services / areas: <service-name>, <frontend area>, ...

## What changed
## Findings (not changed)
## Verification
## Follow-ups
```

Put everything you would have written as a service Gotcha or Agent Log entry
here, under the service it belongs to. Mention the service name in
"Services / areas" so it can be found with grep.

## Reading

Newest first: `ls -r .claude/memory/progress/` (the date prefix sorts them).
Everything about one service: `grep -l "<service-name>" .claude/memory/progress/*.md`.

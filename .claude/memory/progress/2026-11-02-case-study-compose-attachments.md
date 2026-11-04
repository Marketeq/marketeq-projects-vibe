# Case study client view: attachments show in the message field

- Date: 2026-11-02
- Branch: fix/case-study-compose-attachments
- Area: frontend `components/case-study/client-view-collaborate-card.tsx`

## What changed
- Chris reported images/attachments "not working" on the case study message field. Picking a
  file only raised a toast and nothing appeared in the field, so it read as not attached.
- Staged files now render under the textarea as removable chips (Badge + BadgeCloseButton,
  same chip used for skills elsewhere); × removes one. The toast was dropped.
- Send was already wired (`useClientMessageThread` -> `/messaging/upload`); unchanged.

## Verification
- Browser on localhost: two files staged -> two chips, × removes one, Send enables with
  attachments only. Actual upload not exercised (messaging-service not running locally;
  self-preview stubs Send).
- `tsc --noEmit`: no errors in the changed file.

# Active project Files list view

- Date: 2026-11-06
- Services / areas: frontend active-project Files tab
- Authorization: Christopher requested the Files tab list layout, shared tab fade, Browsing History search behavior, working Upload/New Folder/Expand controls, and the multi-select bar from his pasted CSS and screenshot. He explicitly confirmed frontend only, with no backend implementation.

## What changed

Connected the existing grid/list toggle to a list composed from design-system Table, Checkbox, Avatar, Button, and DropdownMenu components. Grid remains the default. Both views use the shared TabsContent animation directly. The list has Name, Task, Uploaded by, and actions columns, select-all, and name sorting.

Reused Browsing History's expanding search, 150ms opening / 300ms closing, 50ms focus scheduling, case-insensitive trimmed live filtering, close-on-blur, filled close control, and no-results/Clear Search states. The reference page remains unchanged.

The Files UI is one page-level JSX composition reused inside a full-viewport Dialog. Upload opens a multiple-file picker, stores local object URLs, and renders real image previews. New Folder validates names, creates and opens a local folder; folder counts and navigation follow current local state. File IDs keep selections stable with duplicate names.

Selection replaces the normal toolbar with the supplied 52px bar (8px/12px padding, gray-100 background), in both grid and list. Actions: Move to, Duplicate, Share, Download, Archive, Clear/Close. Move changes local folder assignment; duplication gives copies unique names; Share stores local member selections; Archive has Undo. Uploaded files download individually or as an fflate ZIP. Seeded samples have no file contents and give an explicit download message. All changes are in-memory frontend state and reset on refresh, as appropriate for this requested frontend preview.

## Verification

Verified in Christopher's existing signed-in Chrome project tab: grid/list switching, selection retention, select-all, ascending name sorting, and rendered dimensions of 44px for the header and 72px for every row. Screenshot: `/tmp/marketeq-local/files-list-view.png`.

Verified folder creation and required-name validation, duplicate/archive behavior, list and grid selection bars, shared member selection retention, moving local files, and full-screen open/restore. In-app browser upload test added text and SVG fixtures; their multi-download ZIP was read back and both files matched byte-for-byte. Full-screen dialog dimensions matched the viewport. Selection bar height/padding/background matched the provided CSS. Final screenshot: `/tmp/marketeq-local/files-selection-bar.png`.

TypeScript reported no errors in the changed page; the full project check still reports 12 errors in unrelated files. `git diff --check` passed. Task, scope/team, and contract tab source blocks were compared to HEAD and are unchanged.

## Findings (not changed)

The in-app browser now has a signed-in client session; Chrome has a separate signed-in talent session. Chrome's extension blocked automated file selection without file-URL access; the in-app browser successfully tested the native multiple-file picker without changing permissions. Existing per-file Rename and the Filters button are outside these requested controls and remain their original placeholders.

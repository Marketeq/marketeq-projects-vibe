# Case study editor: Publish turns red while publish errors are showing

- Date: 2026-11-02
- Branch: case-study-publish-error-button
- Area: frontend `components/case-study/` (publish-dialog, editor-top-bar, editor-preview-bar, case-study-editor)

## What changed
- Follow-up promised to Chris: the Publish button uses `visual="error"` while a publish
  error is visible.
- Top bar / preview bar: new optional `hasPublishError` prop, driven by the editor's
  `descriptionError` ("Please add a description.").
- Publish dialog: red after a submit attempt while cover or title is missing.

## Verification
- Browser on localhost: empty description -> Publish shows error and turns red; typing
  clears the error and it returns to blue. Dialog cover/title red state not exercised.

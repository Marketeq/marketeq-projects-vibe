# Create a Project Rich Text Editor Rebuild Backlog

This document is the rebuild backlog for the `Create a Project` rich text editor and all supporting functionality that was iterated on during the project listings work. It is intentionally detailed so another engineer or AI assistant can reconstruct the behavior without having to reverse-engineer the entire chat history.

## Purpose

This backlog exists for three reasons:

1. To preserve the full expected feature set for the `Full Description` editor on the `Create a Project` page.
2. To document the supporting page, backend, image, and fullscreen behaviors that made the editor usable in the listings flow.
3. To give engineering a feature-by-feature rebuild checklist with enough context to rebuild the work faithfully instead of guessing.

## Scope

This backlog covers:
- the `Full Description` rich text editor on the `Create a Project` page
- rich text toolbar behavior, layout, and dropdown logic
- text formatting, spacing, list behavior, and content normalization
- image upload, alignment, hover actions, drag behavior, and image editing
- fullscreen editing mode
- page-level layout and validation work required to support the editor well
- backend draft and media persistence that the editor depended on
- regression coverage needed to keep the editor stable

## Rebuild backlog

### A. Core editor foundation

1. **Replace the plain textarea with the shared rich text editor**
   Description: The `Full Description` field on `Create a Project` must use the shared rich text editor instead of a plain textarea. This is the foundation for inline formatting, image insertion, fullscreen editing, hover toolbars, and layout-aware description styling.

2. **Keep the editor field width stable**
   Description: Long text, especially text without spaces, must never stretch the editor horizontally or widen the page column. The field should stay locked to the intended container width and wrap content inside the editor instead of expanding its layout.

3. **Wrap long unbroken text instead of widening the page**
   Description: If the user pastes or types a long unbroken string, the text should break and wrap inside the editor. This should work in the editing state and the read-only render state so the description never blows out the form width.

4. **Place the caret where the user clicks**
   Description: On the first click into the field, the editor should place the caret on the row the user clicked, not jump to the bottom of the content. This behavior matters for long descriptions and was explicitly called out as part of the usability fix.

5. **Use selection-based toolbar visibility**
   Description: The text toolbar should appear only when the user has selected at least one character. It should not appear on plain cursor focus, during typing with no selected range, or in a way that covers the content unnecessarily.

6. **Support standard inline formatting**
   Description: The editor must support `bold`, `italic`, `underline`, and `strikethrough` as inline marks. These styles should apply only to the selected text and should be preserved when the selection is moved into list items or combined with heading-size marks.

7. **Apply formatting Google Docs-style to selected text only**
   Description: If the user highlights one word or part of a sentence and applies a size or style change, only the highlighted text should change. The formatting must not spread to the rest of the line, paragraph, or block unless the entire range was selected.

8. **Reflect partial inline styling in toolbar active states**
   Description: If the selected range includes styled text, the toolbar should reflect that styling instead of pretending the selection is plain. For example, selecting a sentence that contains bold text should still allow the bold button to read as active or mixed rather than inactive.

9. **Provide a text-size selector with the agreed options**
   Description: The text-size dropdown should expose `Normal Text`, `Small Heading`, `Normal Heading`, and `Large Heading`. These are editorial styles, but they should behave like inline selection styles rather than block-level paragraph replacements.

10. **Use the approved text-size scale**
    Description: The editor should use the agreed typography sizing: `Normal Text` `16px`, `Small Heading` `16px`, `Normal Heading` `20px`, and `Large Heading` `24px`. The scale should render consistently inside the editor and in the published description output.

11. **Normal Text must remove the heading-size mark**
    Description: When a user switches selected text back to `Normal Text`, the editor must truly clear the inline size mark from the selected range. It cannot visually or semantically leave the old heading size behind.

12. **Bold must remain visible inside heading-sized text**
    Description: Bold formatting must still look visually bold when applied to `Large Heading`, `Normal Heading`, or `Small Heading` text. Larger font sizes should not flatten or mask the bold weight.

13. **Strikethrough must stay vertically centered regardless of text size**
    Description: The strike line should stay visually centered on the text even when the text uses a larger inline font size. It should not drift upward as heading-sized inline text gets larger.

14. **Use automatic paragraph-to-heading spacing**
    Description: If a normal paragraph is followed by any heading size, the editor should automatically create proper visual spacing before that heading. Users should not have to insert manual blank lines to get a clean editorial rhythm.

15. **Do not over-space heading-to-paragraph transitions**
    Description: A heading followed by its supporting description should stay fairly tight. The system should create more space before headings than after headings so descriptions under a headline still feel connected to the heading above them.

16. **Collapse repeated empty paragraphs**
    Description: The editor should normalize excessive blank lines so stacked empty paragraphs do not create giant white gaps. This is especially important for AI-generated descriptions and for preventing users from “designing” layout through repeated blank lines.

17. **Preserve intentional layout rhythm without relying on blank lines**
    Description: The system should enforce spacing through editor styling and content normalization rather than through users manually stacking returns. This keeps the editor scalable for automated content generation and makes the layout more consistent.

18. **Use the intended editor padding**
    Description: The editor field should use `16px` left and right padding and `16px` top and bottom padding so text, lists, and images align to the same visual frame. This padding is part of the design quality of the field, not just a cosmetic detail.

19. **Match editor render and published render**
    Description: Rich text content should display consistently in the editing state and in the published project description view. If a heading, list, image, or spacing rule looks one way in the editor, the saved project detail page should render that same intent.

### B. List behavior

20. **Preserve inline styling when applying bullets or numbers**
    Description: Turning text into a bulleted list or numbered list should not wipe out inline styles like bold, italic, underline, strikethrough, or inline size marks. The list action should add structure without resetting the user’s formatting.

21. **Normalize list behavior when heading-styled text becomes a list**
    Description: If a user applies bullets or numbering to text that had a heading-like size, the result should be predictable and readable. The list transformation should not accidentally inherit block-like heading behavior in a way that breaks the visual system.

22. **Match Google Docs backspace behavior inside lists**
    Description: At the start of a list item, the first backspace should remove the bullet or number styling from that row instead of immediately merging the row into the previous line. Only after the list formatting is removed should a subsequent backspace merge content upward.

23. **Indent lists away from the field edge**
    Description: Bullets and numbered markers should not sit against the left edge of the field. The user explicitly wanted the markers to feel properly indented rather than touching the field boundary.

24. **Use a true hanging indent like Google Docs**
    Description: The marker should sit left of the list text, and wrapped lines should align under the list text rather than under the bullet or number. This is different from simply adding padding to the whole list block.

25. **Keep list markers visible next to wrapped images**
    Description: When text wraps around a left- or right-aligned image, list markers must stay inside the visible text column. They cannot disappear under the image or get clipped by the float layout.

26. **Use `16px` wraparound inset for list markers**
    Description: For list items rendered in the wrapped text column beside an image, the marker inset should use `16px` to match the rest of the content padding. This keeps wrapped lists aligned with the text column instead of over-indented.

27. **Scale list markers with font size**
    Description: Bullets and numbers should match the selected text size rather than remaining one fixed size. If the line uses a larger heading-sized inline font, the marker should visually scale with it.

28. **Make list markers follow bold styling**
    Description: If the list row is bold, the marker should also appear bold so the bullet or number feels like part of the same line. The marker should not look visually disconnected from a bold list row.

29. **Do not over-apply italic styling to markers**
    Description: A single italicized word inside a list item should not force the bullet or number itself to become italic. Marker styling should only shift when the row’s formatting truly calls for it, consistent with the intended document-editor behavior.

30. **Preserve underline and strike behavior on list content**
    Description: Lists should preserve underline and strikethrough styling on the content itself. The marker does not need to mirror every decoration, but the list conversion must not strip those styles off the text.

### C. Toolbar behavior and polish

31. **Floating toolbar should move smoothly**
   Description: When the selection changes, the floating toolbar should feel like it is gliding with the user rather than teleporting or snapping awkwardly. The movement should feel polished and lightweight.

32. **Support a pinned toolbar mode**
   Description: The editor should include a lock control that pins the toolbar to the top of the editor field. This gives users an alternative mode when they do not want the toolbar floating over the content.

33. **Unlocking must restore the floating toolbar**
   Description: If the toolbar is pinned and then unlocked, the floating toolbar must reappear immediately and stay usable without requiring a refresh. This specific regression caused major frustration and must be treated as a hard requirement.

34. **Keep selection stable through toolbar mode changes**
   Description: Pinning and unpinning the toolbar should preserve the selected text range and keep the toolbar usable. The lock transition cannot silently drop the active selection or cause the toolbar to vanish.

35. **Keep the font-size dropdown correctly anchored**
   Description: The font-size dropdown must stay attached to the trigger in normal editing, pinned mode, and fullscreen mode. It must never fall back to the top-left of the screen or open after the toolbar itself disappears.

36. **Preserve the selected range while the font menu is open**
   Description: Opening the size dropdown should not destroy the selection that the toolbar depends on. The menu needs to keep the relevant selection state alive so the toolbar stays mounted and the size command still applies to the original selection.

37. **Match toolbar spacing, padding, and dividers**
   Description: All toolbar controls should use a consistent internal button size, divider spacing, and outer padding. No button should visually touch divider lines, and no section should have unexplained extra left or right padding.

38. **Use the correct image-button footprint**
   Description: The image button in the text toolbar should have the same footprint and rhythm as the other buttons. It should not look wider, shorter, or differently padded than the standard icon controls.

39. **Style `Edit with Smart Assistant` like the rest of the toolbar**
   Description: The smart assistant button should use the same padding language, hover/active treatment, and icon-to-label spacing as the rest of the toolbar. It should not feel like a separate or lower-quality control bolted onto the end of the bar.

40. **Put the toolbar in the correct visual order**
   Description: The font-style dropdown, inline formatting buttons, list controls, image button, and smart assistant control should be in the intended order with no accidental extra tools in between. The toolbar should match the approved reference ordering.

### D. Image upload and rendering

41. **Open the browser file picker instead of asking for a URL**
   Description: Clicking the image action should open a file picker for browser-based upload. The experience should not ask the user to paste a URL for a content image.

42. **Persist images through the real backend media path**
   Description: Images inserted into the rich text description should go through the listings-service and media upload pipeline, then store in Cloudflare R2. The editor should not rely on temporary local files or raw inline data URLs.

43. **Do not submit the whole form when uploading an image**
   Description: Opening or using the image upload flow should not behave like a form submission. It must not cause unrelated field validation, form refresh behavior, or accidental state resets elsewhere on the page.

44. **Preserve scroll position while opening the image picker**
   Description: Clicking the image button should not change the page scroll position, jump the viewport, or cause the editor to unexpectedly refocus in a way that scrolls the page. The upload action should feel isolated from page-level movement.

45. **Do not trigger unrelated error states during image upload**
   Description: Uploading an image should not put unrelated fields into an error state just because the user interacted with the editor. The upload interaction should stay scoped to the rich text field.

46. **Compress oversized images automatically**
   Description: If the user uploads an image that is too large, the editor should resize and compress it before upload rather than simply rejecting it. The user should receive a simple notice that the image was resized instead of being blocked by a hard error.

47. **Insert uploaded images as full width by default**
   Description: New images should default to full-width layout because it is the cleanest and most predictable initial presentation. This also makes AI-generated or bulk-imported content look more polished on first render.

48. **Support left, right, and full-width image layouts**
   Description: After insertion, the editor should allow the image to be switched between left-aligned wrap, right-aligned wrap, and full-width block layout. These are the core supported image modes.

49. **Use true 50% width for left and right wrapped images**
   Description: Left- and right-aligned images should use a real half-width wrap treatment, not a hard-coded small image width. The text column beside them should feel like a deliberate wrap layout rather than a thumbnail with random float behavior.

50. **Prevent fake extra padding above top full-width images**
   Description: A full-width image at the very top of the field should sit naturally in the editor without looking like the field gained extra top padding. This requires controlling image margins separately from the field’s padding.

51. **Use `16px` spacing between wrapped image and text**
   Description: Wrapped images should sit with `16px` of space between the image edge and the text column. This matches the field padding and makes the wrap layout feel more deliberate and balanced.

52. **Use clean vertical image spacing inside the description**
   Description: Images should have a consistent amount of space above and below them, whether full width or wrapped, so the content feels editorial and not cramped. This spacing should hold in the editor and in the published render.

53. **Render images consistently after publish**
   Description: Images inserted into the description should preserve their saved alignment and sizing when the project is viewed later. The publish view should not flatten all rich text images into a generic default style.

### E. Image hover toolbar

54. **Show a real hover state on images**
   Description: Hovering an image should immediately show a clear hover treatment so the user understands the image is interactive. The hover affordance should not depend on the editor already being focused in a special state.

55. **Add the 20% black overlay under hover controls**
   Description: Hovered images should display a subtle black overlay at `20%` opacity beneath the hover controls. This is part of the approved visual design and helps the toolbar read clearly on top of varied image content.

56. **Show the case-study-style image action bar**
   Description: Hovering an image should surface a white action bar patterned after the case study builder. The toolbar should include edit, replace, alignment, and delete actions in the approved visual order.

57. **Keep hover logic purely hover-driven**
   Description: The image hover bar should appear when the user is hovering the image or the toolbar itself and disappear when they are not. It should not require extra clicks, focus hacks, or blur events to show or hide correctly.

58. **Avoid hover delay and sticky hover bugs**
   Description: The hover treatment should not lag, require a second interaction, or stay visible after the user has moved away. The behavior needs to feel immediate and predictable.

59. **Remove the stray left seam on the image toolbar**
   Description: The hover toolbar should not show an extra border seam or divider line at the left edge caused by hidden elements or wrapper layout issues. The control bar should look like one clean rounded component.

60. **Clip the left edit-button hover state to the rounded corner**
   Description: The hover background of the first button in the image toolbar should respect the rounded outer container instead of showing a square hover block in the left corners. This detail was explicitly called out and should be preserved.

61. **Show the selected alignment icon in the toolbar**
   Description: The image alignment trigger should change its icon based on the image’s current alignment state. It must not stay stuck on a generic icon when the image is actually left, right, or full width.

62. **Use the provided 15x15 alignment icons without resizing them**
   Description: The left, right, and full-width alignment icons supplied for this editor should render at their native `15px x 15px` size. They should not be blown up or shrunk by generic toolbar icon sizing.

63. **Keep left and right icon mapping correct**
   Description: The left and right alignment icons must correspond to the actual behavior and layout state. The visual icon cannot be accidentally reversed from the real applied alignment.

64. **Use a `4px` gap between the image toolbar and the alignment menu**
   Description: The spacing between the hover toolbar and the alignment dropdown should be visually tight and match the provided design reference. The approved distance is `4px`.

### F. Image editing modal

65. **Open the shared image edit modal from the image toolbar**
   Description: Clicking the image edit action should launch the existing shared image editor pattern rather than a custom one-off modal. The rich text flow should inherit that shared editing behavior instead of diverging from it.

66. **Do not change onboarding’s avatar editor**
   Description: The shared image-editing implementation should be reused without altering the existing onboarding avatar experience. The rich text editor should integrate with the shared system in an isolated way.

67. **Allow image replacement from the hover toolbar**
   Description: The image action bar should let the user replace the current image while keeping it inside the editor context. This should feel like part of the same authoring flow rather than a destructive remove-and-reinsert workflow.

68. **Keep the edit modal visually aligned to the existing design system**
   Description: The edit modal used from the rich text editor should match the shared product pattern in title, control layout, and action hierarchy. It should feel native to the existing component system rather than improvised.

### G. Drag-and-drop image behavior

69. **Use grab and grabbing cursor states on editor images**
   Description: Images should show an open-hand `grab` cursor when draggable and a closed-hand `grabbing` state during direct interaction. This improves affordance and aligns with the intended drag experience.

70. **Use a blue `2px` drag preview line**
   Description: The drop preview line should render as `Blue 500` with a thickness of `2px`. The editor should not fall back to a generic black browser-looking line if the custom preview is expected.

71. **Make the drop preview line editor-controlled**
   Description: The visible drop line should come from the editor’s own drag preview logic, not from an uncontrolled browser artifact that cannot be styled reliably. This is necessary to guarantee the color, thickness, and width of the preview.

72. **Match preview width to current alignment**
   Description: A full-width image should preview as full width, while a left- or right-aligned image should preview with a half-width drop indicator. The preview must communicate the resulting layout accurately.

73. **Move half-width preview from side to side across the midpoint**
   Description: When dragging a wrapped image across the editor midpoint, the half-width preview should jump from left to right or right to left to show which side the image would land on. This should make the alignment change feel legible before drop.

74. **Commit left-to-right and right-to-left alignment changes on drop**
   Description: If a left-aligned image is dragged across to the right side, it should become right aligned when dropped, and vice versa. The alignment change should not be preview-only if the user clearly moved the image to the opposite side.

75. **Do not auto-convert wrapped images to full width on drag**
   Description: Dragging should not casually turn a wrapped image into a full-width image. Full width should remain a deliberate alignment choice chosen from the image toolbar, not an accidental result of dropping near the center.

### H. Fullscreen editing mode

76. **Add an expand control to open fullscreen editing**
   Description: The `Full Description` field should expose an expand action that opens the editor into a full-window editing mode. This is necessary for longer descriptions and more serious layout work.

77. **Make the expand control an overlay, not a layout blocker**
   Description: The fullscreen button should float over the field instead of stealing usable width from the content. Images and text should still be able to occupy the full available content width underneath it.

78. **Reuse the product’s edge-to-edge fullscreen shell**
   Description: The fullscreen editor should use the same edge-to-edge modal shell pattern already used elsewhere in the product rather than a centered modal with padding around the window. This keeps the experience aligned with the existing design system.

79. **Use the approved fullscreen header structure**
   Description: The fullscreen header should include the project description title plus the expected action area for undo, redo, preview, and minimize/collapse. The layout should look like a real authoring surface, not a generic dialog header.

80. **Use the preferred expand and collapse icons**
   Description: The fullscreen open and close controls should use the approved diagonal expand/collapse icon set, not substitute icons that feel visually off. The iconography was explicitly reviewed and corrected.

81. **Remove redundant close behavior**
   Description: The fullscreen header should have one clear way to exit fullscreen instead of both a close button and a minimize button doing almost the same thing. The interaction model should be simple and unambiguous.

82. **Add tooltips for preview and minimize**
   Description: The preview and minimize controls in the fullscreen header should show tooltips so the action meanings are obvious on hover. This helps the icon-only header feel more discoverable.

83. **Use a single fullscreen scrollbar**
   Description: Fullscreen mode should use one outer scrollbar for the content area. It should not trap the user in a nested inner scrolling panel that clips the top or bottom of the editor.

84. **Let content scroll naturally under the header**
   Description: The fullscreen content should start below the header and then scroll naturally without feeling cut off at the top or bottom. The content column should feel like one continuous editing surface.

85. **Keep the fullscreen background visually pinned**
   Description: The background color in fullscreen mode should stay visually stable while only the content rubber-bands during scroll. The background should not appear to bounce with the content layer.

86. **Constrain fullscreen content width to `818px`**
   Description: The editing column in fullscreen mode should use an `818px` content width because that better approximates the final project description display width. The goal is to make fullscreen editing a realistic preview, not a misleading extra-wide composition space.

87. **Share undo and redo history across minimized and fullscreen modes**
   Description: Undo and redo in fullscreen mode should remember changes made before the editor entered fullscreen. The user should not feel like entering fullscreen resets history or starts a separate editing session.

88. **Use better-looking undo and redo icons**
   Description: The fullscreen undo and redo icons should keep the same size and color footprint while using a more refined, premium visual style. The user explicitly wanted something softer and less awkward than the original icon set.

### I. Page-level integration and content guidance

89. **Make the left project-step sidebar sticky**
   Description: The left navigation rail for `Project Info`, `Media`, and `Project Scope` should remain visible while the page scrolls. Users should not have to scroll all the way back up just to see which section they are in.

90. **Make the right tip panel sticky**
   Description: The right-side contextual guidance panel should stay visible while the user scrolls through a section. This keeps writing guidance available without forcing the user to reorient constantly.

91. **Upgrade the tip-card copy**
   Description: The side guidance should contain useful project-description advice rather than generic filler. The copy should help someone write a stronger listing by focusing on outcome, audience, proof, scope, and clarity.

92. **Shorten the top tip-card description lines**
   Description: The short summary line at the top of the tip cards should be concise enough to read in one line where possible. The intent is to make the cards feel lighter and easier to scan.

93. **Use title-plus-description formatting inside tip cards**
   Description: Tip content should be written more like a short heading with supporting copy below it rather than long colon-based pseudo-AI sentences. This was a content-quality improvement driven by the editorial feel of the UI.

94. **Use tighter line-height in the tip cards**
   Description: The sidebar tip copy should not use overly tall line-height. The text should read compactly and cleanly without feeling bloated.

95. **Keep the page title as `Create a Project`**
   Description: The page header and related title surfaces should use the wording `Create a Project` instead of `Create Project`. This wording change was explicitly requested and should persist.

### J. Validation, counting, and saved-state behavior

96. **Raise the Full Description limit to `5,000` characters**
   Description: The maximum description length should be `5,000` visible characters rather than `2,000`. This gives enough room for richer project descriptions without forcing the user into an artificially short format.

97. **Count visible text rather than raw HTML**
   Description: The live character counter should count what the user can actually read, not the underlying HTML markup. Images and rich text tags should not inflate the count.

98. **Clear false max-length errors immediately**
   Description: If the visible description is under `5,000` characters, the max-length error should disappear right away. Validation must not get stuck because a different validation layer is still remembering the old over-limit state.

99. **Persist completed step indicators after save and return**
   Description: If the user saves and exits, then comes back to the draft later, the left-sidebar status indicators should still show which sections are already complete. Completion cannot depend on re-clicking each field after reload.

### K. Backend and persistence integration

100. **Use backend-backed draft creation, loading, and updating**
    Description: The `Create a Project` page should use the real listings-service draft flow for create, hydrate, and update operations. The active flow should not depend on a local-only draft format for the live editing experience.

101. **Persist rich text image uploads through the listings-service path**
    Description: The rich text editor image-upload action should reach the correct gateway and listings-service endpoint so uploaded images are stored through the real backend media system. This needs to be reliable enough for future AI content generation workflows.

102. **Preserve supported rich text markup during save**
    Description: Backend sanitization should preserve the allowed markup needed for inline formatting and image layout. It should not strip away the features that make the rich text editor valuable in the first place.

103. **Keep published rendering compatible with saved image alignment**
    Description: The saved description payload should include whatever alignment metadata the published project detail page needs to render images the same way they looked in the editor. This applies especially to left, right, and full-width image modes.

### L. Regression coverage and workflow protection

104. **Add browser regression tests for the rich text flow**
    Description: Automated browser tests should cover core editor formatting, list behavior, image upload, drag preview, selection-only toolbar visibility, pin/unpin stability, and fullscreen behavior. The flow is too interaction-heavy to stabilize by memory alone.

105. **Treat local source as the active source of truth during work**
    Description: The active local checkout must not be casually replaced, reset, or overwritten by another branch while work is in progress. This workflow rule is part of protecting editor work that evolves over many hours of visual feedback.

106. **Save editor work in real source files, not only in build artifacts**
    Description: Feature work must live in the tracked source files and be committed intentionally. It cannot be allowed to exist only in compiled local artifacts, transient dev output, or memory-based reconstructions.

## Cross-check summary against the conversation history

The backlog above explicitly includes the feature groups that came up repeatedly in the conversation:

- rich text selection behavior and inline formatting
- font-size dropdown behavior and heading styling
- automatic spacing and blank-line cleanup
- field-width protection and long-text wrapping
- list indentation, marker behavior, and Google Docs-like editing
- image browser upload, Cloudflare persistence, and auto-compression
- image alignment, wrapped layout spacing, and full-width default
- hover toolbar behavior, icon corrections, and alignment menu spacing
- image edit modal reuse
- drag preview line color, width, and side-switch logic
- fullscreen shell, width, scroll behavior, and undo/redo history
- sticky sidebars and improved tip-card copy
- `5,000` character validation and saved sidebar completion state
- backend draft persistence and rich text save compatibility
- regression tests and local source-of-truth workflow protection

## Critical non-negotiable UX rules

These rules came up repeatedly and should be treated as non-negotiable acceptance requirements:

1. The toolbar cannot disappear after pinning and unpinning.
2. The font-size dropdown cannot detach and jump to the top-left of the screen.
3. Long text cannot widen the field or page layout.
4. Bullets and numbers cannot wipe out inline formatting.
5. Image upload cannot refresh the page, trigger unrelated validation, or jump scroll position.
6. Fullscreen mode must use one scrollbar, not nested scrolling panes.
7. Fullscreen mode must preserve undo and redo history from the non-fullscreen editor.
8. Full-width images must actually render full width, and left/right images must actually render as wrapped half-width images.
9. The hover toolbar must be driven by real hover behavior, not by fragile focus state.
10. The backend draft flow and image-upload flow must persist through real listings-service endpoints, not temporary local-only behavior.

## Priority guidance

Use the following priority system during rebuild:

- `P0`: core editing, persistence, or regression issues that make the editor unusable
- `P1`: major UX or layout issues that break the intended editing experience
- `P2`: visual polish or quality issues that do not block the main workflow

Suggested grouping:

- `P0`
  - items `1-13`
  - items `20-22`
  - items `32-49`
  - items `54-58`
  - items `76-87`
  - items `96-104`
- `P1`
  - items `14-19`
  - items `23-31`
  - items `33-40`
  - items `50-53`
  - items `59-75`
  - items `88-95`
- `P2`
  - icon, spacing, tooltip, and micro-polish items where the workflow still technically functions

## Likely file targets

These are the most likely source areas to touch during the rebuild:

- Frontend editor component:
  - [rich-text-editor.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/components/rich-text-editor.tsx)
- Fullscreen and modal image editing:
  - [image-editor.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/components/ui/image-editor/image-editor.tsx)
- Create a Project page integration:
  - [page.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/publish-project/page.tsx)
- Shared editor and published-render styling:
  - [globals.css](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/styles/globals.css)
- Published project rendering:
  - [page.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/(group)/(group)/project-details/[slug]/page.tsx)
- Frontend project API wrapper:
  - [project.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/service/http/project.ts)
- API gateway upload endpoint:
  - [publish-rich-text-image.controller.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/api-gateway/src/controllers/publish-rich-text-image.controller.ts)
- Listings-service publish controller and service:
  - [publish.controller.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/listings-service/src/publish/publish.controller.ts)
  - [publish.service.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/listings-service/src/publish/publish.service.ts)
- Listings-service media module wiring:
  - [app.module.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/listings-service/src/app.module.ts)

## Definition of done

The rebuild should not be considered complete until all of the following are true:

1. The `Create a Project` page is visibly using the rich text editor instead of a plain textarea.
2. Rich text formatting works in the editor and persists after save and reload.
3. Image upload works from the browser file picker and stores through the backend media path.
4. Left, right, and full-width images all render correctly in the editor and in the published view.
5. The image hover toolbar is stable and the image edit modal opens from it correctly.
6. The selection-based text toolbar, pinned mode, and unpinned floating mode all work without disappearing regressions.
7. The font-size dropdown stays correctly aligned in normal mode and fullscreen mode.
8. The fullscreen editor shell behaves like the agreed edge-to-edge editing surface with `818px` content width and one scrollbar.
9. The `5,000` character limit, visible-text counting, and saved completion-state logic all work correctly.
10. Browser regression tests cover the core interactions and pass on local.

## Recommended validation checklist

Before calling the rebuild done, manually verify the following in the browser:

1. Select one word in a sentence and apply each inline style.
2. Apply `Large Heading`, then switch that same text back to `Normal Text`.
3. Create a bullet list and a numbered list from already-styled content.
4. Backspace at the start of a list item and confirm the first press removes list formatting.
5. Paste a long unbroken string and confirm the field width does not grow.
6. Upload an image from the file picker and confirm the page does not scroll or refresh.
7. Hover the image and confirm the hover toolbar appears immediately and disappears cleanly.
8. Change the image between `full width`, `left`, and `right`.
9. Drag a wrapped image across the midpoint and confirm preview and drop behavior are correct.
10. Open fullscreen mode and confirm width, scroll behavior, header actions, and shared undo/redo history.

## Recommended rebuild order

1. Restore the shared rich text editor component as the actual `Full Description` input.
2. Reconnect backend draft create/load/update and rich text image upload persistence.
3. Rebuild the core inline formatting, heading sizes, wrapping, and automatic spacing rules.
4. Rebuild list behavior, indentation, marker scaling, and Google Docs-style backspace behavior.
5. Rebuild image insertion, alignment, hover toolbar, and shared image edit modal integration.
6. Rebuild drag preview logic and alignment-on-drop behavior.
7. Rebuild the fullscreen editor shell, content width, shared history, and header actions.
8. Reapply page-level sticky sidebars, tip-card copy, validation, and completion-state behavior.
9. Recreate and rerun browser regression coverage before merging.

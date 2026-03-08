# **Frontend -- Section Templates, JSON Schema**

Purpose: Define **exact section templates** from the designs (no
extras), with **Default / Edit / Published** states, field rules
(including **delete-on-empty** for text), layout constraints (e.g.,
**max 4 columns**), and the **JSON schema** for each template. These
compose the atomic blocks you already have: **Text, Image, Columns,
Video, Emoji, Prototype (Figma/Framer)**.

**Global rules**

- All text inputs are **rich text** (RT).

- **Delete-on-empty:** If a required RT field is cleared, remove the
  containing block/row immediately.

- **Block actions (Edit mode):** Move Up/Down, Hide/Show, Duplicate,
  Delete.

- **Published state** = read-only client view (no editor chrome, no
  placeholders). Server sanitizes HTML at publish.

- **Columns:** max **4** per section. Layout presets listed below.

## **Templates List (as in design)**

1.  Introduction

2.  Bold Statement

3.  Gallery

4.  Challenges

5.  Process (multi-step)

6.  Big Image (hero)

7.  Interview (Q&A)

8.  Personas

9.  Video

10. Customer Journey

11. Testimonial

12. Image & Text

13. Result Metrics**\**

14. Prototype (Figma / Framer)

15. Conclusion

16. Custom Columns

## **1) Introduction**

**Purpose:** Case study title + intro RT body.\
**Default:** RT placeholders for Title and Body.\
**Edit:** Two RT fields. **Required:** Title (delete-on-empty removes
section).\
**Published:** H1 + formatted body.

**Schema**

****{

\"type\": \"introduction\",

\"data\": {

\"titleHtml\": \"\<h1\>...\</h1\>\",

\"bodyHtml\": \"\<p\>...\</p\>\"

}

}



## **2) Bold Statement**

**Purpose:** A single strong line.\
**Default:** RT placeholder line.\
**Edit:** One required RT field (delete-on-empty removes).\
**Published:** Centered large type.

**Schema**

****{

\"type\": \"boldStatement\",

\"data\": { \"html\": \"\<p\>...\</p\>\" }

}



## **3) Gallery**

**Purpose:** Grid of images.\
**Default:** Empty grid; add images.\
**Edit:** Add/replace/reorder images; optional per-image alt.\
**Published:** Responsive grid.

**Schema**

****{

\"type\": \"gallery\",

\"data\": {

\"images\": \[ { \"url\": \"...\", \"alt\": \"...\" } \]

}

}



## **4) Challenges**

**Purpose:** Narrative RT about challenges.\
**Default:** RT placeholder.\
**Edit:** One required RT field (delete-on-empty removes).\
**Published:** Formatted section.

**Schema**

****{

\"type\": \"challenges\",

\"data\": { \"html\": \"\<p\>...\</p\>\" }

}



## **5) Process (multi-step)**

**Purpose:** Steps with title + RT body.\
**Default:** 3 steps scaffolded (empty).\
**Edit:** Add/remove/reorder steps; each step requires **title RT**;
delete-on-empty removes that step.\
**Published:** Numbered/ordered list.

**Schema**

****{

\"type\": \"process\",

\"data\": {

\"steps\": \[

{ \"titleHtml\": \"\<p\>...\</p\>\", \"bodyHtml\": \"\<p\>...\</p\>\" }

\]

}

}



## **6) Big Image (hero)**

**Purpose:** Full-width hero image (optional caption).\
**Default:** Empty dropzone.\
**Edit:** Select/replace image; optional alt/caption RT; delete is
explicit (not auto).\
**Published:** Full-width responsive image.

**Schema**

****{

\"type\": \"bigImage\",

\"data\": { \"url\": \"...\", \"alt\": \"...\" }

}



## **7) Interview (Q&A)**

**Purpose:** Series of Q/A pairs.\
**Default:** 1 empty pair.\
**Edit:** Add/remove/reorder; each **question RT** required; empty
question removes that pair.\
**Published:** Q as subhead, A as body.

**Schema**

****{

\"type\": \"interview\",

\"data\": {

\"items\": \[ { \"questionHtml\": \"\<p\>...\</p\>\", \"answerHtml\":
\"\<p\>...\</p\>\" } \]

}

}



## **8) Personas**

**Purpose:** Persona card(s) per design (About / Goals / Frustrations /
traits).\
**Default:** 1 empty persona.\
**Edit:** Add/remove; **name RT** required; empty removes that persona.\
**Published:** Cards with tags.

**Schema**

****{

\"type\": \"personas\",

\"data\": {

\"items\": \[

{

\"nameHtml\": \"\<p\>...\</p\>\",

\"titleHtml\": \"\<p\>...\</p\>\",

\"aboutHtml\": \"\<p\>...\</p\>\",

\"traits\": \[\"...\", \"...\"\]

}

\]

}

}



## **9) Video**

**Purpose:** Embedded video resource.\
**Default:** Empty URL field.\
**Edit:** Paste URL; optional title RT; invalid shows warning; delete
explicit.\
**Published:** Responsive embed (server rewrites to safe embed URL).

**Schema**

****{

\"type\": \"video\",

\"data\": { \"url\": \"https://...\", \"titleHtml\": \"\<p\>...\</p\>\"
}

}



## **10) Customer Journey**

**Purpose:** Narrative RT describing the journey/process outcome.\
**Default:** RT placeholder.\
**Edit:** One required RT field (delete-on-empty removes).\
**Published:** Formatted section.

**Schema**

****{

\"type\": \"customerJourney\",

\"data\": { \"html\": \"\<p\>...\</p\>\" }

}



## **11) Testimonial**

**Purpose:** Quote + author/role.\
**Default:** Quote RT placeholder.\
**Edit:** Quote RT (required → delete-on-empty removes), author RT
optional.\
**Published:** Styled quote + attribution.

**Schema**

****{

\"type\": \"testimonial\",

\"data\": { \"quoteHtml\": \"\<p\>...\</p\>\", \"authorHtml\":
\"\<p\>...\</p\>\" }

}



## **12) Image & Text**

**Purpose:** Paired visual + RT body.\
**Default:** Empty image + RT placeholder.\
**Edit:** Pick image; RT body required (delete-on-empty removes); layout
can be L/R swap if present in design.\
**Published:** Side-by-side responsive.

**Schema**

****{

\"type\": \"imageText\",

\"data\": {

\"image\": { \"url\": \"...\", \"alt\": \"...\" },

\"bodyHtml\": \"\<p\>...\</p\>\",

\"variant\": \"left\" // or \"right\" if your design supports swapping

}

}



## **13) Result Metrics**

**Purpose:** KPI tiles (e.g., 50%, 9X).\
**Default:** 3--4 empty tiles.\
**Edit:** Each tile has **value RT (required)** + label RT (optional).
Empty value removes tile. Reorder tiles.\
**Published:** Responsive grid.

**Schema**

****{

\"type\": \"resultMetrics\",

\"data\": {

\"items\": \[ { \"valueHtml\": \"\<p\>50%\</p\>\", \"labelHtml\":
\"\<p\>Uplift\</p\>\" } \]

}

}



## **14) Prototype (Figma / Framer)**

**Purpose:** Embedded interactive prototype.\
**Default:** Empty URL field.\
**Edit:** Paste share URL. **Allowed:** Figma, Framer. **Not allowed:**
InVision. Invalid URL shows warning. Optional title RT.\
**Published:** Responsive iframe embed.

**Schema**

****{

\"type\": \"prototype\",

\"data\": {

\"provider\": \"figma\", // or \"framer\"

\"url\": \"https://www.figma.com/proto/\...\",

\"titleHtml\": \"\<p\>...\</p\>\"

}

}



## **15) Conclusion**

**Purpose:** Closing RT.\
**Default:** RT placeholder.\
**Edit:** One required RT field (delete-on-empty removes).\
**Published:** Formatted section.

**Schema**

****{

\"type\": \"conclusion\",

\"data\": { \"html\": \"\<p\>...\</p\>\" }

}



## **16) Custom Columns**

**Purpose:** Flexible layout to place blocks inside columns.\
**Default:** Layout chooser, empty columns.\
**Edit:** Add Column (up to **4**), Move Left/Right, Duplicate, Delete
(not if only one).\
**Published:** Responsive grid rendering child blocks.

**Layouts**

- 1, 2-equal, 3-equal, 4-equal, 5-equal, 6-equal, 7-equal, 4-equal

- 2-33-66, 2-66-33 (sidebars)

**Schema**

****{

\"type\": \"customColumns\",

\"data\": {

\"layout\": \"3-equal\",

\"cols\": \[

{ \"id\": \"col-1\", \"items\": \[ /\* block envelopes \*/ \] },

{ \"id\": \"col-2\", \"items\": \[\] },

{ \"id\": \"col-3\", \"items\": \[\] }

\]

}

}



## **Envelope & Document**

Every section is stored as a standard **envelope** with visibility and
ID.

{ \"id\": \"uuid\", \"type\": \"\<sectionType\>\", \"data\": {...},
\"hidden\": false }

Top-level document shape used by the editor and backend:

{

\"title\": \"Case Study Title\",

\"sections\": \[ /\* section envelopes in order \*/ \]

}



## **Acceptance Checklist**

- Each template renders **Default / Edit / Published** per design.

- **Delete-on-empty** enforced for required RichText fields.

- Block actions available in Edit: Move Up/Down, Hide/Show, Duplicate,
  Delete.

- Columns obey **max 4**; layout presets match list above.

- Prototype accepts **Figma / Framer** only; invalid URLs warn and block
  publish.

- Published output has no editor chrome and matches Client View
  typography/layout.

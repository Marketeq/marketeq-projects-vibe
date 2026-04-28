# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rich-text-editor.spec.ts >> image drag preview reflects alignment with blue 2px dropcursor
- Location: tests/rich-text-editor.spec.ts:375:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - button "1 Project Info" [ref=e6] [cursor=pointer]:
            - generic [ref=e7]:
              - generic [ref=e8]: "1"
              - generic [ref=e9]: Project Info
          - generic [ref=e10]:
            - generic [ref=e11]:
              - generic [ref=e12]: Title
              - img [ref=e13]
            - generic [ref=e16]:
              - generic [ref=e17]: Category
              - img [ref=e18]
            - generic [ref=e21]:
              - generic [ref=e22]: Industry(s)
              - img [ref=e23]
            - generic [ref=e26]:
              - generic [ref=e27]: Short Description
              - img [ref=e28]
            - generic [ref=e31]:
              - generic [ref=e32]: Full Description
              - img [ref=e33]
            - generic [ref=e36]:
              - generic [ref=e37]: Tags
              - img [ref=e38]
            - generic [ref=e41]:
              - generic [ref=e42]: Skills
              - img [ref=e43]
        - button "2 Media" [disabled] [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]: "2"
            - generic [ref=e50]: Media
          - img [ref=e51]
        - button "3 Project Scope" [disabled] [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e56]: "3"
            - generic [ref=e57]: Project Scope
          - img [ref=e58]
      - generic [ref=e60]:
        - generic [ref=e61]:
          - heading "Create a Project" [level=3] [ref=e62]
          - generic [ref=e63]:
            - button [ref=e64] [cursor=pointer]:
              - img [ref=e65]
            - button "Preview" [ref=e68] [cursor=pointer]:
              - img [ref=e69]
              - text: Preview
            - button "Save & Exit" [ref=e72] [cursor=pointer]
        - generic [ref=e79]:
          - generic [ref=e80]:
            - heading "Project Info" [level=1] [ref=e81]
            - generic [ref=e82]:
              - generic [ref=e83]:
                - generic [ref=e84] [cursor=pointer]: Title
                - generic [ref=e85]:
                  - generic [ref=e86]: Write a title that accurately describes your project scope for the marketplace.
                  - generic [ref=e87]: 0/120
              - textbox "Title" [ref=e89]:
                - /placeholder: Enter Title
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92] [cursor=pointer]: Category
                - generic [ref=e93]: Select categories that best fit your project scope for easier discovery.
              - generic [ref=e94]:
                - generic [ref=e95]: "1"
                - generic [ref=e96]:
                  - button "Add Category" [ref=e99] [cursor=pointer]:
                    - generic [ref=e100]: Add Category
                    - img [ref=e101]
                  - generic [ref=e104]:
                    - textbox "Add Sub-Category(s)" [ref=e106]
                    - img [ref=e107]
              - generic [ref=e109]:
                - generic [ref=e110]: "2"
                - generic [ref=e111]:
                  - button "Add Category" [ref=e114] [cursor=pointer]:
                    - generic [ref=e115]: Add Category
                    - img [ref=e116]
                  - generic [ref=e119]:
                    - textbox "Add Sub-Category(s)" [ref=e121]
                    - img [ref=e122]
              - generic [ref=e124]:
                - generic [ref=e125]: "3"
                - generic [ref=e126]:
                  - button "Add Category" [ref=e129] [cursor=pointer]:
                    - generic [ref=e130]: Add Category
                    - img [ref=e131]
                  - generic [ref=e134]:
                    - textbox "Add Sub-Category(s)" [ref=e136]
                    - img [ref=e137]
            - generic [ref=e139]:
              - generic [ref=e140]: Suggested Categories
              - generic [ref=e141]:
                - button "Design / UI/UX Design" [ref=e142] [cursor=pointer]:
                  - text: Design / UI/UX Design
                  - img [ref=e143]
                - button "Development / Mobile App" [ref=e145] [cursor=pointer]:
                  - text: Development / Mobile App
                  - img [ref=e146]
                - button "Data Science / Machine Learning" [ref=e148] [cursor=pointer]:
                  - text: Data Science / Machine Learning
                  - img [ref=e149]
            - generic [ref=e152]:
              - generic [ref=e153]:
                - generic [ref=e154] [cursor=pointer]: Industry
                - generic [ref=e155]:
                  - generic [ref=e156]: Add up to 5 industries that aligns with your project scope for targeted visibility.
                  - generic [ref=e157]: 0/5
              - generic [ref=e158]:
                - textbox "Industry" [ref=e160]:
                  - /placeholder: Add Industries
                - img [ref=e161]
            - generic [ref=e163]:
              - generic [ref=e164]:
                - generic [ref=e165] [cursor=pointer]: Short Description
                - generic [ref=e166]:
                  - generic [ref=e167]: Provide a brief overview of your project scope.
                  - generic [ref=e168]: 0/300
              - textbox "Short Description" [ref=e169]:
                - /placeholder: Enter a short Description
            - generic [ref=e170]:
              - generic [ref=e171]:
                - generic [ref=e172] [cursor=pointer]: Full Description
                - generic [ref=e173]:
                  - generic [ref=e174]: Provide a comprehensive description of this project, including its purpose and features.
                  - generic [ref=e175]: 9/5,000
              - generic [ref=e176]:
                - button [ref=e178] [cursor=pointer]:
                  - img [ref=e179]
                - generic [ref=e182]:
                  - generic [active] [ref=e183]:
                    - paragraph [ref=e184]: Alpha
                    - paragraph [ref=e185]: Beta
                    - paragraph [ref=e186]
                  - generic [ref=e188]:
                    - generic [ref=e189]:
                      - combobox [ref=e190] [cursor=pointer]:
                        - generic: Normal Text
                        - img [ref=e192]
                      - combobox [ref=e194]
                    - generic [ref=e196]:
                      - button [ref=e197] [cursor=pointer]:
                        - img [ref=e198]
                      - button [ref=e200] [cursor=pointer]:
                        - img [ref=e201]
                      - button [ref=e203] [cursor=pointer]:
                        - img [ref=e204]
                      - button [ref=e206] [cursor=pointer]:
                        - img [ref=e207]
                    - generic [ref=e210]:
                      - button [ref=e211] [cursor=pointer]:
                        - img [ref=e212]
                      - button [ref=e214] [cursor=pointer]:
                        - img [ref=e215]
                    - button [ref=e219] [cursor=pointer]:
                      - img [ref=e220]
                    - button "Edit with Smart Assistant" [ref=e224] [cursor=pointer]:
                      - img [ref=e225]
                      - generic [ref=e227]: Edit with Smart Assistant
                    - button [ref=e230] [cursor=pointer]:
                      - img [ref=e231]
            - generic [ref=e234]:
              - generic [ref=e235]:
                - generic [ref=e236] [cursor=pointer]: Tags
                - generic [ref=e237]:
                  - generic [ref=e238]: Add up to 10 tags that best describe your project. Use relevant keywords to highlight its features and make it easier to find.
                  - generic [ref=e239]: 0/10
              - generic [ref=e240]:
                - textbox "Tags" [ref=e242]:
                  - /placeholder: Add Tags
                - img [ref=e243]
            - generic [ref=e246]:
              - generic [ref=e247]:
                - generic [ref=e248] [cursor=pointer]: Skills
                - generic [ref=e249]:
                  - generic [ref=e250]: List up to 10 key skills or proficiencies required to implement this project effectively.
                  - generic [ref=e251]: 0/10
              - generic [ref=e252]:
                - textbox "Skills" [ref=e254]:
                  - /placeholder: Add Skills
                - img [ref=e255]
            - generic [ref=e257]:
              - generic [ref=e258]: Suggested Skills
              - generic [ref=e259]:
                - button "Node.js" [ref=e260] [cursor=pointer]:
                  - text: Node.js
                  - img [ref=e261]
                - button "JavaScript" [ref=e263] [cursor=pointer]:
                  - text: JavaScript
                  - img [ref=e264]
                - button "Wireframing" [ref=e266] [cursor=pointer]:
                  - text: Wireframing
                  - img [ref=e267]
          - generic [ref=e270]:
            - generic [ref=e272]:
              - img [ref=e273]
              - generic [ref=e275]: Tip
            - generic [ref=e276]: Show the outcome, audience, and value.
            - generic [ref=e277]:
              - generic [ref=e278]:
                - img [ref=e279]
                - generic [ref=e282]: Lead with the outcome
              - generic [ref=e283]: Use the title and short description to name the deliverable, who it helps, and the result it creates. If someone only reads the first two lines, they should still understand the value.
            - generic [ref=e284]:
              - generic [ref=e285]:
                - img [ref=e286]
                - generic [ref=e289]: Add proof, not filler
              - generic [ref=e290]: In the full description, include scope, constraints, tools, timeline, or measurable impact. Specific tags and skills improve search visibility and help the right collaborators self-select.
        - generic [ref=e291]:
          - progressbar [ref=e292]
          - generic [ref=e294]:
            - generic [ref=e295]: 0% Complete
            - button "Next" [ref=e297] [cursor=pointer]:
              - text: Next
              - img [ref=e298]
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e305] [cursor=pointer]:
    - img [ref=e306]
  - alert [ref=e309]
```

# Test source

```ts
  11  |   headless: true,
  12  | })
  13  | 
  14  | async function authenticateDevUser({
  15  |   request,
  16  |   context,
  17  | }: {
  18  |   request: Parameters<typeof test>[0]["request"]
  19  |   context: Parameters<typeof test>[0]["context"]
  20  | }) {
  21  |   const response = await request.post(`${API_URL}/auth/dev-login`, {
  22  |     data: { email: DEV_EMAIL },
  23  |   })
  24  | 
  25  |   expect(response.ok()).toBeTruthy()
  26  |   const body = await response.json()
  27  | 
  28  |   const cookies = [
  29  |     {
  30  |       name: "access_token",
  31  |       value: body.access_token as string,
  32  |       domain: "localhost",
  33  |       path: "/",
  34  |     },
  35  |   ]
  36  | 
  37  |   if (body.refresh_token) {
  38  |     cookies.push({
  39  |       name: "refresh_token",
  40  |       value: body.refresh_token as string,
  41  |       domain: "localhost",
  42  |       path: "/",
  43  |     })
  44  |   }
  45  | 
  46  |   await context.addCookies(cookies)
  47  | }
  48  | 
  49  | async function selectTextInEditor(
  50  |   page: Parameters<typeof test>[0]["page"],
  51  |   target: string
  52  | ) {
  53  |   await page.locator(".ProseMirror").evaluate((root, searchText) => {
  54  |     const textNodes: Array<{ node: Text; start: number; end: number }> = []
  55  |     const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  56  |     let current = walker.nextNode()
  57  |     let offset = 0
  58  |     let fullText = ""
  59  | 
  60  |     while (current) {
  61  |       const node = current as Text
  62  |       const value = node.textContent ?? ""
  63  |       textNodes.push({
  64  |         node,
  65  |         start: offset,
  66  |         end: offset + value.length,
  67  |       })
  68  |       fullText += value
  69  |       offset += value.length
  70  |       current = walker.nextNode()
  71  |     }
  72  | 
  73  |     const index = fullText.indexOf(searchText)
  74  |     if (index < 0) {
  75  |       throw new Error(`Could not find "${searchText}" in editor text "${fullText}"`)
  76  |     }
  77  | 
  78  |     const range = document.createRange()
  79  |     const startNode = textNodes.find(
  80  |       ({ start, end }) => index >= start && index < end
  81  |     )
  82  |     const endIndex = index + searchText.length
  83  |     const endNode = textNodes.find(
  84  |       ({ start, end }) => endIndex > start && endIndex <= end
  85  |     )
  86  | 
  87  |     if (!startNode || !endNode) {
  88  |       throw new Error(`Unable to build range for "${searchText}"`)
  89  |     }
  90  | 
  91  |     range.setStart(startNode.node, index - startNode.start)
  92  |     range.setEnd(endNode.node, endIndex - endNode.start)
  93  | 
  94  |     const selection = window.getSelection()
  95  |     selection?.removeAllRanges()
  96  |     selection?.addRange(range)
  97  |   }, target)
  98  | }
  99  | 
  100 | async function chooseFontSize(
  101 |   page: Parameters<typeof test>[0]["page"],
  102 |   label: "Normal Text" | "Small Heading" | "Normal Heading" | "Large Heading"
  103 | ) {
  104 |   await page.locator("[data-rich-text-command='font-size']").click()
  105 |   await page.getByText(label, { exact: true }).last().click()
  106 | }
  107 | 
  108 | async function uploadEditorImage(
  109 |   page: Parameters<typeof test>[0]["page"]
  110 | ) {
> 111 |   const uploadPromise = page.waitForResponse((response) =>
      |                              ^ Error: page.waitForResponse: Test timeout of 120000ms exceeded.
  112 |     response.url().includes("/publish/rich-text-image")
  113 |   )
  114 |   await page.locator("[data-rich-text-command='image']").click()
  115 |   await page
  116 |     .locator("[data-rich-text-editor-toolbar='true'] input[type='file']")
  117 |     .setInputFiles(IMAGE_FIXTURE)
  118 |   const uploadResponse = await uploadPromise
  119 |   expect(uploadResponse.ok()).toBeTruthy()
  120 | 
  121 |   const image = page.locator(".ProseMirror img").last()
  122 |   await expect(image).toBeVisible({ timeout: 30000 })
  123 |   return image
  124 | }
  125 | 
  126 | async function setHoveredImageAlignment(
  127 |   page: Parameters<typeof test>[0]["page"],
  128 |   alignment: "left" | "right" | "full-width"
  129 | ) {
  130 |   const image = page.locator(".ProseMirror img").last()
  131 |   await image.hover()
  132 | 
  133 |   const toolbar = page.locator("[data-rich-text-image-toolbar='true']")
  134 |   await expect(toolbar).toBeVisible()
  135 |   await toolbar.getByRole("button", { name: "Change image alignment" }).click()
  136 | 
  137 |   const menu = page.locator("[data-rich-text-image-toolbar-menu='true']")
  138 |   await expect(menu).toBeVisible()
  139 | 
  140 |   if (alignment === "left") {
  141 |     await menu.getByText("Left Align", { exact: true }).click()
  142 |   } else if (alignment === "right") {
  143 |     await menu.getByText("Right Align", { exact: true }).click()
  144 |   } else {
  145 |     await menu.getByText("Full Width", { exact: true }).click()
  146 |   }
  147 | }
  148 | 
  149 | async function showImageDropCursor(
  150 |   page: Parameters<typeof test>[0]["page"],
  151 |   options: {
  152 |     imageIndex?: number
  153 |     side?: "left" | "right"
  154 |   } = {}
  155 | ) {
  156 |   const { imageIndex = -1, side = "left" } = options
  157 | 
  158 |   await page.locator(".ProseMirror").evaluate(
  159 |     (editorRoot, { imageIndex, side }) => {
  160 |       const images = Array.from(
  161 |         editorRoot.querySelectorAll("img")
  162 |       ) as HTMLImageElement[]
  163 | 
  164 |       const image =
  165 |         imageIndex >= 0 ? images[imageIndex] : images[images.length - 1]
  166 | 
  167 |       if (!image) {
  168 |         throw new Error("No editor image available for drag preview test")
  169 |       }
  170 | 
  171 |       const editorRect = (editorRoot as HTMLElement).getBoundingClientRect()
  172 |       const targetX =
  173 |         side === "left"
  174 |           ? editorRect.left + editorRect.width * 0.25
  175 |           : editorRect.left + editorRect.width * 0.75
  176 |       const targetY = editorRect.top + editorRect.height * 0.5
  177 | 
  178 |       image.dispatchEvent(
  179 |         new DragEvent("dragstart", {
  180 |           bubbles: true,
  181 |           cancelable: true,
  182 |           clientX: targetX,
  183 |           clientY: targetY,
  184 |         })
  185 |       )
  186 | 
  187 |       editorRoot.dispatchEvent(
  188 |         new DragEvent("dragover", {
  189 |           bubbles: true,
  190 |           cancelable: true,
  191 |           clientX: targetX,
  192 |           clientY: targetY,
  193 |         })
  194 |       )
  195 |     },
  196 |     { imageIndex, side }
  197 |   )
  198 | 
  199 |   const dropCursor = page.locator(".rich-text-dropcursor.prosemirror-dropcursor-block")
  200 |   await expect(dropCursor).toBeVisible()
  201 |   return dropCursor
  202 | }
  203 | 
  204 | test("rich text editor toolbar preserves styling and applies size only to selected text", async ({
  205 |   page,
  206 |   request,
  207 |   context,
  208 | }) => {
  209 |   test.setTimeout(120000)
  210 | 
  211 |   await authenticateDevUser({ request, context })
```
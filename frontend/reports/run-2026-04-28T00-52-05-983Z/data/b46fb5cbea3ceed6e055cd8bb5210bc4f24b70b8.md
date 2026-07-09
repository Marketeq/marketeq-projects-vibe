# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rich-text-editor.spec.ts >> rich text editor toolbar preserves styling and applies size only to selected text
- Location: tests/rich-text-editor.spec.ts:108:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Full Description', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Full Description', { exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e2]:
        - generic [ref=e3]:
            - generic [ref=e4]:
                - generic [ref=e5]:
                    - button "1 Project Info" [ref=e6] [cursor=pointer]:
                        - generic [ref=e7]:
                            - generic [ref=e8]: "1"
                            - generic [ref=e9]: Project Info
                    - generic [ref=e10]:
                        - generic [ref=e12]: Title
                        - generic [ref=e14]: Category
                        - generic [ref=e16]: Industry(s)
                        - generic [ref=e18]: Short Description
                        - generic [ref=e20]: Full Description
                        - generic [ref=e22]: Tags
                        - generic [ref=e24]: Skills
                - button "2 Media" [disabled] [ref=e26]:
                    - generic [ref=e27]:
                        - generic [ref=e28]: "2"
                        - generic [ref=e29]: Media
                    - img [ref=e30]
                - button "3 Project Scope" [disabled] [ref=e33]:
                    - generic [ref=e34]:
                        - generic [ref=e35]: "3"
                        - generic [ref=e36]: Project Scope
                    - img [ref=e37]
            - generic [ref=e39]:
                - generic [ref=e40]:
                    - heading "Create Project" [level=3] [ref=e41]
                    - generic [ref=e42]:
                        - button [ref=e43] [cursor=pointer]:
                            - img [ref=e44]
                        - button "Preview" [ref=e47] [cursor=pointer]:
                            - img [ref=e48]
                            - text: Preview
                        - button "Save & Exit" [ref=e51] [cursor=pointer]
                - generic [ref=e58]:
                    - generic [ref=e59]:
                        - heading "Project Info" [level=1] [ref=e60]
                        - generic [ref=e61]:
                            - generic [ref=e62]:
                                - generic [ref=e63] [cursor=pointer]: Title
                                - generic [ref=e64]:
                                    - generic [ref=e65]: Write a title that accurately describes your project scope for the marketplace.
                                    - generic [ref=e66]: 0/120
                            - textbox "Title" [ref=e68]:
                                - /placeholder: Enter Title
                        - generic [ref=e69]:
                            - generic [ref=e70]:
                                - generic [ref=e71] [cursor=pointer]: Category
                                - generic [ref=e72]: Select categories that best fit your project scope for easier discovery.
                            - generic [ref=e73]:
                                - generic [ref=e74]: "1"
                                - generic [ref=e75]:
                                    - button "Add Category" [ref=e78] [cursor=pointer]:
                                        - generic [ref=e79]: Add Category
                                        - img [ref=e80]
                                    - generic [ref=e83]:
                                        - textbox "Add Sub-Category(s)" [ref=e85]
                                        - img [ref=e86]
                            - generic [ref=e88]:
                                - generic [ref=e89]: "2"
                                - generic [ref=e90]:
                                    - button "Add Category" [ref=e93] [cursor=pointer]:
                                        - generic [ref=e94]: Add Category
                                        - img [ref=e95]
                                    - generic [ref=e98]:
                                        - textbox "Add Sub-Category(s)" [ref=e100]
                                        - img [ref=e101]
                            - generic [ref=e103]:
                                - generic [ref=e104]: "3"
                                - generic [ref=e105]:
                                    - button "Add Category" [ref=e108] [cursor=pointer]:
                                        - generic [ref=e109]: Add Category
                                        - img [ref=e110]
                                    - generic [ref=e113]:
                                        - textbox "Add Sub-Category(s)" [ref=e115]
                                        - img [ref=e116]
                        - generic [ref=e118]:
                            - generic [ref=e119]: Suggested Categories
                            - generic [ref=e120]:
                                - button "Design / UI/UX Design" [ref=e121] [cursor=pointer]:
                                    - text: Design / UI/UX Design
                                    - img [ref=e122]
                                - button "Development / Mobile App" [ref=e124] [cursor=pointer]:
                                    - text: Development / Mobile App
                                    - img [ref=e125]
                                - button "Data Science / Machine Learning" [ref=e127] [cursor=pointer]:
                                    - text: Data Science / Machine Learning
                                    - img [ref=e128]
                        - generic [ref=e131]:
                            - generic [ref=e132]:
                                - generic [ref=e133] [cursor=pointer]: Industry
                                - generic [ref=e134]:
                                    - generic [ref=e135]: Add up to 5 industries that aligns with your project scope for targeted visibility.
                                    - generic [ref=e136]: 0/5
                            - generic [ref=e137]:
                                - textbox "Industry" [ref=e139]:
                                    - /placeholder: Add Industries
                                - img [ref=e140]
                        - generic [ref=e142]:
                            - generic [ref=e143]:
                                - generic [ref=e144] [cursor=pointer]: Short Description
                                - generic [ref=e145]:
                                    - generic [ref=e146]: Provide a brief overview of your project scope.
                                    - generic [ref=e147]: 0/300
                            - textbox "Short Description" [ref=e148]:
                                - /placeholder: Enter a short Description
                        - generic [ref=e149]:
                            - generic [ref=e150]:
                                - generic [ref=e151] [cursor=pointer]: Full Description
                                - generic [ref=e152]:
                                    - generic [ref=e153]: Provide a comprehensive description of this project, including its purpose and features.
                                    - generic [ref=e154]: 0/2,000
                            - paragraph [ref=e157]: Enter a full Description
                        - generic [ref=e159]:
                            - generic [ref=e160]:
                                - generic [ref=e161] [cursor=pointer]: Tags
                                - generic [ref=e162]:
                                    - generic [ref=e163]: Add up to 10 tags that best describe your project. Use relevant keywords to highlight its features and make it easier to find.
                                    - generic [ref=e164]: 0/10
                            - generic [ref=e165]:
                                - textbox "Tags" [ref=e167]:
                                    - /placeholder: Add Tags
                                - img [ref=e168]
                        - generic [ref=e171]:
                            - generic [ref=e172]:
                                - generic [ref=e173] [cursor=pointer]: Skills
                                - generic [ref=e174]:
                                    - generic [ref=e175]: List up to 10 key skills or proficiencies required to implement this project effectively.
                                    - generic [ref=e176]: 0/10
                            - generic [ref=e177]:
                                - textbox "Skills" [ref=e179]:
                                    - /placeholder: Add Skills
                                - img [ref=e180]
                        - generic [ref=e182]:
                            - generic [ref=e183]: Suggested Skills
                            - generic [ref=e184]:
                                - button "Node.js" [ref=e185] [cursor=pointer]:
                                    - text: Node.js
                                    - img [ref=e186]
                                - button "JavaScript" [ref=e188] [cursor=pointer]:
                                    - text: JavaScript
                                    - img [ref=e189]
                                - button "Wireframing" [ref=e191] [cursor=pointer]:
                                    - text: Wireframing
                                    - img [ref=e192]
                    - generic [ref=e195]:
                        - generic [ref=e197]:
                            - img [ref=e198]
                            - generic [ref=e200]: Tip
                        - generic [ref=e201]: A great title gives your audience a reason to open your project
                        - generic [ref=e202]:
                            - generic [ref=e203]:
                                - img [ref=e204]
                                - generic [ref=e207]: Focus on the purpose
                            - generic [ref=e208]: Use impactful keywords that communicate value and make it easy to identify in a list of projects.
                        - generic [ref=e209]:
                            - generic [ref=e210]:
                                - img [ref=e211]
                                - generic [ref=e214]: Focus on the purpose
                            - generic [ref=e215]: Use impactful keywords that communicate value and make it easy to identify in a list of projects.
                - generic [ref=e216]:
                    - progressbar [ref=e217]
                    - generic [ref=e219]:
                        - generic [ref=e220]: 0% Complete
                        - button "Next" [ref=e222] [cursor=pointer]:
                            - text: Next
                            - img [ref=e223]
        - region "Notifications (F8)":
            - list
    - region "Notifications (F8)":
        - list
    - button "Open Next.js Dev Tools" [ref=e230] [cursor=pointer]:
        - img [ref=e231]
    - alert [ref=e234]
```

# Test source

```ts
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
  108 | test("rich text editor toolbar preserves styling and applies size only to selected text", async ({
  109 |   page,
  110 |   request,
  111 |   context,
  112 | }) => {
  113 |   test.setTimeout(120000)
  114 |
  115 |   await authenticateDevUser({ request, context })
  116 |   await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })
  117 |
> 118 |   await expect(page.getByLabel("Full Description", { exact: true })).toBeVisible()
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  119 |   await page.getByText("Enter a full Description").click()
  120 |
  121 |   const editor = page.locator(".ProseMirror").first()
  122 |   await expect(editor).toBeVisible()
  123 |
  124 |   await editor.click()
  125 |   await page.keyboard.press("Meta+A")
  126 |   await page.keyboard.press("Backspace")
  127 |   await editor.type("Alpha Beta Gamma Delta")
  128 |
  129 |   await selectTextInEditor(page, "Beta")
  130 |   await chooseFontSize(page, "Large Heading")
  131 |   await page.locator("[data-rich-text-command='bold']").click()
  132 |
  133 |   let html = await editor.evaluate((node) => node.innerHTML)
  134 |   expect(html).toContain('data-font-size="large-heading"')
  135 |   expect(html).toContain("Alpha ")
  136 |   expect(html).toContain(" Gamma Delta")
  137 |
  138 |   await selectTextInEditor(page, "Gamma")
  139 |   await page.locator("[data-rich-text-command='italic']").click()
  140 |   await selectTextInEditor(page, "Gamma")
  141 |   await page.locator("[data-rich-text-command='underline']").click()
  142 |   await selectTextInEditor(page, "Gamma")
  143 |   await page.locator("[data-rich-text-command='strike']").click()
  144 |
  145 |   html = await editor.evaluate((node) => node.innerHTML)
  146 |   expect(html).toContain("strong")
  147 |   expect(html).toContain("em")
  148 |   expect(html).toContain("u")
  149 |   expect(html).toContain("s")
  150 |
  151 |   await editor.click()
  152 |   await page.keyboard.press("Meta+A")
  153 |   await page.locator("[data-rich-text-command='bullet-list']").click()
  154 |
  155 |   html = await editor.evaluate((node) => node.innerHTML)
  156 |   expect(html).toContain("<ul")
  157 |   expect(html).toContain('data-font-size="large-heading"')
  158 |   expect(html).toContain("strong")
  159 |   expect(html).toContain("em")
  160 |   expect(html).toContain("u")
  161 |   expect(html).toContain("s")
  162 |
  163 |   await editor.click()
  164 |   await page.keyboard.press("Meta+A")
  165 |   await page.locator("[data-rich-text-command='ordered-list']").click()
  166 |
  167 |   html = await editor.evaluate((node) => node.innerHTML)
  168 |   expect(html).toContain("<ol")
  169 |   expect(html).toContain('data-font-size="large-heading"')
  170 |   expect(html).toContain("strong")
  171 |   expect(html).toContain("em")
  172 |   expect(html).toContain("u")
  173 |   expect(html).toContain("s")
  174 |
  175 |   await selectTextInEditor(page, "Beta")
  176 |   await chooseFontSize(page, "Normal Text")
  177 |   html = await editor.evaluate((node) => node.innerHTML)
  178 |   expect(html).not.toContain('data-font-size="large-heading">Beta')
  179 |   expect(html).toContain("strong")
  180 |
  181 |   await editor.click()
  182 |   await page.keyboard.press("End")
  183 |   const uploadPromise = page.waitForResponse((response) =>
  184 |     response.url().includes("/publish/rich-text-image")
  185 |   )
  186 |   await page.locator("[data-rich-text-command='image']").click()
  187 |   await page.locator("[data-rich-text-editor-toolbar='true'] input[type='file']").setInputFiles(IMAGE_FIXTURE)
  188 |   const uploadResponse = await uploadPromise
  189 |   expect(uploadResponse.ok()).toBeTruthy()
  190 |
  191 |   await expect(editor.locator("img")).toHaveCount(1, { timeout: 30000 })
  192 | })
  193 |
```

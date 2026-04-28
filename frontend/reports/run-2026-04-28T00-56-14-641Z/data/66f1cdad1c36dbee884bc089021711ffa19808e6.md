# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rich-text-editor.spec.ts >> rich text editor toolbar preserves styling and applies size only to selected text
- Location: tests/rich-text-editor.spec.ts:108:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "em"
Received string:    "<p>Alpha <strong><span data-font-size=\"large-heading\">Beta</span></strong> <s><u>Gamma</u></s> Delta</p>"
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
            - generic [ref=e12]: Title
            - generic [ref=e14]: Category
            - generic [ref=e16]: Industry(s)
            - generic [ref=e18]: Short Description
            - generic [ref=e19]:
              - generic [ref=e20]: Full Description
              - img [ref=e21]
            - generic [ref=e25]: Tags
            - generic [ref=e27]: Skills
        - button "2 Media" [disabled] [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: "2"
            - generic [ref=e32]: Media
          - img [ref=e33]
        - button "3 Project Scope" [disabled] [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: "3"
            - generic [ref=e39]: Project Scope
          - img [ref=e40]
      - generic [ref=e42]:
        - generic [ref=e43]:
          - heading "Create Project" [level=3] [ref=e44]
          - generic [ref=e45]:
            - button [ref=e46] [cursor=pointer]:
              - img [ref=e47]
            - button "Preview" [ref=e50] [cursor=pointer]:
              - img [ref=e51]
              - text: Preview
            - button "Save & Exit" [ref=e54] [cursor=pointer]
        - generic [ref=e61]:
          - generic [ref=e62]:
            - heading "Project Info" [level=1] [ref=e63]
            - generic [ref=e64]:
              - generic [ref=e65]:
                - generic [ref=e66] [cursor=pointer]: Title
                - generic [ref=e67]:
                  - generic [ref=e68]: Write a title that accurately describes your project scope for the marketplace.
                  - generic [ref=e69]: 0/120
              - textbox "Title" [ref=e71]:
                - /placeholder: Enter Title
            - generic [ref=e72]:
              - generic [ref=e73]:
                - generic [ref=e74] [cursor=pointer]: Category
                - generic [ref=e75]: Select categories that best fit your project scope for easier discovery.
              - generic [ref=e76]:
                - generic [ref=e77]: "1"
                - generic [ref=e78]:
                  - button "Add Category" [ref=e81] [cursor=pointer]:
                    - generic [ref=e82]: Add Category
                    - img [ref=e83]
                  - generic [ref=e86]:
                    - textbox "Add Sub-Category(s)" [ref=e88]
                    - img [ref=e89]
              - generic [ref=e91]:
                - generic [ref=e92]: "2"
                - generic [ref=e93]:
                  - button "Add Category" [ref=e96] [cursor=pointer]:
                    - generic [ref=e97]: Add Category
                    - img [ref=e98]
                  - generic [ref=e101]:
                    - textbox "Add Sub-Category(s)" [ref=e103]
                    - img [ref=e104]
              - generic [ref=e106]:
                - generic [ref=e107]: "3"
                - generic [ref=e108]:
                  - button "Add Category" [ref=e111] [cursor=pointer]:
                    - generic [ref=e112]: Add Category
                    - img [ref=e113]
                  - generic [ref=e116]:
                    - textbox "Add Sub-Category(s)" [ref=e118]
                    - img [ref=e119]
            - generic [ref=e121]:
              - generic [ref=e122]: Suggested Categories
              - generic [ref=e123]:
                - button "Design / UI/UX Design" [ref=e124] [cursor=pointer]:
                  - text: Design / UI/UX Design
                  - img [ref=e125]
                - button "Development / Mobile App" [ref=e127] [cursor=pointer]:
                  - text: Development / Mobile App
                  - img [ref=e128]
                - button "Data Science / Machine Learning" [ref=e130] [cursor=pointer]:
                  - text: Data Science / Machine Learning
                  - img [ref=e131]
            - generic [ref=e134]:
              - generic [ref=e135]:
                - generic [ref=e136] [cursor=pointer]: Industry
                - generic [ref=e137]:
                  - generic [ref=e138]: Add up to 5 industries that aligns with your project scope for targeted visibility.
                  - generic [ref=e139]: 0/5
              - generic [ref=e140]:
                - textbox "Industry" [ref=e142]:
                  - /placeholder: Add Industries
                - img [ref=e143]
            - generic [ref=e145]:
              - generic [ref=e146]:
                - generic [ref=e147] [cursor=pointer]: Short Description
                - generic [ref=e148]:
                  - generic [ref=e149]: Provide a brief overview of your project scope.
                  - generic [ref=e150]: 0/300
              - textbox "Short Description" [ref=e151]:
                - /placeholder: Enter a short Description
            - generic [ref=e152]:
              - generic [ref=e153]:
                - generic [ref=e154] [cursor=pointer]: Full Description
                - generic [ref=e155]:
                  - generic [ref=e156]: Provide a comprehensive description of this project, including its purpose and features.
                  - generic [ref=e157]: 22/2,000
              - generic [ref=e159]:
                - generic [ref=e161]:
                  - generic [ref=e162]:
                    - combobox [ref=e163] [cursor=pointer]:
                      - generic: Normal Text
                      - img [ref=e165]
                    - combobox [ref=e167]
                  - generic [ref=e169]:
                    - button [ref=e170] [cursor=pointer]:
                      - img [ref=e171]
                    - button [ref=e173] [cursor=pointer]:
                      - img [ref=e174]
                    - button [pressed] [ref=e176] [cursor=pointer]:
                      - img [ref=e177]
                    - button [pressed] [ref=e179] [cursor=pointer]:
                      - img [ref=e180]
                  - generic [ref=e183]:
                    - button [ref=e184] [cursor=pointer]:
                      - img [ref=e185]
                    - button [ref=e187] [cursor=pointer]:
                      - img [ref=e188]
                  - button [ref=e192] [cursor=pointer]:
                    - img [ref=e193]
                  - button "Edit with Smart Assistant" [ref=e196] [cursor=pointer]:
                    - img [ref=e197]
                    - generic [ref=e199]: Edit with Smart Assistant
                - paragraph [ref=e202]:
                  - text: Alpha
                  - strong [ref=e203]: Beta
                  - generic [ref=e204]: Gamma
                  - text: Delta
              - generic [ref=e205]: Please enter at least 100 character(s)
            - generic [ref=e207]:
              - generic [ref=e208]:
                - generic [ref=e209] [cursor=pointer]: Tags
                - generic [ref=e210]:
                  - generic [ref=e211]: Add up to 10 tags that best describe your project. Use relevant keywords to highlight its features and make it easier to find.
                  - generic [ref=e212]: 0/10
              - generic [ref=e213]:
                - textbox "Tags" [ref=e215]:
                  - /placeholder: Add Tags
                - img [ref=e216]
            - generic [ref=e219]:
              - generic [ref=e220]:
                - generic [ref=e221] [cursor=pointer]: Skills
                - generic [ref=e222]:
                  - generic [ref=e223]: List up to 10 key skills or proficiencies required to implement this project effectively.
                  - generic [ref=e224]: 0/10
              - generic [ref=e225]:
                - textbox "Skills" [ref=e227]:
                  - /placeholder: Add Skills
                - img [ref=e228]
            - generic [ref=e230]:
              - generic [ref=e231]: Suggested Skills
              - generic [ref=e232]:
                - button "Node.js" [ref=e233] [cursor=pointer]:
                  - text: Node.js
                  - img [ref=e234]
                - button "JavaScript" [ref=e236] [cursor=pointer]:
                  - text: JavaScript
                  - img [ref=e237]
                - button "Wireframing" [ref=e239] [cursor=pointer]:
                  - text: Wireframing
                  - img [ref=e240]
          - generic [ref=e243]:
            - generic [ref=e245]:
              - img [ref=e246]
              - generic [ref=e248]: Tip
            - generic [ref=e249]: A great title gives your audience a reason to open your project
            - generic [ref=e250]:
              - generic [ref=e251]:
                - img [ref=e252]
                - generic [ref=e255]: Focus on the purpose
              - generic [ref=e256]: Use impactful keywords that communicate value and make it easy to identify in a list of projects.
            - generic [ref=e257]:
              - generic [ref=e258]:
                - img [ref=e259]
                - generic [ref=e262]: Focus on the purpose
              - generic [ref=e263]: Use impactful keywords that communicate value and make it easy to identify in a list of projects.
        - generic [ref=e264]:
          - progressbar [ref=e265]
          - generic [ref=e267]:
            - generic [ref=e268]: 0% Complete
            - button "Next" [ref=e270] [cursor=pointer]:
              - text: Next
              - img [ref=e271]
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e278] [cursor=pointer]:
    - img [ref=e279]
  - alert [ref=e282]
```

# Test source

```ts
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
  116 |   console.log("authenticated dev user")
  117 |   await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })
  118 |   console.log("opened publish project page")
  119 | 
  120 |   await page
  121 |     .locator("label[for='full-description']")
  122 |     .scrollIntoViewIfNeeded()
  123 |   await expect(page.locator("label[for='full-description']")).toBeVisible()
  124 |   await expect(page.getByText("Enter a full Description", { exact: true })).toBeVisible()
  125 |   await page.getByText("Enter a full Description").click()
  126 |   console.log("opened rich text editor")
  127 | 
  128 |   const editor = page.locator(".ProseMirror").first()
  129 |   await expect(editor).toBeVisible()
  130 | 
  131 |   await editor.click()
  132 |   await page.keyboard.press("Meta+A")
  133 |   await page.keyboard.press("Backspace")
  134 |   await editor.type("Alpha Beta Gamma Delta")
  135 |   console.log("typed baseline content")
  136 | 
  137 |   await selectTextInEditor(page, "Beta")
  138 |   await chooseFontSize(page, "Large Heading")
  139 |   await page.locator("[data-rich-text-command='bold']").click()
  140 |   console.log("applied large heading and bold to Beta")
  141 | 
  142 |   let html = await editor.evaluate((node) => node.innerHTML)
  143 |   expect(html).toContain('data-font-size="large-heading"')
  144 |   expect(html).toContain("Alpha ")
  145 |   expect(html).toContain(" Gamma Delta")
  146 | 
  147 |   await selectTextInEditor(page, "Gamma")
  148 |   await page.locator("[data-rich-text-command='italic']").click()
  149 |   await selectTextInEditor(page, "Gamma")
  150 |   await page.locator("[data-rich-text-command='underline']").click()
  151 |   await selectTextInEditor(page, "Gamma")
  152 |   await page.locator("[data-rich-text-command='strike']").click()
  153 |   console.log("applied italic underline strike to Gamma")
  154 | 
  155 |   html = await editor.evaluate((node) => node.innerHTML)
  156 |   expect(html).toContain("strong")
> 157 |   expect(html).toContain("em")
      |                ^ Error: expect(received).toContain(expected) // indexOf
  158 |   expect(html).toContain("u")
  159 |   expect(html).toContain("s")
  160 | 
  161 |   await editor.click()
  162 |   await page.keyboard.press("Meta+A")
  163 |   await page.locator("[data-rich-text-command='bullet-list']").click()
  164 |   console.log("converted content to bullet list")
  165 | 
  166 |   html = await editor.evaluate((node) => node.innerHTML)
  167 |   expect(html).toContain("<ul")
  168 |   expect(html).toContain('data-font-size="large-heading"')
  169 |   expect(html).toContain("strong")
  170 |   expect(html).toContain("em")
  171 |   expect(html).toContain("u")
  172 |   expect(html).toContain("s")
  173 | 
  174 |   await editor.click()
  175 |   await page.keyboard.press("Meta+A")
  176 |   await page.locator("[data-rich-text-command='ordered-list']").click()
  177 |   console.log("converted content to ordered list")
  178 | 
  179 |   html = await editor.evaluate((node) => node.innerHTML)
  180 |   expect(html).toContain("<ol")
  181 |   expect(html).toContain('data-font-size="large-heading"')
  182 |   expect(html).toContain("strong")
  183 |   expect(html).toContain("em")
  184 |   expect(html).toContain("u")
  185 |   expect(html).toContain("s")
  186 | 
  187 |   await selectTextInEditor(page, "Beta")
  188 |   await chooseFontSize(page, "Normal Text")
  189 |   console.log("returned Beta to normal text")
  190 |   html = await editor.evaluate((node) => node.innerHTML)
  191 |   expect(html).not.toContain('data-font-size="large-heading">Beta')
  192 |   expect(html).toContain("strong")
  193 | 
  194 |   await editor.click()
  195 |   await page.keyboard.press("End")
  196 |   const uploadPromise = page.waitForResponse((response) =>
  197 |     response.url().includes("/publish/rich-text-image")
  198 |   )
  199 |   await page.locator("[data-rich-text-command='image']").click()
  200 |   await page.locator("[data-rich-text-editor-toolbar='true'] input[type='file']").setInputFiles(IMAGE_FIXTURE)
  201 |   const uploadResponse = await uploadPromise
  202 |   console.log("uploaded image")
  203 |   expect(uploadResponse.ok()).toBeTruthy()
  204 | 
  205 |   await expect(editor.locator("img")).toHaveCount(1, { timeout: 30000 })
  206 | })
  207 | 
```
import { expect, test } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
const EDITOR_URL = `${BASE_URL}/publish-project?type=project&draftId=draft-1777094183022-2m5mjt`
const DEV_EMAIL = "harry.torres8@gmail.com"
const IMAGE_FIXTURE =
  "/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/node_modules/storybook/node_modules/@storybook/icons/dist/public/logo.png"

test.use({
  headless: true,
})

async function authenticateDevUser({
  request,
  context,
}: {
  request: Parameters<typeof test>[0]["request"]
  context: Parameters<typeof test>[0]["context"]
}) {
  const response = await request.post(`${API_URL}/auth/dev-login`, {
    data: { email: DEV_EMAIL },
  })

  expect(response.ok()).toBeTruthy()
  const body = await response.json()

  const cookies = [
    {
      name: "access_token",
      value: body.access_token as string,
      domain: "localhost",
      path: "/",
    },
  ]

  if (body.refresh_token) {
    cookies.push({
      name: "refresh_token",
      value: body.refresh_token as string,
      domain: "localhost",
      path: "/",
    })
  }

  await context.addCookies(cookies)
}

async function selectTextInEditor(
  page: Parameters<typeof test>[0]["page"],
  target: string
) {
  await page.locator(".ProseMirror").evaluate((root, searchText) => {
    const textNodes: Array<{ node: Text; start: number; end: number }> = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let current = walker.nextNode()
    let offset = 0
    let fullText = ""

    while (current) {
      const node = current as Text
      const value = node.textContent ?? ""
      textNodes.push({
        node,
        start: offset,
        end: offset + value.length,
      })
      fullText += value
      offset += value.length
      current = walker.nextNode()
    }

    const index = fullText.indexOf(searchText)
    if (index < 0) {
      throw new Error(
        `Could not find "${searchText}" in editor text "${fullText}"`
      )
    }

    const range = document.createRange()
    const startNode = textNodes.find(
      ({ start, end }) => index >= start && index < end
    )
    const endIndex = index + searchText.length
    const endNode = textNodes.find(
      ({ start, end }) => endIndex > start && endIndex <= end
    )

    if (!startNode || !endNode) {
      throw new Error(`Unable to build range for "${searchText}"`)
    }

    range.setStart(startNode.node, index - startNode.start)
    range.setEnd(endNode.node, endIndex - endNode.start)

    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, target)
}

async function chooseFontSize(
  page: Parameters<typeof test>[0]["page"],
  label: "Normal Text" | "Small Heading" | "Normal Heading" | "Large Heading"
) {
  await page.locator("[data-rich-text-command='font-size']").click()
  await page.getByText(label, { exact: true }).last().click()
}

async function uploadEditorImage(
  page: Parameters<typeof test>[0]["page"],
  selectionText = "Beta"
) {
  await selectTextInEditor(page, selectionText)
  const uploadPromise = page.waitForResponse((response) =>
    response.url().includes("/publish/rich-text-image")
  )
  await page.locator("[data-rich-text-command='image']").click()
  await page
    .locator("[data-rich-text-file-input='true']")
    .setInputFiles(IMAGE_FIXTURE)
  const uploadResponse = await uploadPromise
  expect(uploadResponse.ok()).toBeTruthy()

  const image = page.locator(".ProseMirror img").last()
  await expect(image).toBeVisible({ timeout: 30000 })
  return image
}

async function setHoveredImageAlignment(
  page: Parameters<typeof test>[0]["page"],
  alignment: "left" | "right" | "full-width"
) {
  const image = page.locator(".ProseMirror img").last()
  await image.hover()

  const toolbar = page.locator("[data-rich-text-image-toolbar='true']")
  await expect(toolbar).toBeVisible()
  await toolbar.getByRole("button", { name: "Change image alignment" }).click()

  const menu = page.locator("[data-rich-text-image-toolbar-menu='true']")
  await expect(menu).toBeVisible()

  if (alignment === "left") {
    await menu.getByText("Left Align", { exact: true }).click()
  } else if (alignment === "right") {
    await menu.getByText("Right Align", { exact: true }).click()
  } else {
    await menu.getByText("Full Width", { exact: true }).click()
  }
}

async function showImageDropCursor(
  page: Parameters<typeof test>[0]["page"],
  options: {
    imageIndex?: number
    side?: "left" | "right"
  } = {}
) {
  const { imageIndex = -1, side = "left" } = options

  await page.locator(".ProseMirror").evaluate(
    (editorRoot, { imageIndex, side }) => {
      const images = Array.from(
        editorRoot.querySelectorAll("img")
      ) as HTMLImageElement[]

      const image =
        imageIndex >= 0 ? images[imageIndex] : images[images.length - 1]

      if (!image) {
        throw new Error("No editor image available for drag preview test")
      }

      const editorRect = (editorRoot as HTMLElement).getBoundingClientRect()
      const targetX =
        side === "left"
          ? editorRect.left + editorRect.width * 0.25
          : editorRect.left + editorRect.width * 0.75
      const targetY = editorRect.top + editorRect.height * 0.5

      image.dispatchEvent(
        new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
        })
      )

      editorRoot.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
        })
      )
    },
    { imageIndex, side }
  )

  const dropCursor = page.locator(
    ".rich-text-dropcursor.prosemirror-dropcursor-block"
  )
  await expect(dropCursor).toBeVisible()
  return dropCursor
}

test("rich text editor toolbar preserves styling and applies size only to selected text", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120000)

  await authenticateDevUser({ request, context })
  console.log("authenticated dev user")
  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })
  console.log("opened publish project page")

  await page.locator("label[for='full-description']").scrollIntoViewIfNeeded()
  await expect(page.locator("label[for='full-description']")).toBeVisible()
  await expect(
    page.getByText("Enter a full Description", { exact: true })
  ).toBeVisible()
  await page.getByText("Enter a full Description").click()
  console.log("opened rich text editor")

  const editor = page.locator(".ProseMirror").first()
  await expect(editor).toBeVisible()

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.keyboard.press("Backspace")
  await editor.type("Alpha Beta Gamma Delta")
  console.log("typed baseline content")

  await selectTextInEditor(page, "Beta")
  await chooseFontSize(page, "Large Heading")
  await page.locator("[data-rich-text-command='bold']").click()
  console.log("applied large heading and bold to Beta")

  let html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain('data-font-size="large-heading"')
  expect(html).toContain("Alpha ")
  expect(html).toContain(" Gamma Delta")

  await selectTextInEditor(page, "Gamma")
  await page.locator("[data-rich-text-command='italic']").click()
  await selectTextInEditor(page, "Gamma")
  await page.locator("[data-rich-text-command='underline']").click()
  await selectTextInEditor(page, "Gamma")
  await page.locator("[data-rich-text-command='strike']").click()
  console.log("applied italic underline strike to Gamma")

  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain("strong")
  expect(html).toContain("em")
  expect(html).toContain("u")
  expect(html).toContain("s")

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.locator("[data-rich-text-command='bullet-list']").click()
  console.log("converted content to bullet list")

  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain("<ul")
  expect(html).toContain('data-font-size="large-heading"')
  expect(html).toContain("strong")
  expect(html).toContain("em")
  expect(html).toContain("u")
  expect(html).toContain("s")

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.locator("[data-rich-text-command='ordered-list']").click()
  console.log("converted content to ordered list")

  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain("<ol")
  expect(html).toContain('data-font-size="large-heading"')
  expect(html).toContain("strong")
  expect(html).toContain("em")
  expect(html).toContain("u")
  expect(html).toContain("s")

  await selectTextInEditor(page, "Beta")
  await chooseFontSize(page, "Normal Text")
  console.log("returned Beta to normal text")
  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).not.toContain('data-font-size="large-heading">Beta')
  expect(html).toContain("strong")

  await selectTextInEditor(page, "Beta")
  const uploadPromise = page.waitForResponse((response) =>
    response.url().includes("/publish/rich-text-image")
  )
  await page.locator("[data-rich-text-command='image']").click()
  await page
    .locator("[data-rich-text-file-input='true']")
    .setInputFiles(IMAGE_FIXTURE)
  const uploadResponse = await uploadPromise
  console.log("uploaded image")
  expect(uploadResponse.ok()).toBeTruthy()

  await expect(editor.locator("img")).toHaveCount(1, { timeout: 30000 })
})

test("backspace removes list formatting before merging with the previous line", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120000)

  await authenticateDevUser({ request, context })
  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })

  await page.getByText("Enter a full Description").click()

  const editor = page.locator(".ProseMirror").first()
  await expect(editor).toBeVisible()

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.keyboard.press("Backspace")
  await editor.type("Alpha")
  await page.keyboard.press("Enter")
  await editor.type("Beta")

  await selectTextInEditor(page, "Beta")
  await page.locator("[data-rich-text-command='bullet-list']").click()

  let html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain("<ul")
  expect(html).toContain("Beta")

  await editor.evaluate((root) => {
    const target = root.querySelector("li p")
    if (!target) {
      throw new Error("Could not find list item paragraph")
    }

    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(target.firstChild ?? target, 0)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  })

  await page.keyboard.press("Backspace")

  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).not.toContain("<ul")
  expect(html).toContain("<p>Alpha</p>")
  expect(html).toContain("<p>Beta</p>")

  await editor.evaluate((root) => {
    const paragraphs = Array.from(root.querySelectorAll("p"))
    const target = paragraphs.find((node) => node.textContent === "Beta")
    if (!target) {
      throw new Error("Could not find Beta paragraph")
    }

    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(target.firstChild ?? target, 0)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  })

  await page.keyboard.press("Backspace")

  html = await editor.evaluate((node) => node.innerHTML)
  expect(html).toContain("AlphaBeta")
})

test("image drag preview reflects alignment with blue 2px dropcursor", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120000)

  await authenticateDevUser({ request, context })
  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })

  await page.getByText("Enter a full Description").click()

  const editor = page.locator(".ProseMirror").first()
  await expect(editor).toBeVisible()

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.keyboard.press("Backspace")
  await editor.type("Alpha")
  await page.keyboard.press("Enter")
  await editor.type("Beta")
  await page.keyboard.press("Enter")

  await uploadEditorImage(page)

  await setHoveredImageAlignment(page, "left")
  const leftDropCursor = await showImageDropCursor(page, { side: "left" })

  let leftDropCursorStyles = await leftDropCursor.evaluate((node) => {
    const computed = window.getComputedStyle(node)
    return {
      backgroundColor: computed.backgroundColor,
      height: computed.height,
      width: computed.width,
      left: computed.left,
    }
  })

  expect(leftDropCursorStyles.backgroundColor).toBe("rgb(48, 108, 254)")
  expect(leftDropCursorStyles.height).toBe("2px")

  const editorWidth = await editor.evaluate(
    (node) => window.getComputedStyle(node).width
  )
  expect(leftDropCursorStyles.width).not.toBe(editorWidth)

  const rightDropCursor = await showImageDropCursor(page, { side: "right" })

  const rightDropCursorStyles = await rightDropCursor.evaluate((node) => {
    const computed = window.getComputedStyle(node)
    return {
      backgroundColor: computed.backgroundColor,
      height: computed.height,
      width: computed.width,
      left: computed.left,
    }
  })

  expect(rightDropCursorStyles.backgroundColor).toBe("rgb(48, 108, 254)")
  expect(rightDropCursorStyles.height).toBe("2px")
  expect(rightDropCursorStyles.width).toBe(leftDropCursorStyles.width)
  expect(rightDropCursorStyles.left).not.toBe(leftDropCursorStyles.left)

  await page.locator(".ProseMirror").evaluate((editorRoot) => {
    const image = editorRoot.querySelector("img")
    image?.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
      })
    )
  })

  await setHoveredImageAlignment(page, "full-width")
  const fullWidthDropCursor = await showImageDropCursor(page, { side: "left" })
  const fullWidthDropCursorStyles = await fullWidthDropCursor.evaluate(
    (node) => {
      const computed = window.getComputedStyle(node)
      return {
        backgroundColor: computed.backgroundColor,
        height: computed.height,
        width: computed.width,
      }
    }
  )

  expect(fullWidthDropCursorStyles.backgroundColor).toBe("rgb(48, 108, 254)")
  expect(fullWidthDropCursorStyles.height).toBe("2px")
  expect(fullWidthDropCursorStyles.width).toBe(editorWidth)
})

test("toolbar only appears for text selection and survives pin/unpin", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120000)

  await authenticateDevUser({ request, context })
  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })

  await page.getByText("Enter a full Description").click()
  await page.waitForTimeout(250)

  await expect(
    page.locator("[data-rich-text-editor-toolbar='true']")
  ).toHaveCount(0)

  const editor = page.locator(".ProseMirror").first()
  await expect(editor).toBeVisible()

  await editor.click()
  await page.keyboard.press("Meta+A")
  await page.keyboard.press("Backspace")
  await editor.type("Alpha Beta Gamma")

  await selectTextInEditor(page, "Beta")
  await expect(
    page.locator("[data-rich-text-editor-toolbar='true']")
  ).toHaveCount(1)

  const toolbar = page.locator("[data-rich-text-editor-toolbar='true']").first()
  const editorBox = await editor.boundingBox()
  expect(editorBox).toBeTruthy()

  await page.locator("[data-rich-text-command='toggle-pin']").click()
  await page.waitForTimeout(300)

  const pinnedToolbar = page
    .locator("[data-rich-text-editor-toolbar='true']")
    .first()
  const pinnedBox = await pinnedToolbar.boundingBox()
  expect(pinnedBox).toBeTruthy()
  expect(pinnedBox!.y).toBeLessThan(editorBox!.y)

  await page.locator("[data-rich-text-command='toggle-pin']").click()
  await page.waitForTimeout(300)

  await expect(
    page.locator("[data-rich-text-editor-toolbar='true']")
  ).toHaveCount(1)
})

test("fullscreen editor opens with constrained content width", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(120000)

  await authenticateDevUser({ request, context })
  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded" })

  await page.locator("label[for='full-description']").scrollIntoViewIfNeeded()
  await page.locator("[data-rich-text-fullscreen-toggle='true']").click()

  const dialog = page.locator("[data-rich-text-fullscreen-dialog='true']")
  await expect(dialog).toBeVisible()
  await expect(
    page.locator("[data-rich-text-fullscreen-dialog='true'] nav h2")
  ).toHaveText("Project Description")

  const contentWidth = await page
    .locator("[data-rich-text-fullscreen-content='true']")
    .evaluate((node) => window.getComputedStyle(node).width)

  expect(contentWidth).toBe("818px")
})

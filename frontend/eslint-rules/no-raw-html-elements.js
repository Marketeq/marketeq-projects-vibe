/**
 * ESLint rule: no-raw-html-elements
 *
 * Bans raw HTML elements in app/ when a design system component exists.
 * COMPONENTS.md is the ONLY source of UI components — ABSOLUTE LAW.
 */

const BANNED_ELEMENTS = {
  button: "Use <Button> or <IconButton> from @/components/ui",
  label: "Use <Label> from @/components/ui",
  input: "Use <Input> from @/components/ui",
  textarea: "Use <Textarea> from @/components/ui",
  select: "Use <Select> or <Popover> + <Button> from @/components/ui",
  dialog: "Use <Dialog> from @/components/ui",
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw HTML elements when a design system component exists (COMPONENTS.md)",
    },
    messages: {
      noRawHtml:
        "Do not use raw <{{element}}>. {{replacement}}. See COMPONENTS.md.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name && node.name.name
        if (!name) return

        const lower = name.toLowerCase()
        if (lower !== name) return // PascalCase = component, skip

        const replacement = BANNED_ELEMENTS[lower]
        if (!replacement) return

        context.report({
          node,
          messageId: "noRawHtml",
          data: { element: lower, replacement },
        })
      },
    }
  },
}

import { Mark, mergeAttributes } from "@tiptap/core"

export type FontSizeVariant =
  | "small-heading"
  | "normal-heading"
  | "large-heading"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: FontSizeVariant) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

export const FontSizeExtension = Mark.create({
  name: "fontSize",

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-font-size"),
        renderHTML: (attributes) => {
          if (!attributes.size) {
            return {}
          }

          return {
            "data-font-size": attributes.size,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span[data-font-size]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (size: FontSizeVariant) =>
        ({ commands }) =>
          commands.setMark(this.name, { size }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

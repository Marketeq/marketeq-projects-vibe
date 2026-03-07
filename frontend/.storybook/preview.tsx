import React from "react"
import type { Preview } from "@storybook/react"
import "react-international-phone/style.css"
import "swiper/css"
import "swiper/css/effect-fade"
import "swiper/css/navigation"
import "swiper/css/pagination"
import "@/styles/globals.css"
import { font } from "../utils/font"

const Font = ({ children }: { children: React.ReactNode }) => {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = ref.current

    if (!element) return

    const doc = element.ownerDocument
    doc.documentElement.classList.add(font.className)
  }, [])

  return <div ref={ref}>{children}</div>
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <Font>
        <Story />
      </Font>
    ),
  ],
}

export default preview

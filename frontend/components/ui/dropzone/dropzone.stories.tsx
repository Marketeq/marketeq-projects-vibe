import React from "react"
import { debounce } from "@/utils/functions"
import { useUnmountEffect } from "@/utils/hooks"
import { Meta, StoryObj } from "@storybook/react"
import { Dropzone, DropzoneState } from "@/components/ui"

const meta: Meta = {
  title: "Dropzone",
  parameters: {
    design: [
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-82132&mode=design&t=sYSRlxVlbWw5O6kd-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-82459&mode=design&t=sYSRlxVlbWw5O6kd-4",
      },
    ],
  },
}

export default meta

export const Default: StoryObj = {
  argTypes: {
    maxFiles: {
      control: { type: "number", min: 0 },
    },
    icon: {
      type: "boolean",
    },
    accepted: {
      control: "multi-select",
      options: [
        ".jpg",
        ".jpeg",
        ".png",
        ".svg",
        ".bmp",
        ".webp",
        ".pdf",
        ".lottie",
      ],
    },
  },
  args: {
    icon: true,
  },
  render: (args) => <Dropzone {...args} />,
}

export const DefaultDestructive = () => {
  const [data, setState] = React.useState<DropzoneState>()
  const ref = React.useRef(new Set<() => void>())

  useUnmountEffect(() => {
    ref.current.forEach((cb) => cb())
    ref.current.clear()
  })

  return (
    <Dropzone
      value={data}
      maxFiles={2}
      onValueChange={(value) => {
        setState(value)

        ref.current.forEach((cb) => cb())
        ref.current.clear()

        ref.current.add(
          debounce(
            () =>
              setState(
                (prev) => prev?.map((value) => ({ ...value, progress: 50 }))
              ),
            1000 * 3
          ).cancel
        )
        ref.current.add(
          debounce(
            () =>
              setState(
                (prev) => prev?.map((value) => ({ ...value, hasError: true }))
              ),
            1000 * 6
          ).cancel
        )
      }}
    />
  )
}

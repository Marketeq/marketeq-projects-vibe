import { Meta, StoryObj } from "@storybook/react"
import { ScrollArea, ScrollBar } from "@/components/ui"

const meta: Meta = {
  title: "ScrollAria",
}

export default meta

export const Default: StoryObj = {
  render: () => (
    <div className="rounded-lg bg-gray-50">
      <ScrollArea
        className="h-80"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="min-h-screen" />
      </ScrollArea>
    </div>
  ),
}

export const ScrollVariant: StoryObj = {
  render: () => (
    <div className="rounded-lg bg-gray-50">
      <ScrollArea
        className="h-80"
        scrollBar={<ScrollBar className="w-4 p-1" />}
        type="scroll"
      >
        <div className="min-h-screen" />
      </ScrollArea>
    </div>
  ),
}

export const AlwaysVariant: StoryObj = {
  render: () => (
    <div className="rounded-lg bg-gray-50">
      <ScrollArea
        className="h-80"
        scrollBar={<ScrollBar className="w-4 p-1" />}
        type="always"
      >
        <div className="min-h-screen" />
      </ScrollArea>
    </div>
  ),
}

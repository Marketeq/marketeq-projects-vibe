import { Meta, StoryObj } from "@storybook/react"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"

const meta: Meta = {
  title: "ToggleGroup",
  component: ToggleGroupRoot,
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design",
    },
  },
}

export default meta

type Story = StoryObj<typeof ToggleGroupRoot>

export const Default: Story = {
  render: () => (
    <ToggleGroupRoot defaultValue={["daily"]}>
      <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
      <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
      <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
    </ToggleGroupRoot>
  ),
}

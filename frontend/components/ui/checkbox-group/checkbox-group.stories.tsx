import { Meta, StoryObj } from "@storybook/react"
import {
  Checkbox,
  CheckboxGroup,
  CheckboxSelector,
  HelperText,
  Label,
} from "@/components/ui"

const meta: Meta = {
  title: "CheckboxGroup",
  component: CheckboxGroup,
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=934-196241&mode=design&t=gTVxpZUAC2dAusau-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof CheckboxGroup>

export const SmLabel: Story = {
  render: (args) => {
    return (
      <CheckboxGroup {...args}>
        <div className="flex gap-x-3">
          <Checkbox value="Option 1" id="option-one" />
          <Label htmlFor="option-one">Option 1</Label>
        </div>

        <div className="flex gap-x-3">
          <Checkbox value="Option 2" id="option-two" />
          <Label htmlFor="option-two">Option 2</Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const MdLabel: Story = {
  render: (args) => {
    return (
      <CheckboxGroup className="space-y-3" {...args}>
        <div className="flex gap-x-3.5">
          <Checkbox size="md" value="Option 1" id="option-one" />
          <Label size="sm" htmlFor="option-one">
            Option 1
          </Label>
        </div>

        <div className="flex gap-x-3.5">
          <Checkbox size="md" value="Option 2" id="option-two" />
          <Label size="sm" htmlFor="option-two">
            Option 2
          </Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const LgLabel: Story = {
  render: (args) => {
    return (
      <CheckboxGroup className="space-y-3.5" {...args}>
        <div className="flex gap-x-4">
          <Checkbox size="lg" value="Option 1" id="option-one" />
          <Label size="md" htmlFor="option-one">
            Option 1
          </Label>
        </div>

        <div className="flex gap-x-4">
          <Checkbox size="lg" value="Option 2" id="option-two" />
          <Label size="md" htmlFor="option-two">
            Option 2
          </Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const SmLabelHelperText: Story = {
  render: (args) => {
    return (
      <CheckboxGroup {...args}>
        <div className="flex gap-x-3">
          <Checkbox value="Option 1" id="option-one" />
          <Label className="flex flex-col" htmlFor="option-one">
            Option 1<HelperText>Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-3">
          <Checkbox value="Option 2" id="option-two" />
          <Label className="flex flex-col" htmlFor="option-two">
            Option 2<HelperText>Short description here</HelperText>
          </Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const MdLabelHelperText: Story = {
  render: (args) => {
    return (
      <CheckboxGroup className="space-y-3" {...args}>
        <div className="flex gap-x-3.5">
          <Checkbox size="md" value="Option 1" id="option-one" />
          <Label size="sm" className="flex flex-col" htmlFor="option-one">
            Option 1 <HelperText size="sm">Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-3.5">
          <Checkbox size="md" value="Option 2" id="option-two" />
          <Label size="sm" className="flex flex-col" htmlFor="option-two">
            Option 2 <HelperText size="sm">Short description here</HelperText>
          </Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const LgLabelHelperText: Story = {
  render: (args) => {
    return (
      <CheckboxGroup className="space-y-3.5" {...args}>
        <div className="flex gap-x-4">
          <Checkbox size="lg" value="Option 1" id="option-one" />
          <Label className="flex flex-col" size="md" htmlFor="option-one">
            Option 1 <HelperText size="md">Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-4">
          <Checkbox size="lg" value="Option 2" id="option-two" />
          <Label className="flex flex-col" size="md" htmlFor="option-two">
            Option 2 <HelperText size="md">Short description here</HelperText>
          </Label>
        </div>
      </CheckboxGroup>
    )
  },
}

export const SmSelector: Story = {
  render: (args) => (
    <CheckboxGroup className="grid gap-y-2 space-y-2" {...args}>
      <CheckboxSelector>
        <Label>Option 1</Label>
        <HelperText>Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector>
        <Label>Option 1</Label>
        <HelperText>Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector>
        <Label>Option 1</Label>
        <HelperText>Short description here</HelperText>
      </CheckboxSelector>
    </CheckboxGroup>
  ),
}

export const MdSelector: Story = {
  render: (args) => (
    <CheckboxGroup className="grid gap-y-2" {...args}>
      <CheckboxSelector size="md">
        <Label size="sm">Option 1</Label>
        <HelperText size="sm">Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector size="md">
        <Label size="sm">Option 1</Label>
        <HelperText size="sm">Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector size="md">
        <Label size="sm">Option 1</Label>
        <HelperText size="sm">Short description here</HelperText>
      </CheckboxSelector>
    </CheckboxGroup>
  ),
}

export const LgSelector: Story = {
  render: (args) => (
    <CheckboxGroup className="grid gap-y-2 space-y-3" {...args}>
      <CheckboxSelector size="lg">
        <Label size="md">Option 1</Label>
        <HelperText size="md">Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector size="lg">
        <Label size="md">Option 1</Label>
        <HelperText size="md">Short description here</HelperText>
      </CheckboxSelector>
      <CheckboxSelector size="lg">
        <Label size="md">Option 1</Label>
        <HelperText size="md">Short description here</HelperText>
      </CheckboxSelector>
    </CheckboxGroup>
  ),
}

import { Meta, StoryObj } from "@storybook/react"
import {
  HelperText,
  Label,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemSelector,
} from "@/components/ui"

const meta: Meta = {
  title: "RadioGroup",
  component: RadioGroup,
  argTypes: {
    disabled: {
      control: "boolean",
    },
  },
  args: {
    disabled: false,
  },
}

export default meta

type Story = StoryObj<typeof RadioGroup>

export const SmLabel: Story = {
  render: (args) => {
    return (
      <RadioGroup {...args}>
        <div className="flex gap-x-3">
          <RadioGroupItem value="Option 1" id="sm-option-one" />
          <Label htmlFor="sm-option-one">Option 1</Label>
        </div>

        <div className="flex gap-x-3">
          <RadioGroupItem value="Option 2" id="sm-option-two" />
          <Label htmlFor="sm-option-two">Option 2</Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202143&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const MdLabel: Story = {
  render: (args) => {
    return (
      <RadioGroup className="gap-y-3" {...args}>
        <div className="flex gap-x-3.5">
          <RadioGroupItem size="md" value="Option 1" id="md-option-one" />
          <Label size="sm" htmlFor="md-option-one">
            Option 1
          </Label>
        </div>

        <div className="flex gap-x-3.5">
          <RadioGroupItem size="md" value="Option 2" id="md-option-two" />
          <Label size="sm" htmlFor="md-option-two">
            Option 2
          </Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202225&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const LgLabel: Story = {
  render: (args) => {
    return (
      <RadioGroup className="gap-y-3.5" {...args}>
        <div className="flex gap-x-4">
          <RadioGroupItem size="lg" value="Option 1" id="lg-option-one" />
          <Label size="md" htmlFor="lg-option-one">
            Option 1
          </Label>
        </div>

        <div className="flex gap-x-4">
          <RadioGroupItem size="lg" value="Option 2" id="lg-option-two" />
          <Label size="md" htmlFor="lg-option-two">
            Option 2
          </Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202303&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const SmLabelHelperText: Story = {
  render: (args) => {
    return (
      <RadioGroup {...args}>
        <div className="flex gap-x-3">
          <RadioGroupItem value="Option 1" id="sm-lh-option-one" />
          <Label className="flex flex-col" htmlFor="sm-lh-option-one">
            Option 1<HelperText>Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-3">
          <RadioGroupItem value="Option 2" id="sm-lh-option-two" />
          <Label className="flex flex-col" htmlFor="sm-lh-option-two">
            Option 2<HelperText>Short description here</HelperText>
          </Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202158&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const MdLabelHelperText: Story = {
  render: (args) => {
    return (
      <RadioGroup className="gap-y-3" {...args}>
        <div className="flex gap-x-3.5">
          <RadioGroupItem size="md" value="Option 1" id="md-lh-option-one" />
          <Label size="sm" className="flex flex-col" htmlFor="md-lh-option-one">
            Option 1 <HelperText size="sm">Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-3.5">
          <RadioGroupItem size="md" value="Option 2" id="md-lh-option-two" />
          <Label size="sm" className="flex flex-col" htmlFor="md-lh-option-two">
            Option 2 <HelperText size="sm">Short description here</HelperText>
          </Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202219&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const LgLabelHelperText: Story = {
  render: (args) => {
    return (
      <RadioGroup className="gap-y-3.5" {...args}>
        <div className="flex gap-x-4">
          <RadioGroupItem size="lg" value="Option 1" id="lg-lh-option-one" />
          <Label className="flex flex-col" size="md" htmlFor="lg-lh-option-one">
            Option 1 <HelperText size="md">Short description here</HelperText>
          </Label>
        </div>

        <div className="flex gap-x-4">
          <RadioGroupItem size="lg" value="Option 2" id="lg-lh-option-two" />
          <Label className="flex flex-col" size="md" htmlFor="lg-lh-option-two">
            Option 2 <HelperText size="md">Short description here</HelperText>
          </Label>
        </div>
      </RadioGroup>
    )
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-202297&mode=design&t=oI200WrSfiwzeWIG-4",
    },
  },
}

export const SmRadioGroupItemSelector: Story = {
  render: (args) => (
    <RadioGroup className="gap-y-2" {...args}>
      <RadioGroupItemSelector value="Option 1">
        <Label asChild>
          <span>Option 1</span>
        </Label>
        <HelperText>Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector value="Option 2">
        <Label asChild>
          <span>Option 2</span>
        </Label>
        <HelperText>Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector value="Option 3">
        <Label asChild>
          <span>Option 3</span>
        </Label>
        <HelperText>Short description here</HelperText>
      </RadioGroupItemSelector>
    </RadioGroup>
  ),
}

export const MdRadioGroupItemSelector: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <RadioGroupItemSelector size="md" value="Option 1">
        <Label size="sm" asChild>
          <span>Option 1</span>
        </Label>
        <HelperText size="sm">Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector size="md" value="Option 2">
        <Label size="sm" asChild>
          <span>Option 2</span>
        </Label>
        <HelperText size="sm">Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector size="md" value="Option 3">
        <Label size="sm" asChild>
          <span>Option 3</span>
        </Label>
        <HelperText size="sm">Short description here</HelperText>
      </RadioGroupItemSelector>
    </RadioGroup>
  ),
}

export const LgRadioGroupItemSelector: Story = {
  render: (args) => (
    <RadioGroup className="gap-y-3" {...args}>
      <RadioGroupItemSelector size="lg" value="Option 1">
        <Label size="md" asChild>
          <span>Option 1</span>
        </Label>
        <HelperText size="md">Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector size="lg" value="Option 2">
        <Label size="md" asChild>
          <span>Option 2</span>
        </Label>
        <HelperText size="md">Short description here</HelperText>
      </RadioGroupItemSelector>
      <RadioGroupItemSelector size="lg" value="Option 3">
        <Label size="md" asChild>
          <span>Option 3</span>
        </Label>
        <HelperText size="md">Short description here</HelperText>
      </RadioGroupItemSelector>
    </RadioGroup>
  ),
}

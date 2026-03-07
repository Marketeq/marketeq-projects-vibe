import { Meta, StoryObj } from "@storybook/react"
import { HelperText, Label, Switch } from "@/components/ui"

const meta: Meta = {
  title: "Switch",
  component: Switch,
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    visual: {
      control: "select",
      options: ["blue", "gray"],
    },
    disabled: {
      control: "boolean",
    },
  },
  args: {
    disabled: false,
  },
}

type Story = StoryObj<typeof Switch>

export default meta

export const Sm: Story = {
  args: {},
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=515-201831&mode=design&t=rlIa0Hm4A6BZWLwF-4",
    },
  },
}

export const Md: Story = {
  args: {
    size: "md",
  },
  parameters: {
    ...Sm.parameters,
  },
}

export const Lg: Story = {
  args: {
    size: "md",
  },
  parameters: {
    ...Sm.parameters,
  },
}

export const SmLabel: Story = {
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => (
    <div className="flex gap-x-2">
      <Switch {...args} />
      <Label className="text-gray-700" size="sm">
        Remember me
      </Label>
    </div>
  ),
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=590-200837&mode=design&t=EiSubBX1y4MEt1p6-4",
    },
  },
}

export const MdLabel: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    ...SmLabel.argTypes,
  },
  render: (args) => (
    <div className="flex gap-x-3">
      <Switch {...args} />
      <Label className="text-gray-700" size="md">
        Remember me
      </Label>
    </div>
  ),
  parameters: {
    ...SmLabel.parameters,
  },
}

export const LgLabel: Story = {
  args: {
    size: "lg",
  },
  argTypes: {
    ...SmLabel.argTypes,
  },
  render: (args) => (
    <div className="flex gap-x-3">
      <Switch {...args} />
      <Label className="text-gray-700" size="lg">
        Remember me
      </Label>
    </div>
  ),
  parameters: {
    ...SmLabel.parameters,
  },
}

export const SmLabelHelperText: Story = {
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => (
    <div className="flex gap-x-2">
      <Switch {...args} />
      <Label size="sm" className="flex flex-col text-gray-700">
        Remember me
        <HelperText size="sm">Save my login details for next time.</HelperText>
      </Label>
    </div>
  ),
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=590-200837&mode=design&t=EiSubBX1y4MEt1p6-4",
    },
  },
}

export const MdLabelHelperText: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => (
    <div className="flex gap-x-3">
      <Switch {...args} />
      <Label className="flex flex-col text-gray-700" size="md">
        Remember me
        <HelperText size="md">Save my login details for next time.</HelperText>
      </Label>
    </div>
  ),
  parameters: {
    ...SmLabelHelperText.parameters,
  },
}

export const LgLabelHelperText: Story = {
  args: {
    size: "lg",
  },
  argTypes: {
    size: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => (
    <div className="flex gap-x-3">
      <Switch {...args} />
      <Label className="flex flex-col text-gray-700" size="lg">
        Remember me
        <HelperText size="lg">Save my login details for next time.</HelperText>
      </Label>
    </div>
  ),
  parameters: {
    ...SmLabelHelperText.parameters,
  },
}

import {
  AppleDefault,
  DribbbleDefault,
  FacebookDefault,
  FigmaDefault,
  GoogleDefault,
  TwitterDefault,
} from "@blend-metrics/icons/social"
import {
  AppleSolid,
  DribbbleSolid,
  FacebookSolid,
  FigmaSolid,
  GoogleSolid,
  TwitterSolid,
} from "@blend-metrics/icons/social-solid"
import { Meta, StoryObj } from "@storybook/react"
import { IconButton } from "@/components/ui"

const meta: Meta = {
  title: "Buttons/IconButton",
  component: IconButton,
  argTypes: {
    children: {
      table: {
        disable: true,
      },
    },
    visual: {
      control: false,
    },
    disabled: {
      control: "boolean",
    },
    variant: {
      control: "select",
      options: ["filled", "light", "outlined", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl"],
    },
    leftIcon: {
      table: {
        disable: true,
      },
    },
    rightIcon: {
      table: {
        disable: true,
      },
    },
  },
  args: {
    disabled: false,
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-14104&mode=design&t=Ea0S9qYy4iyxSyMa-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof IconButton>

export const GoogleOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <GoogleDefault />
    </IconButton>
  ),
}

export const FacebookOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <FacebookDefault />
    </IconButton>
  ),
}

export const AppleOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <AppleDefault />
    </IconButton>
  ),
}

export const TwitterOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <TwitterDefault />
    </IconButton>
  ),
}

export const FigmaOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <FigmaDefault />
    </IconButton>
  ),
}

export const DribbbleOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <DribbbleDefault />
    </IconButton>
  ),
}

export const FacebookSolidFilled: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-gray-100 bg-[#1877F2] hover:bg-[#0C63D4]"
    >
      <FacebookSolid className="text-white" />
    </IconButton>
  ),
}

export const AppleSolidFilled: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-gray-100 bg-black hover:bg-black"
    >
      <AppleSolid className="text-white" />
    </IconButton>
  ),
}

export const TwitterSolidFilled: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-gray-100 bg-[#1DA1F2] hover:bg-[#0C8BD9]"
    >
      <TwitterSolid className="text-white" />
    </IconButton>
  ),
}

export const FigmaFilled: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-gray-100 bg-black hover:bg-black"
    >
      <FigmaDefault />
    </IconButton>
  ),
}

export const DribbbleSolidFilled: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="active:ring-gray-100 bg-[#EA4C89] hover:bg-[#E62872]"
    >
      <DribbbleSolid className="text-white" />
    </IconButton>
  ),
}

export const GoogleSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <GoogleSolid />
    </IconButton>
  ),
}

export const FacebookSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: true,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <FacebookSolid />
    </IconButton>
  ),
}

export const AppleSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <AppleSolid />
    </IconButton>
  ),
}

export const TwitterSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <TwitterSolid />
    </IconButton>
  ),
}

export const FigmaSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <FigmaSolid />
    </IconButton>
  ),
}

export const DribbbleSolidOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
    size: {
      control: false,
    },
  },
  render: (args) => (
    <IconButton
      {...args}
      className="text-gray-400 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
    >
      <DribbbleSolid />
    </IconButton>
  ),
}

import { Dot, Plus } from "@blend-metrics/icons"
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
import { Button } from "@/components/ui"

const meta: Meta = {
  title: "Buttons/Button",
  component: Button,
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
    design: [
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-10408&mode=design&t=Ea0S9qYy4iyxSyMa-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-14104&mode=design&t=Ea0S9qYy4iyxSyMa-4",
      },
    ],
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  argTypes: {
    variant: {
      control: "select",
      options: ["filled", "light", "ghost", "link"],
    },
  },
  render: (args) => <Button {...args}>Button</Button>,
}

export const Error: Story = {
  args: {
    visual: "error",
  },
  render: (args) => <Button {...args}>Button</Button>,
}

export const Gray: Story = {
  args: {
    variant: "outlined",
    visual: "gray",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["outlined", "ghost", "link"],
    },
  },
  render: (args) => <Button {...args}>Button</Button>,
}

export const LeftIconPrimary: Story = {
  argTypes: {
    variant: {
      control: "select",
      options: ["filled", "light", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} leftIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const LeftIconError: Story = {
  args: {
    visual: "error",
  },
  render: (args) => (
    <Button {...args} leftIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const LeftIconGray: Story = {
  args: {
    variant: "outlined",
    visual: "gray",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["outlined", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} leftIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const RightIconPrimary: Story = {
  argTypes: {
    variant: {
      control: "select",
      options: ["filled", "light", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} rightIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const RightIconError: Story = {
  args: {
    visual: "error",
  },
  render: (args) => (
    <Button {...args} rightIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const RightIconGray: Story = {
  args: {
    variant: "outlined",
    visual: "gray",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["outlined", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} rightIcon={<Plus />}>
      Button
    </Button>
  ),
}

export const DotIconPrimary: Story = {
  argTypes: {
    variant: {
      control: "select",
      options: ["filled", "light", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} leftIcon={<Dot className="h-2.5 w-2.5" />}>
      Button
    </Button>
  ),
}

export const DotIconError: Story = {
  args: {
    visual: "error",
  },
  render: (args) => (
    <Button {...args} leftIcon={<Dot className="h-2.5 w-2.5" />}>
      Button
    </Button>
  ),
}

export const DotIconGray: Story = {
  args: {
    variant: "outlined",
    visual: "gray",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["outlined", "ghost", "link"],
    },
  },
  render: (args) => (
    <Button {...args} leftIcon={<Dot className="h-2.5 w-2.5" />}>
      Button
    </Button>
  ),
}

export const GoogleOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: false,
    },
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<GoogleDefault />}
    >
      Sign in with Google
    </Button>
  ),
}

export const FacebookOutlined: Story = {
  args: {
    size: "md",
  },
  argTypes: {
    variant: {
      control: true,
    },
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<FacebookDefault />}
    >
      Sign in with Facebook
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<AppleDefault />}
    >
      Sign in with Twitter
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<TwitterDefault />}
    >
      Sign in with Twitter
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<FigmaDefault />}
    >
      Sign in with Twitter
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<DribbbleDefault />}
    >
      Sign in with Dribbble
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 bg-[#1877F2] hover:bg-[#0C63D4] active:ring-gray-100"
      leftIcon={<FacebookSolid className="text-white" />}
    >
      Sign in with Facebook
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 bg-black hover:bg-black active:ring-gray-100"
      leftIcon={<AppleSolid className="text-white" />}
    >
      Sign in with Twitter
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 bg-[#1DA1F2] hover:bg-[#0C8BD9] active:ring-gray-100"
      leftIcon={<TwitterSolid className="text-white" />}
    >
      Sign in with Twitter
    </Button>
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
    <Button
      {...args}
      className="gap-x-3 bg-black hover:bg-black active:ring-gray-100"
      leftIcon={<FigmaDefault />}
    >
      Sign in with Twitter
    </Button>
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
    <Button
      {...args}
      className="gap-x-3 bg-[#EA4C89] hover:bg-[#E62872] active:ring-gray-100"
      leftIcon={<DribbbleSolid className="text-white" />}
    >
      Sign in with Dribbble
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<GoogleSolid className="text-gray-400" />}
    >
      Sign in with Google
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<FacebookSolid className="text-gray-400" />}
    >
      Sign in with Facebook
    </Button>
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
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<AppleSolid className="text-gray-400" />}
    >
      Sign in with Apple
    </Button>
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
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<TwitterSolid className="text-gray-400" />}
    >
      Sign in with Twitter
    </Button>
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
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<FigmaSolid className="text-gray-400" />}
    >
      Sign in with Figma
    </Button>
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
  },
  render: (args) => (
    <Button
      {...args}
      className="gap-x-3 text-gray-700 active:ring-4 active:ring-gray-100"
      visual="gray"
      variant="outlined"
      leftIcon={<DribbbleSolid className="text-gray-400" />}
    >
      Sign in with Dribbble
    </Button>
  ),
}

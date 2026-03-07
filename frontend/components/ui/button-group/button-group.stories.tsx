import {
  AppleDefault,
  FacebookDefault,
  GoogleDefault,
} from "@blend-metrics/icons/social"
import {
  AppleSolid,
  FacebookSolid,
  GoogleSolid,
} from "@blend-metrics/icons/social-solid"
import { Meta, StoryObj } from "@storybook/react"
import { Button, ButtonGroup } from "@/components/ui"

const meta: Meta = {
  title: "ButtonGroup",
  component: ButtonGroup,
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-14376&mode=design&t=YLOI4d2ESB2QHIgZ-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof ButtonGroup>

export const Filled: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button
        className="gap-x-3 focus:ring-gray-100"
        leftIcon={<GoogleDefault />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Google
      </Button>
      <Button
        className="gap-x-3 bg-[#1877F2] hover:bg-[#0C63D4] focus:ring-gray-100"
        leftIcon={<FacebookSolid className="text-white" />}
        size="md"
      >
        Sign in with Facebook
      </Button>
      <Button
        className="gap-x-3 bg-black hover:bg-black focus:ring-gray-100"
        leftIcon={<AppleSolid className="text-white" />}
        size="md"
      >
        Sign in with Twitter
      </Button>
    </ButtonGroup>
  ),
}

export const Outlined: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button
        className="gap-x-3 focus:ring-gray-100"
        leftIcon={<GoogleDefault />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Google
      </Button>
      <Button
        className="gap-x-3 focus:ring-gray-100"
        leftIcon={<FacebookDefault />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Facebook
      </Button>
      <Button
        className="gap-x-3 focus:ring-gray-100"
        leftIcon={<AppleDefault />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Twitter
      </Button>
    </ButtonGroup>
  ),
}

export const GrayOutlined: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button
        className="gap-x-3 text-gray-700 focus:ring-gray-100"
        leftIcon={<GoogleSolid className="text-gray-400" />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Google
      </Button>
      <Button
        className="gap-x-3 text-gray-700 focus:ring-gray-100"
        leftIcon={<FacebookSolid className="text-gray-400" />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Facebook
      </Button>
      <Button
        className="gap-x-3 text-gray-700 focus:ring-gray-100"
        leftIcon={<AppleSolid className="text-gray-400" />}
        size="md"
        variant="outlined"
        visual="gray"
      >
        Sign in with Apple
      </Button>
    </ButtonGroup>
  ),
}

export const IconFilled: Story = {
  render: (args) => (
    <ButtonGroup className="grid grid-cols-3" {...args}>
      <Button
        className="px-2.5 text-gray-700 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <GoogleDefault />
      </Button>

      <Button
        className="bg-[#1877F2] px-2.5 hover:bg-[#0C63D4] focus:ring-gray-100"
        size="md"
      >
        <FacebookSolid className="text-white" />
      </Button>

      <Button
        className="bg-black px-2.5 hover:bg-black focus:ring-gray-100"
        size="md"
      >
        <AppleSolid className="text-white" />
      </Button>
    </ButtonGroup>
  ),
}

export const IconOutlined: Story = {
  render: (args) => (
    <ButtonGroup className="grid grid-cols-3" {...args}>
      <Button
        className="px-2.5 text-gray-700 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <GoogleDefault />
      </Button>
      <Button
        className="px-2.5 text-gray-700 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <FacebookDefault />
      </Button>
      <Button
        className="px-2.5 text-gray-700 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <AppleDefault />
      </Button>
    </ButtonGroup>
  ),
}

export const GrayIconOutlined: Story = {
  render: (args) => (
    <ButtonGroup className="grid grid-cols-3" {...args}>
      <Button
        className="px-2.5 text-gray-400 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <GoogleSolid />
      </Button>
      <Button
        className="px-2.5 text-gray-400 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <FacebookSolid />
      </Button>
      <Button
        className="px-2.5 text-gray-400 focus:ring-gray-100"
        size="md"
        variant="outlined"
        visual="gray"
      >
        <AppleSolid />
      </Button>
    </ButtonGroup>
  ),
}

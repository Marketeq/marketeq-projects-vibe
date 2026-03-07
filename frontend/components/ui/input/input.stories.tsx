import { AlertCircle, HelpCircle, LifeBuoy01, Mail } from "@blend-metrics/icons"
import { MastercardDefault } from "@blend-metrics/icons/payment-methods"
import { Meta, StoryObj } from "@storybook/react"
import {
  ErrorMessage,
  HelperText,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightElement,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"

const meta: Meta = {
  title: "Input",
  component: Input,
  argTypes: {
    disabled: {
      control: "boolean",
    },
    isInvalid: {
      control: false,
    },
  },
  args: {
    disabled: false,
  },
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=111-182232&mode=design&t=jbmMcUZb7UWd45mh-4",
    },
  },
}

export default meta

type Story = StoryObj<typeof Input>

export const Base: Story = {
  render: (args) => (
    <Input type="email" placeholder="olivia@untitledui.com" {...args} />
  ),
}

export const BaseDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <InputGroup>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputRightElement>
        <AlertCircle className="text-error-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <Input
        id="email"
        type="email"
        placeholder="olivia@untitledui.com"
        {...args}
      />
    </div>
  ),
}

export const LabeledBaseDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextBase: Story = {
  render: ({ ...args }) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <Input
        id="email"
        type="email"
        placeholder="olivia@untitledui.com"
        {...args}
      />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextBaseDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelperTextBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextBaseDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelpCircleBase: Story = {
  render: (args) => (
    <InputGroup>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputRightElement>
        <HelpCircle className="text-gray-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledHelpCircleBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextHelpCircleBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextHelpCircleBase: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const EmailIcon: Story = {
  render: (args) => (
    <InputGroup>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputLeftElement>
        <Mail className="text-gray-500 h-5 w-5" />
      </InputLeftElement>
    </InputGroup>
  ),
}

export const EmailIconDestructive: Story = {
  args: { isInvalid: true },
  render: (args) => (
    <InputGroup>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputLeftElement>
        <Mail className="text-gray-500 h-5 w-5" />
      </InputLeftElement>
      <InputRightElement>
        <AlertCircle className="text-error-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledEmail: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledEmailDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextEmail: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextEmailDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelperTextEmail: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextEmailDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const EmailHelpCircle: Story = {
  render: (args) => (
    <InputGroup>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputLeftElement>
        <Mail className="text-gray-500 h-5 w-5" />
      </InputLeftElement>
      <InputRightElement>
        <HelpCircle className="text-gray-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledEmailHelpCircle: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextEmailHelpCircle: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextEmailHelpCircle: Story = {
  render: ({ isInvalid, ...args }) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputLeftElement>
          <Mail className="text-gray-500 h-5 w-5" />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const MasterCardIcon: Story = {
  render: (args) => (
    <InputGroup>
      <Input
        className="pl-[52px]"
        type="email"
        placeholder="olivia@untitledui.com"
        {...args}
      />
      <InputLeftElement className="w-[52px]">
        <MastercardDefault />
      </InputLeftElement>
    </InputGroup>
  ),
}

export const MasterCardIconDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <InputGroup>
      <Input
        className="pl-[52px]"
        type="email"
        placeholder="olivia@untitledui.com"
        {...args}
      />
      <InputLeftElement className="w-[52px]">
        <MastercardDefault />
      </InputLeftElement>
      <InputRightElement>
        <AlertCircle className="text-error-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledMasterCard: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledMasterCardDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextMasterCard: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextMasterCardDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelperTextMasterCard: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input
          className="pl-[52px]"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextMasterCardDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input
          className="pl-[52px]"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement>
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is a hint text to help user.</ErrorMessage>
    </div>
  ),
}

export const MasterCardHelpCircle: Story = {
  render: (args) => (
    <InputGroup>
      <Input
        className="pl-[52px]"
        type="email"
        placeholder="olivia@untitledui.com"
        {...args}
      />
      <InputLeftElement className="w-[52px]">
        <MastercardDefault />
      </InputLeftElement>
      <InputRightElement>
        <HelpCircle className="text-gray-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledMasterCardHelpCircle: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextMasterCardHelpCircle: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextMasterCardHelpCircle: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <Input
          className="pl-[52px]"
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputLeftElement className="w-[52px]">
          <MastercardDefault />
        </InputLeftElement>
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LeftAddon: Story = {
  render: (args) => (
    <InputGroup>
      <InputLeftAddon>https://</InputLeftAddon>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
    </InputGroup>
  ),
}

export const LeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <InputGroup>
      <InputLeftAddon>https://</InputLeftAddon>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputRightElement>
        <AlertCircle className="text-error-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
      </InputGroup>
    </div>
  ),
}

export const LabeledLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <ErrorMessage size="sm">This is a hint text to help user.</ErrorMessage>
    </div>
  ),
}

export const HelperTextLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      </InputGroup>
      <ErrorMessage size="sm">This is a hint text to help user.</ErrorMessage>
    </div>
  ),
}

export const HelpCircleLeftAddon: Story = {
  render: (args) => (
    <InputGroup>
      <InputLeftAddon>https://</InputLeftAddon>
      <Input type="email" placeholder="olivia@untitledui.com" {...args} />
      <InputRightElement>
        <HelpCircle className="text-gray-500 h-4 w-4" />
      </InputRightElement>
    </InputGroup>
  ),
}

export const LabeledHelpCircleLeftAddon: Story = {
  render: ({ ...args }) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelperTextHelpCircleLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Email
      </Label>
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input
          id="email"
          type="email"
          placeholder="olivia@untitledui.com"
          {...args}
        />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextHelpCircleLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <InputGroup>
        <InputLeftAddon>https://</InputLeftAddon>
        <Input type="email" placeholder="olivia@untitledui.com" {...args} />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const SelectLeftAddon: Story = {
  render: (args) => (
    <div className="flex items-center">
      <Select defaultValue="US">
        <SelectTrigger>
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="RS">RS</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="LV">LV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Input
        className="rounded-l-none"
        type="tel"
        placeholder="+1 (555) 000-0000"
        {...args}
      />
    </div>
  ),
}

export const SelectLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="flex items-center">
      <Select defaultValue="US">
        <SelectTrigger>
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="RS">RS</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="LV">LV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <InputGroup>
        <Input
          className="rounded-l-none"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
        <InputRightElement>
          <AlertCircle className="text-error-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="tel">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          className="rounded-l-none"
          id="tel"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
      </div>
    </div>
  ),
}

export const LabeledSelectLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="tel">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          className="rounded-l-none"
          id="tel"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
      </div>
    </div>
  ),
}

export const LabeledHelperTextSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="tel">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          className="rounded-l-none"
          id="tel"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextSelectLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="tel">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup>
          <Input
            className="rounded-l-none"
            id="tel"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...args}
          />
          <InputRightElement>
            <AlertCircle className="text-error-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
      </div>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelperTextSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          className="rounded-l-none"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextSelectLeftAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup>
          <Input
            className="rounded-l-none"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...args}
          />
        </InputGroup>
      </div>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelpCircleSelectLeftAddon: Story = {
  render: (args) => (
    <div className="flex items-center">
      <Select defaultValue="US">
        <SelectTrigger>
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="RS">RS</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="LV">LV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <InputGroup>
        <Input
          className="rounded-l-none"
          type="tel"
          placeholder="+1 (555) 000-0000"
          {...args}
        />
        <InputRightElement>
          <HelpCircle className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
    </div>
  ),
}

export const LabeledHelpCircleSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="tel">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup>
          <Input
            className="rounded-l-none"
            id="tel"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...args}
          />
          <InputRightElement>
            <HelpCircle className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
      </div>
    </div>
  ),
}

export const LabeledHelperTextHelpCircleSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="email">
        Phone number
      </Label>
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup>
          <Input
            className="rounded-l-none"
            id="tel"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...args}
          />
          <InputRightElement>
            <HelpCircle className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextHelpCircleSelectLeftAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <Select defaultValue="US">
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <InputGroup>
          <Input
            className="rounded-l-none"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...args}
          />
          <InputRightElement>
            <HelpCircle className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const SelectRightAddon: Story = {
  render: (args) => (
    <div className="flex items-center">
      <InputGroup>
        <Input
          className="rounded-r-none"
          type="text"
          placeholder="10,000.00"
          {...args}
        />
        <InputLeftElement className="text-gray-500">$</InputLeftElement>
      </InputGroup>
      <Select defaultValue="US">
        <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0">
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="RS">RS</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="LV">LV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const SelectRightAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <AlertCircle className="text-error-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const LabeledSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}

export const LabeledSelectRightAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <AlertCircle className="text-error-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}

export const LabeledHelperTextSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const LabeledHelperTextSelectRightAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <AlertCircle className="text-error-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelperTextSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            type="money"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextSelectRightAddonDestructive: Story = {
  args: {
    isInvalid: true,
  },
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            type="money"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <AlertCircle className="text-error-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <ErrorMessage size="sm">This is an error message.</ErrorMessage>
    </div>
  ),
}

export const HelpCircleSelectRightAddon: Story = {
  render: (args) => (
    <div className="flex items-center">
      <InputGroup>
        <Input
          className="rounded-r-none"
          type="money"
          placeholder="10,000.00"
          {...args}
        />
        <InputLeftElement className="text-gray-500">$</InputLeftElement>
        <InputRightElement>
          <LifeBuoy01 className="text-gray-500 h-4 w-4" />
        </InputRightElement>
      </InputGroup>
      <Select defaultValue="US">
        <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="BE">BE</SelectItem>
            <SelectItem value="RS">RS</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="LV">LV</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const LabeledHelpCircleSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="money"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <LifeBuoy01 className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}

export const LabeledHelperTextHelpCircleSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <Label size="sm" htmlFor="money">
        Sale amount
      </Label>
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            id="money"
            type="text"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <LifeBuoy01 className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

export const HelperTextHelpCircleSelectRightAddon: Story = {
  render: (args) => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <InputGroup>
          <Input
            className="rounded-r-none"
            type="money"
            placeholder="10,000.00"
            {...args}
          />
          <InputLeftElement className="text-gray-500">$</InputLeftElement>
          <InputRightElement>
            <LifeBuoy01 className="text-gray-500 h-4 w-4" />
          </InputRightElement>
        </InputGroup>
        <Select defaultValue="US">
          <SelectTrigger className="rounded-l-none rounded-r-[5px] border-l-0 border-r">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="BE">BE</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="LV">LV</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <HelperText size="sm">This is a hint text to help user.</HelperText>
    </div>
  ),
}

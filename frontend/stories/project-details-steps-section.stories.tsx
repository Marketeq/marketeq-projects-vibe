import type { Meta, StoryObj } from "@storybook/react"
import { ProjectDetailsStepsSection } from "../components/project-details/project-details-steps-section"
import { SAMPLE_PROJECT_DETAILS_STEPS_FROM_GATEWAY } from "../lib/project-details/fixtures/sample-project-static-from-gateway"
import {
  DEFAULT_PROJECT_STATIC_CONTENT,
  buildProjectStaticContentFromGateway,
} from "../lib/project-details/project-static-content-from-api"

const meta: Meta<typeof ProjectDetailsStepsSection> = {
  title: "Project details / Steps section",
  component: ProjectDetailsStepsSection,
  parameters: { layout: "padded" },
}

export default meta

type Story = StoryObj<typeof ProjectDetailsStepsSection>

export const FromGatewayFixture: Story = {
  args: {
    steps: SAMPLE_PROJECT_DETAILS_STEPS_FROM_GATEWAY,
  },
}

export const DefaultViewModel: Story = {
  args: {
    steps: DEFAULT_PROJECT_STATIC_CONTENT.howItWorks.steps,
  },
}

export const FromMergedGatewayPayload: Story = {
  args: {
    steps: buildProjectStaticContentFromGateway({
      heading: "Peace of Mind Guarantee",
      guaranteeItems: [
        {
          icon: "rocket",
          title: "Row",
          description: "Desc",
        },
        {
          icon: "shield-zap",
          title: "Row",
          description: "Desc",
        },
      ],
      highlightedNotice: {
        icon: "shield-dollar",
        description: "Highlight",
      },
      policy: {
        prefixText: "Prefix",
        linkLabel: "Link",
        linkHref: "/policy",
      },
      howItWorks: { steps: SAMPLE_PROJECT_DETAILS_STEPS_FROM_GATEWAY },
    }).howItWorks.steps,
  },
}

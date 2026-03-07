import { Check, Link, Link01 } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  ClipboardControl,
  ClipboardIndicator,
  ClipboardInput,
  ClipboardLabel,
  ClipboardRoot,
  ClipboardTrigger,
} from "./clipboard"

const meta: Meta = {
  title: "Clipboard",
}

export default meta

export const Default = () => {
  return (
    <ClipboardRoot value="https://projects.marketeqdigital.com/invite/209283">
      <ClipboardLabel>Share an invite link with your team</ClipboardLabel>
      <ClipboardControl>
        <ClipboardInput />
        <ClipboardTrigger>
          <ClipboardIndicator
            copied={
              <>
                <Check className="size-[15px]" /> Copied
              </>
            }
          >
            <Link01 className="size-[15px]" /> Copy Link
          </ClipboardIndicator>
        </ClipboardTrigger>
      </ClipboardControl>
    </ClipboardRoot>
  )
}

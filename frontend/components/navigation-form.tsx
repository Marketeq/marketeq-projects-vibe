import React from "react"
import { Check, CheckCircle } from "@blend-metrics/icons"
import {
  Button,
  HelperText,
  Label,
  RadioGroup,
  RadioGroupItemSelector,
} from "./ui"

export type SessionChoice = "stay-logged-in" | "sign-out-others"

export const NavigationForm = ({
  onContinue,
  isSubmitting,
}: {
  onContinue?: (choice: SessionChoice) => void
  isSubmitting?: boolean
}) => {
  const [option, setOption] = React.useState<SessionChoice>()
  return (
    <div className="py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]">
      <div className="max-w-[420px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]">
        <div className="flex items-center justify-center">
          <div className="size-12 shrink-0 border-[8px] border-success-50 rounded-full inline-flex items-center justify-center bg-success-100 text-success-500">
            <CheckCircle className="size-[24px]" />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-y-8">
          <div className="space-y-2">
            <h1 className="text-lg leading-none text-center font-semibold text-dark-blue-400 mt-5">
              Your password has been successfully updated!
            </h1>

            <p className="text-center text-sm leading-5 text-dark-blue-400">
              Choose whether to stay signed in on your other devices, or sign
              them all out for extra security.
            </p>
          </div>

          <RadioGroup
            className="gap-y-2"
            value={option}
            onValueChange={(value) => setOption(value as SessionChoice)}
          >
            <RadioGroupItemSelector value="stay-logged-in">
              <Label asChild>
                <span>Stay logged in to my devices</span>
              </Label>
              <HelperText>
                Other devices you're signed in on will remain logged in.
              </HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="sign-out-others">
              <Label asChild>
                <span>Sign out of all other devices</span>
              </Label>
              <HelperText>
                For extra security, all other active sessions will be signed
                out.
              </HelperText>
            </RadioGroupItemSelector>
          </RadioGroup>

          <Button
            disabled={!option || isSubmitting}
            onClick={() => option && onContinue?.(option)}
          >
            <Check className="size-[15px]" />
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

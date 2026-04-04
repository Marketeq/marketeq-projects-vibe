import React from "react"
import { Check, CheckCircle } from "@blend-metrics/icons"
import {
  Button,
  HelperText,
  Label,
  RadioGroup,
  RadioGroupItemSelector,
} from "./ui"

export const NavigationForm = () => {
  const [option, setOption] = React.useState<string>()
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
              Porem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero et velit interdum.
            </p>
          </div>

          <RadioGroup
            className="gap-y-2"
            value={option}
            onValueChange={setOption}
          >
            <RadioGroupItemSelector value="Option 1">
              <Label asChild>
                <span>Stay logged in to my devices</span>
              </Label>
              <HelperText>Short description here</HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="Option 2">
              <Label asChild>
                <span>Sign out of all other devices</span>
              </Label>
              <HelperText>Short description here</HelperText>
            </RadioGroupItemSelector>
          </RadioGroup>

          <Button disabled={!option}>
            <Check className="size-[15px]" />
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

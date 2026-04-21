"use client"

import * as React from "react"
import { Check, Lock } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { cn } from "@/utils/functions"

type CheckoutStepNumber = 1 | 2 | 3

type CheckoutNavigationProps = {
  currentStep: CheckoutStepNumber
  firstStepLabel?: string
  showSteps?: boolean
}

const StepIndicator = ({
  step,
  disabled,
  active,
  completed,
}: {
  step: number
  disabled?: boolean
  active?: boolean
  completed?: boolean
}) => (
  <button
    disabled={disabled}
    data-state={active || completed ? "active" : disabled ? "disabled" : undefined}
    className="peer focus-visible:outline-none size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-primary-500 border-primary-500 disabled:text-white disabled:bg-gray-300 disabled:border-gray-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:border-primary-500"
  >
    {completed ? <Check className="size-[15px] shrink-0" /> : step}
  </button>
)

const Step = ({
  label,
  step,
  disabled,
  active,
  completed,
}: {
  label: string
  step: number
  disabled?: boolean
  active?: boolean
  completed?: boolean
}) => (
  <div className="flex gap-x-3 items-center">
    <StepIndicator step={step} disabled={disabled} active={active} completed={completed} />
    <span
      className={cn(
        "text-sm shrink-0 whitespace-nowrap leading-none font-semibold",
        disabled ? "text-gray-300" : "text-dark-blue-400"
      )}
    >
      {label}
    </span>
  </div>
)

export function CheckoutNavigation({
  currentStep,
  firstStepLabel = "Project Details",
  showSteps = true,
}: CheckoutNavigationProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
      <div className="max-w-[1140px] h-[64px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-x-6">
          <Logo3 className="w-[128px] h-[18.81px] shrink-0" />
          <span className="inline-block h-[18px] w-px shrink-0 bg-gray-200" />
          <div className="inline-flex items-center gap-x-2">
            <Lock className="size-[18px] text-gray-500" />
            <span className="text-base font-semibold leading-none text-gray-500">
              Secure Checkout
            </span>
          </div>
        </div>

        {showSteps ? (
          <div className="flex items-center gap-x-3">
            <Step
              step={1}
              label={firstStepLabel}
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <span className="h-0 w-[35px] shrink-0 border-t-2 border-dashed border-gray-300" />
            <Step
              step={2}
              label="Payment Details"
              disabled={currentStep < 2}
              active={currentStep === 2}
              completed={currentStep > 2}
            />
            <span className="h-0 w-[35px] shrink-0 border-t-2 border-dashed border-gray-300" />
            <Step
              step={3}
              label="Review & Pay"
              disabled={currentStep < 3}
              active={currentStep === 3}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

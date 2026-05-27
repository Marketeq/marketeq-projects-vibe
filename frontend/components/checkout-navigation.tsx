"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/utils/functions"
import { Check, Lock } from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import { StepIndicator } from "@/components/ui"

type CheckoutStepNumber = 1 | 2 | 3

type CheckoutNavigationProps = {
  currentStep: CheckoutStepNumber
  firstStepLabel?: string
  showSteps?: boolean
  logoHref?: string
}

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
    <StepIndicator
      index={step - 1}
      disabled={disabled}
      state={active || completed ? "active" : undefined}
    >
      {completed ? <Check className="size-[15px] shrink-0" /> : step}
    </StepIndicator>
    <span
      className={cn(
        "text-sm shrink-0 whitespace-nowrap leading-none font-semibold peer-disabled:text-gray-300 peer-data-[state=disabled]:text-gray-300",
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
  logoHref,
}: CheckoutNavigationProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
      <div className="max-w-[1140px] h-[64px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-x-6">
          {logoHref ? (
            <Link
              href={logoHref}
              className="shrink-0 focus-visible:outline-none"
            >
              <Logo3 className="w-[128px] h-[18.81px] shrink-0" />
            </Link>
          ) : (
            <Logo3 className="w-[128px] h-[18.81px] shrink-0" />
          )}
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

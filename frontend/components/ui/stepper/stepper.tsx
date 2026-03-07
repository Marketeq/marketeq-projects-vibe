"use client"

import React, { Children, useCallback } from "react"
import { createContext, getValidChildren } from "@/utils/react-utils"

interface StepperContextState {
  nextStep: () => void
  prevStep: () => void
  setStep: (index: number) => void
  toggleStepValidation: (index: number) => (isValid: boolean) => void
}

export const [StepperProvider, useStepperContext] =
  createContext<StepperContextState>({
    displayName: "StepperRootContext",
    errorMessage:
      "useStepperContext returns `undefined`. Seems you forgot to wrap your component tree with <StepperProvider />",
  })

interface StepRootContextState {
  hasPreviousStep?: boolean
  hasNextStep?: boolean
  currentStep: number
  totalSteps: number
  stepsState: { label: string; isValid?: boolean; disabled?: boolean }[]
}

export const [StepRootProvider, useStepRootContext] =
  createContext<StepRootContextState>({
    displayName: "StepRootContext",
    errorMessage:
      "useStepRootContext returns `undefined`. Seems you forgot to wrap your component tree with <StepRoot />",
  })

export const StepControl = React.forwardRef<
  React.ElementRef<"div">,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => {
  const { toggleStepValidation } = useStepperContext()
  const { currentStep } = useStepRootContext()
  const steps = Children.toArray(children)
  const validSteps = getValidChildren(steps)

  const getStatus = useCallback(
    ({ currentStep, index }: { currentStep: number; index: number }) => {
      if (currentStep > index) return "completed"
      else if (currentStep < index) return "incomplete"
      return "active"
    },
    []
  )

  return (
    <div {...props} ref={ref}>
      {validSteps.map((validStep, index) => (
        <StepProvider
          value={{
            toggleValidation: toggleStepValidation(index),
            index,
            status: getStatus({ currentStep, index }),
          }}
          key={index}
        >
          {validStep}
        </StepProvider>
      ))}
    </div>
  )
})

StepControl.displayName = "StepControl"

export const [StepProvider, useStepContext] = createContext<{
  toggleValidation: (isValid: boolean) => void
  index: number
  status: "completed" | "incomplete" | "active"
}>({
  displayName: "StepContext",
  errorMessage:
    "useStepContext returns `undefined`. Seems you forgot to wrap your component tree with <Step />",
})

export const Step = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ style, children, ...props }, ref) => {
  const { currentStep } = useStepRootContext()
  const { index, status } = useStepContext()
  const active = index === currentStep
  return (
    <div
      style={{
        display: active ? undefined : "none",
        ...style,
      }}
      {...props}
      ref={ref}
      data-state={active ? "open" : "closed"}
      data-status={status}
    >
      {active ? children : null}
    </div>
  )
})

Step.displayName = "Step"

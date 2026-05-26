import React from "react"
import StepIndicator from "../step-indicator/step-indicator"

export default function CheckoutStep({
  disabled,
  label,
  index,
}: {
  disabled?: boolean
  label?: string
  index: number
}) {
  return (
    <div className="flex gap-x-3 items-center">
      <StepIndicator index={index} disabled={disabled} />
      <span className="text-sm shrink-0 whitespace-nowrap leading-none text-dark-blue-400 font-semibold peer-disabled:text-gray-300 peer-data-[state=disabled]:text-gray-300">
        {label}
      </span>
    </div>
  )
}

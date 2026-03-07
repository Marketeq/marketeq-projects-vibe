"use client"

import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { PhoneNumberUtil } from "google-libphonenumber"
import { FieldValues } from "react-hook-form"
import {
  PhoneInput,
  PhoneInputProps,
  PhoneInputRefType,
} from "react-international-phone"

interface PhoneNumberInputProps<TFormValues extends FieldValues = FieldValues>
  extends PhoneInputProps,
    React.RefAttributes<PhoneInputRefType> {
  invalid?: boolean
  errorMessage?: string
  onChange?: (value: string) => void
}

export const phoneUtil = PhoneNumberUtil.getInstance()

export const isPhoneValid = (phone: string) => {
  try {
    return phoneUtil.isValidNumber(phoneUtil.parseAndKeepRawInput(phone))
  } catch {
    return false
  }
}

export const PhoneNumberInput = <T extends FieldValues = FieldValues>({
  invalid,
  inputClassName,
  errorMessage,
  value,
  onChange,
  ...props
}: PhoneNumberInputProps<T>) => {
  const [state, setState] = useControllableState({
    value,
    onChange,
  })

  return (
    <PhoneInput
      value={state}
      onChange={setState}
      countrySelectorStyleProps={{
        buttonClassName: "px-3 hover:bg-transparent rounded-r-[5px]",
        buttonContentWrapperClassName: "gap-x-1",
        dropdownArrowClassName:
          "mx-0 border-0 transition duration-300 size-4 bg-no-repeat bg-center bg-[size:16px_16px]",
        flagClassName: "mx-0",
      }}
      inputClassName={cn(
        "focus:ring-0 flex-auto focus:border-primary-500 leading-5 focus:[--react-international-phone-border-color:theme(colors.primary.500)] rounded-r-[5px]",
        {
          "[--react-international-phone-border-color:theme(colors.error.500)] focus:border-error-500 focus:[--react-international-phone-border-color:theme(colors.error.500)]":
            invalid,
        },
        inputClassName
      )}
      {...props}
    />
  )
}

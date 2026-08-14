"use client"

import * as React from "react"
import Link from "next/link"
import {
  containsNumberOfChars,
  containsOneLowerCaseLetter,
  containsOneNumber,
  containsOneSymbol,
  containsOneUpperCaseLetter,
  hookFormHasError,
} from "@/utils/functions"
import { Check, Eye, EyeOff } from "@blend-metrics/icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { Button } from "./ui"
import { Spinner } from "./ui/spinner/spinner"
import { Input, InputRightElement } from "./ui/input"
import { InputGroup } from "./ui/input-group"
import { Label } from "./ui/label"

const updatePasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .refine(
        containsOneLowerCaseLetter,
        "Password must contain at least one lowercase letter"
      )
      .refine(
        containsOneUpperCaseLetter,
        "Password must contain at least one uppercase letter"
      )
      .refine(containsOneNumber, "Password must contain at least one number")
      .refine(
        containsOneSymbol,
        "Password must contain at least one special character"
      ),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type UpdatePasswordFormValues = z.infer<typeof updatePasswordFormSchema>

export const UpdatePasswordForm = ({
  onSubmit: onSubmitProp,
  isLoading = false,
}: {
  onSubmit?: (values: UpdatePasswordFormValues) => void
  isLoading?: boolean
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit: SubmitHandler<UpdatePasswordFormValues> = (values) => {
    onSubmitProp?.(values)
  }

  const [visible, setVisible] = React.useState(false)

  const [isVisible, setIsVisible] = React.useState(false)

  const password = useWatch({ control, name: "password" })

  return (
    <div className="py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-[592px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]"
      >
        <h1 className="text-lg font-semibold text-dark-blue-400 mt-5">
          Update Password
        </h1>

        <p className="mt-2 text-sm leading-5 text-dark-blue-400">
          Marketeq recommends avoiding using personal information in passwords
          and using a unique password for each account.{" "}
          <Link
            className="focus-visible:outline-none text-primary-500"
            href="#"
          >
            Learn More
          </Link>
        </p>

        <div className="mt-6 flex flex-col gap-y-6">
          <div className="space-y-1.5">
            <Label
              className="text-dark-blue-400"
              htmlFor="create-password"
              size="sm"
            >
              Create Password
            </Label>
            <InputGroup>
              <Input
                id="create-password"
                placeholder="Type your password"
                type={visible ? "text" : "password"}
                {...register("password")}
                isInvalid={hookFormHasError({ errors, name: "password" })}
              />
              <InputRightElement onClick={() => setVisible((prev) => !prev)}>
                {visible ? (
                  <EyeOff className="size-4 text-gray-400 hover:text-gray-500" />
                ) : (
                  <Eye className="size-4 text-gray-400 hover:text-gray-500" />
                )}
              </InputRightElement>
            </InputGroup>
          </div>
          <div className="space-y-1.5">
            <Label
              className="text-dark-blue-400"
              htmlFor="confirm-password"
              size="sm"
            >
              Confirm Password
            </Label>
            <InputGroup>
              <Input
                id="confirm-password"
                placeholder="Type your password again"
                isInvalid={hookFormHasError({
                  errors,
                  name: "confirmPassword",
                })}
                type={isVisible ? "text" : "password"}
                {...register("confirmPassword")}
              />
              <InputRightElement onClick={() => setIsVisible((prev) => !prev)}>
                {isVisible ? (
                  <EyeOff className="size-4 text-gray-400 hover:text-gray-500" />
                ) : (
                  <Eye className="size-4 text-gray-400 hover:text-gray-500" />
                )}
              </InputRightElement>
            </InputGroup>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium leading-5 text-dark-blue-400">
              Password Requirements
            </div>

            <div className="inline-grid mt-3 grid-cols-2 gap-x-10 gap-y-2">
              <div className="flex items-center gap-x-2">
                {containsNumberOfChars({
                  value: password,
                  numberOfChars: 8,
                }) ? (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full text-white bg-success-500">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-gray-300" />
                )}
                <span className="text-sm font-medium leading-5 text-dark-blue-400">
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-x-2">
                {containsOneNumber(password) ? (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full text-white bg-success-500">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-gray-300" />
                )}

                <span className="text-sm font-medium leading-5 text-dark-blue-400">
                  One number
                </span>
              </div>

              <div className="flex items-center gap-x-2">
                {containsOneUpperCaseLetter(password) ? (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full text-white bg-success-500">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-gray-300" />
                )}

                <span className="text-sm font-medium leading-5 text-dark-blue-400">
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center gap-x-2">
                {containsOneSymbol(password) ? (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full text-white bg-success-500">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-gray-300" />
                )}

                <span className="text-sm font-medium leading-5 text-dark-blue-400">
                  One symbol
                </span>
              </div>
              <div className="flex items-center gap-x-2">
                {containsOneLowerCaseLetter(password) ? (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full text-white bg-success-500">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span className="size-5 inline-flex items-center justify-center shrink-0 rounded-full border-[1.5px] border-gray-300" />
                )}

                <span className="text-sm font-medium leading-5 text-dark-blue-400">
                  One lowercase letter
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <Button disabled={!isValid || isLoading}>
              {isLoading ? <Spinner size={18} strokeWidth={3} /> : <Check className="size-[15px]" />}
              {isLoading ? "Saving..." : "Save Password"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

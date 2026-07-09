"use client"

import Link from "next/link"
import { hookFormHasError } from "@/utils/functions"
import { ArrowLeft, Lock01 } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { Button, ErrorMessage, Input, Label } from "./ui"

const formSchema = z.object({
  emailOrPhone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .or(z.string().email("Please enter a valid email")),
})

type FormValues = z.infer<typeof formSchema>

export const ResetPasswordForm = ({
  onSubmit: onSubmitProp,
}: {
  onSubmit?: (values: FormValues) => void
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailOrPhone: "",
    },
  })
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    onSubmitProp?.(values)
  }

  return (
    <div className="py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-[467px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]"
      >
        <h1 className="text-lg font-semibold text-dark-blue-400">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-5 text-dark-blue-400">
          Enter your email address or phone number below in order to reset your
          password.
        </p>

        <div className="mt-[30px]">
          <Label htmlFor="email-or-phone" size="sm">
            Email or Phone
          </Label>
          <Input
            {...register("emailOrPhone")}
            isInvalid={hookFormHasError({ errors, name: "emailOrPhone" })}
            className="mt-1.5"
            id="email-or-phone"
            placeholder="Email address or phone number"
          />
          <HookFormErrorMessage
            errors={errors}
            name="emailOrPhone"
            render={({ message }) => (
              <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
            )}
          />
        </div>

        <div className="mt-6 flex flex-col gap-y-3">
          <Button size="sm" disabled={!isValid}>
            Continue
          </Button>
          <Button size="sm" variant="link">
            <ArrowLeft className="size-[15px]" /> Back
          </Button>
        </div>

        <div className="mt-6 text-sm leading-5 text-dark-blue-400">
          Still having trouble?{" "}
          <Link
            className="focus-visible:outline-none underline font-semibold text-primary-500"
            href="#"
          >
            Start account recovery
          </Link>
        </div>
      </form>

      <div className="max-w-[467px] mt-10 3xl:mt-[50px] mx-auto px-5 md:px-[50px] w-full">
        <div className="flex items-center gap-x-2">
          <Lock01 className="size-5 text-primary-500" />
          <span className="text-sm font-bold leading-5 text-dark-blue-400">
            Security Tip
          </span>
        </div>
        <div className="mt-2.5">
          <span className="text-sm leading-5 text-dark-blue-400">
            Rorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
            vulputate libero et velit interdum.
          </span>
        </div>
      </div>
    </div>
  )
}

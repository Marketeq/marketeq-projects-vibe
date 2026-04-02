"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  Edit03,
  Lock,
  PhoneCall,
  Printer,
  Users03,
} from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from "@/components/ui"

const Visa = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} fill="#fff" />
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} stroke="#D0D5DD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m10.75 15.858H8.69L7.146 9.792c-.074-.279-.23-.526-.458-.642A6.6 6.6 0 0 0 4.8 8.508v-.233h3.318c.458 0 .801.35.859.758l.8 4.375 2.06-5.133h2.002zm4.234 0h-1.945l1.602-7.584h1.945zm4.118-5.483c.058-.408.401-.642.802-.642a3.53 3.53 0 0 1 1.888.35l.343-1.633a4.8 4.8 0 0 0-1.773-.35c-1.888 0-3.262 1.05-3.262 2.508 0 1.109.973 1.691 1.66 2.042.743.35 1.03.583.972.933 0 .525-.572.758-1.144.758a4.8 4.8 0 0 1-2.002-.467l-.344 1.634c.687.291 1.43.409 2.117.409 2.117.057 3.433-.992 3.433-2.567 0-1.984-2.69-2.1-2.69-2.975m9.498 5.483-1.545-7.584h-1.659a.86.86 0 0 0-.801.584l-2.86 7h2.002l.4-1.108h2.46l.23 1.108zm-2.918-5.541.572 2.858h-1.602z"
      fill="#172B85"
    />
  </svg>
)

const Amex = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width={34} height={24} rx={4} fill="#1F72CD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m6.095 8.5-3.18 7.247h3.807l.472-1.156h1.08l.472 1.156h4.192v-.882l.373.882h2.168l.374-.9v.9h8.718l1.06-1.126.992 1.126 4.478.01-3.191-3.613L31.1 8.5h-4.407L25.66 9.605 24.699 8.5h-9.483l-.815 1.87-.833-1.87h-3.8v.852L9.345 8.5zm.737 1.029h1.856l2.11 4.914V9.53h2.034l1.63 3.523 1.502-3.523h2.023v5.2h-1.231l-.01-4.075-1.795 4.075H13.85l-1.805-4.075v4.075H9.512l-.48-1.166H6.437l-.479 1.165H4.601zm17.288 0h-5.007v5.197h4.93l1.588-1.722 1.53 1.722h1.601l-2.326-2.583 2.326-2.614h-1.53l-1.581 1.703zm-16.385.88-.855 2.077h1.71zm12.615 1.146v-.95h3.123l1.363 1.518-1.423 1.526H20.35v-1.036h2.73v-1.058z"
      fill="#fff"
    />
  </svg>
)

const StepIndicator = ({
  step,
  completed,
  active,
}: {
  step: number
  completed?: boolean
  active?: boolean
}) => (
  <button
    data-state={completed || active ? "active" : undefined}
    className="peer focus-visible:outline-none size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-primary-500 border-primary-500 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:border-primary-500"
  >
    {completed ? <Check className="size-3" /> : step}
  </button>
)

const Step = ({
  label,
  step,
  completed,
  active,
}: {
  label: string
  step: number
  completed?: boolean
  active?: boolean
}) => (
  <div className="flex gap-x-3 items-center">
    <StepIndicator step={step} completed={completed} active={active} />
    <span className="text-sm shrink-0 whitespace-nowrap leading-none font-semibold text-dark-blue-400">
      {label}
    </span>
  </div>
)

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  return (
    <div className="bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
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

          <div className="flex items-center gap-x-3">
            <Step label="Project Details" step={1} completed />
            <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
            <Step label="Payment" step={2} completed />
            <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
            <Step label="Confirmation" step={3} active />
          </div>
        </div>
      </div>

      {/* ThankYou Section */}
      <div className="px-[150px] py-[50px]">
        <div className="p-8 pr-[60px] rounded-lg flex items-start gap-x-5 border bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
          <div className="size-12 border-[8px] text-success-500 border-success-50 bg-success-100 rounded-full shrink-0 inline-flex items-center justify-center">
            <CheckCircle className="size-6" />
          </div>

          <div className="flex-auto">
            <h1 className="text-[28px] font-bold text-success-600 leading-none">
              Thank you for launching your project with Marketeq!
            </h1>

            <div className="mt-5 flex items-center gap-x-2">
              <p className="text-base text-dark-blue-400">
                A copy of your invoice and order details has been sent to{" "}
                <span className="font-semibold">jack2024@gmail.com</span>
              </p>

              <Button className="underline" variant="link" visual="gray">
                Change Email
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-x-3">
              <span className="text-base text-gray-500">
                Your Order ID: C01-12345-6789
              </span>
              <span className="inline-block h-[17px] w-0.5 bg-gray-200 shrink-0" />
              <span className="text-base text-gray-500">
                Order Date: November 5th, 2025 at 11:11 PM EST
              </span>
            </div>

            <div className="mt-5">
              <h3 className="Need to make changes to your order? View Order Details or Contact Us">
                Need to make changes to your order? View{" "}
                <Button
                  className="underline"
                  variant="link"
                  onClick={() => router.push(`/checkout/${slug}`)}
                >
                  Order Details
                </Button>{" "}
                or{" "}
                <Button className="underline" variant="link">
                  Contact Us
                </Button>
              </h3>
            </div>
          </div>
        </div>
        <div className="flex gap-x-8 mt-6">
          <div className="flex-auto">
            <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                <h1 className="text-lg font-semibold text-dark-blue-400">
                  Project Details
                </h1>

                <Button variant="link" visual="primary">
                  <Edit03 className="size-[15px]" />
                  Edit
                </Button>
              </div>
              <div className="p-5 flex gap-x-5">
                <div className="relative flex-none w-[181px] bg-white border border-[#DFDFDF] rounded-md overflow-hidden">
                  <NextImage
                    className="object-cover"
                    src="/dashboard.png"
                    alt="Dashboard"
                    sizes="50vw"
                    fill
                  />
                </div>
                <div className="flex-auto">
                  <h1 className="text-sm font-medium text-dark-blue-400">
                    Marketeq Client Portal - Redesigning and Optimizing Website
                    for Enhanced User Experience.
                  </h1>

                  <div className="mt-1.5 inline-flex gap-x-2">
                    <Users03 className="size-[15px] shrink-0" />
                    <span className="text-xs leading-5 font-semibold text-dark-blue-400">
                      8 team members
                    </span>
                  </div>

                  <div className="mt-1.5 leading-5 text-[13px] text-dark-blue-400">
                    January 2024 - August 2024
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h1 className="text-base font-semibold text-dark-blue-400">
                  Set up your introductory call
                </h1>
                <p className="mt-1 text-sm font-light text-dark-blue-400">
                  Set up your introductory call
                </p>

                <article className="py-6 flex items-center justify-between">
                  <div className="flex gap-x-3 items-center">
                    <Avatar size="md" className="shrink-0">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div>
                      <h1 className="text-sm font-semibold text-dark-blue-400">
                        Jack Smith
                      </h1>
                      <p className="text-xs font-light text-dark-blue-400">
                        Project Manager
                      </p>
                    </div>
                  </div>

                  <Button
                    className="text-primary-500 bg-primary-50 hover:bg-primary-500 hover:text-white"
                    visual="primary"
                  >
                    <PhoneCall className="size-[15px]" />
                    Schedule Call
                  </Button>
                </article>
                <article className="border-t border-gray-200 py-6 flex items-center justify-between">
                  <div className="flex gap-x-3 items-center">
                    <Avatar size="md" className="shrink-0">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div>
                      <h1 className="text-sm font-semibold text-dark-blue-400">
                        Jack Smith
                      </h1>
                      <p className="text-xs font-light text-dark-blue-400">
                        Project Manager
                      </p>
                    </div>
                  </div>

                  <Button
                    className="text-primary-500 bg-primary-50 hover:bg-primary-500 hover:text-white"
                    visual="primary"
                  >
                    <PhoneCall className="size-[15px]" />
                    Schedule Call
                  </Button>
                </article>
              </div>
            </div>

            <div className="rounded-lg mt-8 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="py-5 px-6 border-b  border-gray-200">
                <h1 className="text-lg font-semibold text-dark-blue-400">
                  Payment Methods
                </h1>
                <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                  The following payment methods will be billed for the total
                  amount of <span className="font-bold">$90,000</span>
                </p>
                <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                  You will see a charge on your bank statement from{" "}
                  <span className="font-bold">Marketeq</span>
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2">
                  <div className="border-b flex col-span-2 items-start gap-x-3 border-gray-200 py-4">
                    <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                      <Bank className="size-4" />
                    </div>
                    <div className="flex-auto space-y-1">
                      <h2 className="text-sm font-semibold text-dark-blue-400">
                        AMEX credit card ending in *1234
                      </h2>

                      <p className="text-xs font-light text-dark-blue-400">
                        Payment Amount:{" "}
                        <span className="font-semibold">$4,000</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h1 className="text-lg font-semibold text-dark-blue-400">
                    Recurring Payments
                  </h1>
                  <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                    Your following payment methods will be debited on{" "}
                    <span className="font-bold">1st of every</span> month for
                    the amount referenced below until the{" "}
                    <span className="font-bold">
                      completion of your project.
                    </span>
                  </p>

                  <div className="grid grid-cols-2">
                    <div className="border-b flex items-start gap-x-3 border-gray-200 py-4">
                      <Amex className="h-[30px] w-[45px] shrink-0" />
                      <div className="flex-auto space-y-1">
                        <h2 className="text-sm font-semibold text-dark-blue-400">
                          AMEX credit card ending in *1234
                        </h2>
                        <p className="text-xs font-light text-dark-blue-400">
                          Expires: 09/2027
                        </p>
                        <p className="text-xs font-light text-dark-blue-400">
                          Payment Amount:{" "}
                          <span className="font-semibold">$4,000</span>
                        </p>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 py-4 px-3">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-dark-blue-400">
                          Billing Address
                        </h2>
                        <p className="text-xs font-light text-dark-blue-400">
                          2125 Chestnut Street, San Francisco, CA 94123
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-x-3 py-4">
                      <Visa className="h-[30px] w-[45px] shrink-0" />
                      <div className="flex-auto space-y-1">
                        <h2 className="text-sm font-semibold text-dark-blue-400">
                          AMEX credit card ending in *1234
                        </h2>
                        <p className="text-xs font-light text-dark-blue-400">
                          Expires: 09/2027
                        </p>
                        <p className="text-xs font-light text-dark-blue-400">
                          Payment Amount:{" "}
                          <span className="font-semibold">$4,000</span>
                        </p>
                      </div>
                    </div>

                    <div className="py-4 px-3">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-dark-blue-400">
                          Billing Address
                        </h2>
                        <p className="text-xs font-light text-dark-blue-400">
                          2125 Chestnut Street, San Francisco, CA 94123
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6 pr-8 flex items-start gap-x-2 mt-8 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="flex-auto space-y-2">
                <h1 className="text-2xl text-dark-blue-400 font-bold">
                  Kickoff your project
                </h1>
                <p className="text-base font-light text-dark-blue-400">
                  Here&apos;s some things you can do to get your project going
                  in the right direction.{" "}
                </p>
              </div>
              <Button onClick={() => router.push(`/checkout/${slug}/next-steps`)}>
                Next Step <ArrowRight className="size-[15px]" />
              </Button>
            </div>
          </div>
          <div className="w-[305px] shrink-0">
            <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="border-b pb-4 border-gray-200">
                <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                  Price Details
                </h1>
              </div>

              <div className="mt-5">
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      Project cost
                    </span>
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      $94,000
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      Estimated tax *
                    </span>
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      $94,000
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      Balance applied
                    </span>
                    <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                      - $4,000
                    </span>
                  </div>
                </div>

                <div className="flex mt-4 items-center justify-between">
                  <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                    Total
                  </h1>
                  <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                    $90,000
                  </h1>
                </div>
              </div>

              <div className="mt-2">
                <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
                  <span className="text-[10px] text-dark-blue-400">
                    Your monthly payments start from
                  </span>
                  <span className="text-[10px] font-medium text-dark-blue-400">
                    Jan 1st, 2025
                  </span>
                </div>

                <div className="grid mt-2.5">
                  <Button className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white">
                    <Printer className="size-[15px]" />
                    Print Invoice
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

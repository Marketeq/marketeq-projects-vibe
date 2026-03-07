import {
  ArrowRight,
  Bank,
  CheckCircle,
  Edit03,
  PhoneCall,
  Printer,
  UserPlus,
  Users03,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@/components/ui"
import { ACH, Amex, Navigation, UserGroup, Visa } from "./checkout.stories"

const meta: Meta = {
  title: "Sidebar",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Sidebar6 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <div className="border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
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

        <div className="mt-4">
          <div className="mt-5 space-y-3">
            <article className="flex items-start gap-x-3">
              <Amex className="w-[45px] h-[30px]" />
              <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                <h1 className="text-sm font-medium text-dark-blue-400">
                  $4,000
                </h1>
                <p className="text-xs font-light uppercase text-dark-blue-400">
                  AMEX *1234
                </p>
              </div>
            </article>
            <article className="flex items-start gap-x-3">
              <Visa className="w-[45px] h-[30px]" />
              <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                <h1 className="text-sm font-medium text-dark-blue-400">
                  $4,000
                </h1>
                <p className="text-xs font-light uppercase text-dark-blue-400">
                  AMEX *1234
                </p>
              </div>
            </article>
            <article className="flex items-start gap-x-3">
              <ACH className="w-[45px] h-[30px]" />
              <div className="space-y-1 flex-auto">
                <h1 className="text-sm font-medium text-dark-blue-400">
                  $45,000{" "}
                </h1>
                <p className="text-xs font-light uppercase text-dark-blue-400">
                  Bank of America *1234
                </p>
              </div>
            </article>
          </div>

          <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
            <span className="text-[10px] text-dark-blue-400">
              Your bi-weekly payments start from
            </span>
            <span className="text-[10px] font-medium text-primary-500">
              Jan 1st, 2025
            </span>
          </div>

          <div className="grid mt-2.5">
            <Button>Submit Order</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar5 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <div className="border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>

          <div className="flex mt-4 items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Payment Plan
          </h1>

          <Listbox className="mt-4">
            <ListboxButton
              className="text-xs text-dark-blue-400"
              displayValue={(value: {
                label: string
                meta: string
                value: string
              }) => (
                <>
                  {value.label} -{" "}
                  <span className="font-bold">{value.value}</span>
                </>
              )}
              placeholderClassName="text-xs"
              placeholder="Select Option"
            />
            <ListboxOptions className="">
              {() => (
                <>
                  {[
                    {
                      label: "Weekly",
                      value: "$2,812",
                      meta: "24",
                    },
                    {
                      label: "Bi-Weekly",
                      value: "$5,625",
                      meta: "16",
                    },
                    {
                      label: "Monthly",
                      value: "$11,250",
                      meta: "8",
                    },
                    {
                      label: "Pay Remaining Balance",
                      value: "$88,000",
                    },
                  ].map((option) => (
                    <ListboxOption
                      className="hover:text-gray-900"
                      indicator={false}
                      key={option.label}
                      value={option}
                    >
                      {option.label}
                      <span className="inline-block font-normal ml-auto">
                        {option.meta && `${option.meta} x`}
                        <span className="font-bold">{option.value}</span>
                      </span>
                    </ListboxOption>
                  ))}
                </>
              )}
            </ListboxOptions>
          </Listbox>
        </div>

        <div className="mt-4">
          <div className="flex mt-4 items-center justify-between">
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              Due Today
            </h1>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $4,000
            </h1>
          </div>

          <div className="grid mt-2.5">
            <Button>Proceed to Payment</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar4 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <div className="border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>

          <div className="flex mt-4 items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Payment Plan
          </h1>

          <Listbox className="mt-4">
            <ListboxButton
              className="text-xs text-dark-blue-400"
              displayValue={(value: {
                label: string
                meta: string
                value: string
              }) => (
                <>
                  {value.label} -{" "}
                  <span className="font-bold">{value.value}</span>
                </>
              )}
              placeholderClassName="text-xs"
              placeholder="Select Option"
            />
            <ListboxOptions className="">
              {() => (
                <>
                  {[
                    {
                      label: "Weekly",
                      value: "$2,812",
                      meta: "24",
                    },
                    {
                      label: "Bi-Weekly",
                      value: "$5,625",
                      meta: "16",
                    },
                    {
                      label: "Monthly",
                      value: "$11,250",
                      meta: "8",
                    },
                    {
                      label: "Pay Remaining Balance",
                      value: "$88,000",
                    },
                  ].map((option) => (
                    <ListboxOption
                      className="hover:text-gray-900"
                      indicator={false}
                      key={option.label}
                      value={option}
                    >
                      {option.label}
                      <span className="inline-block font-normal ml-auto">
                        {option.meta && `${option.meta} x`}
                        <span className="font-bold">{option.value}</span>
                      </span>
                    </ListboxOption>
                  ))}
                </>
              )}
            </ListboxOptions>
          </Listbox>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-primary-500">
              8 monthly payments
            </span>
            <span className="text-xs font-medium text-dark-blue-400">
              8 x $11,250
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex mt-4 items-center justify-between">
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              Due Today
            </h1>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $4,000
            </h1>
          </div>

          <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
            <span className="text-[10px] text-dark-blue-400">
              Your monthly payments start from
            </span>
            <span className="text-[10px] font-medium text-primary-500">
              Jan 1st, 2025
            </span>
          </div>

          <div className="grid mt-2.5">
            <Button>Proceed to Payment</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar3 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <div className="border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>
        </div>

        <div className="pb-4 mt-5 border-b border-gray-200">
          <div className="space-y-2">
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
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>

          <div className="grid mt-5">
            <Button>Proceed to Payment</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <h1 className="text-base font-semibold leading-none text-dark-blue-400">
          Project Details
        </h1>

        <div className="mt-4 space-y-4 pb-4 border-b border-gray-200">
          <div className="relative h-[92px] rounded-md overflow-hidden">
            <NextImage
              className="object-cover"
              src="/dashboard.png"
              alt="Dashboard"
              sizes="50vw"
              fill
            />
          </div>

          <h3 className="text-sm font-medium text-dark-blue-400 leading-[18px]">
            Marketeq Client Portal - Redesigning and Optimizing Website for
            Enhanced User Experience.
          </h3>

          <div className="flex items-center gap-x-2 ">
            <UserGroup className="size-[15px]" />
            <span className="inline-block text-xs leading-5 font-semibold text-primary-500">
              8 team members
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">
                Total Duration
              </h3>
              <h1 className="text-xs font-semibold leading-none text-dark-blue-400">
                Jan 2025 - Aug 2025
              </h1>
            </div>

            <Badge size="sm" visual="primary">
              8 months
            </Badge>
          </div>
        </div>

        <div className="mt-5 pb-4 border-b border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>

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
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>

          <div className="grid mt-5">
            <Button>Submit Order</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar1 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <h1 className="text-base font-semibold leading-none text-dark-blue-400">
          Project Details
        </h1>

        <div className="mt-4 space-y-4 pb-4 border-b border-gray-200">
          <div className="relative h-[92px] rounded-md overflow-hidden">
            <NextImage
              className="object-cover"
              src="/dashboard.png"
              alt="Dashboard"
              sizes="50vw"
              fill
            />
          </div>

          <h3 className="text-sm font-medium text-dark-blue-400 leading-[18px]">
            Marketeq Client Portal - Redesigning and Optimizing Website for
            Enhanced User Experience.
          </h3>

          <div className="flex items-center gap-x-2 ">
            <UserGroup className="size-[15px]" />
            <span className="inline-block text-xs leading-5 font-semibold text-primary-500">
              8 team members
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">
                Total Duration
              </h3>
              <h1 className="text-xs font-semibold leading-none text-dark-blue-400">
                Jan 2025 - Aug 2025
              </h1>
            </div>

            <Badge size="sm" visual="primary">
              8 months
            </Badge>
          </div>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>

          <div className="flex mt-4 items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Payment Plan
          </h1>

          <Listbox className="mt-4">
            <ListboxButton
              className="text-xs text-dark-blue-400"
              displayValue={(value: {
                label: string
                meta: string
                value: string
              }) => (
                <>
                  {value.label} -{" "}
                  <span className="font-bold">{value.value}</span>
                </>
              )}
              placeholderClassName="text-xs"
              placeholder="Select Option"
            />
            <ListboxOptions className="">
              {() => (
                <>
                  {[
                    {
                      label: "Weekly",
                      value: "$2,812",
                      meta: "24",
                    },
                    {
                      label: "Bi-Weekly",
                      value: "$5,625",
                      meta: "16",
                    },
                    {
                      label: "Monthly",
                      value: "$11,250",
                      meta: "8",
                    },
                    {
                      label: "Pay Remaining Balance",
                      value: "$88,000",
                    },
                  ].map((option) => (
                    <ListboxOption
                      className="hover:text-gray-900"
                      indicator={false}
                      key={option.label}
                      value={option}
                    >
                      {option.label}
                      <span className="inline-block font-normal ml-auto">
                        {option.meta && `${option.meta} x`}
                        <span className="font-bold">{option.value}</span>
                      </span>
                    </ListboxOption>
                  ))}
                </>
              )}
            </ListboxOptions>
          </Listbox>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-primary-500">
              16 bi-weekly payments
            </span>
            <span className="text-xs font-medium text-dark-blue-400">
              16 x $5,625
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex mt-4 items-center justify-between">
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              Due Today
            </h1>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $4,000
            </h1>
          </div>

          <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
            <span className="text-[10px] text-dark-blue-400">
              Your bi-weekly payments start from
            </span>
            <span className="text-[10px] font-medium text-primary-500">
              Jan 1st, 2025
            </span>
          </div>

          <div className="grid mt-2.5">
            <Button>Submit Order</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Sidebar2 = () => {
  return (
    <div className="w-[305px] shrink-0">
      <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
        <h1 className="text-base font-semibold leading-none text-dark-blue-400">
          Project Details
        </h1>

        <div className="mt-4 space-y-4 pb-4 border-b border-gray-200">
          <div className="relative h-[92px] rounded-md overflow-hidden">
            <NextImage
              className="object-cover"
              src="/dashboard.png"
              alt="Dashboard"
              sizes="50vw"
              fill
            />
          </div>

          <h3 className="text-sm font-medium text-dark-blue-400 leading-[18px]">
            Marketeq Client Portal - Redesigning and Optimizing Website for
            Enhanced User Experience.
          </h3>

          <div className="flex items-center gap-x-2 ">
            <UserGroup className="size-[15px]" />
            <span className="inline-block text-xs leading-5 font-semibold text-primary-500">
              8 team members
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">
                Total Duration
              </h3>
              <h1 className="text-xs font-semibold leading-none text-dark-blue-400">
                Jan 2025 - Aug 2025
              </h1>
            </div>

            <Badge size="sm" visual="primary">
              8 months
            </Badge>
          </div>
        </div>

        <div className="mt-5 border-b pb-4 border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Price Details
          </h1>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                Project cost
              </span>
              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                $94,000
              </span>
            </div>
          </div>

          <div className="flex mt-4 items-center justify-between">
            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
              Total amount to be paid
            </span>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $94,000
            </h1>
          </div>
        </div>

        <div className="mt-5 pb-4 border-b border-gray-200">
          <h1 className="text-base leading-none font-semibold text-dark-blue-400">
            Payment Plan
          </h1>

          <Listbox className="mt-4">
            <ListboxButton
              className="text-xs text-dark-blue-400"
              displayValue={(value: {
                label: string
                meta: string
                value: string
              }) => (
                <>
                  {value.label} -{" "}
                  <span className="font-bold">{value.value}</span>
                </>
              )}
              placeholderClassName="text-xs"
              placeholder="Select Option"
            />
            <ListboxOptions className="">
              {() => (
                <>
                  {[
                    {
                      label: "Weekly",
                      value: "$2,812",
                      meta: "24",
                    },
                    {
                      label: "Bi-Weekly",
                      value: "$5,625",
                      meta: "16",
                    },
                    {
                      label: "Monthly",
                      value: "$11,250",
                      meta: "8",
                    },
                    {
                      label: "Pay Remaining Balance",
                      value: "$88,000",
                    },
                  ].map((option) => (
                    <ListboxOption
                      className="hover:text-gray-900"
                      indicator={false}
                      key={option.label}
                      value={option}
                    >
                      {option.label}
                      <span className="inline-block font-normal ml-auto">
                        {option.meta && `${option.meta} x`}
                        <span className="font-bold">{option.value}</span>
                      </span>
                    </ListboxOption>
                  ))}
                </>
              )}
            </ListboxOptions>
          </Listbox>
        </div>

        <div className="mt-4">
          <div className="flex mt-4 items-center justify-between">
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              Due Today
            </h1>
            <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
              $4,000
            </h1>
          </div>

          <div className="grid mt-2.5">
            <Button>Submit Order</Button>
          </div>

          <div className="mt-5">
            <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
              By clicking the above, you agree to Marketeq’s{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Terms of Use
              </Button>{" "}
              and{" "}
              <Button
                className="text-[10px] leading-[14px] underline"
                variant="link"
              >
                Privacy Policy
              </Button>{" "}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <Button variant="link" visual="gray">
              Add Gift Card / Promo Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ConfirmationScreen = () => {
  return (
    <div className="bg-gray-50">
      <Navigation />
      <div className="px-[150px] py-[50px]">
        <h1 className="text-2xl font-bold text-dark-blue-400">
          Review your order details
        </h1>
        <p className="mt-3 text-base font-light text-dark-blue-400">
          Then click <span className="semibold">“Submit payment”</span> below to
          confirm your project
        </p>
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
            </div>

            <div className="rounded-lg mt-8 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                <h1 className="text-lg font-semibold text-dark-blue-400">
                  Payment Methods
                </h1>

                <Button variant="link" visual="primary">
                  <Edit03 className="size-[15px]" />
                  Edit
                </Button>
              </div>
              <div className="p-6">
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

                  <div className="border-b flex items-start gap-x-3 border-gray-200 py-4">
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

                <div className="mt-6 py-2 px-5 flex items-start gap-x-5">
                  <Checkbox size="lg" />{" "}
                  <Label size="sm" className="font-light text-dark-blue-400">
                    I hereby authorize{" "}
                    <span className="font-semibold">Marketeq</span> to charge my
                    above payment methods for the total one-time amount of
                    <span className="font-semibold">$94,000</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="w-[305px] shrink-0">
            <div className="w-[305px]">
              <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="border-b pb-4 border-gray-200">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Price Details
                  </h1>
                </div>

                <div className="mt-5 border-b pb-4 border-gray-200">
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

                <div className="mt-4">
                  <div className="mt-5 space-y-3">
                    <article className="flex items-start gap-x-3">
                      <Amex className="w-[45px] h-[30px]" />
                      <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                        <h1 className="text-sm font-medium text-dark-blue-400">
                          $4,000
                        </h1>
                        <p className="text-xs font-light uppercase text-dark-blue-400">
                          AMEX *1234
                        </p>
                      </div>
                    </article>
                    <article className="flex items-start gap-x-3">
                      <Visa className="w-[45px] h-[30px]" />
                      <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                        <h1 className="text-sm font-medium text-dark-blue-400">
                          $4,000
                        </h1>
                        <p className="text-xs font-light uppercase text-dark-blue-400">
                          AMEX *1234
                        </p>
                      </div>
                    </article>
                    <article className="flex items-start gap-x-3">
                      <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                        <Bank className="size-4" />
                      </div>
                      <div className="space-y-1 flex-auto">
                        <h1 className="text-sm font-medium text-dark-blue-400">
                          $45,000{" "}
                        </h1>
                        <p className="text-xs font-light uppercase text-dark-blue-400">
                          Bank of America *1234
                        </p>
                      </div>
                    </article>
                  </div>

                  <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
                    <span className="text-[10px] text-dark-blue-400">
                      Your bi-weekly payments start from
                    </span>
                    <span className="text-[10px] font-medium text-primary-500">
                      Jan 1st, 2025
                    </span>
                  </div>

                  <div className="grid mt-2.5">
                    <Button>Submit Order</Button>
                  </div>

                  <div className="mt-5">
                    <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                      By clicking the above, you agree to Marketeq’s{" "}
                      <Button
                        className="text-[10px] leading-[14px] underline"
                        variant="link"
                      >
                        Terms of Use
                      </Button>{" "}
                      and{" "}
                      <Button
                        className="text-[10px] leading-[14px] underline"
                        variant="link"
                      >
                        Privacy Policy
                      </Button>{" "}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-center">
                    <Button variant="link" visual="gray">
                      Add Gift Card / Promo Code
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ThankYou = () => {
  return (
    <div className="bg-gray-50">
      <Navigation />
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
                <Button className="underline" variant="link">
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
              <Button>
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

export const NextSteps = () => {
  return (
    <div className="bg-gray-50">
      <div className="px-[150px] py-[50px]">
        <div className="flex flex-col">
          <div className="size-[75px] border-[13.39px] self-center text-success-500 border-success-50 bg-success-100 rounded-full shrink-0 inline-flex items-center justify-center">
            <CheckCircle className="size-[37.5px]" />
          </div>

          <h3 className="text-2xl mt-8 text-center font-medium text-dark-blue-400">
            So you&apos;ve launched your project...{" "}
          </h3>

          <h2 className="text-4xl mt-4 text-center font-light text-dark-blue-400">
            That’s pretty{" "}
            <span className="font-bold text-success-400">Awesome</span>! You’re
            ready to start
          </h2>

          <p className="text-xl mt-4 text-center font-light text-dark-blue-400">
            Here&apos;s some things you can do to get your project going in the
            right direction...
          </p>
        </div>

        <div className="mt-[50px]">
          <div className="grid gap-y-3">
            <article className="p-6 flex rounded-lg  border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] items-center gap-x-2 justify-between">
              <div className="flex gap-x-5 flex-auto items-center">
                <UserPlus className="size-8 shrink-0 text-primary-500" />

                <div className="flex-auto space-y-2">
                  <h1 className="text-sm font-bold text-dark-blue-400">
                    Invite Stakeholders
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    If you haven&apos;t already, start inviting your
                    stakeholders to the project
                  </p>
                </div>
              </div>

              <Button variant="outlined" visual="gray">
                Invite Stakeholders
              </Button>
            </article>
            <article className="p-6 flex rounded-lg  border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] items-center gap-x-2 justify-between">
              <div className="flex gap-x-5 flex-auto items-center">
                <UserPlus className="size-8 shrink-0 text-primary-500" />

                <div className="flex-auto space-y-2">
                  <h1 className="text-sm font-bold text-dark-blue-400">
                    Invite Stakeholders
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    If you haven&apos;t already, start inviting your
                    stakeholders to the project
                  </p>
                </div>
              </div>

              <Button variant="outlined" visual="gray">
                Invite Stakeholders
              </Button>
            </article>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="link" visual="gray">
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

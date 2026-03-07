import { cn } from "@/utils/functions"
import { Bank, Edit03, SwitchHorizontal01, Trash03 } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import CurrencyInput from "react-currency-input-field"
import { IconButton, inputVariants } from "@/components/ui"
import { Amex } from "./checkout.stories"

const meta: Meta = {
  title: "Pay in Installments",
}

export default meta

export const BankCardSelected = ({
  accountNumber,
  amount,
  defaultAmount,
  onAmountChange,
  accountType,
  openedBlock,
  action,
  onRemove,
}: {
  accountNumber: string
  accountType: string
  amount?: number
  onAmountChange?: (value: string | undefined) => void
  defaultAmount?: number
  openedBlock?: string
  action?: () => void
  onRemove?: () => void
}) => {
  return (
    <div className="flex items-center gap-x-2.5">
      <div className="relative rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-x-3">
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
            <Bank className="size-4" />
          </div>

          <div className="inline-flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-2">
              <span className="inline-block text-sm text-dark-blue-400">
                Bank of America
              </span>
            </div>
            <span className="inline-block text-xs text-[#858585] leading-none">
              {accountType} ****{accountNumber?.slice(-4)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-x-3 pr-12">
          <div className="flex items-center gap-x-1">
            <IconButton
              className="rounded-full opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
            >
              <Edit03 className="size-[18px]" />
            </IconButton>

            <IconButton
              className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
              variant="ghost"
              visual="gray"
              onClick={onRemove}
            >
              <Trash03 className="size-[18px]" />
            </IconButton>
          </div>
          <IconButton
            className="group absolute gap-x-2 transition-[width] duration-300 hover:w-[246px] right-[15px] -translate-y-1/2 top-1/2"
            variant="outlined"
            visual="gray"
            onClick={action}
          >
            <SwitchHorizontal01 className="size-[15px]" />
            <span className="text-sm leading-6 font-semibold hidden truncate group-hover:inline-block text-gray-500">
              {openedBlock === "first"
                ? "Change to recurring payment"
                : "Change to one-time payment"}
            </span>
          </IconButton>
        </div>
      </div>

      <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
        <span className="text-xs block font-light leading-none text-gray-400">
          Enter Amount
        </span>
        <CurrencyInput
          className={cn(
            inputVariants({
              className:
                "w-auto min-w-0 inline-flex p-0 border-0 focus:ring-0 shadow-none font-medium text-dark-blue-400",
            })
          )}
          intlConfig={{
            locale: "en-US",
            currency: "USD",
          }}
          onValueChange={onAmountChange}
          placeholder="Enter amount"
          decimalsLimit={20}
          value={amount}
          defaultValue={defaultAmount}
        />
      </div>
    </div>
  )
}

export const CreditDebitSelected = ({
  amount,
  cardNumber,
  defaultAmount,
  onAmountChange,
  openedBlock,
  action,
  onRemove,
}: {
  cardNumber: string
  amount?: number
  onAmountChange?: (value: string | undefined) => void
  defaultAmount?: number
  openedBlock?: string
  action?: () => void
  onRemove?: () => void
}) => {
  return (
    <div className="flex items-center gap-x-2.5">
      <div className="relative rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-x-3">
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
            <Amex className="w-[46.5px] h-[31px]" />
          </div>

          <div className="inline-flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-2">
              <span className="inline-block text-sm text-dark-blue-400">
                American Express
              </span>
            </div>
            <span className="inline-block text-xs text-[#858585] leading-none">
              Credit ****{cardNumber?.slice(-4)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-x-3 p-12">
          <div className="flex items-center gap-x-1">
            <IconButton
              className="rounded-full opacity-50 hover:opacity-100"
              variant="ghost"
              visual="gray"
            >
              <Edit03 className="size-[18px]" />
            </IconButton>

            <IconButton
              className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
              variant="ghost"
              visual="gray"
              onClick={onRemove}
            >
              <Trash03 className="size-[18px]" />
            </IconButton>
          </div>
          <IconButton
            className="group absolute gap-x-2 transition-[width] duration-300 hover:w-[246px] right-[15px] -translate-y-1/2 top-1/2"
            variant="outlined"
            visual="gray"
            onClick={action}
          >
            <SwitchHorizontal01 className="size-[15px]" />
            <span className="text-sm leading-6 font-semibold hidden truncate group-hover:inline-block text-gray-500">
              {openedBlock === "first"
                ? "Change to recurring payment"
                : "Change to one-time payment"}
            </span>
          </IconButton>
        </div>
      </div>

      <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
        <span className="text-xs block font-light leading-none text-gray-400">
          Enter Amount
        </span>

        <CurrencyInput
          className={cn(
            inputVariants({
              className:
                "w-auto min-w-0 inline-flex p-0 border-0 focus:ring-0 shadow-none font-medium text-dark-blue-400",
            })
          )}
          intlConfig={{
            locale: "en-US",
            currency: "USD",
          }}
          onValueChange={onAmountChange}
          placeholder="Enter amount"
          decimalsLimit={20}
          value={amount}
          defaultValue={defaultAmount}
        />
      </div>
    </div>
  )
}

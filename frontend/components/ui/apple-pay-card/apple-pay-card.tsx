import React from "react"
import RmDialog from "../rm-dialog/rm-dialog"
import { IconButton } from "@/components/ui"
import { Trash03 } from "@blend-metrics/icons"
import { ApplePay1, GPay1 } from "@/components/icons/payment-icons"

export default function ApplePayCard({
  onRemove,
  amountToBePaid,
}: {
  onRemove?: () => void
  amountToBePaid: string
}) {
  return (
    <div className="flex items-center gap-x-2.5">
      <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-x-3">
          <div className="h-[30px] w-[45px] border border-black rounded-md inline-flex justify-center items-center">
            <ApplePay1 />
          </div>

          <div className="inline-flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-2">
              <span className="inline-block text-sm text-dark-blue-400">
                Apple Pay
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <RmDialog
            onRemove={onRemove}
            title="Remove Payment Method?"
            description="Are you sure you want to remove American Express Credit ****1234 from your payment methods?"
            trigger={({ isOpen, setIsOpen }) => (
              <IconButton
                className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
                variant="ghost"
                visual="gray"
                onClick={() => setIsOpen(!isOpen)}
              >
                <Trash03 className="size-[18px]" />
              </IconButton>
            )}
          />
        </div>
      </div>

      <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
        <span className="text-xs block font-light leading-none text-gray-400">
          Amount
        </span>
        <h3 className="text-base font-medium text-dark-blue-400">
          {amountToBePaid}
        </h3>
      </div>
    </div>
  )
}

const GooglePayCard = ({
  onRemove,
  amountToBePaid,
}: {
  onRemove?: () => void
  amountToBePaid: string
}) => {
  return (
    <div className="flex items-center gap-x-2.5">
      <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-x-3">
          <div className="h-[30px] w-[45px] border border-black rounded-md inline-flex justify-center items-center">
            <GPay1 />
          </div>

          <div className="inline-flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-2">
              <span className="inline-block text-sm text-dark-blue-400">
                Google Pay
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <RmDialog
            onRemove={onRemove}
            title="Remove Payment Method?"
            description="Are you sure you want to remove American Express Credit ****1234 from your payment methods?"
            trigger={({ isOpen, setIsOpen }) => (
              <IconButton
                className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
                variant="ghost"
                visual="gray"
                onClick={() => setIsOpen(!isOpen)}
              >
                <Trash03 className="size-[18px]" />
              </IconButton>
            )}
          />
        </div>
      </div>

      <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
        <span className="text-xs block font-light leading-none text-gray-400">
          Amount
        </span>
        <h3 className="text-base font-medium text-dark-blue-400">
          {amountToBePaid}
        </h3>
      </div>
    </div>
  )
}

export { GooglePayCard }

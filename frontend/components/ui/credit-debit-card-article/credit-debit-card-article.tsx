"use client"

import React from "react"
import { Control, useWatch } from "react-hook-form"
import { getCardType } from "@/components/credit-card-input"
import { Amex, Discover, Visa } from "@/components/icons/payment-icons"
import { MastercardDefault } from "@blend-metrics/icons/payment-methods"
import { Check, CreditCard, Edit03, MoreHorizontal, Trash03, Trash2 } from "@blend-metrics/icons"
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, IconButton } from "@/components/ui"
import RmDialog from "@/components/ui/rm-dialog/rm-dialog"
import type { BillingAddressFormValues } from "@/types/checkout-core"

export default function CreditDebitCardArticle1 ({
  onEdit,
  onRemove,
  cardNumber,
  saveDefaultPaymentMethod,
  onChange,
}: {
  onEdit?: () => void
  onRemove?: () => void
  cardNumber?: string
  saveDefaultPaymentMethod?: boolean
  onChange?: () => void
})  {
  const kind = getCardType(cardNumber || "")

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
      <div className="flex items-center gap-x-3">
        {kind === "visa" ? (
          <Visa className="w-[46.5px] h-[31px]" />
        ) : kind === "amex" ? (
          <Amex className="w-[46.5px] h-[31px]" />
        ) : kind === "discover" ? (
          <Discover className="w-[46.5px] h-[31px]" />
        ) : kind === "mastercard" ? (
          <MastercardDefault className="w-[46.5px] h-[31px]" />
        ) : (
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
            <CreditCard className="size-6" />
          </div>
        )}
        <div className="inline-flex flex-col gap-y-1">
          <div className="inline-flex items-center gap-x-2">
            <span className="inline-block text-sm text-dark-blue-400">
              {kind === "visa"
                ? "Visa"
                : kind === "amex"
                  ? "American Express"
                  : kind === "discover"
                    ? "Discover"
                    : kind === "mastercard"
                      ? "Mastercard"
                      : "Credit Card"}
            </span>
            {saveDefaultPaymentMethod && (
              <Badge visual="primary">Default</Badge>
            )}
          </div>
          <span className="inline-block text-xs text-[#858585] leading-none">
            Credit ****{(cardNumber ?? "").slice(-4)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-x-5">
        <Button variant="link" visual="gray" onClick={onChange}>
          Change
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              visual="gray"
              variant="ghost"
              className="h-6 w-6 text-gray-500"
            >
              <MoreHorizontal className="h-5 w-5" />
            </IconButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-[165px]" align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Edit03 className="h-4 w-4" /> Edit
            </DropdownMenuItem>

            <RmDialog
              onRemove={onRemove}
              title="Remove Payment Method?"
              description="Are you sure you want to remove American Express Credit ****1234 from your payment methods?"
              trigger={({ isOpen, setIsOpen }) => (
                <DropdownMenuItem
                  visual="destructive"
                  onSelect={() => setIsOpen(!isOpen)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const CreditDebitCardArticle2 = ({
  cardNumber,
  saveDefaultPaymentMethod,
  onEdit,
  onRemove,
  amountToBePaid,
}: {
  cardNumber?: string
  saveDefaultPaymentMethod?: boolean
  onEdit?: () => void
  onRemove?: () => void
  amountToBePaid: string
}) => {
  const kind = getCardType(cardNumber || "")

  return (
    <div className="flex items-center gap-x-2.5">
      <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <div className="flex items-center gap-x-3">
          {kind === "visa" ? (
            <Visa className="w-[46.5px] h-[31px]" />
          ) : kind === "amex" ? (
            <Amex className="w-[46.5px] h-[31px]" />
          ) : kind === "discover" ? (
            <Discover className="w-[46.5px] h-[31px]" />
          ) : kind === "mastercard" ? (
            <MastercardDefault className="w-[46.5px] h-[31px]" />
          ) : (
            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
              <CreditCard className="size-6" />
            </div>
          )}
          <div className="inline-flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-2">
              <span className="inline-block text-sm text-dark-blue-400">
                {kind === "visa"
                  ? "Visa"
                  : kind === "amex"
                    ? "American Express"
                    : kind === "discover"
                      ? "Discover"
                      : kind === "mastercard"
                        ? "Mastercard"
                        : "Credit Card"}
              </span>
              {saveDefaultPaymentMethod && (
                <Badge visual="primary">Default</Badge>
              )}
            </div>
            <span className="inline-block text-xs text-[#858585] leading-none">
              Credit ****{(cardNumber ?? "").slice(-4)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <IconButton
            className="rounded-full opacity-50 hover:opacity-100"
            variant="ghost"
            visual="gray"
            onClick={onEdit}
          >
            <Edit03 className="size-[18px]" />
          </IconButton>
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

const CreditDebitCardArticle3 = ({
  cardNumber,
  saveDefaultPaymentMethod,
}: {
  cardNumber?: string
  saveDefaultPaymentMethod?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) => {
  const kind = getCardType(cardNumber || "")

  return (
    <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
      <div className="flex items-center gap-x-3">
        {kind === "visa" ? (
          <Visa className="w-[46.5px] h-[31px]" />
        ) : kind === "amex" ? (
          <Amex className="w-[46.5px] h-[31px]" />
        ) : kind === "discover" ? (
          <Discover className="w-[46.5px] h-[31px]" />
        ) : kind === "mastercard" ? (
          <MastercardDefault className="w-[46.5px] h-[31px]" />
        ) : (
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
            <CreditCard className="size-6" />
          </div>
        )}
        <div className="inline-flex flex-col gap-y-1">
          <div className="inline-flex items-center gap-x-2">
            <span className="inline-block text-sm text-dark-blue-400">
              {kind === "visa"
                ? "Visa"
                : kind === "amex"
                  ? "American Express"
                  : kind === "discover"
                    ? "Discover"
                    : kind === "mastercard"
                      ? "Mastercard"
                      : "Credit Card"}
            </span>
            {saveDefaultPaymentMethod && (
              <Badge visual="primary">Default</Badge>
            )}
          </div>
          <span className="inline-block text-xs text-[#858585] leading-none">
            Credit ****{(cardNumber ?? "").slice(-4)}
          </span>
        </div>
      </div>

      <Button
        className="bg-white group-data-[state=checked]/item:hidden"
        variant="outlined"
        visual="gray"
        type="button"
      >
        Use This
      </Button>
      <div className="size-6 rounded-full bg-primary-500 hidden items-center justify-center shrink-0 group-data-[state=checked]/item:inline-flex">
        <Check className="size-[16.4px] text-white" />
      </div>
    </div>
  )
}

const CreditDebitCardArticle = ({
  onEdit,
  control,
  onRemove,
  cardNumber: cardNumberProp,
  saveDefaultPaymentMethod: saveDefaultPaymentMethodProp,
  onChange,
}: {
  onEdit?: () => void
  control?: Control<BillingAddressFormValues>
  onRemove?: () => void
  cardNumber?: string
  saveDefaultPaymentMethod?: boolean
  onChange?: () => void
}) => {
  const cardNumber = useWatch({
    control: control,
    name: "cardNumber",
  })
  const saveDefaultPaymentMethod = useWatch({
    control: control,
    name: "saveDefaultPaymentMethod",
  })
  const kind = getCardType(cardNumberProp || cardNumber || "")

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
      <div className="flex items-center gap-x-3">
        {kind === "visa" ? (
          <Visa className="w-[46.5px] h-[31px]" />
        ) : kind === "amex" ? (
          <Amex className="w-[46.5px] h-[31px]" />
        ) : kind === "discover" ? (
          <Discover className="w-[46.5px] h-[31px]" />
        ) : kind === "mastercard" ? (
          <MastercardDefault className="w-[46.5px] h-[31px]" />
        ) : (
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
            <CreditCard className="size-6" />
          </div>
        )}
        <div className="inline-flex flex-col gap-y-1">
          <div className="inline-flex items-center gap-x-2">
            <span className="inline-block text-sm text-dark-blue-400">
              {kind === "visa"
                ? "Visa"
                : kind === "amex"
                  ? "American Express"
                  : kind === "discover"
                    ? "Discover"
                    : kind === "mastercard"
                      ? "Mastercard"
                      : "Credit Card"}
            </span>
            {(saveDefaultPaymentMethodProp || saveDefaultPaymentMethod) && (
              <Badge visual="primary">Default</Badge>
            )}
          </div>
          <span className="inline-block text-xs text-[#858585] leading-none">
            Credit ****{(cardNumber ?? "").slice(-4)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-x-5">
        <Button variant="link" visual="gray" onClick={onChange}>
          Change
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              visual="gray"
              variant="ghost"
              className="h-6 w-6 text-gray-500"
            >
              <MoreHorizontal className="h-5 w-5" />
            </IconButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-[165px]" align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Edit03 className="h-4 w-4" /> Edit
            </DropdownMenuItem>

            <RmDialog
              onRemove={onRemove}
              title="Remove Payment Method?"
              description="Are you sure you want to remove American Express Credit ****1234 from your payment methods?"
              trigger={({ isOpen, setIsOpen }) => (
                <DropdownMenuItem
                  visual="destructive"
                  onSelect={() => setIsOpen(!isOpen)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
const CreditCardCvvOrCvc = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={321}
      height={198}
      viewBox="0 0 321 198"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#a)">
        <g clipPath="url(#b)">
          <rect
            x={4.184}
            y={2.865}
            width={305}
            height={181.955}
            rx={11.402}
            fill="url(#c)"
          />
          <g opacity={0.1} filter="url(#d)">
            <path
              d="M273.366 116.52a.68.68 0 0 0 .284-.377q.056-.225-.142-.554-.2-.33-.426-.386a.52.52 0 0 0-.444.104 5.6 5.6 0 0 1-1.305.686 4.4 4.4 0 0 1-1.456.254q-.587 0-1.05-.169a2.2 2.2 0 0 1-.785-.499 2.2 2.2 0 0 1-.491-.771 2.8 2.8 0 0 1-.171-1.005q0-.518.161-.95.16-.442.464-.752a1.9 1.9 0 0 1 .718-.489q.425-.179.965-.179.68 0 1.182.179.5.17.964.489.151.093.473.094.398 0 .567-.141.161-.141.142-.47l-.189-4.701q-.019-.329-.161-.47-.152-.141-.548-.141h-5.05q-.321 0-.453.141-.142.141-.142.498t.142.498q.132.141.453.141h4.407l.123 3.018a4 4 0 0 0-.955-.385 4 4 0 0 0-1.078-.141q-.861 0-1.542.282-.69.273-1.163.78-.472.498-.718 1.194-.255.687-.256 1.505 0 .827.284 1.532.275.696.794 1.213a3.75 3.75 0 0 0 1.258.799 4.5 4.5 0 0 0 1.655.291q.926 0 1.844-.3a6.7 6.7 0 0 0 1.645-.818"
              fill="url(#e)"
            />
            <path
              d="M260.767 116.454q.227-.16.274-.376.047-.227-.151-.555-.208-.329-.435-.376a.5.5 0 0 0-.435.103 5.3 5.3 0 0 1-1.333.724q-.728.273-1.485.273-1.2 0-1.796-.564-.606-.564-.605-1.495 0-.987.624-1.476.624-.498 1.73-.498h.69q.322 0 .464-.141.132-.141.132-.499 0-.357-.132-.498-.142-.141-.464-.141h-.52q-1.088 0-1.635-.451-.558-.452-.558-1.316 0-.8.558-1.251.548-.46 1.579-.461 1.097 0 1.862.367v.63q0 .329.161.47.151.141.549.141.396 0 .557-.141.152-.141.152-.47v-1.025a.8.8 0 0 0-.057-.329.6.6 0 0 0-.199-.207 6 6 0 0 0-1.39-.611 5.8 5.8 0 0 0-1.626-.216q-.822 0-1.484.226-.663.216-1.135.62a2.74 2.74 0 0 0-.728.978q-.255.573-.256 1.279 0 .846.398 1.419.387.573 1.049.912-.841.348-1.324 1.025-.49.677-.491 1.664 0 .762.264 1.401.256.63.757 1.09.492.451 1.22.706.728.253 1.654.253.474 0 .955-.084.474-.085.937-.235.453-.16.879-.376.425-.217.794-.489"
              fill="url(#f)"
            />
            <path
              d="M244.632 117.206a.63.63 0 0 0 .35.367q.246.102.577.047.321-.057.473-.235.15-.189.028-.48l-3.848-9.355h4.481v1.373q0 .329.161.47.151.141.549.141.396 0 .558-.141.15-.141.151-.47v-2.012q0-.357-.133-.498-.141-.141-.463-.141h-6.373q-.322 0-.454.141-.142.141-.142.498 0 .123.019.226.019.094.038.15z"
              fill="url(#g)"
            />
            <path
              d="M235.627 116.52a.67.67 0 0 0 .283-.377q.057-.225-.142-.554t-.425-.386a.52.52 0 0 0-.444.104 5.6 5.6 0 0 1-1.305.686 4.4 4.4 0 0 1-1.456.254q-.587 0-1.05-.169a2.2 2.2 0 0 1-.785-.499 2.25 2.25 0 0 1-.492-.771q-.17-.45-.17-1.005 0-.518.161-.95.161-.442.463-.752.293-.32.719-.489.426-.179.964-.179.681 0 1.182.179a4 4 0 0 1 .965.489q.151.093.473.094.396 0 .567-.141.16-.141.142-.47l-.189-4.701q-.02-.329-.161-.47-.152-.141-.549-.141h-5.049q-.32 0-.454.141-.141.141-.142.498 0 .357.142.498.133.141.454.141h4.407l.122 3.018a4 4 0 0 0-.955-.385 4 4 0 0 0-1.078-.141q-.86 0-1.541.282-.69.273-1.163.78a3.3 3.3 0 0 0-.718 1.194 4.3 4.3 0 0 0-.256 1.505q0 .827.284 1.532a3.5 3.5 0 0 0 .794 1.213 3.75 3.75 0 0 0 1.258.799 4.5 4.5 0 0 0 1.655.291q.926 0 1.843-.3a6.7 6.7 0 0 0 1.646-.818"
              fill="url(#h)"
            />
            <path
              d="M206.032 116.153v-2.106h4.52q.322 0 .464-.141.132-.141.132-.498 0-.31-.095-.442l-4.576-6.328a1.45 1.45 0 0 0-.435-.423q-.237-.15-.605-.15-.445 0-.634.207-.189.197-.189.526v5.97h-1.532q-.32 0-.454.141-.141.14-.141.499 0 .357.141.498.133.141.454.141h1.532v2.106h-1.248q-.322 0-.454.141-.141.141-.142.498 0 .357.142.498.132.142.454.142h4.066q.322 0 .463-.142.133-.141.133-.498t-.133-.498q-.141-.141-.463-.141zm-.075-8.048 3.309 4.663h-3.234z"
              fill="url(#i)"
            />
            <path
              d="M193.453 116.153v-2.106h4.52q.32 0 .463-.141.132-.141.132-.498 0-.31-.094-.442l-4.577-6.328a1.45 1.45 0 0 0-.435-.423q-.236-.15-.605-.15-.444 0-.633.207-.19.197-.19.526v5.97h-1.531q-.322 0-.454.141-.142.14-.142.499 0 .357.142.498.132.141.454.141h1.531v2.106h-1.248q-.32 0-.454.141-.141.141-.141.498t.141.498q.133.142.454.142h4.066q.321 0 .463-.142.133-.141.133-.498t-.133-.498q-.142-.141-.463-.141zm-.076-8.048 3.31 4.663h-3.234z"
              fill="url(#j)"
            />
            <path
              d="M181.998 116.153v-8.424l2.345.846q.208.075.397-.009.18-.094.293-.442.114-.348.029-.545a.49.49 0 0 0-.312-.273l-3.452-1.232q-.302-.103-.51.066-.208.16-.208.517v9.496h-2.411q-.322 0-.454.141-.142.141-.142.498t.142.498q.132.142.454.142h6.373q.321 0 .463-.142.132-.141.132-.498t-.132-.498q-.142-.141-.463-.141z"
              fill="url(#k)"
            />
            <path
              d="M169.418 116.153v-8.424l2.345.846q.209.075.398-.009.179-.094.293-.442t.028-.545a.49.49 0 0 0-.312-.273l-3.451-1.232q-.303-.103-.511.066-.208.16-.208.517v9.496h-2.411q-.322 0-.454.141-.142.141-.142.498t.142.498q.132.142.454.142h6.373q.322 0 .463-.142.133-.141.133-.498t-.133-.498q-.142-.141-.463-.141z"
              fill="url(#l)"
            />
            <path
              d="M143.134 116.153v-2.106h4.52q.32 0 .463-.141.132-.141.132-.498 0-.31-.094-.442l-4.577-6.328a1.45 1.45 0 0 0-.435-.423q-.236-.15-.605-.15-.444 0-.633.207-.19.197-.19.526v5.97h-1.531q-.322 0-.454.141-.142.14-.142.499 0 .357.142.498.132.141.454.141h1.531v2.106h-1.248q-.32 0-.454.141-.141.141-.141.498t.141.498q.133.142.454.142h4.066q.322 0 .464-.142.132-.141.132-.498t-.132-.498q-.142-.141-.464-.141zm-.076-8.048 3.31 4.663h-3.234z"
              fill="url(#m)"
            />
            <path
              d="M134.989 116.52a.67.67 0 0 0 .283-.377q.057-.225-.141-.554-.2-.33-.426-.386a.52.52 0 0 0-.444.104 5.6 5.6 0 0 1-1.305.686 4.4 4.4 0 0 1-1.456.254q-.587 0-1.05-.169a2.2 2.2 0 0 1-.785-.499 2.2 2.2 0 0 1-.491-.771 2.8 2.8 0 0 1-.171-1.005q0-.518.161-.95.161-.442.463-.752.293-.32.719-.489.425-.179.965-.179.68 0 1.181.179.502.17.965.489.151.093.473.094.397 0 .567-.141.16-.141.142-.47l-.189-4.701q-.019-.329-.161-.47-.152-.141-.548-.141h-5.05q-.32 0-.454.141-.141.141-.141.498t.141.498q.133.141.454.141h4.407l.123 3.018a4 4 0 0 0-.955-.385 4 4 0 0 0-1.078-.141q-.861 0-1.542.282-.69.273-1.163.78-.472.498-.718 1.194a4.3 4.3 0 0 0-.256 1.505q0 .827.284 1.532.275.696.794 1.213a3.75 3.75 0 0 0 1.258.799 4.5 4.5 0 0 0 1.655.291q.926 0 1.843-.3a6.7 6.7 0 0 0 1.646-.818"
              fill="url(#n)"
            />
            <path
              d="M117.974 116.153v-2.106h4.52q.322 0 .463-.141.133-.141.133-.498 0-.31-.095-.442l-4.576-6.328a1.5 1.5 0 0 0-.435-.423q-.237-.15-.605-.15-.445 0-.634.207-.189.197-.189.526v5.97h-1.532q-.32 0-.454.141-.141.14-.142.499 0 .357.142.498.133.141.454.141h1.532v2.106h-1.248q-.322 0-.454.141-.142.141-.142.498t.142.498q.132.142.454.142h4.066q.322 0 .463-.142.132-.141.132-.498t-.132-.498q-.141-.141-.463-.141zm-.075-8.048 3.309 4.663h-3.234z"
              fill="url(#o)"
            />
            <path
              d="M110.122 111.856q0-1.307-.283-2.369-.283-1.071-.804-1.833a3.8 3.8 0 0 0-1.267-1.175 3.4 3.4 0 0 0-1.674-.414q-.917 0-1.664.414-.747.413-1.267 1.175-.53.762-.813 1.833-.284 1.062-.284 2.369t.284 2.379q.283 1.062.813 1.824.52.752 1.267 1.166a3.4 3.4 0 0 0 1.664.413q.927 0 1.674-.413a3.85 3.85 0 0 0 1.267-1.166q.52-.762.804-1.824.283-1.072.283-2.379m-1.494 0q0 1.053-.189 1.871t-.52 1.382q-.34.555-.804.846a1.87 1.87 0 0 1-1.021.292q-.558 0-1.021-.292a2.45 2.45 0 0 1-.794-.846q-.34-.564-.53-1.382a8.4 8.4 0 0 1-.189-1.871q0-1.053.189-1.871.19-.818.53-1.382.33-.564.794-.855a1.9 1.9 0 0 1 1.021-.292q.558 0 1.021.292.463.291.804.855.331.564.52 1.382.189.819.189 1.871"
              fill="url(#p)"
            />
            <path
              d="M84.963 111.856q0-1.307-.284-2.369-.284-1.071-.803-1.833a3.8 3.8 0 0 0-1.267-1.175 3.4 3.4 0 0 0-1.674-.414q-.917 0-1.664.414-.747.413-1.267 1.175-.53.762-.814 1.833-.283 1.062-.283 2.369t.283 2.379q.284 1.062.814 1.824.52.752 1.267 1.166a3.4 3.4 0 0 0 1.664.413q.926 0 1.674-.413a3.86 3.86 0 0 0 1.267-1.166q.52-.762.803-1.824.285-1.072.284-2.379m-1.494 0q0 1.053-.19 1.871-.188.819-.52 1.382-.34.555-.803.846-.464.292-1.021.292-.558 0-1.021-.292a2.46 2.46 0 0 1-.795-.846q-.34-.564-.53-1.382a8.4 8.4 0 0 1-.188-1.871q0-1.053.189-1.871t.53-1.382q.33-.564.794-.855.463-.291 1.02-.292.559 0 1.022.292.463.291.804.855.33.564.52 1.382.189.819.189 1.871"
              fill="url(#q)"
            />
            <path
              d="M66.067 109.732q0-.5.17-.912.17-.424.482-.724.312-.302.757-.47.444-.17.993-.17.539 0 .983.151.435.15.747.432t.482.677.17.875q0 .489-.16.893a2 2 0 0 1-.473.677 2.3 2.3 0 0 1-.747.442q-.444.15-1.002.15-.52 0-.965-.141a2.3 2.3 0 0 1-.756-.414 2 2 0 0 1-.502-.639 1.9 1.9 0 0 1-.18-.827m5.352 6.524q-1.305-.065-2.27-.404-.973-.348-1.645-.921a4.2 4.2 0 0 1-1.05-1.373 5.7 5.7 0 0 1-.52-1.749q.502.65 1.22.997.709.338 1.523.338.784 0 1.456-.253.67-.255 1.163-.715.492-.47.775-1.119.274-.658.274-1.466a3.6 3.6 0 0 0-.274-1.411 3.4 3.4 0 0 0-.785-1.118 3.7 3.7 0 0 0-1.22-.734 4.6 4.6 0 0 0-1.597-.263q-.503 0-.974.113a3.5 3.5 0 0 0-.908.348q-.425.225-.776.573-.358.339-.633.799-.36.612-.539 1.392-.19.77-.19 1.795 0 .753.162 1.523.15.762.491 1.477.34.705.88 1.335.529.62 1.286 1.1.747.47 1.73.77.984.293 2.222.348a.5.5 0 0 0 .36-.122q.141-.122.18-.508.036-.423-.058-.582a.33.33 0 0 0-.283-.17"
              fill="url(#r)"
            />
            <path
              d="M59.51 116.52a.67.67 0 0 0 .284-.377q.056-.225-.142-.554t-.425-.386a.52.52 0 0 0-.445.104 5.6 5.6 0 0 1-1.305.686 4.4 4.4 0 0 1-1.456.254q-.585 0-1.05-.169a2.2 2.2 0 0 1-.784-.499 2.2 2.2 0 0 1-.492-.771q-.17-.45-.17-1.005 0-.518.16-.95.161-.442.464-.752.293-.32.719-.489.425-.179.964-.179.681 0 1.182.179.501.17.964.489.152.093.473.094.397 0 .568-.141.16-.141.141-.47l-.189-4.701q-.019-.329-.16-.47-.151-.141-.549-.141h-5.05q-.32 0-.453.141-.142.141-.142.498t.142.498q.133.141.454.141h4.406l.123 3.018a4 4 0 0 0-.955-.385q-.51-.141-1.078-.141-.86 0-1.541.282-.69.273-1.163.78a3.3 3.3 0 0 0-.719 1.194q-.255.687-.255 1.505 0 .827.284 1.532.273.696.794 1.213.52.507 1.258.799a4.5 4.5 0 0 0 1.654.291q.927 0 1.844-.3a6.7 6.7 0 0 0 1.645-.818"
              fill="url(#s)"
            />
            <path
              d="M42.496 116.153v-2.106h4.52q.32 0 .463-.141.132-.141.132-.498 0-.31-.094-.442l-4.577-6.328a1.5 1.5 0 0 0-.435-.423q-.236-.15-.605-.15-.444 0-.633.207-.19.197-.19.526v5.97h-1.531q-.322 0-.454.141-.142.14-.142.499 0 .357.142.498.133.141.454.141h1.532v2.106h-1.249q-.321 0-.453.141-.142.141-.142.498t.142.498q.133.142.453.142h4.066q.323 0 .464-.142.132-.141.132-.498t-.132-.498q-.143-.141-.464-.141zm-.076-8.048 3.31 4.663h-3.234z"
              fill="url(#t)"
            />
          </g>
          <path fill="#F6F6F6" d="M24.611 63.678h189.081v33.255H24.611z" />
          <path fill="#F3F3F3" d="M4.184 19.969h305v29.455h-305z" />
          <rect
            x={220.105}
            y={68.666}
            width={49.408}
            height={23.279}
            rx={3.563}
            fill="#fff"
            fillOpacity={0.01}
          />
          <rect
            x={220.105}
            y={68.666}
            width={49.408}
            height={23.279}
            rx={3.563}
            stroke="#306CFE"
            strokeWidth={2.375}
          />
          <path
            d="M234.113 75.354q.31 0 .437.146.137.137.137.474t-.137.484q-.128.135-.437.136h-4.249l-.119 2.927a3.95 3.95 0 0 1 1.96-.51q1.095 0 1.897.465t1.222 1.295q.429.82.428 1.887 0 1.067-.474 1.915-.474.84-1.349 1.322-.876.483-2.024.483a5.6 5.6 0 0 1-1.76-.291 6.2 6.2 0 0 1-1.605-.794q-.283-.19-.283-.465a.85.85 0 0 1 .146-.437q.237-.392.529-.392.146 0 .31.118.593.42 1.286.666a4.1 4.1 0 0 0 1.377.246q.738 0 1.285-.292.548-.3.83-.83.292-.538.292-1.249 0-.675-.274-1.194a1.9 1.9 0 0 0-.775-.812q-.501-.292-1.176-.292-.62 0-1.113.164a3.5 3.5 0 0 0-.957.484q-.146.09-.456.09-.383 0-.547-.136-.155-.136-.137-.456l.183-4.559q.018-.32.164-.456.145-.137.519-.137zm10.374-.2q1.049 0 1.833.374.784.364 1.213 1.048.428.675.428 1.587 0 .784-.364 1.358a2.6 2.6 0 0 1-1.031.903q.83.347 1.286 1.012.465.666.465 1.596 0 .994-.447 1.75-.438.757-1.285 1.177-.848.42-2.025.42a5.6 5.6 0 0 1-1.805-.31 6 6 0 0 1-1.632-.84q-.274-.2-.274-.456 0-.182.155-.446.237-.383.529-.383.146 0 .31.118.602.447 1.304.712.702.255 1.413.255 1.131 0 1.724-.529.592-.538.592-1.468 0-.939-.601-1.422-.594-.493-1.669-.493h-.666q-.31 0-.446-.137-.129-.145-.128-.483 0-.337.128-.474.137-.146.446-.146h.502q1.04 0 1.577-.438.538-.437.538-1.276 0-.775-.538-1.213-.538-.447-1.522-.447-1.058 0-1.797.356v.61q0 .32-.155.457-.154.136-.529.136-.373 0-.529-.136-.155-.136-.155-.456v-.994a.8.8 0 0 1 .055-.32.55.55 0 0 1 .192-.2q1.304-.802 2.908-.802m16.494.2q.31 0 .437.146.137.137.137.474 0 .22-.055.365l-3.884 9.62a.58.58 0 0 1-.265.31.77.77 0 0 1-.419.11.97.97 0 0 1-.538-.137.39.39 0 0 1-.201-.347q0-.128.046-.228l3.711-9.073h-4.322v1.332q0 .318-.155.456-.155.135-.529.136-.373 0-.529-.136-.155-.138-.155-.456v-1.952q0-.338.128-.474.136-.146.447-.146z"
            fill="#0F172A"
          />
          <path
            d="M234.113 74.78q.31 0 .437.146.137.137.137.474t-.137.483q-.128.138-.437.137h-4.249l-.119 2.927a3.95 3.95 0 0 1 1.96-.51q1.095 0 1.897.465t1.222 1.294q.429.821.428 1.888 0 1.067-.474 1.915-.474.839-1.349 1.322-.876.483-2.024.483a5.6 5.6 0 0 1-1.76-.292 6.2 6.2 0 0 1-1.605-.793q-.283-.192-.283-.465 0-.201.146-.438.237-.392.529-.392.146 0 .31.119.593.42 1.286.665.693.247 1.377.247.738 0 1.285-.292.548-.3.83-.83.292-.538.292-1.25 0-.673-.274-1.194a1.9 1.9 0 0 0-.775-.811q-.501-.292-1.176-.292-.62 0-1.113.164a3.5 3.5 0 0 0-.957.483q-.146.092-.456.092-.383 0-.547-.137-.155-.136-.137-.456l.183-4.56q.018-.318.164-.455.145-.137.519-.137zm10.374-.2q1.049 0 1.833.373a2.77 2.77 0 0 1 1.213 1.049q.428.675.428 1.587 0 .783-.364 1.358a2.6 2.6 0 0 1-1.031.903q.83.346 1.286 1.012.465.666.465 1.596 0 .993-.447 1.75-.438.757-1.285 1.177-.848.42-2.025.42a5.6 5.6 0 0 1-1.805-.31 6 6 0 0 1-1.632-.84q-.274-.2-.274-.456 0-.181.155-.447.237-.382.529-.382.146 0 .31.118.602.447 1.304.711.702.255 1.413.256 1.131 0 1.724-.53.592-.537.592-1.467 0-.939-.601-1.423-.594-.492-1.669-.492h-.666q-.31 0-.446-.137-.129-.145-.128-.483 0-.338.128-.474.137-.147.446-.146h.502q1.04 0 1.577-.438.538-.438.538-1.276 0-.775-.538-1.213-.538-.447-1.522-.447-1.058 0-1.797.356v.61q0 .32-.155.457-.154.135-.529.136-.373 0-.529-.136-.155-.138-.155-.456v-.994a.8.8 0 0 1 .055-.32.55.55 0 0 1 .192-.2q1.304-.803 2.908-.803m16.494.2q.31 0 .437.146.137.137.137.474 0 .22-.055.365l-3.884 9.62a.58.58 0 0 1-.265.31.77.77 0 0 1-.419.11.97.97 0 0 1-.538-.138.39.39 0 0 1-.201-.346q0-.127.046-.228l3.711-9.073h-4.322v1.332q0 .318-.155.455t-.529.137q-.373 0-.529-.137-.155-.136-.155-.456V75.4q0-.339.128-.475.136-.146.447-.146z"
            fill="#94A3B8"
          />
          <path
            d="M234.113 75.067q.31 0 .437.146.137.137.137.474t-.137.484q-.128.135-.437.136h-4.249l-.119 2.927a3.95 3.95 0 0 1 1.96-.51q1.095 0 1.897.465t1.222 1.295q.429.82.428 1.887 0 1.067-.474 1.915-.474.84-1.349 1.322-.876.483-2.024.483a5.6 5.6 0 0 1-1.76-.292 6.2 6.2 0 0 1-1.605-.793q-.283-.19-.283-.465 0-.201.146-.438.237-.391.529-.392.146 0 .31.119.593.42 1.286.666a4.1 4.1 0 0 0 1.377.246q.738 0 1.285-.292.548-.3.83-.83.292-.538.292-1.249 0-.675-.274-1.194a1.9 1.9 0 0 0-.775-.812q-.501-.292-1.176-.292-.62 0-1.113.164a3.5 3.5 0 0 0-.957.484q-.146.09-.456.09-.383 0-.547-.136-.155-.136-.137-.456l.183-4.56q.018-.318.164-.455.145-.137.519-.137zm10.374-.2q1.049 0 1.833.373a2.77 2.77 0 0 1 1.213 1.05q.428.674.428 1.586 0 .783-.364 1.358a2.6 2.6 0 0 1-1.031.903q.83.346 1.286 1.012.465.666.465 1.596 0 .994-.447 1.75-.438.757-1.285 1.177-.848.42-2.025.42a5.6 5.6 0 0 1-1.805-.31 6 6 0 0 1-1.632-.84q-.274-.2-.274-.456 0-.182.155-.446.237-.383.529-.383.146 0 .31.118.602.447 1.304.711.702.255 1.413.256 1.131 0 1.724-.53.592-.537.592-1.467 0-.939-.601-1.423-.594-.492-1.669-.492h-.666q-.31 0-.446-.137-.129-.145-.128-.483 0-.338.128-.474.137-.147.446-.146h.502q1.04 0 1.577-.438.538-.438.538-1.276 0-.775-.538-1.213-.538-.447-1.522-.447-1.058 0-1.797.356v.61q0 .32-.155.457-.154.136-.529.136-.373 0-.529-.136-.155-.138-.155-.456v-.994a.8.8 0 0 1 .055-.32.55.55 0 0 1 .192-.2q1.304-.802 2.908-.802m16.494.2q.31 0 .437.146.137.137.137.474 0 .22-.055.365l-3.884 9.62a.58.58 0 0 1-.265.31.77.77 0 0 1-.419.11.97.97 0 0 1-.538-.138.39.39 0 0 1-.201-.346q0-.127.046-.228l3.711-9.073h-4.322v1.332q0 .318-.155.456-.155.135-.529.136-.373 0-.529-.136-.155-.138-.155-.456v-1.952q0-.338.128-.474.136-.146.447-.146z"
            fill="#3E4C60"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M282.906 136.996a1.25 1.25 0 0 1 1.694.475 24 24 0 0 1 3.078 11.779c0 4.133-1.061 8.196-3.078 11.779a1.25 1.25 0 0 1-1.694.476 1.234 1.234 0 0 1-.478-1.685 21.57 21.57 0 0 0 2.76-10.57c0-3.713-.953-7.358-2.76-10.57a1.233 1.233 0 0 1 .478-1.684m-4.793 2.458a1.25 1.25 0 0 1 1.695.476 19 19 0 0 1 2.435 9.32c0 3.27-.839 6.485-2.435 9.321a1.25 1.25 0 0 1-1.695.476 1.234 1.234 0 0 1-.478-1.685 16.55 16.55 0 0 0 2.118-8.112c0-2.85-.731-5.647-2.118-8.111a1.234 1.234 0 0 1 .478-1.685m-4.57 2.255a1.25 1.25 0 0 1 1.692.483 14.3 14.3 0 0 1 1.802 6.969c0 2.444-.62 4.847-1.802 6.969a1.25 1.25 0 0 1-1.692.483 1.234 1.234 0 0 1-.486-1.682 11.9 11.9 0 0 0 1.49-5.77 11.9 11.9 0 0 0-1.49-5.77 1.234 1.234 0 0 1 .486-1.682m-4.643 2.476a1.25 1.25 0 0 1 1.72.375 8.66 8.66 0 0 1 1.385 4.69 8.66 8.66 0 0 1-1.385 4.691 1.25 1.25 0 0 1-1.72.375 1.234 1.234 0 0 1-.377-1.71 6.2 6.2 0 0 0 .993-3.356 6.2 6.2 0 0 0-.993-3.355 1.234 1.234 0 0 1 .377-1.71"
            fill="#D0D5DD"
          />
        </g>
        <rect
          x={5.184}
          y={3.865}
          width={303}
          height={179.955}
          rx={10.402}
          stroke="#EAECF0"
          strokeWidth={2}
        />
      </g>
      <defs>
        <linearGradient
          id="c"
          x1={4.179}
          y1={184.819}
          x2={164.293}
          y2={-83.572}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={1} stopColor="#fff" />
        </linearGradient>
        <linearGradient
          id="e"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="f"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="g"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="h"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="i"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="j"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="k"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="l"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="m"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="n"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="o"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="p"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="q"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="r"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="s"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <linearGradient
          id="t"
          x1={156.413}
          y1={103.953}
          x2={156.413}
          y2={124.17}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#475569" />
          <stop offset={1} stopColor="#334155" />
        </linearGradient>
        <filter
          id="a"
          x={0.383}
          y={0.015}
          width={320.202}
          height={197.158}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx={3.801} dy={4.751} />
          <feGaussianBlur stdDeviation={3.801} />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_8_45220"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45220"
            result="shape"
          />
        </filter>
        <filter
          id="d"
          x={38.95}
          y={106.035}
          width={234.712}
          height={11.841}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={0.238} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0.0588235 0 0 0 0 0.0901961 0 0 0 0 0.164706 0 0 0 1 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_8_45220"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45220"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={0.238} />
          <feGaussianBlur stdDeviation={0.059} />
          <feComposite in2="hardAlpha" operator="arithmetic" k2={-1} k3={1} />
          <feColorMatrix values="0 0 0 0 0.580392 0 0 0 0 0.639216 0 0 0 0 0.721569 0 0 0 1 0" />
          <feBlend in2="shape" result="effect2_innerShadow_8_45220" />
        </filter>
        <clipPath id="b">
          <rect
            x={4.184}
            y={2.865}
            width={305}
            height={181.955}
            rx={11.402}
            fill="#fff"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
export { CreditDebitCardArticle, CreditDebitCardArticle2, CreditDebitCardArticle3, CreditCardCvvOrCvc }
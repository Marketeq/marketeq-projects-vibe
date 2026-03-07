import * as React from "react"
import { useControllableState } from "@/utils/hooks"
import { CreditCard } from "@blend-metrics/icons"
import { MastercardDefault } from "@blend-metrics/icons/payment-methods"
import { Input, InputGroup, InputLeftElement } from "./ui"

export const Visa = (props: React.SVGProps<SVGSVGElement>) => (
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
      d="M10.75 15.858H8.69L7.146 9.792c-.074-.279-.23-.526-.458-.642A6.6 6.6 0 0 0 4.8 8.508v-.233h3.318c.458 0 .801.35.859.758l.8 4.375 2.06-5.133h2.002zm4.234 0h-1.945l1.602-7.584h1.945zm4.118-5.483c.058-.408.401-.642.802-.642a3.53 3.53 0 0 1 1.888.35l.343-1.633a4.8 4.8 0 0 0-1.773-.35c-1.888 0-3.262 1.05-3.262 2.508 0 1.109.973 1.691 1.66 2.042.743.35 1.03.583.972.933 0 .525-.572.758-1.144.758a4.8 4.8 0 0 1-2.002-.467l-.344 1.634c.687.291 1.43.409 2.117.409 2.117.057 3.433-.992 3.433-2.567 0-1.984-2.69-2.1-2.69-2.975m9.498 5.483-1.545-7.584h-1.659a.86.86 0 0 0-.801.584l-2.86 7h2.002l.4-1.108h2.46l.23 1.108zm-2.918-5.541.572 2.858h-1.602z"
      fill="#172B85"
    />
  </svg>
)

const Mastercard = (props: React.SVGProps<SVGSVGElement>) => (
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
      d="M17.179 16.83a6.8 6.8 0 0 1-4.398 1.6c-3.745 0-6.781-3-6.781-6.7s3.036-6.7 6.78-6.7c1.679 0 3.215.603 4.399 1.6a6.8 6.8 0 0 1 4.398-1.6c3.745 0 6.781 3 6.781 6.7s-3.036 6.7-6.78 6.7a6.8 6.8 0 0 1-4.399-1.6"
      fill="#ED0006"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.179 16.83a6.65 6.65 0 0 0 2.382-5.1c0-2.042-.924-3.87-2.382-5.1a6.8 6.8 0 0 1 4.398-1.6c3.745 0 6.78 3 6.78 6.7s-3.035 6.7-6.78 6.7a6.8 6.8 0 0 1-4.398-1.6"
      fill="#F9A000"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.18 16.83a6.65 6.65 0 0 0 2.382-5.1c0-2.042-.925-3.87-2.383-5.1a6.65 6.65 0 0 0-2.382 5.1c0 2.042.924 3.87 2.382 5.1"
      fill="#FF5E00"
    />
  </svg>
)

export const Discover = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} fill="white" />
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} stroke="#D0D5DD" />
    <path
      d="M14 23L33 17.25V20C33 21.6569 31.6569 23 30 23H14Z"
      fill="#FD6020"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M29.3937 9.11084C30.439 9.11084 31.0139 9.59438 31.0139 10.5077C31.0662 11.2062 30.5958 11.7972 29.9686 11.9046L31.3797 13.8925H30.2822L29.0801 11.9584H28.9756V13.8925H28.0871V9.11084H29.3937ZM28.9756 11.3137H29.2369C29.8118 11.3137 30.0731 11.045 30.0731 10.5615C30.0731 10.1317 29.8118 9.86304 29.2369 9.86304H28.9756V11.3137ZM25.0034 13.8925H27.5122V13.0866H25.8919V11.7972H27.4599V10.9913H25.8919V9.91674H27.5122V9.11084H25.0034V13.8925ZM22.3902 12.3345L21.1881 9.11084H20.2474L22.1812 14H22.6515L24.5853 9.11084H23.6446L22.3902 12.3345ZM11.7805 11.5286C11.7805 12.8717 12.8258 14 14.1324 14C14.5505 14 14.9164 13.8925 15.2822 13.7314V12.6568C15.0209 12.9792 14.655 13.1941 14.2369 13.1941C13.4007 13.1941 12.7212 12.5494 12.7212 11.6897V11.5823C12.669 10.7227 13.3484 9.97048 14.1847 9.91675C14.6028 9.91675 15.0209 10.1317 15.2822 10.454V9.37948C14.9686 9.16458 14.5505 9.11085 14.1847 9.11085C12.8258 9.0034 11.7805 10.1317 11.7805 11.5286ZM10.1603 10.9376C9.63762 10.7227 9.48082 10.6152 9.48082 10.3466C9.53309 10.0242 9.79441 9.75557 10.108 9.8093C10.3693 9.8093 10.6306 9.97048 10.8397 10.1854L11.3101 9.54066C10.9442 9.2183 10.4739 9.00339 10.0035 9.00339C9.27176 8.94967 8.64459 9.54066 8.59232 10.2928V10.3466C8.59232 10.9913 8.85365 11.3674 9.68988 11.636C9.89894 11.6897 10.108 11.7972 10.3171 11.9046C10.4739 12.0121 10.5784 12.1733 10.5784 12.3882C10.5784 12.7643 10.2648 13.0866 9.95121 13.0866H9.89894C9.48082 13.0866 9.11497 12.818 8.95818 12.4419L8.38326 13.0329C8.69685 13.6239 9.32403 13.9463 9.95121 13.9463C10.7874 14 11.4669 13.3553 11.5191 12.4956V12.3345C11.4669 11.6897 11.2056 11.3674 10.1603 10.9376ZM7.12892 13.8925H8.01742V9.11084H7.12892V13.8925ZM3 9.11086H4.30662H4.56794C5.8223 9.16458 6.81532 10.2391 6.76306 11.5286C6.76306 12.227 6.44947 12.8717 5.92682 13.3553C5.45644 13.7314 4.88153 13.9463 4.30662 13.8926H3V9.11086ZM4.14983 13.0866C4.56794 13.1404 5.03833 12.9792 5.35191 12.7105C5.6655 12.3882 5.8223 11.9584 5.8223 11.4748C5.8223 11.045 5.6655 10.6152 5.35191 10.2928C5.03833 10.0242 4.56794 9.86302 4.14983 9.91674H3.8885V13.0866H4.14983Z"
      fill="black"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.9481 9C16.6415 9 15.5439 10.0745 15.5439 11.4714C15.5439 12.8146 16.5892 13.9429 17.9481 13.9966C19.307 14.0503 20.3523 12.9221 20.4046 11.5252C20.3523 10.1283 19.307 9 17.9481 9V9Z"
      fill="#FD6020"
    />
  </svg>
)

export const Amex = (props: React.SVGProps<SVGSVGElement>) => (
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

const CARD_TYPES = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  discover: /^6(?:011|5\d{2}|4[4-9]\d|22(?:1[2-9]|[2-8]\d|9[01]))/,
} as const

type Cards = keyof typeof CARD_TYPES

export const getCardType = (value: string): Cards | "unknown" => {
  return (
    (Object.keys(CARD_TYPES) as (keyof typeof CARD_TYPES)[]).find((type) =>
      CARD_TYPES[type].test(value)
    ) || "unknown"
  )
}

export const format = (value: string) => {
  const digits = value.slice(0, 19).replace(/\D/g, "")
  return digits.replace(/(\d{4})/g, "$1 ").trim()
}

interface CreditCardInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onValueChange?: (value: string) => void
  isInvalid?: boolean
  defaultValue?: string
}

const CreditCardInput = React.forwardRef<
  HTMLInputElement,
  CreditCardInputProps
>(({ onValueChange, value, defaultValue, ...props }, ref) => {
  const [state, setState] = useControllableState({
    value,
    onChange: onValueChange,
    defaultValue,
  })

  const kind = getCardType(state)

  return (
    <InputGroup>
      <Input
        ref={ref}
        className="pl-[52px]"
        type="text"
        placeholder="0000 0000 0000 0000"
        value={state}
        onChange={(e) => setState(format(e.target.value))}
        {...props}
      />
      <InputLeftElement className="w-[52px]">
        {kind === "visa" ? (
          <Visa />
        ) : kind === "amex" ? (
          <Amex />
        ) : kind === "discover" ? (
          <Discover />
        ) : kind === "mastercard" ? (
          <MastercardDefault />
        ) : (
          <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[34px] h-[24px]">
            <CreditCard className="size-4" />
          </div>
        )}
      </InputLeftElement>
    </InputGroup>
  )
})

CreditCardInput.displayName = "CreditCardInput"

export { CreditCardInput }

import * as React from "react"
import { ONE_SECOND } from "@/utils/constants"
import { cn, getIsNotEmpty, hookFormHasError } from "@/utils/functions"
import { useControllableState, useUncontrolledState } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  CreditCard,
  DivideSquare,
  Download02,
  Edit03,
  Globe,
  HelpCircle,
  LinkExternal01,
  LinkExternal02,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  ShieldTick,
  Star,
  Trash03,
  Trash2,
  X,
  Zap,
} from "@blend-metrics/icons"
import { MastercardDefault } from "@blend-metrics/icons/payment-methods"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Meta } from "@storybook/react"
import { AnimatePresence, Variants, motion } from "framer-motion"
import { useFocus } from "react-aria"
import CurrencyInput from "react-currency-input-field"
import {
  Control,
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form"
import { z } from "zod"
import { CreditCardInput, getCardType } from "@/components/credit-card-input"
import { Logo3 } from "@/components/icons"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import NextImage from "@/components/next-image"
import { CountriesCombobox } from "@/components/own-combobox"
import {
  PhoneNumberInput,
  isPhoneValid,
  phoneUtil,
} from "@/components/phone-number-input"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  DisclosureTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  ErrorMessage,
  HeadlessRadioGroupItem,
  HelperText,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxContent,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemSelector,
  ScrollArea,
  ScrollBar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
} from "@/components/ui"
import {
  BankCardSelected,
  CreditDebitSelected,
} from "./pay-in-installaments.stories"

const meta: Meta = {
  title: "Checkout",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const StepIndicator = ({ disabled }: { disabled?: boolean }) => {
  return (
    <button
      disabled={disabled}
      className="peer focus-visible:outline-none size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-primary-500 border-primary-500 disabled:text-white disabled:bg-gray-300 disabled:border-gray-300 data-[state=disabled]:text-white data-[state=disabled]:bg-gray-300 data-[state=disabled]:border-gray-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:border-primary-500"
    >
      1
    </button>
  )
}

export const Step = ({ disabled }: { disabled?: boolean }) => {
  return (
    <div className="flex gap-x-3 items-center">
      <StepIndicator disabled={disabled} />
      <span className="text-sm shrink-0 whitespace-nowrap leading-none text-dark-blue-400 font-semibold peer-disabled:text-gray-300 peer-data-[state=disabled]:text-gray-300">
        Project Details
      </span>
    </div>
  )
}

export const UserGroup = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-4 text-primary-500", className)}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12.9837 11.75C13.4521 11.75 13.8246 11.4553 14.159 11.0432C14.8437 10.1996 13.7196 9.5255 13.2908 9.19537C12.855 8.85975 12.3684 8.66963 11.875 8.625M11.25 7.375C12.1129 7.375 12.8125 6.67544 12.8125 5.8125C12.8125 4.94956 12.1129 4.25 11.25 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M2.01623 11.75C1.54791 11.75 1.17542 11.4553 0.840964 11.0432C0.156307 10.1996 1.28042 9.5255 1.70915 9.19537C2.14498 8.85975 2.63161 8.66963 3.125 8.625M3.4375 7.375C2.57456 7.375 1.875 6.67544 1.875 5.8125C1.875 4.94956 2.57456 4.25 3.4375 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M5.05238 9.94401C4.41376 10.3389 2.73936 11.1452 3.75919 12.1541C4.25736 12.647 4.8122 12.9995 5.50976 12.9995H9.49026C10.1878 12.9995 10.7426 12.647 11.2408 12.1541C12.2606 11.1452 10.5863 10.3389 9.94764 9.94401C8.45008 9.01801 6.54989 9.01801 5.05238 9.94401Z"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.68751 5.18799C9.68751 6.39611 8.70814 7.37549 7.50001 7.37549C6.29189 7.37549 5.3125 6.39611 5.3125 5.18799C5.3125 3.97986 6.29189 3.00049 7.50001 3.00049C8.70814 3.00049 9.68751 3.97986 9.68751 5.18799Z"
      stroke="currentColor"
      strokeWidth={0.9375}
    />
  </svg>
)

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
  defaultValue,
}: {
  onValueChange?: (value: string) => void
  value?: string
  placeholder?: string
  defaultValue?: string
}) => {
  const [state, setState] = useControllableState({
    onChange: onValueChange,
    value,
    defaultValue,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group bg-white data-[state=open]:bg-gray-100 hover:bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed hover:border-gray-300 hover:border-dashed border-solid rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={setState}>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Student"
          >
            <Network />
            Student (0 - 2 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Junior"
          >
            <Network1 />
            Junior (2 - 3 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Mediator"
          >
            <Network2 />
            Medior (3 - 5 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Senior"
          >
            <Network3 />
            Senior (5 - 10 years)
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Guru"
          >
            <Network4 />
            Guru (10+ years)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const Navigation = () => {
  return (
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
          <Step />
          <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
          <Step disabled />
          <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
          <Step disabled />
        </div>
      </div>
    </div>
  )
}

export const ProjectDetails = () => {
  return (
    <div className="bg-gray-50">
      <Navigation />

      <div className="px-[150px] py-[50px]">
        <div className="max-w-[1140px] mx-auto">
          <h1 className="text-2xl leading-[.7] font-bold text-dark-blue-400">
            Please confirm your project details below
          </h1>
          <p className="mt-2 text-base font-light text-dark-blue-400 leading-none">
            Then click <span className="font-normal">“Proceed to Payment”</span>{" "}
            to continue
          </p>

          <div className="mt-6 flex items-start gap-x-8">
            <div className="flex-auto">
              <div className="p-5 border flex items-center gap-x-3 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="relative h-[92px] overflow-hidden w-[181px] border border-[#DFDFDF] rounded-md shrink-0">
                  <NextImage
                    className="object-cover"
                    src="/dashboard.png"
                    alt="Dashboard"
                    sizes="25vw"
                    fill
                  />
                </div>

                <div className="flex-auto flex items-center gap-x-5">
                  <div className="flex-auto">
                    <h1 className="text-sm font-medium leading-5 border-gray-800">
                      Marketeq Client Portal - Redesigning and Optimizing
                      Website for Enhanced User Experience.
                    </h1>

                    <div className="mt-2 inline-flex items-center gap-x-2">
                      <UserGroup />
                      <span className="text-xs leading-5 font-semibold text-primary-500">
                        8 team members
                      </span>
                    </div>

                    <div className="flex mt-2 items-center gap-x-2">
                      <span className="text-[13px] leading-none font-semibold text-[#122A4B]">
                        January 2024 - August 2024
                      </span>
                    </div>
                  </div>
                  <div className="inline-flex flex-col items-end gap-y-[26px]">
                    <Badge size="md" visual="primary">
                      8 months
                    </Badge>

                    <div className="inline-flex flex-col gap-y-0.5">
                      <span className="inline-block text-dark-blue-400 text-xl leading-none font-semibold">
                        $94,000
                      </span>
                      <span className="inline-block text-dark-blue-400 text-xs leading-none">
                        Project Cost
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Tabs defaultValue="Project Scope">
                  <div className="flex items-center justify-between">
                    <TabsList className="p-1 rounded-[5px] gap-x-2 h-11 bg-white border border-gray-200">
                      <DisclosureTrigger
                        className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] data-[state=active]:bg-gray-100 text-gray-700"
                        value="Project Scope"
                      >
                        Project Scope
                      </DisclosureTrigger>
                      <DisclosureTrigger
                        className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] data-[state=active]:bg-gray-100 text-gray-700"
                        value="Team Members"
                      >
                        Team Members
                      </DisclosureTrigger>
                    </TabsList>

                    <Button
                      variant="outlined"
                      className="bg-white text-xs leading-5"
                    >
                      <Edit03 className="size-[15px] text-gray-500" /> Edit
                      Scope
                    </Button>
                  </div>
                  <TabsContent value="Team Members">
                    <div className="rounded-lg mt-6 bg-white border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              <span className="inline-flex items-center gap-x-1">
                                Name <ArrowDown className="size-[15px]" />
                              </span>
                            </TableHead>
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              Phase
                            </TableHead>
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              Experience
                            </TableHead>
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              Location
                            </TableHead>
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              Rate
                            </TableHead>
                            <TableHead className="bg-gray-50 hover:text-gray-600">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="hover:bg-white">
                            <TableCell className="py-4 px-6">
                              <span className="inline-flex items-start gap-x-2">
                                <Avatar size="sm">
                                  <AvatarImage src="/man.jpg" alt="Man" />
                                  <AvatarFallback>M</AvatarFallback>
                                </Avatar>

                                <span className="inline-flex flex-col">
                                  <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                    Vivek
                                  </span>
                                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                    @topdesigner321
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                visual="gray"
                                size="lg"
                              >
                                4 Phases
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Dropdown defaultValue="Junior" />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <CountriesCombobox
                                triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                defaultValue="United States"
                              />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                $500/hr
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge visual="success">Confirmed</Badge>
                            </TableCell>

                            <TableCell className="py-4 px-6">
                              <IconButton
                                className="w-[27px] h-[23px]"
                                variant="ghost"
                                visual="gray"
                              >
                                <MoreHorizontal className="size-[15px]" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          <TableRow className="hover:bg-white">
                            <TableCell className="py-4 px-6">
                              <span className="inline-flex items-start gap-x-2">
                                <Avatar size="sm">
                                  <AvatarImage src="/man.jpg" alt="Man" />
                                  <AvatarFallback>M</AvatarFallback>
                                </Avatar>

                                <span className="inline-flex flex-col">
                                  <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                    Vivek
                                  </span>
                                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                    @topdesigner321
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                visual="gray"
                                size="lg"
                              >
                                4 Phases
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Dropdown defaultValue="Junior" />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <CountriesCombobox
                                triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                defaultValue="United States"
                              />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                $500/hr
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge visual="success">Confirmed</Badge>
                            </TableCell>

                            <TableCell className="py-4 px-6">
                              <IconButton
                                className="w-[27px] h-[23px]"
                                variant="ghost"
                                visual="gray"
                              >
                                <MoreHorizontal className="size-[15px]" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          <TableRow className="hover:bg-white">
                            <TableCell className="py-4 px-6">
                              <span className="inline-flex items-start gap-x-2">
                                <Avatar size="sm">
                                  <AvatarImage src="/man.jpg" alt="Man" />
                                  <AvatarFallback>M</AvatarFallback>
                                </Avatar>

                                <span className="inline-flex flex-col">
                                  <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                    Vivek
                                  </span>
                                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                    @topdesigner321
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                visual="gray"
                                size="lg"
                              >
                                4 Phases
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Dropdown defaultValue="Junior" />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <CountriesCombobox
                                triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                defaultValue="United States"
                              />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                $500/hr
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge visual="success">Confirmed</Badge>
                            </TableCell>

                            <TableCell className="py-4 px-6">
                              <IconButton
                                className="w-[27px] h-[23px]"
                                variant="ghost"
                                visual="gray"
                              >
                                <MoreHorizontal className="size-[15px]" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          <TableRow className="hover:bg-white">
                            <TableCell className="py-4 px-6">
                              <span className="inline-flex items-start gap-x-2">
                                <Avatar size="sm">
                                  <AvatarImage src="/man.jpg" alt="Man" />
                                  <AvatarFallback>M</AvatarFallback>
                                </Avatar>

                                <span className="inline-flex flex-col">
                                  <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                    Vivek
                                  </span>
                                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                    @topdesigner321
                                  </span>
                                </span>
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge
                                className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                visual="gray"
                                size="lg"
                              >
                                4 Phases
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Dropdown defaultValue="Junior" />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <CountriesCombobox
                                triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                defaultValue="United States"
                              />
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                $500/hr
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <Badge visual="success">Confirmed</Badge>
                            </TableCell>

                            <TableCell className="py-4 px-6">
                              <IconButton
                                className="w-[27px] h-[23px]"
                                variant="ghost"
                                visual="gray"
                              >
                                <MoreHorizontal className="size-[15px]" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                      <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                        FAQ’s
                      </h1>

                      <p className="mt-5 text-base leading-none font-light text-dark-blue-400">
                        We use proven design methods to create a personal
                        approach to each product. This allows you to achieve
                        high results and the quality of the work done.
                      </p>

                      <div className="mt-6">
                        <Accordion
                          type="multiple"
                          className="pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                          defaultValue={["item-1"]}
                        >
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-1"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-2"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-3"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-4"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-5"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-6"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                          <AccordionItem
                            className="rounded-lg bg-white border border-gray-300"
                            value="item-7"
                          >
                            <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                              <span className="flex-auto text-left inline-block">
                                How will you ensure we&apos;re aligned on
                                progress and feedback throughout each stage?
                              </span>
                              <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </AccordionTrigger>

                            <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                              We offer a comprehensive range of IT consulting
                              services, including IT strategy development,
                              software development, network infrastructure
                              design and implementation, cybersecurity
                              assessment and solutions, cloud computing
                              solutions, and IT project management.
                            </DisclosureContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="Project Scope">
                    <div className="mt-6">
                      <Accordion
                        type="multiple"
                        defaultValue={["item-1", "item-2", "item-3"]}
                        className="flex-auto space-y-3"
                      >
                        <AccordionItem
                          value="item-1"
                          className="rounded-lg border border-gray-200 shadow-sm bg-white"
                        >
                          <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger asChild>
                                <IconButton variant="ghost" visual="gray">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </IconButton>
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                Phase One{" "}
                                <span className="font-light">Research</span>
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-x-8">
                              <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 1
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  -
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 8
                                </span>
                              </div>

                              <Button visual="gray" variant="outlined">
                                <Plus className="size-[15px]" />
                                Add task
                              </Button>
                            </div>
                          </div>

                          <DisclosureContent>
                            <Table>
                              <TableHeader className="bg-gray-50">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="hover:text-gray-600">
                                    Task
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Description
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Assignee
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Duration
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          value="item-2"
                          className="rounded-lg border border-gray-200 shadow-sm bg-white"
                        >
                          <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger asChild>
                                <IconButton
                                  className="size-8"
                                  variant="ghost"
                                  visual="gray"
                                >
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </IconButton>
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                Phase One{" "}
                                <span className="font-light">Research</span>
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-x-8">
                              <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 1
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  -
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 8
                                </span>
                              </div>

                              <Button visual="gray" variant="outlined">
                                <Plus className="size-[15px]" />
                                Add task
                              </Button>
                            </div>
                          </div>

                          <DisclosureContent>
                            <Table>
                              <TableHeader className="bg-gray-50">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="hover:text-gray-600">
                                    Task
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Description
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Assignee
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Duration
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          value="item-3"
                          className="rounded-lg border border-gray-200 shadow-sm bg-white"
                        >
                          <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger asChild>
                                <IconButton variant="ghost" visual="gray">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </IconButton>
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                Phase One{" "}
                                <span className="font-light">Research</span>
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-x-8">
                              <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 1
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  -
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day 8
                                </span>
                              </div>

                              <Button visual="gray" variant="outlined">
                                <Plus className="size-[15px]" />
                                Add task
                              </Button>
                            </div>
                          </div>

                          <DisclosureContent>
                            <Table>
                              <TableHeader className="bg-gray-50">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="hover:text-gray-600">
                                    Task
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Description
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Assignee
                                  </TableHead>
                                  <TableHead className="hover:text-gray-600">
                                    Duration
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-white">
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                      Consumer Research
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                      Conduct research to understand consumer
                                      needs, behaviors, and preferences for
                                      product optimization.
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="inline-flex items-start gap-x-2">
                                      <Avatar>
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <span className="inline-flex flex-col">
                                        <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                          Vivek
                                        </span>
                                        <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                          @topdesigner321
                                        </span>
                                      </span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 px-6">
                                    <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                      40 hours
                                    </span>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </DisclosureContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="w-[305px] shrink-0 bg-white">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
                <h1 className="text-base font-semibold leading-none text-dark-blue-400">
                  Price Details
                </h1>

                <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                  <li className="flex items-center justify-between">
                    <span className="text-xs font-light text-dark-blue-400">
                      Project cost
                    </span>
                    <span className="text-xs text-dark-blue-400">$94,000</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-xs font-light text-dark-blue-400">
                      Project cost
                    </span>
                    <span className="text-xs text-dark-blue-400">$0.00</span>
                  </li>
                </ul>

                <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                  <li className="flex items-center justify-between">
                    <span className="text-xs font-light text-dark-blue-400">
                      Project cost
                    </span>
                    <span className="text-base font-bold leading-none text-dark-blue-400">
                      $94,000
                    </span>
                  </li>
                </ul>

                <div className="mt-[21.33px]">
                  <Button className="w-full" size="md">
                    Proceed to Payment
                  </Button>
                </div>

                <div className="mt-[21.33px]">
                  <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                    By clicking the above, you agree to Marketeq’s{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                    >
                      Terms of Use
                    </Button>
                    and{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                    >
                      Policy Privacy
                    </Button>
                  </span>
                </div>

                <div className="mt-[21.33px] flex items-center justify-center">
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
  )
}

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

export const ACH = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={35}
    height={24}
    viewBox="0 0 35 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x={1}
      y={0.5}
      width={33}
      height={23}
      rx={3.5}
      fill="#fff"
      stroke="#D0D5DD"
    />
    <path
      d="M8.034 14.907H6l2.641-6.814h2.52l2.64 6.814h-2.033L9.929 9.81h-.06zm-.272-2.682h4.25v1.251h-4.25zm13.62-1.663h-1.91a1.3 1.3 0 0 0-.158-.463 1.2 1.2 0 0 0-.313-.352 1.4 1.4 0 0 0-.463-.223 2 2 0 0 0-.584-.08q-.57 0-.983.243a1.6 1.6 0 0 0-.63.702q-.219.459-.218 1.111 0 .68.221 1.138.225.456.631.688.41.23.967.23.314 0 .57-.07.26-.07.454-.203.2-.135.325-.33.13-.195.18-.442l1.911.01a2.3 2.3 0 0 1-.302.892 2.9 2.9 0 0 1-.684.802q-.436.36-1.062.572a4.4 4.4 0 0 1-1.43.213Q16.84 15 16 14.594a3.16 3.16 0 0 1-1.322-1.191q-.486-.781-.486-1.903 0-1.125.493-1.906a3.2 3.2 0 0 1 1.335-1.188Q16.86 8 17.904 8q.71 0 1.315.173.604.17 1.062.5.46.325.746.8t.355 1.089m1.083 4.345V8.093h1.892v2.735h3.085V8.093h1.888v6.814h-1.888v-2.738h-3.085v2.738z"
      fill="#000"
    />
  </svg>
)

const Wire = (props: React.SVGProps<SVGSVGElement>) => (
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
    <rect
      x={0.5}
      y={0.5}
      width={33}
      height={23}
      rx={3.5}
      fill="#fff"
      stroke="#D0D5DD"
    />
    <path
      d="m10.358 9 .84 3.179q.06.215.11.447.05.234.104.535.069-.356.117-.587t.094-.395L12.408 9h1.84l-1.89 6.687h-1.69l-.827-2.855q-.045-.15-.15-.59l-.073-.305-.064.27q-.105.442-.16.625l-.813 2.855H6.886L5 9h1.84l.768 3.197.107.494q.053.246.098.506a29 29 0 0 1 .233-1L8.886 9zm4.567 6.687V9h1.84v6.687zm3.311 0V9h1.905q1.119 0 1.56.103.44.102.76.345.36.273.555.698.194.426.194.937 0 .775-.381 1.263-.382.487-1.113.646l1.823 2.695h-2.06l-1.535-2.617v2.617zm1.708-3.526h.338q.59 0 .861-.201.272-.201.272-.63 0-.503-.253-.715-.254-.213-.852-.213h-.366zm4.289 3.526V9h4.097v1.466h-2.32v1.16h2.188v1.435H26.01v1.128h2.32v1.498z"
      fill="#000"
    />
  </svg>
)

const Swift = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x={0.5}
      y={0.5}
      width={33}
      height={23}
      rx={3.5}
      fill="#fff"
      stroke="#D0D5DD"
    />
    <path
      d="M8.798 9c-.907.019-1.694.658-1.689 1.679.004.593.481 1.061.95 1.555.72.763.933.629.9 1.402-.013.283-.503.725-1.03.724-.78-.002-1.325-.72-1.109-1.587h-.225L6 14.837h.225c.066-.212.51-.193.691-.2.341-.014.536.249 1.239.246.961-.003 1.906-.605 1.897-1.725-.005-.58-.377-.975-.868-1.432-.757-.703-1.051-1.039-.917-1.602.111-.465.459-.596.804-.6.647-.008.926.645 1.013 1.324h.209l.53-1.725h-.225c-.049.204-.31.214-.514.2-.092-.006-.144.012-.37-.061-.24-.078-.619-.268-.916-.262m2.267.231L11 9.57c.356.001.484-.006.483.631v4.636s.093.204.225 0c.131-.203 2.267-3.588 2.267-3.588v.107l-.016 3.481s.136.204.273 0c.138-.203 3.087-4.867 3.087-4.867.135-.231.237-.392.58-.4l.08-.339h-1.817l-.065.339c.398 0 .663-.06.676.17a.5.5 0 0 1-.08.292l-1.496 2.34-.032-.045V10.2a7 7 0 0 0 0-.261c-.01-.361.093-.37.386-.37l.064-.339h-2.026l-.064.339c.305.008.438.093.434.354v.478l-1.303 2.017-.048.03V9.894c-.001-.123-.03-.322.338-.323l.096-.339zm7.187 0-.064.339c.166-.008.335.052.353.231.008.078-.04.193-.08.339l-1.11 3.958c-.065.263-.395.404-.836.4l-.064.34h2.364l.08-.34c-.418-.008-.391-.119-.386-.261.003-.09.049-.172.08-.278l1.126-3.973c.116-.372.395-.408.82-.416l.08-.339zm2.685 0-.08.339c.352.025.852.022.723.416-.028.086.003.046-.032.185l-1.077 3.85c-.084.357-.345.47-.66.477l-.096.34h2.508l.097-.34c-.549-.001-.77-.071-.66-.477.024-.087.07-.24.097-.37l.514-1.694h.113c.49-.002.629.057.643.308.01.162.005.293.016.385h.274l.418-1.648-.225-.03c-.232.567-.727.575-.9.57h-.226l.354-1.356c.154-.5.204-.473.595-.477.681-.008 1.086.099 1.029 1.016h.225l.418-1.494zm4.39 0-.435 1.494h.258c.125-.417.129-.487.386-.708.263-.221.547-.308.996-.308L25.36 13.82c-.082.671-.485.669-.997.677l-.08.34h2.652l.065-.309c-.34.03-.549-.184-.483-.431.026-.095.072-.237.113-.4l1.093-3.99c.833 0 1 .32.949 1.017h.241l.418-1.494zm-10.05 4.975c-.139 0-.285.166-.321.37s.053.368.193.369c.139 0 .286-.166.321-.37s-.054-.369-.193-.37m4.116 0c-.139 0-.285.166-.321.37s.054.368.193.369c.14 0 .286-.166.321-.37s-.053-.369-.193-.37m3.538 0c-.14 0-.286.166-.322.37s.038.368.177.369c.14 0 .286-.166.322-.37.035-.203-.038-.369-.177-.37m-12.67.015c-.14 0-.27.166-.306.37s.038.369.177.37c.14 0 .286-.167.322-.37.036-.204-.054-.37-.193-.37m17.397 0c-.14 0-.286.166-.322.37s.054.369.193.37c.14 0 .286-.167.322-.37.036-.204-.054-.37-.193-.37"
      fill="#000"
    />
  </svg>
)

const GPay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={35}
    height={24}
    viewBox="0 0 35 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={1} y={0.5} width={33} height={23} rx={3.5} fill="#fff" />
    <rect x={1} y={0.5} width={33} height={23} rx={3.5} stroke="#D0D5DD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.558 15.528v-2.935h1.515q.93-.002 1.572-.618l.102-.104c.78-.85.729-2.172-.102-2.958a2.16 2.16 0 0 0-1.572-.63h-2.431v7.245zm0-3.825v-2.53h1.538c.33 0 .644.127.877.358.496.486.507 1.294.029 1.797a1.2 1.2 0 0 1-.906.376zm7.465-.745q-.59-.548-1.605-.549-1.309.002-1.96.965l.81.514q.444-.658 1.212-.658c.325 0 .638.121.883.34.239.209.376.509.376.827v.213c-.353-.196-.798-.3-1.344-.3q-.958-.002-1.532.457c-.381.306-.575.71-.575 1.224-.011.468.188.913.54 1.213.36.324.815.486 1.35.486.633 0 1.134-.284 1.515-.85h.04v.688h.877v-3.056c0-.641-.194-1.15-.587-1.514m-2.488 3.657a.75.75 0 0 1-.302-.607q.002-.407.37-.675.378-.271.934-.272.77-.007 1.196.34-.001.591-.455 1.023a1.45 1.45 0 0 1-1.031.434 1.1 1.1 0 0 1-.712-.243m5.045 3.09 3.063-7.134h-.996l-1.418 3.559h-.017l-1.452-3.56h-.996l2.01 4.64-1.14 2.495z"
      fill="#3C4043"
    />
    <path
      d="M13.394 11.958q0-.426-.069-.844H9.46v1.6h2.215a1.93 1.93 0 0 1-.82 1.266v1.04h1.321c.774-.723 1.219-1.791 1.219-3.062"
      fill="#4285F4"
    />
    <path
      d="M9.46 16.025c1.104 0 2.038-.37 2.715-1.005l-1.32-1.04c-.37.254-.844.399-1.396.399-1.07 0-1.976-.734-2.3-1.716H5.798v1.075a4.09 4.09 0 0 0 3.661 2.287"
      fill="#34A853"
    />
    <path
      d="M7.158 12.663a2.54 2.54 0 0 1 0-1.594V10h-1.36a4.18 4.18 0 0 0 0 3.732z"
      fill="#FBBC04"
    />
    <path
      d="M9.46 9.353a2.2 2.2 0 0 1 1.57.624l1.174-1.19a3.93 3.93 0 0 0-2.745-1.08A4.09 4.09 0 0 0 5.798 10l1.36 1.074c.325-.988 1.23-1.721 2.301-1.721"
      fill="#EA4335"
    />
  </svg>
)

const GPay1 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={33}
    height={13}
    viewBox="0 0 33 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.252 10.197V6.421h2.005c.821 0 1.515-.268 2.08-.795l.136-.134a2.665 2.665 0 0 0-.136-3.806 2.9 2.9 0 0 0-2.08-.81H14.04v9.321zm0-4.92V2.02h2.036c.437 0 .851.164 1.16.461.656.625.671 1.665.038 2.312-.309.32-.746.498-1.198.483zm9.88-.96q-.78-.704-2.125-.706c-1.153 0-2.02.416-2.592 1.241l1.07.662q.588-.847 1.605-.847c.43 0 .844.156 1.168.438.317.268.498.654.498 1.063v.275c-.468-.253-1.055-.386-1.779-.386-.844 0-1.522.193-2.027.587s-.761.914-.761 1.576a1.96 1.96 0 0 0 .715 1.56c.475.417 1.078.625 1.787.625.836 0 1.5-.364 2.004-1.093h.053v.885h1.16V6.265c0-.825-.256-1.48-.776-1.948M21.84 9.022a.96.96 0 0 1-.4-.78c0-.35.167-.64.49-.87.333-.23.747-.35 1.237-.35q1.017-.009 1.583.44c0 .505-.204.943-.603 1.315a1.94 1.94 0 0 1-1.364.558 1.5 1.5 0 0 1-.943-.313M28.516 13l4.054-9.18h-1.319L29.375 8.4h-.023L27.43 3.82h-1.318l2.66 5.97L27.265 13z"
      fill="#000"
    />
    <path
      d="M11.063 5.605c0-.364-.03-.729-.09-1.085H5.855v2.059h2.932a2.48 2.48 0 0 1-1.085 1.628v1.338H9.45c1.025-.93 1.613-2.305 1.613-3.94"
      fill="#4285F4"
    />
    <path
      d="M5.856 10.838c1.462 0 2.698-.476 3.594-1.293L7.702 8.207c-.49.327-1.115.512-1.846.512-1.417 0-2.615-.944-3.045-2.207H1.01v1.382c.92 1.807 2.796 2.944 4.846 2.944"
      fill="#34A853"
    />
    <path
      d="M2.811 6.513a3.2 3.2 0 0 1 0-2.052V3.086H1.01a5.24 5.24 0 0 0 0 4.802z"
      fill="#FBBC04"
    />
    <path
      d="M5.856 2.252a2.94 2.94 0 0 1 2.08.802l1.552-1.53A5.28 5.28 0 0 0 5.856.133a5.44 5.44 0 0 0-4.846 2.95l1.8 1.383c.43-1.271 1.629-2.215 3.046-2.215"
      fill="#EA4335"
    />
  </svg>
)

const ApplePay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={35}
    height={24}
    viewBox="0 0 35 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={1} y={0.5} width={33} height={23} rx={3.5} fill="#fff" />
    <rect x={1} y={0.5} width={33} height={23} rx={3.5} stroke="#D0D5DD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.95 8.343c-.286.352-.743.63-1.2.59-.056-.476.167-.981.429-1.294.285-.361.784-.62 1.189-.639.047.496-.138.981-.419 1.343m.413.684c-.402-.024-.77.126-1.066.248-.19.078-.352.144-.475.144-.138 0-.306-.07-.495-.148-.248-.103-.53-.22-.827-.214-.68.01-1.313.411-1.66 1.05-.714 1.28-.186 3.173.504 4.214.338.515.742 1.08 1.275 1.06.234-.01.402-.084.577-.16.2-.09.41-.182.735-.182.315 0 .514.09.706.176.182.082.357.161.617.156.551-.01.899-.515 1.236-1.03.365-.554.525-1.094.55-1.176l.002-.01-.013-.006a1.85 1.85 0 0 1-1.062-1.693c-.009-1 .739-1.507.856-1.586l.014-.01c-.475-.734-1.217-.813-1.474-.833m3.82 6.29V7.59h2.782c1.436 0 2.44 1.03 2.44 2.537s-1.023 2.548-2.478 2.548h-1.594v2.642zm1.15-6.716h1.327c1 0 1.57.555 1.57 1.531 0 .977-.57 1.537-1.574 1.537h-1.323zm7.872 5.789c-.304.604-.975.986-1.698.986-1.07 0-1.817-.664-1.817-1.665 0-.991.723-1.561 2.06-1.646l1.436-.089v-.426c0-.63-.395-.972-1.099-.972-.58 0-1.003.313-1.089.789H19.96c.034-1.002.937-1.73 2.16-1.73 1.317 0 2.174.718 2.174 1.834v3.846h-1.066v-.927zm-1.389.07c-.613 0-1.003-.308-1.003-.779 0-.486.376-.768 1.094-.813l1.28-.084v.436c0 .724-.59 1.24-1.37 1.24m6.012 1.159c-.461 1.353-.989 1.8-2.111 1.8-.086 0-.371-.01-.438-.03v-.927c.071.01.247.02.338.02.509 0 .794-.224.97-.803l.105-.343-1.95-5.625h1.203l1.355 4.565h.024L28.68 9.71h1.17z"
      fill="#000"
    />
  </svg>
)

const ApplePay1 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={33}
    height={15}
    viewBox="0 0 33 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.73 3.185c.604.052 1.209-.311 1.586-.772.372-.473.617-1.108.554-1.757-.535.026-1.196.363-1.573.837-.347.408-.643 1.07-.567 1.692m7.19 8.35V1.429h3.682c1.901 0 3.23 1.348 3.23 3.32 0 1.97-1.354 3.332-3.28 3.332h-2.11v3.456zM6.863 3.309c-.532-.031-1.018.165-1.41.324-.253.102-.467.188-.63.188-.182 0-.405-.09-.655-.193-.327-.134-.702-.287-1.095-.28-.9.013-1.737.538-2.197 1.374-.944 1.673-.245 4.15.668 5.512.447.674.982 1.413 1.687 1.387.31-.012.533-.11.764-.21.266-.117.542-.237.973-.237.416 0 .68.117.934.23.241.107.473.21.816.204.73-.013 1.19-.674 1.637-1.349a6 6 0 0 0 .726-1.537l.004-.012-.015-.01c-.161-.076-1.394-.657-1.405-2.215-.012-1.308.977-1.97 1.133-2.075l.019-.013c-.63-.96-1.612-1.063-1.952-1.089m14.75 8.306c.957 0 1.844-.5 2.247-1.29h.032v1.212h1.41V6.504c0-1.458-1.133-2.398-2.877-2.398-1.618 0-2.814.953-2.858 2.262h1.372c.114-.622.674-1.03 1.442-1.03.932 0 1.454.447 1.454 1.27v.558l-1.901.116c-1.769.11-2.726.856-2.726 2.153 0 1.31.989 2.178 2.405 2.178m.409-1.2c-.812 0-1.328-.402-1.328-1.018 0-.635.497-1.005 1.447-1.063l1.694-.11v.57c0 .947-.78 1.621-1.813 1.621m7.957 1.517c-.61 1.77-1.31 2.354-2.795 2.354-.113 0-.49-.013-.579-.04v-1.212c.095.013.327.026.447.026.674 0 1.051-.291 1.284-1.05l.139-.447-2.581-7.36h1.592l1.795 5.972h.031l1.794-5.971h1.549zM13.443 2.75H15.2c1.322 0 2.077.726 2.077 2.003s-.755 2.01-2.084 2.01h-1.75z"
      fill="#000"
    />
  </svg>
)

const Klarna = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={35}
    height={24}
    viewBox="0 0 35 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={0.5} width={34} height={24} rx={4} fill="#FFD8E2" />
    <mask id="a" fill="#fff">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.77 15.38H4.385V9h1.383zM9.222 9H7.87c0 1.174-.51 2.252-1.4 2.957l-.536.425 2.078 2.998H9.72l-1.912-2.76c.907-.954 1.415-2.239 1.415-3.62m2.207 6.378h-1.307V9h1.307zm3.947-4.411v.282a2.1 2.1 0 0 0-1.237-.404c-1.214 0-2.199 1.042-2.199 2.327 0 1.286.985 2.328 2.2 2.328.458 0 .884-.15 1.236-.404v.282h1.248v-4.411zm-.004 2.205c0 .627-.506 1.135-1.13 1.135a1.133 1.133 0 0 1-1.131-1.135c0-.626.506-1.134 1.13-1.134.625 0 1.131.508 1.131 1.134m13.17-1.923v-.282h1.247v4.41h-1.248v-.281a2.1 2.1 0 0 1-1.237.404c-1.214 0-2.199-1.042-2.199-2.328s.985-2.327 2.2-2.327c.458 0 .884.15 1.236.404m-1.135 3.058c.624 0 1.13-.508 1.13-1.135 0-.626-.506-1.134-1.13-1.134-.625 0-1.13.508-1.13 1.134 0 .627.505 1.135 1.13 1.135m2.924.335c0-.458.35-.829.783-.829.432 0 .783.371.783.83 0 .457-.35.828-.783.828s-.783-.371-.783-.829m-7.443-3.794c-.499 0-.97.164-1.286.616v-.497H20.36v4.41h1.258V13.06c0-.67.425-1 .937-1 .548 0 .864.347.864.99v2.328h1.246v-2.805c0-1.027-.771-1.725-1.776-1.725m-4.333.119v.574c.25-.344.716-.574 1.223-.574v1.284h-.015c-.494 0-1.206.373-1.206 1.068v2.059h-1.28v-4.411z"
      />
    </mask>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.77 15.38H4.385V9h1.383zM9.222 9H7.87c0 1.174-.51 2.252-1.4 2.957l-.536.425 2.078 2.998H9.72l-1.912-2.76c.907-.954 1.415-2.239 1.415-3.62m2.207 6.378h-1.307V9h1.307zm3.947-4.411v.282a2.1 2.1 0 0 0-1.237-.404c-1.214 0-2.199 1.042-2.199 2.327 0 1.286.985 2.328 2.2 2.328.458 0 .884-.15 1.236-.404v.282h1.248v-4.411zm-.004 2.205c0 .627-.506 1.135-1.13 1.135a1.133 1.133 0 0 1-1.131-1.135c0-.626.506-1.134 1.13-1.134.625 0 1.131.508 1.131 1.134m13.17-1.923v-.282h1.247v4.41h-1.248v-.281a2.1 2.1 0 0 1-1.237.404c-1.214 0-2.199-1.042-2.199-2.328s.985-2.327 2.2-2.327c.458 0 .884.15 1.236.404m-1.135 3.058c.624 0 1.13-.508 1.13-1.135 0-.626-.506-1.134-1.13-1.134-.625 0-1.13.508-1.13 1.134 0 .627.505 1.135 1.13 1.135m2.924.335c0-.458.35-.829.783-.829.432 0 .783.371.783.83 0 .457-.35.828-.783.828s-.783-.371-.783-.829m-7.443-3.794c-.499 0-.97.164-1.286.616v-.497H20.36v4.41h1.258V13.06c0-.67.425-1 .937-1 .548 0 .864.347.864.99v2.328h1.246v-2.805c0-1.027-.771-1.725-1.776-1.725m-4.333.119v.574c.25-.344.716-.574 1.223-.574v1.284h-.015c-.494 0-1.206.373-1.206 1.068v2.059h-1.28v-4.411z"
      fill="#000"
    />
    <path
      d="M4.386 15.38h-1v1h1zm1.383 0v1h1v-1zM4.386 9V8h-1v1zm1.383 0h1V8h-1zm2.1 0V8h-1v1zm1.354 0h1V8h-1zM6.47 11.957l.622.783zm-.536.425-.62-.784-.736.582.534.771zm2.078 2.998-.822.57.298.43h.524zm1.708 0v1h1.91l-1.088-1.57zm-1.912-2.76-.725-.687-.56.59.463.668zm2.315 2.758h-1v1h1zm1.307 0v1h1v-1zM10.123 9V8h-1v1zm1.307 0h1V8h-1zm3.947 2.248-.585.81 1.585 1.145V11.25zm0-.282v-1h-1v1zm0 4.129h1V13.14l-1.585 1.144zm0 .282h-1v1h1zm1.248 0v1h1v-1zm0-4.411h1v-1h-1zm11.917 0v-1h-1v1zm0 .282-.585.81 1.585 1.145V11.25zm1.248-.282h1v-1h-1zm0 4.41v1h1v-1zm-1.248 0h-1v1h1zm0-.281h1V13.14l-1.585 1.144zm-6.94-3.632h-1v3.18l1.82-2.608zm0-.497h1v-1h-1zm-1.242 0v-1h-1v1zm0 4.41h-1v1h1zm1.258 0v1h1v-1zm1.8 0h-1v1h1zm1.247 0v1h1v-1zm-6.11-3.836h-1v3.08l1.81-2.492zm0-.574h1v-1h-1zm1.224 0h1v-1h-1zm0 1.284-.042.999 1.042.043V12.25zm-.007 0 .041-1h-.004zm-.008 0 .037-1h-.037zm-1.206 3.127v1h1v-1zm-1.28 0h-1v1h1zm0-4.411v-1h-1v1zM4.386 16.38h1.383v-2H4.386zm-1-7.38v6.38h2V9zm2.383-1H4.386v2h1.383zm1 7.38V9h-2v6.38zM7.87 10h1.354V8H7.87zm-.777 2.74C8.23 11.838 8.87 10.467 8.87 9h-2c0 .88-.38 1.665-1.02 2.173zm-.537.425.537-.425-1.243-1.567-.536.425zm2.279 1.645-2.078-2.998-1.644 1.14 2.078 2.997zm.886-.43H8.012v2H9.72zm-2.734-1.19 1.912 2.76 1.644-1.14-1.912-2.759zM8.223 9c0 1.134-.416 2.17-1.14 2.933l1.45 1.376c1.09-1.147 1.69-2.68 1.69-4.309zm1.9 7.378h1.307v-2h-1.307zM9.123 9v6.377h2V9zm2.307-1h-1.307v2h1.307zm1 7.377V9h-2v6.377zm3.947-4.129v-.282h-2v.282zm-2.237.596c.237 0 .46.076.652.215l1.17-1.622a3.1 3.1 0 0 0-1.822-.593zm-1.199 1.327c0-.787.59-1.327 1.2-1.327v-2c-1.82 0-3.2 1.544-3.2 3.327zm1.2 1.328c-.61 0-1.2-.54-1.2-1.328h-2c0 1.784 1.38 3.328 3.2 3.328zm.651-.215a1.1 1.1 0 0 1-.652.215v2a3.1 3.1 0 0 0 1.822-.593zm1.585 1.093v-.282h-2v.282zm.248-1h-1.248v2h1.248zm-1-3.411v4.41h2v-4.41zm-.248 1h1.248v-2h-1.248zm-1.134 3.34c1.18 0 2.13-.959 2.13-2.135h-2a.133.133 0 0 1-.13.135zm-2.131-2.135c0 1.176.95 2.135 2.13 2.135v-2a.133.133 0 0 1-.13-.135zm2.13-2.134c-1.18 0-2.13.959-2.13 2.134h2c0-.077.062-.134.13-.134zm2.131 2.134c0-1.175-.95-2.134-2.13-2.134v2c.069 0 .13.057.13.134zm11.17-2.205v.282h2v-.282zm2.247-1h-1.248v2h1.248zm1 5.41v-4.41h-2v4.41zm-2.248 1h1.248v-2h-1.248zm-1-1.281v.282h2v-.282zm-.237 1.404c.682 0 1.31-.223 1.823-.593l-1.17-1.622a1.1 1.1 0 0 1-.653.215zm-3.199-3.328c0 1.784 1.38 3.328 3.2 3.328v-2c-.61 0-1.2-.54-1.2-1.328zm3.2-3.327c-1.82 0-3.2 1.544-3.2 3.327h2c0-.787.59-1.327 1.2-1.327zm1.822.593a3.1 3.1 0 0 0-1.823-.593v2c.237 0 .46.076.652.215zm-1.59 2.734a.133.133 0 0 1-.13.135v2c1.18 0 2.13-.959 2.13-2.135zm-.13-.134c.069 0 .13.057.13.134h2c0-1.175-.95-2.134-2.13-2.134zm-.13.134c0-.077.06-.134.13-.134v-2c-1.18 0-2.13.959-2.13 2.134zm.13.135a.133.133 0 0 1-.13-.135h-2c0 1.176.95 2.135 2.13 2.135zm3.707-.494c-1.038 0-1.783.873-1.783 1.83h2a.15.15 0 0 1-.044.1.24.24 0 0 1-.173.07zm1.783 1.83c0-.957-.746-1.83-1.783-1.83v2a.24.24 0 0 1-.173-.07.15.15 0 0 1-.044-.1zm-1.783 1.828c1.037 0 1.783-.873 1.783-1.829h-2a.15.15 0 0 1 .044-.1.24.24 0 0 1 .173-.071zm-1.783-1.829c0 .956.745 1.829 1.783 1.829v-2c.079 0 .14.036.173.07a.15.15 0 0 1 .044.101zm-6.91-2.606a.37.37 0 0 1 .16-.135.8.8 0 0 1 .306-.053v-2c-.724 0-1.552.25-2.105 1.043zm-1.82-1.069v.497h2v-.497zm-.242 1h1.243v-2H20.36zm1 3.41v-4.41h-2v4.41zm.258-1H20.36v2h1.258zm-1-1.317v2.318h2V13.06zm1.937-2c-.468 0-.97.153-1.358.533-.397.387-.579.913-.579 1.467h2c0-.062.01-.085.009-.082l-.01.017a.2.2 0 0 1-.078.066c-.01.003-.006 0 .016 0zm1.864 1.99c0-.471-.116-.988-.477-1.397-.378-.429-.894-.592-1.387-.592v2c.032 0 .026.005-.004-.007a.3.3 0 0 1-.109-.078c-.031-.036-.038-.062-.036-.055a.5.5 0 0 1 .013.13zm0 2.328V13.05h-2v2.327zm.246-1h-1.246v2h1.246zm-1-1.805v2.805h2v-2.805zm-.776-.725c.5 0 .776.297.776.725h2c0-1.626-1.267-2.725-2.776-2.725zm-3.333-.307v-.574h-2v.574zm.223-1.574c-.785 0-1.571.351-2.033.987l1.619 1.175a.4.4 0 0 1 .136-.1.65.65 0 0 1 .278-.062zm1 2.284v-1.284h-2v1.284zm-1.049.999h.007l.083-1.998h-.007zm-.003 0h.008l.074-1.999H19.8zm-.169.069-.002.011-.006.018c-.004.006 0-.005.027-.025a.4.4 0 0 1 .164-.07l.023-.003v-2a2.37 2.37 0 0 0-1.39.475c-.43.324-.816.864-.816 1.594zm0 2.059v-2.06h-2v2.06zm-2.28 1h1.28v-2h-1.28zm-1-5.411v4.41h2v-4.41zm2.278-1h-1.278v2h1.278z"
      fill="#000"
      mask="url(#a)"
    />
  </svg>
)

const GIFT_CARD_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

const CARD_NUMBER_REGEX = /^(?:\d[ -]*?){13,19}$/
const EXPIRATION_DATE_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/

const CVV_OR_CVC_REGEX = /^\d{3,4}$/

const getSchema = (availableBalance: number) =>
  z.object({
    amount: z.coerce
      .number({
        invalid_type_error: "Please enter a valid number",
      })
      .min(1, "Please provide a number bigger or equal to 1")
      .max(availableBalance, "You do not have sufficient balance available")
      .optional(),
    paymentMethod: z.string(),
    pay: z.enum(["AT_ONCE", "IN_INSTALLMENTS"], {
      required_error: "Please select an option",
    }),

    giftCard: z
      .string()
      .refine(
        (value) =>
          Boolean(value)
            ? z.string().regex(GIFT_CARD_REGEX).safeParse(value).success
            : true,
        {
          message: "Invalid gift card",
        }
      ),

    billingAddressCreditOrDebtInfo: billingAddressCreditDebtInfoFormSchema,
  })

const billingAddressCreditDebtInfoFormSchema = z
  .object({
    fullName: z.string().min(1, "Please enter at least 1 character"),
    addressLine1: z.string().min(1, "Please enter at least 1 character"),
    addressLine2: z.string(),
    city: z.string().min(1, "Please enter at least 1 character"),
    state: z.string().min(1, "Please select your state"),
    zipcode: z.string().length(5, "Please enter a valid zipcode"),
    phoneNumber: z.string(),
    cardNumber: z
      .string()
      .regex(CARD_NUMBER_REGEX, "Please provide a valid card number"),
    cardName: z.string().min(1, "Please enter at least 1 character"),
    expirationDate: z
      .string()
      .regex(EXPIRATION_DATE_REGEX, "Please provide a valid expiration date"),
    cvvOrCvc: z
      .string()
      .regex(CVV_OR_CVC_REGEX, "Please provide a valid CVV or CVC"),
    saveDefaultPaymentMethod: z.boolean(),
  })
  .refine((data) => isPhoneValid(data.phoneNumber), {
    message: "Please enter a valid phone number",
    path: ["phoneNumber"],
  })

const bankAccountFormSchema = z
  .object({
    accountType: z.string().min(1, "Please select an option"),
    accountHolderName: z
      .string()
      .min(1, "Please enter the account holder's name"),
    bankRoutingNumber: z
      .string()
      .length(12, "Please enter a valid back routing number"),
    accountNumber: z
      .string()
      .min(5, "Please enter a valid back account number")
      .max(17, "Please enter a valid back account number"),
    confirmAccountNumber: z
      .string()
      .min(5, "Please enter a valid back account number")
      .max(17, "Please enter a valid back account number"),
    saveDefaultPaymentMethod: z.boolean(),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers do not match",
    path: ["confirmAccountNumber"],
  })

type FormValues = z.infer<ReturnType<typeof getSchema>>
type BillingAddressFormValues = z.infer<
  typeof billingAddressCreditDebtInfoFormSchema
>
type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>

type PaymentMethods = Array<
  | {
      method: "CREDIT_DEBIT_CARD"
      data: BillingAddressFormValues & {
        billingAddresses?: BillingAddressFormValues[]
      }
    }
  | { method: "BANK_ACCOUNT"; data: BankAccountFormValues }
  | {
      method: "GOOGLE_PAY"
    }
  | {
      method: "APPLE_PAY"
    }
>

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const formatGiftCard = (giftCard: string) => {
  const cleaned = giftCard.replace(/[^A-Za-z0-9]/g, "")
  const capitalized = cleaned.toUpperCase()
  let i = 4
  let result = capitalized.slice(0, i)
  for (; i < capitalized.length; i += 4) {
    if (GIFT_CARD_REGEX.test(result)) break

    result += "-" + capitalized.slice(i, i + 4)
  }
  return result
}

const PAYMENT_METHODS = [
  {
    value: "item-0",
    icons: [
      { icon: <Visa /> },
      { icon: <Mastercard /> },
      { icon: <Discover /> },
      { icon: <Amex /> },
    ],
    title: "Credit / Debit Card",
    desc: "2.9% + $0.30 per transaction",
  },
  {
    value: "item-1",
    icons: [{ icon: <ACH /> }],
    title: "Bank Account",
    desc: "0.8% per transaction",
  },
  {
    value: "item-2",
    icons: [{ icon: <Wire /> }, { icon: <Swift /> }],
    title: "Wire Transfer",
    desc: "0.8% per transaction",
  },
  {
    value: "item-3",
    icons: [{ icon: <GPay /> }],
    title: "Google Pay",
    desc: "2.9% + $0.30 per transaction",
  },
  {
    value: "item-4",
    icons: [{ icon: <ApplePay /> }],
    title: "Apple Pay",
    desc: "2.9% + $0.30 per transaction",
  },
  {
    value: "item-5",
    icons: [{ icon: <Klarna /> }],
    title: "Pay with Klarna",
    desc: "starting at 5.9% + $0.30per transaction",
  },
]

const GiftCard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M23.297 4.5q1.718 0 2.578.854.816.81.858 2.366l.002.175V19.82q0 1.687-.86 2.534-.814.806-2.4.847l-.178.002H4.439q-1.719 0-2.58-.848-.813-.805-.856-2.36L1 19.821V7.895q0-1.697.86-2.546.815-.805 2.4-.846l.179-.003zM2.763 19.722q0 .855.438 1.287.405.4 1.135.43l.125.003 8.739-.001v-5.803h-.077a5.4 5.4 0 0 1-.86 1.61 8.3 8.3 0 0 1-1.336 1.379q-.707.585-1.522 1.002-.772.388-1.396.487-.47.066-.74-.208a.88.88 0 0 1-.268-.635q0-.394.23-.64a.94.94 0 0 1 .545-.276l.102-.015q.57-.065 1.214-.421a7.5 7.5 0 0 0 1.255-.876q.59-.501 1.084-1.096.417-.502.654-.951l.063-.127H2.763zm22.209-4.852h-9.386q.242.505.718 1.08.495.593 1.085 1.095.607.52 1.248.875.57.317 1.082.404l.128.018q.428.044.657.29.23.247.23.641 0 .362-.269.635-.267.273-.738.208-.636-.099-1.402-.487a8.5 8.5 0 0 1-1.517-1.002 8.3 8.3 0 0 1-1.336-1.38 5.5 5.5 0 0 1-.795-1.424l-.065-.186h-.088v5.804h8.75q.81 0 1.255-.432.41-.4.44-1.158l.003-.129zm-1.575-8.604-.122-.003h-8.75v3.757a4.7 4.7 0 0 1 .881-1.21 3.9 3.9 0 0 1 1.145-.784 3.2 3.2 0 0 1 1.303-.273q1.182 0 1.966.783.782.782.782 1.987 0 .69-.295 1.287a3.5 3.5 0 0 1-.827 1.067c-.32.282-.677.52-1.06.707l-.172.082h6.723V7.994q0-.855-.442-1.293-.41-.405-1.132-.435M13.2 6.262H4.46q-.82 0-1.259.438-.405.405-.435 1.164l-.003.128v5.673h6.713a5 5 0 0 1-1.221-.789 3.6 3.6 0 0 1-.832-1.067 2.8 2.8 0 0 1-.301-1.287q0-1.205.788-1.987.79-.783 1.96-.783.69-.001 1.315.274c.425.19.813.454 1.144.783a4.4 4.4 0 0 1 .78 1.037l.09.173zM9.959 9.307q-.591 0-.942.357-.35.355-.35.98 0 .514.317 1.024.316.509.876.92a4.9 4.9 0 0 0 1.28.662q.633.22 1.332.248l.202.004h.328v-.307a4.6 4.6 0 0 0-.241-1.489 4.2 4.2 0 0 0-.668-1.243 3.3 3.3 0 0 0-.975-.849 2.35 2.35 0 0 0-1.16-.307m7.807 0c-.403 0-.8.107-1.15.307a3.3 3.3 0 0 0-.974.849A4.4 4.4 0 0 0 14.725 13l-.004.195v.307h.329a4.75 4.75 0 0 0 2.82-.915q.553-.41.87-.92.319-.508.318-1.024 0-.623-.345-.98-.345-.356-.948-.356" />
  </svg>
)

const defaultBillingAddressFormValues: BillingAddressFormValues = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipcode: "",
  phoneNumber: "",
  cardName: "",
  cardNumber: "",
  expirationDate: "",
  cvvOrCvc: "",
  saveDefaultPaymentMethod: false,
}

const defaultBankAccountFormValuesValues: BankAccountFormValues = {
  accountType: "",
  accountHolderName: "",
  bankRoutingNumber: "",
  accountNumber: "",
  confirmAccountNumber: "",
  saveDefaultPaymentMethod: false,
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
  const kind = getCardType(cardNumberProp || cardNumber)

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
            Credit ****{cardNumber.slice(-4)}
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
  cardNumber: string
  saveDefaultPaymentMethod: boolean
  onEdit?: () => void
  onRemove?: () => void
  amountToBePaid: string
}) => {
  const kind = getCardType(cardNumber)

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
              Credit ****{cardNumber.slice(-4)}
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
  cardNumber: string
  saveDefaultPaymentMethod: boolean
  onEdit?: () => void
  onRemove?: () => void
}) => {
  const kind = getCardType(cardNumber)

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
            Credit ****{cardNumber.slice(-4)}
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

const ApplePayCard = ({
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

const CreditDebitCardArticle1 = ({
  onEdit,
  onRemove,
  cardNumber,
  saveDefaultPaymentMethod,
  onChange,
}: {
  onEdit?: () => void
  onRemove?: () => void
  cardNumber: string
  saveDefaultPaymentMethod: boolean
  onChange?: () => void
}) => {
  const kind = getCardType(cardNumber)

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
            Credit ****{cardNumber.slice(-4)}
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

export const AvailableBalance = () => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [show, setShow] = React.useState(false)
  const [showGiftCard, setShowGiftCard] = React.useState(false)
  const [focusedField, setFocusedField] = React.useState<
    "cvv-cvc" | "card-number" | "expiration-date" | "card-name"
  >()
  const [indexToRemove, setIndexToRemove] = React.useState<number>()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isOpened, setIsOpened] = React.useState(false)
  const [hasAddressSaved, setHasAddressSaved] = React.useState(false)
  const [hasBankAccountSaved, setHasBankAccountSaved] = React.useState(false)
  const [isWireTransfer, setIsWireTransfer] = React.useState(false)
  const [billingAddresses, setBillingAddresses] =
    React.useState<BillingAddressFormValues[]>()
  const [availableBalance] = React.useState(4000)
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethods>()
  const [firstBlockPaymentMethods, setFirstBlockPaymentMethods] =
    React.useState<PaymentMethods>()
  const [secondBlockPaymentMethods, setSecondBlockPaymentMethods] =
    React.useState<PaymentMethods>()
  const [hasSplit, setHasSplit] = React.useState(false)
  const [hasCanceled, setHasCanceled] = React.useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = React.useState(false)
  const [fullAmount, setFullAmount] = React.useState(98_000)
  const [selectingPaymentMethod, setSelectingPaymentMethod] =
    React.useState(false)
  const [addNewPaymentMethod, setAddNewPaymentMethod] = React.useState(false)
  const [selected, setSelected] = React.useState<string | undefined>(
    paymentMethods?.[0].method as string | undefined
  )
  const [paymentFrequency, setPaymentFrequency] = React.useState<{
    meta?: string
    value: string
    label: string
  }>()
  const [openedBlock, setOpenedBlock] = React.useState<"first" | "second">()
  const [selectedPayMethod, setSelectedPayMethod] = React.useState<string>()

  const [isSelectPaymentMethodOpen, setIsSelectPaymentMethodOpen] =
    React.useState(false)
  const [isAddCreditOrDebitOpen, setIsAddCreditOrDebitOpen] =
    React.useState(false)
  const [isBankAccountOpen, setIsBankAccountOpen] = React.useState(false)

  const timeoutId = React.useRef<ReturnType<typeof setTimeout>>()
  const [giftCards, setGiftCards] = useUncontrolledState<string[] | undefined>({
    defaultValue: undefined,
  })
  const [layout, setLayout] = React.useState<"default" | "selection" | "form">(
    "form"
  )

  const handleRemove = (index: number) => {
    if (giftCards) {
      const lastItem = giftCards.length - 1 === index
      lastItem && setShowGiftCard(false)
      setGiftCards(giftCards.filter((_, i) => i !== index))
    }
  }

  React.useEffect(() => {
    return () => clearTimeout(timeoutId.current)
  }, [timeoutId, showGiftCard])

  const {
    formState: { errors, isValid },
    control,
    setValue,
    trigger,
  } = useForm<FormValues>({
    resolver: zodResolver(getSchema(availableBalance)),
    mode: "onChange",
    defaultValues: {
      giftCard: "",
      paymentMethod: "",
      pay: "AT_ONCE",
    },
  })

  const form = useForm<BillingAddressFormValues>({
    resolver: zodResolver(billingAddressCreditDebtInfoFormSchema),
    defaultValues: defaultBillingAddressFormValues,
  })
  const methods = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: defaultBankAccountFormValuesValues,
  })
  const _form = useForm<BillingAddressFormValues>({
    resolver: zodResolver(billingAddressCreditDebtInfoFormSchema),
    defaultValues: defaultBillingAddressFormValues,
  })
  const _methods = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: defaultBankAccountFormValuesValues,
  })

  const amount = useWatch({ control, name: "amount" })
  const giftCard = useWatch({ control, name: "giftCard" })
  const pay = useWatch({ control, name: "pay" })

  const billingAddressCreditOrDebtInfo = useWatch({
    control: control,
    name: "billingAddressCreditOrDebtInfo",
  })
  const accountNumber = useWatch({
    control: methods.control,
    name: "accountNumber",
  })
  const accountHolderName = useWatch({
    control: methods.control,
    name: "accountHolderName",
  })
  const _saveDefaultPaymentMethod = useWatch({
    control: methods.control,
    name: "saveDefaultPaymentMethod",
  })
  const paymentMethod = useWatch({ control, name: "paymentMethod" })

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVisible(false)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setGiftCards((prev) => (prev ? [...prev, giftCard] : [giftCard]))
    setValue("giftCard", "")
    setShowGiftCard(true)

    timeoutId.current = setTimeout(() => setShowGiftCard(false), ONE_SECOND * 5)
  }

  const handleOnSubmit: SubmitHandler<BillingAddressFormValues> = (values) => {
    setValue("billingAddressCreditOrDebtInfo", values)
    trigger()
    const nextState = billingAddresses
      ? [...billingAddresses, values]
      : [values]
    setBillingAddresses(nextState)
    nextState.length === 1 ? setLayout("default") : setLayout("selection")

    const nextValues = { ...values, billingAddresses: nextState }
    form.formState.submitCount < 1
      ? setPaymentMethods((prev) =>
          prev
            ? [...prev, { method: "CREDIT_DEBIT_CARD", data: nextValues }]
            : [{ method: "CREDIT_DEBIT_CARD", data: nextValues }]
        )
      : setPaymentMethods((prev) =>
          prev
            ? [
                ...prev.slice(0, -1),
                { method: "CREDIT_DEBIT_CARD", data: nextValues },
              ]
            : [{ method: "CREDIT_DEBIT_CARD", data: nextValues }]
        )

    form.reset(
      {
        cardNumber: values.cardNumber,
        cardName: values.cardName,
        expirationDate: values.expirationDate,
        cvvOrCvc: values.cvvOrCvc,
        saveDefaultPaymentMethod: values.saveDefaultPaymentMethod,
      },
      {
        keepDefaultValues: true,
      }
    )
  }

  const _handleOnSubmit: SubmitHandler<BillingAddressFormValues> = (values) => {
    setValue("billingAddressCreditOrDebtInfo", values)
    trigger()
    const nextState = billingAddresses
      ? [...billingAddresses, values]
      : [values]
    setBillingAddresses(nextState)
    nextState.length === 1 ? setLayout("default") : setLayout("selection")

    const nextValues = { ...values, billingAddresses: nextState }

    if (openedBlock === "first") {
      setFirstBlockPaymentMethods((prev) =>
        prev
          ? [...prev, { method: "CREDIT_DEBIT_CARD", data: nextValues }]
          : [{ method: "CREDIT_DEBIT_CARD", data: nextValues }]
      )
    } else {
      setSecondBlockPaymentMethods((prev) =>
        prev
          ? [...prev, { method: "CREDIT_DEBIT_CARD", data: nextValues }]
          : [{ method: "CREDIT_DEBIT_CARD", data: nextValues }]
      )
    }

    _form.reset(
      {
        cardNumber: values.cardNumber,
        cardName: values.cardName,
        expirationDate: values.expirationDate,
        cvvOrCvc: values.cvvOrCvc,
        saveDefaultPaymentMethod: values.saveDefaultPaymentMethod,
      },
      {
        keepDefaultValues: true,
      }
    )
  }

  const onValid: SubmitHandler<BankAccountFormValues> = (values) => {
    methods.formState.submitCount < 1
      ? setPaymentMethods((prev) =>
          prev
            ? [...prev, { method: "BANK_ACCOUNT", data: values }]
            : [{ method: "BANK_ACCOUNT", data: values }]
        )
      : setPaymentMethods((prev) =>
          prev
            ? [...prev.slice(0, -1), { method: "BANK_ACCOUNT", data: values }]
            : [{ method: "BANK_ACCOUNT", data: values }]
        )

    if (hasSplit) {
      methods.reset()
      setValue("paymentMethod", "")
      setHasBankAccountSaved(false)
      setShowPaymentMethods(true)
    } else {
      setHasBankAccountSaved(true)
    }
  }

  const _onValid: SubmitHandler<BankAccountFormValues> = (values) => {
    if (openedBlock === "first") {
      setFirstBlockPaymentMethods((prev) =>
        prev
          ? [...prev, { method: "BANK_ACCOUNT", data: values }]
          : [{ method: "BANK_ACCOUNT", data: values }]
      )
    } else {
      setSecondBlockPaymentMethods((prev) =>
        prev
          ? [...prev, { method: "BANK_ACCOUNT", data: values }]
          : [{ method: "BANK_ACCOUNT", data: values }]
      )
    }

    _methods.reset()
    setSelectedPayMethod("")

    setIsBankAccountOpen(false)
  }

  const onUseAddress = () => {
    if (billingAddresses?.length) setLayout("default")
  }

  const onRemove = () => {
    if (typeof indexToRemove === "number") handleRemove(indexToRemove)
    setIsOpen(false)
  }

  const handleRm = (index: number) => {
    setSecondBlockPaymentMethods(
      secondBlockPaymentMethods?.filter((_, i) => i !== index)
    )
  }

  const handleOnRemove = (index: number) => {
    setFirstBlockPaymentMethods(
      firstBlockPaymentMethods?.filter((_, i) => i !== index)
    )
  }

  const isBillingAddressValid =
    billingAddressCreditDebtInfoFormSchema.safeParse(
      billingAddressCreditOrDebtInfo
    ).success

  return (
    <div className="bg-gray-50">
      <Navigation />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col gap-y-2">
              <DialogTitle>Remove Gift Card?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-bold">
                  gift card ending in *DQEE for the amount of $2,000?
                </span>
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button visual="error" onClick={onRemove}>
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpened} onOpenChange={setIsOpened}>
        <DialogContent className="max-w-[702px]">
          <DialogClose asChild>
            <IconButton
              className="top-6 absolute right-[23.82px]"
              visual="gray"
              variant="ghost"
            >
              <X className="size-7 text-gray-500" />
            </IconButton>
          </DialogClose>
          <DialogHeader>
            <div className="flex flex-col gap-y-2">
              <DialogTitle>Remove Gift Card?</DialogTitle>
              <DialogDescription>
                The address you provided doesn&apos;t match official postal
                records. Here&apos;s a suggested alternative.
              </DialogDescription>
            </div>
          </DialogHeader>

          {isBillingAddressValid && (
            <RadioGroup
              defaultValue="recommended"
              className="grid-cols-2 mt-[50px] gap-x-3.5"
            >
              <div className="flex items-start gap-x-4">
                <RadioGroupItem
                  size="lg"
                  value="recommended"
                  id="recommended"
                />
                <div className="flex-auto">
                  <Label className="font-bold" size="md" htmlFor="recommended">
                    We Recommend
                  </Label>

                  <ul className="mt-1">
                    <li className="text-base leading-6 text-dark-blue-400">
                      {billingAddressCreditOrDebtInfo.fullName}
                    </li>
                    <li className="text-base leading-6 text-dark-blue-400">
                      {billingAddressCreditOrDebtInfo.addressLine1}
                    </li>
                    <li className="text-base leading-6 text-dark-blue-400">
                      {phoneUtil.formatOutOfCountryCallingNumber(
                        phoneUtil.parseAndKeepRawInput(
                          billingAddressCreditOrDebtInfo.phoneNumber
                        )
                      )}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-x-4">
                <RadioGroupItem size="lg" value="provided" id="provided" />
                <div className="flex-auto">
                  <Label className="font-bold" size="md" htmlFor="provided">
                    You provided
                  </Label>

                  <ul className="mt-1">
                    <li className="text-base leading-6 text-dark-blue-400">
                      {billingAddressCreditOrDebtInfo.fullName}
                    </li>
                    <li className="text-base leading-6 text-dark-blue-400">
                      {billingAddressCreditOrDebtInfo.addressLine1}
                    </li>
                    <li className="text-base leading-6 text-dark-blue-400">
                      {phoneUtil.formatOutOfCountryCallingNumber(
                        phoneUtil.parseAndKeepRawInput(
                          billingAddressCreditOrDebtInfo.phoneNumber
                        )
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </RadioGroup>
          )}
          <DialogFooter className="mt-[50px] flex justify-end items-center">
            <Button
              onClick={() => {
                setIsOpened(false)

                if (hasSplit) {
                  form.reset()
                  setValue("paymentMethod", "")
                  setValue(
                    "billingAddressCreditOrDebtInfo",
                    undefined as unknown as BillingAddressFormValues
                  )
                  setHasAddressSaved(false)
                  setShowPaymentMethods(true)
                } else {
                  setHasAddressSaved(true)
                }

                if (selectedPayMethod) {
                  setIsAddCreditOrDebitOpen(false)
                  setSelectedPayMethod("")
                  _form.reset()
                }
              }}
            >
              Use, this address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-[150px] py-[50px]">
        <Button className="group" size="md" variant="link" visual="gray">
          <ArrowLeft className="size-[15px] group-hover:-translate-x-1 transition duration-300" />{" "}
          Back
        </Button>

        <h1 className="mt-2 text-2xl leading-[.7] font-bold text-dark-blue-400">
          Payment Details
        </h1>

        <div className="mt-6 flex items-start gap-x-8">
          <div className="flex-auto p-[50px] rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 bg-white">
            <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
              How do you want to pay?
            </h3>

            <div className="mt-6">
              <Controller
                control={control}
                name="pay"
                render={({ field: { onChange, ...field } }) => (
                  <RadioGroup
                    onValueChange={onChange}
                    className="flex gap-x-3 items-start"
                    {...field}
                  >
                    <RadioGroupItemSelector size="md" value="AT_ONCE">
                      <Label size="sm" asChild>
                        <span>Pay Full Amount</span>
                      </Label>
                      <HelperText size="sm">
                        {formatter.format(fullAmount)}
                      </HelperText>
                    </RadioGroupItemSelector>
                    <RadioGroupItemSelector size="md" value="IN_INSTALLMENTS">
                      <Label size="sm" asChild>
                        <span>Pay In Installments</span>
                      </Label>
                      <HelperText size="sm">
                        Select your payment plan
                      </HelperText>
                    </RadioGroupItemSelector>
                  </RadioGroup>
                )}
              />

              <HookFormErrorMessage
                errors={errors}
                name="pay"
                render={({ message }) => (
                  <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                )}
              />
            </div>

            {pay === "IN_INSTALLMENTS" && (
              <Alert className="mt-6">
                <AlertIcon>
                  <AlertCircle className="h-5 w-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle className="inline-block">
                    Please Note:{" "}
                    <AlertDescription className="inline mt-0 font-normal">
                      To confirm this project, an initial one-time payment is
                      required. Your installment plan will begin after this
                      payment is successfully processed.
                    </AlertDescription>
                  </AlertTitle>
                </AlertContent>
              </Alert>
            )}

            <div className="mt-6 border-t pt-6 border-gray-200">
              <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                Your Available Balance
              </h3>

              <div className="mt-5 flex items-start gap-x-4">
                <Checkbox size="md" />

                <div className="flex-auto flex flex-col items-start">
                  {isVisible ? (
                    <form className="contents" onSubmit={onSubmit}>
                      <div className="flex items-center flex-auto max-w-[328px] gap-x-3">
                        <Controller
                          control={control}
                          name="amount"
                          render={({ field: { onChange, ...field } }) => (
                            <CurrencyInput
                              className={cn(
                                inputVariants({
                                  className: "flex-auto",
                                  variant: hookFormHasError({
                                    errors,
                                    name: "amount",
                                  })
                                    ? "error"
                                    : undefined,
                                })
                              )}
                              intlConfig={{
                                locale: "en-US",
                                currency: "USD",
                              }}
                              onValueChange={onChange}
                              placeholder="Enter amount"
                              decimalsLimit={20}
                              {...field}
                            />
                          )}
                        />

                        <Button
                          size="lg"
                          disabled={hookFormHasError({
                            errors,
                            name: "amount",
                          })}
                        >
                          Apply
                        </Button>
                      </div>

                      <HookFormErrorMessage
                        errors={errors}
                        name="amount"
                        render={({ message }) => (
                          <ErrorMessage className="mt-1.5">
                            {message}
                          </ErrorMessage>
                        )}
                      />

                      <div className="mt-2">
                        <span className="block text-xs leading-none text-gray-500">
                          {formatter.format(
                            z.coerce.number().safeParse(amount).success
                              ? availableBalance - Number(amount)
                              : availableBalance
                          )}{" "}
                          remaining of available balance
                        </span>
                      </div>

                      <Button
                        className="underline mt-1"
                        variant="link"
                        visual="gray"
                        type="button"
                        onClick={() => {
                          setValue("amount", undefined as unknown as number)
                          setIsVisible(false)
                        }}
                      >
                        Use full balance
                      </Button>
                    </form>
                  ) : (
                    <>
                      {z.coerce.number().safeParse(amount).success ? (
                        <>
                          <Label size="sm">
                            Using{" "}
                            <span className="font-bold">
                              {formatter.format(Number(amount))}
                            </span>{" "}
                            of total available balance of{" "}
                            {formatter.format(availableBalance)}
                          </Label>
                          <div className="flex items-center gap-x-1 mt-1.5">
                            <Button
                              className="underline"
                              variant="link"
                              visual="gray"
                              onClick={() => setIsVisible(true)}
                            >
                              Edit amount
                            </Button>
                            <span className="inline-block text-xs leading-[15px] text-gray-500">
                              or
                            </span>
                            <Button
                              className="underline"
                              variant="link"
                              visual="gray"
                              onClick={() =>
                                setValue(
                                  "amount",
                                  undefined as unknown as number
                                )
                              }
                            >
                              Use full balance
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Label size="sm">
                            Use my{" "}
                            <span className="font-bold">
                              {formatter.format(availableBalance)}
                            </span>{" "}
                            available balance{" "}
                          </Label>
                          <Button
                            className="underline mt-1.5"
                            variant="link"
                            visual="gray"
                            onClick={() => setIsVisible(true)}
                          >
                            Apply Custom Amount
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-y py-6 border-gray-200">
              {show ? (
                <div className="max-w-[477px] p-5 rounded-lg space-y-3 bg-primary-25">
                  <div className="flex items-center justify-between">
                    <Label size="sm">
                      Redeem a gift card{" "}
                      <span className="font-light">(dashes not required)</span>
                    </Label>

                    <Button
                      variant="link"
                      visual="gray"
                      onClick={() => setShow(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <form
                    className="flex items-center gap-x-3"
                    onSubmit={handleSubmit}
                  >
                    <Controller
                      control={control}
                      name="giftCard"
                      render={({ field: { onChange, ...field } }) => (
                        <Input
                          className="flex-auto"
                          onChange={(event) => {
                            const {
                              target: { value },
                            } = event
                            onChange(formatGiftCard(value))
                          }}
                          {...field}
                          isInvalid={hookFormHasError({
                            errors: errors,
                            name: "giftCard",
                          })}
                        />
                      )}
                    />
                    <Button size="lg">Apply</Button>
                  </form>

                  <HookFormErrorMessage
                    errors={errors}
                    name="giftCard"
                    render={({ message }) => (
                      <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                    )}
                  />

                  {showGiftCard && giftCards && (
                    <Alert variant="success" className="mt-3">
                      <AlertIcon>
                        <CheckCircle className="size-5" />
                      </AlertIcon>
                      <AlertContent>
                        <AlertTitle>
                          Gift Card “{giftCards.slice(-1)}” has been applied.
                        </AlertTitle>
                      </AlertContent>
                    </Alert>
                  )}

                  {Boolean(giftCards?.length) && (
                    <Accordion type="multiple" className="mt-3">
                      <AccordionItem value="item-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs leading-none text-dark-blue-400 font-light">
                            Total gift card amount{" "}
                            <span className="font-bold">$1,000</span>
                          </span>

                          <AccordionTrigger asChild>
                            <Button variant="link" visual="gray">
                              View All Gift Cards
                              <ChevronDown className="size-[15px]" />
                            </Button>
                          </AccordionTrigger>
                        </div>
                        <DisclosureContent className="pt-5">
                          {giftCards?.map((giftCard, index) => (
                            <div
                              className="h-10 flex items-center justify-between border-b-[.5px] last:border-b-0 border-gray-300"
                              key={index}
                            >
                              <span className="inline-flex items-center gap-x-3">
                                <GiftCard className="size-7 shrink-0 fill-dark-blue-400" />
                                <span className="text-sm leading-none font-medium text-dark-blue-400">
                                  Gift card ending in *{giftCard.slice(0, 3)}
                                </span>
                              </span>

                              <span className="text-sm leading-none font-medium text-dark-blue-400">
                                Amount:{" "}
                                <span className="font-bold">$1,000.00</span>
                              </span>

                              <button
                                className="focus-visible:outline-none shrink-0 text-gray-400"
                                onClick={() => {
                                  setIndexToRemove(index)
                                  setIsOpen(true)
                                }}
                              >
                                <Trash03 className="size-[18px]" />
                              </button>
                            </div>
                          ))}
                        </DisclosureContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              ) : (
                <Button variant="link" size="md" onClick={() => setShow(true)}>
                  <Plus className="size-[15px]" /> Add Gift Card(s)
                </Button>
              )}
            </div>

            {pay === "AT_ONCE" &&
              !hasSplit &&
              !hasAddressSaved &&
              !hasBankAccountSaved && (
                <div className="mt-6">
                  <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                    Select Payment Method
                  </h3>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field: { onChange, ...field } }) => (
                      <RadioGroup
                        onValueChange={onChange}
                        {...field}
                        className="mt-5 grid grid-cols-3 gap-3"
                      >
                        {(paymentMethod
                          ? PAYMENT_METHODS.filter(
                              (method) => method.value === paymentMethod
                            )
                          : PAYMENT_METHODS
                        ).map((method) => (
                          <HeadlessRadioGroupItem
                            value={method.value}
                            key={method.value}
                            className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                          >
                            <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                              <Check className="size-3.5 shrink-0" />
                            </div>
                            <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                              {method.icons.map(({ icon }) => icon)}
                            </div>
                            <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                              {method.title}
                            </h3>
                            <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                              {method.desc}
                            </p>
                          </HeadlessRadioGroupItem>
                        ))}
                        {paymentMethod && (
                          <HeadlessRadioGroupItem
                            value=""
                            className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none"
                          >
                            <div className="flex items-center justify-center">
                              <RefreshCcw className="size-5 text-gray-500" />
                            </div>
                            <h3 className="text-sm leading-5 mt-3 font-medium text-center text-gray-800">
                              Change Payment Method{" "}
                            </h3>
                          </HeadlessRadioGroupItem>
                        )}
                      </RadioGroup>
                    )}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="paymentMethod"
                    render={({ message }) => (
                      <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                    )}
                  />
                </div>
              )}

            {!isWireTransfer && paymentMethod === "item-2" && (
              <>
                <div className="mt-[50px]">
                  <div className="flex justify-between items-end">
                    <div className="space-y-3">
                      <h1 className="text-lg font-bold text-dark-blue-400 leading-none">
                        Wire transfer details
                      </h1>
                      <p className="text-xs text-gray-500 leading-none">
                        Please follow the instructions below in order to
                        complete your wire transfer
                      </p>
                    </div>

                    <Button variant="outlined" visual="gray">
                      <Download02 className="size-[15px]" /> Download Invoice
                    </Button>
                  </div>

                  <div className="mt-6 border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] bg-white rounded-lg">
                    <Tabs defaultValue="Domestic Transfer">
                      <TabsList className="justify-start w-full">
                        <TabsTrigger value="Domestic Transfer">
                          Domestic Transfer
                        </TabsTrigger>
                        <TabsTrigger value="International Transfer">
                          International Transfer
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="py-4 px-6 border-b border-gray-200">
                      <span className="text-gray-950 text-sm">
                        Domestic wire transfers will take 24 - 48 hours to
                        receive.
                      </span>
                    </div>

                    <Table>
                      <TableBody className="[&_tr:last-child]:rounded-b-lg [&_td]:[&_tr:last-child]:rounded-b-lg">
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                            Account Number:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            712000528
                          </TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                            Routing Number:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            111000523
                          </TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                            Account Name:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            Marketeq Digital Inc.
                          </TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                            Bank Name:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            JP Morgan Chase & Co.
                          </TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4  border-r border-gray-200 px-6 whitespace-nowrap">
                            Bank Address:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            111 Wall Street New York, New York 10043, United
                            States
                          </TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                            Remark:
                          </TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            <div className="flex items-center gap-x-6">
                              #22602731500102292
                              <div className="inline-flex flex-auto items-center gap-x-2">
                                <ArrowLeft className="size-4 text-gray-500" />
                                <span className="text-sm font-normal whitespace-nowrap text-gray-500">
                                  Please attach this order number
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="mt-[50px]">
                  <div className="flex justify-between items-end">
                    <h1 className="text-lg font-bold text-dark-blue-400 leading-none">
                      Steps to complete your wire transfer
                    </h1>

                    <Button variant="outlined" visual="gray">
                      <Download02 className="size-[15px]" /> Download
                      Instructions
                    </Button>
                  </div>

                  <div className="mt-8">
                    <div className="pl-2.5 [&_span]:data-[data-part=line]">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                            1
                          </div>
                          <span
                            data-part="line"
                            className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200"
                          />
                        </div>

                        <div className="flex-auto space-y-2 pt-[7px]">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                            Select your preferred transfer method (Domestic or
                            International).
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="pl-2.5 data-[part=line]:[&_span]:last:hidden">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                            2
                          </div>

                          <span
                            data-part="line"
                            className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200"
                          />
                        </div>

                        <div className="flex-auto space-y-2">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                            Download and attach your invoice and proceed with
                            your payment using the bank account details
                            provided.
                          </h3>
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                            <span className="font-semibold">NOTE:</span> Please
                            mention your{" "}
                            <span className="font-semibold">project title</span>{" "}
                            and{" "}
                            <span className="font-semibold">order number</span>{" "}
                            in the reference area to help us identify your
                            payment
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="pl-2.5 data-[part=line]:[&_span]:last:hidden">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                            3
                          </div>
                          <span
                            data-part="line"
                            className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200"
                          />
                        </div>

                        <div className="flex-auto space-y-2">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                            Upload the payment receipt or proof of your
                            transaction. This helps us process your payment
                            faster and keep everything on track.
                          </h3>
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                            <span className="font-semibold">NOTE:</span> You
                            will able to upload your wire transfer receipt after
                            you submit your order.
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-[26px]">
                  <div className="flex items-center gap-x-2">
                    <Button variant="outlined" visual="gray">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setIsWireTransfer(true)}
                      className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                    >
                      Save Payment Method
                    </Button>
                  </div>
                  <div className="mt-3.5">
                    <span className="text-xs font-light text-dark-blue-400">
                      By adding sending your wire transfer, you agree to
                      Marketeq’s{" "}
                      <Button variant="link">Terms and Conditions</Button>
                    </span>
                  </div>
                </div>
              </>
            )}

            {isWireTransfer && paymentMethod === "item-2" && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Payment Method
                  </h3>

                  <Button variant="link">
                    <DivideSquare className="size-[15px]" />
                    Split Payment
                  </Button>
                </div>

                <div className="mt-5">
                  <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
                    <div className="flex items-center gap-x-3">
                      <div className="inline-flex items-center shrink-0 justify-center w-[46.5px] h-[31px]">
                        <WireTransfer />
                      </div>

                      <div className="inline-flex flex-col gap-y-1">
                        <span className="inline-block text-sm text-dark-blue-400">
                          Domestic WireTransfer
                        </span>
                        <span className="inline-block text-xs text-[#858585] leading-none">
                          Wire details will appear after you submit the order
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <IconButton
                        className="rounded-full opacity-50 hover:opacity-100"
                        variant="ghost"
                        visual="gray"
                        onClick={() => setIsWireTransfer(false)}
                      >
                        <Edit03 className="size-[18px]" />
                      </IconButton>

                      <RmDialog
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
                </div>
              </div>
            )}

            {paymentMethod === "item-5" && (
              <div className="mt-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-300 bg-white p-[25px] rounded-lg">
                <div className="flex items-center gap-x-3">
                  <Klarna className="w-[56.67px] h-10 shrink-0" />
                  <div className="flex-auto flex flex-col">
                    <span className="text-base font-medium text-gray-950">
                      Pay over time with Klarna
                    </span>
                    <span className="text-xs inline-block text-gray-500">
                      4 interest-free payments of $24,000.{" "}
                      <Button
                        className="text-xs underline"
                        variant="link"
                        visual="gray"
                      >
                        Learn More
                      </Button>
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t flex items-center gap-x-2 border-gray-200 pt-6">
                  <div className="size-[66px] relative shrink-0">
                    <NextImage
                      className="object-contain"
                      sizes="10vw"
                      src="/apple-tab.png"
                      alt="Apple Tab"
                      fill
                    />
                  </div>
                  <div className="flex-auto">
                    <span className="text-xs inline-block leading-none text-gray-950">
                      After submitting your order you will be redirected to
                      Klarna. Follow the instruction in google pay window to
                      complete your payment.
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    className="bg-black hover:bg-black/70 text-white"
                    size="md"
                  >
                    Continue with Klarna{" "}
                    <LinkExternal02 className="size-[15px]" />
                  </Button>
                </div>
              </div>
            )}

            {hasSplit && paymentMethods && paymentMethods.length <= 1 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Payment Method
                  </h3>
                </div>

                {paymentMethods.slice(0, 1).map((paymentMethod, index) => (
                  <React.Fragment key={index}>
                    {paymentMethod.method === "CREDIT_DEBIT_CARD" && (
                      <div className="mt-5">
                        <CreditDebitCardArticle1
                          cardNumber={paymentMethod.data.cardNumber}
                          saveDefaultPaymentMethod={
                            paymentMethod.data.saveDefaultPaymentMethod
                          }
                          onChange={() => setSelectingPaymentMethod(true)}
                        />
                      </div>
                    )}
                    {paymentMethod.method === "BANK_ACCOUNT" && (
                      <div className="mt-5">
                        <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
                          <div className="flex items-center gap-x-3">
                            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
                              <Bank className="size-4" />
                            </div>

                            <div className="inline-flex flex-col gap-y-1">
                              <div className="inline-flex items-center gap-x-2">
                                <span className="inline-block text-sm text-dark-blue-400">
                                  {paymentMethod.data.accountHolderName}
                                </span>
                                {paymentMethod.data
                                  .saveDefaultPaymentMethod && (
                                  <Badge visual="primary">Default</Badge>
                                )}
                              </div>
                              <span className="inline-block text-xs text-[#858585] leading-none">
                                Credit ****
                                {paymentMethod.data.accountNumber.slice(-4)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-x-5">
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() => setSelectingPaymentMethod(true)}
                            >
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

                              <DropdownMenuContent
                                className="w-[165px]"
                                align="end"
                              >
                                <DropdownMenuItem>
                                  <Edit03 className="h-4 w-4" /> Edit
                                </DropdownMenuItem>

                                <RmDialog
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
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {hasSplit && showPaymentMethods && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-base font-bold text-dark-blue-400 leading-[.7]">
                    Payment Methods
                  </h1>

                  <div className="flex items-center gap-x-2">
                    <Label htmlFor="auto-split">Auto Split</Label>

                    <Switch id="auto-split" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {paymentMethods?.map((paymentMethod, index) => (
                    <React.Fragment key={index}>
                      {paymentMethod.method === "APPLE_PAY" ? (
                        <ApplePayCard
                          amountToBePaid={formatter.format(
                            fullAmount / paymentMethods.length
                          )}
                        />
                      ) : paymentMethod.method === "GOOGLE_PAY" ? (
                        <GooglePayCard
                          amountToBePaid={formatter.format(
                            fullAmount / paymentMethods.length
                          )}
                        />
                      ) : paymentMethod.method === "CREDIT_DEBIT_CARD" ? (
                        <CreditDebitCardArticle2
                          cardNumber={paymentMethod.data.cardNumber}
                          saveDefaultPaymentMethod={
                            paymentMethod.data.saveDefaultPaymentMethod
                          }
                          amountToBePaid={formatter.format(
                            fullAmount / paymentMethods.length
                          )}
                        />
                      ) : paymentMethod.method === "BANK_ACCOUNT" ? (
                        <div className="flex items-center gap-x-2.5">
                          <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                            <div className="flex items-center gap-x-3">
                              <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                                <Bank className="size-4" />
                              </div>

                              <div className="inline-flex flex-col gap-y-1">
                                <div className="inline-flex items-center gap-x-2">
                                  <span className="inline-block text-sm text-dark-blue-400">
                                    {paymentMethod.data.accountHolderName}
                                  </span>
                                  {paymentMethod.data
                                    .saveDefaultPaymentMethod && (
                                    <Badge visual="primary">Default</Badge>
                                  )}
                                </div>
                                <span className="inline-block text-xs text-[#858585] leading-none">
                                  Credit ****
                                  {paymentMethod.data.accountNumber.slice(-4)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-x-2">
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
                              >
                                <Trash03 className="size-[18px]" />
                              </IconButton>
                            </div>
                          </div>

                          <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
                            <span className="text-xs block font-light leading-none text-gray-400">
                              Amount
                            </span>
                            <h3 className="text-base font-medium text-dark-blue-400">
                              {formatter.format(
                                fullAmount / paymentMethods.length
                              )}
                            </h3>
                          </div>
                        </div>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-5">
                  <Button
                    className="text-xs"
                    variant="link"
                    visual="gray"
                    onClick={() => setShowPaymentMethods(false)}
                  >
                    <Plus className="size-[15px]" /> Add Payment Method
                  </Button>
                </div>
              </div>
            )}

            {hasSplit && !showPaymentMethods && !hasCanceled && (
              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                      Add an additional payment method
                    </h3>
                    <p className="text-sm text-gray-500">
                      Split payment will be enabled once an additional payment
                      is added.
                    </p>
                  </div>

                  <Button
                    variant="link"
                    visual="primary"
                    onClick={() => setHasCanceled(false)}
                  >
                    <X className="size-[15px]" />
                    Cancel
                  </Button>
                </div>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field: { onChange, ...field } }) => (
                    <RadioGroup
                      onValueChange={onChange}
                      {...field}
                      className="mt-5 grid grid-cols-2 gap-3"
                    >
                      {(paymentMethod
                        ? PAYMENT_METHODS.filter(
                            (method) => method.value === paymentMethod
                          )
                        : [
                            ...PAYMENT_METHODS.slice(0, 2),
                            ...PAYMENT_METHODS.slice(3, 5),
                          ]
                      ).map((method) => (
                        <HeadlessRadioGroupItem
                          value={method.value}
                          key={method.value}
                          className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                        >
                          <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                            <Check className="size-3.5 shrink-0" />
                          </div>
                          <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                            {method.icons.map(({ icon }) => icon)}
                          </div>
                          <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                            {method.title}
                          </h3>
                          <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                            {method.desc}
                          </p>
                        </HeadlessRadioGroupItem>
                      ))}
                      {paymentMethod && (
                        <HeadlessRadioGroupItem
                          value=""
                          className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none"
                        >
                          <div className="flex items-center justify-center">
                            <RefreshCcw className="size-5 text-gray-500" />
                          </div>
                          <h3 className="text-sm leading-5 mt-3 font-medium text-center text-gray-800">
                            Change Payment Method{" "}
                          </h3>
                        </HeadlessRadioGroupItem>
                      )}
                    </RadioGroup>
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="paymentMethod"
                  render={({ message }) => (
                    <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                  )}
                />
              </div>
            )}

            {addNewPaymentMethod && !selectingPaymentMethod && !hasCanceled && (
              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                      Add an additional payment method
                    </h3>
                    <p className="text-sm text-gray-500">
                      Split payment will be enabled once an additional payment
                      is added.
                    </p>
                  </div>

                  <Button
                    variant="link"
                    visual="primary"
                    onClick={() => setHasCanceled(false)}
                  >
                    <X className="size-[15px]" />
                    Cancel
                  </Button>
                </div>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field: { onChange, ...field } }) => (
                    <RadioGroup
                      onValueChange={onChange}
                      {...field}
                      className="mt-5 grid grid-cols-3 gap-3"
                    >
                      {(paymentMethod
                        ? PAYMENT_METHODS.filter(
                            (method) => method.value === paymentMethod
                          )
                        : PAYMENT_METHODS
                      ).map((method) => (
                        <HeadlessRadioGroupItem
                          value={method.value}
                          key={method.value}
                          className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                        >
                          <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                            <Check className="size-3.5 shrink-0" />
                          </div>
                          <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                            {method.icons.map(({ icon }) => icon)}
                          </div>
                          <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                            {method.title}
                          </h3>
                          <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                            {method.desc}
                          </p>
                        </HeadlessRadioGroupItem>
                      ))}
                      {paymentMethod && (
                        <HeadlessRadioGroupItem
                          value=""
                          className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none"
                        >
                          <div className="flex items-center justify-center">
                            <RefreshCcw className="size-5 text-gray-500" />
                          </div>
                          <h3 className="text-sm leading-5 mt-3 font-medium text-center text-gray-800">
                            Change Payment Method{" "}
                          </h3>
                        </HeadlessRadioGroupItem>
                      )}
                    </RadioGroup>
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="paymentMethod"
                  render={({ message }) => (
                    <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                  )}
                />
              </div>
            )}

            {selectingPaymentMethod && !hasCanceled && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Payment Method
                  </h3>

                  <Button
                    variant="link"
                    onClick={() => {
                      setHasSplit(true)
                    }}
                  >
                    <DivideSquare className="size-[15px]" />
                    Split Payment
                  </Button>
                </div>

                <div className="p-5 mt-6 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                      Select a payment method
                    </h3>

                    <Button
                      variant="link"
                      visual="primary"
                      onClick={() => {
                        setSelectingPaymentMethod(false)
                        setAddNewPaymentMethod(false)
                      }}
                    >
                      <X className="size-[15px]" />
                      Cancel
                    </Button>
                  </div>

                  <RadioGroup
                    className="mt-5 space-y-2.5"
                    value={selected}
                    onValueChange={setSelected}
                  >
                    {paymentMethods?.map((paymentMethod, index) => (
                      <HeadlessRadioGroupItem
                        className="group/item focus-visible:outline-none block"
                        value={paymentMethod.method}
                        key={index}
                        onClick={() => {
                          if (paymentMethod.method === "CREDIT_DEBIT_CARD") {
                            setHasAddressSaved(true)
                            setValue("paymentMethod", "item-0")
                          } else {
                            setHasAddressSaved(false)
                          }
                          if (paymentMethod.method === "BANK_ACCOUNT") {
                            setHasBankAccountSaved(true)
                            setValue("paymentMethod", "item-1")
                          } else {
                            setHasBankAccountSaved(false)
                          }
                          setSelectingPaymentMethod(false)
                        }}
                      >
                        {paymentMethod.method === "APPLE_PAY" ? (
                          <ApplePayCard
                            amountToBePaid={formatter.format(
                              fullAmount / paymentMethods.length
                            )}
                          />
                        ) : paymentMethod.method === "GOOGLE_PAY" ? (
                          <GooglePayCard
                            amountToBePaid={formatter.format(
                              fullAmount / paymentMethods.length
                            )}
                          />
                        ) : paymentMethod.method === "CREDIT_DEBIT_CARD" ? (
                          <CreditDebitCardArticle3
                            cardNumber={paymentMethod.data.cardNumber}
                            saveDefaultPaymentMethod={
                              paymentMethod.data.saveDefaultPaymentMethod
                            }
                          />
                        ) : paymentMethod.method === "BANK_ACCOUNT" ? (
                          <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
                            <div className="flex items-center gap-x-3">
                              <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                                <Bank className="size-4" />
                              </div>

                              <div className="inline-flex flex-col gap-y-1">
                                <div className="inline-flex items-center gap-x-2">
                                  <span className="inline-block text-sm text-dark-blue-400">
                                    {paymentMethod.data.accountHolderName}
                                  </span>
                                  {paymentMethod.data
                                    .saveDefaultPaymentMethod && (
                                    <Badge visual="primary">Default</Badge>
                                  )}
                                </div>
                                <span className="inline-block text-xs text-[#858585] leading-none">
                                  Credit ****
                                  {paymentMethod.data.accountNumber.slice(-4)}
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
                        ) : null}
                      </HeadlessRadioGroupItem>
                    ))}
                  </RadioGroup>

                  <Button
                    className="mt-5"
                    variant="link"
                    visual="gray"
                    type="button"
                    onClick={() => {
                      setValue("paymentMethod", "")
                      setAddNewPaymentMethod(true)
                      setSelectingPaymentMethod(false)
                    }}
                  >
                    <Plus className="size-[15px]" /> Add Payment Method
                  </Button>
                </div>
              </div>
            )}

            {paymentMethod === "item-4" && (
              <div className="mt-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-300 bg-white p-[25px] rounded-lg">
                <div className="flex items-center gap-x-3">
                  <ApplePay className="w-[56.67px] h-10 shrink-0" />
                  <span className="text-base font-medium text-gray-950">
                    Apple Pay selected for checkout
                  </span>
                </div>

                <div className="mt-6 border-t flex items-center gap-x-2 border-gray-200 pt-6">
                  <div className="size-[66px] relative shrink-0">
                    <NextImage
                      className="object-contain"
                      sizes="10vw"
                      src="/apple-tab.png"
                      alt="Apple Tab"
                      fill
                    />
                  </div>
                  <div className="flex-auto">
                    <span className="text-xs inline-block leading-none text-gray-950">
                      After submitting your order you will be redirected to
                      Apple Pay Window. Follow the instruction in google pay
                      window to complete your payment.
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    className="bg-black hover:bg-black/70 text-white"
                    size="md"
                    onClick={() => {
                      if (hasSplit) {
                        setPaymentMethods(
                          paymentMethods
                            ? [...paymentMethods, { method: "APPLE_PAY" }]
                            : [{ method: "APPLE_PAY" }]
                        )
                        setValue("paymentMethod", "")
                        setShowPaymentMethods(true)
                        setSelectingPaymentMethod(true)
                      }
                    }}
                  >
                    Continue with Apple Pay{" "}
                    <LinkExternal02 className="size-[15px]" />
                  </Button>
                </div>
              </div>
            )}

            {paymentMethod === "item-3" && (
              <div className="mt-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-300 bg-white p-[25px] rounded-lg">
                <div className="flex items-center gap-x-3">
                  <GPay className="w-[56.67px] h-10 shrink-0" />
                  <span className="text-base font-medium text-gray-950">
                    Google Pay selected for checkout
                  </span>
                </div>

                <div className="mt-6 border-t flex items-center gap-x-2 border-gray-200 pt-6">
                  <div className="size-[66px] relative shrink-0">
                    <NextImage
                      className="object-contain"
                      sizes="10vw"
                      src="/apple-tab.png"
                      alt="Apple Tab"
                      fill
                    />
                  </div>
                  <div className="flex-auto">
                    <span className="text-xs inline-block leading-none text-gray-950">
                      After submitting your order you will be redirected to
                      Google Pay Window. Follow the instruction in google pay
                      window to complete your payment.
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    className="bg-black hover:bg-black/70 text-white"
                    size="md"
                    onClick={() => {
                      if (hasSplit) {
                        setPaymentMethods(
                          paymentMethods
                            ? [...paymentMethods, { method: "GOOGLE_PAY" }]
                            : [{ method: "GOOGLE_PAY" }]
                        )
                        setValue("paymentMethod", "")
                        setShowPaymentMethods(true)
                        setSelectingPaymentMethod(true)
                      }
                    }}
                  >
                    Continue with Google Pay{" "}
                    <LinkExternal02 className="size-[15px]" />
                  </Button>
                </div>
              </div>
            )}

            {hasBankAccountSaved &&
              !selectingPaymentMethod &&
              !hasSplit &&
              paymentMethod === "item-1" && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                      Payment Method
                    </h3>

                    <Button
                      variant="link"
                      onClick={() => {
                        setHasSplit(true)
                        methods.reset()
                        setValue("paymentMethod", "")
                        setHasBankAccountSaved(false)
                      }}
                    >
                      <DivideSquare className="size-[15px]" />
                      Split Payment
                    </Button>
                  </div>

                  <div className="mt-5">
                    <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
                      <div className="flex items-center gap-x-3">
                        <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
                          <Bank className="size-4" />
                        </div>

                        <div className="inline-flex flex-col gap-y-1">
                          <div className="inline-flex items-center gap-x-2">
                            <span className="inline-block text-sm text-dark-blue-400">
                              {accountHolderName}
                            </span>
                            {_saveDefaultPaymentMethod && (
                              <Badge visual="primary">Default</Badge>
                            )}
                          </div>
                          <span className="inline-block text-xs text-[#858585] leading-none">
                            Credit ****{accountNumber.slice(-4)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-x-5">
                        <Button
                          variant="link"
                          visual="gray"
                          onClick={() => setSelectingPaymentMethod(true)}
                        >
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

                          <DropdownMenuContent
                            className="w-[165px]"
                            align="end"
                          >
                            <DropdownMenuItem
                              onSelect={() => setHasBankAccountSaved(false)}
                            >
                              <Edit03 className="h-4 w-4" /> Edit
                            </DropdownMenuItem>

                            <RmDialog
                              onRemove={() => {
                                methods.reset()
                                setValue("paymentMethod", "")
                                setPaymentMethods(paymentMethods?.slice(0, -1))
                                setHasBankAccountSaved(false)
                              }}
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
                  </div>
                </div>
              )}

            <form onSubmit={form.handleSubmit(handleOnSubmit)}>
              {!hasAddressSaved && paymentMethod === "item-0" && (
                <div className="mt-[50px]">
                  <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                    Add your credit / debit card
                  </h1>
                  <p className="mt-3 text-gray-500 text-xs leading-none flex items-center gap-x-1">
                    <Lock className="size-4" /> Your payment is secure. Your
                    card details will not be shared.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="card-number">
                        Card number
                      </Label>

                      <Controller
                        control={form.control}
                        name="cardNumber"
                        render={({ field: { onChange, ...field } }) => (
                          <CreditCardInput
                            id="card-number"
                            {...field}
                            onFocus={() => setFocusedField("card-number")}
                            onBlur={() => setFocusedField(undefined)}
                            onValueChange={onChange}
                            isInvalid={hookFormHasError({
                              errors: form.formState.errors,
                              name: "cardNumber",
                            })}
                          />
                        )}
                      />

                      <HookFormErrorMessage
                        errors={form.formState.errors}
                        name="cardNumber"
                        render={({ message }) => (
                          <ErrorMessage>{message}</ErrorMessage>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="name-on-card">
                        Name on card
                      </Label>

                      <Input
                        id="name-on-card"
                        {...form.register("cardName")}
                        isInvalid={hookFormHasError({
                          errors: form.formState.errors,
                          name: "cardName",
                        })}
                        onFocus={() => setFocusedField("card-name")}
                        onBlur={() => setFocusedField(undefined)}
                        type="text"
                        placeholder="John Doe"
                      />

                      <HookFormErrorMessage
                        errors={form.formState.errors}
                        name="cardName"
                        render={({ message }) => (
                          <ErrorMessage>{message}</ErrorMessage>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-x-3">
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="expiration-date">
                          Expiration Date
                        </Label>
                        <Controller
                          control={form.control}
                          name="expirationDate"
                          render={({ field: { onChange, ...field } }) => (
                            <Input
                              id="expiration-date"
                              type="text"
                              placeholder="MM/YY"
                              {...field}
                              onChange={(event) => {
                                const sanitized = event.target.value.replace(
                                  /[^\d]/g,
                                  ""
                                )
                                if (sanitized.length >= 2) {
                                  const value = `${sanitized.slice(
                                    0,
                                    2
                                  )}/${sanitized.slice(2, 4)}`
                                  onChange(value)
                                } else onChange(sanitized)
                              }}
                              isInvalid={hookFormHasError({
                                errors: form.formState.errors,
                                name: "expirationDate",
                              })}
                              onFocus={() => setFocusedField("expiration-date")}
                              onBlur={() => setFocusedField(undefined)}
                            />
                          )}
                        />
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="expirationDate"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="cvv-cvc">
                          CVV / CVC
                        </Label>
                        <InputGroup>
                          <Controller
                            control={form.control}
                            name="cvvOrCvc"
                            render={({ field: { onChange, ...field } }) => (
                              <Input
                                id="cvv-cvc"
                                type="text"
                                placeholder="3 or 4 digits"
                                {...field}
                                onChange={(event) => {
                                  const {
                                    target: { value },
                                  } = event
                                  value.length <= 4 && onChange(value)
                                }}
                                isInvalid={hookFormHasError({
                                  errors: form.formState.errors,
                                  name: "cvvOrCvc",
                                })}
                                onFocus={() => setFocusedField("cvv-cvc")}
                                onBlur={() => setFocusedField(undefined)}
                              />
                            )}
                          />
                          <InputRightElement>
                            <TooltipProvider delayDuration={75}>
                              <Tooltip>
                                <TooltipTrigger className="focus-visible:outline-none">
                                  <HelpCircle className="text-gray-500 h-4 w-4" />
                                </TooltipTrigger>
                                <TooltipContent
                                  className="max-w-[139px]"
                                  visual="gray"
                                >
                                  3-4 digit code on the back of your card
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </InputRightElement>
                        </InputGroup>
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="cvvOrCvc"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-[22px] flex items-center gap-x-3">
                    <Controller
                      control={form.control}
                      name="saveDefaultPaymentMethod"
                      render={({ field: { onChange, value, ...field } }) => (
                        <Checkbox
                          size="md"
                          id="save-default-payment-method"
                          onCheckedChange={onChange}
                          checked={value}
                          {...field}
                        />
                      )}
                    />
                    <Label size="sm" htmlFor="save-default-payment-method">
                      Save as default payment method
                    </Label>
                  </div>
                </div>
              )}

              {!hasAddressSaved &&
                paymentMethod === "item-0" &&
                layout === "form" && (
                  <div className="mt-[50px]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                        Billing Address
                      </h3>

                      {Boolean(billingAddresses?.length) && (
                        <Button
                          onClick={() => setLayout("selection")}
                          className="text-xs underline"
                          variant="link"
                          type="button"
                        >
                          Use a saved address
                        </Button>
                      )}
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="full-name">
                          Full Name
                        </Label>
                        <Input
                          placeholder="John Doe"
                          id="full-name"
                          {...form.register("fullName")}
                          isInvalid={hookFormHasError({
                            errors: form.formState.errors,
                            name: "fullName",
                          })}
                        />
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="fullName"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="address-line-1">
                          Address Line 1
                        </Label>
                        <Input
                          placeholder="Street Address or P.O. Box"
                          id="address-line-1"
                          {...form.register("addressLine1")}
                          isInvalid={hookFormHasError({
                            errors: form.formState.errors,
                            name: "addressLine1",
                          })}
                        />
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="addressLine1"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="address-line-2">
                          Address Line 2
                        </Label>
                        <Input
                          placeholder="Apt, Suite, Unit, or Building #"
                          id="address-line-2"
                          {...form.register("addressLine2")}
                          isInvalid={hookFormHasError({
                            errors: form.formState.errors,
                            name: "addressLine2",
                          })}
                        />
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="addressLine2"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="gap-x-3 grid grid-cols-3">
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="city">
                            City
                          </Label>
                          <Input
                            placeholder="Marketown"
                            id="city"
                            {...form.register("city")}
                            isInvalid={hookFormHasError({
                              errors: form.formState.errors,
                              name: "city",
                            })}
                          />
                          <HookFormErrorMessage
                            errors={form.formState.errors}
                            name="city"
                            render={({ message }) => (
                              <ErrorMessage>{message}</ErrorMessage>
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="state">
                            State
                          </Label>
                          <Controller
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                              <Listbox {...field}>
                                <ListboxButton placeholder="Select" />
                                <ListboxOptions>
                                  {[
                                    "New York",
                                    "Florida",
                                    "Alaska",
                                    "Arizona",
                                    "Georgia",
                                    "Hawaii",
                                  ].map((state) => (
                                    <ListboxOption key={state} value={state}>
                                      {state}
                                    </ListboxOption>
                                  ))}
                                </ListboxOptions>
                              </Listbox>
                            )}
                          />
                          <HookFormErrorMessage
                            errors={form.formState.errors}
                            name="state"
                            render={({ message }) => (
                              <ErrorMessage>{message}</ErrorMessage>
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="zipcode">
                            Zipcode
                          </Label>
                          <Input
                            placeholder="12345"
                            id="zipcode"
                            {...form.register("zipcode")}
                            isInvalid={hookFormHasError({
                              errors: form.formState.errors,
                              name: "zipcode",
                            })}
                          />
                          <HookFormErrorMessage
                            errors={form.formState.errors}
                            name="zipcode"
                            render={({ message }) => (
                              <ErrorMessage>{message}</ErrorMessage>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="phone-number">
                          Phone number
                        </Label>
                        <Controller
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <PhoneNumberInput {...field} />
                          )}
                        />
                        <HookFormErrorMessage
                          errors={form.formState.errors}
                          name="phoneNumber"
                          render={({ message }) => (
                            <ErrorMessage>{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex mt-[50px] justify-end">
                      <Button>Save Card</Button>
                    </div>
                  </div>
                )}
            </form>

            {!hasAddressSaved &&
              paymentMethod === "item-0" &&
              layout === "selection" &&
              isBillingAddressValid && (
                <div className="mt-[50px]">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Billing Address
                  </h3>

                  <p className="mt-3 text-xs leading-none text-gray-500">
                    Please choose a billing address from your address book
                    below, or{" "}
                    <Button
                      className="text-xs leading-none"
                      variant="link"
                      type="button"
                      onClick={() => setLayout("form")}
                    >
                      add a new billing address
                    </Button>
                  </p>

                  <Controller
                    name="billingAddressCreditOrDebtInfo"
                    control={control}
                    render={({ field: { onChange } }) => {
                      const selectedBillingAddress =
                        (billingAddresses?.length || 0) - 1

                      return (
                        <RadioGroup
                          className="mt-6"
                          defaultValue={`${selectedBillingAddress}`}
                          onValueChange={(value) => {
                            const billingAddress =
                              billingAddresses?.[parseInt(value)]
                            onChange(billingAddress)
                          }}
                        >
                          {billingAddresses?.map((billingAddress, index) => (
                            <RadioGroupItemSelector
                              className="min-h-[42px] bg-transparent border-0 hover:ring-2 hover:ring-gray-300 data-[state=checked]:ring-2 focus:ring-2 focus:ring-primary-400 data-[state=checked]:ring-primary-400"
                              value={`${index}`}
                              key={index}
                            >
                              <Label className="font-normal" size="sm">
                                <span className="font-bold">
                                  {billingAddress.fullName}
                                </span>
                                , {billingAddress.addressLine1},{" "}
                                {billingAddress.phoneNumber}
                              </Label>
                            </RadioGroupItemSelector>
                          ))}
                        </RadioGroup>
                      )
                    }}
                  />

                  <div className="mt-6 flex items-center gap-x-3">
                    <Button
                      className="text-xs leading-6 text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                      onClick={onUseAddress}
                      disabled={!billingAddressCreditOrDebtInfo}
                    >
                      Use This Address
                    </Button>
                    <Button
                      className="text-xs leading-6"
                      variant="outlined"
                      visual="gray"
                      type="button"
                      onClick={() => setLayout("form")}
                    >
                      <Plus className="size-[15px]" />
                      New Address
                    </Button>
                  </div>
                </div>
              )}

            {!hasAddressSaved &&
              paymentMethod === "item-0" &&
              layout === "default" &&
              isBillingAddressValid && (
                <>
                  <div className="mt-[50px]">
                    <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                      Billing Address
                    </h3>

                    <div className="mt-6 p-6 rounded-[7px] pt-[35px] border-2 flex items-center justify-between border-gray-200 bg-white">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold leading-5 text-dark-blue-400">
                          {billingAddressCreditOrDebtInfo.fullName}
                        </h3>

                        <ul className="max-w-[211px]">
                          <li className="text-base leading-5 text-dark-blue-400">
                            {billingAddressCreditOrDebtInfo.addressLine1}
                          </li>
                          <li className="text-base leading-5 text-dark-blue-400">
                            {phoneUtil.formatOutOfCountryCallingNumber(
                              phoneUtil.parseAndKeepRawInput(
                                billingAddressCreditOrDebtInfo.phoneNumber
                              )
                            )}
                          </li>
                        </ul>
                      </div>

                      <Button
                        visual="gray"
                        variant="outlined"
                        onClick={() => setLayout("selection")}
                      >
                        Change Address
                      </Button>
                    </div>
                  </div>

                  <div className="flex mt-[50px] justify-end">
                    <Button
                      className="text-primary-500 bg-primary-50 hover:bg-primary-500 hover:text-white"
                      onClick={() => isValid && setIsOpened(true)}
                      disabled={!isValid}
                    >
                      Save Card
                    </Button>
                  </div>
                </>
              )}
            {hasAddressSaved &&
              !selectingPaymentMethod &&
              !hasSplit &&
              paymentMethod === "item-0" &&
              isBillingAddressValid && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                      Payment Method
                    </h3>

                    <Button
                      variant="link"
                      onClick={() => {
                        setHasSplit(true)
                        form.reset()
                        setValue("paymentMethod", "")
                        setValue(
                          "billingAddressCreditOrDebtInfo",
                          undefined as unknown as BillingAddressFormValues
                        )
                        setLayout("form")
                        setBillingAddresses(undefined)
                        setHasAddressSaved(false)
                      }}
                    >
                      <DivideSquare className="size-[15px]" />
                      Split Payment
                    </Button>
                  </div>
                  <div className="mt-5">
                    <CreditDebitCardArticle
                      onEdit={() => setHasAddressSaved(false)}
                      control={form.control}
                      onChange={() => setSelectingPaymentMethod(true)}
                      onRemove={() => {
                        form.reset()
                        setValue("paymentMethod", "")
                        setValue(
                          "billingAddressCreditOrDebtInfo",
                          undefined as unknown as BillingAddressFormValues
                        )
                        setLayout("form")
                        setPaymentMethods(paymentMethods?.slice(0, -1))
                        setBillingAddresses(undefined)
                        setHasAddressSaved(false)
                      }}
                    />
                  </div>
                </div>
              )}

            {!hasBankAccountSaved && paymentMethod === "item-1" && (
              <>
                <div className="mt-[50px]">
                  <div className="px-[55.25px] flex items-end pb-5 gap-x-[22.55px]">
                    <div className="h-[95.88px] shrink-0 relative w-[198.92px]">
                      <NextImage
                        className="object-contain"
                        src="/connect-bank-account.png"
                        alt="Connect Bank Account"
                        fill
                        sizes="25vw"
                      />
                    </div>
                    <h1 className="text-[26.62px] leading-[1.2] text-gray-950">
                      Marketeq uses <span className="font-bold">Plaid</span> to
                      connect your bank account
                    </h1>
                  </div>

                  <div className="py-[50px] px-[75px] rounded-xl border-2 border-gray-200 bg-white grid grid-cols-2 gap-x-[60px] items-center">
                    <div className="space-y-[30px]">
                      <div className="flex items-start gap-x-2.5">
                        <Zap className="size-[14.77px] shrink-0 text-gray-950" />
                        <div className="flex-auto">
                          <h3 className="text-[13px] leading-none font-semibold text-gray-950">
                            Connect in seconds
                          </h3>
                          <p className="mt-2 text-[13px] leading-none font-light text-gray-950">
                            8000+ apps trust Plaid to quickly connect to
                            financial institutions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-x-2.5">
                        <ShieldTick className="size-[14.77px] shrink-0 text-gray-950" />
                        <div className="flex-auto">
                          <h3 className="text-[13px] leading-none font-semibold text-gray-950">
                            Keep your data safe
                          </h3>
                          <p className="mt-2 text-[13px] leading-none font-light text-gray-950">
                            Plaid uses best-in-class encryption to help protect
                            your data
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <Button className="h-[56.24px] bg-black gap-x-3 hover:bg-black/70 px-8 text-[17.62px] leading-[20.88px] font-semibold">
                        Connect my account{" "}
                        <LinkExternal01 className="size-[18px]" />
                      </Button>

                      <div>
                        <span className="inline-block text-[11px] leading-[1.5] font-light text-gray-950">
                          By continuing, you agree to Plaid’s{" "}
                          <span className="underline inline-block">
                            Privacy Policy
                          </span>{" "}
                          and to receiving updates on plaid.com
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-[50px] flex items-center gap-x-[9px]">
                    <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                    <span className="text-xs font-medium text-[#939DA7] leading-5">
                      Or
                    </span>
                    <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                  </div>
                </div>
                <form
                  className="mt-[50px]"
                  onSubmit={methods.handleSubmit(onValid)}
                >
                  <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                    Add Your Bank Account Manually
                  </h1>

                  <div className="mt-6 space-y-3">
                    <Controller
                      control={methods.control}
                      name="accountType"
                      render={({ field }) => (
                        <Listbox className="space-y-1.5" {...field}>
                          <ListboxLabel size="sm" htmlFor="account-type">
                            Account Type
                          </ListboxLabel>
                          <ListboxContent>
                            <ListboxButton
                              placeholder="Select"
                              isInvalid={hookFormHasError({
                                errors: methods.formState.errors,
                                name: "accountType",
                              })}
                            />
                            <ListboxOptions>
                              {["Checking", "Savings"].map((option) => (
                                <ListboxOption key={option} value={option}>
                                  {option}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </ListboxContent>

                          <HookFormErrorMessage
                            errors={methods.formState.errors}
                            name="accountType"
                            render={({ message }) => (
                              <ErrorMessage className="mt-1.5">
                                {message}
                              </ErrorMessage>
                            )}
                          />
                        </Listbox>
                      )}
                    />

                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="account-holder-name">
                        Account Holder Name
                      </Label>

                      <Input
                        id="account-holder-name"
                        type="text"
                        placeholder="John Doe"
                        {...methods.register("accountHolderName")}
                        isInvalid={hookFormHasError({
                          errors: methods.formState.errors,
                          name: "accountHolderName",
                        })}
                      />

                      <HookFormErrorMessage
                        errors={methods.formState.errors}
                        name="accountHolderName"
                        render={({ message }) => (
                          <ErrorMessage className="mt-1.5">
                            {message}
                          </ErrorMessage>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="bank-routing-number">
                        Bank Routing Number
                      </Label>
                      <Input
                        id="bank-routing-number"
                        type="text"
                        placeholder="xxxx-xxxx-xx"
                        {...methods.register("bankRoutingNumber")}
                        isInvalid={hookFormHasError({
                          errors: methods.formState.errors,
                          name: "bankRoutingNumber",
                        })}
                      />
                      <HookFormErrorMessage
                        errors={methods.formState.errors}
                        name="bankRoutingNumber"
                        render={({ message }) => (
                          <ErrorMessage className="mt-1.5">
                            {message}
                          </ErrorMessage>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-x-3">
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="account-number">
                          Account Number
                        </Label>
                        <Input
                          id="account-number"
                          type="text"
                          placeholder="Up to 17 digits"
                          {...methods.register("accountNumber")}
                          isInvalid={hookFormHasError({
                            errors: methods.formState.errors,
                            name: "accountNumber",
                          })}
                        />

                        <HookFormErrorMessage
                          errors={methods.formState.errors}
                          name="accountNumber"
                          render={({ message }) => (
                            <ErrorMessage className="mt-1.5">
                              {message}
                            </ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="re-enter-account-number">
                          Re-Enter Account Number
                        </Label>

                        <Input
                          id="re-enter-account-number"
                          type="text"
                          placeholder="Up to 17 digits"
                          {...methods.register("confirmAccountNumber")}
                          isInvalid={hookFormHasError({
                            errors: methods.formState.errors,
                            name: "confirmAccountNumber",
                          })}
                        />

                        <HookFormErrorMessage
                          errors={methods.formState.errors}
                          name="confirmAccountNumber"
                          render={({ message }) => (
                            <ErrorMessage className="mt-1.5">
                              {message}
                            </ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-[22px] flex items-center gap-x-3">
                    <Controller
                      control={methods.control}
                      name="saveDefaultPaymentMethod"
                      render={({ field: { onChange, value, ...field } }) => (
                        <Checkbox
                          size="md"
                          id="save-default-payment-method"
                          checked={value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      )}
                    />

                    <Label size="sm" htmlFor="save-default-payment-method">
                      Save as default payment method
                    </Label>
                  </div>

                  <div className="mt-[50px]">
                    <div className="flex items-center justify-end gap-x-2">
                      <Button type="button" variant="outlined" visual="gray">
                        Cancel
                      </Button>
                      <Button className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white">
                        Save account
                      </Button>
                    </div>
                    <div className="mt-3.5 flex items-center justify-end">
                      <span className="text-xs font-light text-dark-blue-400">
                        By adding sending your wire transfer, you agree to
                        Marketeq’s{" "}
                        <Button variant="link">Terms and Conditions</Button>
                      </span>
                    </div>
                  </div>
                </form>
              </>
            )}

            {pay === "IN_INSTALLMENTS" && (
              <>
                <div className="mt-6">
                  {Number(firstBlockPaymentMethods?.length || 0) > 0 && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h1 className="text-base font-bold leading-[0.7] text-dark-blue-400">
                          Initial One-Time Payment
                        </h1>

                        {Number(firstBlockPaymentMethods?.length || 0) > 1 ? (
                          <div className="flex items-center gap-x-2">
                            <Label size="sm">Auto Split</Label>
                            <Switch />
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            onClick={() => {
                              setIsSelectPaymentMethodOpen(true)
                              setOpenedBlock("first")
                              setSelectedPayMethod("")
                            }}
                          >
                            <DivideSquare className="size-[15px]" /> Split
                            Payment
                          </Button>
                        )}
                      </div>

                      <div className="flex-auto space-y-2.5">
                        {firstBlockPaymentMethods?.map(
                          (paymentMethod, index) => {
                            const action = () => {
                              const item = firstBlockPaymentMethods[index]
                              setFirstBlockPaymentMethods(
                                firstBlockPaymentMethods.filter(
                                  (_, i) => i !== index
                                )
                              )
                              setSecondBlockPaymentMethods((prev) =>
                                prev ? [...prev, item] : [item]
                              )
                            }
                            return (
                              <React.Fragment key={index}>
                                {paymentMethod.method === "BANK_ACCOUNT" ? (
                                  <BankCardSelected
                                    accountType={paymentMethod.data.accountType}
                                    openedBlock="first"
                                    accountNumber={
                                      paymentMethod.data.accountNumber
                                    }
                                    defaultAmount={5000}
                                    action={action}
                                    onRemove={() => handleOnRemove(index)}
                                  />
                                ) : paymentMethod.method ===
                                  "CREDIT_DEBIT_CARD" ? (
                                  <CreditDebitSelected
                                    cardNumber={paymentMethod.data.cardNumber}
                                    defaultAmount={5000}
                                    openedBlock="first"
                                    action={action}
                                    onRemove={() => handleOnRemove(index)}
                                  />
                                ) : null}
                              </React.Fragment>
                            )
                          }
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          variant="link"
                          visual="gray"
                          onClick={() => {
                            setIsSelectPaymentMethodOpen(true)
                            setOpenedBlock("first")
                            setSelectedPayMethod("")
                          }}
                        >
                          <Plus className="size-[15px]" />
                          Add Payment Method
                        </Button>

                        <div className="flex items-center gap-x-2">
                          <h3 className="text-xs font-light text-dark-blue-400">
                            Total one-time amount
                          </h3>
                          <h1 className="text-base font-bold text-dark-blue-400">
                            $6,000
                          </h1>
                        </div>
                      </div>
                    </div>
                  )}

                  {Number(firstBlockPaymentMethods?.length || 0) < 1 && (
                    <>
                      <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">
                        Initial One-Time Payment
                      </h1>
                      <div className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition duration-300 bg-gray-50 flex items-center justify-center gap-x-2">
                        <Button
                          className="hover:no-underline"
                          variant="link"
                          visual="gray"
                          onClick={() => {
                            setIsSelectPaymentMethodOpen(true)
                            setOpenedBlock("first")
                            setSelectedPayMethod("")
                          }}
                        >
                          <Plus className="size-[15px]" /> Add Payment Method
                        </Button>
                      </div>
                    </>
                  )}
                  <Dialog
                    open={isSelectPaymentMethodOpen}
                    onOpenChange={setIsSelectPaymentMethodOpen}
                  >
                    <DialogContent className="max-w-[743px] p-0">
                      <div className="p-3 border-gray-200 border-b flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <DialogClose asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="md"
                              className="text-dark-blue-400"
                            >
                              <ArrowLeft className="size-5" />
                            </IconButton>
                          </DialogClose>
                          <h2 className="text-lg leading-7 text-dark-blue-400 font-semibold">
                            Select payment method
                          </h2>
                        </div>
                        <DialogClose asChild>
                          <IconButton
                            className="text-gray-500"
                            variant="ghost"
                            visual="gray"
                            size="md"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      </div>

                      <div className="p-6">
                        <RadioGroup
                          onValueChange={(value) => {
                            setIsSelectPaymentMethodOpen(false)
                            value === "item-0" &&
                              setIsAddCreditOrDebitOpen(true)
                            value === "item-1" && setIsBankAccountOpen(true)

                            setSelectedPayMethod(value)
                          }}
                          value={selectedPayMethod}
                          className="grid grid-cols-2 gap-3"
                        >
                          {[
                            ...PAYMENT_METHODS.slice(0, 2),
                            ...PAYMENT_METHODS.slice(3, 5),
                          ].map((method) => (
                            <HeadlessRadioGroupItem
                              value={method.value}
                              key={method.value}
                              className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                            >
                              <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                                <Check className="size-3.5 shrink-0" />
                              </div>
                              <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                                {method.icons.map(({ icon }) => icon)}
                              </div>
                              <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                                {method.title}
                              </h3>
                              <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                                {method.desc}
                              </p>
                            </HeadlessRadioGroupItem>
                          ))}
                        </RadioGroup>

                        <HookFormErrorMessage
                          errors={errors}
                          name="paymentMethod"
                          render={({ message }) => (
                            <ErrorMessage className="mt-1.5">
                              {message}
                            </ErrorMessage>
                          )}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isBankAccountOpen}
                    onOpenChange={setIsBankAccountOpen}
                  >
                    <DialogContent className="max-w-[743px] p-0">
                      <div className="p-3 border-gray-200 border-b flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <DialogClose asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="md"
                              className="text-dark-blue-400"
                            >
                              <ArrowLeft className="size-5" />
                            </IconButton>
                          </DialogClose>
                          <h2 className="text-lg leading-7 text-dark-blue-400 font-semibold">
                            Select payment method
                          </h2>
                        </div>
                        <DialogClose asChild>
                          <IconButton
                            className="text-gray-500"
                            variant="ghost"
                            visual="gray"
                            size="md"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      </div>

                      <ScrollArea
                        className="h-[612px]"
                        scrollBar={<ScrollBar className="w-4 p-1" />}
                      >
                        <div className="p-6 pb-4">
                          {selectedPayMethod === "item-1" && (
                            <>
                              <div>
                                <div className="px-[55.25px] flex items-end pb-5 gap-x-[22.55px]">
                                  <div className="h-[95.88px] shrink-0 relative w-[198.92px]">
                                    <NextImage
                                      className="object-contain"
                                      src="/connect-bank-account.png"
                                      alt="Connect Bank Account"
                                      fill
                                      sizes="25vw"
                                    />
                                  </div>
                                  <h1 className="text-[26.62px] leading-[1.2] text-gray-950">
                                    Marketeq uses{" "}
                                    <span className="font-bold">Plaid</span> to
                                    connect your bank account
                                  </h1>
                                </div>

                                <div className="py-[50px] px-[75px] rounded-xl border-2 border-gray-200 bg-white grid grid-cols-2 gap-x-[60px] items-center">
                                  <div className="space-y-[30px]">
                                    <div className="flex items-start gap-x-2.5">
                                      <Zap className="size-[14.77px] shrink-0 text-gray-950" />
                                      <div className="flex-auto">
                                        <h3 className="text-[13px] leading-none font-semibold text-gray-950">
                                          Connect in seconds
                                        </h3>
                                        <p className="mt-2 text-[13px] leading-none font-light text-gray-950">
                                          8000+ apps trust Plaid to quickly
                                          connect to financial institutions
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-x-2.5">
                                      <ShieldTick className="size-[14.77px] shrink-0 text-gray-950" />
                                      <div className="flex-auto">
                                        <h3 className="text-[13px] leading-none font-semibold text-gray-950">
                                          Keep your data safe
                                        </h3>
                                        <p className="mt-2 text-[13px] leading-none font-light text-gray-950">
                                          Plaid uses best-in-class encryption to
                                          help protect your data
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-5">
                                    <Button className="h-[56.24px] bg-black gap-x-3 hover:bg-black/70 px-8 text-[17.62px] leading-[20.88px] font-semibold">
                                      Connect my account{" "}
                                      <LinkExternal01 className="size-[18px]" />
                                    </Button>

                                    <div>
                                      <span className="inline-block text-[11px] leading-[1.5] font-light text-gray-950">
                                        By continuing, you agree to Plaid’s{" "}
                                        <span className="underline inline-block">
                                          Privacy Policy
                                        </span>{" "}
                                        and to receiving updates on plaid.com
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-[50px] flex items-center gap-x-[9px]">
                                  <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                                  <span className="text-xs font-medium text-[#939DA7] leading-5">
                                    Or
                                  </span>
                                  <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                                </div>
                              </div>
                              <form
                                className="mt-[50px]"
                                onSubmit={_methods.handleSubmit(_onValid)}
                              >
                                <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                                  Add Your Bank Account Manually
                                </h1>

                                <div className="mt-6 space-y-3">
                                  <Controller
                                    control={_methods.control}
                                    name="accountType"
                                    render={({ field }) => (
                                      <Listbox
                                        className="space-y-1.5"
                                        {...field}
                                      >
                                        <ListboxLabel
                                          size="sm"
                                          htmlFor="account-type"
                                        >
                                          Account Type
                                        </ListboxLabel>
                                        <ListboxContent>
                                          <ListboxButton
                                            placeholder="Select"
                                            isInvalid={hookFormHasError({
                                              errors: _methods.formState.errors,
                                              name: "accountType",
                                            })}
                                          />
                                          <ListboxOptions>
                                            {["Checking", "Savings"].map(
                                              (option) => (
                                                <ListboxOption
                                                  key={option}
                                                  value={option}
                                                >
                                                  {option}
                                                </ListboxOption>
                                              )
                                            )}
                                          </ListboxOptions>
                                        </ListboxContent>

                                        <HookFormErrorMessage
                                          errors={_methods.formState.errors}
                                          name="accountType"
                                          render={({ message }) => (
                                            <ErrorMessage className="mt-1.5">
                                              {message}
                                            </ErrorMessage>
                                          )}
                                        />
                                      </Listbox>
                                    )}
                                  />

                                  <div className="space-y-1.5">
                                    <Label
                                      size="sm"
                                      htmlFor="account-holder-name"
                                    >
                                      Account Holder Name
                                    </Label>

                                    <Input
                                      id="account-holder-name"
                                      type="text"
                                      placeholder="John Doe"
                                      {..._methods.register(
                                        "accountHolderName"
                                      )}
                                      isInvalid={hookFormHasError({
                                        errors: _methods.formState.errors,
                                        name: "accountHolderName",
                                      })}
                                    />

                                    <HookFormErrorMessage
                                      errors={_methods.formState.errors}
                                      name="accountHolderName"
                                      render={({ message }) => (
                                        <ErrorMessage className="mt-1.5">
                                          {message}
                                        </ErrorMessage>
                                      )}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label
                                      size="sm"
                                      htmlFor="bank-routing-number"
                                    >
                                      Bank Routing Number
                                    </Label>
                                    <Input
                                      id="bank-routing-number"
                                      type="text"
                                      placeholder="xxxx-xxxx-xx"
                                      {..._methods.register(
                                        "bankRoutingNumber"
                                      )}
                                      isInvalid={hookFormHasError({
                                        errors: _methods.formState.errors,
                                        name: "bankRoutingNumber",
                                      })}
                                    />
                                    <HookFormErrorMessage
                                      errors={_methods.formState.errors}
                                      name="bankRoutingNumber"
                                      render={({ message }) => (
                                        <ErrorMessage className="mt-1.5">
                                          {message}
                                        </ErrorMessage>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-x-3">
                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="account-number">
                                        Account Number
                                      </Label>
                                      <Input
                                        id="account-number"
                                        type="text"
                                        placeholder="Up to 17 digits"
                                        {..._methods.register("accountNumber")}
                                        isInvalid={hookFormHasError({
                                          errors: _methods.formState.errors,
                                          name: "accountNumber",
                                        })}
                                      />

                                      <HookFormErrorMessage
                                        errors={_methods.formState.errors}
                                        name="accountNumber"
                                        render={({ message }) => (
                                          <ErrorMessage className="mt-1.5">
                                            {message}
                                          </ErrorMessage>
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label
                                        size="sm"
                                        htmlFor="re-enter-account-number"
                                      >
                                        Re-Enter Account Number
                                      </Label>

                                      <Input
                                        id="re-enter-account-number"
                                        type="text"
                                        placeholder="Up to 17 digits"
                                        {..._methods.register(
                                          "confirmAccountNumber"
                                        )}
                                        isInvalid={hookFormHasError({
                                          errors: _methods.formState.errors,
                                          name: "confirmAccountNumber",
                                        })}
                                      />

                                      <HookFormErrorMessage
                                        errors={_methods.formState.errors}
                                        name="confirmAccountNumber"
                                        render={({ message }) => (
                                          <ErrorMessage className="mt-1.5">
                                            {message}
                                          </ErrorMessage>
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-[22px] flex items-center gap-x-3">
                                  <Controller
                                    control={_methods.control}
                                    name="saveDefaultPaymentMethod"
                                    render={({
                                      field: { onChange, value, ...field },
                                    }) => (
                                      <Checkbox
                                        size="md"
                                        id="save-default-payment-method"
                                        checked={value}
                                        onCheckedChange={onChange}
                                        {...field}
                                      />
                                    )}
                                  />

                                  <Label
                                    size="sm"
                                    htmlFor="save-default-payment-method"
                                  >
                                    Save as default payment method
                                  </Label>
                                </div>

                                <div className="flex mt-6 relative pt-4 before:content-[''] before:absolute before:-inset-x-6 before:top-0 before:h-px before:bg-gray-200 justify-end">
                                  <div className="flex-auto flex items-center gap-x-[3px]">
                                    <span className="text-xs font-light inline-block text-dark-blue-400">
                                      By adding your credit / debit card, you
                                      agree to Marketeq’s
                                    </span>{" "}
                                    <Button variant="link">
                                      Terms & Conditions
                                    </Button>
                                  </div>
                                  <div className="flex items-center gap-x-3">
                                    <Button
                                      type="button"
                                      variant="outlined"
                                      visual="gray"
                                    >
                                      Cancel
                                    </Button>
                                    <Button>Save account</Button>
                                  </div>
                                </div>
                              </form>
                            </>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isAddCreditOrDebitOpen}
                    onOpenChange={setIsAddCreditOrDebitOpen}
                  >
                    <DialogContent className="max-w-[743px] p-0">
                      {" "}
                      <div className="p-3 border-gray-200 border-b flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <DialogClose asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="md"
                              className="text-dark-blue-400"
                            >
                              <ArrowLeft className="size-5" />
                            </IconButton>
                          </DialogClose>
                          <div className="space-y-1">
                            <h2 className="text-lg leading-7 text-dark-blue-400 font-semibold">
                              Select payment method
                            </h2>
                            <div className="flex items-center gap-x-1">
                              <Lock className="size-4" />{" "}
                              <span className="text-xs inline-block text-gray-500 leading-none">
                                Your payment is secure. Your card details will
                                not be shared.
                              </span>
                            </div>
                          </div>
                        </div>
                        <DialogClose asChild>
                          <IconButton
                            className="text-gray-500"
                            variant="ghost"
                            visual="gray"
                            size="md"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      </div>
                      <ScrollArea
                        className="h-[600px]"
                        scrollBar={<ScrollBar className="w-4 p-1" />}
                      >
                        <div className="p-6 pb-3">
                          <form onSubmit={_form.handleSubmit(_handleOnSubmit)}>
                            {selectedPayMethod === "item-0" && (
                              <div>
                                <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                                  Add your credit / debit card
                                </h1>
                                <p className="mt-3 text-gray-500 text-xs leading-none flex items-center gap-x-1">
                                  <Lock className="size-4" /> Your payment is
                                  secure. Your card details will not be shared.
                                </p>

                                <div className="mt-6 space-y-3">
                                  <div className="space-y-1.5">
                                    <Label size="sm" htmlFor="card-number">
                                      Card number
                                    </Label>

                                    <Controller
                                      control={_form.control}
                                      name="cardNumber"
                                      render={({
                                        field: { onChange, ...field },
                                      }) => (
                                        <CreditCardInput
                                          id="card-number"
                                          {...field}
                                          onFocus={() =>
                                            setFocusedField("card-number")
                                          }
                                          onBlur={() =>
                                            setFocusedField(undefined)
                                          }
                                          onValueChange={onChange}
                                          isInvalid={hookFormHasError({
                                            errors: _form.formState.errors,
                                            name: "cardNumber",
                                          })}
                                        />
                                      )}
                                    />

                                    <HookFormErrorMessage
                                      errors={_form.formState.errors}
                                      name="cardNumber"
                                      render={({ message }) => (
                                        <ErrorMessage>{message}</ErrorMessage>
                                      )}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label size="sm" htmlFor="name-on-card">
                                      Name on card
                                    </Label>

                                    <Input
                                      id="name-on-card"
                                      {..._form.register("cardName")}
                                      isInvalid={hookFormHasError({
                                        errors: _form.formState.errors,
                                        name: "cardName",
                                      })}
                                      onFocus={() =>
                                        setFocusedField("card-name")
                                      }
                                      onBlur={() => setFocusedField(undefined)}
                                      type="text"
                                      placeholder="John Doe"
                                    />

                                    <HookFormErrorMessage
                                      errors={_form.formState.errors}
                                      name="cardName"
                                      render={({ message }) => (
                                        <ErrorMessage>{message}</ErrorMessage>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-x-3">
                                    <div className="space-y-1.5">
                                      <Label
                                        size="sm"
                                        htmlFor="expiration-date"
                                      >
                                        Expiration Date
                                      </Label>
                                      <Controller
                                        control={_form.control}
                                        name="expirationDate"
                                        render={({
                                          field: { onChange, ...field },
                                        }) => (
                                          <Input
                                            id="expiration-date"
                                            type="text"
                                            placeholder="MM/YY"
                                            {...field}
                                            onChange={(event) => {
                                              const sanitized =
                                                event.target.value.replace(
                                                  /[^\d]/g,
                                                  ""
                                                )
                                              if (sanitized.length >= 2) {
                                                const value = `${sanitized.slice(
                                                  0,
                                                  2
                                                )}/${sanitized.slice(2, 4)}`
                                                onChange(value)
                                              } else onChange(sanitized)
                                            }}
                                            isInvalid={hookFormHasError({
                                              errors: _form.formState.errors,
                                              name: "expirationDate",
                                            })}
                                            onFocus={() =>
                                              setFocusedField("expiration-date")
                                            }
                                            onBlur={() =>
                                              setFocusedField(undefined)
                                            }
                                          />
                                        )}
                                      />
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="expirationDate"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="cvv-cvc">
                                        CVV / CVC
                                      </Label>
                                      <InputGroup>
                                        <Controller
                                          control={_form.control}
                                          name="cvvOrCvc"
                                          render={({
                                            field: { onChange, ...field },
                                          }) => (
                                            <Input
                                              id="cvv-cvc"
                                              type="text"
                                              placeholder="3 or 4 digits"
                                              {...field}
                                              onChange={(event) => {
                                                const {
                                                  target: { value },
                                                } = event
                                                value.length <= 4 &&
                                                  onChange(value)
                                              }}
                                              isInvalid={hookFormHasError({
                                                errors: _form.formState.errors,
                                                name: "cvvOrCvc",
                                              })}
                                              onFocus={() =>
                                                setFocusedField("cvv-cvc")
                                              }
                                              onBlur={() =>
                                                setFocusedField(undefined)
                                              }
                                            />
                                          )}
                                        />
                                        <InputRightElement>
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger className="focus-visible:outline-none">
                                                <HelpCircle className="text-gray-500 h-4 w-4" />
                                              </TooltipTrigger>
                                              <TooltipContent
                                                className="max-w-[139px]"
                                                visual="gray"
                                              >
                                                3-4 digit code on the back of
                                                your card
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </InputRightElement>
                                      </InputGroup>
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="cvvOrCvc"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-[22px] flex items-center gap-x-3">
                                  <Controller
                                    control={_form.control}
                                    name="saveDefaultPaymentMethod"
                                    render={({
                                      field: { onChange, value, ...field },
                                    }) => (
                                      <Checkbox
                                        size="md"
                                        id="save-default-payment-method"
                                        onCheckedChange={onChange}
                                        checked={value}
                                        {...field}
                                      />
                                    )}
                                  />
                                  <Label
                                    size="sm"
                                    htmlFor="save-default-payment-method"
                                  >
                                    Save as default payment method
                                  </Label>
                                </div>
                              </div>
                            )}

                            {selectedPayMethod === "item-0" &&
                              layout === "form" && (
                                <div className="mt-[50px]">
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                                      Billing Address
                                    </h3>

                                    {Boolean(billingAddresses?.length) && (
                                      <Button
                                        onClick={() => setLayout("selection")}
                                        className="text-xs underline"
                                        variant="link"
                                        type="button"
                                      >
                                        Use a saved address
                                      </Button>
                                    )}
                                  </div>

                                  <div className="mt-6 space-y-3">
                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="full-name">
                                        Full Name
                                      </Label>
                                      <Input
                                        placeholder="John Doe"
                                        id="full-name"
                                        {..._form.register("fullName")}
                                        isInvalid={hookFormHasError({
                                          errors: _form.formState.errors,
                                          name: "fullName",
                                        })}
                                      />
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="fullName"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="address-line-1">
                                        Address Line 1
                                      </Label>
                                      <Input
                                        placeholder="Street Address or P.O. Box"
                                        id="address-line-1"
                                        {..._form.register("addressLine1")}
                                        isInvalid={hookFormHasError({
                                          errors: _form.formState.errors,
                                          name: "addressLine1",
                                        })}
                                      />
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="addressLine1"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="address-line-2">
                                        Address Line 2
                                      </Label>
                                      <Input
                                        placeholder="Apt, Suite, Unit, or Building #"
                                        id="address-line-2"
                                        {..._form.register("addressLine2")}
                                        isInvalid={hookFormHasError({
                                          errors: _form.formState.errors,
                                          name: "addressLine2",
                                        })}
                                      />
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="addressLine2"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>

                                    <div className="gap-x-3 grid grid-cols-3">
                                      <div className="space-y-1.5">
                                        <Label size="sm" htmlFor="city">
                                          City
                                        </Label>
                                        <Input
                                          placeholder="Marketown"
                                          id="city"
                                          {..._form.register("city")}
                                          isInvalid={hookFormHasError({
                                            errors: _form.formState.errors,
                                            name: "city",
                                          })}
                                        />
                                        <HookFormErrorMessage
                                          errors={_form.formState.errors}
                                          name="city"
                                          render={({ message }) => (
                                            <ErrorMessage>
                                              {message}
                                            </ErrorMessage>
                                          )}
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label size="sm" htmlFor="state">
                                          State
                                        </Label>
                                        <Controller
                                          control={_form.control}
                                          name="state"
                                          render={({ field }) => (
                                            <Listbox {...field}>
                                              <ListboxButton placeholder="Select" />
                                              <ListboxOptions>
                                                {[
                                                  "New York",
                                                  "Florida",
                                                  "Alaska",
                                                  "Arizona",
                                                  "Georgia",
                                                  "Hawaii",
                                                ].map((state) => (
                                                  <ListboxOption
                                                    key={state}
                                                    value={state}
                                                  >
                                                    {state}
                                                  </ListboxOption>
                                                ))}
                                              </ListboxOptions>
                                            </Listbox>
                                          )}
                                        />
                                        <HookFormErrorMessage
                                          errors={_form.formState.errors}
                                          name="state"
                                          render={({ message }) => (
                                            <ErrorMessage>
                                              {message}
                                            </ErrorMessage>
                                          )}
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label size="sm" htmlFor="zipcode">
                                          Zipcode
                                        </Label>
                                        <Input
                                          placeholder="12345"
                                          id="zipcode"
                                          {..._form.register("zipcode")}
                                          isInvalid={hookFormHasError({
                                            errors: _form.formState.errors,
                                            name: "zipcode",
                                          })}
                                        />
                                        <HookFormErrorMessage
                                          errors={_form.formState.errors}
                                          name="zipcode"
                                          render={({ message }) => (
                                            <ErrorMessage>
                                              {message}
                                            </ErrorMessage>
                                          )}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label size="sm" htmlFor="phone-number">
                                        Phone number
                                      </Label>
                                      <Controller
                                        control={_form.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                          <PhoneNumberInput {...field} />
                                        )}
                                      />
                                      <HookFormErrorMessage
                                        errors={_form.formState.errors}
                                        name="phoneNumber"
                                        render={({ message }) => (
                                          <ErrorMessage>{message}</ErrorMessage>
                                        )}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex mt-6 relative pt-4 before:content-[''] before:absolute before:-inset-x-6 before:top-0 before:h-px before:bg-gray-200 justify-end">
                                    <div className="flex-auto flex items-center gap-x-[3px]">
                                      <span className="text-xs font-light inline-block text-dark-blue-400">
                                        By adding your credit / debit card, you
                                        agree to Marketeq’s
                                      </span>{" "}
                                      <Button variant="link">
                                        Terms & Conditions
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-x-3">
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        visual="gray"
                                      >
                                        Cancel
                                      </Button>
                                      <Button>Save account</Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </form>

                          {selectedPayMethod === "item-0" &&
                            layout === "selection" && (
                              <div className="mt-[50px]">
                                <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                                  Billing Address
                                </h3>

                                <p className="mt-3 text-xs leading-none text-gray-500">
                                  Please choose a billing address from your
                                  address book below, or{" "}
                                  <Button
                                    className="text-xs leading-none"
                                    variant="link"
                                    type="button"
                                    onClick={() => setLayout("form")}
                                  >
                                    add a new billing address
                                  </Button>
                                </p>

                                <Controller
                                  name="billingAddressCreditOrDebtInfo"
                                  control={control}
                                  render={({ field: { onChange } }) => {
                                    const selectedBillingAddress =
                                      (billingAddresses?.length || 0) - 1

                                    return (
                                      <RadioGroup
                                        className="mt-6"
                                        defaultValue={`${selectedBillingAddress}`}
                                        onValueChange={(value) => {
                                          const billingAddress =
                                            billingAddresses?.[parseInt(value)]
                                          onChange(billingAddress)
                                        }}
                                      >
                                        {billingAddresses?.map(
                                          (billingAddress, index) => (
                                            <RadioGroupItemSelector
                                              className="min-h-[42px] bg-transparent border-0 hover:ring-2 hover:ring-gray-300 data-[state=checked]:ring-2 focus:ring-2 focus:ring-primary-400 data-[state=checked]:ring-primary-400"
                                              value={`${index}`}
                                              key={index}
                                            >
                                              <Label
                                                className="font-normal"
                                                size="sm"
                                              >
                                                <span className="font-bold">
                                                  {billingAddress.fullName}
                                                </span>
                                                , {billingAddress.addressLine1},{" "}
                                                {billingAddress.phoneNumber}
                                              </Label>
                                            </RadioGroupItemSelector>
                                          )
                                        )}
                                      </RadioGroup>
                                    )
                                  }}
                                />

                                <div className="mt-6 flex items-center gap-x-3">
                                  <Button
                                    className="text-xs leading-6 text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                                    onClick={onUseAddress}
                                    disabled={!billingAddressCreditOrDebtInfo}
                                  >
                                    Use This Address
                                  </Button>
                                  <Button
                                    className="text-xs leading-6"
                                    variant="outlined"
                                    visual="gray"
                                    type="button"
                                    onClick={() => setLayout("form")}
                                  >
                                    <Plus className="size-[15px]" />
                                    New Address
                                  </Button>
                                </div>
                              </div>
                            )}

                          {selectedPayMethod === "item-0" &&
                            layout === "default" && (
                              <>
                                <div className="mt-[50px]">
                                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                                    Billing Address
                                  </h3>

                                  <div className="mt-6 p-6 rounded-[7px] pt-[35px] border-2 flex items-center justify-between border-gray-200 bg-white">
                                    <div className="space-y-1">
                                      <h3 className="text-base font-semibold leading-5 text-dark-blue-400">
                                        {
                                          billingAddressCreditOrDebtInfo.fullName
                                        }
                                      </h3>

                                      <ul className="max-w-[211px]">
                                        <li className="text-base leading-5 text-dark-blue-400">
                                          {
                                            billingAddressCreditOrDebtInfo.addressLine1
                                          }
                                        </li>
                                        <li className="text-base leading-5 text-dark-blue-400">
                                          {phoneUtil.formatOutOfCountryCallingNumber(
                                            phoneUtil.parseAndKeepRawInput(
                                              billingAddressCreditOrDebtInfo.phoneNumber
                                            )
                                          )}
                                        </li>
                                      </ul>
                                    </div>

                                    <Button
                                      visual="gray"
                                      variant="outlined"
                                      onClick={() => setLayout("selection")}
                                    >
                                      Change Address
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex mt-[50px] justify-end">
                                  <Button
                                    className="text-primary-500 bg-primary-50 hover:bg-primary-500 hover:text-white"
                                    onClick={() => isValid && setIsOpened(true)}
                                    disabled={!isValid}
                                  >
                                    Save Card
                                  </Button>
                                </div>
                              </>
                            )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-6">
                  <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">
                    Recurring Payments
                  </h1>

                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-x-6 mt-5">
                      <Listbox
                        className="max-w-[265px]"
                        value={paymentFrequency}
                        onChange={setPaymentFrequency}
                      >
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
                          placeholder="Select Payment Frequency"
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
                                    <span className="font-bold">
                                      {option.value}
                                    </span>
                                  </span>
                                </ListboxOption>
                              ))}
                            </>
                          )}
                        </ListboxOptions>
                      </Listbox>

                      {paymentFrequency && (
                        <div className="max-w-[194px]">
                          {paymentFrequency.label ===
                          "Pay Remaining Balance" ? (
                            <span className="text-xs inline-block font-medium text-gray-500">
                              Your remaining amount will be charged on{" "}
                              <span className="font-bold">July 9th, 2025</span>
                            </span>
                          ) : (
                            <span className="text-xs inline-block font-medium text-gray-500">
                              {paymentFrequency.meta}{" "}
                              {paymentFrequency.label.toLowerCase()} payments,
                              starting from{" "}
                              <span className="font-bold">July 9th, 2025</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {Number(secondBlockPaymentMethods?.length || 0) > 0 && (
                      <>
                        {Number(secondBlockPaymentMethods?.length || 0) > 1 ? (
                          <div className="flex items-center gap-x-2">
                            <Label size="sm">Auto Split</Label>
                            <Switch />
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            onClick={() => {
                              setIsSelectPaymentMethodOpen(true)
                              setOpenedBlock("second")
                              setSelectedPayMethod("")
                            }}
                          >
                            <DivideSquare className="size-[15px]" /> Split
                            Payment
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {Number(secondBlockPaymentMethods?.length || 0) > 0 && (
                    <div className="space-y-5 mt-5">
                      <div className="flex-auto space-y-2.5">
                        {secondBlockPaymentMethods?.map(
                          (paymentMethod, index) => {
                            const action = () => {
                              const item = secondBlockPaymentMethods[index]
                              setSecondBlockPaymentMethods(
                                secondBlockPaymentMethods.filter(
                                  (_, i) => i !== index
                                )
                              )
                              setFirstBlockPaymentMethods((prev) =>
                                prev ? [...prev, item] : [item]
                              )
                            }

                            return (
                              <React.Fragment key={index}>
                                {paymentMethod.method === "BANK_ACCOUNT" ? (
                                  <BankCardSelected
                                    accountType={paymentMethod.data.accountType}
                                    openedBlock="second"
                                    accountNumber={
                                      paymentMethod.data.accountNumber
                                    }
                                    defaultAmount={5000}
                                    action={action}
                                    onRemove={() => handleRm(index)}
                                  />
                                ) : paymentMethod.method ===
                                  "CREDIT_DEBIT_CARD" ? (
                                  <CreditDebitSelected
                                    cardNumber={paymentMethod.data.cardNumber}
                                    defaultAmount={5000}
                                    openedBlock="second"
                                    action={action}
                                    onRemove={() => handleRm(index)}
                                  />
                                ) : null}
                              </React.Fragment>
                            )
                          }
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          variant="link"
                          visual="gray"
                          onClick={() => {
                            setIsSelectPaymentMethodOpen(true)
                            setOpenedBlock("second")
                            setSelectedPayMethod("")
                          }}
                        >
                          <Plus className="size-[15px]" />
                          Add Payment Method
                        </Button>

                        <div className="flex items-center gap-x-2">
                          <h3 className="text-xs font-light text-dark-blue-400">
                            Total monthly payment
                          </h3>
                          <h1 className="text-base font-bold text-dark-blue-400">
                            $6,000
                          </h1>
                        </div>
                      </div>
                    </div>
                  )}

                  {Number(secondBlockPaymentMethods?.length || 0) < 1 && (
                    <div className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition duration-300 flex items-center justify-center gap-x-2">
                      <Button
                        className="hover:no-underline"
                        variant="link"
                        visual="gray"
                        onClick={() => {
                          setOpenedBlock("second")
                          setIsSelectPaymentMethodOpen(true)
                          setSelectedPayMethod("")
                        }}
                      >
                        <Plus className="size-[15px]" /> Add Payment Method
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

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
                  Marketeq Client Portal - Redesigning and Optimizing Website
                  for Enhanced User Experience.
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

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {focusedField === "cvv-cvc" ? (
                  <motion.div
                    key="back"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <CreditCardCvvOrCvc />
                  </motion.div>
                ) : (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {focusedField === "card-number" ? (
                        <motion.div
                          key="card-number"
                          variants={fadeVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <CreditCardCardNumber />
                        </motion.div>
                      ) : focusedField === "card-name" ? (
                        <motion.div
                          key="card-name"
                          variants={fadeVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <CreditCardName />
                        </motion.div>
                      ) : focusedField === "expiration-date" ? (
                        <motion.div
                          key="expiration-date"
                          variants={fadeVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <CreditCardExpirationDate />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const WireTransfer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={47}
    height={32}
    viewBox="0 0 47 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#a)">
      <rect y={0.5} width={46.5} height={31} rx={4} fill="#006E90" />
      <path
        d="M8.73 21.53v-3.236h-.976v-1.001h3.14v1.001h-.976v3.235zm2.744 0v-4.237h1.241q.729 0 1.017.065.287.064.495.219.235.173.362.442.126.27.126.593 0 .492-.248.8-.25.309-.725.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.235h.22q.384 0 .561-.127t.178-.4q0-.317-.166-.452-.165-.135-.555-.135h-.238z"
        fill="#fff"
      />
      <path
        d="m14.871 21.529 1.503-4.236h1.488l1.506 4.236h-1.181l-.22-.758h-1.688l-.226.758zm1.664-1.583h1.181l-.443-1.398a3 3 0 0 1-.057-.205l-.092-.364-.076.298q-.036.136-.076.271zm3.25 1.583v-4.236h1.146l1.645 2.178q.048.067.157.268.108.201.24.48a9 9 0 0 1-.053-.47 5 5 0 0 1-.016-.364v-2.092h1.14v4.236h-1.14l-1.646-2.188a2.4 2.4 0 0 1-.16-.267 10 10 0 0 1-.236-.473q.036.265.052.471.015.183.017.365v2.092zm5.387-1.369q.264.292.522.437t.514.145a.6.6 0 0 0 .39-.125.39.39 0 0 0 .154-.315q0-.211-.132-.325-.133-.115-.6-.236-.64-.168-.905-.437-.264-.27-.265-.738 0-.607.418-.991.419-.384 1.085-.384.36 0 .683.094.324.095.612.285l-.372.83a1.6 1.6 0 0 0-.415-.252 1.1 1.1 0 0 0-.421-.086.57.57 0 0 0-.349.1.3.3 0 0 0-.134.256q0 .159.118.255.117.095.454.182l.053.015q.727.19.956.42.154.155.235.374t.08.484q0 .675-.455 1.084-.456.41-1.214.41-.455 0-.83-.15-.373-.151-.718-.472zm3.348 1.369v-4.236h2.67v.928h-1.513v.735h1.426v.91h-1.426v1.663zm3.315 0v-4.236h2.67v.928h-1.512v.735h1.426v.91h-1.426v.714h1.512v.949zm3.456 0v-4.236h1.24q.73 0 1.017.065.288.065.496.218.235.174.361.443.127.27.127.593 0 .492-.249.8-.248.308-.724.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.234h.22q.384 0 .56-.127.178-.127.178-.4 0-.318-.165-.453-.165-.134-.555-.134h-.238zm-15.031-8.893.79 2.91q.056.196.104.409.046.213.099.489.065-.326.11-.537.045-.21.087-.362l.74-2.909h1.732l-1.78 6.12h-1.59l-.778-2.613a11 11 0 0 1-.142-.54l-.069-.28-.06.247q-.099.406-.15.573l-.765 2.612h-1.596l-1.775-6.119h1.733l.722 2.926q.052.226.1.451.05.226.093.464a26 26 0 0 1 .22-.915l.79-2.926zm4.299 6.12v-6.12h1.732v6.12zm3.116 0v-6.12h1.793q1.053 0 1.468.094t.716.316q.339.25.522.64.183.388.183.856 0 .711-.36 1.156-.358.446-1.046.591l1.715 2.466h-1.938l-1.445-2.395v2.395zm1.608-3.227h.318q.555 0 .81-.184.256-.184.256-.577 0-.46-.238-.654-.24-.194-.802-.194h-.344zm4.037 3.226v-6.119h3.856v1.342h-2.184v1.062h2.06v1.312h-2.06v1.032h2.184v1.371z"
        fill="#fff"
      />
      <path
        d="M7.807 10.36h7.852v1.211H7.807zm0 2.35h7.852v1.212H7.807zm0 2.567h7.852v1.212H7.807z"
        fill="#41E700"
      />
    </g>
    <defs>
      <clipPath id="a">
        <rect y={0.5} width={46.5} height={31} rx={4} fill="#fff" />
      </clipPath>
    </defs>
  </svg>
)

const Bank = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={17}
    height={16}
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.5 14.666h12M4.5 12V7.335M7.166 12V7.335M9.834 12V7.335M12.5 12V7.335m-4-6.001 5.333 3.333H3.166z"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const NewWindow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={75}
    height={75}
    viewBox="0 0 75 75"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M50.062 18c.65 0 1.293.208 1.818.606l.217.182.2.205c.442.5.703 1.147.703 1.838v6.653l-.001.008.001.008v9a1.5 1.5 0 0 1-3 0v-7.516L11 29v25.084c0 .26.1.499.263.667.16.166.366.25.57.25h37.334c.204 0 .41-.084.57-.25a.96.96 0 0 0 .263-.667V46a1.5 1.5 0 0 1 3 0v8.083a3.96 3.96 0 0 1-1.105 2.751A3.8 3.8 0 0 1 49.168 58H11.833a3.8 3.8 0 0 1-2.729-1.166A3.96 3.96 0 0 1 8 54.083V20.847c0-.79.34-1.522.903-2.042l.217-.183a3 3 0 0 1 1.819-.605zM14 22.5a1.5 1.5 0 1 0 0 2.999 1.5 1.5 0 0 0 0-2.999m4.5 0a1.5 1.5 0 1 0 0 2.999 1.5 1.5 0 0 0 0-2.999m4.5 0a1.5 1.5 0 1 0 0 2.999 1.5 1.5 0 0 0 0-2.999"
      fill="#D0D5DD"
    />
    <path
      d="M57.894 32.894a1.5 1.5 0 0 1 2.12 0l7.547 7.546a1.5 1.5 0 0 1 0 2.12l-7.546 7.546a1.5 1.5 0 1 1-2.121-2.12L62.879 43H44.5a1.5 1.5 0 0 1 0-3h18.379l-4.985-4.985a1.5 1.5 0 0 1 0-2.121"
      fill="#D0D5DD"
    />
  </svg>
)

const MasterCard01 = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={62}
      height={37}
      viewBox="0 0 62 37"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M43.35 36.57c10.217 0 18.5-8.121 18.5-18.138S53.566.295 43.35.295c-4.58 0-8.77 1.63-12 4.333a18.65 18.65 0 0 0-12-4.333C9.131.295.85 8.415.85 18.432S9.132 36.57 19.35 36.57c4.579 0 8.77-1.63 12-4.333a18.65 18.65 0 0 0 12 4.333"
        fill="#98A2B3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M31.35 32.236c3.977-3.326 6.5-8.276 6.5-13.804 0-5.527-2.523-10.477-6.5-13.804a18.65 18.65 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.58 0-8.77-1.63-12-4.333"
        fill="#EAECF0"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M31.35 32.237c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.5 8.277-6.5 13.804s2.523 10.478 6.5 13.804"
        fill="#D0D5DD"
      />
    </svg>
  )
}

const CreditCardCardNumber = (props: React.SVGProps<SVGSVGElement>) => {
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
        <rect
          x={4.184}
          y={3}
          width={305}
          height={181.955}
          rx={11.402}
          fill="url(#b)"
        />
        <rect
          x={5.184}
          y={4}
          width={303}
          height={179.955}
          rx={10.402}
          stroke="#EAECF0"
          strokeWidth={2}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M270.35 164.569c10.217 0 18.499-8.12 18.499-18.137s-8.282-18.137-18.499-18.137c-4.58 0-8.77 1.631-12.001 4.333a18.64 18.64 0 0 0-11.999-4.333c-10.218 0-18.5 8.12-18.5 18.137s8.282 18.137 18.5 18.137c4.579 0 8.769-1.631 12-4.333a18.64 18.64 0 0 0 12 4.333"
          fill="#98A2B3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.35 160.236c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.499-13.804a18.64 18.64 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.579 0-8.77-1.631-12-4.333"
          fill="#EAECF0"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.349 160.237c3.978-3.326 6.5-8.276 6.5-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.499 8.277-6.499 13.804s2.522 10.478 6.499 13.804"
          fill="#D0D5DD"
        />
        <g clipPath="url(#c)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M283.113 23.478c.6-.334 1.359-.12 1.694.476a24 24 0 0 1 3.078 11.779c0 4.133-1.061 8.195-3.078 11.779a1.25 1.25 0 0 1-1.694.475 1.234 1.234 0 0 1-.478-1.684 21.57 21.57 0 0 0 2.76-10.57c0-3.713-.953-7.359-2.76-10.57a1.234 1.234 0 0 1 .478-1.685m-4.793 2.458a1.25 1.25 0 0 1 1.695.476 19 19 0 0 1 2.435 9.32c0 3.27-.839 6.485-2.435 9.321a1.25 1.25 0 0 1-1.695.476 1.234 1.234 0 0 1-.478-1.685 16.54 16.54 0 0 0 2.118-8.111c0-2.85-.731-5.648-2.118-8.112a1.234 1.234 0 0 1 .478-1.684m-4.57 2.255a1.25 1.25 0 0 1 1.692.483 14.3 14.3 0 0 1 1.802 6.97c0 2.443-.62 4.846-1.802 6.968a1.25 1.25 0 0 1-1.692.484 1.234 1.234 0 0 1-.486-1.683 11.9 11.9 0 0 0 1.491-5.77c0-2.028-.516-4.018-1.491-5.77a1.234 1.234 0 0 1 .486-1.682m-4.643 2.477a1.25 1.25 0 0 1 1.72.374 8.66 8.66 0 0 1 1.385 4.69 8.66 8.66 0 0 1-1.385 4.691 1.25 1.25 0 0 1-1.72.375 1.233 1.233 0 0 1-.377-1.71 6.2 6.2 0 0 0 .993-3.355 6.2 6.2 0 0 0-.993-3.355 1.233 1.233 0 0 1 .377-1.71"
            fill="#667085"
          />
        </g>
        <rect
          x={20.295}
          y={152.029}
          width={185.868}
          height={17.603}
          rx={2.375}
          fill="#fff"
          fillOpacity={0.01}
        />
        <g filter="url(#d)" fill="#667085">
          <path d="M26.204 157.819h-.741q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h3.117q.781 0 1.424.27.641.27 1.098.776.457.5.708 1.225.252.723.252 1.638t-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263h-3.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.573q.338-.381.523-.941a4.2 4.2 0 0 0 .185-1.303q0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm5.612-3.008q0-.915.252-1.658.251-.75.708-1.283a3.1 3.1 0 0 1 1.099-.823q.642-.29 1.423-.29.78 0 1.423.29a3.1 3.1 0 0 1 1.099.823q.456.533.708 1.283.25.743.251 1.658 0 .915-.251 1.665a3.8 3.8 0 0 1-.708 1.277q-.457.526-1.1.816-.641.29-1.422.29t-1.423-.29a3.15 3.15 0 0 1-1.099-.816 3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.18.565.496.967.318.394.768.612.45.21 1 .211.55 0 1-.211.45-.218.767-.612.318-.402.49-.967.178-.573.178-1.284 0-.71-.178-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.613 2.3 2.3 0 0 0-1-.217q-.548 0-.999.217-.45.211-.767.613a3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m8.704-3.014h-.51q-.225 0-.325-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.1.348q-.092.099-.317.099h-.377v6.673q0 .172-.12.277-.119.112-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm10.244 6.022q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.21q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.37l2.191-6.022h-1.237q-.225 0-.325-.099-.093-.098-.093-.348t.093-.349q.099-.099.325-.099h2.429q.264 0 .423.099.165.099.245.329l2.337 6.489h.403q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.343q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.894l-.543-1.566h-3.21l-.55 1.566zm.06-2.461h2.595l-1.231-3.561h-.126zm8.206-3.561h-1.072q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h3.667q.225 0 .318.099.1.099.1.349t-.1.348q-.093.099-.318.099h-1.601v6.022h3.276v-2.165q0-.231.106-.329.113-.099.39-.099.279 0 .384.099.113.098.113.329v2.612q0 .25-.1.349-.092.099-.317.099h-5.918q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.073zm8.611 0h-.741q-.225 0-.325-.099-.092-.098-.092-.348t.092-.349q.1-.099.325-.099h3.117q.78 0 1.423.27.642.27 1.1.776.456.5.707 1.225.252.723.252 1.638t-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263H70.17q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.573q.338-.381.523-.941.185-.565.185-1.303 0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm15.791-6.022h-.874q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.1-.099.325-.099h5.983q.225 0 .318.099.099.099.099.349v1.737q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.099-.106-.329v-1.29h-3.54v2.573h1.655v-.599q0-.23.106-.329.113-.098.39-.098.279 0 .384.098.113.1.113.329v2.093q0 .23-.113.329-.105.099-.384.099-.278 0-.39-.099-.106-.099-.106-.329v-.599H89.92v2.554h1.536q.225 0 .317.099.1.098.1.348t-.1.349q-.093.099-.317.099h-3.403q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.1-.099.325-.099h.873zm9.14 0h-1.072q-.225 0-.325-.099-.092-.098-.092-.348t.093-.349q.099-.099.324-.099h3.667q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-1.602v6.022h3.276v-2.165q0-.231.106-.329.112-.099.391-.099.278 0 .384.099.112.098.112.329v2.612q0 .25-.099.349-.093.099-.318.099h-5.917q-.225 0-.325-.099-.092-.099-.092-.349t.093-.348q.099-.099.324-.099h1.072zm10.49 0h-1.694q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h4.382q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-1.695v6.022h1.827q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.647q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.827zm6.764 0h-.51q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.099.348q-.093.099-.318.099h-.377v6.673q0 .172-.12.277-.119.112-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm14.581 6.2q-.629.433-1.351.651-.72.21-1.482.211a3.4 3.4 0 0 1-1.417-.29 3.1 3.1 0 0 1-1.072-.816 3.8 3.8 0 0 1-.688-1.277 5.5 5.5 0 0 1-.239-1.665q0-.915.245-1.658.252-.75.702-1.283.456-.534 1.086-.823.629-.29 1.383-.29.642 0 1.118.217.477.211.801.593v-.382q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.1-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.576-.355 2.3 2.3 0 0 0-.827-.132 2.25 2.25 0 0 0-.986.217q-.45.211-.775.613a3 3 0 0 0-.496.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.171.565.476.967.312.394.748.612.444.21.98.211.662 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.138.23.112.401-.026.165-.198.29m3.335-6.2h-.477q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.079q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-.609v2.442h3.296v-2.442h-.609q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.078q.225 0 .318.099.099.099.099.349t-.099.348q-.093.099-.318.099h-.476v6.022h.476q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-2.078q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.609v-2.685h-3.296v2.685h.609q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.079q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.477zm23.489 6.2a4.8 4.8 0 0 1-1.35.651q-.722.21-1.483.211-.781 0-1.416-.29a3.05 3.05 0 0 1-1.073-.816 3.9 3.9 0 0 1-.688-1.277 5.5 5.5 0 0 1-.238-1.665q0-.915.244-1.658.252-.75.702-1.283.457-.534 1.086-.823.629-.29 1.383-.29.642 0 1.119.217.476.211.8.593v-.382q0-.23.106-.329.113-.099.391-.099.277 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.278 0-.391-.099-.106-.1-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.575-.355 2.4 2.4 0 0 0-.828-.132 2.25 2.25 0 0 0-.986.217 2.2 2.2 0 0 0-.774.613 3 3 0 0 0-.497.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.172.565.476.967.312.394.748.612.444.21.98.211.661 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.14.23.112.401-.026.165-.198.29m2.494-3.186q0-.915.252-1.658.252-.75.708-1.283.457-.534 1.099-.823.642-.29 1.423-.29t1.423.29 1.099.823q.456.533.708 1.283.252.743.252 1.658t-.252 1.665a3.8 3.8 0 0 1-.708 1.277 3.2 3.2 0 0 1-1.099.816q-.642.29-1.423.29t-1.423-.29a3.2 3.2 0 0 1-1.099-.816 3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.179.565.497.967.317.394.768.612.45.21.999.211.549 0 .999-.211.45-.218.768-.612.318-.402.49-.967.179-.573.179-1.284 0-.71-.179-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.613 2.3 2.3 0 0 0-.999-.217 2.3 2.3 0 0 0-.999.217 2.1 2.1 0 0 0-.768.613 3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m9.067-3.014h-.807q-.225 0-.325-.099-.092-.098-.092-.348t.092-.349q.1-.099.325-.099h3.349q.636 0 1.125.165.49.157.821.447.338.29.51.704.172.408.172.902 0 .381-.133.704a1.7 1.7 0 0 1-.364.573 2.3 2.3 0 0 1-.582.434 3 3 0 0 1-.755.27q.173.078.318.197t.278.264q.165.183.311.401.152.218.278.441.132.217.252.434.119.218.231.402.159.263.325.421.165.158.37.158h.126q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-.463a1 1 0 0 1-.57-.198q-.277-.204-.595-.717a10 10 0 0 1-.258-.447l-.252-.455a7 7 0 0 0-.529-.822 2 2 0 0 0-.358-.362 1.5 1.5 0 0 0-.39-.23 2 2 0 0 0-.457-.119 3.5 3.5 0 0 0-.549-.039h-.411v2.494h.861q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.661q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.807zm.993 0v2.633h1.344q.41 0 .741-.073.331-.072.563-.23.231-.157.357-.408a1.3 1.3 0 0 0 .126-.599q0-.639-.45-.981-.444-.342-1.271-.342zm9.762 0h-1.767v2.034q0 .23-.112.329-.107.099-.384.098-.279 0-.391-.098-.106-.1-.106-.329v-2.481q0-.25.093-.349.099-.099.324-.099h5.679q.225 0 .318.099.099.099.099.349v2.481q0 .23-.112.329-.107.099-.384.098-.279 0-.391-.098-.105-.1-.106-.329v-2.034h-1.767v6.022h1.562q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.562zm6.996 0h-.675q-.226 0-.325-.099-.093-.098-.092-.348 0-.25.092-.349.1-.099.325-.099h5.784q.226 0 .318.099.099.099.099.349v1.671q0 .23-.112.329-.107.099-.384.099-.278 0-.39-.099-.106-.099-.106-.329v-1.224h-3.541v2.442h1.654v-.599q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.099.112.329v2.093q0 .23-.112.329-.107.098-.384.098-.279 0-.391-.098-.106-.1-.106-.329v-.599h-1.654v2.685h3.673v-1.507q0-.23.106-.329.113-.099.39-.099.279 0 .384.099.113.099.113.329v1.954q0 .25-.099.349-.093.099-.318.099h-5.917q-.226 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.675zm13.336 6.022v-1.77q0-.231.106-.33.113-.098.39-.098.279 0 .384.098.113.099.113.33v2.217q0 .25-.099.349-.093.099-.318.099h-5.07q-.225 0-.325-.099-.092-.099-.092-.349a.4.4 0 0 1 .026-.158 1 1 0 0 1 .066-.125l4.362-6.186h-3.322v1.639q0 .23-.113.329-.106.099-.384.099t-.39-.099q-.106-.1-.106-.329v-2.086q0-.25.092-.349.1-.099.325-.099h4.871q.225 0 .318.099.099.099.099.349a.43.43 0 0 1-.066.256l-4.388 6.213z" />
        </g>
        <g filter="url(#e)" fill="#667085">
          <path d="M178.872 141.171q0 .762-.187 1.399a3.4 3.4 0 0 1-.539 1.1 2.5 2.5 0 0 1-.863.716 2.5 2.5 0 0 1-1.14.254q-.64 0-1.146-.254a2.5 2.5 0 0 1-.857-.716 3.4 3.4 0 0 1-.539-1.1 5 5 0 0 1-.187-1.399q0-.762.187-1.399.188-.638.539-1.1t.857-.716q.505-.26 1.146-.26.636 0 1.14.26.511.254.863.716.351.462.539 1.1.186.637.187 1.399m-1.521 0q0-1.1-.312-1.647t-.896-.547q-.585 0-.896.547-.312.548-.312 1.647 0 1.1.312 1.647.311.542.896.542.584 0 .896-.542.312-.547.312-1.647m5.855 3.469q-.732 0-1.276-.293a2.55 2.55 0 0 1-1.271-1.653 4.3 4.3 0 0 1-.125-1.066q0-.891.295-1.602.302-.71.885-1.213.59-.502 1.453-.784.868-.288 2.002-.333.148-.006.227.141.085.14.114.463.04.389-.029.57-.062.18-.193.191-.777.04-1.356.17a3.4 3.4 0 0 0-.975.355 1.9 1.9 0 0 0-.63.581q-.233.35-.318.829.312-.344.687-.502.38-.158.873-.158.477 0 .874.158.403.153.687.434.289.278.448.666.164.39.164.858 0 .478-.193.885a2.1 2.1 0 0 1-.522.694 2.5 2.5 0 0 1-.805.451q-.465.159-1.016.158m-1.083-2.217q0 .192.068.367a.9.9 0 0 0 .21.305q.142.13.34.208.204.08.46.079.243 0 .442-.062.199-.067.341-.186a.8.8 0 0 0 .215-.288.9.9 0 0 0 .08-.389q0-.44-.278-.682-.273-.243-.755-.243a1.5 1.5 0 0 0-.46.068 1 1 0 0 0-.351.18.9.9 0 0 0-.233.282.8.8 0 0 0-.079.361m6.711 3.599a.28.28 0 0 1-.164.141.8.8 0 0 1-.267.045q-.165 0-.34-.05a1 1 0 0 1-.312-.136.53.53 0 0 1-.193-.208q-.063-.119.005-.266l3.756-8.393a.28.28 0 0 1 .165-.141.7.7 0 0 1 .278-.051q.164 0 .334.051.177.045.307.135a.5.5 0 0 1 .193.209q.061.118-.006.271zm9.435-2.719v-.519q0-.096.028-.163a.22.22 0 0 1 .097-.107.45.45 0 0 1 .187-.062q.12-.023.301-.023.363 0 .527.085.165.079.165.27v1.365q0 .198-.085.283t-.284.084h-4.391a.5.5 0 0 1-.165-.022.23.23 0 0 1-.113-.085.6.6 0 0 1-.062-.181 2 2 0 0 1-.017-.293q0-.231.028-.338a.36.36 0 0 1 .108-.186l2.434-2.33q.226-.22.385-.395t.256-.322q.102-.152.142-.287a1 1 0 0 0 .045-.294.9.9 0 0 0-.221-.62q-.222-.243-.664-.243-.267 0-.516.068a2.3 2.3 0 0 0-.466.169v.79a.4.4 0 0 1-.028.164.25.25 0 0 1-.096.112.6.6 0 0 1-.188.062 2 2 0 0 1-.3.017q-.363 0-.528-.079a.29.29 0 0 1-.164-.276v-1.337q0-.23.243-.361a4.6 4.6 0 0 1 1.033-.417 4 4 0 0 1 1.004-.136q.567 0 1.004.153.438.145.732.417.295.27.443.649.153.378.153.84 0 .294-.068.559a2 2 0 0 1-.199.507q-.136.248-.34.497a6 6 0 0 1-.471.502l-1.549 1.483zm5.736-.874h-2.44a.5.5 0 0 1-.164-.023.23.23 0 0 1-.114-.084.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.204.028-.322a.44.44 0 0 1 .08-.18l2.666-3.267a1.04 1.04 0 0 1 .346-.287 1.1 1.1 0 0 1 .499-.102q.177 0 .29.04a.4.4 0 0 1 .181.101q.069.068.097.164.028.09.028.203v3.069h.976q.096 0 .165.022a.2.2 0 0 1 .107.09q.046.063.063.175.022.113.022.294 0 .18-.022.293a.4.4 0 0 1-.063.175.2.2 0 0 1-.107.084.5.5 0 0 1-.165.023h-.976v.931h.806q.096 0 .164.022a.2.2 0 0 1 .108.091q.045.061.063.174.022.113.022.294 0 .18-.022.293a.4.4 0 0 1-.063.175.2.2 0 0 1-.108.085.5.5 0 0 1-.164.022h-3.189a.5.5 0 0 1-.164-.022.23.23 0 0 1-.114-.085.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.18.017-.294a.5.5 0 0 1 .062-.174.22.22 0 0 1 .114-.091.5.5 0 0 1 .164-.022h.965zm.051-1.156.091-1.648-1.334 1.648z" />
        </g>
        <path
          d="m156.903 136.334-.823 2.556-.814-2.556h-.731l1.109 3.37h.871l1.119-3.37zm3.255 3.37h.736l-1.269-3.37h-.876l-1.268 3.37h.731l.29-.795h1.37zm-1.419-1.449.446-1.223.445 1.223zm3.349.794v-2.715h-.692v3.37h2.145v-.655zm1.955.655h.693v-3.37h-.693zm2.648-3.37h-1.224v3.37h1.224c.988 0 1.734-.723 1.734-1.685 0-.968-.746-1.685-1.734-1.685m0 2.715h-.532v-2.06h.532c.61 0 1.041.423 1.041 1.03 0 .606-.431 1.03-1.041 1.03m-8.992 3.061h-2.644v.655h.973v2.715h.693v-2.715h.978zm2.699 0v1.319h-1.506v-1.319h-.692v3.37h.692v-1.396h1.506v1.396h.692v-3.37zm3.379 3.37h.852l-.949-1.266c.475-.12.76-.457.76-1.006 0-.669-.43-1.098-1.157-1.098h-1.457v3.37h.692v-1.213h.383zm-1.259-2.715h.688c.358 0 .532.173.532.452 0 .275-.169.448-.532.448h-.688zm4.567-.655v1.969c0 .587-.29.804-.697.804s-.697-.217-.697-.804v-1.969h-.702v2.008c0 .948.6 1.42 1.399 1.42s1.399-.472 1.399-1.42v-2.008z"
          fill="#667085"
        />
        <rect
          x={33.011}
          y={100.23}
          width={246.589}
          height={23.481}
          rx={3.563}
          fill="#fff"
          fillOpacity={0.01}
        />
        <rect
          x={33.011}
          y={100.23}
          width={246.589}
          height={23.481}
          rx={3.563}
          stroke="#306CFE"
          strokeWidth={2.375}
        />
        <g filter="url(#f)" fill="#667085">
          <path d="M39.247 116.652a.67.67 0 0 1-.284-.376q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.596.423 1.304.686.72.254 1.457.254.585 0 1.05-.169.463-.18.784-.499.321-.328.492-.771.17-.451.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.094-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.018-.33.16-.47.151-.141.549-.141h5.049q.321 0 .454.141.141.141.142.498 0 .357-.142.498-.133.141-.454.141h-4.406l-.123 3.018q.453-.254.955-.385.51-.141 1.078-.141.86 0 1.54.282.691.272 1.164.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.646-.818m12.599-.065a.63.63 0 0 1-.274-.376q-.047-.227.151-.555.209-.33.435-.376a.5.5 0 0 1 .435.103q.606.451 1.333.724.728.273 1.485.273 1.201 0 1.796-.564.606-.565.606-1.495 0-.987-.624-1.476-.624-.499-1.73-.499h-.691q-.321 0-.463-.141-.133-.141-.133-.498t.133-.498q.141-.141.463-.141h.52q1.087 0 1.636-.451.558-.452.558-1.317 0-.798-.558-1.25-.549-.46-1.58-.461-1.096 0-1.862.367v.63q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-1.025a.8.8 0 0 1 .056-.329.6.6 0 0 1 .199-.207 6 6 0 0 1 1.39-.611 5.8 5.8 0 0 1 1.626-.216q.823 0 1.485.225.662.217 1.134.621.474.404.728.978.256.573.256 1.278 0 .847-.397 1.42a2.76 2.76 0 0 1-1.05.912q.841.347 1.324 1.025.492.677.492 1.664 0 .76-.265 1.401-.255.63-.757 1.09a3.5 3.5 0 0 1-1.22.705q-.727.254-1.654.254-.473 0-.955-.084a7 7 0 0 1-.936-.235 7 7 0 0 1-.88-.377 6 6 0 0 1-.794-.488m16.135.752a.63.63 0 0 1-.35.366 1 1 0 0 1-.576.047q-.322-.056-.473-.235-.151-.188-.029-.479l3.849-9.355h-4.482v1.373q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-2.012q0-.357.132-.498.141-.141.463-.141h6.373q.322 0 .454.141.142.141.142.498a1.3 1.3 0 0 1-.057.376zm9.006-.687a.67.67 0 0 1-.284-.376q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.596.423 1.305.686.718.254 1.456.254.585 0 1.05-.169.462-.18.784-.499.322-.328.492-.771.17-.451.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.094-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.33.16-.47.151-.141.549-.141h5.05q.32 0 .453.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018a4 4 0 0 1 .955-.385q.51-.141 1.078-.141.86 0 1.541.282.69.272 1.163.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.645-.818m29.594-.366v-2.106h-4.52q-.322 0-.463-.141-.133-.14-.133-.499 0-.31.095-.441l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.606-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.321 0 .454.141.142.141.142.498 0 .358-.142.499-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm12.505 8.048v-2.106h-4.52q-.322 0-.464-.141-.132-.14-.132-.499 0-.31.095-.441l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.141.141.498 0 .358-.141.499-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm11.379 8.048v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.546a.49.49 0 0 1 .313-.272l3.451-1.232q.303-.103.51.066.208.16.208.517v9.496h2.412q.321 0 .453.141.142.141.142.498t-.142.498q-.132.141-.453.141h-6.373q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm12.58 0v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.546a.49.49 0 0 1 .312-.272l3.452-1.232q.302-.103.51.066.208.16.208.517v9.496h2.411q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-6.373q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm26.285 0v-2.106h-4.52q-.322 0-.464-.141-.132-.14-.132-.499 0-.31.095-.441l4.576-6.328q.198-.282.435-.423.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.141.141.498 0 .358-.141.499-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.141-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm8.07 8.414a.67.67 0 0 1-.284-.376q-.057-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.595.423 1.305.686.718.254 1.456.254.586 0 1.049-.169a2.25 2.25 0 0 0 .785-.499 2.25 2.25 0 0 0 .492-.771q.17-.451.17-1.006 0-.516-.161-.949a2.1 2.1 0 0 0-.463-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.094-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.33.16-.47.152-.141.549-.141h5.049q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.406l-.123 3.018q.454-.254.955-.385.51-.141 1.078-.141.86 0 1.541.282.69.272 1.163.78.473.498.719 1.194.255.687.255 1.504 0 .828-.284 1.533a3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291 5.9 5.9 0 0 1-1.844-.301 6.7 6.7 0 0 1-1.645-.818m17.014-.366v-2.106h-4.52q-.322 0-.463-.141-.132-.14-.132-.499 0-.31.094-.441l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.322 0 .454.141.142.141.142.498 0 .358-.142.499-.132.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.065q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm.076-8.048-3.31 4.663h3.234zm7.776 3.751q0-1.307.284-2.369.284-1.072.803-1.833.53-.762 1.267-1.176a3.4 3.4 0 0 1 1.674-.413q.917 0 1.664.413.748.414 1.267 1.176.53.76.813 1.833.284 1.062.284 2.369 0 1.306-.284 2.379-.284 1.062-.813 1.824-.52.752-1.267 1.165a3.4 3.4 0 0 1-1.664.414 3.4 3.4 0 0 1-1.674-.414 3.85 3.85 0 0 1-1.267-1.165q-.52-.762-.803-1.824-.285-1.073-.284-2.379m1.494 0q0 1.053.189 1.871t.52 1.382q.34.555.804.846.463.292 1.021.292t1.021-.292q.464-.291.794-.846.34-.564.53-1.382a8.4 8.4 0 0 0 .189-1.871q0-1.053-.189-1.871-.19-.818-.53-1.382-.33-.564-.794-.855a1.87 1.87 0 0 0-1.021-.292q-.558 0-1.021.292-.464.291-.804.855-.331.564-.52 1.382a8.4 8.4 0 0 0-.189 1.871m23.665 0q0-1.307.284-2.369.284-1.072.804-1.833.53-.762 1.267-1.176a3.4 3.4 0 0 1 1.673-.413q.918 0 1.665.413.747.414 1.267 1.176.53.76.813 1.833.284 1.062.284 2.369 0 1.306-.284 2.379-.284 1.062-.813 1.824-.52.752-1.267 1.165a3.4 3.4 0 0 1-1.665.414 3.4 3.4 0 0 1-1.673-.414 3.84 3.84 0 0 1-1.267-1.165q-.52-.762-.804-1.824a9.3 9.3 0 0 1-.284-2.379m1.494 0q0 1.053.19 1.871.189.818.52 1.382.34.555.803.846.464.292 1.021.292.558 0 1.022-.292.463-.291.794-.846.34-.564.529-1.382a8.3 8.3 0 0 0 .19-1.871q0-1.053-.19-1.871-.189-.818-.529-1.382-.331-.564-.794-.855a1.9 1.9 0 0 0-1.022-.292q-.557 0-1.021.292-.464.291-.803.855-.331.564-.52 1.382a8.3 8.3 0 0 0-.19 1.871m17.402-2.125q0-.498-.17-.912a2 2 0 0 0-.482-.723 2.2 2.2 0 0 0-.756-.471 2.8 2.8 0 0 0-.993-.169q-.54 0-.984.151-.435.15-.747.432a1.9 1.9 0 0 0-.482.677q-.17.395-.17.874 0 .489.161.894.17.394.472.676.312.282.747.442.445.151 1.003.151.52 0 .964-.141.445-.15.757-.414a2 2 0 0 0 .501-.639q.18-.376.179-.828m-5.351 6.525q1.305-.066 2.269-.404.974-.348 1.645-.921a4.2 4.2 0 0 0 1.05-1.373q.388-.79.52-1.749a3.4 3.4 0 0 1-1.22.997q-.71.338-1.522.338a4.1 4.1 0 0 1-1.456-.254 3.5 3.5 0 0 1-1.163-.714 3.4 3.4 0 0 1-.776-1.119 3.8 3.8 0 0 1-.274-1.467q0-.76.274-1.41.284-.648.785-1.119.51-.47 1.22-.733a4.6 4.6 0 0 1 1.598-.263q.5 0 .974.113.482.113.907.347.426.226.776.574.358.339.633.799.36.611.539 1.392.189.77.189 1.795 0 .752-.16 1.523-.151.762-.492 1.476-.34.705-.879 1.335a5.6 5.6 0 0 1-1.286 1.1 7 7 0 0 1-1.731.771q-.983.292-2.222.348a.5.5 0 0 1-.359-.122q-.142-.123-.18-.508-.037-.423.057-.583a.33.33 0 0 1 .284-.169m11.908.263a.67.67 0 0 1-.284-.376q-.056-.225.142-.554.199-.33.426-.386a.52.52 0 0 1 .444.104q.595.423 1.305.686.718.254 1.456.254.587 0 1.05-.169.463-.18.785-.499.321-.328.491-.771a2.8 2.8 0 0 0 .17-1.006q0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.718-.489 2.5 2.5 0 0 0-.965-.179q-.681 0-1.182.179a4 4 0 0 0-.964.489q-.152.094-.473.094-.397 0-.567-.141-.161-.141-.142-.47l.189-4.701q.019-.33.161-.47.151-.141.548-.141h5.049q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018q.454-.254.955-.385.511-.141 1.078-.141.861 0 1.541.282.691.272 1.163.78.474.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.283 1.533 3.5 3.5 0 0 1-.795 1.213 3.8 3.8 0 0 1-1.257.799 4.5 4.5 0 0 1-1.655.291q-.926 0-1.844-.301a6.7 6.7 0 0 1-1.645-.818m17.014-.366v-2.106h-4.519q-.322 0-.464-.141-.132-.14-.132-.499 0-.31.094-.441l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .634.207.189.197.189.526v5.97h1.532q.321 0 .453.141.142.141.142.498 0 .358-.142.499-.132.141-.453.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.133-.141-.133-.498t.133-.498q.142-.141.463-.141zm.076-8.048-3.309 4.663h3.233z" />
        </g>
        <path
          d="M30.2 41.875a5.2 5.2 0 0 1-2.071-.41 5.1 5.1 0 0 1-1.64-1.133 5.3 5.3 0 0 1-1.094-1.66 5.3 5.3 0 0 1-.372-1.973q0-1.035.372-1.972a5.3 5.3 0 0 1 1.093-1.66 5.3 5.3 0 0 1 1.64-1.172 5 5 0 0 1 2.071-.43q1.113 0 1.797.351.704.352 1.113.684v2.285a5 5 0 0 0-1.152-.625q-.625-.255-1.543-.254-.742 0-1.387.371A2.74 2.74 0 0 0 27.66 36.7q0 .801.352 1.426.352.626.976.996.645.352 1.426.352.918 0 1.543-.254.645-.254 1.152-.606v2.266q-.41.351-1.113.684-.684.312-1.797.312m4.716-.293V31.72h2.48v9.863zm2.48-5.508v-2.5a5.6 5.6 0 0 1 1.192-1.465q.703-.586 1.582-.586.547 0 .957.176v2.793a2.2 2.2 0 0 0-.625-.254 2.3 2.3 0 0 0-.683-.097q-.84 0-1.426.566-.567.547-.996 1.367m9.855 5.801q-1.094 0-2.051-.371a5.6 5.6 0 0 1-1.7-1.074 4.9 4.9 0 0 1-1.132-1.621 5.1 5.1 0 0 1-.41-2.051q0-1.446.644-2.637a5.1 5.1 0 0 1 1.778-1.934q1.132-.722 2.578-.722t2.48.625a4.05 4.05 0 0 1 1.602 1.738q.566 1.094.566 2.54v1.054h-7.363v-1.7h4.98q-.039-.722-.39-1.171a2.1 2.1 0 0 0-.86-.684 2.5 2.5 0 0 0-1.074-.234q-.762 0-1.328.39-.545.39-.86 1.094-.312.704-.312 1.64 0 .84.371 1.485.372.645 1.035 1.016.684.37 1.543.37 1.094 0 1.954-.429.879-.43 1.386-.879v2.305a4.2 4.2 0 0 1-.82.566 5.7 5.7 0 0 1-1.211.489 5 5 0 0 1-1.406.195m9.951 0q-1.17 0-2.187-.605-.996-.606-1.621-1.758-.606-1.154-.606-2.793 0-1.66.606-2.832.625-1.172 1.66-1.797a4.5 4.5 0 0 1 2.324-.625q.82 0 1.621.37.82.372 1.367.997V27.52h2.48v14.062h-2.48v-1.66a4.1 4.1 0 0 1-1.25 1.387q-.82.566-1.914.566m.625-2.48a2.3 2.3 0 0 0 1.23-.352q.586-.351.958-.996.37-.645.351-1.524v-1.406a4 4 0 0 0-1.152-.879 2.7 2.7 0 0 0-1.328-.332q-.78 0-1.348.41-.546.39-.86 1.036a3 3 0 0 0-.312 1.367q0 .722.313 1.347.312.606.86.977.566.352 1.288.352m9.698-9.454q-.703 0-1.21-.507-.51-.509-.509-1.172 0-.703.508-1.192a1.7 1.7 0 0 1 1.211-.488q.469 0 .86.234.39.216.624.606.235.37.235.84 0 .43-.235.82t-.625.625-.859.234m-.996 11.641v-9.863h2.48v9.863zm-1.582-7.754v-2.11h4.062v2.11zm10.81 8.047q-.878 0-1.6-.39a2.9 2.9 0 0 1-1.114-1.094q-.41-.723-.41-1.7V33.79h-1.64v-1.27q.956-.33 1.562-1.23.624-.899 1.093-2.246h1.465v2.676h2.969v2.07h-2.969v4.258q0 .664.332 1.055.352.37 1.016.37.586 0 1.016-.175.43-.176.761-.371v2.11q-.351.37-.996.605-.624.234-1.484.234m70.576-2.101a4.7 4.7 0 0 1-1.772-.334 4.7 4.7 0 0 1-1.452-.95 4.5 4.5 0 0 1-.963-1.44 4.5 4.5 0 0 1-.347-1.772q0-.951.347-1.773a4.3 4.3 0 0 1 .963-1.425q.63-.617 1.452-.95a4.5 4.5 0 0 1 1.772-.348q.887 0 1.478.244.603.244 1.053.643v1.49a16 16 0 0 0-.642-.45 4 4 0 0 0-.797-.398q-.45-.18-1.066-.18a3.1 3.1 0 0 0-1.593.411q-.706.41-1.117 1.13a3.13 3.13 0 0 0-.411 1.606q0 .9.411 1.606a3.14 3.14 0 0 0 1.117 1.13 3.1 3.1 0 0 0 1.593.411q.938 0 1.593-.308a6 6 0 0 0 1.117-.668v1.387q-.449.398-1.156.668-.693.27-1.58.27m4.143-.193v-6.448h1.285v6.448zm1.285-3.776v-1.413a3.5 3.5 0 0 1 .847-1.002q.501-.386 1.066-.386.373 0 .656.129v1.464a2 2 0 0 0-.399-.18 1.5 1.5 0 0 0-.436-.064q-.617 0-1.015.424a5.4 5.4 0 0 0-.719 1.028m6.57 3.969q-.72 0-1.349-.257a3.35 3.35 0 0 1-1.798-1.785 3.4 3.4 0 0 1-.257-1.324q0-.924.411-1.695a3.24 3.24 0 0 1 1.131-1.246 2.9 2.9 0 0 1 1.631-.475q.977 0 1.644.41.667.412 1.002 1.131.347.706.347 1.618v.655h-4.971v-.989h3.725q-.053-.565-.321-.924a1.63 1.63 0 0 0-.643-.54 1.8 1.8 0 0 0-.796-.18q-.566 0-.989.309a2 2 0 0 0-.642.796 2.7 2.7 0 0 0-.232 1.13q0 .591.257 1.08a2.08 2.08 0 0 0 1.876 1.078q.707 0 1.284-.32.591-.336.976-.694v1.284a2.7 2.7 0 0 1-.539.424 3.4 3.4 0 0 1-.796.36q-.45.154-.951.154m6.635 0a2.8 2.8 0 0 1-1.478-.411 3.06 3.06 0 0 1-1.078-1.156q-.399-.758-.399-1.773 0-1.065.399-1.837a2.95 2.95 0 0 1 2.671-1.605q.54 0 1.092.256.566.258.951.694v-3.61h1.284v9.249h-1.284V38.49a2.9 2.9 0 0 1-.874.9 2.2 2.2 0 0 1-1.284.385m.269-1.272q.526 0 .951-.27.436-.282.694-.77.256-.5.244-1.144v-1.117a3.2 3.2 0 0 0-.822-.68 1.85 1.85 0 0 0-.977-.258 1.84 1.84 0 0 0-1.066.308 2.1 2.1 0 0 0-.681.81 2.4 2.4 0 0 0-.231 1.053q0 .566.231 1.04.245.476.668.758.425.27.989.27m6.173-6.64a.92.92 0 0 1-.694-.296.94.94 0 0 1-.283-.668q0-.386.283-.668a.92.92 0 0 1 .694-.296q.269 0 .488.142a1 1 0 0 1 .347.347.86.86 0 0 1 .141.475.9.9 0 0 1-.141.475 1.1 1.1 0 0 1-.347.36.95.95 0 0 1-.488.128m-.501 7.719v-6.448h1.284v6.448zm-1.028-5.292v-1.156h2.312v1.156zm6.789 5.485q-.552 0-.976-.231a1.8 1.8 0 0 1-.668-.668q-.244-.437-.244-1.028v-3.57h-1.169v-.527a2.27 2.27 0 0 0 1.04-.874q.424-.63.732-1.554h.681v1.81h2.03v1.144h-2.03v3.378q0 .412.244.655.256.231.681.232.385 0 .681-.103.308-.104.514-.218v1.104a1.6 1.6 0 0 1-.63.334 3 3 0 0 1-.886.116m10.174-.052q-.54 0-1.144-.051a16 16 0 0 1-1.156-.116 13 13 0 0 1-.963-.167v-8.297q.693-.154 1.49-.232.809-.09 1.631-.09.976 0 1.696.322.719.308 1.104.86.399.54.399 1.246 0 .642-.36 1.156-.346.501-.874.77.386.09.745.335.373.231.617.642t.244 1.028q0 .72-.411 1.31t-1.182.938q-.77.345-1.836.346m-.026-1.271q.874 0 1.438-.373.566-.372.566-.989 0-.642-.566-.95-.565-.322-1.387-.322h-2.119v-1.143h2.119q.784 0 1.195-.398.424-.398.424-.95a1 1 0 0 0-.257-.694 1.5 1.5 0 0 0-.655-.424 2.5 2.5 0 0 0-.899-.154q-.489 0-.912.038a6 6 0 0 0-.784.103v6.102q.282.051.629.09.347.038.668.05.334.014.54.014m7.315 1.323a2.8 2.8 0 0 1-1.477-.411 3.06 3.06 0 0 1-1.079-1.156q-.398-.758-.398-1.773 0-1.065.398-1.837a2.95 2.95 0 0 1 1.105-1.181 3 3 0 0 1 1.567-.424q.538 0 1.092.256.564.258.95.694v-.81h1.285v6.449h-1.285V38.49a2.9 2.9 0 0 1-.873.9 2.2 2.2 0 0 1-1.285.385m.27-1.272q.527 0 .95-.27.438-.282.694-.77.257-.5.244-1.144v-1.117a3.4 3.4 0 0 0-.822-.694 1.84 1.84 0 0 0-.976-.257q-.617 0-1.066.309a2.1 2.1 0 0 0-.681.809q-.231.502-.231 1.066 0 .566.231 1.04.244.476.668.758.424.27.989.27m9.409 1.079v-3.79q0-.77-.347-1.155-.346-.386-1.027-.386-.476 0-.938.347-.45.334-.796.784V34.11q.206-.256.513-.514.309-.255.694-.424.399-.18.835-.18.655.001 1.195.296.539.282.847.874.321.59.321 1.477v3.943zm-4.393 0v-6.448h1.285v6.448zm8.343-1.683v-1.464l3.288-3.301h1.645zm-.976 1.683v-9.248h1.284v9.248zm4.444 0-2.659-3.25.822-.899 3.456 4.149z"
          fill="#667085"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M129.571 46.13V27.357h.969v18.774z"
          fill="#D0D5DD"
        />
        <path
          d="M28.057 64.123h32.92c1.88 0 3.398 1.514 3.398 3.376v21.306c0 1.861-1.518 3.375-3.398 3.376h-32.92c-1.88 0-3.399-1.514-3.399-3.376V67.499c0-1.804 1.426-3.28 3.224-3.371z"
          fill="#fff"
          stroke="#667085"
          strokeWidth={0.95}
        />
        <mask
          id="g"
          style={{
            maskType: "alpha",
          }}
          maskUnits="userSpaceOnUse"
          x={24}
          y={63}
          width={41}
          height={30}
        >
          <path
            d="M24.184 67.5c0-2.127 1.734-3.852 3.873-3.852h32.92c2.14 0 3.873 1.724 3.873 3.851v21.306c0 2.127-1.734 3.85-3.873 3.85h-32.92c-2.14 0-3.873-1.723-3.873-3.85z"
            fill="#98A2B3"
          />
        </mask>
        <g mask="url(#g)" fillRule="evenodd" clipRule="evenodd" fill="#667085">
          <path d="M23.941 67.246c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M23.941 75.159c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.723a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M38.087 74.28c0-.665.542-1.204 1.21-1.204H52.39c.668 0 1.21.539 1.21 1.204v.272c0 .664-.542 1.203-1.21 1.203h-.716a.724.724 0 0 0-.726.722v6.425c0 .665-.542 1.204-1.21 1.204H36.644c-.669 0-1.21-.54-1.21-1.204v-.711c0-.665.541-1.204 1.21-1.204h.716a.724.724 0 0 0 .726-.722zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .665-.542 1.204-1.21 1.204h-.716a.724.724 0 0 0-.726.722v.711c0 .399.325.722.726.722h13.092a.724.724 0 0 0 .727-.722v-6.425c0-.665.541-1.203 1.21-1.203h.715a.724.724 0 0 0 .727-.722v-.272a.724.724 0 0 0-.727-.722z" />
          <path d="M23.941 83.069c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722V83.07a.724.724 0 0 0-.726-.722zm27.964-15.101c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M53.115 75.159c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.723a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M53.115 83.069c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722V83.07a.724.724 0 0 0-.726-.722z" />
        </g>
      </g>
      <defs>
        <filter
          id="a"
          x={0.383}
          y={0.15}
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
            result="effect1_dropShadow_8_45133"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45133"
            result="shape"
          />
        </filter>
        <filter
          id="d"
          x={25.046}
          y={156.779}
          width={176.366}
          height={8.339}
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
            result="effect1_dropShadow_8_45133"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45133"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45133" />
        </filter>
        <filter
          id="e"
          x={173.414}
          y={136.963}
          width={33.342}
          height={9.484}
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
            result="effect1_dropShadow_8_45133"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45133"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45133" />
        </filter>
        <filter
          id="f"
          x={38.95}
          y={106.168}
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
            result="effect1_dropShadow_8_45133"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45133"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45133" />
        </filter>
        <linearGradient
          id="b"
          x1={4.179}
          y1={184.954}
          x2={164.293}
          y2={-83.437}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={1} stopColor="#fff" />
        </linearGradient>
        <clipPath id="c">
          <path fill="#fff" d="M268.326 23.217h20.333v25.031h-20.333z" />
        </clipPath>
      </defs>
    </svg>
  )
}

const CreditCardName = (props: React.SVGProps<SVGSVGElement>) => {
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
        <rect
          x={4.184}
          y={2.955}
          width={305}
          height={181.955}
          rx={11.402}
          fill="url(#b)"
        />
        <rect
          x={5.184}
          y={3.955}
          width={303}
          height={179.955}
          rx={10.402}
          stroke="#EAECF0"
          strokeWidth={2}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M270.35 164.569c10.217 0 18.499-8.12 18.499-18.137s-8.282-18.137-18.499-18.137c-4.58 0-8.77 1.631-12.001 4.333a18.64 18.64 0 0 0-11.999-4.333c-10.218 0-18.5 8.12-18.5 18.137s8.282 18.137 18.5 18.137c4.579 0 8.769-1.631 12-4.333a18.64 18.64 0 0 0 12 4.333"
          fill="#98A2B3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.35 160.236c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.499-13.804a18.64 18.64 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.579 0-8.77-1.631-12-4.333"
          fill="#EAECF0"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.349 160.237c3.978-3.326 6.5-8.276 6.5-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.499 8.277-6.499 13.804s2.522 10.478 6.499 13.804"
          fill="#D0D5DD"
        />
        <g clipPath="url(#c)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M283.305 23.433c.6-.334 1.358-.12 1.694.476a24 24 0 0 1 3.077 11.779c0 4.133-1.06 8.195-3.077 11.779a1.25 1.25 0 0 1-1.694.476 1.234 1.234 0 0 1-.479-1.685 21.57 21.57 0 0 0 2.76-10.57c0-3.713-.953-7.359-2.76-10.57a1.234 1.234 0 0 1 .479-1.685m-4.793 2.459a1.25 1.25 0 0 1 1.694.475 19 19 0 0 1 2.435 9.32c0 3.27-.839 6.485-2.435 9.321a1.25 1.25 0 0 1-1.694.476 1.235 1.235 0 0 1-.479-1.684 16.54 16.54 0 0 0 2.118-8.112c0-2.85-.731-5.648-2.118-8.112a1.235 1.235 0 0 1 .479-1.684m-4.57 2.254a1.25 1.25 0 0 1 1.692.483 14.34 14.34 0 0 1 1.802 6.97c0 2.443-.621 4.847-1.802 6.969a1.25 1.25 0 0 1-1.692.483 1.234 1.234 0 0 1-.486-1.683 11.9 11.9 0 0 0 1.49-5.77 11.9 11.9 0 0 0-1.49-5.77 1.234 1.234 0 0 1 .486-1.682m-4.644 2.477a1.25 1.25 0 0 1 1.72.374 8.65 8.65 0 0 1 1.386 4.69 8.65 8.65 0 0 1-1.386 4.691 1.25 1.25 0 0 1-1.72.375 1.234 1.234 0 0 1-.377-1.71 6.2 6.2 0 0 0 .993-3.355 6.2 6.2 0 0 0-.993-3.355 1.234 1.234 0 0 1 .377-1.71"
            fill="#667085"
          />
        </g>
        <rect
          x={19.107}
          y={150.797}
          width={188.243}
          height={19.978}
          rx={3.563}
          fill="#fff"
          fillOpacity={0.01}
        />
        <rect
          x={19.107}
          y={150.797}
          width={188.243}
          height={19.978}
          rx={3.563}
          stroke="#306CFE"
          strokeWidth={2.375}
        />
        <g filter="url(#d)" fill="#667085">
          <path d="M26.204 157.774h-.741q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h3.117q.781 0 1.424.27.641.27 1.098.777.457.5.708 1.224.252.723.252 1.638t-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263h-3.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.572q.338-.382.523-.942a4.2 4.2 0 0 0 .185-1.303q0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm5.612-3.008q0-.915.252-1.658.251-.75.708-1.283a3.1 3.1 0 0 1 1.099-.823q.642-.29 1.423-.29.78 0 1.423.29a3.1 3.1 0 0 1 1.099.823q.456.533.708 1.283.25.744.251 1.658 0 .915-.251 1.665a3.8 3.8 0 0 1-.708 1.277q-.457.526-1.1.816-.641.29-1.422.29t-1.423-.29A3.15 3.15 0 0 1 35 163.73a3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.18.565.496.967.318.395.768.612.45.211 1 .211t1-.211q.45-.217.767-.612.318-.402.49-.967.178-.573.178-1.284 0-.71-.178-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.612 2.3 2.3 0 0 0-1-.218q-.548 0-.999.218-.45.21-.767.612a3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m8.704-3.014h-.51q-.225 0-.325-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.1.348q-.092.099-.317.099h-.377v6.673a.35.35 0 0 1-.12.277q-.119.111-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm10.244 6.022q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.21q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.37l2.191-6.022h-1.237q-.225 0-.325-.099-.093-.098-.093-.348t.093-.349q.099-.099.325-.099h2.429q.264 0 .423.099.165.099.245.329l2.337 6.489h.403q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.343q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.894l-.543-1.566h-3.21l-.55 1.566zm.06-2.461h2.595l-1.231-3.561h-.126zm8.206-3.561h-1.072q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h3.667q.225 0 .318.099.1.099.1.349t-.1.348q-.093.099-.318.099h-1.601v6.022h3.276v-2.165q0-.231.106-.329.113-.099.39-.099.279 0 .384.099.113.098.113.329v2.612q0 .25-.1.349-.092.099-.317.099h-5.918q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.073zm8.611 0h-.741q-.225 0-.325-.099-.092-.098-.092-.348t.092-.349q.1-.099.325-.099h3.117q.78 0 1.423.27.642.27 1.1.777.456.5.707 1.224.252.723.252 1.638t-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263H70.17q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.572q.338-.382.523-.942.185-.565.185-1.303 0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm15.791-6.022h-.874q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.1-.099.325-.099h5.983q.225 0 .318.099.099.099.099.349v1.737q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.099-.106-.329v-1.29h-3.54v2.573h1.655v-.598q0-.231.106-.33.113-.098.39-.098.279 0 .384.098.113.099.113.33v2.092q0 .231-.113.329-.105.099-.384.099-.278 0-.39-.099-.106-.098-.106-.329v-.599H89.92v2.554h1.536q.225 0 .317.099.1.098.1.348t-.1.349q-.093.099-.317.099h-3.403q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.1-.099.325-.099h.873zm9.14 0h-1.072q-.225 0-.325-.099-.092-.098-.092-.348t.093-.349q.099-.099.324-.099h3.667q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-1.602v6.022h3.276v-2.165q0-.231.106-.329.112-.099.391-.099.278 0 .384.099.112.098.112.329v2.612q0 .25-.099.349-.093.099-.318.099h-5.917q-.225 0-.325-.099-.092-.099-.092-.349t.093-.348q.099-.099.324-.099h1.072zm10.49 0h-1.694q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h4.382q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-1.695v6.022h1.827q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.647q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.827zm6.764 0h-.51q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.099.348q-.093.099-.318.099h-.377v6.673a.35.35 0 0 1-.12.277q-.119.111-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm14.581 6.2q-.629.433-1.351.651-.72.211-1.482.211a3.4 3.4 0 0 1-1.417-.29 3.1 3.1 0 0 1-1.072-.816 3.8 3.8 0 0 1-.688-1.277 5.5 5.5 0 0 1-.239-1.665q0-.915.245-1.658.252-.75.702-1.283.456-.534 1.086-.823.629-.29 1.383-.29.642 0 1.118.218.477.21.801.592v-.382q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.1-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.576-.355 2.3 2.3 0 0 0-.827-.132 2.24 2.24 0 0 0-1.761.83 3 3 0 0 0-.496.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.171.565.476.967.312.395.748.612.444.211.98.211.662 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.138.23.112.401-.026.165-.198.29m3.335-6.2h-.477q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.079q.225 0 .317.099.1.099.1.349t-.1.348q-.092.099-.317.099h-.609v2.442h3.296v-2.442h-.609q-.225 0-.324-.099-.093-.098-.093-.348t.093-.349q.099-.099.324-.099h2.078q.225 0 .318.099.099.099.099.349t-.099.348q-.093.099-.318.099h-.476v6.022h.476q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-2.078q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.609v-2.685h-3.296v2.685h.609q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.079q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.477zm23.489 6.2a4.8 4.8 0 0 1-1.35.651 5.3 5.3 0 0 1-1.483.211q-.781 0-1.416-.29a3.05 3.05 0 0 1-1.073-.816 3.9 3.9 0 0 1-.688-1.277 5.5 5.5 0 0 1-.238-1.665q0-.915.244-1.658.252-.75.702-1.283.457-.534 1.086-.823.629-.29 1.383-.29.642 0 1.119.218.476.21.8.592v-.382q0-.23.106-.329.113-.099.391-.099.277 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.278 0-.391-.099-.106-.1-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.575-.355 2.4 2.4 0 0 0-.828-.132 2.24 2.24 0 0 0-1.76.83 3 3 0 0 0-.497.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.172.565.476.967.312.395.748.612.444.211.98.211.661 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.14.23.112.401-.026.165-.198.29m2.494-3.186q0-.915.252-1.658.252-.75.708-1.283.457-.534 1.099-.823.642-.29 1.423-.29t1.423.29 1.099.823q.456.533.708 1.283.252.744.252 1.658 0 .915-.252 1.665a3.8 3.8 0 0 1-.708 1.277 3.2 3.2 0 0 1-1.099.816q-.642.29-1.423.29t-1.423-.29a3.2 3.2 0 0 1-1.099-.816 3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.179.565.497.967.317.395.768.612.45.211.999.211t.999-.211q.45-.217.768-.612.318-.402.49-.967.179-.573.179-1.284 0-.71-.179-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.612 2.3 2.3 0 0 0-.999-.218q-.549 0-.999.218-.45.21-.768.612a3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m9.067-3.014h-.807q-.225 0-.325-.099-.092-.098-.092-.348t.092-.349q.1-.099.325-.099h3.349q.636 0 1.125.165.49.157.821.447.338.29.51.704.172.408.172.902 0 .381-.133.704a1.7 1.7 0 0 1-.364.573 2.3 2.3 0 0 1-.582.434 3 3 0 0 1-.755.27q.173.079.318.197t.278.264q.165.183.311.401.152.218.278.441.132.218.252.434.119.218.231.402.159.263.325.421.165.158.37.158h.126q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-.463a1 1 0 0 1-.57-.197q-.277-.204-.595-.718a10 10 0 0 1-.258-.447l-.252-.454a7 7 0 0 0-.529-.823 2 2 0 0 0-.358-.362 1.5 1.5 0 0 0-.39-.23 2 2 0 0 0-.457-.119 3.5 3.5 0 0 0-.549-.039h-.411v2.494h.861q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.661q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.807zm.993 0v2.633h1.344q.41 0 .741-.073.331-.072.563-.23.231-.157.357-.408.126-.25.126-.599 0-.638-.45-.981-.444-.342-1.271-.342zm9.762 0h-1.767v2.034q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.106-.1-.106-.329v-2.481q0-.25.093-.349.099-.099.324-.099h5.679q.225 0 .318.099.099.099.099.349v2.481q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.1-.106-.329v-2.034h-1.767v6.022h1.562q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.562zm6.996 0h-.675q-.226 0-.325-.099-.093-.098-.092-.348 0-.25.092-.349.1-.099.325-.099h5.784q.226 0 .318.099.099.099.099.349v1.671q0 .231-.112.329-.107.099-.384.099-.278 0-.39-.099-.106-.098-.106-.329v-1.224h-3.541v2.442h1.654v-.599q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.099.112.329v2.093q0 .23-.112.329-.107.099-.384.098-.279 0-.391-.098-.106-.1-.106-.329v-.599h-1.654v2.685h3.673v-1.507q0-.23.106-.329.113-.099.39-.099.279 0 .384.099.113.099.113.329v1.954q0 .25-.099.349-.093.099-.318.099h-5.917q-.226 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.675zm13.336 6.022v-1.77q0-.231.106-.329.113-.099.39-.099.279 0 .384.099.113.098.113.329v2.217q0 .25-.099.349-.093.099-.318.099h-5.07q-.225 0-.325-.099-.092-.099-.092-.349a.4.4 0 0 1 .026-.158 1 1 0 0 1 .066-.125l4.362-6.186h-3.322v1.639q0 .23-.113.329-.106.099-.384.099t-.39-.099q-.106-.1-.106-.329v-2.086q0-.25.092-.349.1-.099.325-.099h4.871q.225 0 .318.099.099.099.099.349a.43.43 0 0 1-.066.256l-4.388 6.213z" />
        </g>
        <rect
          x={149.535}
          y={127}
          width={61.484}
          height={18.747}
          rx={2.375}
          fill="#fff"
          fillOpacity={0.01}
        />
        <path
          d="m156.654 131.75-.824 2.556-.813-2.556h-.731l1.109 3.37h.871l1.119-3.37zm3.255 3.37h.736l-1.269-3.37h-.876l-1.268 3.37h.731l.29-.795h1.37zm-1.419-1.449.446-1.223.445 1.223zm3.349.794v-2.715h-.692v3.37h2.145v-.655zm1.955.655h.693v-3.37h-.693zm2.648-3.37h-1.224v3.37h1.224c.988 0 1.734-.723 1.734-1.685 0-.968-.746-1.685-1.734-1.685m0 2.715h-.532v-2.06h.532c.61 0 1.041.423 1.041 1.03 0 .606-.431 1.03-1.041 1.03m-8.992 3.061h-2.644v.655h.973v2.715h.693v-2.715h.978zm2.699 0v1.319h-1.506v-1.319h-.692v3.37h.692V139.5h1.506v1.396h.692v-3.37zm3.379 3.37h.852l-.949-1.266c.475-.12.76-.457.76-1.006 0-.669-.43-1.098-1.157-1.098h-1.457v3.37h.692v-1.213h.383zm-1.259-2.715h.688c.358 0 .532.173.532.452 0 .275-.169.448-.532.448h-.688zm4.567-.655v1.969c0 .587-.29.804-.697.804s-.697-.217-.697-.804v-1.969h-.702v2.008c0 .948.6 1.42 1.399 1.42s1.399-.472 1.399-1.42v-2.008z"
          fill="#667085"
        />
        <g filter="url(#e)" fill="#667085">
          <path d="M178.384 135.958q0 .762-.188 1.399a3.3 3.3 0 0 1-.539 1.1 2.5 2.5 0 0 1-.862.717 2.5 2.5 0 0 1-1.14.253q-.642 0-1.146-.253a2.5 2.5 0 0 1-.857-.717 3.4 3.4 0 0 1-.539-1.1 5 5 0 0 1-.187-1.399q0-.762.187-1.399t.539-1.1a2.44 2.44 0 0 1 2.003-.976 2.46 2.46 0 0 1 2.002.976q.353.463.539 1.1.188.637.188 1.399m-1.521 0q0-1.1-.312-1.647t-.896-.547q-.585 0-.897.547t-.312 1.647.312 1.647q.312.542.897.542.584 0 .896-.542.312-.547.312-1.647m5.855 3.469q-.732 0-1.277-.293a2.56 2.56 0 0 1-1.27-1.653 4.3 4.3 0 0 1-.125-1.066q0-.891.295-1.602.3-.71.885-1.213.59-.502 1.452-.784.869-.288 2.003-.333.147-.005.227.141.085.141.113.463.04.388-.028.57-.063.18-.193.191-.777.04-1.356.17a3.4 3.4 0 0 0-.976.355 1.9 1.9 0 0 0-.629.581q-.232.35-.318.829.312-.343.686-.502a2.3 2.3 0 0 1 .874-.158q.477 0 .874.158.402.153.686.435.29.276.448.665.165.39.165.858 0 .48-.193.885a2.1 2.1 0 0 1-.522.694 2.5 2.5 0 0 1-.805.451 3.1 3.1 0 0 1-1.016.158m-1.084-2.217q0 .192.068.367.075.175.21.305.142.13.341.208.204.08.459.079.244 0 .443-.062a1 1 0 0 0 .34-.186.8.8 0 0 0 .216-.287.9.9 0 0 0 .079-.39q0-.44-.278-.682-.272-.243-.754-.243-.25 0-.46.068a1 1 0 0 0-.352.18.9.9 0 0 0-.232.282.8.8 0 0 0-.08.361m6.712 3.599a.28.28 0 0 1-.165.141.8.8 0 0 1-.266.046q-.165 0-.341-.051a1 1 0 0 1-.312-.136.54.54 0 0 1-.193-.208q-.061-.119.006-.265l3.756-8.394a.28.28 0 0 1 .164-.141.7.7 0 0 1 .278-.051q.165 0 .335.051.176.045.307.135.136.085.192.209.063.118-.005.271zm9.435-2.719v-.519q0-.095.028-.163a.22.22 0 0 1 .097-.107.45.45 0 0 1 .187-.062q.118-.023.301-.023.363 0 .527.085.165.079.165.27v1.366q0 .196-.085.282-.086.084-.284.084h-4.391a.5.5 0 0 1-.165-.022.23.23 0 0 1-.113-.085.6.6 0 0 1-.063-.18 2 2 0 0 1-.017-.294q0-.231.029-.338a.37.37 0 0 1 .107-.186l2.434-2.33q.227-.22.386-.395a3 3 0 0 0 .255-.322 1.05 1.05 0 0 0 .188-.581.88.88 0 0 0-.222-.62q-.22-.243-.663-.243-.267 0-.517.068a2.3 2.3 0 0 0-.465.169v.79a.4.4 0 0 1-.028.164.25.25 0 0 1-.097.112.6.6 0 0 1-.187.063 2 2 0 0 1-.301.016q-.363 0-.527-.079a.29.29 0 0 1-.165-.276v-1.337q0-.23.244-.361a4.6 4.6 0 0 1 1.033-.417 4 4 0 0 1 1.004-.136q.567 0 1.004.153.436.146.732.417.295.271.442.649a2.2 2.2 0 0 1 .154.84q0 .294-.068.559a2 2 0 0 1-.199.507 3.3 3.3 0 0 1-.34.497q-.2.243-.471.502l-1.549 1.483zm5.736-.874h-2.44a.5.5 0 0 1-.165-.022.24.24 0 0 1-.113-.085.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.204.028-.322a.44.44 0 0 1 .079-.18l2.667-3.266q.148-.187.346-.288.198-.102.499-.102.176 0 .29.04a.4.4 0 0 1 .181.101q.068.068.097.164.028.09.028.203v3.069h.976q.096 0 .164.022a.2.2 0 0 1 .108.091.4.4 0 0 1 .062.174q.023.113.023.294 0 .18-.023.293a.4.4 0 0 1-.062.175.2.2 0 0 1-.108.085.5.5 0 0 1-.164.022h-.976v.931h.806q.096 0 .164.022a.2.2 0 0 1 .108.091.4.4 0 0 1 .062.175q.023.113.023.293t-.023.293a.4.4 0 0 1-.062.175.2.2 0 0 1-.108.085.5.5 0 0 1-.164.022h-3.189a.5.5 0 0 1-.164-.022.23.23 0 0 1-.114-.085.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.18.017-.293a.5.5 0 0 1 .062-.175.22.22 0 0 1 .114-.091.5.5 0 0 1 .164-.022h.965zm.051-1.156.09-1.647-1.333 1.647z" />
        </g>
        <rect
          x={34.199}
          y={101.373}
          width={244.214}
          height={21.106}
          rx={2.375}
          fill="#fff"
          fillOpacity={0.01}
        />
        <g filter="url(#f)" fill="#667085">
          <path d="M39.247 116.607a.67.67 0 0 1-.284-.376q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.596.422 1.304.686.72.254 1.457.254.585 0 1.05-.169.463-.18.784-.499.321-.328.492-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.018-.33.16-.47.151-.141.549-.141h5.049q.321 0 .454.141.141.141.142.498 0 .357-.142.498-.133.141-.454.141h-4.406l-.123 3.018q.453-.253.955-.385.51-.141 1.078-.141.86 0 1.54.282.691.273 1.164.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.646-.818m12.599-.065a.63.63 0 0 1-.274-.376q-.047-.226.151-.555.209-.329.435-.376a.5.5 0 0 1 .435.103q.606.451 1.333.724.728.273 1.485.273 1.201 0 1.796-.564.606-.565.606-1.495 0-.987-.624-1.476-.624-.498-1.73-.498h-.691q-.321 0-.463-.142-.133-.141-.133-.498t.133-.498q.141-.141.463-.141h.52q1.087 0 1.636-.451.558-.451.558-1.317 0-.798-.558-1.25-.549-.46-1.58-.461-1.096 0-1.862.367v.63q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-1.025q0-.207.056-.329a.6.6 0 0 1 .199-.207 6 6 0 0 1 1.39-.611 5.8 5.8 0 0 1 1.626-.216q.823 0 1.485.226.662.216 1.134.62.474.404.728.978.256.573.256 1.278 0 .846-.397 1.42a2.76 2.76 0 0 1-1.05.912q.841.347 1.324 1.025.492.677.492 1.664 0 .761-.265 1.401-.255.63-.757 1.09a3.5 3.5 0 0 1-1.22.705q-.727.255-1.654.254-.473 0-.955-.084a7 7 0 0 1-.936-.235 7 7 0 0 1-.88-.376 6 6 0 0 1-.794-.489m16.135.752a.63.63 0 0 1-.35.366 1 1 0 0 1-.576.047q-.322-.056-.473-.235-.151-.188-.029-.479l3.849-9.355h-4.482v1.373q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-2.012q0-.357.132-.498.141-.141.463-.141h6.373q.322 0 .454.141.142.141.142.498a1.3 1.3 0 0 1-.057.376zm9.006-.687a.67.67 0 0 1-.284-.376q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.596.422 1.305.686.718.254 1.456.254.585 0 1.05-.169.462-.18.784-.499.322-.328.492-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.33.16-.47.151-.141.549-.141h5.05q.32 0 .453.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018q.453-.253.955-.385.51-.141 1.078-.141.86 0 1.541.282.69.273 1.163.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.645-.818m29.594-.366v-2.106h-4.52q-.322 0-.463-.141-.133-.141-.133-.498 0-.311.095-.442l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.606-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.321 0 .454.141.142.14.142.499 0 .357-.142.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm12.505 8.048v-2.106h-4.52q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.095-.442l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.14.141.499 0 .357-.141.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm11.379 8.048v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.545a.49.49 0 0 1 .313-.273l3.451-1.232q.303-.103.51.066.208.16.208.517v9.496h2.412q.321 0 .453.141.142.141.142.498t-.142.498q-.132.141-.453.141h-6.373q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm12.58 0v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.545a.49.49 0 0 1 .312-.273l3.452-1.232q.302-.103.51.066.208.16.208.517v9.496h2.411q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-6.373q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm26.285 0v-2.106h-4.52q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.095-.442l4.576-6.328q.198-.282.435-.423.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.14.141.499 0 .357-.141.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.141-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm8.07 8.414a.67.67 0 0 1-.284-.376q-.057-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.595.422 1.305.686.718.254 1.456.254.586 0 1.049-.169a2.25 2.25 0 0 0 .785-.499 2.25 2.25 0 0 0 .492-.771q.17-.45.17-1.006 0-.516-.161-.949a2.1 2.1 0 0 0-.463-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.33.16-.47.152-.141.549-.141h5.049q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.406l-.123 3.018q.454-.253.955-.385.51-.141 1.078-.141.86 0 1.541.282.69.273 1.163.78.473.498.719 1.194.255.687.255 1.504 0 .828-.284 1.533a3.5 3.5 0 0 1-.794 1.213 3.8 3.8 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291 5.9 5.9 0 0 1-1.844-.301 6.7 6.7 0 0 1-1.645-.818m17.014-.366v-2.106h-4.52q-.322 0-.463-.141-.132-.141-.132-.498 0-.311.094-.442l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.322 0 .454.141.142.14.142.499 0 .357-.142.498-.132.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.065q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm.076-8.048-3.31 4.663h3.234zm7.776 3.751q0-1.307.284-2.369.284-1.072.803-1.833.53-.762 1.267-1.175a3.4 3.4 0 0 1 1.674-.414q.917 0 1.664.414a3.7 3.7 0 0 1 1.267 1.175q.53.761.813 1.833.284 1.062.284 2.369 0 1.306-.284 2.379-.284 1.062-.813 1.824a3.7 3.7 0 0 1-1.267 1.166 3.4 3.4 0 0 1-1.664.413 3.4 3.4 0 0 1-1.674-.413 3.9 3.9 0 0 1-1.267-1.166q-.52-.762-.803-1.824-.285-1.073-.284-2.379m1.494 0q0 1.053.189 1.871t.52 1.382q.34.555.804.846.463.292 1.021.292t1.021-.292q.464-.291.794-.846.34-.564.53-1.382a8.4 8.4 0 0 0 .189-1.871q0-1.053-.189-1.871-.19-.818-.53-1.382-.33-.564-.794-.855a1.87 1.87 0 0 0-1.021-.292q-.558 0-1.021.292-.464.291-.804.855-.331.564-.52 1.382a8.4 8.4 0 0 0-.189 1.871m23.665 0q0-1.307.284-2.369.284-1.072.804-1.833.53-.762 1.267-1.175a3.4 3.4 0 0 1 1.673-.414q.918 0 1.665.414.747.413 1.267 1.175.53.761.813 1.833.284 1.062.284 2.369 0 1.306-.284 2.379-.284 1.062-.813 1.824a3.74 3.74 0 0 1-1.267 1.166 3.4 3.4 0 0 1-1.665.413 3.4 3.4 0 0 1-1.673-.413 3.85 3.85 0 0 1-1.267-1.166q-.52-.762-.804-1.824a9.3 9.3 0 0 1-.284-2.379m1.494 0q0 1.053.19 1.871.189.818.52 1.382.34.555.803.846.464.292 1.021.292.558 0 1.022-.292.463-.291.794-.846.34-.564.529-1.382a8.3 8.3 0 0 0 .19-1.871q0-1.053-.19-1.871-.189-.818-.529-1.382-.331-.564-.794-.855a1.9 1.9 0 0 0-1.022-.292q-.557 0-1.021.292-.464.291-.803.855-.331.564-.52 1.382a8.3 8.3 0 0 0-.19 1.871m17.402-2.125q0-.498-.17-.911a2 2 0 0 0-.482-.724 2.2 2.2 0 0 0-.756-.47 2.8 2.8 0 0 0-.993-.17q-.54 0-.984.151-.435.15-.747.432a1.9 1.9 0 0 0-.482.677q-.17.395-.17.874 0 .489.161.894.17.395.472.677.312.282.747.441.445.151 1.003.151.52 0 .964-.141.445-.15.757-.414a2 2 0 0 0 .501-.639q.18-.377.179-.828m-5.351 6.525q1.305-.066 2.269-.404.974-.348 1.645-.921a4.2 4.2 0 0 0 1.05-1.373 5.7 5.7 0 0 0 .52-1.749 3.4 3.4 0 0 1-1.22.997q-.71.338-1.522.338a4.1 4.1 0 0 1-1.456-.254 3.5 3.5 0 0 1-1.163-.714 3.4 3.4 0 0 1-.776-1.119 3.8 3.8 0 0 1-.274-1.467q0-.76.274-1.41.284-.648.785-1.119.51-.47 1.22-.733a4.6 4.6 0 0 1 1.598-.263q.5 0 .974.113.482.112.907.348.426.225.776.573.358.339.633.799.36.611.539 1.392.189.77.189 1.795 0 .752-.16 1.523-.151.762-.492 1.476-.34.707-.879 1.335a5.6 5.6 0 0 1-1.286 1.1 7 7 0 0 1-1.731.771q-.983.293-2.222.348a.5.5 0 0 1-.359-.122q-.142-.122-.18-.508-.037-.423.057-.583a.33.33 0 0 1 .284-.169m11.908.263a.67.67 0 0 1-.284-.376q-.056-.225.142-.554.199-.33.426-.386a.52.52 0 0 1 .444.104q.595.422 1.305.686.718.254 1.456.254.587 0 1.05-.169.463-.18.785-.499.321-.328.491-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.718-.489 2.5 2.5 0 0 0-.965-.179q-.681 0-1.182.179a4 4 0 0 0-.964.489q-.152.093-.473.094-.397 0-.567-.141-.161-.141-.142-.47l.189-4.701q.019-.33.161-.47.151-.141.548-.141h5.049q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018q.454-.253.955-.385.511-.141 1.078-.141.861 0 1.541.282.691.273 1.163.78.474.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.283 1.533 3.5 3.5 0 0 1-.795 1.213 3.8 3.8 0 0 1-1.257.799 4.5 4.5 0 0 1-1.655.291q-.926 0-1.844-.301a6.7 6.7 0 0 1-1.645-.818m17.014-.366v-2.106h-4.519q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.094-.442l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .634.207.189.197.189.526v5.97h1.532q.321 0 .453.141.142.14.142.499 0 .357-.142.498-.132.141-.453.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.133-.141-.133-.498t.133-.498q.142-.141.463-.141zm.076-8.048-3.309 4.663h3.233z" />
        </g>
        <path
          d="M30.2 42.248a5.2 5.2 0 0 1-2.071-.41 5.1 5.1 0 0 1-1.64-1.133 5.3 5.3 0 0 1-1.094-1.66 5.3 5.3 0 0 1-.372-1.973q0-1.035.372-1.972a5.3 5.3 0 0 1 1.093-1.66 5.3 5.3 0 0 1 1.64-1.172 5 5 0 0 1 2.071-.43q1.113 0 1.797.352.704.351 1.113.683v2.285a5 5 0 0 0-1.152-.625q-.625-.255-1.543-.254-.742 0-1.387.371-.624.372-.996.997a2.74 2.74 0 0 0-.37 1.425q0 .801.35 1.426.352.626.977.996.645.351 1.426.352.918 0 1.543-.254.645-.254 1.152-.606v2.266q-.41.351-1.113.683-.684.313-1.797.313m4.716-.293v-9.863h2.48v9.863zm2.48-5.508v-2.5a5.6 5.6 0 0 1 1.192-1.465q.703-.585 1.582-.585.547 0 .957.175v2.793a2.2 2.2 0 0 0-.625-.254 2.3 2.3 0 0 0-.683-.097q-.84 0-1.426.566-.567.547-.996 1.367m9.855 5.801q-1.094 0-2.051-.371a5.6 5.6 0 0 1-1.7-1.074 4.9 4.9 0 0 1-1.132-1.621 5.1 5.1 0 0 1-.41-2.051q0-1.446.644-2.637a5.1 5.1 0 0 1 1.778-1.934q1.132-.722 2.578-.722t2.48.625A4.05 4.05 0 0 1 51.04 34.2q.566 1.095.566 2.54v1.054h-7.363v-1.7h4.98q-.039-.722-.39-1.171a2.1 2.1 0 0 0-.86-.684 2.5 2.5 0 0 0-1.074-.234q-.762 0-1.328.39-.545.391-.86 1.094-.312.704-.312 1.64 0 .84.371 1.485.372.645 1.035 1.016.684.37 1.543.371 1.094 0 1.954-.43.879-.43 1.386-.879v2.305a4.2 4.2 0 0 1-.82.567 5.7 5.7 0 0 1-1.211.488 5 5 0 0 1-1.406.195m9.951 0q-1.17 0-2.187-.605-.996-.606-1.621-1.758-.606-1.153-.606-2.793 0-1.66.606-2.832.625-1.172 1.66-1.797a4.5 4.5 0 0 1 2.324-.625q.82 0 1.621.371a3.95 3.95 0 0 1 1.367.996v-5.312h2.48v14.062h-2.48v-1.66a4.1 4.1 0 0 1-1.25 1.387q-.82.566-1.914.566m.625-2.48a2.3 2.3 0 0 0 1.23-.352q.586-.351.958-.996.37-.645.351-1.523V35.49a4 4 0 0 0-1.152-.879 2.7 2.7 0 0 0-1.328-.332q-.78 0-1.348.41-.546.39-.86 1.036a3 3 0 0 0-.312 1.367q0 .722.313 1.348.312.605.86.976.566.351 1.288.352m9.698-9.454q-.703 0-1.21-.507-.51-.509-.509-1.172 0-.703.508-1.192a1.7 1.7 0 0 1 1.211-.488q.469 0 .86.235.39.215.624.605.235.37.235.84 0 .43-.235.82t-.625.625a1.64 1.64 0 0 1-.859.235m-.996 11.641v-9.863h2.48v9.863zm-1.582-7.754v-2.11h4.062v2.11zm10.81 8.047q-.878 0-1.6-.39a2.9 2.9 0 0 1-1.114-1.094q-.41-.723-.41-1.7v-4.902h-1.64v-1.27q.956-.33 1.562-1.23.624-.899 1.093-2.246h1.465v2.676h2.969v2.07h-2.969v4.258q0 .664.332 1.055.352.37 1.016.37.586 0 1.016-.175.43-.176.761-.371v2.11q-.351.37-.996.605-.624.234-1.484.234m70.576-2.101a4.7 4.7 0 0 1-1.772-.334 4.8 4.8 0 0 1-1.452-.95 4.5 4.5 0 0 1-.963-1.44 4.5 4.5 0 0 1-.347-1.772q0-.95.347-1.773a4.3 4.3 0 0 1 .963-1.425q.63-.617 1.452-.95a4.5 4.5 0 0 1 1.772-.348q.887 0 1.478.244.603.244 1.053.643v1.49a16 16 0 0 0-.642-.45 4 4 0 0 0-.797-.398q-.45-.18-1.066-.18a3.1 3.1 0 0 0-1.593.411q-.706.41-1.117 1.13a3.13 3.13 0 0 0-.411 1.606q0 .9.411 1.606.41.705 1.117 1.13a3.1 3.1 0 0 0 1.593.411q.938 0 1.593-.308a6 6 0 0 0 1.117-.668v1.387q-.449.398-1.156.668-.693.27-1.58.27m4.143-.193v-6.448h1.285v6.448zm1.285-3.776v-1.413a3.5 3.5 0 0 1 .847-1.002q.501-.386 1.066-.386.373 0 .656.129v1.464a2 2 0 0 0-.399-.18 1.5 1.5 0 0 0-.436-.064q-.617 0-1.015.424a5.4 5.4 0 0 0-.719 1.028m6.57 3.969q-.72 0-1.349-.257a3.35 3.35 0 0 1-1.798-1.785 3.4 3.4 0 0 1-.257-1.324q0-.924.411-1.695a3.24 3.24 0 0 1 1.131-1.246 2.9 2.9 0 0 1 1.631-.475q.977 0 1.644.41.667.412 1.002 1.131.347.706.347 1.619v.655h-4.971v-.99h3.725q-.053-.564-.321-.924a1.63 1.63 0 0 0-.643-.54 1.8 1.8 0 0 0-.796-.18q-.566 0-.989.309a2 2 0 0 0-.642.796 2.7 2.7 0 0 0-.232 1.13q0 .591.257 1.08.27.487.758.783.488.295 1.118.295.707 0 1.284-.32.591-.335.976-.694v1.284a2.7 2.7 0 0 1-.539.424 3.4 3.4 0 0 1-.796.36q-.45.153-.951.154m6.635 0a2.8 2.8 0 0 1-1.478-.411 3.06 3.06 0 0 1-1.078-1.156q-.399-.758-.399-1.773 0-1.065.399-1.837a2.95 2.95 0 0 1 2.671-1.605q.54 0 1.092.257.566.256.951.693v-3.61h1.284v9.25h-1.284v-1.093a2.9 2.9 0 0 1-.874.9 2.2 2.2 0 0 1-1.284.385m.269-1.272q.526 0 .951-.27.436-.282.694-.77.256-.501.244-1.143v-1.118a3.2 3.2 0 0 0-.822-.68 1.85 1.85 0 0 0-.977-.258 1.84 1.84 0 0 0-1.066.309 2.1 2.1 0 0 0-.681.809 2.4 2.4 0 0 0-.231 1.053q0 .566.231 1.04.245.476.668.758.425.27.989.27m6.173-6.64a.92.92 0 0 1-.694-.296.94.94 0 0 1-.283-.668q0-.386.283-.668a.92.92 0 0 1 .694-.295q.269 0 .488.14a1 1 0 0 1 .347.348.86.86 0 0 1 .141.475.9.9 0 0 1-.141.475 1.1 1.1 0 0 1-.347.36.95.95 0 0 1-.488.128m-.501 7.72v-6.449h1.284v6.448zm-1.028-5.293v-1.156h2.312v1.156zm6.789 5.485q-.552 0-.976-.232a1.8 1.8 0 0 1-.668-.667q-.244-.437-.244-1.028v-3.57h-1.169v-.528a2.27 2.27 0 0 0 1.04-.873q.424-.63.732-1.554h.681v1.811h2.03v1.143h-2.03v3.378q0 .412.244.655.256.232.681.232.385 0 .681-.103a3 3 0 0 0 .514-.218v1.104a1.6 1.6 0 0 1-.63.334 3 3 0 0 1-.886.116m10.174-.052q-.54 0-1.144-.051a16 16 0 0 1-1.156-.116 13 13 0 0 1-.963-.167v-8.297q.693-.154 1.49-.232a15 15 0 0 1 1.631-.09q.976 0 1.696.322.719.308 1.104.86.399.54.399 1.246 0 .642-.36 1.156a2.35 2.35 0 0 1-.874.77q.386.09.745.335.373.231.617.642t.244 1.028q0 .72-.411 1.31t-1.182.938q-.77.346-1.836.346m-.026-1.271q.874 0 1.438-.373.566-.372.566-.989 0-.642-.566-.95-.565-.321-1.387-.322h-2.119v-1.143h2.119q.784 0 1.195-.398.424-.398.424-.95a1 1 0 0 0-.257-.694 1.5 1.5 0 0 0-.655-.424 2.5 2.5 0 0 0-.899-.154q-.489 0-.912.039a6 6 0 0 0-.784.102v6.102q.282.051.629.09.347.038.668.05.334.014.54.014m7.315 1.323a2.8 2.8 0 0 1-1.477-.411 3.06 3.06 0 0 1-1.079-1.156q-.398-.758-.398-1.773 0-1.065.398-1.837a2.95 2.95 0 0 1 1.105-1.181 3 3 0 0 1 1.567-.424q.538 0 1.092.257.564.256.95.693v-.809h1.285v6.448h-1.285v-1.092a2.9 2.9 0 0 1-.873.9 2.2 2.2 0 0 1-1.285.385m.27-1.272q.527 0 .95-.27.438-.282.694-.77.257-.501.244-1.143v-1.118a3.4 3.4 0 0 0-.822-.694 1.84 1.84 0 0 0-.976-.257q-.617 0-1.066.309a2.1 2.1 0 0 0-.681.809q-.231.502-.231 1.066 0 .566.231 1.04.244.476.668.758.424.27.989.27m9.409 1.08v-3.79q0-.772-.347-1.156-.346-.386-1.027-.386-.476 0-.938.347-.45.334-.796.784v-1.272q.206-.256.513-.514.309-.255.694-.424.399-.18.835-.18.655.001 1.195.296.539.282.847.874.321.59.321 1.477v3.943zm-4.393 0v-6.449h1.285v6.448zm8.343-1.684v-1.464l3.288-3.301h1.645zm-.976 1.683v-9.248h1.284v9.248zm4.444 0-2.659-3.25.822-.899 3.456 4.15z"
          fill="#667085"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M129.571 45.8V27.028h.969v18.774z"
          fill="#D0D5DD"
        />
        <path
          d="M28.39 64.082h32.92c1.88 0 3.398 1.514 3.398 3.376v21.306c0 1.861-1.518 3.376-3.398 3.376H28.39c-1.88 0-3.399-1.514-3.399-3.376V67.458c0-1.804 1.426-3.28 3.224-3.371z"
          fill="#fff"
          stroke="#667085"
          strokeWidth={0.95}
        />
        <mask
          id="g"
          style={{
            maskType: "alpha",
          }}
          maskUnits="userSpaceOnUse"
          x={24}
          y={63}
          width={42}
          height={30}
        >
          <path
            d="M24.517 67.458c0-2.126 1.734-3.85 3.873-3.85h32.92c2.14 0 3.873 1.724 3.873 3.85v21.306c0 2.127-1.734 3.85-3.873 3.85H28.39c-2.14 0-3.873-1.723-3.873-3.85z"
            fill="#98A2B3"
          />
        </mask>
        <g mask="url(#g)" fillRule="evenodd" clipRule="evenodd" fill="#667085">
          <path d="M24.274 67.205c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M24.274 75.118c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.723a.724.724 0 0 0-.726.723v5.985c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.723z" />
          <path d="M38.42 74.239c0-.665.542-1.204 1.21-1.204h13.092c.669 0 1.21.539 1.21 1.204v.272c0 .664-.541 1.203-1.21 1.203h-.715a.724.724 0 0 0-.726.722v6.425c0 .665-.542 1.204-1.21 1.204H36.977c-.669 0-1.21-.54-1.21-1.204v-.711c0-.665.541-1.204 1.21-1.204h.716a.724.724 0 0 0 .726-.722zm1.21-.723a.724.724 0 0 0-.726.723v5.985c0 .665-.542 1.204-1.21 1.204h-.716a.724.724 0 0 0-.726.722v.711c0 .399.325.722.726.722H50.07a.724.724 0 0 0 .727-.722v-6.425c0-.665.541-1.203 1.21-1.203h.715a.724.724 0 0 0 .727-.722v-.272a.724.724 0 0 0-.727-.723z" />
          <path d="M24.274 83.028c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.722zm27.964-15.101c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M53.448 75.118c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.723a.724.724 0 0 0-.726.723v5.985c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.723z" />
          <path d="M53.448 83.028c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.722z" />
        </g>
      </g>
      <defs>
        <filter
          id="a"
          x={0.383}
          y={0.105}
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
            result="effect1_dropShadow_8_45162"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45162"
            result="shape"
          />
        </filter>
        <filter
          id="d"
          x={25.046}
          y={156.734}
          width={176.366}
          height={8.339}
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
            result="effect1_dropShadow_8_45162"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45162"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45162" />
        </filter>
        <filter
          id="e"
          x={172.926}
          y={131.75}
          width={33.342}
          height={9.484}
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
            result="effect1_dropShadow_8_45162"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45162"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45162" />
        </filter>
        <filter
          id="f"
          x={38.95}
          y={106.123}
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
            result="effect1_dropShadow_8_45162"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45162"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45162" />
        </filter>
        <linearGradient
          id="b"
          x1={4.179}
          y1={184.909}
          x2={164.293}
          y2={-83.482}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={1} stopColor="#fff" />
        </linearGradient>
        <clipPath id="c">
          <path fill="#fff" d="M268.518 23.174h20.333v25.031h-20.333z" />
        </clipPath>
      </defs>
    </svg>
  )
}

const CreditCardExpirationDate = (props: React.SVGProps<SVGSVGElement>) => {
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
        <rect
          x={4.184}
          y={2.91}
          width={305}
          height={181.955}
          rx={11.402}
          fill="url(#b)"
        />
        <rect
          x={5.184}
          y={3.91}
          width={303}
          height={179.955}
          rx={10.402}
          stroke="#EAECF0"
          strokeWidth={2}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M270.35 164.569c10.217 0 18.499-8.12 18.499-18.137s-8.282-18.137-18.499-18.137c-4.58 0-8.77 1.631-12.001 4.333a18.64 18.64 0 0 0-11.999-4.333c-10.218 0-18.5 8.12-18.5 18.137s8.282 18.137 18.5 18.137c4.579 0 8.769-1.631 12-4.333a18.64 18.64 0 0 0 12 4.333"
          fill="#98A2B3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.35 160.236c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.499-13.804a18.64 18.64 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.579 0-8.77-1.631-12-4.333"
          fill="#EAECF0"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M258.349 160.237c3.978-3.326 6.5-8.276 6.5-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.499 8.277-6.499 13.804s2.522 10.478 6.499 13.804"
          fill="#D0D5DD"
        />
        <g clipPath="url(#c)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M283.305 23.386c.6-.334 1.358-.12 1.694.476a24 24 0 0 1 3.077 11.779c0 4.133-1.06 8.195-3.077 11.779a1.25 1.25 0 0 1-1.694.476 1.234 1.234 0 0 1-.479-1.685 21.57 21.57 0 0 0 2.76-10.57c0-3.713-.953-7.359-2.76-10.57a1.234 1.234 0 0 1 .479-1.685m-4.793 2.459a1.25 1.25 0 0 1 1.694.476 19 19 0 0 1 2.435 9.32c0 3.27-.839 6.484-2.435 9.32a1.25 1.25 0 0 1-1.694.476 1.235 1.235 0 0 1-.479-1.684 16.54 16.54 0 0 0 2.118-8.112c0-2.85-.731-5.648-2.118-8.112a1.235 1.235 0 0 1 .479-1.684m-4.57 2.254a1.25 1.25 0 0 1 1.692.484 14.34 14.34 0 0 1 1.802 6.969 14.34 14.34 0 0 1-1.802 6.969 1.25 1.25 0 0 1-1.692.483 1.234 1.234 0 0 1-.486-1.682 11.9 11.9 0 0 0 1.49-5.77 11.9 11.9 0 0 0-1.49-5.77 1.234 1.234 0 0 1 .486-1.683m-4.644 2.477a1.25 1.25 0 0 1 1.72.375 8.65 8.65 0 0 1 1.386 4.69c0 1.66-.481 3.286-1.386 4.69a1.25 1.25 0 0 1-1.72.375 1.234 1.234 0 0 1-.377-1.71 6.2 6.2 0 0 0 .993-3.355 6.2 6.2 0 0 0-.993-3.355 1.234 1.234 0 0 1 .377-1.71"
            fill="#667085"
          />
        </g>
        <rect
          x={20.295}
          y={151.941}
          width={185.868}
          height={17.603}
          rx={2.375}
          fill="#fff"
          fillOpacity={0.01}
        />
        <g filter="url(#d)" fill="#667085">
          <path d="M26.204 157.731h-.741q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h3.117q.781 0 1.424.27.641.27 1.098.777.457.5.708 1.224.252.724.252 1.638 0 .915-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263h-3.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.572q.338-.382.523-.942a4.2 4.2 0 0 0 .185-1.303q0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm5.612-3.008q0-.914.252-1.658.251-.75.708-1.283a3.1 3.1 0 0 1 1.099-.823q.642-.29 1.423-.29.78 0 1.423.29a3.1 3.1 0 0 1 1.099.823q.456.533.708 1.283.25.744.251 1.658 0 .915-.251 1.665a3.8 3.8 0 0 1-.708 1.277q-.457.526-1.1.816-.641.29-1.422.29t-1.423-.29a3.15 3.15 0 0 1-1.099-.816 3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.18.565.496.967.318.395.768.612.45.211 1 .211t1-.211q.45-.217.767-.612.318-.402.49-.967.178-.573.178-1.284 0-.71-.178-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.612 2.3 2.3 0 0 0-1-.218q-.548 0-.999.218-.45.21-.767.612a3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m8.704-3.014h-.51q-.225 0-.325-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.1.349q-.092.098-.317.098h-.377v6.673a.35.35 0 0 1-.12.277q-.119.112-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm10.244 6.022q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.21q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.37l2.191-6.022h-1.237q-.225 0-.325-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.325-.099h2.429q.264 0 .423.099.165.099.245.329l2.337 6.489h.403q.225 0 .318.099.1.098.1.348t-.1.349q-.093.099-.318.099h-2.343q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.894l-.543-1.566h-3.21l-.55 1.566zm.06-2.461h2.595l-1.231-3.561h-.126zm8.206-3.561h-1.072q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h3.667q.225 0 .318.099.1.099.1.349t-.1.349q-.093.098-.318.098h-1.601v6.022h3.276v-2.165q0-.23.106-.329.113-.099.39-.099.279 0 .384.099.113.099.113.329v2.612q0 .25-.1.349-.092.099-.317.099h-5.918q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.073zm8.611 0h-.741q-.225 0-.325-.098-.092-.1-.092-.349 0-.25.092-.349.1-.099.325-.099h3.117q.78 0 1.423.27.642.27 1.1.777.456.5.707 1.224.252.724.252 1.638 0 .915-.252 1.639a3.6 3.6 0 0 1-.708 1.231q-.456.5-1.099.77a3.7 3.7 0 0 1-1.423.263H70.17q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.741zm2.224 6.022q.59 0 1.066-.191a2.2 2.2 0 0 0 .814-.572q.338-.382.523-.942.185-.565.185-1.303 0-.737-.185-1.296a2.7 2.7 0 0 0-.523-.948 2.1 2.1 0 0 0-.814-.572 2.8 2.8 0 0 0-1.066-.198h-1.231v6.022zm15.791-6.022h-.874q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.1-.099.325-.099h5.983q.225 0 .318.099.099.099.099.349v1.737q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.099-.106-.329v-1.29h-3.54v2.573h1.655v-.598q0-.231.106-.329.113-.099.39-.099.279 0 .384.099.113.098.113.329v2.092q0 .231-.113.329-.105.099-.384.099-.278 0-.39-.099-.106-.098-.106-.329v-.599H89.92v2.554h1.536q.225 0 .317.099.1.098.1.348t-.1.349q-.093.099-.317.099h-3.403q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.1-.099.325-.099h.873zm9.14 0h-1.072q-.225 0-.325-.098-.092-.1-.092-.349 0-.25.093-.349.099-.099.324-.099h3.667q.225 0 .317.099.1.099.1.349t-.1.349q-.092.098-.317.098h-1.602v6.022h3.276v-2.165q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.099.112.329v2.612q0 .25-.099.349-.093.099-.318.099h-5.917q-.225 0-.325-.099-.092-.099-.092-.349t.093-.348q.099-.099.324-.099h1.072zm10.49 0h-1.694q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h4.382q.225 0 .317.099.1.099.1.349t-.1.349q-.092.098-.317.098h-1.695v6.022h1.827q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.647q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.827zm6.764 0h-.51q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h1.483q.272 0 .377.184l3.138 5.581v-4.87h-.775q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h2.145q.225 0 .318.099.099.099.099.349t-.099.349q-.093.098-.318.098h-.377v6.673a.35.35 0 0 1-.12.277q-.119.112-.377.112a.53.53 0 0 1-.324-.099.8.8 0 0 1-.232-.263l-3.435-6.101v5.423h.907q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.343q-.225 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.443zm14.581 6.2q-.629.433-1.351.651-.72.211-1.482.211a3.4 3.4 0 0 1-1.417-.29 3.1 3.1 0 0 1-1.072-.816 3.8 3.8 0 0 1-.688-1.277 5.5 5.5 0 0 1-.239-1.665q0-.914.245-1.658.252-.75.702-1.283.456-.534 1.086-.823.629-.29 1.383-.29.642 0 1.118.218.477.21.801.592v-.382q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.099-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.576-.355 2.3 2.3 0 0 0-.827-.132 2.24 2.24 0 0 0-1.761.83 3 3 0 0 0-.496.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.171.565.476.967.312.395.748.612.444.211.98.211.662 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.138.23.112.401-.026.165-.198.29m3.335-6.2h-.477q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h2.079q.225 0 .317.099.1.099.1.349t-.1.349q-.092.098-.317.098h-.609v2.442h3.296v-2.442h-.609q-.225 0-.324-.098-.093-.1-.093-.349 0-.25.093-.349.099-.099.324-.099h2.078q.225 0 .318.099.099.099.099.349t-.099.349q-.093.098-.318.098h-.476v6.022h.476q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-2.078q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.609v-2.685h-3.296v2.685h.609q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.079q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h.477zm23.489 6.2a4.8 4.8 0 0 1-1.35.651 5.3 5.3 0 0 1-1.483.211q-.781 0-1.416-.29a3.05 3.05 0 0 1-1.073-.816 3.9 3.9 0 0 1-.688-1.277 5.5 5.5 0 0 1-.238-1.665q0-.914.244-1.658.252-.75.702-1.283.457-.534 1.086-.823.629-.29 1.383-.29.642 0 1.119.218.476.21.8.592v-.382q0-.23.106-.329.113-.099.391-.099.277 0 .384.099.112.1.112.329v2.172q0 .23-.112.329-.107.099-.384.099-.278 0-.391-.099-.106-.099-.106-.329 0-.322-.112-.619a1.35 1.35 0 0 0-.338-.52 1.6 1.6 0 0 0-.575-.355 2.4 2.4 0 0 0-.828-.132 2.24 2.24 0 0 0-1.76.83 3 3 0 0 0-.497.974 4.2 4.2 0 0 0-.179 1.276q0 .711.166 1.284.172.565.476.967.312.395.748.612.444.211.98.211.661 0 1.251-.185a3.5 3.5 0 0 0 1.072-.559.4.4 0 0 1 .291-.092q.16.013.305.257.14.23.112.401-.026.165-.198.29m2.494-3.186q0-.914.252-1.658.252-.75.708-1.283.457-.534 1.099-.823.642-.29 1.423-.29t1.423.29 1.099.823q.456.533.708 1.283.252.744.252 1.658 0 .915-.252 1.665a3.8 3.8 0 0 1-.708 1.277 3.2 3.2 0 0 1-1.099.816q-.642.29-1.423.29t-1.423-.29a3.2 3.2 0 0 1-1.099-.816 3.8 3.8 0 0 1-.708-1.277 5.2 5.2 0 0 1-.252-1.665m1.046 0q0 .711.172 1.284.179.565.497.967.317.395.768.612.45.211.999.211t.999-.211q.45-.217.768-.612.318-.402.49-.967.179-.573.179-1.284 0-.71-.179-1.276a2.9 2.9 0 0 0-.49-.974 2.1 2.1 0 0 0-.768-.612 2.3 2.3 0 0 0-.999-.218q-.549 0-.999.218-.45.21-.768.612a3 3 0 0 0-.497.974 4.4 4.4 0 0 0-.172 1.276m9.067-3.014h-.807q-.225 0-.325-.098-.092-.1-.092-.349 0-.25.092-.349.1-.099.325-.099h3.349q.636 0 1.125.165.49.157.821.447.338.29.51.704.172.408.172.902 0 .381-.133.704a1.7 1.7 0 0 1-.364.573 2.3 2.3 0 0 1-.582.434 3 3 0 0 1-.755.27q.173.079.318.197t.278.264q.165.183.311.401.152.218.278.441.132.218.252.434.119.218.231.402.159.263.325.421.165.158.37.158h.126q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-.463a1 1 0 0 1-.57-.197q-.277-.204-.595-.718a10 10 0 0 1-.258-.447l-.252-.454a7 7 0 0 0-.529-.823 2.2 2.2 0 0 0-.358-.362 1.5 1.5 0 0 0-.39-.23 2 2 0 0 0-.457-.119 3.5 3.5 0 0 0-.549-.039h-.411v2.494h.861q.225 0 .317.099.1.098.1.348t-.1.349q-.092.099-.317.099h-2.661q-.225 0-.325-.099-.092-.099-.092-.349t.092-.348q.1-.099.325-.099h.807zm.993 0v2.633h1.344q.41 0 .741-.073.331-.072.563-.23.231-.157.357-.408.126-.25.126-.599 0-.638-.45-.981-.444-.342-1.271-.342zm9.762 0h-1.767v2.034q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.106-.1-.106-.329v-2.481q0-.25.093-.349.099-.099.324-.099h5.679q.225 0 .318.099.099.099.099.349v2.481q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.105-.1-.106-.329v-2.034h-1.767v6.022h1.562q.225 0 .318.099.099.098.099.348t-.099.349q-.093.099-.318.099h-4.117q-.225 0-.324-.099-.093-.099-.093-.349t.093-.348q.099-.099.324-.099h1.562zm6.996 0h-.675q-.226 0-.325-.098-.093-.1-.092-.349 0-.25.092-.349.1-.099.325-.099h5.784q.226 0 .318.099.099.099.099.349v1.671q0 .231-.112.329-.107.099-.384.099-.278 0-.39-.099-.106-.098-.106-.329v-1.224h-3.541v2.442h1.654v-.599q0-.23.106-.329.112-.099.391-.099.278 0 .384.099.112.099.112.329v2.093q0 .23-.112.329-.107.099-.384.099-.279 0-.391-.099-.106-.1-.106-.329v-.599h-1.654v2.685h3.673v-1.507q0-.23.106-.329.113-.099.39-.099.279 0 .384.099.113.099.113.329v1.954q0 .25-.099.349-.093.099-.318.099h-5.917q-.226 0-.325-.099-.093-.099-.092-.349 0-.25.092-.348.1-.099.325-.099h.675zm13.336 6.022v-1.77q0-.231.106-.329.113-.099.39-.099.279 0 .384.099.113.098.113.329v2.217q0 .25-.099.349-.093.099-.318.099h-5.07q-.225 0-.325-.099-.092-.099-.092-.349a.4.4 0 0 1 .026-.157 1 1 0 0 1 .066-.126l4.362-6.186h-3.322v1.639q0 .23-.113.329-.106.099-.384.099t-.39-.099q-.106-.1-.106-.329v-2.086q0-.25.092-.349.1-.099.325-.099h4.871q.225 0 .318.099.099.099.099.349a.43.43 0 0 1-.066.256l-4.388 6.213z" />
        </g>
        <rect
          x={153.347}
          y={128.058}
          width={63.859}
          height={21.122}
          rx={3.563}
          fill="#fff"
          fillOpacity={0.01}
        />
        <rect
          x={153.347}
          y={128.058}
          width={63.859}
          height={21.122}
          rx={3.563}
          stroke="#306CFE"
          strokeWidth={2.375}
        />
        <path
          d="m161.654 133.996-.824 2.556-.813-2.556h-.731l1.109 3.37h.871l1.119-3.37zm3.255 3.37h.736l-1.269-3.37h-.876l-1.268 3.37h.731l.29-.795h1.37zm-1.419-1.449.446-1.223.445 1.223zm3.349.794v-2.715h-.692v3.37h2.145v-.655zm1.955.655h.693v-3.37h-.693zm2.648-3.37h-1.224v3.37h1.224c.988 0 1.734-.722 1.734-1.685 0-.968-.746-1.685-1.734-1.685m0 2.715h-.532v-2.06h.532c.61 0 1.041.423 1.041 1.03 0 .606-.431 1.03-1.041 1.03m-8.992 3.061h-2.644v.655h.973v2.715h.693v-2.715h.978zm2.699 0v1.319h-1.506v-1.319h-.692v3.37h.692v-1.396h1.506v1.396h.692v-3.37zm3.379 3.37h.852l-.949-1.266c.475-.12.76-.457.76-1.006 0-.669-.43-1.098-1.157-1.098h-1.457v3.37h.692v-1.213h.383zm-1.259-2.715h.688c.358 0 .532.173.532.453 0 .274-.169.447-.532.447h-.688zm4.567-.655v1.969c0 .587-.29.804-.697.804s-.697-.217-.697-.804v-1.969h-.702v2.008c0 .948.6 1.42 1.399 1.42s1.399-.472 1.399-1.42v-2.008z"
          fill="#667085"
        />
        <g filter="url(#e)" fill="#667085">
          <path d="M183.384 138.204q0 .762-.188 1.399a3.3 3.3 0 0 1-.539 1.1 2.5 2.5 0 0 1-.862.717 2.5 2.5 0 0 1-1.14.253q-.642 0-1.146-.253a2.5 2.5 0 0 1-.857-.717 3.4 3.4 0 0 1-.539-1.1 5 5 0 0 1-.187-1.399q0-.761.187-1.399.187-.637.539-1.1a2.44 2.44 0 0 1 2.003-.976 2.46 2.46 0 0 1 2.002.976q.353.463.539 1.1.188.638.188 1.399m-1.521 0q0-1.1-.312-1.647t-.896-.547q-.585 0-.897.547t-.312 1.647.312 1.647q.312.542.897.542.584 0 .896-.542.312-.546.312-1.647m5.855 3.469q-.732 0-1.277-.293a2.56 2.56 0 0 1-.907-.823 2.6 2.6 0 0 1-.363-.83 4.3 4.3 0 0 1-.125-1.066q0-.891.295-1.602.3-.71.885-1.213.59-.502 1.452-.784.869-.287 2.003-.333.147-.004.227.141.085.142.113.463.04.388-.028.57-.063.18-.193.192-.777.039-1.356.169a3.4 3.4 0 0 0-.976.355 1.9 1.9 0 0 0-.629.581q-.232.35-.318.829.312-.343.686-.502a2.3 2.3 0 0 1 .874-.158q.477 0 .874.158.402.153.686.435.29.276.448.665.165.39.165.858 0 .48-.193.885a2.1 2.1 0 0 1-.522.694 2.5 2.5 0 0 1-.805.451 3.1 3.1 0 0 1-1.016.158m-1.084-2.216q0 .191.068.366.075.175.21.305.142.13.341.209.204.078.459.079.244 0 .443-.063a1 1 0 0 0 .34-.186.8.8 0 0 0 .216-.287.9.9 0 0 0 .079-.39q0-.44-.278-.682-.272-.243-.754-.243-.25 0-.46.068a1.1 1.1 0 0 0-.352.18.9.9 0 0 0-.232.283.8.8 0 0 0-.08.361m6.712 3.598a.28.28 0 0 1-.165.142.8.8 0 0 1-.266.045q-.165 0-.341-.051a1 1 0 0 1-.312-.136.54.54 0 0 1-.193-.208q-.061-.119.006-.265l3.756-8.394a.28.28 0 0 1 .164-.141.7.7 0 0 1 .278-.051q.165 0 .335.051.176.045.307.135.136.085.192.209.063.118-.005.271zm9.435-2.718v-.519q0-.096.028-.164a.22.22 0 0 1 .097-.107.45.45 0 0 1 .187-.062q.118-.023.301-.023.363 0 .527.085.165.078.165.271v1.365q0 .196-.085.282-.086.084-.284.084h-4.391a.5.5 0 0 1-.165-.022.22.22 0 0 1-.113-.085.6.6 0 0 1-.063-.18 2 2 0 0 1-.017-.294q0-.231.029-.338a.37.37 0 0 1 .107-.186l2.434-2.33q.227-.22.386-.395t.255-.321q.102-.153.142-.288a1 1 0 0 0 .046-.293.9.9 0 0 0-.222-.621q-.22-.243-.663-.242-.267 0-.517.067a2.4 2.4 0 0 0-.465.169v.79a.4.4 0 0 1-.028.164.26.26 0 0 1-.097.113.6.6 0 0 1-.187.062q-.119.017-.301.017-.363 0-.527-.079a.29.29 0 0 1-.165-.277v-1.337q0-.23.244-.361a4.6 4.6 0 0 1 1.033-.417q.522-.136 1.004-.136.567 0 1.004.153.436.147.732.417.295.271.442.649a2.2 2.2 0 0 1 .154.84q0 .294-.068.559a2 2 0 0 1-.199.508q-.136.247-.34.496-.2.243-.471.502l-1.549 1.484zm5.736-.875h-2.44a.5.5 0 0 1-.165-.022.23.23 0 0 1-.113-.085.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.204.028-.322a.44.44 0 0 1 .079-.18l2.667-3.266q.148-.186.346-.288t.499-.102q.176 0 .29.04a.4.4 0 0 1 .181.101.4.4 0 0 1 .097.164q.028.09.028.203v3.069h.976q.096 0 .164.022a.2.2 0 0 1 .108.091.4.4 0 0 1 .062.174q.023.113.023.294 0 .18-.023.293a.4.4 0 0 1-.062.175.2.2 0 0 1-.108.085.5.5 0 0 1-.164.022h-.976v.931h.806q.096 0 .164.023a.2.2 0 0 1 .108.09.4.4 0 0 1 .062.175q.023.113.023.293t-.023.293a.4.4 0 0 1-.062.175.2.2 0 0 1-.108.085.5.5 0 0 1-.164.022h-3.189a.5.5 0 0 1-.164-.022.22.22 0 0 1-.114-.085.5.5 0 0 1-.062-.175 2 2 0 0 1-.017-.293q0-.18.017-.293a.5.5 0 0 1 .062-.175.22.22 0 0 1 .114-.09.5.5 0 0 1 .164-.023h.965zm.051-1.156.09-1.647-1.333 1.647z" />
        </g>
        <rect
          x={34.199}
          y={101.328}
          width={244.214}
          height={21.106}
          rx={2.375}
          fill="#fff"
          fillOpacity={0.01}
        />
        <g filter="url(#f)" fill="#667085">
          <path d="M39.247 116.563a.67.67 0 0 1-.284-.377q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.596.423 1.304.686.72.254 1.457.254.585 0 1.05-.169.463-.179.784-.499.321-.329.492-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.018-.329.16-.47.151-.141.549-.141h5.049q.321 0 .454.141.141.141.142.498 0 .357-.142.498-.133.141-.454.141h-4.406l-.123 3.018q.453-.253.955-.385.51-.141 1.078-.141.86 0 1.54.282.691.273 1.164.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.75 3.75 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.646-.817m12.599-.066a.63.63 0 0 1-.274-.376q-.047-.226.151-.555.209-.329.435-.376a.5.5 0 0 1 .435.103q.606.451 1.333.724.728.273 1.485.273 1.201 0 1.796-.564.606-.565.606-1.495 0-.987-.624-1.476-.624-.498-1.73-.498h-.691q-.321 0-.463-.141-.133-.141-.133-.499 0-.357.133-.498.141-.141.463-.141h.52q1.087 0 1.636-.451.558-.451.558-1.317 0-.798-.558-1.25-.549-.46-1.58-.461-1.096 0-1.862.367v.63q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-1.025q0-.206.056-.329a.6.6 0 0 1 .199-.207 6 6 0 0 1 1.39-.611 5.8 5.8 0 0 1 1.626-.216q.823 0 1.485.226.662.216 1.134.62.474.405.728.978.256.573.256 1.278 0 .847-.397 1.42a2.76 2.76 0 0 1-1.05.912q.841.348 1.324 1.025.492.677.492 1.664 0 .762-.265 1.401-.255.63-.757 1.09a3.5 3.5 0 0 1-1.22.705q-.727.254-1.654.254-.473 0-.955-.084a7 7 0 0 1-.936-.235 7 7 0 0 1-.88-.376 6 6 0 0 1-.794-.489m16.135.752a.63.63 0 0 1-.35.367 1.04 1.04 0 0 1-.576.047q-.322-.057-.473-.236-.151-.188-.029-.479l3.849-9.355h-4.482v1.373q0 .329-.16.47-.153.141-.55.141-.396 0-.557-.141-.151-.141-.151-.47v-2.012q0-.357.132-.498.141-.141.463-.141h6.373q.322 0 .454.141.142.141.142.498a1.3 1.3 0 0 1-.057.376zm9.006-.686a.67.67 0 0 1-.284-.377q-.056-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104 5.6 5.6 0 0 0 1.305.686q.718.254 1.456.254.585 0 1.05-.169a2.2 2.2 0 0 0 .784-.499q.322-.329.492-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.329.16-.47.151-.141.549-.141h5.05q.32 0 .453.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018q.453-.253.955-.385.51-.141 1.078-.141.86 0 1.541.282.69.273 1.163.78.473.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.284 1.533 3.5 3.5 0 0 1-.794 1.213 3.75 3.75 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291q-.927 0-1.844-.301a6.7 6.7 0 0 1-1.645-.817m29.594-.367v-2.106h-4.52q-.322 0-.463-.141-.133-.141-.133-.498 0-.311.095-.442l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.606-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.321 0 .454.141.142.14.142.499 0 .357-.142.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm12.505 8.048v-2.106h-4.52q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.095-.442l4.576-6.328a1.5 1.5 0 0 1 .435-.423q.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.14.141.499 0 .357-.141.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.142-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm11.379 8.048v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.545a.49.49 0 0 1 .313-.273l3.451-1.232q.303-.103.51.066.208.16.208.517v9.496h2.412q.321 0 .453.141.142.141.142.498t-.142.498q-.132.141-.453.141h-6.373q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm12.58 0v-8.424l-2.345.846a.5.5 0 0 1-.397-.009q-.18-.094-.293-.442-.114-.348-.029-.545a.49.49 0 0 1 .312-.273l3.452-1.232q.302-.103.51.066.208.16.208.517v9.496h2.411q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-6.373q-.32 0-.463-.141-.132-.141-.132-.498t.132-.498q.142-.141.463-.141zm26.285 0v-2.106h-4.52q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.095-.442l4.576-6.328q.198-.282.435-.423.237-.15.605-.15.445 0 .634.207.189.197.189.526v5.97h1.532q.32 0 .454.141.141.14.141.499 0 .357-.141.498-.133.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.132-.141-.133-.498 0-.357.133-.498.141-.141.463-.141zm.075-8.048-3.309 4.663h3.234zm8.07 8.415a.67.67 0 0 1-.284-.377q-.057-.225.142-.554t.425-.386a.52.52 0 0 1 .445.104q.595.423 1.305.686.718.254 1.456.254.586 0 1.049-.169.464-.179.785-.499a2.25 2.25 0 0 0 .492-.771q.17-.45.17-1.006 0-.516-.161-.949a2.1 2.1 0 0 0-.463-.752 1.9 1.9 0 0 0-.719-.489 2.5 2.5 0 0 0-.964-.179q-.681 0-1.182.179a4 4 0 0 0-.965.489q-.15.093-.472.094-.397 0-.568-.141-.16-.141-.142-.47l.19-4.701q.019-.329.16-.47.152-.141.549-.141h5.049q.322 0 .454.141.141.141.142.498 0 .357-.142.498-.132.141-.454.141h-4.406l-.123 3.018q.454-.253.955-.385.51-.141 1.078-.141.86 0 1.541.282.69.273 1.163.78.473.498.719 1.194.255.687.255 1.504 0 .828-.284 1.533a3.5 3.5 0 0 1-.794 1.213 3.75 3.75 0 0 1-1.258.799 4.5 4.5 0 0 1-1.654.291 5.9 5.9 0 0 1-1.844-.301 6.7 6.7 0 0 1-1.645-.817m17.014-.367v-2.106h-4.52q-.322 0-.463-.141-.132-.141-.132-.498 0-.311.094-.442l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .633.207.189.197.189.526v5.97h1.532q.322 0 .454.141.142.14.142.499 0 .357-.142.498-.132.141-.454.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.065q-.322 0-.464-.141-.132-.141-.132-.498t.132-.498q.142-.141.464-.141zm.076-8.048-3.31 4.663h3.234zm7.776 3.751q0-1.307.284-2.369.284-1.071.803-1.833.53-.762 1.267-1.175a3.4 3.4 0 0 1 1.674-.414q.917 0 1.664.414a3.7 3.7 0 0 1 1.267 1.175q.53.762.813 1.833.284 1.062.284 2.369t-.284 2.379q-.284 1.062-.813 1.824a3.7 3.7 0 0 1-1.267 1.166 3.4 3.4 0 0 1-1.664.413 3.4 3.4 0 0 1-1.674-.413 3.9 3.9 0 0 1-1.267-1.166q-.52-.762-.803-1.824-.285-1.072-.284-2.379m1.494 0q0 1.053.189 1.871t.52 1.382q.34.555.804.846.463.292 1.021.292t1.021-.292q.464-.291.794-.846.34-.564.53-1.382a8.4 8.4 0 0 0 .189-1.871q0-1.053-.189-1.871-.19-.818-.53-1.382-.33-.564-.794-.855a1.9 1.9 0 0 0-1.021-.292q-.558 0-1.021.292-.464.291-.804.855-.331.564-.52 1.382a8.4 8.4 0 0 0-.189 1.871m23.665 0q0-1.307.284-2.369.284-1.071.804-1.833.53-.762 1.267-1.175a3.4 3.4 0 0 1 1.673-.414q.918 0 1.665.414.747.413 1.267 1.175.53.762.813 1.833.284 1.062.284 2.369t-.284 2.379q-.284 1.062-.813 1.824a3.74 3.74 0 0 1-1.267 1.166 3.4 3.4 0 0 1-1.665.413 3.4 3.4 0 0 1-1.673-.413 3.85 3.85 0 0 1-1.267-1.166q-.52-.762-.804-1.824a9.3 9.3 0 0 1-.284-2.379m1.494 0q0 1.053.19 1.871.189.819.52 1.382.34.555.803.846.464.292 1.021.292.558 0 1.022-.292.463-.291.794-.846.34-.564.529-1.382a8.3 8.3 0 0 0 .19-1.871q0-1.053-.19-1.871-.189-.818-.529-1.382-.331-.564-.794-.855a1.9 1.9 0 0 0-1.022-.292q-.557 0-1.021.292-.464.291-.803.855-.331.564-.52 1.382a8.3 8.3 0 0 0-.19 1.871m17.402-2.124a2.4 2.4 0 0 0-.17-.912 2.05 2.05 0 0 0-.482-.724 2.2 2.2 0 0 0-.756-.47 2.8 2.8 0 0 0-.993-.17q-.54 0-.984.151-.435.15-.747.432a1.9 1.9 0 0 0-.482.677q-.17.395-.17.875 0 .488.161.893.17.395.472.677.312.282.747.441.445.151 1.003.151.52 0 .964-.141.445-.15.757-.414a2 2 0 0 0 .501-.639q.18-.377.179-.827m-5.351 6.524q1.305-.065 2.269-.404.974-.348 1.645-.921a4.2 4.2 0 0 0 1.05-1.373 5.7 5.7 0 0 0 .52-1.749 3.4 3.4 0 0 1-1.22.997q-.71.338-1.522.338a4.1 4.1 0 0 1-1.456-.253 3.5 3.5 0 0 1-1.163-.715 3.4 3.4 0 0 1-.776-1.119 3.8 3.8 0 0 1-.274-1.466q0-.762.274-1.411a3.4 3.4 0 0 1 .785-1.118 3.7 3.7 0 0 1 1.22-.734 4.6 4.6 0 0 1 1.598-.263 4.2 4.2 0 0 1 .974.113q.482.112.907.348.426.225.776.573.358.339.633.799.36.611.539 1.392.189.77.189 1.795 0 .753-.16 1.523a6.3 6.3 0 0 1-.492 1.477q-.34.705-.879 1.335-.53.62-1.286 1.1a7.2 7.2 0 0 1-1.731.77q-.983.292-2.222.348a.5.5 0 0 1-.359-.122q-.142-.122-.18-.508-.037-.423.057-.582a.33.33 0 0 1 .284-.17m11.908.264a.68.68 0 0 1-.284-.377q-.056-.225.142-.554.199-.33.426-.386a.52.52 0 0 1 .444.104q.595.423 1.305.686.718.254 1.456.254.587 0 1.05-.169.463-.179.785-.499.321-.329.491-.771.17-.45.17-1.006 0-.516-.16-.949a2.1 2.1 0 0 0-.464-.752 1.9 1.9 0 0 0-.718-.489 2.5 2.5 0 0 0-.965-.179q-.681 0-1.182.179a4 4 0 0 0-.964.489q-.152.093-.473.094-.397 0-.567-.141-.161-.141-.142-.47l.189-4.701q.019-.329.161-.47.151-.141.548-.141h5.049q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.406l-.123 3.018q.454-.253.955-.385.511-.141 1.078-.141.861 0 1.541.282.691.273 1.163.78.474.498.719 1.194.255.687.255 1.504a4.1 4.1 0 0 1-.283 1.533 3.5 3.5 0 0 1-.795 1.213 3.7 3.7 0 0 1-1.257.799 4.5 4.5 0 0 1-1.655.291q-.926 0-1.844-.301a6.7 6.7 0 0 1-1.645-.817m17.014-.367v-2.106h-4.519q-.322 0-.464-.141-.132-.141-.132-.498 0-.311.094-.442l4.577-6.328q.198-.282.435-.423.236-.15.605-.15.444 0 .634.207.189.197.189.526v5.97h1.532q.321 0 .453.141.142.14.142.499 0 .357-.142.498-.132.141-.453.141h-1.532v2.106h1.248q.322 0 .454.141.142.141.142.498t-.142.498q-.132.141-.454.141h-4.066q-.322 0-.463-.141-.133-.141-.133-.498t.133-.498q.142-.141.463-.141zm.076-8.048-3.309 4.663h3.233z" />
        </g>
        <path
          d="M30.2 41.494a5.2 5.2 0 0 1-2.071-.41 5.1 5.1 0 0 1-1.64-1.133 5.3 5.3 0 0 1-1.094-1.66 5.3 5.3 0 0 1-.372-1.973q0-1.035.372-1.972a5.3 5.3 0 0 1 1.093-1.66 5.3 5.3 0 0 1 1.64-1.172 5 5 0 0 1 2.071-.43q1.113 0 1.797.352.704.351 1.113.683v2.285a5 5 0 0 0-1.152-.625q-.625-.254-1.543-.254-.742 0-1.387.372-.624.37-.996.996a2.74 2.74 0 0 0-.37 1.425q0 .802.35 1.426.352.626.977.996.645.352 1.426.352.918 0 1.543-.254.645-.254 1.152-.606v2.266q-.41.351-1.113.684-.684.312-1.797.312m4.716-.293v-9.863h2.48V41.2zm2.48-5.508v-2.5a5.6 5.6 0 0 1 1.192-1.464q.703-.586 1.582-.586.547 0 .957.175v2.793a2.2 2.2 0 0 0-.625-.254 2.3 2.3 0 0 0-.683-.097q-.84 0-1.426.566-.567.547-.996 1.367m9.855 5.801q-1.094 0-2.051-.371a5.6 5.6 0 0 1-1.7-1.074 4.9 4.9 0 0 1-1.132-1.621 5.1 5.1 0 0 1-.41-2.051q0-1.446.644-2.637a5.1 5.1 0 0 1 1.778-1.933q1.132-.723 2.578-.723t2.48.625a4.05 4.05 0 0 1 1.602 1.738q.566 1.094.566 2.54v1.054h-7.363v-1.7h4.98q-.039-.722-.39-1.171a2.1 2.1 0 0 0-.86-.684 2.5 2.5 0 0 0-1.074-.234q-.762 0-1.328.39-.545.392-.86 1.094-.312.704-.312 1.641 0 .84.371 1.484.372.645 1.035 1.016.684.37 1.543.371 1.094 0 1.954-.43.879-.43 1.386-.878v2.304a4.2 4.2 0 0 1-.82.566 5.7 5.7 0 0 1-1.211.489 5 5 0 0 1-1.406.195m9.951 0q-1.17 0-2.187-.605-.996-.606-1.621-1.758-.606-1.153-.606-2.793 0-1.66.606-2.832.625-1.172 1.66-1.797a4.5 4.5 0 0 1 2.324-.625q.82 0 1.621.371a3.95 3.95 0 0 1 1.367.996V27.14h2.48V41.2h-2.48v-1.66a4.1 4.1 0 0 1-1.25 1.387q-.82.566-1.914.566m.625-2.48a2.3 2.3 0 0 0 1.23-.352q.586-.351.958-.996.37-.644.351-1.523v-1.407a4 4 0 0 0-1.152-.879 2.7 2.7 0 0 0-1.328-.332q-.78 0-1.348.41-.546.391-.86 1.036a3 3 0 0 0-.312 1.367q0 .722.313 1.347.312.606.86.977.566.352 1.288.352m9.698-9.454q-.703 0-1.21-.507-.51-.509-.509-1.172 0-.703.508-1.192a1.7 1.7 0 0 1 1.211-.488q.469 0 .86.235.39.215.624.605.235.37.235.84 0 .43-.235.82t-.625.625a1.64 1.64 0 0 1-.859.235m-.996 11.641v-9.863h2.48V41.2zm-1.582-7.754v-2.11h4.062v2.11zm10.81 8.047q-.878 0-1.6-.39a2.9 2.9 0 0 1-1.114-1.094q-.41-.722-.41-1.7v-4.902h-1.64v-1.27q.956-.33 1.562-1.23.624-.899 1.093-2.246h1.465v2.676h2.969v2.07h-2.969v4.258q0 .664.332 1.055.352.37 1.016.37.586 0 1.016-.175t.761-.371v2.11q-.351.37-.996.605-.624.234-1.484.234m70.576-2.1a4.7 4.7 0 0 1-1.772-.334 4.8 4.8 0 0 1-1.452-.95 4.5 4.5 0 0 1-.963-1.44 4.5 4.5 0 0 1-.347-1.772q0-.95.347-1.773a4.3 4.3 0 0 1 .963-1.425q.63-.617 1.452-.95a4.5 4.5 0 0 1 1.772-.348q.887 0 1.478.244.603.244 1.053.643v1.49a16 16 0 0 0-.642-.45 4 4 0 0 0-.797-.398q-.45-.18-1.066-.18a3.1 3.1 0 0 0-1.593.411q-.706.411-1.117 1.13a3.13 3.13 0 0 0-.411 1.606q0 .9.411 1.606a3.14 3.14 0 0 0 1.117 1.13 3.1 3.1 0 0 0 1.593.411q.938 0 1.593-.308a6 6 0 0 0 1.117-.668v1.387q-.449.398-1.156.668-.693.27-1.58.27m4.143-.193v-6.448h1.285v6.448zm1.285-3.776v-1.413a3.5 3.5 0 0 1 .847-1.002q.501-.385 1.066-.385.373 0 .656.128v1.464a2 2 0 0 0-.399-.18 1.5 1.5 0 0 0-.436-.064q-.617 0-1.015.424a5.4 5.4 0 0 0-.719 1.028m6.57 3.969q-.72 0-1.349-.257a3.35 3.35 0 0 1-1.798-1.785 3.4 3.4 0 0 1-.257-1.324q0-.924.411-1.695a3.24 3.24 0 0 1 1.131-1.246 2.9 2.9 0 0 1 1.631-.475q.977 0 1.644.41.667.413 1.002 1.131.347.706.347 1.619v.655h-4.971v-.99h3.725q-.053-.564-.321-.924a1.63 1.63 0 0 0-.643-.54 1.8 1.8 0 0 0-.796-.18q-.566 0-.989.309a2 2 0 0 0-.642.796 2.7 2.7 0 0 0-.232 1.13q0 .591.257 1.08.27.487.758.783.488.295 1.118.295.707 0 1.284-.32.591-.335.976-.694v1.284a2.7 2.7 0 0 1-.539.424 3.4 3.4 0 0 1-.796.36q-.45.154-.951.154m6.635 0a2.8 2.8 0 0 1-1.478-.411 3.06 3.06 0 0 1-1.078-1.156q-.399-.758-.399-1.773 0-1.065.399-1.837a2.95 2.95 0 0 1 2.671-1.605q.54 0 1.092.257.566.256.951.693v-3.61h1.284v9.25h-1.284v-1.093a2.9 2.9 0 0 1-.874.9 2.2 2.2 0 0 1-1.284.385m.269-1.272q.526 0 .951-.27.436-.282.694-.77.256-.501.244-1.143V34.82a3.2 3.2 0 0 0-.822-.68 1.85 1.85 0 0 0-.977-.258 1.84 1.84 0 0 0-1.066.309 2.1 2.1 0 0 0-.681.809 2.4 2.4 0 0 0-.231 1.053q0 .566.231 1.04.245.476.668.758.425.27.989.27m6.173-6.64a.92.92 0 0 1-.694-.296.94.94 0 0 1-.283-.668q0-.386.283-.668a.92.92 0 0 1 .694-.295q.269 0 .488.141a1 1 0 0 1 .347.347.86.86 0 0 1 .141.475.9.9 0 0 1-.141.475 1.1 1.1 0 0 1-.347.36.95.95 0 0 1-.488.128m-.501 7.72v-6.449h1.284v6.448zm-1.028-5.293v-1.156h2.312v1.156zm6.789 5.485q-.552 0-.976-.231a1.8 1.8 0 0 1-.668-.668q-.244-.437-.244-1.028v-3.57h-1.169v-.527a2.27 2.27 0 0 0 1.04-.874q.424-.63.732-1.554h.681v1.811h2.03v1.143h-2.03v3.378q0 .412.244.655.256.232.681.232.385 0 .681-.103a3 3 0 0 0 .514-.218v1.104a1.6 1.6 0 0 1-.63.334 3 3 0 0 1-.886.116m10.174-.051q-.54 0-1.144-.052a16 16 0 0 1-1.156-.115 13 13 0 0 1-.963-.168v-8.297q.693-.154 1.49-.231a15 15 0 0 1 1.631-.09q.976 0 1.696.32.719.309 1.104.861.399.54.399 1.246 0 .642-.36 1.156a2.35 2.35 0 0 1-.874.771q.386.09.745.334.373.231.617.642t.244 1.028q0 .72-.411 1.31t-1.182.938q-.77.345-1.836.346m-.026-1.272q.874 0 1.438-.373.566-.372.566-.989 0-.642-.566-.95-.565-.321-1.387-.321h-2.119v-1.144h2.119q.784 0 1.195-.398.424-.398.424-.95a1 1 0 0 0-.257-.694 1.5 1.5 0 0 0-.655-.424 2.5 2.5 0 0 0-.899-.154q-.489 0-.912.039a6 6 0 0 0-.784.102v6.102q.282.051.629.09.347.038.668.051.334.013.54.013m7.315 1.323a2.8 2.8 0 0 1-1.477-.411 3.06 3.06 0 0 1-1.079-1.156q-.398-.758-.398-1.773 0-1.065.398-1.837a2.95 2.95 0 0 1 1.105-1.181 3 3 0 0 1 1.567-.424q.538 0 1.092.257.564.256.95.693v-.809h1.285v6.448h-1.285V38.11a2.9 2.9 0 0 1-.873.9 2.2 2.2 0 0 1-1.285.385m.27-1.272q.527 0 .95-.27.438-.282.694-.77.257-.501.244-1.143v-1.12a3.4 3.4 0 0 0-.822-.694 1.85 1.85 0 0 0-.976-.257q-.617 0-1.066.309a2.1 2.1 0 0 0-.681.81q-.231.5-.231 1.065 0 .566.231 1.04.244.476.668.758.424.27.989.27m9.409 1.08v-3.79q0-.771-.347-1.156-.346-.386-1.027-.386-.476 0-.938.347-.45.334-.796.784v-1.272q.206-.256.513-.514.309-.256.694-.423.399-.18.835-.18.655 0 1.195.295.539.283.847.874.321.59.321 1.477V39.2zm-4.393 0v-6.449h1.285V39.2zm8.343-1.683v-1.465l3.288-3.301h1.645zm-.976 1.682v-9.248h1.284V39.2zm4.444 0-2.659-3.25.822-.899 3.456 4.15z"
          fill="#667085"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M129.571 45.75V26.977h.969V45.75z"
          fill="#D0D5DD"
        />
        <path
          d="M28.39 64.037h32.92c1.88 0 3.398 1.514 3.398 3.376V88.72c0 1.862-1.518 3.376-3.398 3.376H28.39c-1.88 0-3.399-1.514-3.399-3.376V67.413c0-1.803 1.426-3.28 3.224-3.371z"
          fill="#fff"
          stroke="#667085"
          strokeWidth={0.95}
        />
        <mask
          id="g"
          style={{
            maskType: "alpha",
          }}
          maskUnits="userSpaceOnUse"
          x={24}
          y={63}
          width={42}
          height={30}
        >
          <path
            d="M24.517 67.413c0-2.126 1.734-3.85 3.873-3.85h32.92c2.14 0 3.873 1.724 3.873 3.85V88.72c0 2.127-1.734 3.85-3.873 3.85H28.39c-2.14 0-3.873-1.723-3.873-3.85z"
            fill="#98A2B3"
          />
        </mask>
        <g mask="url(#g)" fillRule="evenodd" clipRule="evenodd" fill="#667085">
          <path d="M24.274 67.16c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722V67.16a.724.724 0 0 0-.726-.722z" />
          <path d="M24.274 75.073c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M38.42 74.194c0-.665.542-1.204 1.21-1.204h13.092c.669 0 1.21.539 1.21 1.204v.272c0 .664-.541 1.203-1.21 1.203h-.715a.724.724 0 0 0-.726.722v6.425c0 .665-.542 1.204-1.21 1.204H36.977c-.669 0-1.21-.54-1.21-1.204v-.711c0-.665.541-1.204 1.21-1.204h.716a.724.724 0 0 0 .726-.722zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .665-.542 1.204-1.21 1.204h-.716a.724.724 0 0 0-.726.722v.711c0 .4.325.722.726.722H50.07a.724.724 0 0 0 .727-.722v-6.425c0-.665.541-1.203 1.21-1.203h.715a.724.724 0 0 0 .727-.722v-.272a.724.724 0 0 0-.727-.722z" />
          <path d="M24.274 82.983c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.54 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.539-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .4.326.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.722zM53.448 67.16c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722V67.16a.724.724 0 0 0-.726-.722z" />
          <path d="M53.448 75.073c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.986a.724.724 0 0 0-.726-.722z" />
          <path d="M53.448 82.983c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.54 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.539-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .4.325.722.727.722h9.556a.724.724 0 0 0 .726-.722v-5.985a.724.724 0 0 0-.726-.722z" />
        </g>
      </g>
      <defs>
        <filter
          id="a"
          x={0.383}
          y={0.06}
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
            result="effect1_dropShadow_8_45191"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45191"
            result="shape"
          />
        </filter>
        <filter
          id="d"
          x={25.046}
          y={156.691}
          width={176.366}
          height={8.339}
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
            result="effect1_dropShadow_8_45191"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45191"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45191" />
        </filter>
        <filter
          id="e"
          x={177.926}
          y={133.996}
          width={33.342}
          height={9.484}
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
            result="effect1_dropShadow_8_45191"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45191"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45191" />
        </filter>
        <filter
          id="f"
          x={38.95}
          y={106.078}
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
            result="effect1_dropShadow_8_45191"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_8_45191"
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
          <feBlend in2="shape" result="effect2_innerShadow_8_45191" />
        </filter>
        <linearGradient
          id="b"
          x1={4.179}
          y1={184.864}
          x2={164.293}
          y2={-83.527}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={1} stopColor="#fff" />
        </linearGradient>
        <clipPath id="c">
          <path fill="#fff" d="M268.518 23.127h20.333v25.031h-20.333z" />
        </clipPath>
      </defs>
    </svg>
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

const Chip = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={41}
    height={30}
    viewBox="0 0 41 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4.057 1.123h32.92c1.88 0 3.398 1.514 3.398 3.376v21.306c0 1.861-1.518 3.375-3.398 3.376H4.057c-1.88 0-3.399-1.515-3.399-3.376V4.499c0-1.804 1.426-3.28 3.224-3.371z"
      stroke="currentColor"
      strokeWidth={0.95}
    />
    <g fillRule="evenodd" clipRule="evenodd" fill="currentColor">
      <path d="M-.059 4.246c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203H1.152c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.725.722v5.986c0 .399.325.722.726.722h9.556a.724.724 0 0 0 .726-.722V4.246a.724.724 0 0 0-.726-.722z" />
      <path d="M-.059 12.159c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204H1.152c-.669 0-1.21-.54-1.21-1.204zm1.21-.723a.724.724 0 0 0-.725.723v5.985c0 .399.325.722.726.722h9.556a.724.724 0 0 0 .726-.722V12.16a.724.724 0 0 0-.726-.723z" />
      <path d="M14.086 11.28c0-.665.542-1.204 1.21-1.204H28.39c.668 0 1.21.539 1.21 1.204v.272c0 .664-.542 1.203-1.21 1.203h-.716a.724.724 0 0 0-.726.722v6.425c0 .665-.542 1.204-1.21 1.204H12.643c-.668 0-1.21-.54-1.21-1.204v-.711c0-.665.542-1.204 1.21-1.204h.716a.724.724 0 0 0 .726-.722zm1.21-.723a.724.724 0 0 0-.726.723v5.985c0 .665-.542 1.204-1.21 1.204h-.716a.724.724 0 0 0-.726.722v.711c0 .399.325.722.726.722h13.092a.724.724 0 0 0 .727-.722v-6.425c0-.665.541-1.203 1.21-1.203h.716a.724.724 0 0 0 .726-.722v-.272a.724.724 0 0 0-.726-.723z" />
      <path d="M-.059 20.069c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204H1.152c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.725.722v5.985c0 .399.325.722.726.722h9.556a.724.724 0 0 0 .726-.722V20.07a.724.724 0 0 0-.726-.722zM29.115 4.246c0-.664.542-1.203 1.21-1.203h9.557c.668 0 1.21.539 1.21 1.203v5.986c0 .665-.542 1.203-1.21 1.203h-9.556c-.669 0-1.21-.538-1.21-1.203zm1.21-.722a.724.724 0 0 0-.726.722v5.986c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722V4.246a.724.724 0 0 0-.726-.722z" />
      <path d="M29.115 12.159c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.723a.724.724 0 0 0-.726.723v5.985c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722V12.16a.724.724 0 0 0-.726-.723z" />
      <path d="M29.115 20.069c0-.665.542-1.204 1.21-1.204h9.557c.668 0 1.21.539 1.21 1.204v5.985c0 .665-.542 1.204-1.21 1.204h-9.556c-.669 0-1.21-.54-1.21-1.204zm1.21-.722a.724.724 0 0 0-.726.722v5.985c0 .399.325.722.727.722h9.556a.724.724 0 0 0 .726-.722V20.07a.724.724 0 0 0-.726-.722z" />
    </g>
  </svg>
)

const RmDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  onRemove,
}: {
  trigger?: (options: {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
  }) => React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  onRemove?: () => void
}) => {
  const [state, setState] = useControllableState({
    value: open,
    onChange: onOpenChange,
    defaultValue: false,
  })
  return (
    <Dialog open={state} onOpenChange={setState}>
      {trigger?.({ isOpen: state, setIsOpen: setState })}

      <DialogContent>
        <DialogHeader>
          <div className="flex flex-col gap-y-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button visual="error" onClick={onRemove}>
            Yes, Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const EditScope = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-col gap-y-2">
            <DialogTitle>
              Are you sure you want to leave checkout to edit the scope?
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Edit Scope
            </Button>
          </DialogClose>
          <Button>Continue Checkout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const AddTask = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-col gap-y-2">
            <DialogTitle>
              Are you sure you want to leave checkout to edit the scope?
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Add Task
            </Button>
          </DialogClose>
          <Button>Continue Checkout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const EditTeam = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-col gap-y-2">
            <DialogTitle>
              Are you sure you want to leave checkout to edit the team?
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Edit Team
            </Button>
          </DialogClose>
          <Button>Continue Checkout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ReplaceTeamMember = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[558px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-y-2">
            <DialogTitle>Replace Team Member</DialogTitle>
            <DialogClose>
              <IconButton visual="gray" variant="ghost">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="border-2 mt-5 border-gray-300 bg-gray-50 rounded-lg h-[72px] flex">
            <div className="flex items-center first:pl-6 last:pr-6 pr-3 pl-3 py-4 flex-auto">
              <span className="inline-flex items-start gap-x-2">
                <Avatar size="sm">
                  <AvatarImage src="/man.jpg" alt="Man" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>

                <span className="inline-flex flex-col">
                  <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                    Vivek
                  </span>
                  <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                    @topdesigner321
                  </span>
                </span>
              </span>
            </div>
            <div className="flex items-center first:pl-6 last:pr-6 pr-3 pl-3 py-4 flex-auto">
              <Dropdown defaultValue="Junior" />
            </div>
            <div className="flex items-center first:pl-6 last:pr-6 pr-3 pl-3 py-4 flex-auto">
              <CountriesCombobox
                triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                defaultValue="United States"
              />
            </div>
            <div className="flex items-center first:pl-6 last:pr-6 pr-3 pl-3 py-4 flex-auto">
              <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                $500/hr
              </span>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-sm leading-5 font-semibold text-dark-blue-400">
              Select a new team member to replace @topdesign241
            </h1>

            <Tabs
              defaultValue="All"
              className="mt-3 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] overflow-hidden"
            >
              <TabsList className="flex justify-between items-center">
                <div className="flex items-end gap-x-4">
                  <TabsTrigger value="All">All</TabsTrigger>
                  <TabsTrigger value="Favorites">
                    <Star className="shrink-0 size-[18px]" />
                    Favorites
                  </TabsTrigger>
                  <TabsTrigger value="Talent Network">
                    <Globe className="shrink-0 size-[18px]" />
                    Talent Network
                  </TabsTrigger>
                </div>

                <button className="focus-visible:outline-none relative -translate-y-1.5">
                  <Search className="size-4 shrink-0 text-gray-400" />
                </button>
              </TabsList>

              <TabsContent value="All">
                <Table>
                  <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-white text-dark-blue-400 hover:text-dark-blue-400 pr-3 pl-3 first:pl-6 last:pr-6">
                        <span className="inline-flex items-center gap-x-1">
                          Name <ArrowDown className="size-[15px]" />
                        </span>
                      </TableHead>
                      <TableHead className="bg-white text-dark-blue-400 hover:text-dark-blue-400 pr-3 pl-3 first:pl-6 last:pr-6">
                        Experience
                      </TableHead>
                      <TableHead className="bg-white text-dark-blue-400 hover:text-dark-blue-400 pr-3 pl-3 first:pl-6 last:pr-6">
                        Location
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-white">
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-start gap-x-2">
                          <Avatar size="sm">
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallback>M</AvatarFallback>
                          </Avatar>

                          <span className="inline-flex flex-col">
                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                              Vivek
                            </span>
                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                              @topdesigner321
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Dropdown defaultValue="Junior" />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <CountriesCombobox
                          triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                          defaultValue="United States"
                        />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                          $500/hr
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-white">
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-start gap-x-2">
                          <Avatar size="sm">
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallback>M</AvatarFallback>
                          </Avatar>

                          <span className="inline-flex flex-col">
                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                              Vivek
                            </span>
                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                              @topdesigner321
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Dropdown defaultValue="Junior" />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <CountriesCombobox
                          triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                          defaultValue="United States"
                        />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                          $500/hr
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-white">
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-start gap-x-2">
                          <Avatar size="sm">
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallback>M</AvatarFallback>
                          </Avatar>

                          <span className="inline-flex flex-col">
                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                              Vivek
                            </span>
                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                              @topdesigner321
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Dropdown defaultValue="Junior" />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <CountriesCombobox
                          triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                          defaultValue="United States"
                        />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                          $500/hr
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-white">
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-start gap-x-2">
                          <Avatar size="sm">
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallback>M</AvatarFallback>
                          </Avatar>

                          <span className="inline-flex flex-col">
                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                              Vivek
                            </span>
                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                              @topdesigner321
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Dropdown defaultValue="Junior" />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <CountriesCombobox
                          triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                          defaultValue="United States"
                        />
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                          $500/hr
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8 flex justify-end gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button>Replace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

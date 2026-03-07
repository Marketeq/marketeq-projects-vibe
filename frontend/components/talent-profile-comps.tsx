import React, { useRef, useState } from "react"
import { useClickOutside } from "@/utils/hooks"
import {
  ArrowRight,
  ArrowUp,
  BarChart2,
  Bell,
  ChevronDown,
  ChevronRight,
  CoinStack,
  LifeBuoy,
  LogOut,
  Monitor,
  Plus,
  Repeat,
  SearchMd,
  Settings,
  Star,
  Users,
  X,
  XCircle,
} from "@blend-metrics/icons"
import {
  FacebookSolid,
  InstagramSolid,
  TwitterSolid,
} from "@blend-metrics/icons/social-solid"
import { Variants, motion } from "framer-motion"
import { useToggle } from "react-use"
import {
  Campaigns,
  LinkedinSolid,
  Logo3,
  Project,
  Talent,
} from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScaleOutIn,
  ScrollArea,
  Toggle,
  buttonVariants,
} from "@/components/ui"
import { DropdownMenuCheckItem, ScrollBar } from "@/components/ui"

export const Footer = () => {
  return (
    <footer className="bg-white px-5 md:px-10 lg:px-[100px] pt-10 lg:pt-[50px] xl:px-[150px] 2xl:px-[250px]">
      <div className="flex gap-y-10 md:gap-y-20 lg:gap-x-[100px] lg:flex-row flex-col lg:items-start">
        <div className="flex-auto grid grid-cols-2 gap-y-10 md:flex items-start md:justify-between">
          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-extralight text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>
        </div>

        <Button className="md:hidden self-start" variant="link" visual="gray">
          <ArrowUp className="size-[15px]" />
          Back to top
        </Button>

        <div className="max-w-[363px] w-full lg:ml-auto">
          <h1 className="text-base leading-[19.36px] font-medium text-dark-blue-400">
            Marketeq Talent Network
          </h1>

          <p className="mt-3 text-[13px] font-extralight leading-[15.73px] whitespace-pre-line text-gray-700">
            Want the freedom of working from home without competing with
            overseas rates? Join our national talent network and get a chance to
            work on exciting projects from top corporations and disruptive
            startups.
          </p>

          <Button
            className="mt-[30px] text-primary-500 hover:bg-primary-50 border-primary-500"
            variant="outlined"
            visual="gray"
          >
            Join the talent network
            <ArrowRight className="size-[15px]" />
          </Button>
        </div>
      </div>

      <div className="flex lg:flex-row flex-col gap-y-10 items-center justify-between mt-10 lg:mt-[50px] py-10 md:py-5 border-t border-gray-200">
        <div className="flex items-center md:flex-row flex-col gap-y-5 md:gap-x-[57px]">
          <Logo3 className="w-[120px] shrink-0 h-[17.62px]" />
          <span className="inline-block text-[13px] leading-[15.73px] font-extralight text-dark-blue-600">
            © 2011 - 2024 Marketeq Digital Inc. All Rights Reserved.
          </span>
        </div>

        <div className="flex md:flex-row flex-col items-center gap-10 lg:gap-x-[50px]">
          <div className="flex gap-x-5 items-center">
            <Button className="text-dark-blue-400" variant="link">
              Terms & Conditions
            </Button>

            <span className="inline-block bg-gray-200 h-4 w-px shrink-0" />

            <Button className="text-dark-blue-400" variant="link">
              Privacy Policy
            </Button>
          </div>

          <div className="flex items-center gap-x-[16.6px]">
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <FacebookSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <TwitterSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <InstagramSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <LinkedinSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
          </div>
        </div>
      </div>
    </footer>
  )
}

export const Sidebar = () => {
  const [isOpen, toggleIsOpen] = useState(false)
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-x-0.5 text-[11px] leading-6 lg:text-[13px] lg:leading-6 text-dark-blue-400"
          variant="link"
          visual="gray"
        >
          10 team members
          <ChevronRight className="size-3 lg:size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        variant="unanimated"
        className="py-[68px] px-0 bg-[#F9FAFB] rounded-none data-[state=open]:duration-300 data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2 left-0 inset-y-0 w-[241px]"
      >
        <div className="h-12 absolute top-0 border-b border-gray-200 inset-x-0 flex items-center bg-white justify-between pl-3.5 p-1">
          <span className="text-base leading-[19.36px] font-semibold text-dark-blue-400">
            Choose a Category
          </span>
          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray">
              <X className="size-[18px]" />
            </IconButton>
          </DialogClose>
        </div>
        <ScrollArea
          className="h-full"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="p-3 flex flex-col gap-y-1">
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-3.5 md:px-6 lg:px-[50px] bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] xs:max-md:hidden z-40">
        <div className="pt-0.5 pb-3.5 lg:py-3 flex items-end gap-x-6 lg:justify-between lg:gap-x-[30px] ">
          <div className="flex flex-col">
            <span className="inline-block text-[10px] leading-[12.1px] lg:text-xs lg:leading-[16.34px] text-dark-blue-400">
              You currently have
            </span>

            <Sidebar />
          </div>

          <div className="flex items-center gap-x-6 lg:gap-x-[54.17px] lg:ml-[26.5px]">
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Research
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Design
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Development
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Testing
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Security
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Maintenance
            </Button>
            <Button
              className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Digital Marketing
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100 lg:hidden"
                  variant="link"
                  visual="gray"
                >
                  More <ChevronDown className="size-[15px]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ScrollArea
                  viewportClassName="max-h-[250px]"
                  scrollBar={<ScrollBar className="w-4 p-1" />}
                >
                  <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
                  <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-x-[18px] ml-auto xs:max-lg:hidden">
            <Button
              className="text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              My Favorites
            </Button>
            <span className="inline-block h-4 w-px shrink-0 bg-gray-300" />
            <Button
              className="text-[13px] leading-6 opacity-60 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              My Dashboard
            </Button>
          </div>
        </div>
      </div>

      {children}
      <Footer />
    </>
  )
}

const fixedSuggestions = [
  {
    id: 1,
    icon: Talent,
    value: "Browse Talent",
  },
  {
    id: 2,
    icon: Project,
    value: "Browse Project",
  },
  {
    id: 3,
    icon: Campaigns,
    value: "Browse Campaigns",
  },
]

const suggestions = [
  { id: 1, value: "UX Architect" },
  { id: 2, value: "Bulma developer" },
  { id: 3, value: "React" },
  { id: 4, value: "Golang framework" },
  { id: 5, value: "Mobile applications" },
  { id: 6, value: "Magento development" },
]

interface Person {
  name: string
}

type People = Person[]

const people: People = [
  { name: "Wade Cooper" },
  { name: "Arlene Mccoy" },
  { name: "Devon Webb" },
  { name: "Tom Cook" },
  { name: "Tanya Fox" },
  { name: "Hellen Schmidt" },
  { name: "Hellen Walker" },
  { name: "Hellen Waller" },
]

export const SearchBar = () => {
  const [state, setState] = useState<string>()
  const [selected, setSelected] = React.useState<{
    id: number
    value: string
    icon?: React.JSXElementConstructor<any>
  }>()
  const [query, setQuery] = React.useState("")

  const filteredSuggestions =
    query === ""
      ? suggestions
      : suggestions.filter((industry) =>
          industry.value
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const reset = () => setQuery("")

  return (
    <Combobox
      className="group/root w-auto flex-auto"
      value={selected}
      onChange={setSelected}
    >
      <ComboboxTrigger className="relative flex h-[34px] lg:h-10 rounded-[5px] items-center gap-x-3 border border-gray-300 ui-open:rounded-b-none py-[7px] lg:py-2 pl-2.5 pr-3 lg:px-3">
        <div className="flex items-center gap-x-2 flex-auto">
          <SearchMd className="size-4 shrink-0 text-gray-400" />
          <ComboboxInput
            placeholder="Search by skills or project type"
            className="p-0 border-0 text-xs leading-5 h-auto rounded-none hover:ring-0 hover:border-gray-300 focus:ring-0 focus:border-gray-300 ui-open:rounded-b-none"
            size="lg"
            displayValue={(value: {
              id: number
              value: string
              icon?: React.JSXElementConstructor<any>
            }) => value.value}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="w-px h-4 shrink-0 inline-block bg-gray-200" />
        <Listbox className="w-auto" value={state} onChange={setState}>
          <ListboxButton
            className="p-0 border-0 text-[11px] leading-[16.67px] lg:text-sm lg:leading-5 font-semibold gap-x-[6.67px] lg:gap-x-1.5 w-auto h-auto rounded-none hover:ring-0 focus:ring-0"
            placeholder="Category"
            iconClassName="size-[12.5px]"
          />
          <ListboxOptions className="w-max -right-3 left-auto mt-3.5">
            {people.map((person) => (
              <ListboxOption key={person.name} value={person.name}>
                {person.name}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </ComboboxTrigger>
      <ScaleOutIn afterLeave={reset}>
        <ComboboxOptions className="px-0 mt-0 space-y-0 border border-gray-300 border-t-0 rounded-t-none">
          <div className="p-3">
            {fixedSuggestions.map((fixedSuggestion) => (
              <ComboboxOption
                key={fixedSuggestion.id}
                value={fixedSuggestion}
                className="text-xs flex items-center gap-x-3 leading-[13.3px] text-gray-400"
              >
                <fixedSuggestion.icon className="size-5" />
                {fixedSuggestion.value}
              </ComboboxOption>
            ))}
          </div>

          <div className="space-y-1 p-3 border-t border-gray-100">
            <div className="px-3 flex items-center justify-between">
              <h1 className="text-[13px] leading-6 font-semibold text-dark-blue-400">
                Recent Searches
              </h1>

              <Button
                className="opacity-50 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Clear Search History
              </Button>
            </div>
            <ScrollArea viewportClassName="max-h-[360px]">
              {filteredSuggestions.map((suggestion) => (
                <ComboboxOption key={suggestion.id} value={suggestion}>
                  {suggestion.value}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </div>
        </ComboboxOptions>
      </ScaleOutIn>
    </Combobox>
  )
}

export const TopMostHeader = () => {
  return (
    <div className="px-3.5 md:px-6 lg:px-[50px] bg-white flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5 md:max-lg:pb-2.5 sticky top-0 z-50">
      <div className="flex items-center justify-between md:gap-x-3 lg:gap-x-[50px] md:pt-2 md:pb-1 lg:py-3">
        <NextLink className="focus-visible:outline-none" href="/marketplace">
          <Logo3 className="h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]" />
        </NextLink>

        <div className="flex flex-auto gap-x-3 xs:max-lg:ml-3 xs:max-md:hidden">
          <SearchBar />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="gap-x-2 xs:max-lg:h-[34px] xs:max-lg:px-[12.6px] xs:max-lg:py-[7.2px] bg-white"
                visual="gray"
                variant="outlined"
                size="md"
              >
                <span className="inline-flex items-center gap-x-[7.2px] lg:gap-x-1 text-[12.6px] leading-5 lg:text-base lg:leading-6 font-extralight">
                  <span className="font-semibold">$ 1,540</span> USD
                </span>
                <ChevronDown className="text-gray-500 size-[13.5px] lg:size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[174px]">
              <DropdownMenuItem>
                <Plus className="size-4" /> Add Funds
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Repeat className="size-4" /> Transfer Funds
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <InviteWindowTrigger asChild>
              <IconButton
                className="rounded-full"
                size="md"
                variant="ghost"
                visual="gray"
              >
                <Plus className="size-[18px]" />
              </IconButton>
            </InviteWindowTrigger>
            <IconButton
              className="rounded-full"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <Bell className="size-[18px]" />
            </IconButton>
            <IconButton
              className="rounded-full lg:hidden"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <ThreeHorizontalLines className="text-dark-blue-400" />
            </IconButton>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="hidden lg:inline-flex items-center gap-x-2 px-3 py-1.5 rounded-[8px] hover:bg-gray-100 focus-visible:outline-none">
              <div className="inline-flex items-center gap-x-2">
                <Avatar>
                  <AvatarImage src="/man.jpg" alt="Man" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-[15px] text-gray-700">
                    Christopher Torres
                  </span>
                  <span className="text-[9px] leading-[14px] text-gray-500">
                    chris@marketeqdigital.com
                  </span>
                </div>
              </div>

              <ChevronDown className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[278px]">
              <DropdownMenuLabel className="font-normal" size="md">
                <div className="flex flex-col gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs leading-5 text-gray-700">
                      User ID: 2459749
                    </span>
                    <span className="text-[13px] leading-5 text-primary-500">
                      chris@marketeqdigital.com
                    </span>
                  </div>

                  <Button className="w-full">My Account</Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <Monitor className="size-4" />
                My Projects
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BarChart2 className="size-4" />
                My Campaigns
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Users className="size-4" />
                My Team
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="size-4" />
                My Favorites
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CoinStack className="size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-2 gap-x-[9px]">
                <DropdownMenuItem>
                  <LifeBuoy className="size-4" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:hidden">
        <SearchBar />
      </div>
    </div>
  )
}

export const SaveButton = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const [value, setValue] = React.useState("")

  return (
    <div className="flex items-center">
      <Toggle
        className={buttonVariants({
          className:
            "group border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-[12.75px] lg:size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-hover:group-data-[state=on]:text-primary-500 group-data-[state=on]:text-primary-500  group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioTrigger value="Digital Marketing">
              Digital Marketing
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Customer Service">
              Customer Service
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Email Marketing">
              Email Marketing
            </DropdownMenuRadioTrigger>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toggleIsOpen()}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent>
          <form className="flex items-center gap-x-3">
            <Input placeholder="Enter List Name" className="flex-auto" />
            <Button size="lg">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const variants: Variants = {
  expanded: {
    width: 375,
    transition: {
      duration: 0.3,
    },
  },
  collapsed: {
    width: 220,
    transition: {
      duration: 0.3,
    },
  },
}

export const SectionSearchBar = () => {
  const [email, setEmail] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside([ref], () => setIsExpanded(false))

  const on = () => setIsExpanded(true)

  return (
    <motion.div
      ref={ref}
      className="shrink-0 w-[220px]"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={variants}
    >
      <InputGroup className="w-full">
        <Input
          id="email"
          type="email"
          onClick={on}
          className="peer text-sm leading-5 h-10 right-3 pl-[34px]"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Search"
        />
        <InputLeftElement className="text-gray-400 peer-focus:text-primary-500">
          <SearchMd className="size-4" />
        </InputLeftElement>
        {email ? (
          <InputRightElement>
            <button
              className="focus-visible:outline-none inline-block"
              onClick={() => setEmail("")}
            >
              <XCircle className="size-4 text-gray-500/50 hover:text-gray-500" />
            </button>
          </InputRightElement>
        ) : null}
      </InputGroup>
    </motion.div>
  )
}

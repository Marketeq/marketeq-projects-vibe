import React, { useEffect, useRef, useState } from "react"
import { formatDate } from "@/utils/date"
import { getComputedStyle } from "@/utils/dom-utils"
import { cn, toPxIfNumber } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart2,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CoinStack,
  FileText,
  LifeBuoy,
  LogOut,
  MapPin,
  MarkerPin02,
  MessageSquare01,
  MessageTextSquare01,
  Monitor,
  Plus,
  Plus2,
  RefreshCw,
  Repeat,
  SearchMd,
  Settings,
  Share,
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
import * as RadixTabs from "@radix-ui/react-tabs"
import { TooltipArrow } from "@radix-ui/react-tooltip"
import { Meta } from "@storybook/react"
import { Variants, motion } from "framer-motion"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import { useToggle } from "react-use"
import {
  Campaigns,
  LinkedinSolid,
  Logo3,
  Project,
  Talent,
} from "@/components/icons"
import { Adobe } from "@/components/icons/adobe"
import { Dropbox } from "@/components/icons/dropbox"
import { Microsoft } from "@/components/icons/microsoft"
import { Nasdaq } from "@/components/icons/nasdaq"
import { InviteWindowTrigger } from "@/components/invite-window"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ReadMoreLess } from "@/components/read-more-less"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  RatingGroupContext,
  RatingGroupControl,
  RatingGroupHiddenInput,
  RatingGroupItem,
  RatingGroupItemContext,
  RatingGroupLabel,
  RatingGroupRoot,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  tabsListVariants,
  useCarousel,
} from "@/components/ui"

const TALENT_ID = "22222222-2222-2222-2222-222222222222"
const API_URL = `http://localhost:3000/talent-profiles/${TALENT_ID}`

type Skill = { name: string }
type Portfolio = {
  id: string
  title: string
  shortDescription: string
  fullDescription: string
  mainImage: string
  skills: Skill[]
}
type Certification = {
  name: string
  organization: string
  logoUrl: string
  awardedAt: string
}
type Industry = { name: string }
type Language = { name: string; proficiency: string }
type Offer = {
  id: string
  title: string
  type: string
  description: string
  rate: number
  duration: string
  budget: number
  category: string
  skills: Skill[]
}
type WorkExperience = {
  company: string
  title: string
  industry: string
  startDate: string
  endDate: string
  isCurrent: boolean
  description: string
  duration: string
  location: string
}
type Education = {
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string
  logoUrl: string
}
type Review = {
  id: string
  rating: number
  title: string
  text: string
  createdAt: string
  reviewerName: string
  badges: { name: string }[]
}
type Team = { id: string; name: string; location: string; hours: number }

type TalentProfile = {
  id: string
  username: string
  fullName: string
  avatarUrl: string
  headline: string
  bio: string
  memberSince: string
  localTime: string
  location: string
  isAvailable: boolean
  hourlyRateMin: number
  hourlyRateMax: number
  clientSuccessRating: number
  totalProjectsCompleted: number
  repeatHireRate: number
  skills: Skill[]
  portfolios: Portfolio[]
  certifications: Certification[]
  industries: Industry[]
  languages: Language[]
  offers: Offer[]
  workExperiences: WorkExperience[]
  educations: Education[]
  reviews: Review[]
  teams: Team[]
}

const meta: Meta = {
  title: "Talent Profile 1",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

const Footer = () => {
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

const Sidebar = () => {
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
      <div className="px-3.5 md:px-6 lg:px-[50px] bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] xs:max-md:hidden">
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

const SearchBar = () => {
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
        {/*<NextLink className="focus-visible:outline-none" href="/marketplace">*/}
        {/*  <Logo3 className="h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]" />*/}
        {/*</NextLink>*/}

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

const CarouselPreviousTrigger = () => {
  const { canScrollPrev } = useCarousel()
  return canScrollPrev ? (
    <CarouselPrevious className="size-7 border border-white hover:ring-8 hover:ring-white hover:bg-black bg-black/80 transition text-white duration-300 -left-3" />
  ) : null
}

const CarouselNextTrigger = () => {
  const { canScrollNext } = useCarousel()
  return canScrollNext ? (
    <CarouselNext className="size-7 border border-white hover:ring-8 hover:ring-white hover:border-black bg-black/80 hover:bg-black transition text-white duration-300 -right-3" />
  ) : null
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

export const Default = () => {
  const cardRef = useRef<HTMLDivElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [isCardStuck, setIsCardStuck] = useState<boolean>(false)
  const [isTabsListStuck, setIsTabsListStuck] = useState<boolean>(false)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TalentProfile | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const element = cardRef.current
    if (element) {
      const topValue = getComputedStyle(element)["top"]
      const top = topValue.endsWith("px")
        ? parseFloat(topValue.slice(0, -2))
        : 0
      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = Math.ceil(top) === Math.ceil(rect.y)
        setIsCardStuck(isStuck)
      }
      window.addEventListener("scroll", handleScroll)
      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    const element = tabsListRef.current
    if (element) {
      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = 64 >= Math.ceil(rect.y)
        setIsTabsListStuck(isStuck)
      }
      window.addEventListener("scroll", handleScroll)
      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading...
      </div>
    )
  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        No profile found
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopMostHeader />
      <Layout>
        <div className="py-[50px]">
          <div className="max-w-[1440px] mx-auto px-[100px]">
            <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
              <div className="p-10 flex items-start gap-x-10">
                <Avatar className="size-[318px]">
                  <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                  <AvatarFallback />
                </Avatar>

                <div className="flex-auto">
                  <div className="flex items-start">
                    <div className="flex-auto">
                      <h1 className="text-[28px] leading-[34px] font-bold text-dark-blue-400">
                        {profile.fullName}
                        <span className="text-[26px] font-extralight">
                          @{profile.username}
                        </span>
                      </h1>
                      <h2 className="text-[22px] mt-1 leading-[27px] text-dark-blue-400 font-medium">
                        {profile.headline}
                      </h2>
                      <p className="mt-2 text-sm leading-none text-gray-500">
                        {profile.bio}
                      </p>
                      <div className="mt-6 flex items-center gap-x-3">
                        <Badge
                          className="bg-primary-500 text-white rounded-[4px]"
                          visual="primary"
                        >
                          <Star className="size-3 fill-white" />{" "}
                          {profile.clientSuccessRating}
                        </Badge>
                        <span className="text-xs leading-none text-gray-500">
                          {profile.reviews?.length || 0} reviews
                        </span>
                      </div>
                      <div className="mt-6">
                        <div className="flex items-center gap-x-[9px]">
                          <MapPin className="size-4" />
                          <p className="text-sm leading-none font-medium text-dark-blue-400">
                            {profile.location}
                          </p>
                        </div>
                        <div className="flex items-center mt-3 gap-x-[9px]">
                          <Clock className="size-4" />
                          <p className="text-sm leading-none font-extralight text-dark-blue-400">
                            {profile.fullName} is{" "}
                            <span
                              className={
                                profile.isAvailable
                                  ? "text-success-600 font-medium"
                                  : "text-danger-600 font-medium"
                              }
                            >
                              {profile.isAvailable
                                ? "available"
                                : "not available"}
                            </span>{" "}
                            for hire
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-3">
                      <TooltipProvider delayDuration={75}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="md">
                              <Plus className="size-[15px]" />
                              Hire Me
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            visual="white"
                            size="md"
                            className="group text-gray-700 p-6 max-w-[344px] border border-gray-200 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]"
                            sideOffset={14}
                            side="bottom"
                          >
                            <div className="flex items-center mt-3 gap-x-2">
                              <Clock className="size-4" />
                              <p className="text-sm leading-none font-extralight text-dark-blue-400">
                                {profile.fullName}{" "}
                                <span className="font-medium">
                                  {profile.isAvailable
                                    ? "is available"
                                    : "is not currently available"}
                                </span>{" "}
                                for hire
                              </p>
                            </div>

                            <Button
                              className="mt-3 group"
                              size="md"
                              variant="link"
                            >
                              View similar talent{" "}
                              <ArrowRight className="size-3 transition duration-300 group-hover:translate-x-[4px]" />
                            </Button>

                            <span className="absolute inline-block size-4 border-b border-r border-gray-200 bg-white rotate-45 group-data-[side=bottom]:border-r-0 group-data-[side=bottom]:border-b-0 group-data-[side=bottom]:border-l group-data-[side=bottom]:border-t inset-x-0 mx-auto group-data-[side=top]:-bottom-2 group-data-[side=bottom]:-top-2" />
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <SaveButton />
                      <IconButton
                        className="text-gray-500"
                        variant="outlined"
                        visual="gray"
                        size="md"
                      >
                        <Share className="size-[20px]" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-[54px]">
                    <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                      What I do
                    </h1>
                    <ShowMoreLessRoot>
                      {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                        <div
                          className="mt-3 flex gap-3 overflow-hidden flex-wrap [interpolate-size:allow-keywords] transition-[height] duration-300"
                          ref={ref}
                          style={{
                            height: isShowing
                              ? "auto"
                              : scrollHeight
                                ? toPxIfNumber(scrollHeight)
                                : "auto",
                          }}
                        >
                          <ShowMoreLess max={5}>
                            {profile.skills.map((skill) => (
                              <Badge
                                key={skill.name}
                                className="text-gray-700"
                                visual="gray"
                                size="lg"
                              >
                                {skill.name}
                              </Badge>
                            ))}
                            {!isShowing && profile.skills.length > 5 ? (
                              <Badge
                                className="text-gray-700 cursor-pointer"
                                visual="gray"
                                size="lg"
                                onClick={() => setIsShowing(true)}
                              >
                                <Plus2 className="h-3 w-3" />{" "}
                                {profile.skills.length - 5} more...
                              </Badge>
                            ) : null}
                          </ShowMoreLess>
                        </div>
                      )}
                    </ShowMoreLessRoot>
                  </div>
                </div>
              </div>

              <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
                <div className="flex gap-x-2 justify-center items-center">
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    Rate
                  </span>
                  <span className="text-xl font-bold leading-none text-dark-blue-400">
                    ${profile.hourlyRateMin} - ${profile.hourlyRateMax}
                    <span className="text-sm font-extralight leading-none text-dark-blue-400">
                      /hr
                    </span>
                  </span>
                </div>
                <div className="flex gap-x-2 justify-center items-center">
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    Client success rating
                  </span>
                  <span className="text-sm font-bold leading-none text-dark-blue-400">
                    {profile.clientSuccessRating
                      ? (profile.clientSuccessRating * 20).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex gap-x-2 justify-center items-center">
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    Total projects completed
                  </span>
                  <span className="text-sm font-bold leading-none text-dark-blue-400">
                    {profile.totalProjectsCompleted}
                  </span>
                </div>
                <div className="flex gap-x-2 justify-center items-center">
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    Member since
                  </span>
                  <span className="text-sm font-bold leading-none text-dark-blue-400">
                    {profile.memberSince}
                  </span>
                </div>
                <div className="flex gap-x-2 justify-center items-center">
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    Repeat hire rate
                  </span>
                  <span className="text-sm font-bold leading-none text-dark-blue-400">
                    {profile.repeatHireRate
                      ? `${(profile.repeatHireRate * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Tabs className="mt-6" defaultValue="Portfolio">
            <TabsList
              className="group/list p-0 bg-transparent data-[status=stuck]:border-b data-[status=stuck]:border-gray-200 z-50 transition duration-300 top-0 sticky block data-[status=stuck]:bg-white border-0"
              data-status={isTabsListStuck ? "stuck" : "unstuck"}
              ref={tabsListRef}
            >
              <div className="max-w-[1440px] mx-auto px-[100px]">
                <div className="contents group-data-[status=stuck]/list:pt-3 group-data-[status=stuck]/list:flex items-center max-w-[1240px] mx-auto">
                  <div className="flex-auto contents group-data-[status=stuck]/list:block">
                    <div className="hidden items-center gap-x-3 group-data-[status=stuck]/list:flex">
                      <Avatar
                        className="hover:ring-0 active:ring-primary-100"
                        size="lg"
                      >
                        <AvatarImage
                          src={profile?.avatarUrl || "/man.jpg"}
                          alt={profile?.fullName || "User"}
                        />
                        <AvatarFallbackIcon />
                      </Avatar>
                      <div className="flex flex-col gap-y-0.5">
                        <span className="text-lg leading-none font-bold text-dark-blue-400">
                          {profile?.fullName}{" "}
                          <span className="text-base font-extralight">
                            @{profile?.username}
                          </span>
                        </span>
                        <span className="text-sm leading-none font-medium text-dark-blue-400">
                          {profile?.headline}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        tabsListVariants({
                          className:
                            "bg-transparent justify-start w-full group-data-[status=stuck]/list:border-b-0 group-data-[status=stuck]/list:mt-3 inline-flex",
                        })
                      )}
                    >
                      <TabsTrigger value="Portfolio" asChild>
                        {/*<NextLink href="#portfolio">Portfolio</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="Skills" asChild>
                        {/*<NextLink href="#skills">Skills</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="Overview" asChild>
                        {/*<NextLink href="#overview">Overview</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="Offers" asChild>
                        {/*<NextLink href="#offers">Offers</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="Work Experience" asChild>
                        {/*<NextLink href="#background">Work Experience</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="Education" asChild>
                        {/*<NextLink href="#education">Education</NextLink>*/}
                      </TabsTrigger>
                      <TabsTrigger value="#project-history" asChild>
                        {/*<NextLink href="#">Project History</NextLink>*/}
                      </TabsTrigger>
                    </div>
                  </div>

                  <div className="space-y-3 group-data-[status=stuck]/list:block hidden">
                    <div className="flex items-center gap-x-3">
                      <TooltipProvider delayDuration={75}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="md">
                              <Plus className="size-[15px]" />
                              Hire Me
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            visual="white"
                            size="md"
                            className="text-gray-700 p-6 max-w-[344px] border border-gray-200 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]"
                            sideOffset={14}
                            side="bottom"
                          >
                            <TooltipArrow className="fill-white" />
                            <div className="flex items-center mt-3 gap-x-[9px]">
                              <Clock className="size-4" />
                              <p className="text-sm leading-none font-extralight text-dark-blue-400">
                                Dheeraj{" "}
                                <span className="font-medium">
                                  is not currently available
                                </span>{" "}
                                for hire
                              </p>
                            </div>

                            <Button
                              className="mt-3 group"
                              size="md"
                              variant="link"
                            >
                              View similar talent{" "}
                              <ArrowRight className="size-3 transition duration-300 group-hover:translate-x-[4px]" />
                            </Button>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <SaveButton />

                      <IconButton
                        className="text-gray-500"
                        variant="outlined"
                        visual="gray"
                        size="md"
                      >
                        <Share className="size-[20px]" />
                      </IconButton>
                    </div>

                    <div className="flex items-center mt-3 gap-x-[9px]">
                      <Clock className="size-4" />
                      <p className="text-[12.09px] leading-none font-extralight text-dark-blue-400">
                        Dheeraj is currently{" "}
                        <span className="text-success-600 font-bold">
                          available
                        </span>{" "}
                        for <span className="font-bold">40 hrs</span> /week
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsList>
            <div
              className="max-w-[1440px] mx-auto px-[100px] scroll-mt-[137.5px]"
              id="portfolio"
            >
              <div className="pt-6 flex gap-x-8">
                <div className="flex-auto">
                  <ShowMoreLessRoot>
                    {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                      <>
                        <div
                          className="grid grid-cols-3 gap-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                          ref={ref}
                          style={{
                            height: isShowing
                              ? "auto"
                              : scrollHeight
                                ? toPxIfNumber(scrollHeight)
                                : "auto",
                          }}
                        >
                          <ShowMoreLessComp max={3}>
                            {profile?.portfolios?.map((portfolio) => (
                              <article
                                key={portfolio.id}
                                className="group relative rounded-lg overflow-hidden h-[200px]"
                              >
                                <NextImage
                                  className="object-cover"
                                  src={portfolio.mainImage || "/dashboard.png"}
                                  alt={portfolio.title}
                                  fill
                                  sizes="33vw"
                                />
                                <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                                  <h1 className="text-sm leading-none font-medium text-white">
                                    {portfolio.title}
                                  </h1>
                                  <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                    {portfolio.skills?.map((skill) => (
                                      <Badge
                                        key={skill.name}
                                        className="text-white bg-white/20"
                                        visual="gray"
                                      >
                                        {skill.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </article>
                            ))}
                          </ShowMoreLessComp>
                        </div>

                        <div className="my-6">
                          <div className="flex items-center gap-x-1">
                            <span className="flex-auto inline-block h-px bg-gray-200" />
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() => setIsShowing((prev) => !prev)}
                            >
                              {isShowing ? "View Less" : "View More"}
                            </Button>
                            <span className="flex-auto inline-block h-px bg-gray-200" />
                          </div>
                        </div>
                      </>
                    )}
                  </ShowMoreLessRoot>

                  <div
                    className="p-6 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[137.5px]"
                    id="skills"
                  >
                    <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                      Skills
                    </h1>

                    <ShowMoreLessRoot>
                      {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                        <>
                          <div
                            ref={ref}
                            className="[interpolate-size:allow-keywords] flex gap-3 mt-6 flex-wrap overflow-hidden transition-[height] duration-300"
                            style={{
                              height: isShowing
                                ? "auto"
                                : scrollHeight
                                  ? toPxIfNumber(scrollHeight)
                                  : "auto",
                            }}
                          >
                            <ShowMoreLess max={22}>
                              {profile?.skills?.map((skill) => (
                                <Badge
                                  key={skill.name}
                                  className="text-gray-700"
                                  visual="gray"
                                  size="lg"
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                              {!isShowing && profile?.skills?.length > 22 && (
                                <Badge
                                  className="text-gray-700"
                                  visual="gray"
                                  size="lg"
                                >
                                  <Plus2 className="h-3 w-3" />{" "}
                                  {profile.skills.length - 22} more...
                                </Badge>
                              )}
                            </ShowMoreLess>
                          </div>
                          <div className="mt-6 flex items-center justify-center">
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() => setIsShowing((prev) => !prev)}
                            >
                              {isShowing ? "View Less" : "View More"}
                            </Button>
                          </div>
                        </>
                      )}
                    </ShowMoreLessRoot>
                  </div>

                  <div className="mt-6 scroll-mt-[137.5px]" id="overview">
                    <div className="p-6 rounded-t-lg bg-white border border-gray-200 space-y-6">
                      <h1 className="text-xl font-bold text-dark-blue-400 leading-none">
                        Overview
                      </h1>

                      <ReadMoreLess text={profile?.bio || ""}>
                        {({ text, readMore, toggle }) => (
                          <>
                            <p className="mt-6 text-sm font-extralight text-gray-700">
                              {readMore ? text : `${text}...`}
                            </p>

                            <Button
                              className="mt-6"
                              variant="link"
                              visual="gray"
                              onClick={toggle}
                            >
                              {readMore ? "View Less" : "View More"}
                            </Button>
                          </>
                        )}
                      </ReadMoreLess>
                    </div>

                    <Tabs
                      defaultValue="Featured Clients"
                      className="p-6 h-[134px] border-x border-b rounded-b-lg border-gray-200 bg-white"
                    >
                      <RadixTabs.List className="flex items-center gap-x-3">
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Featured Clients"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Featured Clients
                        </TabsTrigger>
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Certifications"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Certifications
                        </TabsTrigger>
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Industry Expertise"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Industry Expertise
                        </TabsTrigger>
                      </RadixTabs.List>

                      <TabsContent value="Featured Clients">
                        <div className="pt-6 flex items-center gap-x-6">
                          {/* If you have a profile.featuredClients array, map it here.
            Otherwise, keep static or skip. Example:
            {profile?.featuredClients?.map(client => (
              <img key={client.name} src={client.logoUrl} alt={client.name} className="h-8" />
            ))}
        */}
                          <Dropbox />
                          <Microsoft />
                          <Adobe />
                          <Nasdaq />
                        </div>
                      </TabsContent>

                      <TabsContent value="Certifications">
                        <div className="pt-6 flex items-center gap-x-6">
                          {profile?.certifications?.length ? (
                            profile.certifications.map((cert) => (
                              <div
                                key={cert.name}
                                className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5"
                              >
                                {cert.logoUrl && (
                                  <img
                                    src={cert.logoUrl}
                                    alt={cert.name}
                                    className="h-7"
                                  />
                                )}
                                {cert.name}
                                <span className="text-xs text-gray-500">
                                  ({cert.organization})
                                </span>
                                {cert.awardedAt && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    {new Date(
                                      cert.awardedAt
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">
                              No certifications listed.
                            </span>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="Industry Expertise">
                        <div className="pt-6 flex items-center gap-x-3">
                          {profile?.industries?.length ? (
                            profile.industries.map((ind) => (
                              <Badge size="lg" visual="gray" key={ind.name}>
                                {ind.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">
                              No industries listed.
                            </span>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="mt-6 scroll-mt-[137.5px]" id="offers">
                    <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                      My Offers
                    </h1>

                    <Tabs defaultValue="Projects" className="mt-6">
                      <div className="flex items-center justify-between">
                        <RadixTabs.List className="inline-flex items-center gap-x-3">
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Projects"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Projects
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Services"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Services
                          </TabsTrigger>
                        </RadixTabs.List>

                        <RadixTabs.Tabs
                          defaultValue={
                            profile?.offers && profile.offers.length > 0
                              ? profile.offers[0].category
                              : ""
                          }
                          className="inline-flex items-center gap-x-6"
                        >
                          <RadixTabs.List className="inline-flex items-center gap-x-3">
                            {profile?.offers &&
                              Array.from(
                                new Set(
                                  profile.offers.map((offer) => offer.category)
                                )
                              ).map((category) => (
                                <RadixTabs.Trigger
                                  key={category}
                                  value={category}
                                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                                >
                                  {category}
                                </RadixTabs.Trigger>
                              ))}
                          </RadixTabs.List>

                          <Button
                            className="group"
                            variant="link"
                            visual="gray"
                          >
                            View All{" "}
                            <ArrowRight className="size-[15px] transition duration-300 group-hover:translate-x-[4px]" />
                          </Button>
                        </RadixTabs.Tabs>
                      </div>

                      <TabsContent value="Projects">
                        <ShowMoreLessRoot>
                          {({ setIsShowing, isShowing, ref, scrollHeight }) => (
                            <>
                              <div
                                ref={ref}
                                className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={3}>
                                  {profile?.portfolios?.map((portfolio) => (
                                    <article
                                      key={portfolio.id}
                                      className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                                    >
                                      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                        <NextImage
                                          className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                          src={
                                            portfolio.mainImage ||
                                            "/dashboard.png"
                                          }
                                          alt={portfolio.title}
                                          fill
                                          sizes="33vw"
                                        />
                                      </div>

                                      <div className="mt-3 flex items-start gap-x-3">
                                        <NextLink
                                          href={
                                            portfolio.id
                                              ? `/portfolios/${portfolio.id}`
                                              : "#"
                                          }
                                          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                        >
                                          {portfolio.title}
                                        </NextLink>

                                        {/* Portfolio section: Show ratings/reviews if reviews are present for this portfolio */}
                                        {/* If reviews are global, you might want to show an average or count from profile.reviews */}
                                        {/* Example: Show the first matching review (customize as needed) */}
                                        {profile.reviews?.length > 0 && (
                                          <div className="inline-flex items-center gap-x-1">
                                            <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                            <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                              {
                                                // Show average rating if you compute it, otherwise show the first review's rating
                                                profile.reviews[0].rating
                                              }{" "}
                                              <span className="font-extralight">
                                                ({profile.reviews.length})
                                              </span>
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                        {portfolio.shortDescription}
                                      </p>

                                      <div className="mt-[14.5px] flex flex-col gap-y-3">
                                        {/* If you want to show offers related to this portfolio, filter by some linking key */}
                                        {profile.offers
                                          .filter((offer) =>
                                            offer.skills.some((skill) =>
                                              portfolio.skills
                                                .map((ps) => ps.name)
                                                .includes(skill.name)
                                            )
                                          )
                                          .slice(0, 1) // Just show the first matched offer, or map all if you want
                                          .map((offer) => (
                                            <React.Fragment key={offer.id}>
                                              {offer.duration && (
                                                <div className="flex items-center gap-x-[6.4px]">
                                                  <Clock className="size-[18px] shrink-0 text-primary-500" />
                                                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                                                    Starting from{" "}
                                                    {offer.duration}
                                                  </span>
                                                </div>
                                              )}
                                              {offer.budget && (
                                                <div className="flex items-center gap-x-[6.4px]">
                                                  <Money className="size-[18px] shrink-0 text-primary-500" />
                                                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                                                    ${offer.budget} budget
                                                  </span>
                                                </div>
                                              )}
                                            </React.Fragment>
                                          ))}
                                      </div>

                                      <div className="mt-5 flex items-end justify-between">
                                        {/* You can render team members here if you have them in portfolio.teamMembers */}
                                        <div />
                                        <FavoriteRoot>
                                          {({ pressed }) => (
                                            <TooltipProvider delayDuration={75}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="inline-block">
                                                    <Favorite />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  {pressed ? (
                                                    <span className="inline-flex items-center gap-x-1">
                                                      <Check className="size-[15px] shrink-0 text-green-500" />
                                                      Saved
                                                    </span>
                                                  ) : (
                                                    "Save to favorites"
                                                  )}
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        </FavoriteRoot>
                                      </div>
                                    </article>
                                  ))}
                                </ShowMoreLessComp>
                              </div>

                              <div className="my-6">
                                <div className="flex items-center gap-x-1">
                                  <span className="flex-auto inline-block h-px bg-gray-200" />
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    onClick={() =>
                                      setIsShowing((prev) => !prev)
                                    }
                                  >
                                    {isShowing ? "View Less" : "View More"}
                                  </Button>
                                  <span className="flex-auto inline-block h-px bg-gray-200" />
                                </div>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>

                      <TabsContent value="Services">
                        <ShowMoreLessRoot>
                          {({ setIsShowing, isShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={3}>
                                  {profile?.offers?.slice(0, 3).map((offer) => (
                                    <article
                                      key={offer.id}
                                      className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                                    >
                                      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                        <NextImage
                                          className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                          src={
                                            // Use mainImage from a related portfolio, fallback to a default image
                                            profile?.portfolios?.find((p) =>
                                              p.skills.some((ps) =>
                                                offer.skills
                                                  .map((os) => os.name)
                                                  .includes(ps.name)
                                              )
                                            )?.mainImage || "/dashboard.png"
                                          }
                                          alt={offer.title}
                                          fill
                                          sizes="33vw"
                                        />
                                        <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                          <RefreshCw className="size-[10.8px]" />{" "}
                                          <span className="text-white font-bold text-[10px] leading-none">
                                            {offer.type || "Service"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex items-start gap-x-3">
                                        <NextLink
                                          href={`/offers/${offer.id}`}
                                          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                        >
                                          {offer.title}
                                        </NextLink>

                                        {/* Offer ratings: if reviews exist, show average rating and count */}
                                        {profile.reviews &&
                                          profile.reviews.length > 0 && (
                                            <div className="inline-flex items-center gap-x-1">
                                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                                {(
                                                  profile.reviews.reduce(
                                                    (sum, r) =>
                                                      sum + (r.rating ?? 0),
                                                    0
                                                  ) / profile.reviews.length
                                                ).toFixed(1)}
                                                <span className="font-extralight">
                                                  ({profile.reviews.length})
                                                </span>
                                              </span>
                                            </div>
                                          )}
                                      </div>

                                      <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                        {offer.description}
                                      </p>

                                      <div className="mt-[14.5px] flex flex-col gap-y-3">
                                        {offer.budget && (
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <Money className="size-[18px] shrink-0 text-primary-500" />
                                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                                              ${offer.budget} budget
                                            </span>
                                          </div>
                                        )}
                                        {offer.duration && (
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <Clock className="size-[18px] shrink-0 text-primary-500" />
                                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                                              Duration: {offer.duration}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="mt-5 flex items-end justify-between">
                                        {/* Team members, if you have them associated, can be shown here */}
                                        <div />
                                        <FavoriteRoot>
                                          {({ pressed }) => (
                                            <TooltipProvider delayDuration={75}>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="inline-block">
                                                    <Favorite />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  {pressed ? (
                                                    <span className="inline-flex items-center gap-x-1">
                                                      <Check className="size-[15px] shrink-0 text-green-500" />
                                                      Saved
                                                    </span>
                                                  ) : (
                                                    "Save to favorites"
                                                  )}
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        </FavoriteRoot>
                                      </div>
                                    </article>
                                  ))}
                                </ShowMoreLessComp>
                              </div>

                              <div className="my-6">
                                <div className="flex items-center gap-x-1">
                                  <span className="flex-auto inline-block h-px bg-gray-200" />
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    onClick={() =>
                                      setIsShowing((prev) => !prev)
                                    }
                                  >
                                    {isShowing ? "View Less" : "View More"}
                                  </Button>
                                  <span className="flex-auto inline-block h-px bg-gray-200" />
                                </div>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div
                    className="p-6 rounded-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 scroll-mt-[137.5px]"
                    id="background"
                  >
                    <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                      Background
                    </h1>

                    <Tabs defaultValue="Work Experience" className="mt-6">
                      <RadixTabs.List className="inline-flex items-center gap-x-3">
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Work Experience"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Work Experience
                        </TabsTrigger>
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Education"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Education
                        </TabsTrigger>
                      </RadixTabs.List>

                      <TabsContent value="Work Experience">
                        <ShowMoreLessRoot>
                          {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={3}>
                                  {profile?.workExperiences?.map((exp, idx) => (
                                    <div
                                      className="flex gap-x-6"
                                      key={exp.company + exp.title + idx}
                                    >
                                      <div className="relative flex flex-col items-center">
                                        <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                                          {/* Show company logo if you have it, else fallback */}
                                          <NextImage
                                            className="object-contain"
                                            src={"/company-default.png"}
                                            alt={exp.company}
                                            height={45}
                                            width={45}
                                          />
                                        </div>
                                        <div className="absolute flex py-1.5 justify-center top-[55px] inset-x-0 bottom-0">
                                          <span className="inline-block border-dashed border-[1.5px] border-gray-200" />
                                        </div>
                                      </div>

                                      <div className="flex-auto">
                                        <div className="pb-8">
                                          <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                            {exp.title}
                                          </h1>
                                          <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                            {exp.company}
                                          </p>
                                          <div className="mt-1.5 inline-flex items-center gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              {formatDate(exp.startDate)} -{" "}
                                              {exp.isCurrent
                                                ? "Present"
                                                : formatDate(exp.endDate)}
                                            </span>
                                            <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                            <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                              {exp.duration}
                                            </span>
                                          </div>

                                          <ReadMoreLess
                                            max={52}
                                            text={exp.description}
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="mt-3 text-sm leading-none font-extralight text-gray-700">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLess>
                                          <div className="mt-3 flex items-center justify-between">
                                            <div className="flex flex-auto items-center gap-x-3">
                                              <Badge visual="gray">
                                                Sketch App
                                              </Badge>
                                              <Badge visual="gray">
                                                Sketch App
                                              </Badge>
                                              <Badge visual="gray">
                                                Sketch App
                                              </Badge>
                                              <Badge visual="gray">
                                                Sketch App
                                              </Badge>
                                              <Badge visual="gray">
                                                Sketch App
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </ShowMoreLessComp>
                              </div>
                              <div className="flex mt-6 items-center justify-center">
                                <Button
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? "View Less" : "View More"}
                                </Button>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>

                      <TabsContent value="Education">
                        <ShowMoreLessRoot>
                          {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={4}>
                                  {profile?.educations?.map((edu, idx) => (
                                    <div
                                      className="flex pb-5 items-start gap-x-6"
                                      key={edu.institution + idx}
                                    >
                                      <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                        <NextImage
                                          className="object-cover"
                                          src={
                                            edu.logoUrl ||
                                            "/university-of-florida.png"
                                          }
                                          alt={edu.institution}
                                          fill
                                          sizes="20vw"
                                        />
                                      </div>
                                      <div className="flex-auto">
                                        <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                          {edu.institution}
                                        </h1>
                                        <div className="mt-1.5 flex items-center gap-x-2">
                                          <span className="text-dark-blue-400 text-xs leading-none">
                                            {edu.degree}
                                          </span>
                                          <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                          <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                            {edu.fieldOfStudy}
                                          </span>
                                        </div>
                                        <div className="mt-1.5">
                                          <span className="text-dark-blue-400 text-xs leading-none">
                                            {formatDate(edu.startDate)} -{" "}
                                            {formatDate(edu.endDate)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </ShowMoreLessComp>
                              </div>

                              <div
                                className={cn(
                                  "flex items-center justify-start",
                                  isShowing && "justify-center"
                                )}
                              >
                                <Button
                                  size="sm"
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? "View Less" : "1 More..."}
                                </Button>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div
                    className="mt-6 scroll-mt-[137.5px]"
                    id="project-history"
                  >
                    <div className="border border-gray-200 rounded-t-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] py-5 pl-5 pr-6">
                      <Carousel
                        opts={{
                          align: "start",
                        }}
                        className="w-full"
                      >
                        <CarouselContent>
                          {Array.from({ length: 7 }).map((_, index) => (
                            <CarouselItem
                              key={index}
                              className="basis-[20%] h-[108px]"
                            >
                              <div className="p-1 size-full bg-gray-200 relative rounded-lg overflow-hidden">
                                <NextImage src="/cpu.png" alt="CPU" fill />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>

                        <CarouselPreviousTrigger />
                        <CarouselNextTrigger />
                      </Carousel>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs leading-none font-extralight text-dark-blue-400">
                          Client project images
                        </span>
                        <Button variant="link" visual="gray">
                          View All
                        </Button>
                      </div>
                    </div>

                    <div className="p-8 border-x gap-x-[50px] border-b flex items-start rounded-b-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="flex flex-col flex-1 gap-y-1.5 basis-[147px]">
                        <h1 className="text-xl leading-none text-nowrap font-bold text-dark-blue-400">
                          Project History
                        </h1>
                        <RatingGroupRoot
                          className="flex-row gap-x-1.5 mt-1.5"
                          allowHalf
                          count={5}
                          defaultValue={profile?.clientSuccessRating || 4}
                          disabled
                        >
                          <RatingGroupLabel size="sm">
                            {profile?.clientSuccessRating?.toFixed(1) ?? "N/A"}
                          </RatingGroupLabel>
                          <RatingGroupControl>
                            <RatingGroupContext>
                              {({ items }) =>
                                items.map((item) => (
                                  <RatingGroupItem key={item} index={item}>
                                    <RatingGroupItemContext>
                                      {({ half }) =>
                                        half ? <TbStarHalfFilled /> : <TbStar />
                                      }
                                    </RatingGroupItemContext>
                                  </RatingGroupItem>
                                ))
                              }
                            </RatingGroupContext>
                            <RatingGroupHiddenInput />
                          </RatingGroupControl>
                        </RatingGroupRoot>
                        <NextLink
                          href="#"
                          className="focus-visible:outline-none text-xs leading-6 transition duration-300 hover:underline text-dark-blue-400"
                        >
                          {profile?.reviews?.length || 0} ratings
                        </NextLink>
                      </div>

                      <div className="flex flex-col flex-1 gap-y-1 basis-[304px]">
                        {(() => {
                          // Group review counts by rating value (1-5)
                          const ratings = [5, 4, 3, 2, 1]
                          const reviewCounts: { [key: number]: number } = {}
                          profile?.reviews?.forEach((r) => {
                            if (r.rating in reviewCounts) {
                              reviewCounts[r.rating]++
                            } else {
                              reviewCounts[r.rating] = 1
                            }
                          })
                          const total = profile?.reviews?.length || 0
                          return ratings.map((rating) => {
                            const count = reviewCounts[rating] || 0
                            const percent = total
                              ? Math.round((count / total) * 100)
                              : 0
                            return (
                              <div
                                className="flex items-center gap-x-2"
                                key={rating}
                              >
                                <NextLink
                                  href="#"
                                  className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                                >
                                  {rating}
                                </NextLink>
                                <Progress
                                  className="flex-auto"
                                  value={percent}
                                />
                                <NextLink
                                  href="#"
                                  className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                                >
                                  {percent}%{" "}
                                  <span className="font-extralight">
                                    ({count})
                                  </span>
                                </NextLink>
                              </div>
                            )
                          })
                        })()}
                      </div>

                      <div className="flex flex-1 flex-col basis-[304px]">
                        <div className="space-y-2">
                          {/* You might have these scores in your backend; using static fallback if not */}
                          {[
                            {
                              label: "Communication Level",
                              value: 4.3,
                            },
                            {
                              label: "Responsiveness",
                              value: 4.3,
                            },
                            {
                              label: "Quality of Delivery",
                              value: 4.3,
                            },
                            {
                              label: "Value of Delivery",
                              value: 4.3,
                            },
                          ].map((item, idx) => (
                            <div
                              className="flex items-center justify-between"
                              key={item.label + idx}
                            >
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                {item.label}
                              </NextLink>
                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  {item.value}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Tabs defaultValue="Completed">
                      <RadixTabs.List className="flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Completed"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Completed (24)
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Ongoing"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Ongoing (7)
                          </TabsTrigger>
                        </div>

                        <div className="inline-flex items-center gap-x-3">
                          <SectionSearchBar />

                          <Listbox
                            className="shrink-0 w-max"
                            defaultValue="Most Recent"
                          >
                            <ListboxButton className="w-max text-sm h-10" />
                            <ListboxOptions className="w-[177px] right-0">
                              {[
                                "Most Recent",
                                "Oldest",
                                "Highest Rating",
                                "Lowest Rating",
                              ].map((option) => (
                                <ListboxOption
                                  className="ui-active:text-gray-700 ui-active:font-medium text-gray-500"
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </Listbox>
                        </div>
                      </RadixTabs.List>

                      <TabsContent value="Completed">
                        <ShowMoreLessRoot>
                          {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="mt-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={3}>
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>

                                    <div className="mt-3 flex items-start gap-x-3">
                                      <NextLink
                                        href="#"
                                        className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                      >
                                        The Ultimate Mobile App Experience
                                      </NextLink>

                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      Brief Description of the project. Lorem
                                      ipsum dolor sit amet, consectetur
                                      adipiscing elit, sed do eiusmod tempor
                                      incididunt.
                                    </p>

                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from 12 weeks
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          $50,000 budget
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AvatarGroup
                                              max={5}
                                              size="sm"
                                              excess
                                              excessClassName="border-gray-300 text-gray-500"
                                            >
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                            </AvatarGroup>
                                          </TooltipTrigger>

                                          <TooltipContent
                                            className="p-0 max-w-[262px]"
                                            size="md"
                                          >
                                            <ScrollArea
                                              className="h-[192px] p-3"
                                              scrollBar={
                                                <ScrollBar
                                                  className="w-4 p-1"
                                                  thumbClassName="bg-white/20"
                                                />
                                              }
                                            >
                                              <div className="space-y-3 pr-5">
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                            </ScrollArea>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <FavoriteRoot>
                                        {({ pressed }) => (
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                  <Favorite />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {pressed ? (
                                                  <span className="inline-flex items-center gap-x-1">
                                                    <Check className="size-[15px] shrink-0 text-green-500" />
                                                    Saved
                                                  </span>
                                                ) : (
                                                  "Save to favorites"
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    </div>
                                  </article>
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>

                                    <div className="mt-3 flex items-start gap-x-3">
                                      <NextLink
                                        href="#"
                                        className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                      >
                                        The Ultimate Mobile App Experience
                                      </NextLink>

                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      Brief Description of the project. Lorem
                                      ipsum dolor sit amet, consectetur
                                      adipiscing elit, sed do eiusmod tempor
                                      incididunt.
                                    </p>

                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from 12 weeks
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          $50,000 budget
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AvatarGroup
                                              max={5}
                                              size="sm"
                                              excess
                                              excessClassName="border-gray-300 text-gray-500"
                                            >
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                            </AvatarGroup>
                                          </TooltipTrigger>

                                          <TooltipContent
                                            className="p-0 max-w-[262px]"
                                            size="md"
                                          >
                                            <ScrollArea
                                              className="h-[192px] p-3"
                                              scrollBar={
                                                <ScrollBar
                                                  className="w-4 p-1"
                                                  thumbClassName="bg-white/20"
                                                />
                                              }
                                            >
                                              <div className="space-y-3 pr-5">
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                            </ScrollArea>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <FavoriteRoot>
                                        {({ pressed }) => (
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                  <Favorite />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {pressed ? (
                                                  <span className="inline-flex items-center gap-x-1">
                                                    <Check className="size-[15px] shrink-0 text-green-500" />
                                                    Saved
                                                  </span>
                                                ) : (
                                                  "Save to favorites"
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    </div>
                                  </article>
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>

                                    <div className="mt-3 flex items-start gap-x-3">
                                      <NextLink
                                        href="#"
                                        className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                      >
                                        The Ultimate Mobile App Experience
                                      </NextLink>

                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      Brief Description of the project. Lorem
                                      ipsum dolor sit amet, consectetur
                                      adipiscing elit, sed do eiusmod tempor
                                      incididunt.
                                    </p>

                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from 12 weeks
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          $50,000 budget
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AvatarGroup
                                              max={5}
                                              size="sm"
                                              excess
                                              excessClassName="border-gray-300 text-gray-500"
                                            >
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                            </AvatarGroup>
                                          </TooltipTrigger>

                                          <TooltipContent
                                            className="p-0 max-w-[262px]"
                                            size="md"
                                          >
                                            <ScrollArea
                                              className="h-[192px] p-3"
                                              scrollBar={
                                                <ScrollBar
                                                  className="w-4 p-1"
                                                  thumbClassName="bg-white/20"
                                                />
                                              }
                                            >
                                              <div className="space-y-3 pr-5">
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                            </ScrollArea>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <FavoriteRoot>
                                        {({ pressed }) => (
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                  <Favorite />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {pressed ? (
                                                  <span className="inline-flex items-center gap-x-1">
                                                    <Check className="size-[15px] shrink-0 text-green-500" />
                                                    Saved
                                                  </span>
                                                ) : (
                                                  "Save to favorites"
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    </div>
                                  </article>
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>

                                    <div className="mt-3 flex items-start gap-x-3">
                                      <NextLink
                                        href="#"
                                        className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                      >
                                        The Ultimate Mobile App Experience
                                      </NextLink>

                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      Brief Description of the project. Lorem
                                      ipsum dolor sit amet, consectetur
                                      adipiscing elit, sed do eiusmod tempor
                                      incididunt.
                                    </p>

                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from 12 weeks
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          $50,000 budget
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AvatarGroup
                                              max={5}
                                              size="sm"
                                              excess
                                              excessClassName="border-gray-300 text-gray-500"
                                            >
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                            </AvatarGroup>
                                          </TooltipTrigger>

                                          <TooltipContent
                                            className="p-0 max-w-[262px]"
                                            size="md"
                                          >
                                            <ScrollArea
                                              className="h-[192px] p-3"
                                              scrollBar={
                                                <ScrollBar
                                                  className="w-4 p-1"
                                                  thumbClassName="bg-white/20"
                                                />
                                              }
                                            >
                                              <div className="space-y-3 pr-5">
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                            </ScrollArea>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <FavoriteRoot>
                                        {({ pressed }) => (
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                  <Favorite />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {pressed ? (
                                                  <span className="inline-flex items-center gap-x-1">
                                                    <Check className="size-[15px] shrink-0 text-green-500" />
                                                    Saved
                                                  </span>
                                                ) : (
                                                  "Save to favorites"
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    </div>
                                  </article>
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>

                                    <div className="mt-3 flex items-start gap-x-3">
                                      <NextLink
                                        href="#"
                                        className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                      >
                                        The Ultimate Mobile App Experience
                                      </NextLink>

                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      Brief Description of the project. Lorem
                                      ipsum dolor sit amet, consectetur
                                      adipiscing elit, sed do eiusmod tempor
                                      incididunt.
                                    </p>

                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from 12 weeks
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />

                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          $50,000 budget
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AvatarGroup
                                              max={5}
                                              size="sm"
                                              excess
                                              excessClassName="border-gray-300 text-gray-500"
                                            >
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                              <Avatar
                                                size="sm"
                                                className="border-2 border-white hover:ring-0 active:ring-0"
                                              >
                                                <AvatarImage
                                                  src="/woman.jpg"
                                                  alt="Woman"
                                                />
                                                <AvatarFallback>
                                                  W
                                                </AvatarFallback>
                                              </Avatar>
                                            </AvatarGroup>
                                          </TooltipTrigger>

                                          <TooltipContent
                                            className="p-0 max-w-[262px]"
                                            size="md"
                                          >
                                            <ScrollArea
                                              className="h-[192px] p-3"
                                              scrollBar={
                                                <ScrollBar
                                                  className="w-4 p-1"
                                                  thumbClassName="bg-white/20"
                                                />
                                              }
                                            >
                                              <div className="space-y-3 pr-5">
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-x-[18px]">
                                                  <div className="flex items-center gap-x-2 flex-auto">
                                                    <Avatar>
                                                      <AvatarImage
                                                        src="/woman.jpg"
                                                        alt="Woman"
                                                      />
                                                      <AvatarFallback>
                                                        W
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex flex-col flex-auto">
                                                      <div className="flex items-center gap-x-0.5">
                                                        <span className="text-xs leading-5 font-semibold text-white">
                                                          Sevil
                                                        </span>
                                                        <span className="text-[10px] leading-none font-light text-white">
                                                          @designsuperstar23
                                                        </span>
                                                      </div>
                                                      <span className="text-[10px] font-light text-white">
                                                        Full-stack Developer
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <span className="text-sm font-semibold text-white leading-5">
                                                    $75{" "}
                                                    <span className="text-[10px] font-light leading-5">
                                                      /hr
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                            </ScrollArea>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <FavoriteRoot>
                                        {({ pressed }) => (
                                          <TooltipProvider delayDuration={75}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-block">
                                                  <Favorite />
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {pressed ? (
                                                  <span className="inline-flex items-center gap-x-1">
                                                    <Check className="size-[15px] shrink-0 text-green-500" />
                                                    Saved
                                                  </span>
                                                ) : (
                                                  "Save to favorites"
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    </div>
                                  </article>
                                </ShowMoreLessComp>
                              </div>
                              <div className="flex items-center justify-end mt-6">
                                <Button
                                  size="md"
                                  visual="gray"
                                  variant="outlined"
                                  className="bg-white"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? (
                                    <>
                                      View Less{" "}
                                      <ChevronUp className="size-[15px]" />
                                    </>
                                  ) : (
                                    "Show More Feedback"
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>

                      <TabsContent value="Ongoing">
                        <div className="mt-6 space-y-6">
                          <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="flex items-start gap-x-4">
                              <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                <NextImage
                                  src="/dashboard.png"
                                  alt="Dashboard"
                                  fill
                                  sizes="25vw"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-x-2">
                                  <h1 className="text-sm font-bold text-dark-blue-400">
                                    Seniority Mobile App
                                  </h1>
                                  <Badge
                                    className="border rounded-[3.15px] bg-white border-gray-300"
                                    visual="gray"
                                    variant="rounded"
                                  >
                                    <FileText className="size-[9.46px] text-primary-500" />{" "}
                                    Under NDA
                                  </Badge>
                                </div>

                                <div className="mt-2 flex items-center gap-x-6">
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Estimated Project Cost
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      $25,000
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Project Type
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Cloud Software
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Current Phase
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Development
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center gap-x-2">
                                  <Badge>API-Driven</Badge>
                                  <Badge>Agile Workflow</Badge>
                                  <Badge>Cross-Platform</Badge>
                                  <Badge>Cloud-Based</Badge>
                                  <Badge>Mobile-Optimized</Badge>
                                  <Badge>FinTech</Badge>
                                  <Badge>SaaS</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-x-3 mt-3">
                              <div className="flex items-center gap-x-4">
                                <AvatarGroup
                                  excessClassName="border-gray-300 text-gray-500"
                                  excess
                                >
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                </AvatarGroup>

                                <span className="text-xs text-dark-blue-400">
                                  Senior Front-End Developer
                                </span>
                              </div>

                              <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                              <div className="flex items-center gap-x-2">
                                <span className="text-xs text-dark-blue-400">
                                  January 2025 - Present
                                </span>

                                <Badge
                                  variant="rounded"
                                  className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                  visual="primary"
                                >
                                  2 Months
                                </Badge>
                              </div>
                            </div>
                          </article>

                          <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="flex items-start gap-x-4">
                              <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                <NextImage
                                  src="/dashboard.png"
                                  alt="Dashboard"
                                  fill
                                  sizes="25vw"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-x-2">
                                  <h1 className="text-sm font-bold text-dark-blue-400">
                                    Seniority Mobile App
                                  </h1>
                                  <Badge
                                    className="border rounded-[3.15px] bg-white border-gray-300"
                                    visual="gray"
                                    variant="rounded"
                                  >
                                    <FileText className="size-[9.46px] text-primary-500" />{" "}
                                    Under NDA
                                  </Badge>
                                </div>

                                <div className="mt-2 flex items-center gap-x-6">
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Estimated Project Cost
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      $25,000
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Project Type
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Cloud Software
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Current Phase
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Development
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center gap-x-2">
                                  <Badge>API-Driven</Badge>
                                  <Badge>Agile Workflow</Badge>
                                  <Badge>Cross-Platform</Badge>
                                  <Badge>Cloud-Based</Badge>
                                  <Badge>Mobile-Optimized</Badge>
                                  <Badge>FinTech</Badge>
                                  <Badge>SaaS</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-x-3 mt-3">
                              <div className="flex items-center gap-x-4">
                                <AvatarGroup
                                  excessClassName="border-gray-300 text-gray-500"
                                  excess
                                >
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                </AvatarGroup>

                                <span className="text-xs text-dark-blue-400">
                                  Senior Front-End Developer
                                </span>
                              </div>

                              <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                              <div className="flex items-center gap-x-2">
                                <span className="text-xs text-dark-blue-400">
                                  January 2025 - Present
                                </span>

                                <Badge
                                  variant="rounded"
                                  className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                  visual="primary"
                                >
                                  2 Months
                                </Badge>
                              </div>
                            </div>
                          </article>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-y-6 w-[289px] isolate">
                  <div
                    className={cn(
                      "top-[145px] sticky bg-white rounded-lg z-10 transition duration-300 before:content-[''] before:absolute before:w-full before:top-[-32px] before:h-[40px] before:bg-gray-50",
                      isCardStuck &&
                        "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                    )}
                    ref={cardRef}
                  >
                    <div className="p-6 rounded-t-lg relative bg-white border border-gray-200">
                      <div className="flex items-center gap-x-1 justify-center">
                        <span className="inline-flex text-sm leading-none text-dark-blue-400 font-bold items-center gap-x-1">
                          <span
                            className={`size-2 inline-block rounded-full ${
                              profile?.isAvailable
                                ? "bg-green-500"
                                : "bg-gray-500"
                            }`}
                          />{" "}
                          {profile?.isAvailable ? "Online" : "Offline"}
                        </span>
                        <span className="font-extralight text-sm leading-none text-dark-blue-400">
                          {profile?.localTime || "N/A"} local time
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-center">
                        <span className="text-sm leading-none font-extralight text-dark-blue-400">
                          Average response time{" "}
                          <span className="text-sm font-bold leading-none">
                            {/* Optionally use profile.averageResponseTime */}
                            {"1 hour"}
                          </span>
                        </span>
                      </div>

                      <button className="w-full mt-5 duration-300 transition focus-visible:outlin-none text-sm leading-5 font-semibold shrink-0 h-10 flex items-center justify-center gap-x-2 rounded-[5px] px-4 bg-white border-2 text-primary-500 hover:text-white hover:bg-primary-500 border-primary-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
                        <MessageSquare01 className="size-[15px]" /> Message Me
                      </button>
                    </div>

                    <div className="p-6 border-x rounded-b-lg border-b bg-white border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                          <MessageTextSquare01 className="size-[15px]" />
                          Language
                        </span>
                        <span className="text-xs leading-none font-bold text-dark-blue-400">
                          {profile?.languages?.map((l) => l.name).join(", ") ||
                            "N/A"}
                        </span>
                      </div>

                      <div className="flex mt-5 items-center justify-between">
                        <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                          <Clock className="size-[15px]" />
                          Time Zone
                        </span>
                        <span className="text-xs leading-none font-bold text-dark-blue-400">
                          {profile?.location || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 mt-6">
                    <div className="rounded-lg border border-gray-200 bg-white">
                      <div className="p-6">
                        <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                          Similar profiles
                        </h1>

                        <div className="mt-3">
                          <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                            <Avatar
                              className="hover:ring-0 active:ring-primary-100"
                              size="md"
                            >
                              <AvatarImage src="/man.jpg" alt="Man" />
                              <AvatarFallbackIcon />
                            </Avatar>

                            <div className="flex-1">
                              <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                                Jenny{" "}
                                <span className="text-xs font-extralight leading-none text-gray-500">
                                  @LakshitKumar
                                </span>
                              </h1>
                              <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                                Full Stack Developer
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                  $57
                                  <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                    /hr
                                  </span>
                                </span>

                                <div className="inline-flex items-center gap-x-1">
                                  <Star className="size-3 text-primary-500 fill-primary-500" />
                                  <span className="font-medium leading-none text-xs text-dark-blue-400">
                                    4.2
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                            <Avatar
                              className="hover:ring-0 active:ring-primary-100"
                              size="md"
                            >
                              <AvatarImage src="/man.jpg" alt="Man" />
                              <AvatarFallbackIcon />
                            </Avatar>

                            <div className="flex-1">
                              <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                                Jenny{" "}
                                <span className="text-xs font-extralight leading-none text-gray-500">
                                  @LakshitKumar
                                </span>
                              </h1>
                              <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                                Full Stack Developer
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                  $57
                                  <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                    /hr
                                  </span>
                                </span>

                                <div className="inline-flex items-center gap-x-1">
                                  <Star className="size-3 text-primary-500 fill-primary-500" />
                                  <span className="font-medium leading-none text-xs text-dark-blue-400">
                                    4.2
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                            <Avatar
                              className="hover:ring-0 active:ring-primary-100"
                              size="md"
                            >
                              <AvatarImage src="/man.jpg" alt="Man" />
                              <AvatarFallbackIcon />
                            </Avatar>

                            <div className="flex-1">
                              <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                                Jenny{" "}
                                <span className="text-xs font-extralight leading-none text-gray-500">
                                  @LakshitKumar
                                </span>
                              </h1>
                              <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                                Full Stack Developer
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                  $57
                                  <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                    /hr
                                  </span>
                                </span>

                                <div className="inline-flex items-center gap-x-1">
                                  <Star className="size-3 text-primary-500 fill-primary-500" />
                                  <span className="font-medium leading-none text-xs text-dark-blue-400">
                                    4.2
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                            <Avatar
                              className="hover:ring-0 active:ring-primary-100"
                              size="md"
                            >
                              <AvatarImage src="/man.jpg" alt="Man" />
                              <AvatarFallbackIcon />
                            </Avatar>

                            <div className="flex-1">
                              <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                                Jenny{" "}
                                <span className="text-xs font-extralight leading-none text-gray-500">
                                  @LakshitKumar
                                </span>
                              </h1>
                              <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                                Full Stack Developer
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                  $57
                                  <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                    /hr
                                  </span>
                                </span>

                                <div className="inline-flex items-center gap-x-1">
                                  <Star className="size-3 text-primary-500 fill-primary-500" />
                                  <span className="font-medium leading-none text-xs text-dark-blue-400">
                                    4.2
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-center">
                          <Button size="sm" variant="link" visual="gray">
                            View More
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="p-6">
                      <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                        Affiliated Teams
                      </h1>
                      <div className="mt-3">
                        {(profile?.teams ?? []).map((team, idx) => (
                          <div
                            className="py-3 flex items-center gap-x-2 border-b border-gray-200"
                            key={team.id || idx}
                          >
                            <Avatar
                              className="hover:ring-0 active:ring-primary-100"
                              size="md"
                            >
                              {/* If you have team.logoUrl, use it here */}
                              <AvatarImage src={"/man.jpg"} alt={team.name} />
                              <AvatarFallbackIcon />
                            </Avatar>
                            <div className="flex-1">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                              >
                                {team.name}
                              </NextLink>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-x-1 font-extralight">
                                  <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                                  <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                    {team.location}
                                  </span>
                                </span>
                                <div className="inline-flex items-center gap-x-1">
                                  <Clock className="size-[10px] text-primary-500" />
                                  <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                    {team.hours} hrs
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-center">
                        <Button size="sm" variant="link" visual="gray">
                          View More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </Layout>
    </div>
  )
}

export const Offers = () => {
  const [profile, setProfile] = useState<TalentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopMostHeader />
      <Layout>
        <ShowMoreLessRoot>
          {({ isShowing, setIsShowing }) => (
            <div className="px-[100px] pb-[50px]">
              <div className="h-[84px] border-b border-gray-200 flex items-center justify-between">
                <Button
                  className="group"
                  size="lg"
                  variant="link"
                  visual="gray"
                >
                  <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />
                  Back to Profile
                </Button>

                <div className="flex items-center gap-x-8">
                  <div className="flex items-center gap-x-3">
                    <Avatar size="lg">
                      <AvatarImage src="/man.jpg" alt="man" />
                      <AvatarFallbackIcon />
                    </Avatar>

                    <div className="flex flex-col gap-y-0.5">
                      <span className="text-lg inline-flex items-center gap-x-[3px] font-bold leading-none text-dark-blue-400">
                        {profile?.fullName || "Full Name"}{" "}
                        <span className="text-base leading-none font-extralight text-dark-blue-400">
                          @{profile?.username || "username"}
                        </span>
                      </span>
                      <span className="text-sm leading-none font-medium text-dark-blue-400">
                        {profile?.headline || "Expert React Developer"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-3">
                    <TooltipProvider delayDuration={75}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="md">
                            <Plus className="size-[15px]" />
                            Hire Me
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          visual="white"
                          size="md"
                          className="group text-gray-700 p-6 max-w-[344px] border border-gray-200 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]"
                          sideOffset={14}
                          side="bottom"
                        >
                          <div className="flex items-center mt-3 gap-x-2">
                            <Clock className="size-4" />
                            <p className="text-sm leading-none font-extralight text-dark-blue-400">
                              Dheeraj{" "}
                              <span className="font-medium">
                                is not currently available
                              </span>{" "}
                              for hire
                            </p>
                          </div>

                          <Button
                            className="mt-3 group"
                            size="md"
                            variant="link"
                          >
                            View similar talent{" "}
                            <ArrowRight className="size-3 transition duration-300 group-hover:translate-x-[4px]" />
                          </Button>

                          <span className="absolute inline-block size-4 border-b border-r border-gray-200 bg-white rotate-45 group-data-[side=bottom]:border-r-0 group-data-[side=bottom]:border-b-0 group-data-[side=bottom]:border-l group-data-[side=bottom]:border-t inset-x-0 mx-auto group-data-[side=top]:-bottom-2 group-data-[side=bottom]:-top-2" />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <SaveButton />

                    <IconButton
                      className="text-gray-500"
                      variant="outlined"
                      visual="gray"
                      size="md"
                    >
                      <Share className="size-[20px]" />
                    </IconButton>
                  </div>
                </div>
              </div>

              <div className="mt-[50px]">
                <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                  My Offers
                </h1>

                <Tabs defaultValue="Projects" className="mt-6">
                  <div className="flex items-center justify-between">
                    <RadixTabs.List className="inline-flex items-center gap-x-3">
                      <TabsTrigger
                        showUnderline={false}
                        variant="unstyled"
                        value="Projects"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Projects
                      </TabsTrigger>
                      <TabsTrigger
                        showUnderline={false}
                        variant="unstyled"
                        value="Services"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Services
                      </TabsTrigger>
                    </RadixTabs.List>

                    <RadixTabs.Tabs
                      defaultValue="Front-end"
                      className="contents"
                    >
                      <RadixTabs.List className="inline-flex items-center gap-x-3">
                        <RadixTabs.Trigger
                          value="Front-end"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Font-end
                        </RadixTabs.Trigger>
                        <RadixTabs.Trigger
                          value="Back-End"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Back-End
                        </RadixTabs.Trigger>
                        <RadixTabs.Trigger
                          value="Database"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Database
                        </RadixTabs.Trigger>
                      </RadixTabs.List>
                    </RadixTabs.Tabs>
                  </div>

                  <TabsContent value="Projects">
                    <div className="pt-6 grid grid-cols-4 gap-x-5 gap-y-6">
                      <ShowMoreLess max={12}>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                        <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                          <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                            <NextImage
                              className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                          </div>

                          <div className="mt-3 flex items-start gap-x-3">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                            >
                              The Ultimate Mobile App Experience
                            </NextLink>

                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                4.9 <span className="font-extralight">(5)</span>
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                            Brief Description of the project. Lorem ipsum dolor
                            sit amet, consectetur adipiscing elit, sed do
                            eiusmod tempor incididunt.
                          </p>

                          <div className="mt-[14.5px] flex flex-col gap-y-3">
                            <div className="flex items-center gap-x-[6.4px]">
                              <Clock className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                Starting from 12 weeks
                              </span>
                            </div>

                            <div className="flex items-center gap-x-[6.4px]">
                              <Money className="size-[18px] shrink-0 text-primary-500" />

                              <span className="font-medium text-sm leading-none text-dark-blue-400">
                                $50,000 budget
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex items-end justify-between">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AvatarGroup
                                    max={5}
                                    size="sm"
                                    excess
                                    excessClassName="border-gray-300 text-gray-500"
                                  >
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar
                                      size="sm"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>
                                </TooltipTrigger>

                                <TooltipContent
                                  className="p-0 max-w-[262px]"
                                  size="md"
                                >
                                  <ScrollArea
                                    className="h-[192px] p-3"
                                    scrollBar={
                                      <ScrollBar
                                        className="w-4 p-1"
                                        thumbClassName="bg-white/20"
                                      />
                                    }
                                  >
                                    <div className="space-y-3 pr-5">
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[18px]">
                                        <div className="flex items-center gap-x-2 flex-auto">
                                          <Avatar>
                                            <AvatarImage
                                              src="/woman.jpg"
                                              alt="Woman"
                                            />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>

                                          <div className="flex flex-col flex-auto">
                                            <div className="flex items-center gap-x-0.5">
                                              <span className="text-xs leading-5 font-semibold text-white">
                                                Sevil
                                              </span>
                                              <span className="text-[10px] leading-none font-light text-white">
                                                @designsuperstar23
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-light text-white">
                                              Full-stack Developer
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-sm font-semibold text-white leading-5">
                                          $75{" "}
                                          <span className="text-[10px] font-light leading-5">
                                            /hr
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <FavoriteRoot>
                              {({ pressed }) => (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block">
                                        <Favorite />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {pressed ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <Check className="size-[15px] shrink-0 text-green-500" />
                                          Saved
                                        </span>
                                      ) : (
                                        "Save to favorites"
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </FavoriteRoot>
                          </div>
                        </article>
                      </ShowMoreLess>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {isShowing ? null : (
                <div className="mt-[50px] flex items-center justify-center">
                  <Button
                    className="bg-white"
                    size="md"
                    variant="outlined"
                    onClick={() => setIsShowing((prev) => !prev)}
                  >
                    Load More...
                  </Button>
                </div>
              )}
            </div>
          )}
        </ShowMoreLessRoot>
      </Layout>
    </div>
  )
}

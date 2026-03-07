"use client"

import React, { useEffect, useRef, useState } from "react"
import { getComputedStyle } from "@/utils/dom-utils"
import { cn, toPxIfNumber } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Heart,
  MapPin,
  MarkerPin02,
  MessageSquare01,
  MessageTextSquare01,
  Plus,
  Plus2,
  RefreshCw,
  SearchMd,
  Share,
  Share01,
  Share06,
  Share07,
  Star,
  XCircle,
} from "@blend-metrics/icons"
import { AdobeBrand, WordpressBrand } from "@blend-metrics/icons/brands"
import { GoogleDefault } from "@blend-metrics/icons/social"
import * as RadixTabs from "@radix-ui/react-tabs"
import { TooltipArrow } from "@radix-ui/react-tooltip"
import { Variants, motion } from "framer-motion"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import { useToggle } from "react-use"
import { Adobe } from "@/components/icons/adobe"
import { Dropbox } from "@/components/icons/dropbox"
import { Microsoft } from "@/components/icons/microsoft"
import { Nasdaq } from "@/components/icons/nasdaq"
import { LikeDislike } from "@/components/like-dislike"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ReadMoreLess } from "@/components/read-more-less"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
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
  CarouselNextTrigger,
  CarouselPreviousTrigger,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ScrollArea,
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
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"

const SaveButton = () => {
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

const SectionSearchBar = () => {
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

export default function Default() {
  const cardRef = useRef<HTMLDivElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [isCardStuck, setIsCardStuck] = useState<boolean>(false)
  const [isTabsListStuck, setIsTabsListStuck] = useState<boolean>(false)

  // Auto-expand state for sections
  const [autoExpandPortfolio, setAutoExpandPortfolio] = useState<boolean>(false)
  const [autoExpandSkills, setAutoExpandSkills] = useState<boolean>(false)
  const [autoExpandOffers, setAutoExpandOffers] = useState<boolean>(false)
  const [autoExpandWorkExperience, setAutoExpandWorkExperience] =
    useState<boolean>(false)
  const [autoExpandEducation, setAutoExpandEducation] = useState<boolean>(false)
  const [autoExpandProjectHistory, setAutoExpandProjectHistory] =
    useState<boolean>(false)
  const [backgroundActiveTab, setBackgroundActiveTab] =
    useState<string>("Work Experience")
  const [activeTab, setActiveTab] = useState<string>("Portfolio")
  const [showLanguageSection, setShowLanguageSection] = useState<boolean>(true)
  const [lastScrollY, setLastScrollY] = useState<number>(0)
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

  // Scroll direction detection for language section visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setShowLanguageSection(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setShowLanguageSection(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [lastScrollY])
  // Auto-expand sections when navigated to via hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash

      // Reset all auto-expand states
      setAutoExpandPortfolio(false)
      setAutoExpandSkills(false)
      setAutoExpandOffers(false)
      setAutoExpandWorkExperience(false)
      setAutoExpandEducation(false)
      setAutoExpandProjectHistory(false)

      // Reset background tab to default
      setBackgroundActiveTab("Work Experience")

      // Set auto-expand for the target section
      switch (hash) {
        case "#portfolio":
          // Delay for portfolio to allow layout to settle
          setTimeout(() => {
            setActiveTab("Portfolio")
            setAutoExpandPortfolio(true)
            // Manual scroll to portfolio section
            setTimeout(() => {
              const portfolioElement = document.getElementById("portfolio")
              if (portfolioElement) {
                portfolioElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#skills":
          // Delay for skills to allow layout to settle
          setTimeout(() => {
            setActiveTab("Skills")
            setAutoExpandSkills(true)
            // Manual scroll to skills section
            setTimeout(() => {
              const skillsElement = document.getElementById("skills")
              if (skillsElement) {
                skillsElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#offers":
          setActiveTab("Offers")
          setAutoExpandOffers(true)
          break
        case "#background":
          setActiveTab("Work Experience")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          break
        case "#education":
          setActiveTab("Education")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          setBackgroundActiveTab("Education")
          // Prevent default scroll behavior and manually scroll to background section
          setTimeout(() => {
            const backgroundElement = document.getElementById("background")
            if (backgroundElement) {
              backgroundElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          }, 50)
          break
        case "#project-history":
          setActiveTab("Project History")
          setAutoExpandProjectHistory(true)
          break
        case "#overview":
          setActiveTab("Overview")
          break
      }
    }

    // Handle click events on specific links that need auto-expand or special handling
    const handleNavigationClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement
      if (target.href && target.href.includes("#")) {
        const hash = target.href.split("#")[1]
        if (hash === "education") {
          e.preventDefault()
          window.history.pushState(null, "", "#education")
          handleHashChange()
        } else if (hash === "background") {
          e.preventDefault()
          window.history.pushState(null, "", "#background")
          handleHashChange()
        } else if (hash === "portfolio" || hash === "skills") {
          // Prevent default scroll and handle manually
          e.preventDefault()
          window.history.pushState(null, "", `#${hash}`)
          handleHashChange()
        }
      }
    }

    // Add click listeners to all navigation links
    document.addEventListener("click", handleNavigationClick)

    // Handle initial hash on load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
      document.removeEventListener("click", handleNavigationClick)
    }
  }, [])

  return (
    <>
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[100px]">
          <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <div className="p-10 flex items-start gap-x-10">
              <Avatar className="size-[318px]">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback />
              </Avatar>

              <div className="flex-auto">
                <div className="flex items-start">
                  <div className="flex-auto">
                    <h1 className="text-[28px] leading-[34px] font-bold text-dark-blue-400">
                      Dheeraj
                      <span className="text-[26px] font-extralight">
                        @dheerajnagdali
                      </span>
                    </h1>
                    <h2 className="text-[22px] mt-1 leading-[27px] text-dark-blue-400 font-medium">
                      Expert React Developer
                    </h2>

                    <p className="mt-2 text-sm leading-none text-gray-500">
                      10 years of experience
                    </p>

                    <div className="mt-6 flex items-center gap-x-3">
                      <Badge
                        className="bg-primary-500 text-white rounded-[4px]"
                        visual="primary"
                      >
                        <Star className="size-3 fill-white" /> 4.5
                      </Badge>

                      <span className="text-xs leading-none text-gray-500">
                        24 reviews
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-x-[9px]">
                        <MapPin className="size-4" />
                        <p className="text-sm leading-none font-medium text-dark-blue-400">
                          Nainital, Uttarakhand, India
                        </p>
                      </div>

                      <div className="flex items-center mt-3 gap-x-[9px]">
                        <Clock className="size-4" />
                        <p className="text-sm leading-none font-extralight text-dark-blue-400">
                          Dheeraj is{" "}
                          <span className="text-success-600 font-medium">
                            available
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
                      <Share06 className="size-[20px]" />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-[54px]">
                  <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                    What I do
                  </h1>

                  <>
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
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <NextLink
                              href="#skills"
                              onClick={() => setActiveTab("Skills")}
                            >
                              <Badge
                                className="text-gray-700 cursor-pointer"
                                visual="gray"
                                size="lg"
                              >
                                <Plus2 className="h-3 w-3" /> 6 more...
                              </Badge>
                            </NextLink>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                          </ShowMoreLess>
                        </div>
                      )}
                    </ShowMoreLessRoot>
                  </>
                </div>
              </div>
            </div>

            <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Rate
                </span>
                <span className="text-xl font-bold leading-none text-dark-blue-400">
                  $85 - $120
                  <span className="text-sm font-extralight leading-none text-dark-blue-400">
                    /hr
                  </span>
                </span>
              </div>
              <div className="flex gap-x-2 justify-center  items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Client success rating
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  95%
                </span>
              </div>
              <div className="flex gap-x-2 justify-center  items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Total projects completed
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  1450
                </span>
              </div>
              <div className="flex gap-x-2 justify-center  items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Member since
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  September 19, 2024
                </span>
              </div>
              <div className="flex gap-x-2 justify-center  items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Repeat hire rate
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  85%
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs className="mt-6" value={activeTab} onValueChange={setActiveTab}>
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
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallbackIcon />
                    </Avatar>
                    <div className="flex flex-col gap-y-0.5">
                      <span className="text-lg leading-none font-bold text-dark-blue-400">
                        Dheeraj{" "}
                        <span className="text-base font-extralight">
                          @dheerajnagdali
                        </span>
                      </span>
                      <span className="text-sm leading-none font-medium text-dark-blue-400">
                        Expert React Developer
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
                      <NextLink href="#portfolio">Portfolio</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Skills" asChild>
                      <NextLink href="#skills">Skills</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Overview" asChild>
                      <NextLink href="#overview">Overview</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Offers" asChild>
                      <NextLink href="#offers">Offers</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Work Experience" asChild>
                      <NextLink href="#background">Work Experience</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Education" asChild>
                      <NextLink href="#education">Education</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Project History" asChild>
                      <NextLink href="#project-history">
                        Project History
                      </NextLink>
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
                      <Share06 className="size-[20px]" />
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
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[137.5px]"
            id="portfolio"
          >
            <div className="pt-6 flex gap-x-8">
              <div className="flex-auto">
                <ShowMoreLessRoot
                  value={autoExpandPortfolio}
                  onValueChange={setAutoExpandPortfolio}
                >
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
                        <ShowMoreLess max={3}>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px]">
                            <NextImage
                              className="object-cover"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] group-hover:opacity-100 opacity-0 inset-0 absolute flex justify-end items-start flex-col hover:bg-black/50 transition duration-300">
                              <h1 className="text-sm leading-none font-medium text-white">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px]">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                        </ShowMoreLess>
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

                  <ShowMoreLessRoot
                    value={autoExpandSkills}
                    onValueChange={setAutoExpandSkills}
                  >
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
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            {isShowing ? null : (
                              <Badge
                                className="text-gray-700"
                                visual="gray"
                                size="lg"
                              >
                                <Plus2 className="h-3 w-3" /> 17 more...
                              </Badge>
                            )}
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Next.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Typescript
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              React.js
                            </Badge>
                            <Badge
                              className="text-gray-700"
                              visual="gray"
                              size="lg"
                            >
                              Tailwind CSS
                            </Badge>
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

                    <ReadMoreLess text="Front-end Technologies & Web Accessibility | Exploring Human Interface Design I’m passionate about crafting intuitive, user-friendly digital experiences with a strong focus on accessibility and human-centered design. With expertise in HTML, CSS, JavaScript, and modern frameworks, I create seamless interfaces that enhance usability for all users, including those with disabilities. I believe technology should be inclusive, aesthetically engaging, and functionally efficient.">
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
                        <Dropbox />
                        <Microsoft />
                        <Adobe />
                        <Nasdaq />
                      </div>
                    </TabsContent>
                    <TabsContent value="Certifications">
                      <div className="pt-6 flex items-center gap-x-6">
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <AdobeBrand className="size-7" />
                          Adobe Certified Professional
                        </div>
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <GoogleDefault className="size-6" />
                          Google UX Design Certificate
                        </div>
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <WordpressBrand className="size-7" />
                          Certified Wordpress Developer
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="Industry Expertise">
                      <div className="pt-6 flex items-center gap-x-3">
                        <Badge size="lg" visual="gray">
                          Real Estate
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Finance
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Accounting
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Insurance
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Music
                        </Badge>
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
                      <TabsList className="inline-flex items-center gap-x-3">
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
                      </TabsList>

                      <div className="inline-flex items-center gap-x-6">
                        <TabsList className="inline-flex items-center gap-x-3">
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Frontend"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Frontend
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Backend"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Backend
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Database"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Database
                          </TabsTrigger>
                        </TabsList>

                        <Button className="group" variant="link" visual="gray">
                          View All{" "}
                          <ArrowRight className="size-[15px] transition duration-300 group-hover:translate-x-[4px]" />
                        </Button>
                      </div>
                    </div>

                    <TabsContent value="Frontend">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      React Dashboard Development
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (12)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Modern React dashboard with TypeScript,
                                    Tailwind CSS, and advanced data
                                    visualization components.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 8 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $35,000 budget
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
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        4.8k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Vue.js E-commerce Platform
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.7{" "}
                                        <span className="font-extralight">
                                          (20)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Complete e-commerce solution built with
                                    Vue.js 3, Nuxt.js, and modern payment
                                    integration.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 10 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $45,000 budget
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
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        3.2k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Angular Enterprise App
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (8)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Large-scale Angular application with NgRx
                                    state management and enterprise-grade
                                    architecture.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 14 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $60,000 budget
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
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        2.1k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Backend">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Node.js API Development
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (15)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    RESTful API development with Node.js,
                                    Express, and MongoDB. Includes
                                    authentication and real-time features.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 10 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $40,000 budget
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
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        3.8k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Python Django Framework
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.7{" "}
                                        <span className="font-extralight">
                                          (18)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Full-stack web application development using
                                    Django framework with PostgreSQL database
                                    integration.
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
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        2.9k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Microservices Architecture
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (22)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Scalable microservices architecture design
                                    and implementation with Docker, Kubernetes,
                                    and service mesh.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 16 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $75,000 budget
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
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        4.5k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Database">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      PostgreSQL Database Design
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (25)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Professional database design and
                                    optimization for PostgreSQL. Includes
                                    performance tuning and backup strategies.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 8 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $30,000 budget
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
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        3.2k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      MongoDB NoSQL Solutions
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.6{" "}
                                        <span className="font-extralight">
                                          (19)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    NoSQL database design and implementation
                                    with MongoDB. Includes data modeling and
                                    aggregation pipeline optimization.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 6 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $25,000 budget
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
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        2.7k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Redis Cache Implementation
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (14)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    High-performance caching solutions using
                                    Redis. Includes session management and
                                    real-time data processing.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 4 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $18,000 budget
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
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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

                                    <div className="inline-flex items-center gap-x-[6.4px]">
                                      <Heart className="size-[15px] text-red-500 fill-red-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        1.8k interested
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Projects">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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
                    </TabsContent>

                    <TabsContent value="Services">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
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
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
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
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
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
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
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
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
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

                  <Tabs
                    value={backgroundActiveTab}
                    onValueChange={setBackgroundActiveTab}
                    className="mt-6"
                  >
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
                      <ShowMoreLessRoot
                        value={autoExpandWorkExperience}
                        onValueChange={setAutoExpandWorkExperience}
                      >
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
                                <div className="flex gap-x-6">
                                  <div className="relative flex flex-col items-center">
                                    <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                                      <NextImage
                                        className="object-contain"
                                        src="/android.png"
                                        alt="Android"
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
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>

                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                    <div className="pb-8">
                                      <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                <div className="flex gap-x-6">
                                  <div className="relative flex flex-col items-center">
                                    <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                                      <NextImage
                                        className="object-contain"
                                        src="/android.png"
                                        alt="Android"
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
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                    <div className="pb-8">
                                      <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                <div className="flex gap-x-6">
                                  <div className="relative flex flex-col items-center">
                                    <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                                      <NextImage
                                        className="object-contain"
                                        src="/android.png"
                                        alt="Android"
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
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                    <div className="pb-8">
                                      <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                <div className="flex gap-x-6">
                                  <div className="relative flex flex-col items-center">
                                    <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                                      <NextImage
                                        className="object-contain"
                                        src="/android.png"
                                        alt="Android"
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
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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

                                    <div className="pb-8">
                                      <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                        Lead Front-End Developer
                                      </h1>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        Android
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          December 2020 - Present
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          5 yrs 2 mos
                                        </span>
                                      </div>
                                      <ReadMoreLess
                                        max={52}
                                        text="Lorem ipsum dolor sit amet consectetur. Cursus vitae purus in convallis nulla arcu sed. Diam pellentesque ornare nec consectetur maecenas leo lectus. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur. Risus nunc sit urna neque volutpat at sed. Tortor integer faucibus sed viverra malesuada ornare tellus enim sollicitudin. Id odio porttitor interdum nulla. Lorem ipsum dolor sit amet consectetur."
                                      >
                                        {({ readMore, text, toggle }) => (
                                          <>
                                            <p className="mt-3 text-sm leading-none font-extralight   text-gray-700">
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
                      <ShowMoreLessRoot
                        value={autoExpandEducation}
                        onValueChange={setAutoExpandEducation}
                      >
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
                                <div className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                    <NextImage
                                      className="object-cover"
                                      src="/university-of-florida.png"
                                      alt="University Of Florida"
                                      fill
                                      sizes="20vw"
                                    />
                                  </div>

                                  <div className="flex-auto">
                                    <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                      University of Florida
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        Master of Science
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        Computer Science
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        August 2012 - September 2014
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                    <NextImage
                                      className="object-cover"
                                      src="/university-of-florida.png"
                                      alt="University Of Florida"
                                      fill
                                      sizes="20vw"
                                    />
                                  </div>

                                  <div className="flex-auto">
                                    <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                      University of Florida
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        Master of Science
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        Computer Science
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        August 2012 - September 2014
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                    <NextImage
                                      className="object-cover"
                                      src="/university-of-florida.png"
                                      alt="University Of Florida"
                                      fill
                                      sizes="20vw"
                                    />
                                  </div>

                                  <div className="flex-auto">
                                    <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                      University of Florida
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        Master of Science
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        Computer Science
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        August 2012 - September 2014
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                    <NextImage
                                      className="object-cover"
                                      src="/university-of-florida.png"
                                      alt="University Of Florida"
                                      fill
                                      sizes="20vw"
                                    />
                                  </div>

                                  <div className="flex-auto">
                                    <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                      University of Florida
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        Master of Science
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        Computer Science
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        August 2012 - September 2014
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                    <NextImage
                                      className="object-cover"
                                      src="/university-of-florida.png"
                                      alt="University Of Florida"
                                      fill
                                      sizes="20vw"
                                    />
                                  </div>

                                  <div className="flex-auto">
                                    <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                      University of Florida
                                    </h1>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        Master of Science
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        Computer Science
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        August 2012 - September 2014
                                      </span>
                                    </div>
                                  </div>
                                </div>
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

                <div className="mt-6 scroll-mt-[137.5px]" id="project-history">
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
                        defaultValue={4}
                        disabled
                      >
                        <RatingGroupLabel size="sm">4.9</RatingGroupLabel>
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
                        23 ratings
                      </NextLink>
                    </div>

                    <div className="flex flex-col flex-1 gap-y-1 basis-[304px]">
                      <div className="flex items-center gap-x-2">
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                        >
                          5
                        </NextLink>
                        <Progress className="flex-auto" value={100} />
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                        >
                          100% <span className="font-extralight">(100)</span>
                        </NextLink>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                        >
                          4
                        </NextLink>
                        <Progress className="flex-auto" value={75} />
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                        >
                          75% <span className="font-extralight">(75)</span>
                        </NextLink>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                        >
                          3
                        </NextLink>
                        <Progress className="flex-auto" value={50} />
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                        >
                          50% <span className="font-extralight">(50)</span>
                        </NextLink>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                        >
                          2
                        </NextLink>
                        <Progress className="flex-auto" value={25} />
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                        >
                          25% <span className="font-extralight">(25)</span>
                        </NextLink>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                        >
                          1
                        </NextLink>
                        <Progress className="flex-auto" value={0} />
                        <NextLink
                          href="#"
                          className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                        >
                          0% <span className="font-extralight">(0)</span>
                        </NextLink>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col basis-[304px]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                          >
                            Communication Level
                          </NextLink>

                          <div className="flex items-center gap-x-1">
                            <Star className="size-3.5 text-primary-500 fill-primary-500" />
                            <span className="text-[13px] leading-none font-medium">
                              4.3
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                          >
                            Responsiveness
                          </NextLink>

                          <div className="flex items-center gap-x-1">
                            <Star className="size-3.5 text-primary-500 fill-primary-500" />
                            <span className="text-[13px] leading-none font-medium">
                              4.3
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                          >
                            Quality of Delivery
                          </NextLink>

                          <div className="flex items-center gap-x-1">
                            <Star className="size-3.5 text-primary-500 fill-primary-500" />
                            <span className="text-[13px] leading-none font-medium">
                              4.3
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                          >
                            Value of Delivery
                          </NextLink>

                          <div className="flex items-center gap-x-1">
                            <Star className="size-3.5 text-primary-500 fill-primary-500" />
                            <span className="text-[13px] leading-none font-medium">
                              4.3
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                          >
                            Value of Delivery
                          </NextLink>

                          <div className="flex items-center gap-x-1">
                            <Star className="size-3.5 text-primary-500 fill-primary-500" />
                            <span className="text-[13px] leading-none font-medium">
                              4.9
                            </span>
                          </div>
                        </div>
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
                      <ShowMoreLessRoot
                        value={autoExpandProjectHistory}
                        onValueChange={setAutoExpandProjectHistory}
                      >
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
                              <ShowMoreLessComp max={2}>
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="flex items-center pt-6 px-6">
                                    <div className="flex-1 w-[394px] space-y-3">
                                      <div className="flex items-start gap-x-3">
                                        <Avatar size="md">
                                          <AvatarImage
                                            src="/man.jpg"
                                            alt="Man"
                                          />
                                          <AvatarFallback>M</AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-3">
                                          <div className="flex flex-col">
                                            <div className="inline-flex items-center gap-x-1">
                                              <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                Emily
                                              </span>
                                              <span className="text-base leading-6 text-dark-blue-400">
                                                @emily.j
                                              </span>
                                            </div>

                                            <span className="text-[13px] leading-6 text-dark-blue-400">
                                              Product Manager
                                            </span>
                                          </div>

                                          <div className="inline-flex items-center gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              December 2020 - Present
                                            </span>
                                            <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              5 yrs 2 mos
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <div className="inline-flex items-center gap-x-[2.35px]">
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                        </div>

                                        <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                          4.8
                                        </span>

                                        <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                          Posted a week ago
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 px-6">
                                    <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                      Best Experience with a Backend
                                      Engineer!!!!
                                    </h1>
                                    <ReadMoreLess
                                      max={32}
                                      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                    >
                                      {({ readMore, text, toggle }) => (
                                        <>
                                          <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                            {text}{" "}
                                            <Button
                                              className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                              size="sm"
                                              variant="link"
                                              visual="gray"
                                              onClick={toggle}
                                            >
                                              {readMore ? null : "...Read More"}
                                            </Button>
                                          </p>
                                        </>
                                      )}
                                    </ReadMoreLess>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="items-center inline-flex gap-x-2.5">
                                        <span className="text-xs font-medium leading-none text-dark-blue-400">
                                          Helpful
                                        </span>
                                        <LikeDislike></LikeDislike>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                    <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                      <NextImage
                                        className="object-cover"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="25vw"
                                      />
                                    </div>

                                    <div className="flex-auto space-y-3">
                                      <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                        Seniority Mobile App
                                      </h1>

                                      <div className="flex gap-x-8 items-center">
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="flex items-center pt-6 px-6">
                                    <div className="flex-1 w-[394px] space-y-3">
                                      <div className="flex items-start gap-x-3">
                                        <Avatar size="md">
                                          <AvatarImage
                                            src="/man.jpg"
                                            alt="Man"
                                          />
                                          <AvatarFallback>M</AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-3">
                                          <div className="flex flex-col">
                                            <div className="inline-flex items-center gap-x-1">
                                              <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                Emily
                                              </span>
                                              <span className="text-base leading-6 text-dark-blue-400">
                                                @emily.j
                                              </span>
                                            </div>

                                            <span className="text-[13px] leading-6 text-dark-blue-400">
                                              Product Manager
                                            </span>
                                          </div>

                                          <div className="inline-flex items-center gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              December 2020 - Present
                                            </span>
                                            <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              5 yrs 2 mos
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <div className="inline-flex items-center gap-x-[2.35px]">
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                        </div>

                                        <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                          4.8
                                        </span>

                                        <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                          Posted a week ago
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 px-6">
                                    <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                      Best Experience with a Backend
                                      Engineer!!!!
                                    </h1>
                                    <ReadMoreLess
                                      max={32}
                                      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                    >
                                      {({ readMore, text, toggle }) => (
                                        <>
                                          <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                            {text}{" "}
                                            <Button
                                              className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                              size="sm"
                                              variant="link"
                                              visual="gray"
                                              onClick={toggle}
                                            >
                                              {readMore ? null : "...Read More"}
                                            </Button>
                                          </p>
                                        </>
                                      )}
                                    </ReadMoreLess>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="items-center inline-flex gap-x-2.5">
                                        <span className="text-xs font-medium leading-none text-dark-blue-400">
                                          Helpful
                                        </span>

                                        <LikeDislike />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                    <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                      <NextImage
                                        className="object-cover"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="25vw"
                                      />
                                    </div>

                                    <div className="flex-auto space-y-3">
                                      <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                        Seniority Mobile App
                                      </h1>

                                      <div className="flex gap-x-8 items-center">
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-6 bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border-t">
                                    <div className="flex items-center gap-x-3">
                                      <Avatar
                                        className="hover:ring-0 active:ring-primary-100"
                                        size="md"
                                      >
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallbackIcon />
                                      </Avatar>

                                      <div className="flex flex-col flex-1">
                                        <div className="inline-flex items-center gap-x-1">
                                          <span className="text-sm leading-6 font-bold text-dark-blue-400">
                                            Company Response
                                          </span>
                                          <span className="text-sm leading-6 text-dark-blue-400">
                                            @Acme Inc.
                                          </span>
                                        </div>

                                        <div className="inline-flex items-center mt-[1.5px] gap-x-2">
                                          <span className="text-xs leading-none text-dark-blue-400">
                                            90 days project
                                          </span>
                                          <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                          <span className="text-xs leading-none text-dark-blue-400">
                                            March 2023
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <ReadMoreLess
                                      max={32}
                                      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                    >
                                      {({ readMore, text, toggle }) => (
                                        <>
                                          <p className="text-sm leading-none mt-3 text-gray-700 font-extralight">
                                            {text}{" "}
                                            <Button
                                              className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                              size="sm"
                                              variant="link"
                                              visual="gray"
                                              onClick={toggle}
                                            >
                                              {readMore ? null : "...Read More"}
                                            </Button>
                                          </p>
                                        </>
                                      )}
                                    </ReadMoreLess>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="items-center inline-flex gap-x-2.5">
                                        <span className="text-xs font-medium leading-none text-dark-blue-400">
                                          Helpful
                                        </span>
                                        <LikeDislike></LikeDislike>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="flex items-center pt-6 px-6">
                                    <div className="flex-1 w-[394px] space-y-3">
                                      <div className="flex items-start gap-x-3">
                                        <Avatar size="md">
                                          <AvatarImage
                                            src="/man.jpg"
                                            alt="Man"
                                          />
                                          <AvatarFallback>M</AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-3">
                                          <div className="flex flex-col">
                                            <div className="inline-flex items-center gap-x-1">
                                              <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                Emily
                                              </span>
                                              <span className="text-base leading-6 text-dark-blue-400">
                                                @emily.j
                                              </span>
                                            </div>

                                            <span className="text-[13px] leading-6 text-dark-blue-400">
                                              Product Manager
                                            </span>
                                          </div>

                                          <div className="inline-flex items-center gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              December 2020 - Present
                                            </span>
                                            <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              5 yrs 2 mos
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <div className="inline-flex items-center gap-x-[2.35px]">
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                        </div>

                                        <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                          4.8
                                        </span>

                                        <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                          Posted a week ago
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 px-6">
                                    <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                      Best Experience with a Backend
                                      Engineer!!!!
                                    </h1>
                                    <ReadMoreLess
                                      max={32}
                                      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                    >
                                      {({ readMore, text, toggle }) => (
                                        <>
                                          <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                            {text}{" "}
                                            <Button
                                              className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                              size="sm"
                                              variant="link"
                                              visual="gray"
                                              onClick={toggle}
                                            >
                                              {readMore ? null : "...Read More"}
                                            </Button>
                                          </p>
                                        </>
                                      )}
                                    </ReadMoreLess>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="items-center inline-flex gap-x-2.5">
                                        <span className="text-xs font-medium leading-none text-dark-blue-400">
                                          Helpful
                                        </span>

                                        <LikeDislike></LikeDislike>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                    <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                      <NextImage
                                        className="object-cover"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="25vw"
                                      />
                                    </div>

                                    <div className="flex-auto space-y-3">
                                      <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                        Seniority Mobile App
                                      </h1>

                                      <div className="flex gap-x-8 items-center">
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="flex items-center pt-6 px-6">
                                    <div className="flex-1 w-[394px] space-y-3">
                                      <div className="flex items-start gap-x-3">
                                        <Avatar size="md">
                                          <AvatarImage
                                            src="/man.jpg"
                                            alt="Man"
                                          />
                                          <AvatarFallback>M</AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-3">
                                          <div className="flex flex-col">
                                            <div className="inline-flex items-center gap-x-1">
                                              <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                Emily
                                              </span>
                                              <span className="text-base leading-6 text-dark-blue-400">
                                                @emily.j
                                              </span>
                                            </div>

                                            <span className="text-[13px] leading-6 text-dark-blue-400">
                                              Product Manager
                                            </span>
                                          </div>

                                          <div className="inline-flex items-center gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              December 2020 - Present
                                            </span>
                                            <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              5 yrs 2 mos
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <div className="inline-flex items-center gap-x-[2.35px]">
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                          <Favorite
                                            defaultPressed
                                            className="size-[15px]"
                                          />
                                        </div>

                                        <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                          4.8
                                        </span>

                                        <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                          Posted a week ago
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <CheckCircle className="size-[18px] text-success-500" />
                                        <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                          Would Recommend
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 px-6">
                                    <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                      Best Experience with a Backend
                                      Engineer!!!!
                                    </h1>
                                    <ReadMoreLess
                                      max={32}
                                      text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                    >
                                      {({ readMore, text, toggle }) => (
                                        <>
                                          <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                            {text}{" "}
                                            <Button
                                              className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                              size="sm"
                                              variant="link"
                                              visual="gray"
                                              onClick={toggle}
                                            >
                                              {readMore ? null : "...Read More"}
                                            </Button>
                                          </p>
                                        </>
                                      )}
                                    </ReadMoreLess>

                                    <div className="mt-3 flex items-center justify-between">
                                      <div className="items-center inline-flex gap-x-2.5">
                                        <span className="text-xs font-medium leading-none text-dark-blue-400">
                                          Helpful
                                        </span>

                                        <LikeDislike></LikeDislike>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                    <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                      <NextImage
                                        className="object-cover"
                                        src="/dashboard.png"
                                        alt="Dashboard"
                                        fill
                                        sizes="25vw"
                                      />
                                    </div>

                                    <div className="flex-auto space-y-3">
                                      <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                        Seniority Mobile App
                                      </h1>

                                      <div className="flex gap-x-8 items-center">
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-x-3">
                                          <span className="text-sm text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                          <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                            Project Cost
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-x-2">
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                        <Badge size="sm" visual="gray">
                                          Team player
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
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
                                  "Show More Feedback (1)"
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
                        <span className="size-2 inline-block bg-gray-500 rounded-full" />{" "}
                        Offline
                      </span>
                      <span className="font-extralight text-sm leading-none text-dark-blue-400">
                        3:30 PM local time
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-sm leading-none font-extralight text-dark-blue-400">
                        Average response time{" "}
                        <span className="text-sm font-bold leading-none">
                          1 hour
                        </span>
                      </span>
                    </div>

                    <button className="w-full mt-5 duration-300 transition focus-visible:outlin-none text-sm leading-5 font-semibold shrink-0 h-10 flex items-center justify-center gap-x-2 rounded-[5px] px-4 bg-white border-2 text-primary-500 hover:text-white hover:bg-primary-500 border-primary-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
                      <MessageSquare01 className="size-[15px]" /> Message Me
                    </button>
                  </div>

                  <div
                    className={`border-x rounded-b-lg border-b bg-white border-gray-200 transition-all duration-300 overflow-hidden ${
                      showLanguageSection
                        ? "p-6 max-h-[200px] opacity-100"
                        : "p-0 max-h-0 opacity-0"
                    }`}
                  >
                    {showLanguageSection && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                            <MessageTextSquare01 className="size-[15px]" />
                            Language
                          </span>

                          <span className="text-xs leading-none font-bold text-dark-blue-400">
                            English, Hindi
                          </span>
                        </div>

                        <div className="flex mt-5 items-center justify-between">
                          <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                            <Clock className="size-[15px]" />
                            Time Zone
                          </span>

                          <span className="text-xs leading-none font-bold text-dark-blue-400">
                            India (IST-3)
                          </span>
                        </div>
                      </>
                    )}
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
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
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
            </div>
          </div>
        </Tabs>
      </div>
    </>
  )
}

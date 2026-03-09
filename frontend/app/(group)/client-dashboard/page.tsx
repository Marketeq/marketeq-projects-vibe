"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import data from "@/public/mock/projects.json"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowRight,
  BarChartSquare02,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit03,
  Facebook,
  Globe,
  Home03,
  Linkedin,
  Mail01,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings02,
  Share06,
  Star,
  UserCircle,
  Video,
  X,
} from "@blend-metrics/icons"
import { InstagramDefault } from "@blend-metrics/icons/social"
import { AccordionItem } from "@radix-ui/react-accordion"
import { VariantProps, cva } from "class-variance-authority"
import { useToggle } from "react-use"
import { Logo3, XIcon } from "@/components/icons"
import NextLink from "@/components/next-link"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  Accordion,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  DisclosureContent,
  IconButton,
  Progress,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const LeftSidebar = () => {
  return (
    <div className="w-[224px] shrink-0 bg-gray-50 min-[1200px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]">
      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Work
        </span>

        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/client-dashboard"
          >
            <Home03 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Home
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/search"
          >
            <Search className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Find Jobs
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Briefcase className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            My Projects
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Plus className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Create a Project
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/"
          >
            <BarChartSquare02 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Stats & Trends
          </NextLink>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Account
        </span>

        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-profile"
          >
            <UserCircle className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Profile
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/inbox"
          >
            <Mail01 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Inbox
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              3
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="#"
          >
            <AlertCircle className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Notifications
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              2
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="#"
          >
            <Settings02 className="size-[18px] text-dark-blue-400/50 hover:text-dark-blue-400" />
            Settings
          </NextLink>
        </div>
      </div>
    </div>
  )
}

interface Project {
  projectName: string
  team: { image: string; alternativeText: string }[]
  status: string
  nextMilestone: string
}

const TableRow = ({ team, nextMilestone, projectName, status }: Project) => {
  return (
    <tr className="first:pt-3 last:pb-3">
      <td className="px-6 py-3.5 text-sm leading-5 font-semibold text-dark-blue-400 inline-block truncate">
        {projectName}
      </td>
      <td className="px-6 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup excess size="sm" max={3}>
                {team.map((member, index) => (
                  <Avatar
                    key={index}
                    className="border-2 border-white hover:ring-0 active:ring-0"
                    size="sm"
                  >
                    <AvatarImage
                      src={member.image}
                      alt={member.alternativeText}
                    />
                    <AvatarFallback>
                      {member.alternativeText.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </TooltipTrigger>

            <TooltipContent className="p-0" size="md">
              <ScrollArea viewportClassName="max-h-[192px]" className="p-3">
                <div className="space-y-3">
                  {team.map((member, index) => (
                    <div className="flex items-center gap-x-2" key={index}>
                      <Avatar className="hover:ring-0">
                        <AvatarImage
                          src={member.image}
                          alt={member.alternativeText}
                        />
                        <AvatarFallback>
                          {member.alternativeText.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium leading-5">
                        {member.alternativeText}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      <td className="px-6 py-[13px] items-center">
        {status === "In Progress" ? (
          <Badge visual="success">{status}</Badge>
        ) : (
          <Badge visual="gray">{status}</Badge>
        )}
      </td>
      <td className="pl-6 pr-8 py-3.5">
        <div className="gap-x-14 flex items-center justify-between">
          <span className="text-sm whitespace-nowrap leading-5 text-gray-500">
            {nextMilestone}
          </span>
          <Button
            className="h-auto px-1.5 py-1 text-dark-blue-400"
            visual="gray"
            variant="ghost"
          >
            <MoreHorizontal className="size-[15px]" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

const Table = () => {
  return (
    <>
      <div className="overflow-x-auto scrollbar-none">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Project Name
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Team
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Status
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Next Milestone
              </th>
            </tr>
          </thead>

          <tbody>
            {data.projects.map((project, index) => (
              <TableRow key={index} {...project} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-[49px] flex items-center md:hidden justify-center border-t border-gray-200">
        <Button className="text-dark-blue-400" variant="link">
          View All Projects <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </>
  )
}

const Welcome = ({ onOpenProfile }: { onOpenProfile?: () => void }) => {
  return (
    <div className="space-y-3.5 md:space-y-5">
      <div className="md:contents flex flex-col space-y-5">
        <div className="flex items-end justify-between">
          <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
            Welcome, Christopher!
          </h1>

          <div className="flex items-center gap-x-3">
            <Button
              className="text-dark-blue-400 bg-white xs:max-md:hidden"
              variant="outlined"
              visual="gray"
            >
              <Plus className="size-3.5" /> Create a Project
            </Button>
            <Button
              className="bg-primary-50 text-primary-500 hover:text-white min-[1440px]:hidden"
              variant="filled"
              visual="primary"
              onClick={onOpenProfile}
            >
              <Plus className="size-3.5" /> My Profile
            </Button>
          </div>
        </div>

        <Button
          className="text-dark-blue-400 bg-white md:hidden"
          variant="outlined"
          visual="gray"
        >
          <Plus className="size-3.5" /> Create a Project
        </Button>
      </div>

      <div className="flex md:flex-row flex-col xs:max-md:gap-y-5 md:items-center bg-white p-5 border rounded-lg border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="grid grid-cols-2 md:grid-cols-4 xs:max-md:gap-y-[38px] xs:max-md:pt-[13px] md:divide-x md:divide-gray-200 flex-auto md:border-r md:border-gray-200">
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Active Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              4
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Completed Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              4
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Paused Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              1
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Overdue Tasks
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              3
            </h1>
          </article>
        </div>

        <div className="md:pl-6 md:py-3.5 xs:max-md:mt-[25px]">
          <Button
            className="bg-white w-full text-dark-blue-400"
            variant="outlined"
            visual="gray"
          >
            View More KPI&apos;s
          </Button>
        </div>
      </div>
    </div>
  )
}

const RecentProjects = () => {
  return (
    <div className="border bg-white border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="flex justify-between items-start pt-5 px-6">
        <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-400">
          Recent Projects
        </h1>

        <Button
          className="text-dark-blue-400 xs:max-md:hidden"
          variant="link"
          visual="gray"
        >
          View All Projects <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <Tabs className="mt-1" defaultValue="All Projects">
        <TabsList className="px-6 w-full justify-start">
          <TabsTrigger className="pb-[11px]" value="All Projects">
            All Projects
          </TabsTrigger>
          <TabsTrigger className="pb-[11px]" value="Created by Me">
            Created by Me
          </TabsTrigger>
        </TabsList>
        <TabsContent className="overflow-x-hidden" value="All Projects">
          <Table />
        </TabsContent>
        <TabsContent className="overflow-x-hidden" value="Created by Me">
          <Table />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const RecentActivity = () => {
  return (
    <Tabs defaultValue="Next Steps">
      <TabsList className="w-full border-b-0">
        <TabsTrigger value="Next Steps">
          Next Steps
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
            2
          </span>
        </TabsTrigger>
        <TabsTrigger value="Recent Activity">Recent Activity</TabsTrigger>

        <Button
          className="text-dark-blue-400 my-auto ml-auto"
          variant="link"
          visual="gray"
        >
          Continue to next step <ArrowRight className="size-3.5" />
        </Button>
      </TabsList>
      <TabsContent value="Next Steps">
        <div className="pt-3">
          <div className="border p-5 rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
              Let’s Get Started
            </h1>

            <div className="mt-5">
              <Progress value={30} />

              <div className="flex items-center mt-2 gap-x-3">
                <span className="inline-block text-sm leading-[16.94px] font-light">
                  1 of 3 complete
                </span>

                <span className="text-gray-900/50 font-semibold text-[11px] leading-6 inline-flex px-2 items-center gap-x-2">
                  <Clock className="size-[15px]" />
                  About 14 minutes total
                </span>
              </div>
            </div>
          </div>

          <Accordion className="space-y-3 mt-3" collapsible type="single">
            <AccordionItem
              className="relative p-5 pr-[72px] border rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
              value="item-1"
            >
              <div className="flex items-start gap-x-5">
                <div className="size-8 rounded-full inline-flex items-center justify-center shrink-0 bg-primary-500 text-white">
                  <Check className="size-[22.4px]" />
                </div>

                <div className="flex-auto pt-[7px]">
                  <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
                    Set Up Your Profile
                  </h1>
                  <p className="text-[11px] leading-6 mt-2 font-semibold text-gray-800/50">
                    About 4 minutes
                  </p>
                </div>

                <AccordionTrigger className="absolute right-5 top-5 focus-visible:outline-none size-8 inline-flex items-center justify-center shrink-0 text-gray-400">
                  <ChevronDown className="size-5 transition duration-300 group-data-[state=open]/trigger:-rotate-180" />
                </AccordionTrigger>
              </div>
              <DisclosureContent className="pt-2 pl-[52px]">
                <div className="max-w-[540px]">
                  <p className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                    Make your profile reflect your brand and connect with the
                    right talent. Verifying your business details can increase
                    your chances of attracting top freelancers by up to 40%.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-x-2">
                  <Button visual="gray" variant="outlined">
                    Verify now
                  </Button>
                  <Button
                    className="opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="ghost"
                  >
                    Skip for now
                  </Button>
                </div>
              </DisclosureContent>
            </AccordionItem>
            <AccordionItem
              className="relative p-5 pr-[72px] border rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
              value="item-2"
            >
              <div className="flex items-start gap-x-5">
                <div className="size-8 rounded-full inline-flex items-center justify-center shrink-0 bg-primary-500 text-white">
                  <Check className="size-[22.4px]" />
                </div>

                <div className="flex-auto pt-[7px]">
                  <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
                    Verify Your Company
                  </h1>
                  <p className="text-[11px] leading-6 mt-2 font-semibold text-gray-800/50">
                    About 4 minutes
                  </p>
                </div>

                <AccordionTrigger className="absolute right-5 top-5 focus-visible:outline-none size-8 inline-flex items-center justify-center shrink-0 text-gray-400">
                  <ChevronDown className="size-5 transition duration-300 group-data-[state=open]/trigger:-rotate-180" />
                </AccordionTrigger>
              </div>
              <DisclosureContent className="pt-2 pl-[52px]">
                <div className="max-w-[540px]">
                  <p className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                    Make your profile reflect your brand and connect with the
                    right talent. Verifying your business details can increase
                    your chances of attracting top freelancers by up to 40%.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-x-2">
                  <Button visual="gray" variant="outlined">
                    Verify now
                  </Button>
                  <Button
                    className="opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="ghost"
                  >
                    Skip for now
                  </Button>
                </div>
              </DisclosureContent>
            </AccordionItem>
            <AccordionItem
              className="relative p-5 pr-[72px] border rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
              value="item-3"
            >
              <div className="flex items-start gap-x-5">
                <div className="size-8 rounded-full inline-flex items-center justify-center shrink-0 bg-primary-500 text-white">
                  <Check className="size-[22.4px]" />
                </div>

                <div className="flex-auto pt-[7px]">
                  <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
                    Create Your First Project
                  </h1>
                  <p className="text-[11px] leading-6 mt-2 font-semibold text-gray-800/50">
                    About 10 minutes
                  </p>
                </div>

                <AccordionTrigger className="absolute right-5 top-5 focus-visible:outline-none size-8 inline-flex items-center justify-center shrink-0 text-gray-400">
                  <ChevronDown className="size-5 transition duration-300 group-data-[state=open]/trigger:-rotate-180" />
                </AccordionTrigger>
              </div>
              <DisclosureContent className="pt-2 pl-[52px]">
                <div className="max-w-[540px]">
                  <p className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                    Make your profile reflect your brand and connect with the
                    right talent. Verifying your business details can increase
                    your chances of attracting top freelancers by up to 40%.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-x-2">
                  <Button visual="gray" variant="outlined">
                    Verify now
                  </Button>
                  <Button
                    className="opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="ghost"
                  >
                    Skip for now
                  </Button>
                </div>
              </DisclosureContent>
            </AccordionItem>
          </Accordion>
        </div>
      </TabsContent>
    </Tabs>
  )
}

const RightDrawer = () => {
  return (
    <>
      <RightSidebarUpPart />
      <RightSidebarDownPart />
    </>
  )
}

const Content = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  return (
    <div className="flex-auto pt-3.5 px-3.5 md:pt-6 md:px-6 min-[1024px]:px-8 min-[1200px]:pl-[274px] min-[1024px]:pt-8 min-[1200px]:pr-[50px]">
      <div className="flex min-[1440px]:gap-x-8 justify-center overflow-hidden">
        <div className="xs:max-[1440px]:flex-auto min-[1440px]:max-w-[1024px] space-y-3 md:space-y-5 min-w-0">
          <Welcome onOpenProfile={toggleIsOpen} />
          <RecentActivity />
          <RecentProjects />
        </div>

        <RightSidebar />

        <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
          <DialogContent
            variant="unanimated"
            className="md:w-[322px] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 inset-0 md:right-0 md:left-auto md:inset-y-0"
          >
            <button
              className="size-[28px] xs:max-md:hidden z-10 -left-3.5 absolute top-[104px] text-gray-500 focus-visible:outline-none rounded-full bg-white inline-flex border border-gray-300 items-center justify-center shrink-0"
              onClick={toggleIsOpen}
            >
              <ChevronRight className="size-3" />
            </button>

            <div className="pl-3.5 p-1 sticky top-0 flex md:hidden items-center justify-between bg-white border-b border-gray-200">
              <span className="text-sm leading-5 font-semibold text-dark-blue-400">
                My Profile
              </span>

              <DialogTrigger asChild>
                <Button
                  className="text-dark-blue-400"
                  size="md"
                  variant="ghost"
                  visual="gray"
                >
                  <X className="size-[18px]" />
                </Button>
              </DialogTrigger>
            </div>

            <ScrollArea
              className="w-full h-[calc(theme(size.full)-theme(size.12))]"
              scrollBar={<ScrollBar className="w-4 p-1" />}
            >
              <RightDrawer />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <Footer />
    </div>
  )
}

const rightSidebarUpPartVariants = cva(
  "shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] bg-white pt-10 p-5",
  {
    variants: {
      variant: {
        primary: "border-b border-gray-200",
        secondary: "border border-gray-200 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

const RightSidebarUpPart = ({
  className,
  variant,
}: { className?: string } & VariantProps<
  typeof rightSidebarUpPartVariants
>) => {
  return (
    <div
      className={cn(
        rightSidebarUpPartVariants({
          className,
          variant,
        })
      )}
    >
      <div className="border-b border-gray-200 pb-5">
        <div className="relative flex justify-center">
          <Avatar className="size-[100px]" size="2xl">
            <AvatarImage src="/man.jpg" alt="Man" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
          <Badge
            className="absolute -translate-x-1/2 left-1/2 top-full -mt-1 rounded-[4px] bg-primary-500 hover:bg-primary-500 text-white"
            visual="primary"
            size="lg"
          >
            <Star className="size-4 fill-white" />
            5.0
          </Badge>
        </div>

        <div className="mt-8">
          <h1 className="text-base text-center leading-[19.36px] text-dark-blue-400 font-bold">
            Christopher Torres
          </h1>
          <p className="text-[13px] text-center leading-[15.73px] text-dark-blue-400">
            @christhedesigner21
          </p>
        </div>

        <div className="mt-5">
          <Button
            className="w-full text-dark-blue-400 rounded-full"
            size="md"
            variant="outlined"
          >
            <Edit03 className="size-[15px]" /> Edit Profile
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-y-2">
          <div className="flex items-center gap-x-1">
            <Briefcase className="size-[15px] text-dark-blue-400" />
            <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
              IT Consultant
            </span>
          </div>
          <div className="flex items-center gap-x-1">
            <MapPin className="size-[15px] text-dark-blue-400" />
            <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
              USA
            </span>
          </div>
          <div className="flex items-center gap-x-1">
            <Globe className="size-[15px] text-dark-blue-400" />
            <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
              mywebsite.com
            </span>
          </div>
        </div>
      </div>

      <div className="py-5 border-b border-gray-200">
        <h1 className="text-sm leading-[16.94px] font-bold text-dark-blue-400">
          About
        </h1>

        <p className="mt-3 text-[13px] leading-[15.73px] text-dark-blue-400">
          Lorem ipsum dolor sit amet consectetur. Eget mauris elit morbi tellus
          morbi.
        </p>

        <div className="mt-5">
          <h1 className="text-sm leading-[16.94px] font-bold text-dark-blue-400">
            My Interests
          </h1>

          <div className="flex flex-wrap mt-3 gap-2">
            <Badge size="md" visual="gray">
              UX Design
            </Badge>
            <Badge size="md" visual="gray">
              Marketing
            </Badge>
            <Badge size="md" visual="gray">
              Graphic Design
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-x-1.5">
        <span className="text-xs leading-[14.52px] text-dark-blue-400">
          Member since
        </span>
        <span className="text-xs leading-[14.52px] text-dark-blue-400 font-semibold">
          Sep 2024
        </span>
      </div>
    </div>
  )
}

const rightSidebarDownPartVariants = cva(
  "shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] bg-white",
  {
    variants: {
      variant: {
        primary: "",
        secondary: "mt-5 border border-gray-200 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

const RightSidebarDownPart = ({
  className,
  variant,
}: { className?: string } & VariantProps<
  typeof rightSidebarDownPartVariants
>) => {
  return (
    <div
      className={cn(
        rightSidebarDownPartVariants({
          className,
          variant,
        })
      )}
    >
      <div className="p-5 pb-0">
        <div className="flex flex-col items-center gap-y-1">
          <div className="flex items-center justify-center gap-x-[3.04px]">
            <span className="text-[24.32px] leading-[29.43px] text-dark-blue-400/50">
              $
            </span>

            <span className="text-[36.48px] font-bold leading-[44.15px] text-dark-blue-400">
              1,540
              <span className="text-[24.32px] leading-[29.43px] text-dark-blue-400">
                .96
              </span>
            </span>
          </div>

          <span className="text-[11px] leading-[13.31px] text-dark-blue-400">
            Available Funds
          </span>
        </div>

        <Button
          className="w-full mt-3.5 rounded-full"
          size="md"
          variant="outlined"
          visual="gray"
        >
          <Plus className="size-[15px] text-gray-500" />
          Add Funds
        </Button>
      </div>

      <div className="mt-3">
        <Tabs defaultValue="Transactions">
          <TabsList className="justify-center flex">
            <TabsTrigger value="Transactions">Transactions</TabsTrigger>
            <TabsTrigger value="Invoices">
              Invoices
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                3
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="Transactions">
            <div className="px-5">
              <div className="py-1 flex items-center border-b border-gray-200 justify-between">
                <span className="text-xs font-medium leading-[14.52px] text-dark-blue-400">
                  2024
                </span>

                <div className="flex items-center gap-x-1">
                  <button className="size-9 inline-flex items-center justify-center focus-visible:outline-none">
                    <Share06 className="text-gray-400" />
                  </button>
                  <button className="size-9 inline-flex items-center justify-center focus-visible:outline-none">
                    <Download className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            <ScrollArea
              viewportClassName="max-h-[337px]"
              scrollBar={<ScrollBar className="w-4 p-1" />}
            >
              <div className="px-5">
                <div className="divide-gray-200 divide-y">
                  <article className="flex items-start gap-x-3 last:border-b border-gray-200 py-5">
                    <div className="border size-8 rounded-full bg-white border-gray-300 inline-flex shrink-0 justify-center items-center">
                      <Video className="size-[15px] text-dark-blue-400" />
                    </div>

                    <div className="flex items-end justify-between flex-auto">
                      <div className="flex flex-col gap-y-1">
                        <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
                          Video Editing
                        </h1>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Full Payment - Invoice #34567
                        </span>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Aug 30, 2024
                        </span>
                      </div>
                      <span className="inline-block font-semibold text-base leading-[19.36px] text-dark-blue-400">
                        + $200
                      </span>
                    </div>
                  </article>
                  <article className="flex items-start gap-x-3 last:border-b border-gray-200 py-5">
                    <div className="border size-8 rounded-full bg-white border-gray-300 inline-flex shrink-0 justify-center items-center">
                      <Video className="size-[15px] text-dark-blue-400" />
                    </div>

                    <div className="flex items-end justify-between flex-auto">
                      <div className="flex flex-col gap-y-1">
                        <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
                          Video Editing
                        </h1>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Full Payment - Invoice #34567
                        </span>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Aug 30, 2024
                        </span>
                      </div>
                      <span className="inline-block font-semibold text-base leading-[19.36px] text-dark-blue-400">
                        + $200
                      </span>
                    </div>
                  </article>
                  <article className="flex items-start gap-x-3 last:border-b border-gray-200 py-5">
                    <div className="border size-8 rounded-full bg-white border-gray-300 inline-flex shrink-0 justify-center items-center">
                      <Video className="size-[15px] text-dark-blue-400" />
                    </div>

                    <div className="flex items-end justify-between flex-auto">
                      <div className="flex flex-col gap-y-1">
                        <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
                          Video Editing
                        </h1>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Full Payment - Invoice #34567
                        </span>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Aug 30, 2024
                        </span>
                      </div>
                      <span className="inline-block font-semibold text-base leading-[19.36px] text-dark-blue-400">
                        + $200
                      </span>
                    </div>
                  </article>
                  <article className="flex items-start gap-x-3 last:border-b border-gray-200 py-5">
                    <div className="border size-8 rounded-full bg-white border-gray-300 inline-flex shrink-0 justify-center items-center">
                      <Video className="size-[15px] text-dark-blue-400" />
                    </div>

                    <div className="flex items-end justify-between flex-auto">
                      <div className="flex flex-col gap-y-1">
                        <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
                          Video Editing
                        </h1>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Full Payment - Invoice #34567
                        </span>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Aug 30, 2024
                        </span>
                      </div>
                      <span className="inline-block font-semibold text-base leading-[19.36px] text-dark-blue-400">
                        + $200
                      </span>
                    </div>
                  </article>
                  <article className="flex items-start gap-x-3 last:border-b border-gray-200 py-5">
                    <div className="border size-8 rounded-full bg-white border-gray-300 inline-flex shrink-0 justify-center items-center">
                      <Video className="size-[15px] text-dark-blue-400" />
                    </div>

                    <div className="flex items-end justify-between flex-auto">
                      <div className="flex flex-col gap-y-1">
                        <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
                          Video Editing
                        </h1>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Full Payment - Invoice #34567
                        </span>
                        <span className="inline-block text-[10px] font-medium leading-[12.1px] text-dark-blue-400">
                          Aug 30, 2024
                        </span>
                      </div>
                      <span className="inline-block font-semibold text-base leading-[19.36px] text-dark-blue-400">
                        + $200
                      </span>
                    </div>
                  </article>
                </div>
              </div>
            </ScrollArea>

            <div className="py-3 border-t border-gray-200 px-5 flex items-center justify-center">
              <Button variant="link" visual="gray">
                View More
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="Invoices"></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const RightSidebar = () => {
  return (
    <div className="w-[322px] shrink-0 min-[1440px]:block hidden">
      <RightSidebarUpPart variant="secondary" />
      <RightSidebarDownPart variant="secondary" />
    </div>
  )
}

const Footer = () => {
  return (
    <div className="mt-8 mb-3.5 md:my-8 px-5 md:px-6 flex flex-col md:flex-row items-center gap-5 md:justify-between">
      <div className="flex md:flex-row flex-col items-center gap-5 md:gap-x-[57px]">
        <NextLink className="focus-visible:outline-none" href="/">
          <Logo3 className="shrink-0 w-[120px] h-[17.63px]" />
        </NextLink>
        <span className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
          © 2011 - 2025 Marketeq Digital Inc. All Rights Reserved.
        </span>
      </div>

      <div className="flex items-center gap-x-[16.6px]">
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Facebook className="fill-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <XIcon className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <InstagramDefault className="text-dark-blue-400 size-4" />
        </IconButton>
        <IconButton
          className="size-[30px] rounded-full"
          variant="outlined"
          visual="gray"
        >
          <Linkedin className="text-dark-blue-400 size-4" />
        </IconButton>
      </div>
    </div>
  )
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  useEffect(() => {
    const safeUser = user as {
      provider?: string
      hasPassword?: boolean
    }

    const needsPasswordSetup =
      safeUser?.provider === "EMAIL" && !safeUser?.hasPassword

    if (safeUser && needsPasswordSetup) {
      setShowSecurityModal(true)
    }
  }, [user])

  return (
    <>
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <SecuritySettingsStepper
            onCloseModal={() => setShowSecurityModal(false)}
          />
        </div>
      )}
      <AuthenticatedRoute>
        <LeftSidebar />
        <Content />
      </AuthenticatedRoute>
    </>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ROLE } from "@/types/user"
import { UserAPI } from "@/service/http/user"
import { cn } from "@/utils/functions"
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit03,
  MapPin,
  MoreHorizontal,
  Plus,
  Share06,
  Star,
  X,
} from "@blend-metrics/icons"
import { AccordionItem } from "@radix-ui/react-accordion"
import { VariantProps, cva } from "class-variance-authority"
import { useToggle } from "react-use"
import { DashboardFooter } from "@/components/dashboard-footer"
import NextLink from "@/components/next-link"
import SecuritySettingsStepper from "@/components/security-settings"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
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

type DashboardProfile = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  avatarUrl?: string | null
  bio?: string | null
  overview?: string | null
  location?: string | null
  industry?: string | null
  recentJobTitle?: string | null
  userType?: string | null
  lookingToWorkWith?: string[] | null
  businessGoals?: string | null
  gettingStartedStep?: number | null
  totalProjectsCompleted?: number | null
  clientSuccessRating?: number | null
  createdAt?: string | Date
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
                Contract Name
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Talent
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Status
              </th>
              <th className="text-xs leading-[18px] font-medium text-dark-blue-400 whitespace-nowrap py-3 px-6 text-left border-b border-gray-200">
                Value
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td
                colSpan={4}
                className="px-6 py-10 text-center text-sm text-gray-400"
              >
                No contracts yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="h-[49px] flex items-center md:hidden justify-center border-t border-gray-200">
        <NextLink href="/my-contracts">
          <Button className="text-dark-blue-400" variant="link">
            View All Contracts <ArrowRight className="size-3.5" />
          </Button>
        </NextLink>
      </div>
    </>
  )
}

const Welcome = ({
  onOpenProfile,
  user,
}: {
  onOpenProfile?: () => void
  user?: DashboardProfile | null
}) => {
  return (
    <div className="space-y-3.5 md:space-y-5">
      <div className="md:contents flex flex-col space-y-5">
        <div className="flex items-end justify-between">
          <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
            Welcome, {user?.firstName || "there"}!
          </h1>

          <div className="flex items-center gap-x-3">
            <NextLink href="/publish-project">
              <Button
                className="text-dark-blue-400 bg-white xs:max-md:hidden"
                variant="outlined"
                visual="gray"
              >
                <Plus className="size-3.5" /> Create a Project
              </Button>
            </NextLink>
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

        <NextLink href="/publish-project" className="md:hidden">
          <Button
            className="text-dark-blue-400 bg-white"
            variant="outlined"
            visual="gray"
          >
            <Plus className="size-3.5" /> Create a Project
          </Button>
        </NextLink>
      </div>

      <div className="flex md:flex-row flex-col xs:max-md:gap-y-5 md:items-center bg-white p-5 border rounded-lg border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="grid grid-cols-2 md:grid-cols-4 xs:max-md:gap-y-[38px] xs:max-md:pt-[13px] md:divide-x md:divide-gray-200 flex-auto md:border-r md:border-gray-200">
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Active Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              0
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Completed Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              {user?.totalProjectsCompleted ?? 0}
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Paused Projects
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              0
            </h1>
          </article>
          <article className="md:px-6 space-y-3">
            <p className="text-xs text-center leading-[14.52px] text-dark-blue-400">
              Overdue Tasks
            </p>
            <h1 className="text-2xl text-center leading-[29.05px] font-semibold text-dark-blue-400">
              0
            </h1>
          </article>
        </div>

        <div className="md:pl-6 md:py-3.5 xs:max-md:mt-[25px]">
          <NextLink href="/projects">
            <Button
              className="bg-white w-full text-dark-blue-400"
              variant="outlined"
              visual="gray"
            >
              View More KPI&apos;s
            </Button>
          </NextLink>
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
          Recent Contracts
        </h1>

        <NextLink href="/my-contracts" className="xs:max-md:hidden">
          <Button className="text-dark-blue-400" variant="link" visual="gray">
            View All Contracts <ArrowRight className="size-3.5" />
          </Button>
        </NextLink>
      </div>

      <Tabs className="mt-1" defaultValue="All Contracts">
        <TabsList className="px-6 w-full justify-start">
          <TabsTrigger className="pb-[11px]" value="All Contracts">
            All Contracts
          </TabsTrigger>
          <TabsTrigger className="pb-[11px]" value="Created by Me">
            Created by Me
          </TabsTrigger>
        </TabsList>
        <TabsContent className="overflow-x-hidden" value="All Contracts">
          <Table />
        </TabsContent>
        <TabsContent className="overflow-x-hidden" value="Created by Me">
          <Table />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const GETTING_STARTED_STEPS = [
  {
    title: "Set Up Your Profile",
    description:
      "Make your profile reflect your brand and connect with the right talent. Verifying your business details can increase your chances of attracting top freelancers by up to 40%.",
    time: "About 4 minutes",
    ctaLabel: "Set up now",
    ctaHref: "/complete-profile",
  },
  {
    title: "Verify Your Company",
    description:
      "Verify your business details to build trust with freelancers and increase your visibility on the platform.",
    time: "About 4 minutes",
    ctaLabel: "Verify now",
    ctaHref: "/settings",
  },
  {
    title: "Create Your First Project",
    description:
      "Post your first project to start attracting top talent. Describe what you need and let skilled freelancers come to you.",
    time: "About 10 minutes",
    ctaLabel: "Create project",
    ctaHref: "/publish-project",
  },
]

const RecentActivity = ({
  user,
  onStepChange,
}: {
  user?: DashboardProfile | null
  onStepChange?: (step: number) => void
}) => {
  const { user: authUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(user?.gettingStartedStep ?? 0)
  const totalSteps = GETTING_STARTED_STEPS.length
  const completedSteps = Math.min(currentStep, totalSteps)
  const remainingSteps = totalSteps - completedSteps
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  useEffect(() => {
    if (user?.gettingStartedStep != null) {
      setCurrentStep(user.gettingStartedStep)
    }
  }, [user?.gettingStartedStep])

  const handleSkip = (stepIndex: number) => {
    const nextStep = stepIndex + 1
    setCurrentStep(nextStep)
    onStepChange?.(nextStep)
    const userId = authUser?.id
    if (userId) {
      UserAPI.updateProfile(userId, { gettingStartedStep: nextStep }).catch(
        () => {}
      )
    }
  }

  // Find the first incomplete step for "Continue to next step"
  const nextIncompleteStep = GETTING_STARTED_STEPS.findIndex(
    (_, i) => i >= currentStep
  )
  const nextStepHref =
    nextIncompleteStep >= 0
      ? GETTING_STARTED_STEPS[nextIncompleteStep].ctaHref
      : undefined

  return (
    <Tabs defaultValue="Next Steps">
      <TabsList className="w-full justify-start border-b-0">
        <TabsTrigger value="Next Steps">
          Next Steps
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
            {remainingSteps}
          </span>
        </TabsTrigger>
        <TabsTrigger value="Recent Activity">Recent Activity</TabsTrigger>

        {nextStepHref && (
          <NextLink href={nextStepHref} className="my-auto ml-auto">
            <Button className="text-dark-blue-400" variant="link" visual="gray">
              Continue to next step <ArrowRight className="size-3.5" />
            </Button>
          </NextLink>
        )}
      </TabsList>
      <TabsContent value="Next Steps">
        <div className="pt-3">
          <div className="border p-5 rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
              {completedSteps >= totalSteps
                ? "All Done!"
                : "Let\u2019s Get Started"}
            </h1>

            <div className="mt-5">
              <Progress value={progressPercent} />

              <div className="flex items-center mt-2 gap-x-3">
                <span className="inline-block text-sm leading-[16.94px] font-light">
                  {completedSteps} of {totalSteps} complete
                </span>

                {remainingSteps > 0 && (
                  <span className="text-gray-900/50 font-semibold text-[11px] leading-6 inline-flex px-2 items-center gap-x-2">
                    <Clock className="size-[15px]" />
                    About {remainingSteps * 4} minutes remaining
                  </span>
                )}
              </div>
            </div>
          </div>

          <Accordion className="space-y-3 mt-3" collapsible type="single">
            {GETTING_STARTED_STEPS.map((stepDef, index) => (
              <AccordionItem
                key={index}
                className="relative p-5 pr-[72px] border rounded-lg bg-white border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                value={`item-${index}`}
              >
                <div className="flex items-start gap-x-5">
                  <div
                    className={cn(
                      "size-8 rounded-full inline-flex items-center justify-center shrink-0",
                      currentStep > index
                        ? "bg-primary-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    )}
                  >
                    {currentStep > index ? (
                      <Check className="size-[22.4px]" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-auto pt-[7px]">
                    <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-400">
                      {stepDef.title}
                    </h1>
                    <p className="text-[11px] leading-6 mt-2 font-semibold text-gray-800/50">
                      {stepDef.time}
                    </p>
                  </div>

                  <AccordionTrigger className="absolute right-5 top-5 focus-visible:outline-none size-8 inline-flex items-center justify-center shrink-0 text-gray-400">
                    <ChevronDown className="size-5 transition duration-300 group-data-[state=open]/trigger:-rotate-180" />
                  </AccordionTrigger>
                </div>
                <DisclosureContent className="pt-2 pl-[52px]">
                  <div className="max-w-[540px]">
                    <p className="text-[13px] leading-[15.73px] font-light text-dark-blue-400">
                      {stepDef.description}
                    </p>
                  </div>

                  {currentStep <= index && (
                    <div className="mt-6 flex items-center gap-x-2">
                      <NextLink href={stepDef.ctaHref}>
                        <Button visual="gray" variant="outlined">
                          {stepDef.ctaLabel}
                        </Button>
                      </NextLink>
                      <Button
                        className="opacity-50 hover:opacity-100"
                        visual="gray"
                        variant="ghost"
                        onClick={() => handleSkip(index)}
                      >
                        Skip for now
                      </Button>
                    </div>
                  )}
                </DisclosureContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </TabsContent>
    </Tabs>
  )
}

const RightDrawer = ({ profile }: { profile?: DashboardProfile | null }) => {
  return (
    <>
      <RightSidebarUpPart profile={profile} />
      <RightSidebarDownPart />
    </>
  )
}

const Content = ({ profile }: { profile?: DashboardProfile | null }) => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  return (
    <div className="flex-auto pt-3.5 px-3.5 md:pt-6 md:px-6 min-[1024px]:px-8 min-[1200px]:pl-[248px] min-[1024px]:pt-8 min-[1200px]:pr-[50px]">
      <div className="flex min-[1440px]:gap-x-8 justify-center overflow-hidden">
        <div className="xs:max-[1440px]:flex-auto min-[1440px]:max-w-[1024px] space-y-3 md:space-y-5 min-w-0">
          <Welcome onOpenProfile={toggleIsOpen} user={profile} />
          <RecentActivity user={profile} />
          <RecentProjects />
        </div>

        <RightSidebar profile={profile} />

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
              <RightDrawer profile={profile} />
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
  profile,
}: { className?: string; profile?: DashboardProfile | null } & VariantProps<
  typeof rightSidebarUpPartVariants
>) => {
  const { user } = useAuth()
  const displayUser = profile || user
  const fullName =
    [displayUser?.firstName, displayUser?.lastName].filter(Boolean).join(" ") ||
    "User"
  const initials =
    [displayUser?.firstName?.[0], displayUser?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "U"
  const username = displayUser?.username ? `@${displayUser.username}` : ""
  const jobTitle =
    profile?.recentJobTitle || profile?.industry || profile?.userType || ""
  const location = profile?.location || ""
  const bio = profile?.bio || profile?.overview || ""
  const interests: string[] = Array.isArray(profile?.lookingToWorkWith)
    ? profile.lookingToWorkWith
    : []
  const rating = profile?.clientSuccessRating ?? null
  const memberSince = displayUser?.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : ""

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
            <AvatarImage src={displayUser?.avatarUrl || ""} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {rating !== null && (
            <Badge
              className="absolute -translate-x-1/2 left-1/2 top-full -mt-1 rounded-[4px] bg-primary-500 hover:bg-primary-500 text-white"
              visual="primary"
              size="lg"
            >
              <Star className="size-4 fill-white" />
              {rating.toFixed(1)}
            </Badge>
          )}
        </div>

        <div className={rating !== null ? "mt-8" : "mt-4"}>
          <h1 className="text-base text-center leading-[19.36px] text-dark-blue-400 font-bold">
            {fullName}
          </h1>
          {username && (
            <p className="text-[13px] text-center leading-[15.73px] text-dark-blue-400">
              {username}
            </p>
          )}
        </div>

        <div className="mt-5">
          <NextLink href="/complete-profile">
            <Button
              className="w-full text-dark-blue-400 rounded-full"
              size="md"
              variant="outlined"
            >
              <Edit03 className="size-[15px]" /> Edit Profile
            </Button>
          </NextLink>
        </div>

        <div className="mt-5 flex flex-col gap-y-2">
          {jobTitle && (
            <div className="flex items-center gap-x-1">
              <Briefcase className="size-[15px] text-dark-blue-400" />
              <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
                {jobTitle}
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-x-1">
              <MapPin className="size-[15px] text-dark-blue-400" />
              <span className="text-[11px] leading-6 font-semibold text-dark-blue-400">
                {location}
              </span>
            </div>
          )}
        </div>
      </div>

      {(bio || interests.length > 0) && (
        <div className="py-5 border-b border-gray-200">
          {bio && (
            <>
              <h1 className="text-sm leading-[16.94px] font-bold text-dark-blue-400">
                About
              </h1>
              <p className="mt-3 text-[13px] leading-[15.73px] text-dark-blue-400 line-clamp-2">
                {bio}
              </p>
            </>
          )}

          {interests.length > 0 && (
            <div className={bio ? "mt-5" : ""}>
              <h1 className="text-sm leading-[16.94px] font-bold text-dark-blue-400">
                My Interests
              </h1>
              <div className="flex flex-wrap mt-3 gap-2">
                {interests.map((interest) => (
                  <Badge key={interest} size="md" visual="gray">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {memberSince && (
        <div className="mt-5 flex justify-center gap-x-1.5">
          <span className="text-xs leading-[14.52px] text-dark-blue-400">
            Member since
          </span>
          <span className="text-xs leading-[14.52px] text-dark-blue-400 font-semibold">
            {memberSince}
          </span>
        </div>
      )}
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
              0
              <span className="text-[24.32px] leading-[29.43px] text-dark-blue-400">
                .00
              </span>
            </span>
          </div>

          <span className="text-[11px] leading-[13.31px] text-dark-blue-400">
            Available Funds
          </span>
        </div>

        <NextLink href="/add-funds">
          <Button
            className="w-full mt-3.5 rounded-full"
            size="md"
            variant="outlined"
            visual="gray"
          >
            <Plus className="size-[15px] text-gray-500" />
            Add Funds
          </Button>
        </NextLink>
      </div>

      <div className="mt-3">
        <Tabs defaultValue="Transactions">
          <TabsList className="justify-start flex">
            <TabsTrigger value="Transactions">Transactions</TabsTrigger>
            <TabsTrigger value="Invoices">
              Invoices
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                0
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="Transactions">
            <div className="px-5">
              <div className="py-1 flex items-center border-b border-gray-200 justify-between">
                <span className="text-xs font-medium leading-[14.52px] text-dark-blue-400">
                  {new Date().getFullYear()}
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
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          </TabsContent>
          <TabsContent value="Invoices">
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">No invoices yet</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const RightSidebar = ({ profile }: { profile?: DashboardProfile | null }) => {
  return (
    <div className="w-[322px] shrink-0 min-[1440px]:block hidden">
      <RightSidebarUpPart variant="secondary" profile={profile} />
      <RightSidebarDownPart variant="secondary" />
    </div>
  )
}

const Footer = () => {
  return <DashboardFooter className="mt-8 mb-3.5 px-5 md:my-8 md:px-6" />
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [profile, setProfile] = useState<DashboardProfile | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const res = await UserAPI.getProfile(userId)
      setProfile(res.data)
    } catch {
      // Profile fetch failed — dashboard still works with basic user data
    }
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

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

  // Redirect if the user's active role is not Client
  useEffect(() => {
    if (!user) return
    const role = resolveDashboardRole(user)
    if (role && role !== ROLE.CLIENT) {
      router.replace("/talent-dashboard")
    }
  }, [user, router])

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
        <LeftSidebar forceRole="CLIENT" />
        <Content profile={profile} />
      </AuthenticatedRoute>
    </>
  )
}

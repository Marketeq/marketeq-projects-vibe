"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  ArrowRight,
  Check,
  HelpCircle,
  MoreHorizontal,
  Star01,
  X,
} from "@blend-metrics/icons"
import { ListingCard } from "@/components/listing-card"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const jobTabs = [
  { value: "saved", label: "Saved" },
  { value: "invited", label: "Invited", count: "2 NEW" },
  { value: "applied", label: "Applied" },
  { value: "archived", label: "Archived" },
]

const jobProgressByTab = {
  saved: [
    {
      id: "job-progress-1",
      title: "Bay City College Campus Expansion Project",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "Ongoing service", "Payment Verified"],
    },
    {
      id: "job-progress-2",
      title: "1200 West Grand Ave. Renovation",
      role: "Software Tester",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "6 months", "Payment Verified"],
    },
    {
      id: "job-progress-3",
      title: "Tracy Courthouse Rebid",
      role: "Software Development Manager",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted 2 days ago",
      meta: ["4.8 client rating", "6 months", "Payment Verified"],
    },
  ],
  invited: [
    {
      id: "job-progress-4",
      title: "Project Name Invitation",
      role: "Software Developer",
      skillsMatch: "7 out of 9 skills line up",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Posted today",
      meta: ["4.9 client rating", "Invited", "Payment Verified"],
    },
  ],
  applied: [
    {
      id: "job-progress-5",
      title: "Applied Opportunity",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Applied 1 day ago",
      meta: ["4.8 client rating", "In review", "Payment Verified"],
    },
  ],
  archived: [
    {
      id: "job-progress-6",
      title: "Archived Opportunity",
      role: "Software Developer",
      skillsMatch: "2 of 9 skills match",
      schedule: "Full-Time",
      compensation: "$90,200/mo",
      posted: "Archived",
      meta: ["4.6 client rating", "Closed", "Payment Verified"],
    },
  ],
} as const

const pickedJobs = [
  "picked-job-1",
  "picked-job-2",
  "picked-job-3",
  "picked-job-4",
]

const tutorials = [
  {
    title: "ChatGBT Masterclass: The Ultimate Beginners Guide!",
    rating: "4.9",
    level: "Beginner",
    image: "/tutorial-thumbnails/image.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-beginner.svg",
    isNew: true,
  },
  {
    title: "Mastering Behavioral Interview Questions",
    rating: "4.7",
    level: "Beginner",
    image: "/tutorial-thumbnails/image-1.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-beginner-2.svg",
  },
  {
    title: "How to Spot Red Flags in Candidate Interviews",
    rating: "4.5",
    level: "Advanced",
    image: "/tutorial-thumbnails/image-2.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-advanced.svg",
  },
  {
    title: "Building an Inclusive and Diverse Hiring Process",
    rating: "4.1",
    level: "Intermediate",
    image: "/tutorial-thumbnails/image-3.png",
    ratingIcon: "/tutorial-icons/star.svg",
    levelIcon: "/tutorial-icons/level-intermediate.svg",
  },
]

const recentSearches = [
  {
    title: "Software Engineer",
    meta: "Full-Time · Junior and 3 more filters",
  },
  {
    title: "UX Designer",
    meta: "USA",
  },
  {
    title: "QA / Engine",
    meta: "Remote · Junior and 1 more filter",
  },
  {
    title: "Graphic Designer",
    meta: "Part-Time · Hybrid and 2 more filters",
  },
  {
    title: "Product Designer",
    meta: "Hybrid · Junior · Serbia",
  },
]

export default function MyJobsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] =
    useState<(typeof jobTabs)[number]["value"]>("saved")

  return (
    <AuthenticatedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <LeftSidebar />

        <div className="flex-auto overflow-hidden p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 space-y-6">
              <Card className="overflow-hidden rounded-xl border-primary-100 bg-primary-50">
                <div className="flex w-full items-start gap-4 p-5">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="size-12 border border-white shadow-sm">
                      <AvatarImage src="/man.jpg" alt="Invited role" />
                      <AvatarFallback>MT</AvatarFallback>
                    </Avatar>
                    <Badge
                      visual="gray"
                      className="bg-white text-[10px] text-gray-500"
                    >
                      8/9 match
                    </Badge>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-5 text-dark-blue-400">
                      You&apos;ve Been Invited to Apply to &quot;Project
                      Name&quot;
                    </p>
                    <p className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
                      You&apos;re a great match — your skills line up with 7 out
                      of 9 in the job description. That means you&apos;ve got a
                      strong chance at landing this role.
                    </p>

                    <Button
                      variant="link"
                      visual="gray"
                      className="mt-3 px-0 text-primary-500"
                    >
                      Apply Now <ArrowRight className="size-4" />
                    </Button>
                  </div>

                  <IconButton variant="ghost" visual="gray" size="sm">
                    <X className="size-4" />
                  </IconButton>
                </div>
              </Card>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-xl font-bold text-dark-blue-400">
                    Job Progress
                  </h1>
                  <Button variant="outlined" visual="gray" size="sm">
                    View all <ArrowRight className="size-4" />
                  </Button>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as typeof activeTab)
                  }
                  unanimated
                >
                  <TabsList className="mb-4 justify-start border-b-0 px-0 pt-0">
                    {jobTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        {tab.count ? (
                          <Badge
                            visual="gray"
                            className="ml-2 bg-gray-100 text-[10px] text-gray-500"
                          >
                            {tab.count}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {jobTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      <div className="space-y-3">
                        {jobProgressByTab[
                          tab.value as keyof typeof jobProgressByTab
                        ].map((job) => (
                          <Card
                            key={job.id}
                            className="overflow-hidden"
                          >
                            <div className="w-full p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    className="h-auto px-0 text-left text-lg font-semibold leading-normal text-dark-blue-400 hover:underline"
                                  >
                                    {job.title}
                                  </Button>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    {job.meta.map((item, index) => (
                                      <span
                                        key={item}
                                        className="inline-flex items-center gap-2"
                                      >
                                        {index === 0 ? (
                                          <Star01 className="size-3.5" />
                                        ) : null}
                                        {index === 2 ? (
                                          <Check className="size-3.5 text-success-600" />
                                        ) : null}
                                        <span>{item}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <IconButton
                                  variant="ghost"
                                  visual="gray"
                                  size="sm"
                                >
                                  <MoreHorizontal className="size-4" />
                                </IconButton>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 pt-4 text-sm text-dark-blue-400">
                                <Button
                                  variant="link"
                                  visual="gray"
                                  className="h-auto px-0 font-semibold text-dark-blue-400 hover:underline"
                                >
                                  {job.role}
                                </Button>
                                <span className="text-gray-500">
                                  {job.skillsMatch}
                                </span>
                                <span>{job.schedule}</span>
                                <span>{job.compensation}</span>
                                <span className="ml-auto text-xs text-gray-500">
                                  {job.posted}
                                </span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-dark-blue-400">
                    Jobs picked for you
                  </h2>
                  <Button
                    variant="link"
                    visual="gray"
                    className="text-primary-500"
                    onClick={() => router.push("/find-jobs")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Browse more jobs <ArrowRight className="size-4" />
                    </span>
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {pickedJobs.map((id) => (
                    <ListingCard
                      key={id}
                      kind="project"
                      id={id}
                      title="The Ultimate Mobile App Experience"
                      description="Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
                      budget="$90,200"
                      duration="Full-Time"
                      cardVariant="job-grid"
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <Card className="w-full">
                <div className="w-full p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-dark-blue-400">
                      Level Up Your Job Search
                    </h2>
                    <HelpCircle className="size-4 text-gray-400" />
                  </div>

                  <div className="mt-6 space-y-3">
                    {tutorials.map((tutorial, index) => (
                      <div
                        key={`${tutorial.title}-${index}`}
                        className="flex items-start gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="relative h-16 w-[104px] shrink-0 overflow-hidden rounded-[8px]">
                          <NextImage
                            src={tutorial.image}
                            alt={tutorial.title}
                            fill
                            className="object-cover"
                          />
                          {tutorial.isNew ? (
                            <span className="absolute left-1 top-1 rounded-[3px] bg-success-500 p-[3px] text-[8px] font-bold leading-none text-white">
                              NEW
                            </span>
                          ) : null}
                          <span className="absolute bottom-1 right-1 rounded-[3px] bg-black/50 p-[3px] text-[8px] font-bold leading-none text-white">
                            01:20
                          </span>
                        </div>
                        <div className="min-w-0">
                          <NextLink
                            href="/find-jobs"
                            className="line-clamp-2 text-xs font-semibold leading-normal text-dark-blue-400 hover:underline"
                          >
                            {tutorial.title}
                          </NextLink>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-1">
                              <NextImage
                                src={tutorial.ratingIcon}
                                alt=""
                                width={13}
                                height={13}
                                aria-hidden="true"
                              />
                              <span className="text-xs font-medium leading-4 text-dark-blue-400">
                                {tutorial.rating}
                              </span>
                            </div>
                            <div className="ml-auto inline-flex items-center gap-1">
                              <NextImage
                                src={tutorial.levelIcon}
                                alt=""
                                width={16}
                                height={16}
                                aria-hidden="true"
                              />
                              <span className="text-xs font-medium leading-4 text-gray-500">
                                {tutorial.level}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outlined"
                    visual="gray"
                    className="mt-6 w-full text-sm font-semibold text-dark-blue-400"
                  >
                    View More Tutorials
                  </Button>
                </div>
              </Card>

              <Card className="hover:border-gray-200 hover:ring-0">
                <div className="w-full p-5">
                  <h2 className="text-base font-semibold text-dark-blue-400">
                    Recent Searches
                  </h2>

                  <div className="mt-4 space-y-3">
                    {recentSearches.map((search) => (
                      <div
                        key={search.title}
                        className="flex items-start justify-between gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark-blue-400">
                            {search.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {search.meta}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {search.title === "QA / Engine" ? (
                            <Button
                              variant="link"
                              visual="gray"
                              className="px-0 text-xs text-dark-blue-400"
                            >
                              Remove
                            </Button>
                          ) : null}
                          <IconButton variant="ghost" visual="gray" size="sm">
                            <MoreHorizontal className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

"use client"

import { use } from "react"
import {
  Check,
  ChevronRight,
  HelpCircle,
  Home03,
  Share06,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { SaveButton } from "@/components/talent-profile-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  IconButton,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const job = {
  title: "UX Designer",
  subtitle: "The Ultimate Mobile App Experience",
  posted: "2 days ago",
  type: "Full time job",
  category: "Mobile Application",
  workSchedule: "Full-Time 40 hrs/wk",
  duration: "6 months",
  startDate: "Jan 30th, 2025",
  offerRate: 67,
  earnings: "$6,777",
  skills: [
    "Visual Design",
    "Tailwind CSS",
    "Next.js",
    "Wireframing",
    "Figma",
    "Azure RP",
  ],
  overview: [
    "Front-end Technologies & Web Accessibility | Exploring Human Interface Design",
    "In passionate about crafting intuitive, user-friendly digital experiences with a strong focus on accessibility and human-centered design. With expertise in HTML, CSS, JavaScript, and modern frameworks, I create seamless interfaces that enhance usability for all users, including those with disabilities. I believe technology should be inclusive, aesthetically engaging, and functionally efficient.",
    "I'm always exploring the latest trends in UI/UX and human interface design to ensure that every project balances innovation with practicality. Whether it's optimizing website performance, implementing responsive design, or improving accessibility compliance, I take a detail-oriented approach to building digital products that truly connect with users. I thrive on solving complex design challenges and turning ideas into meaningful, interactive experiences.",
  ],
  responsibilities: [
    "Main Bullet Point 1: Sed ut perspiciatis unde omnis iste natus",
    "Main Bullet Point 2: error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "Main Bullet Point 3: eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    "Main Number Point 1: Sed ut perspiciatis unde omnis iste natus",
    "Main Number Point 2: error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "Main Number Point 3: eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  ],
  benefits: [
    "Sed ut perspiciatis unde omnis iste natus",
    "error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  ],
}

const scopeGroups = [
  {
    label: "Primary Focus",
    items: ["Mobile UX", "Design Systems", "Prototyping", "Accessibility"],
  },
  {
    label: "Tools",
    items: ["Figma", "FigJam", "Miro", "Notion"],
  },
  {
    label: "Deliverables",
    items: ["User Flows", "Wireframes", "High-Fidelity Screens", "Clickable Prototype"],
  },
]

const teamMembers = [
  {
    name: "Harry Torres",
    role: "Product Lead",
    avatar: "/woman.jpg",
  },
  {
    name: "Amy Stewart",
    role: "Research",
    avatar: "/woman.jpg",
  },
  {
    name: "Jordan Miles",
    role: "Engineering",
    avatar: "/woman.jpg",
  },
]

const titleizeSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export default function JobDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const slugTitle = titleizeSlug(slug)
  const subtitle =
    slugTitle && slugTitle !== "Placeholder"
      ? slugTitle
      : job.subtitle

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
        <Breadcrumb spacing="0.5rem">
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="inline-flex items-center">
              <Home03 className="size-3.5" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Jobs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Mobile Application</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>iOS Development</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <Badge visual="gray" className="mb-4">
                    {job.category}
                  </Badge>

                  <h1 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                    {job.title}
                  </h1>
                  <p className="mt-2 text-[28px] font-light leading-tight text-dark-blue-400">
                    {subtitle}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
                    <span>Posted {job.posted}</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span>{job.type}</span>
                    <Badge visual="gray" className="gap-x-1.5">
                      <Check className="size-3.5 text-success-600" />
                      Payment Verified
                    </Badge>
                    <Badge visual="gray">NDA Required</Badge>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <Button size="md">Apply</Button>
                  <SaveButton />
                  <IconButton variant="outlined" visual="gray" size="md">
                    <Share06 className="size-5" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="mb-3 text-sm font-medium leading-5 text-dark-blue-400">
                  6 of 11 skills match
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge
                      key={skill}
                      visual="gray"
                      className="gap-x-1.5 bg-gray-100 text-dark-blue-400"
                    >
                      {index < 2 && (
                        <Check className="size-3.5 text-primary-500" />
                      )}
                      {skill}
                    </Badge>
                  ))}

                  <Button
                    variant="link"
                    visual="gray"
                    className="px-0 font-medium text-dark-blue-400 no-underline hover:no-underline"
                  >
                    View All Skills
                  </Button>
                </div>
              </div>
            </section>

            <Tabs defaultValue="Project Description" unanimated>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <TabsList className="w-full justify-start gap-6 px-6">
                  <TabsTrigger value="Project Description">
                    Project Description
                  </TabsTrigger>
                  <TabsTrigger value="Project Scope">Project Scope</TabsTrigger>
                  <TabsTrigger value="Project Team">Project Team</TabsTrigger>
                </TabsList>

                <TabsContent value="Project Description">
                  <div className="space-y-8 p-6">
                    <section>
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Project Overview
                      </h2>

                      <div className="mt-5 space-y-4 text-sm font-light leading-6 text-dark-blue-400">
                        {job.overview.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8">
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Responsibilities
                      </h2>

                      <div className="mt-5 text-sm font-light leading-6 text-dark-blue-400">
                        <p>
                          Ut enim ad minim veniam, quis nostrud exercitation ullamco
                          laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                          irure dolor in reprehenderit in voluptate velit esse
                          cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <ul className="mt-5 space-y-3">
                          {job.responsibilities.map((item) => (
                            <li key={item} className="pl-4">
                              - {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8">
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Benefits
                      </h2>

                      <div className="mt-5 text-sm font-light leading-6 text-dark-blue-400">
                        <p>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                          sed do eiusmod tempor incididunt ut labore et dolore magna
                          aliqua. Duis aute irure dolor in reprehenderit in voluptate
                          velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <ul className="mt-5 space-y-3">
                          {job.benefits.map((item) => (
                            <li key={item} className="pl-4">
                              - {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="Project Scope">
                  <div className="space-y-8 p-6">
                    {scopeGroups.map((group) => (
                      <section key={group.label}>
                        <h2 className="text-lg font-semibold leading-none text-dark-blue-400">
                          {group.label}
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {group.items.map((item) => (
                            <Badge key={item} visual="gray" className="bg-gray-100">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="Project Team">
                  <div className="space-y-5 p-6">
                    {teamMembers.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-semibold text-dark-blue-400">
                              {member.name}
                            </div>
                            <div className="text-sm font-light text-gray-500">
                              {member.role}
                            </div>
                          </div>
                        </div>

                        <Button variant="link" visual="gray" className="px-0">
                          View Profile
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-1 text-sm font-semibold text-dark-blue-400">
                <span>Total Earnings Opportunity</span>
                <TooltipProvider delayDuration={75}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <HelpCircle className="size-4 text-gray-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Estimated earnings based on current offer rate and schedule.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-4 text-[42px] font-bold leading-none text-dark-blue-400">
                {job.earnings}
              </div>

              <div className="mt-6 rounded-lg bg-primary-25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500">
                    Based on your offer rate of ${job.offerRate}/hr
                  </span>
                  <NextLink
                    href="#"
                    className="text-xs font-semibold text-primary-500 hover:underline"
                  >
                    View Details
                  </NextLink>
                </div>
                <Progress className="mt-3 h-2" bubble={false} value={87} />
              </div>

              <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-light text-gray-500">Work Schedule</span>
                  <span className="font-semibold text-dark-blue-400">
                    {job.workSchedule}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-light text-gray-500">Duration</span>
                  <span className="font-semibold text-dark-blue-400">
                    {job.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-light text-gray-500">
                    Anticipated Start Date
                  </span>
                  <span className="font-semibold text-dark-blue-400">
                    {job.startDate}
                  </span>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <div className="space-y-4 opacity-40 blur-sm">
                <div className="flex items-center gap-3">
                  <Avatar size="md">
                    <AvatarImage src="/woman.jpg" alt="Client" />
                    <AvatarFallback>H</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold text-dark-blue-400">
                      Harry Torres Vibe
                    </div>
                    <div className="text-xs font-light text-gray-500">
                      Christopher Torres
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-semibold text-dark-blue-400">
                    Marketing
                  </div>
                  <div className="mt-2 text-xs font-light leading-5 text-gray-500">
                    Building an ambitious mobile product with a small but focused
                    internal team.
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-25 text-primary-500">
                    <HelpCircle className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold leading-5 text-dark-blue-400">
                      Upgrade your account to see client info
                    </h3>
                    <p className="mt-2 text-xs font-light leading-5 text-gray-500">
                      In order to see detailed client info, you will have to
                      have a premium membership.
                    </p>
                    <Button
                      variant="link"
                      visual="gray"
                      className="mt-3 px-0 text-primary-500"
                    >
                      Upgrade Now
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

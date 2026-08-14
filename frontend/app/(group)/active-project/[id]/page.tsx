"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  IconButton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui"
import {
  Calendar,
  CalendarCheck01,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CurrencyDollar,
  Edit05,
  File02,
  File06,
  FileCheck02,
  HelpCircle,
  Home,
  LinkExternal01,
  Mail,
  MessageSquare01,
  MoreHorizontal,
  Phone,
  Plus,
  Settings,
  Shield,
  Users,
} from "@blend-metrics/icons"

interface TeamMember {
  name: string
  username: string
  role: string
  avatar: string
}

interface Meeting {
  date: string
  day: string
  title: string
  time: string
  type: "internal" | "client"
}

const sampleMembers: TeamMember[] = [
  { name: "Devon Lane", username: "@uxdesignerdevon", role: "Account Manager", avatar: "/man.jpg" },
  { name: "Ian Somerhalder", username: "@iansomerhalder_official", role: "President of Sales", avatar: "/man.jpg" },
  { name: "Harold Finch", username: "@haroldfinchdesigns", role: "Marketing Coordinator", avatar: "/man.jpg" },
  { name: "Max Finch", username: "@maxfinchcreative", role: "Web Designer", avatar: "/man.jpg" },
  { name: "Fiona Gallagher", username: "@fionagallagherux", role: "Software Developer", avatar: "/man.jpg" },
  { name: "Elena Gilbert", username: "@elenagilbertdesign", role: "Ethical Hacker", avatar: "/man.jpg" },
  { name: "Isla Fisher", username: "@islafisherprojects", role: "Project Manager", avatar: "/man.jpg" },
]

const vacantRoles = [
  "UX/UI Designer",
  "Front-end Developer",
  "Full Stack Engineer",
  "Nest.js Backend Engi...",
  "Lead Designer",
]

const sampleMeetings: Meeting[] = [
  { date: "July 24th", day: "Wed", title: "Daily Checkin", time: "10:00 - 11:00 AM", type: "internal" },
  { date: "July 24th", day: "Wed", title: "Milestone Update", time: "1:00 - 2:00 PM", type: "internal" },
  { date: "July 24th", day: "Wed", title: "Milestone Update", time: "1:00 - 2:00 PM", type: "client" },
]

const activityItems = [
  { icon: File06, title: "You placed the order", date: "Thu, Feb 6 (5 days ago)", expandable: false, category: "order" as const },
  { icon: null, title: "Amir Khan", date: "Thu, Feb 6 (5 days ago)", expandable: true, isAvatar: true, category: "member" as const },
  { icon: Check, title: "Due date", date: "Thu, Feb 6 (5 days ago)", expandable: false, category: "milestone" as const },
  { icon: Users, title: "4 project members joined", date: "Thu, Feb 6 (5 days ago)", expandable: true, category: "team" as const },
  { icon: Check, title: "You submitted the requirements", date: "View requirements - Thu, Feb 6 (3 days ago)", expandable: false, category: "milestone" as const },
  { icon: Edit05, title: "Design Email Marketing", date: "Moved to Complete - Thu, Feb 6 (5 days ago)", expandable: false, category: "task" as const },
  { icon: Settings, title: "Quick review design", date: "Thu, Feb 6 (5 days ago) - Task", expandable: false, category: "review" as const },
]

const activityCategoryStyles: Record<string, { bg: string; icon: string }> = {
  order: { bg: "bg-primary-50", icon: "text-primary-500" },
  member: { bg: "bg-gray-100", icon: "text-gray-500" },
  milestone: { bg: "bg-success-50", icon: "text-success-500" },
  team: { bg: "bg-primary-50", icon: "text-primary-500" },
  task: { bg: "bg-warning-50", icon: "text-warning-500" },
  review: { bg: "bg-error-50", icon: "text-error-500" },
}

export default function ActiveProjectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const contractTitle = searchParams.get("title") || "Marketeq Client Portal - Redesigning and Optimizing Website for Enhanced User Experience."
  const groupName = searchParams.get("group") || "My Contracts"
  const [activeTab, setActiveTab] = useState("overview")

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthenticatedRoute>
      <div className={`flex bg-gray-50 min-h-screen transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="inline-flex items-center">
                <Home className="size-3.5" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/my-contracts">My Contracts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>{contractTitle.length > 30 ? contractTitle.slice(0, 30) + "..." : contractTitle}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Page Header */}
          <div className="flex items-center justify-between mt-5">
            <h1 className="text-[28px] font-bold text-dark-blue-400 leading-[34px] flex-1">
              {contractTitle}
            </h1>
            <div className="flex items-center gap-6 flex-none">
              <Button variant="ghost" visual="gray" size="sm" leftIcon={<HelpCircle className="size-[15px]" />} className="text-sm font-semibold text-gray-500">
                Get help
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outlined" visual="gray" size="sm" leftIcon={<LinkExternal01 className="size-[15px]" />} className="rounded-[5px]">
                  View in Marketplace
                </Button>
                <IconButton variant="outlined" visual="gray" size="sm" className="rounded-[5px] size-9">
                  <Settings className="size-3" />
                </IconButton>
                <IconButton variant="outlined" visual="gray" size="sm" className="rounded-[5px] size-9">
                  <MoreHorizontal className="size-3" />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="mt-5 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)] overflow-hidden">
            {/* Top section with stats */}
            <div className="px-6 py-6 border-b border-gray-200">
              <p className="text-sm font-bold text-dark-blue-400 mb-6">Order Summary</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <File02 className="size-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-light text-dark-blue-400">Order number</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">#F04098529345U9RT</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <CalendarCheck01 className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Order Placed</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">May 24, 2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <CurrencyDollar className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Project Cost</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">$94,000</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <Clock className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Project Duration</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2 flex items-center gap-1">
                      6 months, 12 days
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom section with image + description */}
            <div className="px-6 py-6 flex items-start gap-4">
              <div className="w-[125px] h-20 rounded-md bg-gray-200 flex-none overflow-hidden">
                <img src="/man.jpg" alt="Project" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-light text-gray-700 leading-[17px] line-clamp-2">
                  Lorem ipsum dolor sit amet consectetur. Mi eu ipsum augue in integer lacus amet semper. Non dictum phasellus elit turpis
                  nisi vitae et. Tristique ultricies habitasse tortor vehicula elementum. Nulla turpis moncus venenatis at. In porta viverra fauci...
                </p>
                <div className="flex items-center justify-between mt-3.5">
                  <AvatarGroup size="sm" max={4} excess excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white">
                    {sampleMembers.slice(0, 6).map((m, i) => (
                      <Avatar key={i} size="sm" className="hover:ring-0 active:ring-0">
                        <AvatarImage src={m.avatar} alt={m.name} />
                        <AvatarFallback>{m.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <Button variant="outlined" visual="gray" size="sm" leftIcon={<FileCheck02 className="size-[15px]" />} className="rounded-[5px]">
                    View Billing
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + Content */}
          <div className="mt-8 flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} unanimated>
                <TabsList className="px-5 w-full !justify-start [&>*+*]:ml-8 [&>*]:text-base">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="scope">Scope</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6 mt-6">
                    {/* Project Summary + Progress Overview (single card with divider) */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                      {/* Project Summary section */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-bold text-dark-blue-400">Project Summary</h2>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-light text-gray-400">Team Status</span>
                            <Badge visual="success" size="sm" className="rounded-full">Active</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 leading-[17px]">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
                          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200" />

                      {/* Progress Overview section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-dark-blue-400">Progress Overview</h2>

                        {/* Tasks Progress inner card */}
                        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-dark-blue-400">Tasks Progress</h3>
                            <Button variant="link" visual="primary" size="sm" className="capitalize">View Tasks</Button>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-4">
                              Project Duration: 4 months, 6 days
                            </p>
                            <div className="flex items-center gap-[3px] h-[23px] w-full mb-2">
                              <div className="h-[23px] bg-success-200 rounded" style={{ width: "12%" }} />
                              <div className="h-[23px] bg-primary-200 rounded" style={{ width: "34%" }} />
                              <div className="h-[23px] bg-gray-200 rounded flex-1" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-success-200" />
                                <span className="text-[11px] font-semibold text-gray-400">Completed</span>
                                <span className="text-[11px] font-medium text-gray-400">2 tasks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-primary-200" />
                                <span className="text-[11px] font-semibold text-gray-400">In Progress</span>
                                <span className="text-[11px] font-medium text-gray-400">4 tasks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-gray-200" />
                                <span className="text-[11px] font-semibold text-gray-400">Not Started</span>
                                <span className="text-[11px] font-medium text-gray-400">6 tasks</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-4">
                              <span className="font-normal">2 out of </span>
                              <span className="font-semibold">12 tasks</span>
                              <span className="font-light"> complete</span>
                            </p>
                          </div>
                        </div>

                        {/* Hours Logged inner card */}
                        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-dark-blue-400">Hours Logged</h3>
                            <Button variant="link" visual="primary" size="sm" className="capitalize">View Timesheet</Button>
                          </div>
                          <div className="flex items-center justify-between gap-2 drop-shadow-[0px_1px_4px_rgba(0,0,0,0.03)] rounded-lg">
                            {[
                              { label: "Today", value: "4h 30m" },
                              { label: "This Week", value: "4h 30m" },
                              { label: "This Month", value: "4h 30m" },
                              { label: "Total Hours", value: "142h 30m" },
                            ].map((stat) => (
                              <div key={stat.label} className="flex flex-col items-start gap-2 flex-1">
                                <p className="text-sm font-medium text-dark-blue-400 leading-5">{stat.label}</p>
                                <p className="text-base font-bold text-dark-blue-400 leading-[19px]">
                                  {stat.value} <span className="text-[10px] font-normal">Logged</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Members + Vacant Roles (single card with divider) */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                      {/* Team Members section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-dark-blue-400">Team Members</h2>
                        <div className="grid grid-cols-3 gap-6">
                          {/* Add Member */}
                          <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="flex items-center justify-center size-10 rounded-full border border-dashed border-gray-300 bg-white flex-none group-hover:border-gray-500 transition-colors">
                              <Plus className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                            <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline">Add Member</span>
                          </div>
                          {sampleMembers.map((member, i) => (
                            <div key={i} className="flex items-center gap-3 min-w-0 cursor-pointer group">
                              <Avatar size="md" className="hover:ring-0 active:ring-0 flex-none !size-10">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 space-y-1">
                                <p className="text-base leading-[19px] text-dark-blue-400 hover:underline truncate">
                                  <span className="font-semibold">{member.name.split(" ")[0]}</span> <span className="font-normal">{member.username}</span>
                                </p>
                                <p className="text-xs font-medium text-dark-blue-400 truncate">{member.role}</p>
                              </div>
                            </div>
                          ))}
                          {/* View Team */}
                          <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="flex items-center justify-center size-10 rounded-full border-2 border-gray-300 bg-white flex-none">
                              <span className="text-xs font-medium text-gray-500">+5</span>
                            </div>
                            <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline">View Team</span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200" />

                      {/* Vacant Roles section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-base font-bold text-dark-blue-400">Vacant Roles</h2>
                        <div className="grid grid-cols-3 gap-6">
                          {vacantRoles.map((role) => (
                            <div key={role} className="flex items-center gap-3 min-w-0 cursor-pointer group">
                              <div className="flex items-center justify-center size-10 rounded-full border border-dashed border-gray-300 bg-white flex-none group-hover:border-gray-500 transition-colors">
                                <Plus className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                              </div>
                              <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline truncate">{role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-dark-blue-400">Recent Activity</h2>
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <MoreHorizontal className="size-4" />
                        </IconButton>
                      </div>
                      <div className="relative space-y-0">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-10 bottom-4 w-px bg-gray-200" />
                        {activityItems.map((item, i) => {
                          const Icon = item.icon
                          return (
                            <div key={i} className="flex items-start gap-3 relative py-2.5">
                              {item.isAvatar ? (
                                <Avatar size="sm" className="hover:ring-0 active:ring-0 flex-none mt-0.5 z-10 !size-8">
                                  <AvatarImage src="/man.jpg" alt={item.title} />
                                  <AvatarFallback>{item.title[0]}</AvatarFallback>
                                </Avatar>
                              ) : Icon ? (
                                <div className={`flex items-center justify-center size-8 rounded-full flex-none mt-0.5 z-10 ${activityCategoryStyles[item.category]?.bg || "bg-gray-100"}`}>
                                  <Icon className={`size-4 ${activityCategoryStyles[item.category]?.icon || "text-gray-500"}`} />
                                </div>
                              ) : (
                                <div className="size-8 flex-none" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-dark-blue-400">{item.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                                {item.title === "Amir Khan" && (
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
                                      magna aliqua.
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 px-3 py-2 border border-gray-200 rounded-lg">
                                      <File06 className="size-5 text-gray-400" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-dark-blue-400">Marketeq Sanity Nextjs</p>
                                        <p className="text-xs text-gray-400">53.27 kB  pdf</p>
                                      </div>
                                      <IconButton variant="ghost" visual="gray" size="sm">
                                        <MoreHorizontal className="size-4" />
                                      </IconButton>
                                    </div>
                                  </div>
                                )}
                                {item.title === "4 project members joined" && (
                                  <div className="flex items-center gap-1 mt-2">
                                    {[1, 2, 3].map((j) => (
                                      <Avatar key={j} size="sm" className="hover:ring-0 active:ring-0">
                                        <AvatarImage src="/man.jpg" alt="member" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Button variant="outlined" visual="gray" size="sm" className="w-full justify-center mt-6">
                        View More
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tasks"><div className="mt-6 text-sm text-gray-500">Tasks content</div></TabsContent>
                <TabsContent value="chat"><div className="mt-6 text-sm text-gray-500">Chat content</div></TabsContent>
                <TabsContent value="scope"><div className="mt-6 text-sm text-gray-500">Scope content</div></TabsContent>
                <TabsContent value="team"><div className="mt-6 text-sm text-gray-500">Team content</div></TabsContent>
                <TabsContent value="files"><div className="mt-6 text-sm text-gray-500">Files content</div></TabsContent>
                <TabsContent value="contract"><div className="mt-6 text-sm text-gray-500">Contract content</div></TabsContent>
                <TabsContent value="activity"><div className="mt-6 text-sm text-gray-500">Activity content</div></TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar */}
            <div className="w-[335px] flex-none space-y-5">
              {/* Account Manager */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-start gap-3">
                  <Avatar size="2xl" className="hover:ring-0 active:ring-0 flex-none !size-16">
                    <AvatarImage src="/man.jpg" alt="Chris" />
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="size-[10px] rounded-full bg-[#19BD1F] border-[1.3px] border-white" />
                      <span className="text-xs text-dark-blue-400">Online</span>
                    </div>
                    <p className="text-lg leading-[22px] text-dark-blue-400">
                      <span className="font-semibold">Chris</span> <span className="font-normal">@uxdesignpro22</span>
                    </p>
                    <p className="text-sm font-medium text-dark-blue-400">Account Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outlined" visual="gray" size="sm" className="justify-center rounded-[5px]" leftIcon={<Mail className="size-[15px]" />}>
                    Message
                  </Button>
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1 justify-center rounded-[5px]" leftIcon={<Phone className="size-[15px]" />}>
                    Schedule Call
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-primary-25 border border-primary-500 rounded-[5px]">
                  <span className="text-[10px] font-medium text-primary-500">Your next meeting is on</span>
                  <span className="text-[10px] font-bold text-primary-500">July 2nd @ 2:30 pm</span>
                </div>
              </div>

              {/* Project Manager */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-start gap-3">
                  <Avatar size="2xl" className="hover:ring-0 active:ring-0 flex-none !size-16">
                    <AvatarImage src="/man.jpg" alt="Adam" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="size-[10px] rounded-full bg-[#19BD1F] border-[1.3px] border-white" />
                      <span className="text-xs text-dark-blue-400">Online</span>
                    </div>
                    <p className="text-lg leading-[22px] text-dark-blue-400">
                      <span className="font-semibold">Adam</span> <span className="font-normal">@uxdesignpro22</span>
                    </p>
                    <p className="text-sm font-medium text-dark-blue-400">Project Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outlined" visual="gray" size="sm" className="justify-center rounded-[5px]" leftIcon={<Mail className="size-[15px]" />}>
                    Message
                  </Button>
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1 justify-center rounded-[5px]" leftIcon={<Phone className="size-[15px]" />}>
                    Schedule Call
                  </Button>
                </div>
              </div>

              {/* NDA */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-full bg-primary-50 flex-none">
                    <Shield className="size-[18px] text-primary-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-dark-blue-400 leading-[30px]">Non-Disclosure Agreement</p>
                    <p className="text-xs text-gray-500">Upgrade with an NDA</p>
                  </div>
                </div>
                <Button variant="outlined" visual="gray" size="sm" className="w-full justify-center rounded-[5px]" leftIcon={<Plus className="size-[15px]" />}>
                  Add NDA
                </Button>
              </div>

              {/* Upcoming Meetings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex flex-col gap-3">
                  {/* Header row */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-6">
                      <h3 className="text-sm font-bold text-dark-blue-400 capitalize">Upcoming Meetings</h3>
                      <p className="text-xs font-semibold text-dark-blue-400 leading-[13px]">Internal</p>
                    </div>
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 rounded shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors">
                      <Plus className="size-3 text-dark-blue-400" />
                      <span className="text-xs font-semibold text-dark-blue-400">New</span>
                    </button>
                  </div>

                  {/* Internal meetings */}
                  {sampleMeetings.filter((m) => m.type === "internal").map((meeting, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-[5px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col items-center justify-center w-20 h-12 bg-primary-25 border border-primary-500 rounded-md shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex-none relative overflow-visible">
                        <span className="text-xs font-bold text-primary-500 text-center leading-snug">{meeting.date}</span>
                        <span className="text-[10px] text-primary-500 text-center leading-snug">{meeting.day}</span>
                        <div className="absolute -left-[5px] -bottom-[5px] z-10 size-6 rounded-full border-2 border-white overflow-hidden">
                          <img src="/man.jpg" alt="organizer" className="size-full object-cover" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center -mt-0.5">
                        <p className="text-sm font-semibold text-dark-blue-400 capitalize leading-6">{meeting.title}</p>
                        <p className="text-xs text-dark-blue-400 leading-[13px]">{meeting.time}</p>
                      </div>
                    </div>
                  ))}

                  {/* Client label */}
                  <p className="text-xs font-semibold text-dark-blue-400 leading-[13px]">Client</p>

                  {/* Client meetings */}
                  {sampleMeetings.filter((m) => m.type === "client").map((meeting, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-[5px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col items-center justify-center w-20 h-12 bg-primary-25 border border-primary-500 rounded-md shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex-none relative overflow-visible">
                        <span className="text-xs font-bold text-primary-500 text-center leading-snug">{meeting.date}</span>
                        <span className="text-[10px] text-primary-500 text-center leading-snug">{meeting.day}</span>
                        <div className="absolute -left-[5px] -bottom-[5px] z-10 size-6 rounded-full border-2 border-white overflow-hidden">
                          <img src="/man.jpg" alt="organizer" className="size-full object-cover" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center -mt-0.5">
                        <p className="text-sm font-semibold text-dark-blue-400 capitalize leading-6">{meeting.title}</p>
                        <p className="text-xs text-dark-blue-400 leading-[13px]">{meeting.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-dark-blue-400 mb-4">Support</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 cursor-pointer group rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center size-10 rounded-full bg-gray-50 group-hover:bg-primary-50 flex-none transition-colors">
                      <MessageSquare01 className="size-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-blue-400 group-hover:text-primary-500 transition-colors">Chat With Us</p>
                      <p className="text-xs text-gray-400">Chat with someone. We'll respond as soon as we can</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 flex-none group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 cursor-pointer group rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center size-10 rounded-full bg-gray-50 group-hover:bg-primary-50 flex-none transition-colors">
                      <FileCheck02 className="size-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-blue-400 group-hover:text-primary-500 transition-colors">Report</p>
                      <p className="text-xs text-gray-400">Chat with someone. We'll respond as soon as we can</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 flex-none group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  IconButton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  InputGroup,
  InputLeftElement,
} from "@/components/ui"
import {
  Calendar,
  CalendarCheck01,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CurrencyDollar,
  Copy07,
  Edit03,
  Edit05,
  Expand01,
  FilterLines,
  FolderClosed,
  File02,
  File06,
  FileCheck02,
  HelpCircle,
  Home,
  LinkExternal01,
  Mail,
  MessageSquare01,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Settings,
  Shield,
  SearchMd,
  Send01,
  Trash01,
  UploadCloud,
  Users,
  XCircle,
} from "@blend-metrics/icons"
import { Grid } from "@/components/icons/grid"
import { List } from "@/components/icons/list"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"

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

interface Task {
  name: string
  assignee: string
  avatar: string
  status: "Completed" | "Not Started" | "In Progress"
  dueDate: string
}

const thisWeekTasks: Task[] = [
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "Completed", dueDate: "Jul 23, 2024" },
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024" },
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024" },
  { name: "UX Research", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024" },
  { name: "UX Research", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024" },
]

const nextWeekTasks: Task[] = [
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "Completed", dueDate: "Jul 23, 2024" },
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024" },
  { name: "UX Wireframing", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024" },
  { name: "UX Research", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024" },
  { name: "UX Research", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024" },
]

const taskStatusStyles: Record<string, { bg: string; text: string }> = {
  "Completed": { bg: "bg-success-50", text: "text-success-700" },
  "Not Started": { bg: "bg-gray-100", text: "text-gray-500" },
  "In Progress": { bg: "bg-primary-50", text: "text-primary-500" },
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
              <BreadcrumbLink href="/client-dashboard">Dashboard</BreadcrumbLink>
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
                  <Link href="/billing">
                    <Button variant="outlined" visual="gray" size="sm" leftIcon={<FileCheck02 className="size-[15px]" />} className="rounded-[5px]">
                      View Billing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + Content */}
          <div className="mt-8 flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                            <Button variant="link" visual="primary" size="sm" className="capitalize" onClick={() => setActiveTab("tasks")}>View Tasks</Button>
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
                            <Link href="/time-tracking">
                              <Button variant="link" visual="primary" size="sm" className="capitalize">View Timesheet</Button>
                            </Link>
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
                          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab("team")}>
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
                      <Button variant="outlined" visual="gray" size="sm" className="w-full justify-center mt-6" onClick={() => setActiveTab("activity")}>
                        View More
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tasks">
                  <div className="mt-6 flex flex-col items-start p-6 gap-8 bg-white border border-gray-200 shadow-xs rounded-lg">
                    {/* To-do for This Week */}
                    <div className="self-stretch flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button className="flex items-center justify-center w-4.5 h-4.5">
                            <ChevronDown className="w-4.5 h-4.5 text-gray-500" />
                          </button>
                          <h2 className="text-lg font-semibold text-dark-blue-400">To-do for This Week</h2>
                        </div>
                        <Button variant="outlined" visual="gray" size="sm">
                          <Plus className="w-3 h-3" />
                          Add Task
                        </Button>
                      </div>
                      <div className="bg-white border border-gray-200 shadow-xs rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="[&_tr]:border-t-0">
                          <TableRow>
                            <TableHead className="w-11 py-3 pr-0 pl-6"><Checkbox className="opacity-0" /></TableHead>
                            <TableHead className="w-[68px] py-3 px-6"><Checkbox className="opacity-0" /></TableHead>
                            <TableHead className="min-w-[143px] py-3 px-6">Task</TableHead>
                            <TableHead className="w-[105px] py-3 px-6 whitespace-nowrap">Assigned to</TableHead>
                            <TableHead className="w-[131px] py-3 px-6">Status</TableHead>
                            <TableHead className="w-[131px] py-3 px-6">Due Date</TableHead>
                            <TableHead className="w-[52px] py-3 pr-0 pl-6" />
                            <TableHead className="w-[75px] py-3 px-6" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {thisWeekTasks.map((task, i) => {
                            const style = taskStatusStyles[task.status]
                            return (
                              <TableRow key={i}>
                                <TableCell className="py-4 pr-0 pl-6 text-center">
                                  <img src="/icons/drag.svg" alt="" className="w-2 h-3 cursor-grab" />
                                </TableCell>
                                <TableCell className="py-4 px-6"><Checkbox /></TableCell>
                                <TableCell className="py-4 px-6 text-sm text-gray-600">{task.name}</TableCell>
                                <TableCell className="py-4 px-6">
                                  <Avatar size="sm">
                                    <AvatarImage src={task.avatar} alt={task.assignee} />
                                    <AvatarFallback>{task.assignee[0]}</AvatarFallback>
                                  </Avatar>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge className={`${style.bg} ${style.text} border-0`}>{task.status}</Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-sm text-gray-600">{task.dueDate}</TableCell>
                                <TableCell className="py-4 pr-0 pl-6 text-center">
                                  <IconButton visual="gray" variant="outlined" size="sm" className="rounded-full w-7 h-7 hover:bg-gray-50 transition-colors duration-300 group/attach">
                                    <Paperclip className="w-3 h-3 group-hover/attach:hidden" />
                                    <Plus className="w-3 h-3 text-gray-800 hidden group-hover/attach:block" />
                                  </IconButton>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <IconButton visual="gray" variant="ghost" size="sm" className="rounded-full data-[state=open]:bg-gray-100 transition-colors duration-300">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </IconButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[165px]">
                                      <DropdownMenuItem className="gap-2">
                                        <Edit03 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Rename</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2">
                                        <Copy07 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Duplicate task</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2">
                                        <FolderClosed className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Manage files</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="gap-2 text-error-600 focus:bg-error-50 focus:text-error-600">
                                        <Trash01 className="w-4 h-4" />
                                        <span className="text-xs font-medium">Delete task</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      </div>
                      <div className="flex justify-end">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 transition-colors duration-300">
                          View More
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* To-do for Next Week */}
                    <div className="self-stretch flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button className="flex items-center justify-center w-4.5 h-4.5">
                            <ChevronDown className="w-4.5 h-4.5 text-gray-500" />
                          </button>
                          <h2 className="text-lg font-semibold text-dark-blue-400">To-do for Next Week</h2>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 shadow-xs rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="[&_tr]:border-t-0">
                          <TableRow>
                            <TableHead className="w-11 py-3 pr-0 pl-6"><Checkbox className="opacity-0" /></TableHead>
                            <TableHead className="w-[68px] py-3 px-6"><Checkbox className="opacity-0" /></TableHead>
                            <TableHead className="min-w-[143px] py-3 px-6">Task</TableHead>
                            <TableHead className="w-[105px] py-3 px-6 whitespace-nowrap">Assigned to</TableHead>
                            <TableHead className="w-[131px] py-3 px-6">Status</TableHead>
                            <TableHead className="w-[131px] py-3 px-6">Due Date</TableHead>
                            <TableHead className="w-[52px] py-3 pr-0 pl-6" />
                            <TableHead className="w-[75px] py-3 px-6" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nextWeekTasks.map((task, i) => {
                            const style = taskStatusStyles[task.status]
                            return (
                              <TableRow key={i}>
                                <TableCell className="py-4 pr-0 pl-6 text-center">
                                  <img src="/icons/drag.svg" alt="" className="w-2 h-3 cursor-grab" />
                                </TableCell>
                                <TableCell className="py-4 px-6"><Checkbox /></TableCell>
                                <TableCell className="py-4 px-6 text-sm text-gray-600">{task.name}</TableCell>
                                <TableCell className="py-4 px-6">
                                  <Avatar size="sm">
                                    <AvatarImage src={task.avatar} alt={task.assignee} />
                                    <AvatarFallback>{task.assignee[0]}</AvatarFallback>
                                  </Avatar>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge className={`${style.bg} ${style.text} border-0`}>{task.status}</Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-sm text-gray-600">{task.dueDate}</TableCell>
                                <TableCell className="py-4 pr-0 pl-6 text-center">
                                  <IconButton visual="gray" variant="outlined" size="sm" className="rounded-full w-7 h-7 hover:bg-gray-50 transition-colors duration-300 group/attach">
                                    <Paperclip className="w-3 h-3 group-hover/attach:hidden" />
                                    <Plus className="w-3 h-3 text-gray-800 hidden group-hover/attach:block" />
                                  </IconButton>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <IconButton visual="gray" variant="ghost" size="sm" className="rounded-full data-[state=open]:bg-gray-100 transition-colors duration-300">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </IconButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[165px]">
                                      <DropdownMenuItem className="gap-2">
                                        <Edit03 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Rename</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2">
                                        <Copy07 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Duplicate task</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2">
                                        <FolderClosed className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Manage files</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="gap-2 text-error-600 focus:bg-error-50 focus:text-error-600">
                                        <Trash01 className="w-4 h-4" />
                                        <span className="text-xs font-medium">Delete task</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      </div>
                      <div className="flex justify-end">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 transition-colors duration-300">
                          View More
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="chat">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg overflow-hidden flex flex-col" style={{ height: "700px" }}>
                    {/* Header - matches inbox chats-comp header */}
                    <div className="px-8 shrink-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10">
                      <div className="inline-flex items-center gap-x-3">
                        <Avatar className="size-[43px]" size="md" isOnline>
                          <AvatarImage src="/group-default.png" alt="Project Group" />
                          <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-y-1">
                          <div className="inline-flex items-center gap-x-1.5">
                            <span className="text-lg font-semibold text-dark-blue-400">Project Group Chat</span>
                          </div>
                          <div className="inline-flex items-center gap-x-2">
                            <span className="text-sm text-dark-blue-400">3 active now</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-1">
                        <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                          <SearchMd className="size-[22px]" />
                        </IconButton>
                        <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                          <MoreHorizontal className="size-[22px]" />
                        </IconButton>
                      </div>
                    </div>

                    {/* Message list - matches inbox ScrollArea + bubble structure */}
                    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
                      <div className="p-8 grid gap-y-6">
                        {/* Date separator */}
                        <div className="flex items-center gap-x-3 py-1" role="separator">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-[11px] font-medium text-gray-500 shrink-0">Today</span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        {/* YourBubble - received message (left aligned with avatar) */}
                        {[
                          { sender: sampleMembers[1], text: "Hey team, I just pushed the latest designs for the dashboard. Can everyone take a look?", time: "09:30 AM" },
                          { sender: sampleMembers[2], text: "I finished the API integration for the user profiles. Ready for review.", time: "10:15 AM" },
                        ].map((msg, i) => (
                          <div key={`them-${i}`} className="flex justify-start rounded-lg">
                            <article className="flex items-end gap-x-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[680px]">
                              <Avatar size="md" className="hover:ring-0 active:ring-primary-100 shrink-0" isOnline>
                                <AvatarImage src={msg.sender.avatar} alt={msg.sender.name} />
                                <AvatarFallback>{msg.sender.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start gap-y-2 min-w-0 flex-1">
                                <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                                  <div className="flex items-end justify-between">
                                    <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                      {msg.sender.name}{" "}
                                      <span className="text-xs leading-[14.52px] font-normal">{msg.sender.username}</span>
                                    </h3>
                                  </div>
                                  <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                    {msg.text}
                                  </span>
                                </div>
                                <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                                  Sent <span className="font-bold">{msg.time}</span>
                                </span>
                              </div>
                            </article>
                          </div>
                        ))}

                        {/* Bubble - sent message (right aligned, no avatar) */}
                        <div className="flex justify-end rounded-lg">
                          <article className="flex flex-col items-start gap-y-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[640px]">
                            <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                              <div className="flex items-end justify-between">
                                <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                  Me{" "}
                                  <span className="text-xs leading-[14.52px] font-normal">@uxdesignpro22</span>
                                </h3>
                              </div>
                              <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                Looks great! I have a few notes on the sidebar navigation. Will share feedback shortly.
                              </span>
                            </div>
                            <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                              Seen <span className="font-bold">09:45 AM</span>
                            </span>
                          </article>
                        </div>

                        {/* Another received message */}
                        <div className="flex justify-start rounded-lg">
                          <article className="flex items-end gap-x-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[680px]">
                            <Avatar size="md" className="hover:ring-0 active:ring-primary-100 shrink-0" isOnline>
                              <AvatarImage src={sampleMembers[3].avatar} alt={sampleMembers[3].name} />
                              <AvatarFallback>{sampleMembers[3].name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start gap-y-2 min-w-0 flex-1">
                              <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                                <div className="flex items-end justify-between">
                                  <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                    {sampleMembers[3].name}{" "}
                                    <span className="text-xs leading-[14.52px] font-normal">{sampleMembers[3].username}</span>
                                  </h3>
                                </div>
                                <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                  Sounds good. I&apos;ll have the test cases ready by then. Let&apos;s sync up this afternoon to go over everything before the sprint review.
                                </span>
                              </div>
                              <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                                Sent <span className="font-bold">11:00 AM</span>
                              </span>
                            </div>
                          </article>
                        </div>

                        {/* Another sent message */}
                        <div className="flex justify-end rounded-lg">
                          <article className="flex flex-col items-start gap-y-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[640px]">
                            <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                              <div className="flex items-end justify-between">
                                <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                  Me{" "}
                                  <span className="text-xs leading-[14.52px] font-normal">@uxdesignpro22</span>
                                </h3>
                              </div>
                              <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                Perfect. Let&apos;s sync up this afternoon to go over everything before the sprint review.
                              </span>
                            </div>
                            <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                              Sent <span className="font-bold">10:30 AM</span>
                            </span>
                          </article>
                        </div>
                      </div>
                    </div>

                    {/* Composer - matches inbox composer */}
                    <div className="bg-white shrink-0 border-t border-gray-200">
                      <div className="p-3 flex min-h-[68px] items-end gap-x-3">
                        <div className="flex items-center gap-x-1">
                          <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                            <Plus className="size-[22px]" />
                          </IconButton>
                          <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                            <Paperclip className="size-[22px]" />
                          </IconButton>
                        </div>
                        <InputGroup className="flex-auto">
                          <Input placeholder="Send message..." className="h-9 pr-11" />
                        </InputGroup>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scope">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-dark-blue-400">Project Scope</h2>
                      <Button variant="outlined" visual="gray" size="sm">
                        <Plus className="size-[15px]" />
                        Add Phase
                      </Button>
                    </div>

                    <Accordion type="multiple" defaultValue={["phase-0", "phase-1"]}>
                      {[
                        {
                          name: "Discovery & Planning",
                          tasks: [
                            { task: "Stakeholder interviews", role: "UX Researcher", location: "Remote", experience: "Senior", duration: "1 week" },
                            { task: "Competitive analysis", role: "Product Designer", location: "Remote", experience: "Mid", duration: "3 days" },
                            { task: "Requirements documentation", role: "Business Analyst", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                        {
                          name: "Design & Prototyping",
                          tasks: [
                            { task: "Wireframe creation", role: "UX Designer", location: "Remote", experience: "Senior", duration: "2 weeks" },
                            { task: "High-fidelity mockups", role: "UI Designer", location: "Remote", experience: "Senior", duration: "2 weeks" },
                            { task: "Interactive prototype", role: "UI Designer", location: "Remote", experience: "Mid", duration: "1 week" },
                            { task: "Design system setup", role: "UI Designer", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                        {
                          name: "Development",
                          tasks: [
                            { task: "Frontend architecture", role: "Frontend Developer", location: "Remote", experience: "Senior", duration: "1 week" },
                            { task: "Backend API development", role: "Backend Developer", location: "Remote", experience: "Senior", duration: "3 weeks" },
                            { task: "Database schema design", role: "Backend Developer", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                      ].map((phase, index) => (
                        <AccordionItem key={index} value={`phase-${index}`} asChild>
                          <div className="rounded-lg border border-gray-200 shadow-sm mb-4">
                            <div className="mb-3 flex items-center justify-between px-3 pt-3">
                              <div className="inline-flex items-center gap-x-3.5 min-w-0">
                                <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>
                                <span className="text-base font-semibold leading-7 text-gray-900">
                                  Phase {index + 1}{" "}
                                  <span className="font-light">{phase.name}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge visual="gray" className="rounded-full">{phase.tasks.length} tasks</Badge>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <MoreHorizontal className="size-4" />
                                </IconButton>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <Plus className="size-4" />
                                </IconButton>
                              </div>
                            </div>
                            <DisclosureContent className="overflow-auto">
                              <Table>
                                <TableHeader className="[&_tr]:border-t-0">
                                  <TableRow>
                                    <TableHead className="py-3 px-6">Task</TableHead>
                                    <TableHead className="py-3 px-6">Role</TableHead>
                                    <TableHead className="py-3 px-6">Location</TableHead>
                                    <TableHead className="py-3 px-6">Experience</TableHead>
                                    <TableHead className="py-3 px-6">Duration</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {phase.tasks.map((t, ti) => (
                                    <TableRow key={ti}>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.task}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.role}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.location}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.experience}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.duration}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </DisclosureContent>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </TabsContent>

                <TabsContent value="team">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    {/* Project Owner */}
                    <div>
                      <span className="text-sm font-semibold text-dark-blue-400">Project Owner</span>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <Avatar size="md">
                            <AvatarImage src="/man.jpg" alt="Chris" />
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-bold text-dark-blue-400">Chris</span>
                            <span className="text-sm font-light text-gray-500"> @uxdesignpro22</span>
                            <p className="text-xs font-light text-dark-blue-400">Project Owner</p>
                          </div>
                        </div>
                        <Badge visual="primary" className="rounded-[4px] bg-primary-50">Account Manager</Badge>
                      </div>
                    </div>

                    {/* Assign Project Lead & Select Label */}
                    <div className="mt-8 grid grid-cols-2 gap-x-6">
                      <div>
                        <span className="text-sm font-semibold text-dark-blue-400">Assign Project Lead</span>
                        <div className="mt-2">
                          <InputGroup>
                            <Input className="h-[44px]" placeholder="Search team members" />
                            <InputLeftElement>
                              <SearchMd className="text-gray-500 h-4 w-4" />
                            </InputLeftElement>
                          </InputGroup>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-dark-blue-400">Select label</span>
                        <div className="mt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:border-gray-300 focus-visible:outline-none"
                              >
                                <span className="text-gray-500">None selected</span>
                                <ChevronDown className="size-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}>
                              {["Account Manager", "Project Manager", "Client Relations Manager", "Team Manager"].map((l) => (
                                <DropdownMenuItem key={l}>{l}</DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Use Profile Job Title</DropdownMenuItem>
                              <DropdownMenuItem>Create Custom Label</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="mt-10">
                      <div className="flex items-start justify-between">
                        <h2 className="text-xl leading-[30px] font-semibold text-dark-blue-400">Team Members</h2>
                        <Button variant="outlined" visual="gray">
                          <Plus className="size-[15px]" />
                          Add Team Member
                        </Button>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-dark-blue-400">All assignees ({sampleMembers.length})</h3>
                        <p className="mt-1 text-xs font-light text-dark-blue-400">
                          View and manage all users currently assigned to this project below.
                        </p>
                      </div>

                      <div className="mt-4">
                        <span className="text-sm font-semibold text-dark-blue-400">Add team members to this project</span>
                        <InputGroup className="mt-2">
                          <Input placeholder="Add users to this project" />
                          <InputLeftElement>
                            <SearchMd className="text-gray-500 h-4 w-4" />
                          </InputLeftElement>
                        </InputGroup>
                      </div>

                      <div className="mt-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs font-medium text-gray-500">Name</TableHead>
                              <TableHead className="text-xs font-medium text-gray-500">Project Role</TableHead>
                              <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                              <TableHead className="w-[40px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleMembers.map((member, mi) => {
                              const isOwner = mi === 0
                              const role = isOwner ? "Owner" : mi % 3 === 0 ? "Manager" : mi % 3 === 1 ? "Contributor" : "Viewer"
                              return (
                                <TableRow key={mi}>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-x-3">
                                      <Avatar size="sm">
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="text-sm font-semibold text-dark-blue-400">{member.name}</span>
                                        <span className="text-sm font-light text-gray-500"> {member.username}</span>
                                        {mi === 0 && <span className="text-sm font-semibold text-dark-blue-400"> (You)</span>}
                                        <p className="text-xs font-light text-dark-blue-400">{member.role}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {isOwner ? (
                                      <div className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                                        Owner
                                        <ChevronDown className="size-4 opacity-50" />
                                      </div>
                                    ) : (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-dark-blue-400 hover:border-gray-300 focus-visible:outline-none"
                                          >
                                            {role}
                                            <ChevronDown className="size-4 text-gray-500" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-[288px]">
                                          {["Manager", "Contributor", "Viewer"].map((r) => (
                                            <DropdownMenuItem key={r} className="flex flex-col items-start gap-0.5 py-2">
                                              <span className="flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
                                                {role === r ? <Check className="size-4 text-primary-500" /> : <span className="size-4" />}
                                                {r}
                                              </span>
                                              <span className="pl-6 text-xs font-light text-gray-500">
                                                This is where the role&apos;s permissions and limitations are briefly explained.
                                              </span>
                                            </DropdownMenuItem>
                                          ))}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                            <XCircle className="size-4" />
                                            Remove from project
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <span className="text-sm font-semibold text-success-500">Active</span>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <IconButton variant="ghost" visual="gray" size="sm">
                                          <MoreHorizontal className="size-4" />
                                        </IconButton>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-[200px]">
                                        <DropdownMenuItem>Manage User</DropdownMenuItem>
                                        <DropdownMenuItem>Assign Team Lead</DropdownMenuItem>
                                        <DropdownMenuItem>Transfer Ownership</DropdownMenuItem>
                                        {!isOwner && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                              <XCircle className="size-4" />
                                              Remove from project
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="files">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<UploadCloud className="size-[15px]" />}>
                          Upload
                        </Button>
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<Plus className="size-[15px]" />}>
                          New Folder
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <SearchMd className="size-4" />
                        </IconButton>
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<FilterLines className="size-[15px]" />}>
                          Filters
                        </Button>
                        <ToggleGroupRoot className="p-0 gap-x-0">
                          <ToggleGroupItem className="size-10 py-0 px-0 rounded-l-lg rounded-r-none" value="grid">
                            <Grid />
                          </ToggleGroupItem>
                          <ToggleGroupItem className="size-10 py-0 px-0 rounded-r-lg rounded-l-none" value="list">
                            <List />
                          </ToggleGroupItem>
                        </ToggleGroupRoot>
                        <IconButton variant="outlined" visual="gray" size="sm">
                          <Expand01 className="size-4" />
                        </IconButton>
                      </div>
                    </div>

                    {/* Folder pills */}
                    <div className="mt-6 flex items-center gap-4">
                      {[
                        { name: "Design Logo", count: 2 },
                        { name: "Research Best i...", count: 3 },
                        { name: "Build Informatio...", count: 3 },
                      ].map((folder) => (
                        <div key={folder.name} className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-300 h-16">
                          <div className="flex items-center justify-center size-10 bg-white rounded-[5px]">
                            <img src="/icons/folder.svg" alt="" className="w-9 h-8" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-medium text-gray-800 leading-5">{folder.name}</p>
                            <p className="text-xs text-gray-500 capitalize leading-5">{folder.count} Files</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-center px-6 py-5 bg-gray-100 border border-gray-200 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-300 h-16">
                        <span className="text-sm font-medium text-gray-800 text-center">+ 3</span>
                      </div>
                    </div>

                    {/* File cards grid */}
                    <div className="mt-6 grid grid-cols-3 gap-5">
                      {[
                        { name: "Software Desi... .pdf", task: "Design Logo", author: "Chris", time: "just now", type: "pdf" },
                        { name: "Value Proposit... .pdf", task: "Define project goals", author: "Chris", time: "1 hour ago", type: "pdf" },
                        { name: "Product Design.png", task: "Create sitemap", author: "Chris", time: "Yesterday at 8:04 am", type: "image" },
                      ].map((file, fi) => (
                        <div key={fi} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors duration-300">
                          {/* Preview area */}
                          <div className="relative h-[180px] bg-gray-50 flex items-center justify-center">
                            <Checkbox className="absolute top-3 left-3" />
                            {file.type === "image" ? (
                              <img src="/man.jpg" alt={file.name} className="size-full object-cover" />
                            ) : (
                              <File02 className="size-12 text-gray-300" />
                            )}
                          </div>
                          {/* File info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-dark-blue-400 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{file.task}</p>
                                <p className="text-xs text-gray-400 mt-1">{file.author} · {file.time}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton variant="ghost" visual="gray" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Download</DropdownMenuItem>
                                  <DropdownMenuItem>Rename</DropdownMenuItem>
                                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                    <Trash01 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                      {[
                        { name: "Wireframes_v2.pdf", task: "Design wireframes", author: "Chris", time: "2 days ago", type: "pdf" },
                        { name: "Sprint_Report.pdf", task: "Weekly report", author: "Chris", time: "3 days ago", type: "pdf" },
                        { name: "User_Flow.pdf", task: "Map user flows", author: "Chris", time: "4 days ago", type: "pdf" },
                      ].map((file, fi) => (
                        <div key={`row2-${fi}`} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors duration-300">
                          <div className="relative h-[180px] bg-gray-50 flex items-center justify-center">
                            <Checkbox className="absolute top-3 left-3" />
                            <File02 className="size-12 text-gray-300" />
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-dark-blue-400 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{file.task}</p>
                                <p className="text-xs text-gray-400 mt-1">{file.author} · {file.time}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton variant="ghost" visual="gray" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Download</DropdownMenuItem>
                                  <DropdownMenuItem>Rename</DropdownMenuItem>
                                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                    <Trash01 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="contract">
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg">
                    {/* Project Summary */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Project Summary</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-light text-gray-400">Project Status</span>
                          <span className="px-2 py-0.5 text-xs font-medium text-success-500 bg-success-50 rounded-full">Active</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Project Team</p>
                          <AvatarGroup size="md" max={5} excess excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white !size-11">
                            {sampleMembers.slice(0, 6).map((m, i) => (
                              <Avatar key={i} size="md" className="hover:ring-0 active:ring-0 !size-11">
                                <AvatarImage src={m.avatar} alt={m.name} />
                                <AvatarFallback>{m.name[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Client</p>
                          <Avatar size="md" className="hover:ring-0 active:ring-0 !size-11">
                            <AvatarImage src="/man.jpg" alt="Client" />
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Order Number</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">12345678</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Project Type</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Web App</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-1">Start Date <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Feb 5th, 2025</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-1">End Date <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Sep 4th, 2025</p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-300 rounded-lg p-[15px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]"><span>Project Duration</span> <span className="font-bold text-dark-blue-400">4 months, 6 days</span></p>
                          <p className="text-xs font-medium text-gray-400 leading-[160%] text-right"><span>Remaining</span> <span className="font-bold text-dark-blue-400">1 month, 6 days</span></p>
                        </div>
                        <div className="h-2 bg-gray-300 rounded opacity-80 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded" style={{ width: "75%" }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Scope Summary</p>
                          <button className="text-[10px] font-semibold text-primary-500 capitalize" onClick={() => setActiveTab("scope")}>View Scope</button>
                        </div>
                        <p className="text-sm text-gray-500 leading-6">
                          Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellen metus bibebibe
                          Quisque faucibus ex sapien dolor sit amet. Duis aute irure dolor in reprehenderit in voluptate velit esse cillvelit a
                          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deseru...
                        </p>
                        <button className="text-xs font-semibold text-gray-500">Read More</button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Client Payment */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Client Payment</h2>
                        <span className="px-2 py-0.5 text-xs font-medium text-warning-700 bg-warning-50 rounded-full">Pending</span>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-[26px]">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Payment Type</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Installment Plan - $4,000 per week</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Total Project Value</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$94,000</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-[26px]">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Payments to Date</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$74,000</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Remaining Balance</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$12,000</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Time & Earnings */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Time & Earnings</h2>
                        <Link href="/earnings">
                          <span className="text-[10px] font-semibold text-primary-500 capitalize">View Earnings History</span>
                        </Link>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Your Hours Tracked</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">12h 45m</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-5">Your Earnings to Date</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$45,000</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-0.5">Overtime <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Not allowed</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-0.5">Manual Time <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Not allowed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Footer */}
                    <div className="p-6 flex justify-center">
                      <p className="text-xs text-gray-400 leading-[160%] text-center">
                        This contract is governed by Marketeq's{" "}
                        <span className="text-primary-500 cursor-pointer">Terms of Service</span>,{" "}
                        <span className="text-primary-500 cursor-pointer">Privacy Policy</span>,{" "}
                        <span className="text-primary-500 cursor-pointer">Dispute Policy</span>, and{" "}
                        <span className="text-primary-500 cursor-pointer">Work Protection Guidelines</span>.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity">
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-dark-blue-400">Activity</h2>
                      <IconButton variant="ghost" visual="gray" size="sm">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </div>
                    <div className="relative space-y-0">
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
                  </div>
                </TabsContent>
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

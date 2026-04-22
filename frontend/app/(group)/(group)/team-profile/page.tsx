"use client"

import React, { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  Check,
  Clock,
  Heart,
  MapPin,
  MessageSquare01,
  Share07,
  Star,
} from "@blend-metrics/icons"
import * as RadixTabs from "@radix-ui/react-tabs"
import { motion, AnimatePresence } from "framer-motion"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Progress,
} from "@/components/ui"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const TEAM = {
  id: "v6-group",
  name: "V6 Group",
  tagline: "Full-Stack Product Design & Development Team",
  about:
    "V6 Group is a multidisciplinary product team specializing in end-to-end design and engineering. From early-stage prototyping in Figma to scalable cloud infrastructure on AWS, we deliver cohesive digital products that delight users and drive business outcomes. Our team blends deep technical expertise with a user-centered design philosophy, ensuring every project ships on time and exceeds expectations.",
  rating: 4.9,
  reviewCount: 127,
  completedProjects: 47,
  repeatHireRate: 89,
  location: "San Francisco, CA & Remote",
  rate: "$85-150/hr",
  experience: "8+ years avg experience",
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Figma",
    "AWS",
    "PostgreSQL",
    "Docker",
    "GraphQL",
  ],
  services: [
    "Product Design & UX",
    "Full-Stack Web Development",
    "Cloud Architecture & DevOps",
    "API Design & Integration",
    "Mobile App Development",
    "Technical Consulting",
  ],
  members: [
    { name: "Sarah Chen", role: "Lead Designer", avatar: "/woman.jpg", skills: ["Figma", "UX Research", "Prototyping"] },
    { name: "Marcus Rivera", role: "Senior Frontend Engineer", avatar: "/man.jpg", skills: ["React", "TypeScript", "Next.js"] },
    { name: "Aisha Patel", role: "Backend Engineer", avatar: "/woman.jpg", skills: ["Node.js", "PostgreSQL", "GraphQL"] },
    { name: "James Kim", role: "DevOps Engineer", avatar: "/man.jpg", skills: ["AWS", "Docker", "Terraform"] },
    { name: "Elena Volkov", role: "Product Manager", avatar: "/woman.jpg", skills: ["Agile", "Analytics", "Strategy"] },
    { name: "David Okafor", role: "Full-Stack Developer", avatar: "/man.jpg", skills: ["React", "Node.js", "TypeScript"] },
  ],
  portfolio: [
    { title: "FinTech Dashboard", description: "Real-time analytics platform for portfolio management", image: "/woman.jpg", tags: ["React", "AWS", "GraphQL"] },
    { title: "Healthcare Patient Portal", description: "HIPAA-compliant patient engagement platform", image: "/man.jpg", tags: ["TypeScript", "PostgreSQL", "Docker"] },
    { title: "E-Commerce Redesign", description: "Complete storefront overhaul increasing conversion 34%", image: "/woman.jpg", tags: ["Figma", "Next.js", "Stripe"] },
    { title: "SaaS Onboarding Flow", description: "Guided onboarding reducing time-to-value by 60%", image: "/man.jpg", tags: ["React", "Node.js", "Analytics"] },
  ],
  reviews: [
    { author: "Michael Torres", company: "Acme Corp", rating: 5, text: "V6 Group delivered our platform ahead of schedule. Their attention to detail and proactive communication made the entire process seamless.", date: "Mar 2026" },
    { author: "Linda Park", company: "Healthwise", rating: 5, text: "Exceptional team. They understood our compliance requirements from day one and built a robust, scalable solution.", date: "Feb 2026" },
    { author: "Jason Wright", company: "RetailMax", rating: 5, text: "Our conversion rate jumped 34% after the redesign. The V6 team brought both creative vision and technical excellence.", date: "Jan 2026" },
    { author: "Priya Sharma", company: "NovaTech", rating: 4, text: "Great collaboration throughout. A few timeline bumps on the backend integration, but the final product is solid.", date: "Dec 2025" },
  ],
}

// ---------------------------------------------------------------------------
// Helper: Star Rating
// ---------------------------------------------------------------------------

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75
  const empty = 5 - full - (hasHalf ? 1 : 0)
  return (
    <div className="flex items-center gap-x-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <TbStar key={`f${i}`} className="text-primary-500 fill-primary-500" style={{ width: size, height: size }} />
      ))}
      {hasHalf && <TbStarHalfFilled className="text-primary-500 fill-primary-500" style={{ width: size, height: size }} />}
      {Array.from({ length: empty }).map((_, i) => (
        <TbStar key={`e${i}`} className="text-gray-300" style={{ width: size, height: size }} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function TeamProfilePage() {
  return (
    <Suspense>
      <TeamProfileContent />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function TeamProfileContent() {
  const searchParams = useSearchParams()
  const teamId = searchParams.get("teamId")
  const [activeTab, setActiveTab] = useState("overview")

  const team = TEAM // In production, fetch by teamId

  return (
    <div className="py-[50px]">
      <div className="max-w-[1440px] mx-auto px-[100px]">
        {/* ---------------------------------------------------------------- */}
        {/* Card container */}
        {/* ---------------------------------------------------------------- */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          {/* -------------------------------------------------------------- */}
          {/* Hero Section */}
          {/* -------------------------------------------------------------- */}
          <div className="p-10 flex items-start gap-x-10">
            {/* Team avatar cluster */}
            <div className="shrink-0 flex items-center justify-center size-[200px] rounded-lg bg-gray-50 border border-gray-100">
              <AvatarGroup max={4} size="md" excess excessClassName="border-gray-300 text-gray-500">
                {team.members.map((m, i) => (
                  <Avatar key={i} size="md" className="border-2 border-white hover:ring-0 active:ring-0">
                    <AvatarImage src={m.avatar} alt={m.name} />
                    <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
            </div>

            {/* Info */}
            <div className="flex-auto">
              <div className="flex items-start justify-between">
                <div className="flex-auto">
                  <h1 className="text-[28px] leading-[34px] font-bold text-dark-blue-400">
                    {team.name}
                  </h1>
                  <h2 className="mt-1 text-[22px] leading-[27px] text-dark-blue-400 font-medium">
                    {team.tagline}
                  </h2>

                  <p className="mt-2 text-sm leading-none text-gray-500">
                    {team.experience}
                  </p>

                  <div className="mt-6 flex items-center gap-x-3">
                    <Badge className="bg-primary-500 text-white rounded-[4px]" visual="primary">
                      <Star className="size-3 fill-white" /> {team.rating}
                    </Badge>
                    <span className="text-xs leading-none text-gray-500">
                      {team.reviewCount} reviews
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-x-[9px]">
                      <MapPin className="size-4" />
                      <p className="text-sm leading-none font-medium text-dark-blue-400">
                        {team.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <Clock className="size-4" />
                      <p className="text-sm leading-none font-extralight text-dark-blue-400">
                        Team is currently{" "}
                        <span className="text-success-600 font-medium">available</span>{" "}
                        for hire
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-x-3">
                  <Button size="md">
                    <MessageSquare01 className="size-[15px]" />
                    Contact Team
                  </Button>
                  <Button variant="outlined" visual="gray" size="md">
                    <Heart className="size-[15px]" />
                    Save
                  </Button>
                  <Button variant="outlined" visual="gray" size="md">
                    <Share07 className="size-[15px]" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Skills badges */}
              <div className="flex items-center gap-3 flex-wrap mt-6">
                {team.skills.map((skill) => (
                  <Badge key={skill} className="text-gray-700" visual="gray" size="lg">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Stats Strip */}
          {/* -------------------------------------------------------------- */}
          <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-4 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
            <div className="flex gap-x-2 justify-center items-center">
              <span className="text-sm font-extralight leading-none text-dark-blue-400">Members</span>
              <span className="text-xl font-bold leading-none text-dark-blue-400">{team.members.length}</span>
            </div>
            <div className="flex gap-x-2 justify-center items-center">
              <span className="text-sm font-extralight leading-none text-dark-blue-400">Avg Rating</span>
              <span className="text-xl font-bold leading-none text-dark-blue-400">{team.rating}</span>
            </div>
            <div className="flex gap-x-2 justify-center items-center">
              <span className="text-sm font-extralight leading-none text-dark-blue-400">Completed Projects</span>
              <span className="text-xl font-bold leading-none text-dark-blue-400">{team.completedProjects}</span>
            </div>
            <div className="flex gap-x-2 justify-center items-center">
              <span className="text-sm font-extralight leading-none text-dark-blue-400">Repeat Hire Rate</span>
              <span className="text-xl font-bold leading-none text-dark-blue-400">{team.repeatHireRate}%</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs */}
        {/* ---------------------------------------------------------------- */}
        <RadixTabs.Root className="mt-6" value={activeTab} onValueChange={setActiveTab}>
          <RadixTabs.List className="flex items-center gap-x-1 border-b border-gray-200 pb-0">
            {["overview", "members", "portfolio", "reviews"].map((tab) => (
              <RadixTabs.Trigger
                key={tab}
                value={tab}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium leading-none transition-colors",
                  "text-gray-500 hover:text-dark-blue-400",
                  "data-[state=active]:text-dark-blue-400",
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="team-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </RadixTabs.Trigger>
            ))}
          </RadixTabs.List>

          <AnimatePresence mode="wait">
            {/* ------------------------------------------------------------ */}
            {/* Overview Tab */}
            {/* ------------------------------------------------------------ */}
            <RadixTabs.Content value="overview" asChild>
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6 space-y-8"
              >
                {/* About */}
                <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <h3 className="text-lg font-bold text-dark-blue-400">About</h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">{team.about}</p>
                </div>

                {/* Skills */}
                <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <h3 className="text-lg font-bold text-dark-blue-400">Skills & Technologies</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {team.skills.map((skill) => (
                      <Badge key={skill} className="text-gray-700" visual="gray" size="lg">
                        <Check className="size-3 text-success-600" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <h3 className="text-lg font-bold text-dark-blue-400">Services Offered</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {team.services.map((svc) => (
                      <div key={svc} className="flex items-center gap-x-3">
                        <div className="size-8 rounded-full bg-primary-50 flex items-center justify-center">
                          <Check className="size-4 text-primary-500" />
                        </div>
                        <span className="text-sm font-medium text-dark-blue-400">{svc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate & Availability summary */}
                <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <h3 className="text-lg font-bold text-dark-blue-400">Engagement Details</h3>
                  <div className="mt-4 grid grid-cols-3 gap-6">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Avg Hourly Rate</span>
                      <p className="mt-1 text-xl font-bold text-dark-blue-400">{team.rate}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Team Size</span>
                      <p className="mt-1 text-xl font-bold text-dark-blue-400">{team.members.length} members</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Availability</span>
                      <p className="mt-1 text-xl font-bold text-success-600">Available Now</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </RadixTabs.Content>

            {/* ------------------------------------------------------------ */}
            {/* Members Tab */}
            {/* ------------------------------------------------------------ */}
            <RadixTabs.Content value="members" asChild>
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                <div className="grid grid-cols-3 gap-5">
                  {team.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg bg-white p-6 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] flex flex-col items-center text-center"
                    >
                      <Avatar className="size-20">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h4 className="mt-4 text-base font-bold text-dark-blue-400">{member.name}</h4>
                      <p className="mt-1 text-sm text-gray-500">{member.role}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                        {member.skills.map((skill) => (
                          <Badge key={skill} className="text-gray-600 text-xs" visual="gray" size="md">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </RadixTabs.Content>

            {/* ------------------------------------------------------------ */}
            {/* Portfolio Tab */}
            {/* ------------------------------------------------------------ */}
            <RadixTabs.Content value="portfolio" asChild>
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                <div className="grid grid-cols-2 gap-5">
                  {team.portfolio.map((project, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] group cursor-pointer"
                    >
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        <NextImage
                          src={project.image}
                          alt={project.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-6">
                        <h4 className="text-base font-bold text-dark-blue-400 group-hover:text-primary-500 transition-colors">
                          {project.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {project.tags.map((tag) => (
                            <Badge key={tag} className="text-gray-600 text-xs" visual="gray" size="md">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </RadixTabs.Content>

            {/* ------------------------------------------------------------ */}
            {/* Reviews Tab */}
            {/* ------------------------------------------------------------ */}
            <RadixTabs.Content value="reviews" asChild>
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6 space-y-5"
              >
                {/* Summary bar */}
                <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <div className="flex items-center gap-x-6">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-dark-blue-400">{team.rating}</span>
                      <div className="mt-1">
                        <StarRating rating={team.rating} size={18} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{team.reviewCount} reviews</p>
                    </div>
                    <div className="flex-auto space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count =
                          stars === 5 ? 98 : stars === 4 ? 22 : stars === 3 ? 5 : stars === 2 ? 1 : 1
                        const pct = Math.round((count / team.reviewCount) * 100)
                        return (
                          <div key={stars} className="flex items-center gap-x-3">
                            <span className="text-xs text-gray-500 w-3 text-right">{stars}</span>
                            <TbStar className="size-3.5 text-primary-500 fill-primary-500 shrink-0" />
                            <Progress value={pct} className="flex-auto h-2" />
                            <span className="text-xs text-gray-500 w-8">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual reviews */}
                {team.reviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg bg-white p-6 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-x-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                            {review.author.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-dark-blue-400">{review.author}</p>
                          <p className="text-xs text-gray-500">{review.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="text-xs text-gray-400">{review.date}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-gray-600">{review.text}</p>
                  </div>
                ))}
              </motion.div>
            </RadixTabs.Content>
          </AnimatePresence>
        </RadixTabs.Root>
      </div>
    </div>
  )
}

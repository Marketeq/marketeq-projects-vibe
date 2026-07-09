"use client"

import * as React from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronDown,
  Clock,
  MapPin,
  MessageTextSquare01,
  Plus,
  Share06,
  Star,
  X,
} from "@blend-metrics/icons"

type CheckoutMemberProfile = {
  id: string
  name: string
  handle: string
  title: string
  experience: string
  location: string
  rate: string
  avatarSrc: string
}

const memberProfiles: CheckoutMemberProfile[] = [
  {
    id: "chris-1",
    name: "Chris",
    handle: "@uxdesignmaster",
    title: "Product Manager",
    experience: "10 years of experience",
    location: "New York, United States",
    rate: "$500 - $650/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "parth-1",
    name: "Parth",
    handle: "@topanalyst",
    title: "Business Analyst",
    experience: "3 years of experience",
    location: "Austin, United States",
    rate: "$30 - $60/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "dheeraj-1",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Expert React Developer",
    experience: "10 years of experience",
    location: "Nainital, Uttarakhand, India",
    rate: "$85 - $120/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "abdul-1",
    name: "Abdul",
    handle: "@topfullstack",
    title: "Full Stack Developer",
    experience: "5 years of experience",
    location: "Lahore, Pakistan",
    rate: "$55 - $85/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "waseem-1",
    name: "Waseem",
    handle: "@topbackend",
    title: "Senior Back-End Developer",
    experience: "7 years of experience",
    location: "Bengaluru, India",
    rate: "$80 - $110/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "andrew-1",
    name: "Andrew",
    handle: "@topqa",
    title: "QA Test Engineer",
    experience: "3 years of experience",
    location: "Miami, United States",
    rate: "$95 - $195/hr",
    avatarSrc: "/man.jpg",
  },
  {
    id: "unassigned-1",
    name: "Unassigned Member",
    handle: "@unassigned",
    title: "UX Researcher",
    experience: "3 years of experience",
    location: "United States",
    rate: "$30 - $50/hr",
    avatarSrc: "",
  },
]

const portfolioItems = [
  { src: "/crypto.png", alt: "Blockchain portfolio project" },
  { src: "/google-cloud.png", alt: "Cloud infrastructure portfolio project" },
  { src: "/web3-solutions.png", alt: "Messaging app portfolio project" },
]

const tabs = [
  "Portfolio",
  "Skills",
  "Overview",
  "Offers",
  "Work Experience",
  "Education",
  "Project History",
]

const skills = [
  "Typescript",
  "React.js",
  "Tailwind CSS",
  "Next.js",
  "Redux",
  "+ 17 more...",
]

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default function CheckoutMemberProfilePage() {
  const router = useRouter()
  const params = useParams()
  const slug = safeDecodeSlug(params.slug as string)
  const memberId = params.memberId as string
  const profile =
    memberProfiles.find((member) => member.id === memberId) ||
    memberProfiles[2]

  const returnToCheckout = () => {
    router.push(`/checkout/${encodeURIComponent(slug)}`)
  }

  return (
    <main className="min-h-screen bg-white px-[21px] py-8 font-sans text-dark-blue-400">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold leading-7 text-gray-900">
          Viewing {profile.name}'s profile
        </h1>
        <button
          type="button"
          aria-label="Close profile"
          onClick={returnToCheckout}
          className="inline-flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="size-5" />
        </button>
      </div>

      <section className="mt-[14px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_rgba(16,24,40,0.05)]">
        <div className="box-border flex h-[397px] gap-x-10 px-10 py-[39px]">
          <div className="relative size-[318px] shrink-0 overflow-hidden rounded-full bg-[#8BD4EE]">
            {profile.avatarSrc ? (
              <Image
                src={profile.avatarSrc}
                alt={profile.name}
                fill
                sizes="318px"
                className="object-cover object-center"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[96px] font-semibold text-white">
                {profile.name.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-x-8">
              <div className="min-w-0">
                <div className="flex items-baseline gap-x-2">
                  <h2 className="text-[28px] font-bold leading-none text-dark-blue-400">
                    {profile.name}
                  </h2>
                  <span className="text-[28px] font-light leading-none text-dark-blue-400">
                    {profile.handle}
                  </span>
                </div>
                <p className="mt-2 text-[24px] font-medium leading-none text-dark-blue-400">
                  {profile.title}
                </p>
                <p className="mt-3 text-sm font-medium leading-none text-dark-blue-400">
                  {profile.experience}
                </p>

                <div className="mt-7 flex items-center gap-x-5">
                  <span className="inline-flex h-[29px] items-center gap-x-1 rounded-md bg-primary-50 px-3 text-xs font-medium leading-none text-primary-500">
                    <Star className="size-4 fill-current" />
                    4.5
                  </span>
                  <span className="text-xs font-normal leading-none text-dark-blue-400">
                    24 reviews
                  </span>
                </div>

                <div className="mt-7 space-y-3">
                  <p className="flex items-center gap-x-2 text-sm font-medium leading-none text-dark-blue-400">
                    <MapPin className="size-5 shrink-0" />
                    {profile.location}
                  </p>
                  <p className="flex items-center gap-x-2 text-sm font-light leading-none text-dark-blue-400">
                    <Clock className="size-5 shrink-0" />
                    {profile.name} is{" "}
                    <span className="font-bold text-success-500">
                      available
                    </span>{" "}
                    for hire
                  </p>
                </div>

                <div className="mt-[53px]">
                  <h3 className="text-sm font-semibold leading-none text-dark-blue-400">
                    What I Do
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex h-7 items-center rounded-full bg-gray-100 px-4 text-sm font-medium leading-none text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-x-[11px]">
                <button
                  type="button"
                  className="inline-flex h-10 w-[108px] items-center justify-center gap-x-2 rounded-[5px] bg-primary-500 text-sm font-semibold leading-5 text-white shadow-xs transition-colors hover:bg-primary-600"
                >
                  <Plus className="size-[15px]" />
                  Hire Me
                </button>
                <div className="inline-flex h-10 overflow-hidden rounded-[5px] border border-gray-300 bg-white shadow-xs">
                  <button
                    type="button"
                    className="inline-flex h-10 w-[94px] items-center justify-center gap-x-2 border-r border-gray-300 text-sm font-semibold leading-5 text-gray-800 transition-colors hover:bg-gray-50"
                  >
                    <Star className="size-5 text-gray-300" />
                    Save
                  </button>
                  <button
                    type="button"
                    aria-label="More save options"
                    className="inline-flex h-10 w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Share profile"
                  className="inline-flex h-10 w-11 items-center justify-center rounded-[5px] border border-gray-300 bg-white text-gray-500 shadow-xs transition-colors hover:bg-gray-50"
                >
                  <Share06 className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid h-[50px] grid-cols-[1fr_1.16fr_1.3fr_1.2fr_1fr] items-center border-t border-gray-200 px-8 text-sm leading-none text-dark-blue-400">
          <div className="border-r border-gray-200 px-6">
            <span className="font-light">Rate</span>{" "}
            <span className="text-[21px] font-bold">{profile.rate}</span>
          </div>
          <div className="border-r border-gray-200 px-7">
            <span className="font-light">Client success rating</span>{" "}
            <span className="font-bold">95%</span>
          </div>
          <div className="border-r border-gray-200 px-7">
            <span className="font-light">Total projects completed</span>{" "}
            <span className="font-bold">1450</span>
          </div>
          <div className="border-r border-gray-200 px-7">
            <span className="font-light">Member since</span>{" "}
            <span className="font-bold">September 19, 2024</span>
          </div>
          <div className="px-7">
            <span className="font-light">Repeat hire rate</span>{" "}
            <span className="font-bold">85%</span>
          </div>
        </div>
      </section>

      <nav className="mt-[26px] border-b border-gray-200">
        <div className="flex h-[42px] items-start gap-x-[38px] px-6">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={`h-[42px] text-sm font-semibold leading-none ${
                tab === "Portfolio"
                  ? "border-b-2 border-primary-500 text-primary-500"
                  : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-6 grid grid-cols-[1fr_264px] gap-x-8">
        <div className="grid grid-cols-3 gap-x-6">
          {portfolioItems.map((item) => (
            <article
              key={item.src}
              className="relative h-[206px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="30vw"
                className="object-cover"
              />
            </article>
          ))}
        </div>

        <aside className="h-[150px] rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm font-light leading-none text-dark-blue-400">
            <span className="font-semibold text-gray-900">● Offline</span>{" "}
            3:30 PM local time
          </p>
          <p className="mt-3 text-sm font-light leading-none text-dark-blue-400">
            Average response time <span className="font-bold">1 hour</span>
          </p>
          <button
            type="button"
            className="mt-[22px] inline-flex h-10 w-full items-center justify-center gap-x-2 rounded-[5px] border border-primary-500 bg-white text-sm font-semibold leading-5 text-primary-500 transition-colors hover:bg-primary-50"
          >
            <MessageTextSquare01 className="size-[15px]" />
            Message Me
          </button>
        </aside>
      </div>
    </main>
  )
}

"use client"

import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ChevronRight } from "@blend-metrics/icons"
import { Logo } from "@/components/icons"
import { Pointer } from "@/components/icons/pointer"
import NextLink from "@/components/next-link"
import { Triangles } from "@/components/triangles"
import { Button } from "@/components/ui"

export default function Onboarding() {
  return (
    <AuthenticatedRoute>
      {/* h-dvh (not h-screen) so the shell matches the *visible* viewport on
          mobile browsers too — with h-screen the URL bar leaves the document
          taller than the screen and the banner column scrolls with it. */}
      <div className="h-dvh flex overflow-hidden">
        <div className="relative p-[75px] w-[480px] shrink-0 flex flex-col bg-dark-blue-500">
          <Logo className="h-9 w-[245px] shrink-0" />

          <div className="mt-[94px]">
            <h1 className="text-[45px] leading-none font-bold text-white">
              Connect. Create. Conquer.
            </h1>

            <div className="mt-[30px]">
              <span className="text-white text-[22px] leading-[26.63px]">
                From ideas to execution, find the talent that can make it
                happen.
              </span>
            </div>
          </div>

          <Triangles className="absolute bottom-0 right-0" />

          <div className="relative mt-auto flex flex-col gap-y-5">
            <span className="text-base leading-[19.36px] text-white focus-visible:outline-none">
              Already have an account?
            </span>

            <div className="relative self-start">
              <Button
                className="hover:bg-white hover:text-dark-blue-400 border-white/[.2] text-white hover:border-white"
                size="lg"
                visual="gray"
                variant="outlined"
              >
                Sign In
              </Button>
              <Pointer className="absolute top-[34px] right-0 -rotate-6" />
            </div>
          </div>
        </div>

        {/* The role picker scrolls inside its own column when the viewport is
            too short, so the banner column stays put instead of the whole
            page moving. `m-auto` on the child centers it without making the
            overflowing top edge unreachable, which `items-center` would. */}
        <div className="relative flex flex-auto overflow-y-auto py-[100px] px-[200px]">
          <div className="max-w-[560px] w-full m-auto">
            <h1 className="text-2xl leading-[36px] text-dark-blue-400 font-semibold">
              What brings you here today?
            </h1>

            <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
              Whether you&apos;re here to hire or get hired, let&apos;s get you
              set up the right way.
            </p>

            <div className="mt-[50px] flex flex-col gap-y-6">
              <NextLink
                href="/onboarding/client"
                className="focus-visible:outline-none rounded-lg p-5 border border-gray-200 flex items-center gap-x-5 bg-white hover:border-gray-300 hover:ring-1 hover:ring-gray-300 cursor-pointer transition duration-300"
              >
                <div className="w-[100px] shrink-0 bg-primary-50 rounded-lg self-stretch flex items-center justify-center min-h-[80px]">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Magnifying glass */}
                    <circle cx="27" cy="28" r="13" stroke="#306CFE" strokeWidth="2.5" fill="none" />
                    <line x1="37" y1="37" x2="47" y2="47" stroke="#306CFE" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Person silhouette inside glass */}
                    <circle cx="27" cy="24" r="4.5" fill="#98B6FF" />
                    <path d="M19.5 35c0-4 3.3-5.5 7.5-5.5s7.5 1.5 7.5 5.5" stroke="#98B6FF" strokeWidth="2" strokeLinecap="round" fill="none" />
                    {/* Checkmark badge */}
                    <circle cx="48" cy="15" r="8" fill="#306CFE" />
                    <path d="M44 15l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="flex-auto">
                  <h1 className="text-lg leading-[21.78px] font-semibold text-dark-blue-400">
                    I want to hire
                  </h1>
                  <p className="text-base mt-2 leading-[19.36px] font-light text-dark-blue-400">
                    Discover the right experts ready to deliver what you need.
                  </p>
                </div>

                <button className="focus-visible:outline-none shrink-0 rounded-[5px] size-8 flex items-center justify-center">
                  <ChevronRight className="size-5" />
                </button>
              </NextLink>

              <NextLink
                href="/onboarding/talent"
                className="focus-visible:outline-none rounded-lg p-5 border border-gray-200 flex items-center gap-x-5 bg-white hover:border-gray-300 hover:ring-1 hover:ring-gray-300 cursor-pointer transition duration-300"
              >
                <div className="w-[100px] shrink-0 bg-primary-50 rounded-lg self-stretch flex items-center justify-center min-h-[80px]">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Briefcase */}
                    <rect x="10" y="24" width="30" height="22" rx="3" stroke="#306CFE" strokeWidth="2.5" fill="none" />
                    <path d="M19 24v-4a4 4 0 014-4h6a4 4 0 014 4v4" stroke="#306CFE" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="10" y1="35" x2="40" y2="35" stroke="#C9D9FF" strokeWidth="2" />
                    <rect x="22" y="32" width="6" height="6" rx="1.5" fill="#5687FF" />
                    {/* Upward trend arrow */}
                    <path d="M48 44V22" stroke="#306CFE" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M42 28l6-6 6 6" stroke="#306CFE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Small floating dot accents */}
                    <circle cx="46" cy="14" r="2.5" fill="#98B6FF" />
                    <circle cx="54" cy="18" r="1.5" fill="#C9D9FF" />
                  </svg>
                </div>

                <div className="flex-auto">
                  <h1 className="text-lg leading-[21.78px] font-semibold text-dark-blue-400">
                    I’m looking for work
                  </h1>
                  <p className="text-base mt-2 leading-[19.36px] font-light text-dark-blue-400">
                    Start connecting with clients who need what you have to
                    offer.
                  </p>
                </div>

                <button className="focus-visible:outline-none shrink-0 rounded-[5px] size-8 flex items-center justify-center">
                  <ChevronRight className="size-5" />
                </button>
              </NextLink>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}

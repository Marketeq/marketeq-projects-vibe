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
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="12" width="40" height="32" rx="3" stroke="#7C3AED" strokeWidth="2" fill="#EDE9FE" />
                    <circle cx="22" cy="24" r="5" fill="#C4B5FD" />
                    <rect x="16" y="31" width="12" height="3" rx="1.5" fill="#C4B5FD" />
                    <rect x="32" y="20" width="12" height="2" rx="1" fill="#A78BFA" />
                    <rect x="32" y="25" width="10" height="2" rx="1" fill="#C4B5FD" />
                    <rect x="32" y="30" width="8" height="2" rx="1" fill="#DDD6FE" />
                    <circle cx="42" cy="40" r="8" fill="#7C3AED" />
                    <path d="M42 36v8M38 40h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
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
                <div className="w-[100px] shrink-0 bg-emerald-50 rounded-lg self-stretch flex items-center justify-center min-h-[80px]">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="12" y="8" width="32" height="40" rx="3" stroke="#059669" strokeWidth="2" fill="#ECFDF5" />
                    <circle cx="28" cy="20" r="6" fill="#A7F3D0" />
                    <path d="M18 32c0-4 4.5-6 10-6s10 2 10 6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                    <rect x="20" y="36" width="16" height="2" rx="1" fill="#6EE7B7" />
                    <rect x="22" y="40" width="12" height="2" rx="1" fill="#A7F3D0" />
                    <path d="M40 14l4 4-4 4" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M44 18h-6" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
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

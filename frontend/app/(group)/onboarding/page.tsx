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
      <div className="min-h-screen flex">
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

        <div className="relative flex justify-stretch items-center flex-auto py-[100px] px-[200px]">
          <div className="max-w-[560px] w-full mx-auto">
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
                <div className="w-[100px] shrink-0 bg-gray-200 rounded-lg self-stretch" />

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
                <div className="w-[100px] shrink-0 bg-gray-200 rounded-lg self-stretch" />

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

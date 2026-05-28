"use client"

import React from "react"
import { cn, fromLength } from "@/utils/functions"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
} from "@blend-metrics/icons"
import { SwiperSlide } from "swiper/react"
import { Blocks1 } from "@/components/blocks-1"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  Favorite,
  FavoriteRoot,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

// ── Hero ─────────────────────────────────────────────────────────────────────
// 350px tall, content hugged with 75px padding all around
const Hero = () => {
  return (
    <div className="relative bg-[#313237] h-[350px] overflow-hidden">
      <div className="absolute left-0 inset-y-0 right-0 lg:right-auto lg:w-[53%]">
        <NextImage
          className="object-cover"
          src="/sending-emails.png"
          alt="UX / UI Experts on Demand"
          sizes="50vw"
          fill
        />
      </div>
      <div className="absolute lg:hidden inset-0 bg-[linear-gradient(255.56deg,rgba(49,50,55,1)_19.12%,rgba(49,50,55,0)_127.26%)]" />

      <div className="relative h-full max-w-[1420px] lg:mx-auto flex">
        <div className="ml-auto p-[75px] lg:max-w-[643px]">
          <h1 className="text-[30px] leading-[36.31px] lg:text-4xl lg:leading-[43.57px] font-bold text-white">
            UX / UI Experts on Demand
          </h1>
          <p className="text-sm leading-[16.94px] lg:text-lg mt-[7px] lg:mt-[5px] lg:leading-[21.78px] text-white font-light">
            Get your ux / ui done right with one of our product design experts,
            fully customizable done for you services.
          </p>

          <button className="focus-visible:outline-none whitespace-nowrap shrink-0 mt-[38px] border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
            browse UX / UI experts
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carousel section ─────────────────────────────────────────────────────────
// Mirrors the L1 category page "Recommended in {Category}" Swiper carousel
// (SwiperRoot/SwiperContent/SwiperPrevTrigger/SwiperNextTrigger)
interface CarouselSectionProps {
  title: string
  count?: number
}

const CarouselSection = ({ title, count = 8 }: CarouselSectionProps) => {
  return (
    <div>
      <SwiperRoot>
        <div className="flex justify-between items-center">
          <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
            {title}
          </h1>
          <div className="flex items-center gap-x-3">
            <SwiperPrevTrigger asChild>
              <IconButton
                className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                visual="gray"
                variant="outlined"
              >
                <ChevronLeft className="size-[18px]" />
              </IconButton>
            </SwiperPrevTrigger>
            <SwiperNextTrigger asChild>
              <IconButton
                className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                visual="gray"
                variant="outlined"
              >
                <ChevronRight className="size-[18px]" />
              </IconButton>
            </SwiperNextTrigger>
          </div>
        </div>

        <div className="mt-6">
          <SwiperContent slidesPerView="auto" spaceBetween={20}>
            {fromLength(count).map((key) => (
              <SwiperSlide className="w-[355px]" key={key}>
                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border cursor-pointer border-black/15">
                    <NextImage
                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                      src="/dashboard.png"
                      alt="Project"
                      fill
                      sizes="33vw"
                    />
                  </div>

                  <div className="mt-3 flex items-start gap-x-3">
                    <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">
                      The Ultimate Mobile App Experience
                    </span>
                    <div className="inline-flex items-center gap-x-1">
                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                        4.9 <span className="font-extralight">(5)</span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400 line-clamp-2">
                    Brief description of the project. Lorem ipsum dolor sit
                    amet, consectetur adipiscing elit, sed do eiusmod tempor
                    incididunt.
                  </p>

                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                    <div className="flex items-center gap-x-[6.4px]">
                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        Starting from 12 weeks
                      </span>
                    </div>
                    <div className="flex items-center gap-x-[6.4px]">
                      <Money className="size-[18px] shrink-0 text-primary-500" />
                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        $50,000 budget
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <AvatarGroup
                      max={5}
                      size="sm"
                      excess
                      excessClassName="border-gray-300 text-gray-500"
                    >
                      {fromLength(6).map((k) => (
                        <Avatar
                          key={k}
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroup>

                    <FavoriteRoot>
                      {({ pressed }) => (
                        <TooltipProvider delayDuration={75}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Favorite />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {pressed ? (
                                <span className="inline-flex items-center gap-x-1">
                                  <Check className="size-[15px] shrink-0 text-green-500" />
                                  Saved
                                </span>
                              ) : (
                                "Save to favorites"
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </FavoriteRoot>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </SwiperContent>
        </div>
      </SwiperRoot>
    </div>
  )
}

// ── Recently Viewed grid section ─────────────────────────────────────────────
// Mirrors the storybook "Recently Viewed" compact list pattern from
// stories/similar-projects.stories.tsx (3-col grid, 100px thumb + text)
const RecentlyViewedSection = ({ title }: { title: string }) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] leading-none text-dark-blue-400 font-bold">
          {title}
        </h1>
        <Button variant="link" visual="gray">
          View All
        </Button>
      </div>

      <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
        {fromLength(6).map((key) => (
          <article key={key} className="flex items-start gap-x-6">
            <div className="relative size-[100px] overflow-hidden rounded-lg shrink-0">
              <NextImage
                className="object-cover"
                src="/dashboard.png"
                alt="Dashboard"
                sizes="25vw"
                fill
              />
            </div>

            <div className="pr-[45.54px]">
              <h1 className="cursor-pointer hover:underline transition duration-300 text-base font-bold leading-none line-clamp-2 text-dark-blue-400">
                BI Sales Forecasting & Inventory Management
              </h1>

              <p className="mt-2 text-sm font-light text-dark-blue-400 line-clamp-2">
                Tempor nam commodo sapien lobortis pellentesque non. Elementum
                adipiscing sit senectus faucibus mauris amet. Elementum vitae
                semper lorem ornare congue.
              </p>

              <div className="mt-3 flex items-center gap-x-3">
                <span className="text-sm font-medium leading-none text-dark-blue-400">
                  Starting at $25,000
                </span>
                <span className="inline-block shrink-0 rounded-full size-1 bg-gray-300" />
                <span className="text-sm font-medium leading-none text-dark-blue-400">
                  2 weeks
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ── More Categories section ──────────────────────────────────────────────────
// Reused from the existing home page "Categories" block (originally from the
// nestjs frontend repo). Uses the inline category card variants below.
const CategoryTransparentVerticalCard = () => {
  return (
    <article className="flex rounded-lg overflow-hidden relative p-5 lg:px-[50px] lg:py-[55px] bg-white shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])]">
      <div className="absolute inset-0">
        <NextImage
          className="object-cover"
          src="/working-2.jpeg"
          alt="Working"
          sizes="50vw"
          fill
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,42,75,0.48)_0%,rgba(22,97,246,0.31)_100%),linear-gradient(0deg,rgba(18,42,75,0.71),rgba(18,42,75,0.71))]" />

      <div className="relative mt-auto flex flex-col gap-y-[31px] items-start lg:flex-row lg:items-end lg:justify-between pt-[188px] md:pt-[124px] lg:pt-[135px]">
        <h1 className="text-[22px] leading-none lg:text-[62px] lg:leading-[57.4px] font-bold text-white">
          Interaction Design
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </button>
      </div>
    </article>
  )
}

const CategoryVerticalCard = () => {
  return (
    <article className="relative overflow-hidden flex xs:max-md:flex-col lg:flex-col rounded-lg p-5 lg:pt-[55px] lg:px-[50px] lg:pb-[7.56px] bg-black shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])]">
      <div className="md:max-lg:pb-[124px] flex md:flex-col md:max-lg:gap-y-[31px] lg:flex-row items-center md:items-start xs:max-md:justify-between lg:justify-between">
        <h1 className="text-[22px] leading-none lg:text-[62px] lg:leading-[57.4px] font-bold text-white">
          Blockchain Development
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
          Browse Projects
        </button>
      </div>
      <div className="md:-bottom-[92.44px] xs:max-md:flex xs:max-md:justify-end xs:max-md:mt-[75px] md:-right-8 md:max-lg:absolute lg:mr-[76.8px] self-end">
        <Blocks1 />
      </div>
    </article>
  )
}

const CategoryTransparentCard = ({ className }: { className?: string }) => {
  return (
    <article
      className={cn(
        "relative rounded-lg p-5 lg:p-[30px] overflow-hidden flex items-center bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] border border-[#122A4B]/[.15]",
        className
      )}
    >
      <div className="space-y-5 flex-auto">
        <h1 className="text-lg leading-[21.78px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
          Cloud Security
        </h1>
        <button className="focus-visible:outline-none whitespace-nowrap shrink-0 border-2 h-10 border-primary-500 px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-primary-500">
          Browse Projects
        </button>
      </div>
      <div className="relative shrink-0 xs:max-md:absolute xs:max-md:top-5 xs:max-md:right-[-115.26px]">
        <NextImage
          className="object-contain mx-auto"
          src="/cpu-1.png"
          alt="CPU"
          sizes="25vw"
          width={206.15}
          height={150}
        />
      </div>
    </article>
  )
}

const MoreCategories = () => {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            More Categories
          </h1>
          <p className="text-lg leading-[21.78px] font-light text-gray-500">
            Find more ways to maximize your results with Marketeq‘s curated
            project teams
          </p>
        </div>
        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="mt-8 lg:mt-[42px] grid md:grid-cols-2 gap-3 lg:gap-x-8">
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategoryTransparentVerticalCard />
          <CategoryTransparentCard />
          <CategoryTransparentCard />
        </div>
        <div className="contents md:grid gap-y-3 lg:gap-y-8">
          <CategoryTransparentCard />
          <CategoryTransparentCard />
          <CategoryVerticalCard />
        </div>
      </div>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarketplaceV2() {
  return (
    <div className="bg-gray-25">
      <Hero />
      <div className="py-10 px-3.5 md:px-10 lg:px-[100px] xl:px-[150px] 2xl:px-[250px] overflow-hidden space-y-10 lg:space-y-[80px] lg:py-[80px] max-w-[1620px] mx-auto">
        <CarouselSection title="Our Favorite Projects" />
        <RecentlyViewedSection title="Newest Additions" />
        <RecentlyViewedSection title="Most Popular Projects" />
        <CarouselSection title="Online Sales Funnels" />
        <CarouselSection title="Customer Service Solutions" />
        <CarouselSection title="Marketing Automation Campaigns" />
        <CarouselSection title="Cloud Software Applications" />
        <CarouselSection title="Mobile Applications" />
        <MoreCategories />
      </div>
    </div>
  )
}

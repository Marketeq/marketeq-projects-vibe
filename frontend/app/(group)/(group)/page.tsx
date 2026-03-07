"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { cn } from "@/utils/functions"
import { ChevronLeft, ChevronRight } from "@blend-metrics/icons"
import { Swiper as SwiperRoot, SwiperSlide } from "swiper/react"
import { Swiper } from "swiper/types"
import { Blocks1 } from "@/components/blocks-1"
import NextImage from "@/components/next-image"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  Button,
  Favorite,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const swiperBaseConfig = {
  slidesPerView: 1,
  spaceBetween: 20,
  observer: true,
  observeParents: true,
  resizeObserver: true,
  breakpoints: {
    1200: {
      slidesPerView: 5,
    },
    768: {
      slidesPerView: 3,
    },
  },
}

const Hero = () => {
  return (
    <div className="relative bg-[#313237]">
      <div className="absolute left-0 inset-y-0 right-0 lg:right-auto lg:w-[53%]">
        <NextImage
          className="object-cover"
          src="/sending-emails.png"
          alt="Sending emails"
          sizes="50vw"
          fill
        />
      </div>
      <div className="absolute lg:hidden inset-0 bg-[linear-gradient(255.56deg,rgba(49,50,55,1)_19.12%,rgba(49,50,55,0)_127.26%)]" />

      <div className="relative max-w-[290.41px] md:max-w-[562.83px] lg:max-w-[1420px] lg:mx-auto pt-10 pl-10 pb-[75px] lg:pl-0 lg:pb-[126.25px] lg:pt-[92px]">
        <div className="lg:max-w-[493px] lg:ml-auto">
          <h1 className="text-[30px] leading-[36.31px] lg:text-4xl lg:leading-[43.57px] font-bold text-white">
            UX / UI Experts on Demand
          </h1>
          <p className="text-sm leading-[16.94px] lg:text-lg mt-[7px] lg:mt-[5px] lg:leading-[21.78px] text-white font-light">
            Get your ux / ui done right with one of our ux/ui experts
            customizable done for you campaigns.
          </p>

          <button className="focus-visible:outline-none whitespace-nowrap shrink-0 mt-[46px] lg:mt-[38px] border-2 h-10 border-white px-3.5 rounded-[5px] flex items-center justify-center text-[13px] leading-6 font-semibold text-white">
            browse UX / UI experts
          </button>
        </div>
      </div>
    </div>
  )
}

const useMounted = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}

const ClientOnlySwiper = ({
  children,
  onInit,
}: {
  children: React.ReactNode
  onInit: (swiper: Swiper) => void
}) => {
  const mounted = useMounted()

  if (!mounted) {
    const items = Array.isArray(children)
      ? children
      : React.Children.toArray(children)
    return (
      <div className="overflow-hidden">
        <div className="flex flex-nowrap gap-5">
          {items.map((child, index) => (
            <div key={index} className="w-[280px] shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <SwiperRoot
      {...swiperBaseConfig}
      onInit={onInit}
      className="!overflow-hidden"
    >
      {children}
    </SwiperRoot>
  )
}

const FavoriteProjectCard = () => {
  return (
    <article className="rounded-lg shrink-0 bg-white border border-[#122A4B]/[.15] overflow-hidden shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="h-[140px] border-b border-black/[.15] relative">
        <NextImage
          className="object-cover"
          src="/design-screens.png"
          alt="Design screens"
          sizes="25vw"
          fill
        />
      </div>
      <div className="p-5">
        <h1 className="text-base leading-[19.36px] font-bold text-dark-blue-600 line-clamp-2">
          The Ultimate Mobile App Experience
        </h1>
        <p className="text-sm mt-3 leading-[16.94px] font-light text-gray-500 line-clamp-2">
          A complete funnel for your customer service needs
        </p>

        <div className="flex items-center mt-[9px] gap-x-[16.33px] md:mt-[16.98px] justify-between">
          <span className="text-sm leading-[16.94px] text-dark-blue-600 font-light">
            Starts at $40k, 12 weeks
          </span>

          <Favorite
            starClassName="size-5"
            className="size-5 shrink-0 text-[#122A4B]/[.15]"
          />
        </div>
      </div>
    </article>
  )
}

const FavoriteProjects = () => {
  const [controller, setController] = useState<Swiper>()
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
          Our Favorite Projects
        </h1>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="relative mt-5 lg:mt-[42px]">
        <button
          className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -left-[71px] text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => controller?.slidePrev()}
          disabled={!controller?.allowSlidePrev}
        >
          <ChevronLeft className="size-[55px]" />
        </button>

        <ClientOnlySwiper onInit={setController}>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
        </ClientOnlySwiper>

        <button
          className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -right-[71px] text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => controller?.slideNext()}
          disabled={!controller?.allowSlideNext}
        >
          <ChevronRight className="size-[55px]" />
        </button>
      </div>

      <div className="flex items-center mt-5 justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const NewestAdditionCard = () => {
  return (
    <article className="flex items-start gap-x-[15px] lg:gap-x-[23px]">
      <div className="size-[100px] shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] rounded-[4px] overflow-hidden shrink-0 relative">
        <NextImage
          className="object-cover"
          src="/design-screens.png"
          alt="Design screens"
          sizes="10vw"
          fill
        />
      </div>
      <div className="flex-auto">
        <h1 className="text-sm leading-[16.94px] lg:text-lg lg:leading-[21.78px] font-bold text-dark-blue-600 line-clamp-2">
          SEO Enterprise
        </h1>
        <p className="text-sm leading-[16.94px] font-light text-dark-blue-600 mt-[7.5px] lg:mt-[11px] line-clamp-2">
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque{" "}
        </p>
        <span className="text-sm block mt-[7.5px] lg:mt-[15px] leading-[16.94px] font-light text-dark-blue-600">
          Starts at $40k, 12 weeks
        </span>
      </div>
    </article>
  )
}

const NewestAdditions = () => {
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
          Newest Additions
        </h1>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="mt-[29px] grid md:grid-cols-2 xl:grid-cols-3 gap-[25px] lg:gap-y-10 lg:gap-x-[42px]">
        <NewestAdditionCard />
        <NewestAdditionCard />
        <NewestAdditionCard />
        <NewestAdditionCard />
        <NewestAdditionCard />
        <NewestAdditionCard />
      </div>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const PopularProjectCard = () => {
  return (
    <article className="flex items-start gap-x-[23px]">
      <div className="size-[100px] shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] rounded-[4px] overflow-hidden shrink-0 relative">
        <NextImage
          className="object-cover"
          src="/design-screens.png"
          alt="Design screens"
          sizes="10vw"
          fill
        />
      </div>
      <div className="flex-auto">
        <h1 className="text-lg leading-[21.78px] font-bold text-dark-blue-600 line-clamp-2">
          SEO Enterprise
        </h1>
        <p className="text-sm leading-[16.94px] font-light text-gray-500 mt-[11px] line-clamp-2">
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque{" "}
        </p>
        <span className="text-sm block mt-[15px] leading-[16.94px] font-light text-dark-blue-600">
          Starts at $40k, 12 weeks
        </span>
      </div>
    </article>
  )
}

const PopularProjects = () => {
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
          Most Popular Projects
        </h1>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <Tabs className="mt-[29px]" defaultValue="view-all">
        <TabsList className="px-0 w-full justify-start">
          <TabsTrigger value="view-all">View All</TabsTrigger>
          <TabsTrigger value="top-web-projects">Top Web Projects</TabsTrigger>
          <TabsTrigger value="top-mobile-projects">
            Top Mobile Projects
          </TabsTrigger>
          <TabsTrigger value="top-cloud-projects">
            Top Cloud Projects
          </TabsTrigger>
          <TabsTrigger value="top-digital-marketing-projects">
            Top Digital Marketing Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view-all">
          <div className="pt-[29px] grid md:grid-cols-2 xl:grid-cols-3 gap-[25px] lg:gap-y-10 lg:gap-x-[42px]">
            <PopularProjectCard />
            <PopularProjectCard />
            <PopularProjectCard />
            <PopularProjectCard />
            <PopularProjectCard />
            <PopularProjectCard />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const OnlineSalesFunnels = () => {
  const [controller, setController] = useState<Swiper>()
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            Online Sales Funnels
          </h1>
          <p className="text-sm leading-[16.94px] lg:text-lg lg:leading-[21.78px] font-light text-gray-500">
            Connect Referrizer with your favorite ecommerce shopping carts
          </p>
        </div>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="relative mt-5 lg:mt-[42px]">
        {controller?.allowSlidePrev && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -left-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slidePrev()}
          >
            <ChevronLeft className="size-[55px]" />
          </button>
        )}
        <ClientOnlySwiper onInit={setController}>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
        </ClientOnlySwiper>

        {controller?.allowSlideNext && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -right-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slideNext()}
          >
            <ChevronRight className="size-[55px]" />
          </button>
        )}
      </div>
      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const CustomerServiceSolutions = () => {
  const [controller, setController] = useState<Swiper>()
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            Customer Service Solutions
          </h1>
          <p className="text-sm leading-[16.94px] lg:text-lg lg:leading-[21.78px] font-light text-gray-500">
            Improve support issues and customer satisfaction with these customer
            service projects
          </p>
        </div>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="relative mt-5 lg:mt-[42px]">
        {controller?.allowSlidePrev && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -left-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slidePrev()}
          >
            <ChevronLeft className="size-[55px]" />
          </button>
        )}

        <ClientOnlySwiper onInit={setController}>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
        </ClientOnlySwiper>

        {controller?.allowSlideNext && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -right-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slideNext()}
          >
            <ChevronRight className="size-[55px]" />
          </button>
        )}
      </div>
      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const MarketingAutomationCampaigns = () => {
  const [controller, setController] = useState<Swiper>()
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            Marketing Automation Campaigns
          </h1>
          <p className="text-sm leading-[16.94px] lg:text-lg lg:leading-[21.78px] font-light text-gray-500">
            Automate lead nurturing, follow ups, conversions, and more with
            these marketing automation campaigns
          </p>
        </div>

        <Button className="xs:max-lg:hidden" visual="gray" variant="link">
          View More
        </Button>
      </div>

      <div className="relative mt-5 lg:mt-[42px]">
        {controller?.allowSlidePrev && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -left-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slidePrev()}
          >
            <ChevronLeft className="size-[55px]" />
          </button>
        )}

        <ClientOnlySwiper onInit={setController}>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
          <SwiperSlide>
            <FavoriteProjectCard />
          </SwiperSlide>
        </ClientOnlySwiper>

        {controller?.allowSlideNext && (
          <button
            className="xs:max-lg:hidden focus-visible:outline-none absolute inset-y-0 my-auto -right-[71px] text-gray-300 hover:text-gray-500"
            onClick={() => controller?.slideNext()}
          >
            <ChevronRight className="size-[55px]" />
          </button>
        )}
      </div>
      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

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

const Categories = () => {
  return (
    <div className="max-w-[1420px] mx-auto">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600">
            Most Popular Projects
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

export default function Marketplace() {
  const { user } = useAuth()
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  useEffect(() => {
    const safeUser = user as {
      provider?: string
      hasPassword?: boolean
    }

    const needsPasswordSetup =
      safeUser?.provider === "EMAIL" && !safeUser?.hasPassword

    if (safeUser && needsPasswordSetup) {
      setShowSecurityModal(true)
    }
  }, [user])

  return (
    <>
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <SecuritySettingsStepper
            onCloseModal={() => setShowSecurityModal(false)}
          />
        </div>
      )}

      <div className="bg-gray-25">
        <Hero />
        <div className="py-10 px-3.5 md:px-10 lg:px-[100px] xl:px-[150px] 2xl:px-[250px] overflow-hidden space-y-10 lg:space-y-[100px] lg:py-[100px]">
          <FavoriteProjects />
          <NewestAdditions />
          <PopularProjects />
          <OnlineSalesFunnels />
          <CustomerServiceSolutions />
          <MarketingAutomationCampaigns />
          <Categories />
        </div>
      </div>
    </>
  )
}

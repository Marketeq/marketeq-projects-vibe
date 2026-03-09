"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { cn } from "@/utils/functions"
import { ChevronLeft, ChevronRight, Clock, Star } from "@blend-metrics/icons"
import { Swiper as SwiperRoot, SwiperSlide } from "swiper/react"
import { Swiper } from "swiper/types"
import { Blocks1 } from "@/components/blocks-1"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  Favorite,
  FavoriteRoot,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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

interface MockProject {
  title: string
  rating: number
  reviewCount: number
  summary: string
  timeline: string
  budget: string
  image: string
  href: string
}

const mockProjects: MockProject[] = [
  {
    title: "The Ultimate Mobile App Experience",
    rating: 4.9,
    reviewCount: 128,
    summary: "A complete funnel for your customer service needs. Designed to convert visitors into loyal customers with proven UX patterns.",
    timeline: "12 weeks",
    budget: "40,000",
    image: "/design-screens.png",
    href: "/c/design",
  },
  {
    title: "Enterprise SEO & Content Strategy",
    rating: 4.8,
    reviewCount: 94,
    summary: "Dominate search rankings with a full-stack SEO strategy backed by data-driven content and technical optimization.",
    timeline: "8 weeks",
    budget: "25,000",
    image: "/dashboard.png",
    href: "/c/digital-marketing",
  },
  {
    title: "Cloud Infrastructure & DevOps Setup",
    rating: 4.7,
    reviewCount: 61,
    summary: "Scalable, secure cloud architecture with CI/CD pipelines, monitoring, and automated deployments.",
    timeline: "6 weeks",
    budget: "30,000",
    image: "/sending-emails.png",
    href: "/c/development",
  },
  {
    title: "E-Commerce Platform Redesign",
    rating: 4.9,
    reviewCount: 203,
    summary: "A conversion-focused redesign of your online store with streamlined checkout and mobile-first design.",
    timeline: "10 weeks",
    budget: "55,000",
    image: "/working-2.jpeg",
    href: "/c/design",
  },
  {
    title: "Marketing Automation Campaign Suite",
    rating: 4.6,
    reviewCount: 77,
    summary: "Automate lead nurturing, follow-ups, and conversions with a fully integrated marketing automation workflow.",
    timeline: "4 weeks",
    budget: "18,000",
    image: "/design-screens.png",
    href: "/c/digital-marketing",
  },
  {
    title: "Cybersecurity Audit & Hardening",
    rating: 4.8,
    reviewCount: 45,
    summary: "Comprehensive security audit, penetration testing, and infrastructure hardening to protect your business.",
    timeline: "3 weeks",
    budget: "15,000",
    image: "/dashboard.png",
    href: "/c/security",
  },
  {
    title: "Custom CRM Integration",
    rating: 4.7,
    reviewCount: 88,
    summary: "Seamless CRM integration with your existing tools — automate workflows, sync data, and close more deals.",
    timeline: "5 weeks",
    budget: "22,000",
    image: "/sending-emails.png",
    href: "/c/development",
  },
]

const ProjectCard = ({ project }: { project: MockProject }) => {
  return (
    <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] flex flex-col">
      {/* Image */}
      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
        <NextImage
          className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
          src={project.image}
          alt={project.title}
          fill
          sizes="25vw"
        />
      </div>

      {/* Title and Rating */}
      <div className="mt-3 flex items-start gap-x-3">
        <NextLink
          href={project.href}
          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
        >
          {project.title}
        </NextLink>
        <div className="inline-flex shrink-0 items-center gap-x-1">
          <Star className="size-[15px] text-primary-500 fill-primary-500" />
          <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
            {project.rating}{" "}
            <span className="font-extralight">({project.reviewCount})</span>
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-[1.4] font-extralight text-dark-blue-400 line-clamp-3">
        {project.summary}
      </p>

      {/* Timeline and Budget */}
      <div className="mt-[14.5px] flex flex-col gap-y-3">
        <div className="flex items-center gap-x-[6.4px]">
          <Clock className="size-[18px] shrink-0 text-primary-500" />
          <span className="font-medium text-sm leading-none text-dark-blue-400">
            Starting from {project.timeline}
          </span>
        </div>
        <div className="flex items-center gap-x-[6.4px]">
          <Money className="size-[18px] shrink-0 text-primary-500" />
          <span className="font-medium text-sm leading-none text-dark-blue-400">
            ${project.budget} budget
          </span>
        </div>
      </div>

      {/* Bottom: Avatars + Favorite */}
      <div className="mt-auto pt-5 flex items-end justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AvatarGroup
                max={5}
                size="sm"
                excess
                excessClassName="border-gray-300 text-gray-500"
              >
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Avatar
                      key={i}
                      size="sm"
                      className="border-2 border-white hover:ring-0 active:ring-0"
                    >
                      <AvatarImage src="/woman.jpg" alt="Team member" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  ))}
              </AvatarGroup>
            </TooltipTrigger>
            <TooltipContent>Team members</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <FavoriteRoot>
          {() => (
            <Favorite
              starClassName="size-5"
              className="size-5 shrink-0 text-[#122A4B]/[.15]"
            />
          )}
        </FavoriteRoot>
      </div>
    </article>
  )
}

const FavoriteProjectCard = ({ project }: { project: MockProject }) => (
  <ProjectCard project={project} />
)

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
          {mockProjects.map((project, i) => (
            <SwiperSlide key={i}>
              <FavoriteProjectCard project={project} />
            </SwiperSlide>
          ))}
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

const NewestAdditionCard = ({ project }: { project: MockProject }) => (
  <ProjectCard project={project} />
)

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
        {mockProjects.slice(0, 6).map((project, i) => (
          <NewestAdditionCard key={i} project={project} />
        ))}
      </div>

      <div className="flex items-center mt-[29px] justify-center lg:hidden">
        <Button visual="gray" variant="ghost">
          View More
        </Button>
      </div>
    </div>
  )
}

const PopularProjectCard = ({ project }: { project: MockProject }) => (
  <ProjectCard project={project} />
)

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
            {mockProjects.slice(0, 6).map((project, i) => (
              <PopularProjectCard key={i} project={project} />
            ))}
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
          {mockProjects.map((project, i) => (
            <SwiperSlide key={i}>
              <FavoriteProjectCard project={project} />
            </SwiperSlide>
          ))}
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
          {mockProjects.map((project, i) => (
            <SwiperSlide key={i}>
              <FavoriteProjectCard project={project} />
            </SwiperSlide>
          ))}
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
          {mockProjects.map((project, i) => (
            <SwiperSlide key={i}>
              <FavoriteProjectCard project={project} />
            </SwiperSlide>
          ))}
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

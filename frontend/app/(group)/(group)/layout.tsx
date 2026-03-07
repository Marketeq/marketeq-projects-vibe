"use client"

import React, { useState } from "react"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  ArrowRight,
  ArrowUp,
  BarChart2,
  Bell,
  ChevronDown,
  ChevronRight,
  CoinStack,
  LifeBuoy,
  LogOut,
  Monitor,
  Plus,
  Repeat,
  SearchMd,
  Settings,
  Star,
  Users,
  X,
} from "@blend-metrics/icons"
import {
  FacebookSolid,
  InstagramSolid,
  TwitterSolid,
} from "@blend-metrics/icons/social-solid"
import {
  Campaigns,
  LinkedinSolid,
  Logo3,
  Project,
  Talent,
} from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  IconButton,
  ScrollArea,
} from "@/components/ui"
import { DropdownMenuCheckItem, ScrollBar } from "@/components/ui"

const Footer = () => {
  return (
    <footer className="bg-white px-5 md:px-10 lg:px-[100px] pt-10 lg:pt-[50px] xl:px-[150px] 2xl:px-[250px]">
      <div className="flex gap-y-10 md:gap-y-20 lg:gap-x-[100px] lg:flex-row flex-col lg:items-start">
        <div className="flex-auto grid grid-cols-2 gap-y-10 md:flex items-start md:justify-between">
          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-y-[15px]">
            <span className="inline-block text-sm leading-[16.94px] font-medium text-dark-blue-600">
              About
            </span>
            <ul className="space-y-[15px]">
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Why Marketeq?
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Careers
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Partnerships
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Support
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Core Values
                </NextLink>
              </li>
              <li>
                <NextLink
                  href="#"
                  className="focus-visible:outline-none text-[13px] leading-[15.73px] font-light text-dark-blue-600 hover:underline"
                >
                  Events
                </NextLink>
              </li>
            </ul>
          </div>
        </div>

        <Button className="md:hidden self-start" variant="link" visual="gray">
          <ArrowUp className="size-[15px]" />
          Back to top
        </Button>

        <div className="max-w-[363px] w-full lg:ml-auto">
          <h1 className="text-base leading-[19.36px] font-medium text-dark-blue-400">
            Marketeq Talent Network
          </h1>

          <p className="mt-3 text-[13px] font-light leading-[15.73px] whitespace-pre-line text-gray-700">
            Want the freedom of working from home without competing with
            overseas rates? Join our national talent network and get a chance to
            work on exciting projects from top corporations and disruptive
            startups.
          </p>

          <Button
            className="mt-[30px] text-primary-500 hover:bg-primary-50 border-primary-500"
            variant="outlined"
            visual="gray"
          >
            Join the talent network
            <ArrowRight className="size-[15px]" />
          </Button>
        </div>
      </div>

      <div className="flex lg:flex-row flex-col gap-y-10 items-center justify-between mt-10 lg:mt-[50px] py-10 md:py-5 border-t border-gray-200">
        <div className="flex items-center md:flex-row flex-col gap-y-5 md:gap-x-[57px]">
          <Logo3 className="w-[120px] shrink-0 h-[17.62px]" />
          <span className="inline-block text-[13px] leading-[15.73px] font-light text-dark-blue-600">
            © 2011 - 2024 Marketeq Digital Inc. All Rights Reserved.
          </span>
        </div>

        <div className="flex md:flex-row flex-col items-center gap-10 lg:gap-x-[50px]">
          <div className="flex gap-x-5 items-center">
            <Button className="text-dark-blue-400" variant="link">
              Terms & Conditions
            </Button>

            <span className="inline-block bg-gray-200 h-4 w-px shrink-0" />

            <Button className="text-dark-blue-400" variant="link">
              Privacy Policy
            </Button>
          </div>

          <div className="flex items-center gap-x-[16.6px]">
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <FacebookSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <TwitterSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <InstagramSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[30px] rounded-full"
            >
              <LinkedinSolid className="size-3.5 text-dark-blue-400" />
            </IconButton>
          </div>
        </div>
      </div>
    </footer>
  )
}

const Sidebar = () => {
  const [isOpen, toggleIsOpen] = useState(false)
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-x-0.5 text-[11px] leading-6 lg:text-[13px] lg:leading-6 text-dark-blue-400"
          variant="link"
          visual="gray"
        >
          10 team members
          <ChevronRight className="size-3 lg:size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        variant="unanimated"
        className="py-[68px] px-0 bg-[#F9FAFB] rounded-none data-[state=open]:duration-300 data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2 left-0 inset-y-0 w-[241px]"
      >
        <div className="h-12 absolute top-0 border-b border-gray-200 inset-x-0 flex items-center bg-white justify-between pl-3.5 p-1">
          <span className="text-base leading-[19.36px] font-semibold text-dark-blue-400">
            Choose a Category
          </span>
          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray">
              <X className="size-[18px]" />
            </IconButton>
          </DialogClose>
        </div>
        <ScrollArea
          className="h-full"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="p-3 flex flex-col gap-y-1">
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
            <NextLink
              href="#"
              className="h-9 p-3 flex items-center focus-visible:outline-none justify-between text-[13px] leading-[13.3px] font-medium text-gray-500 hover:bg-gray-100 hover:text-[#101828]"
            >
              Web Design <ChevronRight className="size-4" />
            </NextLink>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function MarketPlaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* <AuthenticatedRoute> */}
        <div className="px-3.5 md:px-6 lg:px-[50px] bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] xs:max-md:hidden">
          <div className="pt-0.5 pb-3.5 lg:py-3 flex items-end gap-x-6 lg:justify-between lg:gap-x-[30px] ">
            <div className="flex flex-col">
              <span className="inline-block text-[10px] leading-[12.1px] lg:text-xs lg:leading-[16.34px] text-dark-blue-400">
                You currently have
              </span>

              <Sidebar />
            </div>

            <div className="flex items-center gap-x-6 lg:gap-x-[54.17px] lg:ml-[26.5px]">
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Research
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Design
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Development
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Testing
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Security
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Maintenance
              </Button>
              <Button
                className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                Digital Marketing
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100 lg:hidden"
                    variant="link"
                    visual="gray"
                  >
                    More <ChevronDown className="size-[15px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ScrollArea
                    viewportClassName="max-h-[250px]"
                    scrollBar={<ScrollBar className="w-4 p-1" />}
                  >
                    <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
                    <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-x-[18px] ml-auto xs:max-lg:hidden">
              <Button
                className="text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                My Favorites
              </Button>
              <span className="inline-block h-4 w-px shrink-0 bg-gray-300" />
              <Button
                className="text-[13px] leading-6 opacity-60 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                My Dashboard
              </Button>
            </div>
          </div>
        </div>

        {children}
        <Footer />
      {/* </AuthenticatedRoute> */}
    </>
  )
}

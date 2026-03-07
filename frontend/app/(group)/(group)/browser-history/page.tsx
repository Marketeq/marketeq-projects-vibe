"use client"

import { useState } from "react"
import { getFirstItem } from "@/utils/functions"
import { Plus, SearchMd } from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import NextImage from "@/components/next-image"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import { TalentSearchCard } from "@/components/talent-search-card"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
import {
  Button,
  Favorite,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

const SearchCard = () => {
  return (
    <article className="relative rounded-[8px] border bg-white border-gray-[#122A4B]/[.15] overflow-hidden shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
      <div className="relative h-[171px] lg:h-[140px]">
        <NextImage
          className="object-cover"
          src="/ux.jpeg"
          alt="UX"
          fill
          sizes="25vw"
        />
      </div>

      <div className="p-3 lg:p-5">
        <h1 className="text-[13px] leading-[15.73px] lg:text-base lg:leading-[18.75px] font-bold text-dark-blue-400">
          The Ultimate Mobile App Experience
        </h1>

        <p className="text-[11px] leading-[13.31px] lg:leading-5 lg:text-sm mt-1 lg:mt-3 font-light text-[#667085]">
          A complete funnel system for your customer service needs
        </p>

        <div className="flex items-center justify-between mt-3 lg:mt-[19px]">
          <p className="text-[13.31px] leading-[13.31px] lg:text-sm font-light text-[#667085]">
            Starts at $40k, 12 weeks
          </p>

          <Favorite
            className="xs:max-lg:absolute xs:max-lg:top-2.5 xs:max-lg:right-[15.5px] text-[#122A4B]/[.15] size-6"
            starClassName="size-6 fill-transparent group-data-[state=on]:fill-inherit "
          />
        </div>
      </div>
    </article>
  )
}

export default function BrowserHistory() {
  const [value, setValue] = useState([GRID_LAYOUT])
  return (
    <div className="p-3.5 md:p-6 lg:py-[100px] lg:px-[200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400">
          Your Browsing History
        </h1>

        <div className="flex items-center gap-x-1.5 lg:gap-x-6 self-start min-[1024px]:hidden">
          <button className="focus-visible:outline-none">
            <SortAs className="size-5 lg:size-6 text-gray-500" />
          </button>

          <ToggleGroupRoot
            value={value}
            onValueChange={(details) => setValue(details.value)}
          >
            <ToggleGroupItem className="size-[30px]" value={GRID_LAYOUT}>
              <Grid className="size-5 lg:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem className="size-[30px]" value={LIST_LAYOUT}>
              <List className="size-5 lg:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>
      </div>

      <Tabs className="mt-6 lg:mt-[19px]" defaultValue="Show all">
        <div className="border-b lg:h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3">
            <Button
              className="text-gray-500"
              variant="ghost"
              visual="gray"
              size="md"
            >
              <SearchMd className="size-[18px]" />
            </Button>

            <TabsList className="flex justify-start border-b-0 px-0 xs:max-lg:pt-2">
              <TabsTrigger
                className="xs:max-[1024px]:text-xs xs:max-[1024px]:leading-5"
                value="Show all"
              >
                Show all
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-[1024px]:text-xs xs:max-[1024px]:leading-5"
                value="Recent Projects"
              >
                Recent Projects
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-[1024px]:text-xs xs:max-[1024px]:leading-5"
                value="Recent Talent"
              >
                Recent Talent
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-x-6 self-start xs:max-[1024px]:hidden">
            <button className="focus-visible:outline-none">
              <SortAs className="size-6 text-gray-500" />
            </button>

            <ToggleGroupRoot
              value={value}
              onValueChange={(details) => setValue(details.value)}
            >
              <ToggleGroupItem value={GRID_LAYOUT}>
                <Grid className="size-6" />
              </ToggleGroupItem>
              <ToggleGroupItem value={LIST_LAYOUT}>
                <List className="size-6" />
              </ToggleGroupItem>
            </ToggleGroupRoot>
          </div>
        </div>

        <TabsContent value="Show all">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 min-[1024px]:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 min-[1024px]:gap-6 pt-3.5 min-[1024px]:pt-6">
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <TalentSearchCard />
                <SearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <SearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <SearchCard />
                <TalentSearchCard />
                <SearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <SearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-xl:hidden">
                <TalentSearchCard />
                <SearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-2xl:hidden">
                <TalentSearchCard />
                <SearchCard />
                <TalentSearchCard />
              </div>
            </div>
          ) : (
            <div className="grid gap-y-3 min-[1024px]:gap-y-6 pt-3.5 lg:pt-6">
              <TalentSearchCardLandscape />
              <SearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <SearchCardLandscape />
              <TalentSearchCardLandscape />
              <SearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
            </div>
          )}
        </TabsContent>
        <TabsContent value="Recent Projects">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 min-[1024px]:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 min-[1024px]:gap-6 pt-3.5 min-[1024px]:pt-6">
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-xl:hidden">
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-2xl:hidden">
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
            </div>
          ) : (
            <div className="grid gap-y-3 min-[1024px]:gap-y-6 pt-3.5 lg:pt-6">
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
              <SearchCardLandscape />
            </div>
          )}
        </TabsContent>

        <TabsContent value="Recent Talent">
          {getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 min-[1024px]:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 min-[1024px]:gap-6 pt-3.5 min-[1024px]:pt-6">
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-[1024px]:hidden">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-xl:hidden">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
              <div className="grid content-start items-start gap-y-3 min-[1024px]:gap-y-6 xs:max-2xl:hidden">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
            </div>
          ) : (
            <div className="grid gap-y-3 min-[1024px]:gap-y-6 pt-3.5 lg:pt-6">
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
              <TalentSearchCardLandscape />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

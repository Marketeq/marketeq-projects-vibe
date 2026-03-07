"use client"

import React, { useEffect, useState } from "react"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty, keys } from "@/utils/functions"
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Plus,
  Sliders02,
  Sliders04,
  Star,
  Tag,
  Users,
  X,
  X2,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import { Keys } from "@/types/core"
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Logo4 } from "@/components/icons/logo-4"
import { SearchCard } from "@/components/search-card"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxPrimitive,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  Label,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  inputVariants,
} from "@/components/ui"
import { Sidebar } from "./sidebar"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

export default function Search() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [isOpen, toggleIsOpen] = useToggle(false)
  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent
          variant="unanimated"
          className="py-[68px] px-0 bg-[#F9FAFB] rounded-none data-[state=open]:duration-150 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 right-0 inset-y-0 w-full md:w-[375px]"
        >
          <div className="h-12 absolute top-0 border-b border-gray-200 inset-x-0 flex items-center bg-white justify-between pl-3.5 p-1">
            <span className="text-xs leading-5 font-semibold text-dark-blue-400">
              Filters
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
            <Sidebar className="block w-full px-5" />
          </ScrollArea>
          <div className="h-12 absolute border-t border-gray-200 bg-white bottom-0 inset-x-0 flex items-center justify-between pl-3.5 p-1">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Clear Filters
            </Button>

            <Button variant="outlined" visual="gray">
              Show 42 results
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-10 lg:py-5 flex items-center md:flex-row gap-y-10 flex-col justify-between lg:px-[250px] bg-dark-blue-800">
        <div className="flex xs:max-md:items-center lg:items-center lg:flex-row flex-col lg:gap-y-5 lg:gap-x-[37px]">
          <Logo4 className="shrink-0 xs:max-lg:w-[262.31px]" />

          <div className="flex flex-col">
            <h1 className="text-[22px] leading-[26.63px] font-bold text-white md:text-left text-center">
              Your team. on the same page.
            </h1>
            <p className="text-base leading-[19.36px] font-light text-white md:text-left text-center">
              Machine learning makes it possible like never before!
            </p>
          </div>
        </div>

        <Button className="bg-white hover:text-white text-dark-blue-400">
          Learn More
          <ChevronRight className="size-[15px]" />
        </Button>
      </div>

      <div className="lg:p-[50px] lg:flex gap-x-[50px]">
        <Sidebar />

        <div className="flex-auto">
          <div className="hidden lg:inline-flex items-center gap-x-3">
            <h1 className="text-base leading-[19.36px] font-light text-dark-blue-400">
              <span className="font-bold">147</span> Results for{" "}
              <span className="font-bold">“Swift Development”</span>
            </h1>

            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Clear Filters
            </Button>
          </div>

          <div className="contents lg:flex items-center mt-3 justify-between">
            <div className="flex overflow-x-auto scrollbar-none xs:max-lg:border-b border-gray-200 items-center gap-x-6 lg:gap-x-3 xs:max-lg:p-2 xs:max-lg:bg-white xs:max-lg:shadow-[0px_0.83px_3.33px_0px_theme(colors.black/0.03)]">
              <div className="flex shrink-0 items-center lg:hidden gap-x-3">
                <Button
                  className="xs:max-lg:text-xs xs:max-lg:leading-[16.67px] xs:max-lg:h-[34px] xs:max-lg:px-3"
                  variant="outlined"
                  visual="gray"
                  onClick={toggleIsOpen}
                >
                  <Sliders04 className="size-[12.5px]" />
                  Filter
                </Button>

                <Button
                  className="opacity-50 hover:opacity-100 xs:max-lg:text-[11px] xs:max-lg:leading-6"
                  variant="link"
                  visual="gray"
                >
                  Clear Filters
                </Button>
              </div>
              <ToggleGroup.Root
                defaultValue={["featured"]}
                className="flex items-center shrink-0 gap-x-2 lg:contents"
              >
                <ToggleGroup.Item value="featured" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Featured
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="best-match" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Best Match
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="top-rated" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Top Rated
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="most-recent" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    <ArrowUp className="group-data-[focus]:inline-block group-data-[state=on]:inline-block hidden size-[15px] text-gray-500" />
                    Most Recent
                  </Button>
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>

            <div className="lg:contents mt-5 md:mt-6 xs:max-md:px-5 md:max-lg:px-6 flex justify-between items-end">
              <h1 className="text-xs leading-[19.36px] lg:hidden font-light text-dark-blue-400">
                <span className="font-semibold">147</span> Results for{" "}
                <span className="font-semibold">“Swift Development”</span>
              </h1>

              <div className="flex items-center gap-x-6 lg:p-[11.5px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus-visible:outline-none">
                      <SortAs className="size-6 text-gray-500" />
                    </button>
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

                <ToggleGroupRoot
                  value={value}
                  onValueChange={(details) => setValue(details.value)}
                >
                  <ToggleGroupItem value={GRID_LAYOUT}>
                    <Grid className="size-4 lg:size-6" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={LIST_LAYOUT}>
                    <List className="size-4 lg:size-6" />
                  </ToggleGroupItem>
                </ToggleGroupRoot>
              </div>
            </div>
          </div>

          <div className="mt-3 lg:mt-5 xs:max-md:px-5 md:max-lg:px-6 pt-3 lg:pt-5 border-t border-gray-200">
            <div className="flex md:flex-row flex-col gap-y-5 items-start md:items-center justify-between">
              <div className="flex gap-y-1 md:flex-row flex-col md:items-center gap-x-3">
                <span className="inline-block text-xs lg:text-sm text-gray-500 leading-[14.52px] lg:leading-[16.94px] font-medium">
                  Skills related to this category
                </span>

                <div className="inline-flex items-center gap-x-2 flex-wrap lg:gap-x-1">
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    Graphic Design,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    UX Prototyping,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    Adobe Illustrator,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    UX Research
                  </Button>
                </div>
              </div>

              <Button
                className="xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:gap-x-2"
                variant="link"
              >
                <ArrowLeft className="size-[15px]" />
                Back to Categories
              </Button>
            </div>
          </div>

          <div className="mt-5 xs:max-md:pb-5 md:max-lg:pb-6 lg:mt-8 xs:max-md:px-3.5 md:max-lg:px-6">
            {getFirstItem(value) === GRID_LAYOUT ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-[15px] lg:gap-5">
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
                <SearchCard />
              </div>
            ) : (
              <div className="grid gap-y-[15px] lg:gap-y-5">
                <SearchCardLandscape />
                <SearchCardLandscape />
                <SearchCardLandscape />
                <SearchCardLandscape />
                <SearchCardLandscape />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { SVGProps } from "react"
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
} from "@blend-metrics/icons"
import * as RadixTabs from "@radix-ui/react-tabs"
import { Meta } from "@storybook/react"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Favorite,
  FavoriteRoot,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Similar Projects",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Default = () => {
  return (
    <div>
      <div className="p-[100px] bg-gray-50">
        <div className="max-w-[1240px] mx-auto">
          <Carousel>
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                    Similar Projects
                  </h1>

                  <p className="text-lg font-light text-dark-blue-400 leading-none">
                    Users who have viewed this project have also expressed
                    interest in these as well
                  </p>
                </div>

                <div className="flex items-center gap-x-8">
                  <Button
                    className="underline"
                    size="lg"
                    visual="gray"
                    variant="link"
                  >
                    View More
                  </Button>

                  <div className="flex gap-x-3">
                    <CarouselPrevious className="static border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -translate-y-0" />
                    <CarouselNext className="static border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -translate-y-0" />
                  </div>
                </div>
              </div>

              <CarouselContent className="-ml-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <CarouselItem className="basis-1/3" key={index}>
                    <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group">
                        <NextImage
                          className="object-cover group-hover:scale-105 transition duration-300"
                          src="/dashboard.png"
                          alt="Dashboard"
                          fill
                          sizes="33vw"
                        />
                      </div>

                      <div className="mt-3 flex items-start gap-x-3">
                        <NextLink
                          href="#"
                          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                        >
                          The Ultimate Mobile App Experience
                        </NextLink>

                        <div className="inline-flex items-center gap-x-1">
                          <Star className="size-[15px] text-primary-500 fill-primary-500" />
                          <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                            4.9 <span className="font-extralight">(5)</span>
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                        Brief Description of the project. Lorem ipsum dolor sit
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AvatarGroup
                                max={5}
                                size="sm"
                                excess
                                excessClassName="border-gray-300 text-gray-500"
                              >
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                              </AvatarGroup>
                            </TooltipTrigger>

                            <TooltipContent
                              className="p-0 max-w-[262px]"
                              size="md"
                            >
                              <ScrollArea
                                className="h-[192px] p-3"
                                scrollBar={
                                  <ScrollBar
                                    className="w-4 p-1"
                                    thumbClassName="bg-white/20"
                                  />
                                }
                              >
                                <div className="space-y-3 pr-5">
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </ScrollArea>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

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
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>
          </Carousel>

          <Carousel>
            <div className="space-y-6 mt-8">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                    Recommended Projects
                  </h1>

                  <p className="text-lg font-light text-dark-blue-400 leading-none">
                    These projects are recommended based on your recent searches
                    and browsing history
                  </p>
                </div>

                <div className="flex items-center gap-x-8">
                  <Button
                    className="underline"
                    size="lg"
                    visual="gray"
                    variant="link"
                  >
                    View More
                  </Button>

                  <div className="flex gap-x-3">
                    <CarouselPrevious className="static border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -translate-y-0" />
                    <CarouselNext className="static border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -translate-y-0" />
                  </div>
                </div>
              </div>

              <CarouselContent className="-ml-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <CarouselItem className="basis-1/3" key={index}>
                    <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group">
                        <NextImage
                          className="object-cover group-hover:scale-105 transition duration-300"
                          src="/dashboard.png"
                          alt="Dashboard"
                          fill
                          sizes="33vw"
                        />
                      </div>

                      <div className="mt-3 flex items-start gap-x-3">
                        <NextLink
                          href="#"
                          className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                        >
                          The Ultimate Mobile App Experience
                        </NextLink>

                        <div className="inline-flex items-center gap-x-1">
                          <Star className="size-[15px] text-primary-500 fill-primary-500" />
                          <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                            4.9 <span className="font-extralight">(5)</span>
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                        Brief Description of the project. Lorem ipsum dolor sit
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AvatarGroup
                                max={5}
                                size="sm"
                                excess
                                excessClassName="border-gray-300 text-gray-500"
                              >
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="sm"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                              </AvatarGroup>
                            </TooltipTrigger>

                            <TooltipContent
                              className="p-0 max-w-[262px]"
                              size="md"
                            >
                              <ScrollArea
                                className="h-[192px] p-3"
                                scrollBar={
                                  <ScrollBar
                                    className="w-4 p-1"
                                    thumbClassName="bg-white/20"
                                  />
                                }
                              >
                                <div className="space-y-3 pr-5">
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-x-[18px]">
                                    <div className="flex items-center gap-x-2 flex-auto">
                                      <Avatar>
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>

                                      <div className="flex flex-col flex-auto">
                                        <div className="flex items-center gap-x-0.5">
                                          <span className="text-xs leading-5 font-semibold text-white">
                                            Sevil
                                          </span>
                                          <span className="text-[10px] leading-none font-light text-white">
                                            @designsuperstar23
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-light text-white">
                                          Full-stack Developer
                                        </span>
                                      </div>
                                    </div>

                                    <span className="text-sm font-semibold text-white leading-5">
                                      $75{" "}
                                      <span className="text-[10px] font-light leading-5">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </ScrollArea>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

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
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>
          </Carousel>

          <div className="mt-[50px]">
            <h1 className="text-[28px] font-bold leading-none text-dark-blue-400">
              More Ways to Explore
            </h1>

            <Tabs className="mt-5" defaultValue="Related Categories">
              <RadixTabs.List className="flex items-center gap-x-3">
                <TabsTrigger
                  variant="unstyled"
                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                  value="Related Categories"
                  showUnderline={false}
                >
                  Related Categories
                </TabsTrigger>
                <TabsTrigger
                  variant="unstyled"
                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                  value="Related Skills"
                  showUnderline={false}
                >
                  Related Skills
                </TabsTrigger>
              </RadixTabs.List>

              <TabsContent value="Related Categories">
                <div className="mt-5 py-5 flex items-start justify-between">
                  <div className="flex flex-col gap-y-3 items-start">
                    <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                      Mobile Applications
                    </h2>

                    <Button variant="link" className="text-dark-blue-400">
                      Android Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Cross-Platform Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Native Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Web Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Gaming Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      E-commerce Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      React Native
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Flutter
                    </Button>
                  </div>
                  <div className="flex flex-col gap-y-3 items-start">
                    <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                      Mobile Applications
                    </h2>

                    <Button variant="link" className="text-dark-blue-400">
                      Android Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Cross-Platform Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Native Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Web Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Gaming Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      E-commerce Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      React Native
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Flutter
                    </Button>
                  </div>
                  <div className="flex flex-col gap-y-3 items-start">
                    <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                      Mobile Applications
                    </h2>

                    <Button variant="link" className="text-dark-blue-400">
                      Android Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Cross-Platform Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Native Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Web Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Gaming Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      E-commerce Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      React Native
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Flutter
                    </Button>
                  </div>
                  <div className="flex flex-col gap-y-3 items-start">
                    <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                      Mobile Applications
                    </h2>

                    <Button variant="link" className="text-dark-blue-400">
                      Android Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Cross-Platform Development
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Native Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Web Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Gaming Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      E-commerce Applications
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      React Native
                    </Button>
                    <Button variant="link" className="text-dark-blue-400">
                      Flutter
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
              Related Searches
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Python
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Object-Oriented Programming
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Object-Oriented Programming
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Object-Oriented Programming
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Object-Oriented Programming
              </Badge>
              <Badge
                className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                visual="gray"
                size="lg"
              >
                Object-Oriented Programming
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto py-[35px]">
          <div className="flex items-center justify-between">
            <h1 className="text-[24px] leading-none text-dark-blue-400 font-bold">
              Recently Viewed
            </h1>

            <Button variant="link" visual="gray">
              View All
            </Button>
          </div>

          <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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
            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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
            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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

            <article className="flex items-start gap-x-6">
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
                  semper lorem ornare congue. Ullamcorper nulla non integer
                  curabitur sed. Pulvinar est vivamus aliquam fermentum ipsum
                  pellentesque ut lacus.
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
          </div>
        </div>

        <div className="relative max-w-[1240px] mx-auto py-[70px]">
          <h1 className="text-[30px] font-bold text-center leading-none text-dark-blue-400">
            Ready to Work With Premium Quality Talent?
          </h1>

          <p className="text-lg font-extralight leading-none mt-6 text-center text-dark-blue-400">
            Click below to create your free account
          </p>

          <div className="flex items-center justify-center mt-[50px]">
            <Button size="2xl">Create My Account</Button>
          </div>

          <Triangles className="absolute right-0 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="py-5 bg-white flex items-center justify-center">
        <Button visual="gray" variant="link">
          <ArrowUp className="size-[15px]" />
          Back to Top
        </Button>
      </div>
    </div>
  )
}

const Triangles = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={272}
    height={229}
    viewBox="0 0 272 229"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      stroke="#1661F6"
      strokeOpacity={0.2}
      strokeWidth={2}
      d="m160.177 12.936-10.808 10.83-10.83-10.807 10.807-10.831z"
    />
    <path
      transform="rotate(134.94 89.48 164.252)skewX(-.12)"
      stroke="#1661F6"
      strokeOpacity={0.2}
      strokeWidth={2}
      d="M-1.413 0h15.302v15.302H-1.413z"
    />
    <path
      stroke="#1661F6"
      strokeOpacity={0.2}
      strokeWidth={2}
      d="m1.882 146.37 6.954-6.968 6.969 6.954-6.954 6.969z"
    />
  </svg>
)

import { fromLength } from "@/utils/functions"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home03,
  Mail,
  MarkerPin02,
  Signal01,
  Star,
  Star01,
  Star02,
  Stars02,
} from "@blend-metrics/icons"
import { AdobeBrand } from "@blend-metrics/icons/brands"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { Meta } from "@storybook/react"
import { SwiperSlide } from "swiper/react"
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  DisclosureContent,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Categories-L1",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Default = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[50px]">
          <div className="relative rounded-lg overflow-hidden h-[227px]">
            <NextImage
              src="/coding.png"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 p-6">
              <div className="flex items-center gap-x-2">
                <Home03 className="size-[18px]  text-white opacity-60" />
                <span className="text-xs leading-6 font-semibold text-white opacity-60">
                  /
                </span>
                <span className="text-xs leading-6 font-semibold text-white opacity-60">
                  Software Development
                </span>
              </div>

              <div className="mt-[50px] px-[50px]">
                <h1 className="text-[36px] font-bold leading-none text-white">
                  Software Development
                </h1>
                <p className="text-xl mt-3 leading-none text-white">
                  Discover exciting projects, meet talented teams, and find the
                  skills you need to succeed.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Explore Software Development
              </h1>

              <div className="flex items-center gap-x-3">
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-[15px]">
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
            </div>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Projects">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Recommended in Software Development
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Projects">Projects</TabsTrigger>
                    </Badge>

                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Services">Services</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Teams">Teams</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Talent">Talent</TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-3">
                    <SwiperPrevTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronLeft className="size-[18px]" />
                      </IconButton>
                    </SwiperPrevTrigger>
                    <SwiperNextTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronRight className="size-[18px]" />
                      </IconButton>
                    </SwiperNextTrigger>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent
                    className="gap-5 flex items-center"
                    value="Projects"
                  >
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(6).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border cursor-pointer border-black/15">
                              <NextImage
                                className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
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
                                  4.9{" "}
                                  <span className="font-extralight">(5)</span>
                                </span>
                              </div>
                            </div>

                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                              Brief Description of the project. Lorem ipsum
                              dolor sit amet, consectetur adipiscing elit, sed
                              do eiusmod tempor incididunt.
                            </p>

                            <div className="mt-5">
                              <div className="flex items-center gap-x-[6.4px]">
                                <Money className="size-[18px] shrink-0 text-primary-500" />

                                <span className="font-medium text-sm leading-none text-dark-blue-400">
                                  $50,000/month
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
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
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
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Back-End Development">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top-Rated Software Development Projects
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Back-End Development">
                        Back-End Development
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Blockchain">Blockchain</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Data Structure & Algorithms">
                        Data Structure & Algorithms
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Cloud Computing">
                        Cloud Computing
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Front-End Development">
                        Front-End Development
                      </TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-3">
                    <SwiperPrevTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronLeft className="size-[18px]" />
                      </IconButton>
                    </SwiperPrevTrigger>
                    <SwiperNextTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                        data-state="active"
                      >
                        <ChevronRight className="size-[18px]" />
                      </IconButton>
                    </SwiperNextTrigger>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="Back-End Development">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      <SwiperSlide className="w-[355px] h-auto">
                        <article className="py-[50px] h-full rounded-lg bg-warning-600 flex flex-col items-start justify-end px-6">
                          <h1 className="text-[28px] font-bold leading-none text-white">
                            Back-End Development Projects
                          </h1>
                          <p className="mt-3 text-lg font-light leading-none text-white">
                            Discover high-quality back-end development projects
                            ready to launch.
                          </p>
                          <Button
                            className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:text-warning-800 hover:bg-white text-warning-700 mt-8"
                            size="lg"
                          >
                            Explore More <ArrowRight className="size-[15px]" />
                          </Button>
                        </article>
                      </SwiperSlide>

                      {fromLength(6).map((key) => (
                        <SwiperSlide key={key} className="w-[355px]">
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage
                                className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
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
                                  4.9{" "}
                                  <span className="font-extralight">(5)</span>
                                </span>
                              </div>
                            </div>

                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                              Brief Description of the project. Lorem ipsum
                              dolor sit amet, consectetur adipiscing elit, sed
                              do eiusmod tempor incididunt.
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
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
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
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                Software Development Teams
              </h1>

              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Featured">Featured</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Newest">Newest</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Most Popular">Most Popular</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Trending">Trending</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Top-Rated">Top-Rated</TabsTrigger>
                  </Badge>
                </TabsList>

                <div className="flex items-center gap-x-8">
                  <Button
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="underline"
                  >
                    Explore More Projects
                  </Button>

                  <div className="flex items-center gap-x-3">
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                      visual="gray"
                      variant="outlined"
                    >
                      <ChevronLeft className="size-[18px]" />
                    </IconButton>
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                      visual="gray"
                      variant="outlined"
                    >
                      <ChevronRight className="size-[18px]" />
                    </IconButton>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="gap-x-5 gap-y-6 grid grid-cols-4"
                  value="Featured"
                >
                  {fromLength(8).map((key) => (
                    <article
                      key={key}
                      className="p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AvatarGroup
                                max={3}
                                size="md"
                                excess
                                excessClassName="border-gray-300 text-gray-500"
                              >
                                <Avatar
                                  size="md"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="md"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="md"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="md"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="md"
                                  className="border-2 border-white hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                  <AvatarFallback>W</AvatarFallback>
                                </Avatar>
                                <Avatar
                                  size="md"
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

                      <div className="mt-5 flex items-center">
                        <span className="text-sm font-bold text-dark-blue-400 leading-none">
                          $85 - $120
                        </span>
                        <span className="text-[10px] text-dark-blue-400 leading-none font-light">
                          /hr
                        </span>
                      </div>

                      <div className="mt-5">
                        <h1 className="text-base leading-none text-dark-blue-400 font-bold">
                          Team Name{" "}
                          <span className="font-light text-gray-500">
                            @Tech Sential
                          </span>
                        </h1>
                        <h3 className="mt-0.5 text-xs font-medium text-dark-blue-400 leading-none">
                          Development team
                        </h3>

                        <p className="mt-2 text-[11px] font-light leading-none text-dark-blue-400">
                          Average 10 years of experience
                        </p>

                        <div className="mt-3.5 flex items-center gap-x-1">
                          <MarkerPin02 className="size-3 text-gray-500" />

                          <span className="leading-4 text-[10px] font-medium text-gray-500">
                            UK, USA, Brazil, Philippines, more...
                          </span>
                        </div>

                        <div className="mt-3.5 flex items-center gap-x-2">
                          <div className="flex items-center gap-x-2">
                            <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                              <div className="flex items-center gap-x-[3px]">
                                <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                              </div>
                            </div>
                            <span className="text-xs font-semibold leading-none text-dark-blue-400">
                              4.7
                            </span>
                          </div>
                          <span className="text-xs font-semibold leading-none text-dark-blue-400">
                            2 Projects
                          </span>
                        </div>

                        <div className="mt-5 flex gap-2 flex-wrap">
                          <Badge className="bg-transparent" visual="gray">
                            iOS
                          </Badge>
                          <Badge className="bg-transparent" visual="gray">
                            iOS
                          </Badge>
                          <Badge className="bg-transparent" visual="gray">
                            iOS
                          </Badge>
                        </div>

                        <div className="mt-5 space-y-2">
                          <span className="block text-[11px] font-light text-dark-blue-400">
                            Previous clients
                          </span>
                          <div className="mt-2 flex items-center flex-wrap gap-3">
                            <div className="size-[25px] rounded-full shrink-0 relative bg-gray-50">
                              <AdobeBrand className="size-7" />
                            </div>
                            <div className="size-[25px] rounded-full shrink-0 relative bg-gray-50">
                              <AdobeBrand className="size-7" />
                            </div>
                            <div className="size-[25px] rounded-full shrink-0 relative bg-gray-50">
                              <AdobeBrand className="size-7" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Popular Searches
              </h1>

              <div className="flex items-center gap-x-3">
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 flex items-center flex-wrap gap-3">
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duraiton-300"
              >
                Project Length
              </Badge>
            </div>
          </div>

          <div className="relative overflow-hidden h-[298px] mt-[50px] p-[50px] rounded-lg">
            <NextImage
              className="object-cover"
              src="/vr-4.png"
              sizes="100vw"
              fill
            />
            <div className="absolute inset-0 bg-black/40 p-[50px]">
              <div className="max-w-[595px]">
                <h1 className="text-white text-4xl font-bold leading-none">
                  The Future is Web3
                </h1>

                <p className="text-xl mt-2 font-light leading-none text-white">
                  Find talented developers and exciting projects in the
                  decentralized space.
                </p>

                <Button
                  className="rounded-full transition-[column-gap,background-color,color] hover:gap-x-3.5  bg-white hover:text-white text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore more <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Projects">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Type
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Projects">Projects</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Services">Services</TabsTrigger>
                  </Badge>
                </TabsList>

                <div className="flex items-center gap-x-3">
                  <IconButton
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                    visual="gray"
                    variant="outlined"
                  >
                    <ChevronLeft className="size-[18px]" />
                  </IconButton>
                  <IconButton
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                    visual="gray"
                    variant="outlined"
                    data-state="active"
                  >
                    <ChevronRight className="size-[18px]" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Projects"
                >
                  {fromLength(10).map((key) => (
                    <article
                      key={key}
                      className="p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                    >
                      <div className="size-[35px] bg-gray-200 rounded-lg" />

                      <div className="mt-5">
                        <span className="text-[10px] leading-none font-medium text-dark-blue-400">
                          DevOps
                        </span>
                        <h1 className="mt-1 text-base leading-none font-semibold text-dark-blue-400">
                          Infrastructure as Code
                        </h1>
                      </div>

                      <div className="mt-3 flex flex-col gap-y-2">
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
                    </article>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top Software Development Projects
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Featured">Featured</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Newest">Newest</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Most Popular">
                        Most Popular
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Trending">Trending</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Top-Rated">Top-Rated</TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-8">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline"
                    >
                      Explore More Projects
                    </Button>

                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronLeft className="size-[18px]" />
                        </IconButton>
                      </SwiperPrevTrigger>
                      <SwiperNextTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronRight className="size-[18px]" />
                        </IconButton>
                      </SwiperNextTrigger>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(6).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article
                            key={key}
                            className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                          >
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage
                                className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
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
                                  4.9{" "}
                                  <span className="font-extralight">(5)</span>
                                </span>
                              </div>
                            </div>

                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                              Brief Description of the project. Lorem ipsum
                              dolor sit amet, consectetur adipiscing elit, sed
                              do eiusmod tempor incididunt.
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
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
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
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top Software Development Services
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Featured">Featured</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Newest">Newest</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Most Popular">
                        Most Popular
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Trending">Trending</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Top-Rated">Top-Rated</TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-8">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline"
                    >
                      Explore More Services
                    </Button>

                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronLeft className="size-[18px]" />
                        </IconButton>
                      </SwiperPrevTrigger>
                      <SwiperNextTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronRight className="size-[18px]" />
                        </IconButton>
                      </SwiperNextTrigger>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(6).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage
                                className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
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
                                  4.9{" "}
                                  <span className="font-extralight">(5)</span>
                                </span>
                              </div>
                            </div>

                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                              Brief Description of the project. Lorem ipsum
                              dolor sit amet, consectetur adipiscing elit, sed
                              do eiusmod tempor incididunt.
                            </p>

                            <div className="mt-[14.5px] flex flex-col gap-y-3">
                              <div className="flex items-center gap-x-[6.4px]">
                                <Money className="size-[18px] shrink-0 text-primary-500" />

                                <span className="font-medium text-sm leading-none text-dark-blue-400">
                                  $25,000/month
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
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
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
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Project Type">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Narrow Your Project Search
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Project Type">Project Type</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Industry">Industry</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Budget">Budget</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Project Length">
                      Project Length
                    </TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                    asChild
                  >
                    <TabsTrigger value="Team Size">Team Size</TabsTrigger>
                  </Badge>
                </TabsList>

                <Button
                  className="transition-[column-gap] hover:gap-x-3.5"
                  size="lg"
                  variant="link"
                  visual="gray"
                >
                  Advanced Filters
                  <ArrowRight className="size-[15px]" />
                </Button>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Project Type"
                >
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Agriculture
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Oil & Gas
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Manufacturing
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Construction
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Utilities
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Retail & Wholesale
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Transportation
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Finance & Banking
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Real Estate
                  </article>
                  <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                    Healthcare
                  </article>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Software Development All Stars
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Featured">Featured</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Newest">Newest</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Most Popular">
                        Most Popular
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Trending">Trending</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Top-Rated">Top-Rated</TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-8">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline"
                    >
                      Explore More Services
                    </Button>

                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronLeft className="size-[18px]" />
                        </IconButton>
                      </SwiperPrevTrigger>
                      <SwiperNextTrigger asChild>
                        <IconButton
                          className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8"
                          visual="gray"
                          variant="outlined"
                        >
                          <ChevronRight className="size-[18px]" />
                        </IconButton>
                      </SwiperNextTrigger>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      <SwiperSlide className="w-[355px] h-auto">
                        <article className="py-[50px] h-full rounded-lg bg-primary-700 flex flex-col items-start justify-end px-6">
                          <h1 className="text-[28px] font-bold leading-none text-white">
                            Cloud Computing Talent
                          </h1>
                          <p className="mt-3 text-lg font-light leading-none text-white">
                            Find cloud computing talent to bring your software
                            development projects to life.
                          </p>
                          <Button
                            className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] hover:bg-white hover:text-primary-600 bg-white text-primary-500 mt-8"
                            size="lg"
                          >
                            Explore More <ArrowRight className="size-[15px]" />
                          </Button>
                        </article>
                      </SwiperSlide>

                      {fromLength(6).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                            <div className="p-5">
                              <div className="relative">
                                <div className="relative h-[140px] overflow-hidden rounded-[6px]">
                                  <NextImage
                                    src="/man.jpg"
                                    sizes="25vw"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex items-center absolute px-2.5 pt-2.5 justify-between top-0 inset-x-0">
                                  <div className="font-bold rounded-[5px] py-0.5 px-1.5 bg-black/[.57] inline-flex items-center gap-x-1 text-white text-[10px]">
                                    <Stars02 /> All Stars
                                  </div>

                                  <Star01 className="size-5 text-white" />
                                </div>

                                <div className="absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white">
                                  <div className="bg-success-500 flex items-center justify-center rounded-full text-white">
                                    <Check className="size-[13.97px]" />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3">
                                <h1 className="text-sm font-bold leading-none textd-dark-blue-400">
                                  $85 - $120
                                  <span className="text-[10px] leading-none font-light">
                                    /hr
                                  </span>
                                </h1>

                                <h1 className="text-sm mt-3 font-bold leading-none text-dark-blue-400">
                                  Ngozi{" "}
                                  <span className="text-[12px] text-gray-500 leading-none font-light">
                                    @BlueberryBelle
                                  </span>
                                </h1>
                                <h2 className="text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5">
                                  Marketing Technologist
                                </h2>
                                <p className="text-[11px] text-dark-blue-400 leading-none font-light mt-2">
                                  5 years of experience
                                </p>
                                <div className="flex items-center text-gray-500 gap-x-1 mt-3.5">
                                  <MarkerPin02 className="size-3" />
                                  <p className="text-[10px] leading-5 font-semibold">
                                    Australia{" "}
                                    <span className="font-light">
                                      (7:30pm local time)
                                    </span>
                                  </p>
                                </div>

                                <div className="mt-3.5 flex items-center gap-x-2">
                                  <div className="flex items-center gap-x-2">
                                    <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                      <div className="flex items-center gap-x-[3px]">
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                      </div>
                                    </div>
                                    <span className="text-xs font-semibold leading-none text-dark-blue-400">
                                      4.7
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold leading-none text-dark-blue-400">
                                    2 Projects
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="relative p-3 flex flex-wrap gap-2 border-t border-gray-200 bg-[#122A4B]/[.02]">
                              <div className="absolute right-3 bottom-3">
                                <Button variant="link" visual="gray">
                                  More...
                                </Button>
                              </div>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Skills
              </h1>

              <div className="flex items-center gap-x-3">
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 flex items-center flex-wrap gap-3">
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300"
              >
                Project Length
              </Badge>
            </div>
          </div>

          <div className="mt-[50px]">
            <Tabs value="Back-End Development">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Newest Software Development Talent
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Back-End Development">
                        Back-End Development
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Blockchain">Blockchain</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Data Structure & Algorithms">
                        Data Structure & Algorithms
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Cloud Computing">
                        Cloud Computing
                      </TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Front-End Development">
                        Front-End Development
                      </TabsTrigger>
                    </Badge>
                  </TabsList>

                  <div className="flex items-center gap-x-3">
                    <SwiperPrevTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronLeft className="size-[18px]" />
                      </IconButton>
                    </SwiperPrevTrigger>
                    <SwiperNextTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                        data-state="active"
                      >
                        <ChevronRight className="size-[18px]" />
                      </IconButton>
                    </SwiperNextTrigger>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value="Back-End Development">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      <SwiperSlide className="w-[355px] h-auto">
                        <article className="py-[50px] h-full rounded-lg bg-success-800 flex flex-col items-start justify-end px-6">
                          <h1 className="text-[28px] font-bold leading-none text-white">
                            Web Application Development Talent
                          </h1>
                          <p className="mt-3 text-lg font-light leading-none text-white">
                            Find web app development talent to bring your
                            projects to life.
                          </p>
                          <Button
                            className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] hover:bg-white hover:text-success-600  bg-white text-success-800 mt-8"
                            size="lg"
                          >
                            Explore More <ArrowRight className="size-[15px]" />
                          </Button>
                        </article>
                      </SwiperSlide>

                      {fromLength(6).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                            <div className="p-5">
                              <div className="relative">
                                <div className="relative h-[140px] overflow-hidden rounded-[6px]">
                                  <NextImage
                                    src="/man.jpg"
                                    sizes="25vw"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex items-center absolute px-2.5 pt-2.5 justify-between top-0 inset-x-0">
                                  <div className="font-bold rounded-[5px] py-0.5 px-1.5 bg-black/[.57] inline-flex items-center gap-x-1 text-white text-[10px]">
                                    <Stars02 /> All Stars
                                  </div>

                                  <Star01 className="size-5 text-white" />
                                </div>

                                <div className="absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white">
                                  <div className="bg-success-500 flex items-center justify-center rounded-full text-white">
                                    <Check className="size-[13.97px]" />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3">
                                <h1 className="text-sm font-bold leading-none textd-dark-blue-400">
                                  $85 - $120
                                  <span className="text-[10px] leading-none font-light">
                                    /hr
                                  </span>
                                </h1>

                                <h1 className="text-sm mt-3 font-bold leading-none text-dark-blue-400">
                                  Ngozi{" "}
                                  <span className="text-[12px] text-gray-500 leading-none font-light">
                                    @BlueberryBelle
                                  </span>
                                </h1>
                                <h2 className="text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5">
                                  Marketing Technologist
                                </h2>
                                <p className="text-[11px] text-dark-blue-400 leading-none font-light mt-2">
                                  5 years of experience
                                </p>
                                <div className="flex items-center text-gray-500 gap-x-1 mt-3.5">
                                  <MarkerPin02 className="size-3" />
                                  <p className="text-[10px] leading-5 font-semibold">
                                    Australia{" "}
                                    <span className="font-light">
                                      (7:30pm local time)
                                    </span>
                                  </p>
                                </div>

                                <div className="mt-3.5 flex items-center gap-x-2">
                                  <div className="flex items-center gap-x-2">
                                    <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                      <div className="flex items-center gap-x-[3px]">
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                                      </div>
                                      <span className="text-xs font-semibold leading-none text-dark-blue-400">
                                        4.7
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold leading-none text-dark-blue-400">
                                    2 Projects
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="relative p-3 flex flex-wrap gap-2 border-t border-gray-200 bg-[#122A4B]/[.02]">
                              <div className="absolute right-3 bottom-3">
                                <Button variant="link" visual="gray">
                                  More...
                                </Button>
                              </div>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                              <Button
                                className="text-gray-500/60 hover:text-gray-500"
                                variant="link"
                                visual="gray"
                              >
                                AR/VR Design
                              </Button>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Skills
              </h1>

              <Button
                className="transition-[column-gap,background-color,color] hover:gap-x-3.5"
                size="lg"
                variant="link"
                visual="gray"
              >
                View All technologies <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="gap-[15px] mt-6 grid grid-cols-6">
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
            </div>
          </div>

          <div className="relative overflow-hidden h-[298px] mt-[50px] p-[50px] rounded-lg">
            <NextImage
              className="object-cover"
              src="/vr-4.png"
              sizes="100vw"
              fill
            />
            <div className="absolute grid grid-cols-2 gap-x-[50px] inset-0 bg-black/40 p-[50px]">
              <div className="col-start-2 col-span-1">
                <h1 className="text-white text-4xl font-bold leading-none">
                  Fueling the Future of Cybersecurity
                </h1>

                <p className="text-xl mt-2 font-light leading-none text-white">
                  Discover cybersecurity experts and projects that can help
                  protect your data.
                </p>

                <Button
                  className="rounded-full transition-[column-gap,background-color,color] hover:gap-x-3.5 hover:text-white  bg-white text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore Cybersecurity <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
              In-Demand Services in Software Development
            </h1>
            <SwiperRoot>
              <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                  >
                    Back-End Development
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                  >
                    Blockchain
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                  >
                    Data Structure & Algorithms
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                  >
                    Cloud Computing
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                  >
                    Front-End Development
                  </Badge>
                </div>

                <div className="flex items-center gap-x-3">
                  <SwiperPrevTrigger asChild>
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                      visual="gray"
                      variant="outlined"
                    >
                      <ChevronLeft className="size-[18px]" />
                    </IconButton>
                  </SwiperPrevTrigger>
                  <SwiperNextTrigger asChild>
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                      visual="gray"
                      variant="outlined"
                      data-state="active"
                    >
                      <ChevronRight className="size-[18px]" />
                    </IconButton>
                  </SwiperNextTrigger>
                </div>
              </div>

              <div className="mt-6">
                <SwiperContent slidesPerView="auto" spaceBetween={20}>
                  <SwiperSlide className="w-[355px] h-auto">
                    <article className="py-[50px] h-full rounded-lg bg-error-700 flex flex-col items-start justify-end px-6">
                      <h1 className="text-[28px] font-bold leading-none text-white">
                        Cybersecurity Services
                      </h1>
                      <p className="mt-3 text-lg font-light leading-none text-white">
                        Explore cloud computing services tailored to meet your
                        unique business needs.
                      </p>
                      <Button
                        className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] hover:bg-white hover:text-error-800 bg-white text-error-700 mt-8"
                        size="lg"
                      >
                        Explore More <ArrowRight className="size-[15px]" />
                      </Button>
                    </article>
                  </SwiperSlide>
                  {fromLength(6).map((key) => (
                    <SwiperSlide className="w-[355px]" key={key}>
                      <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                        <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                          <NextImage
                            className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
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
                          Brief Description of the project. Lorem ipsum dolor
                          sit amet, consectetur adipiscing elit, sed do eiusmod
                          tempor incididunt.
                        </p>

                        <div className="mt-5">
                          <div className="flex items-center gap-x-[6.4px]">
                            <Money className="size-[18px] shrink-0 text-primary-500" />

                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                              $50,000/month
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
                    </SwiperSlide>
                  ))}
                </SwiperContent>
              </div>
            </SwiperRoot>
          </div>

          <div className="mt-[50px]">
            <div className="flex justify-between items-center">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Featured Project Collections
              </h1>

              <Button
                className="transition-[column-gap] hover:gap-x-3.5"
                size="lg"
                variant="link"
                visual="gray"
              >
                Discover more collections <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="mt-6 gap-5 grid grid-cols-3">
              {fromLength(3).map((key) => (
                <article
                  key={key}
                  className="p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                >
                  <div className="relative h-[250px] rounded-lg overflow-hidden">
                    <NextImage
                      className="object-cover"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="mt-3">
                    <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                      AI & Machine Learning{" "}
                    </h1>
                    <p className="text-sm mt-3 font-light text-dark-blue-400">
                      Dive into a curated collection of exciting AI and machine
                      learning projects.
                    </p>

                    <Button
                      className="mt-8 transition-[column-gap,background-color,color] hover:gap-x-3.5 "
                      size="lg"
                      visual="gray"
                      variant="outlined"
                    >
                      Explore projects <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-[50px] p-[50px] grid grid-cols-2 gap-x-[50px] rounded-lg border border-gray-200 bg-[linear-gradient(90deg,rgba(0,0,0,1)_0%,rgba(66,65,65,1)_100%)] shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
            <div>
              <span className="text-base font-medium leading-none text-white">
                Elite Access
              </span>

              <h1 className="mt-2 text-[36px] leading-none font-bold text-white">
                Take Your Projects Further
              </h1>

              <p className="mt-2 text-xl font-light leading-none text-white">
                Upgrade to a Marketeq premium account and gain access to top
                talent and services and exclusive resources.
              </p>

              <div className="mt-[50px]">
                <Button
                  className="bg-white transition-[column-gap,background-color,color] hover:text-white hover:gap-x-3.5  text-black"
                  size="2xl"
                >
                  Learn More <ArrowRight className="size-[18px]" />
                </Button>
              </div>
            </div>

            <div className="pl-[25px]">
              <div className="size-full border-2 rounded-lg border-white/[.08]">
                <div className="relative rounded-lg overflow-hidden size-full translate-x-[25px] translate-y-[25px]">
                  <NextImage
                    className="object-cover"
                    sizes="50vw"
                    fill
                    src="/artificial-hand.jpeg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
            <div className="flex justify-between items-center">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Software Development Courses
              </h1>

              <Button
                className="transition-[column-gap,background-color,color] hover:gap-x-3.5"
                size="lg"
                variant="link"
                visual="gray"
              >
                Explore courses <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="mt-6 gap-5 grid grid-cols-3">
              {fromLength(6).map((key) => (
                <article
                  key={key}
                  className="p-5 rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                >
                  <div className="relative rounded-lg overflow-hidden h-[250px]">
                    <NextImage
                      className="object-cover"
                      sizes="30vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>

                  <div className="mt-3">
                    <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                      A Beginner&apos;s Guide to Web Development
                    </h1>
                    <p className="mt-3 text-sm font-light leading-none text-dark-blue-400">
                      Gain practical skills in HTML, CSS, and JavaScript,
                      enabling you to create your own web pages.
                    </p>
                  </div>

                  <div className="flex mt-7 items-center gap-x-2">
                    <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                      <div className="flex items-center gap-x-[3px]">
                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                        <Star className="size-3 text-primary-500 fill-primary-500 shrink-0" />
                      </div>
                      <span className="text-xs font-semibold leading-none text-dark-blue-400">
                        4.7
                      </span>
                    </div>

                    <span className="text-xs leading-none font-light text-dark-blue-400">
                      (545)
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-x-6">
                    <div className="flex items-center gap-x-1.5">
                      <Clock className="size-4 text-primary-500" />
                      <span className="text-sm font-medium leading-none text-dark-blue-400">
                        1 day
                      </span>
                    </div>

                    <div className="flex items-center gap-x-1.5">
                      <Signal01 className="size-4 text-primary-500" />
                      <span className="text-sm font-medium leading-none text-dark-blue-400">
                        Beginner
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-[50px]">
            <div className="flex justify-between items-center">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Guides Related to Software Development
              </h1>

              <Button
                className="transition-[column-gap] hover:gap-x-3.5"
                size="lg"
                variant="link"
                visual="gray"
              >
                Visit the Blog <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 mt-6">
              <div className="flex flex-col gap-y-8">
                <article className="flex gap-x-6">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 hover:underline cursor-pointer text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3 transition-[column-gap,background-color,color] hover:gap-x-3"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
                <article className="flex gap-x-6">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 hover:underline cursor-pointer text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3 transition-[column-gap] hover:gap-x-3"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
              </div>
              <div className="rounded-lg overflow-hidden relative">
                <NextImage
                  className="object-cover"
                  src="/artificial-hand.jpeg"
                  sizes="50vw"
                  fill
                />
                <div className="p-[50px] absolute inset-0 flex flex-col justify-end">
                  <div className="p-8 rounded-lg bg-white">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3 transition-[column-gap] hover:gap-x-3.5"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-[50px] bg-white">
        <h1 className="text-center text-[28px] leading-none font-bold text-dark-blue-400">
          Software Development FAQ
        </h1>

        <Tabs
          defaultValue="General Questions"
          className="mt-[50px] flex items-start gap-x-[140px]"
        >
          <TabsList className="flex flex-col gap-y-1">
            <TabsTrigger
              value="General Questions"
              className="h-[60px] rounded-xl px-7 whitespace-nowrap flex-none border-2 border-transparent text-dark-blue-400 text-lg leading-7 font-semibold focus-visible:outline-none flex items-center justify-between data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 gap-x-[26px] transition duration-300 hover:bg-primary-25 hover:data-[state=active]:bg-transparent"
            >
              General Questions <ArrowRight className="size-[18px]" />
            </TabsTrigger>
            <TabsTrigger
              value="Career Related Questions"
              className="h-[60px] rounded-xl px-7 whitespace-nowrap flex-none border-2 border-transparent text-dark-blue-400 text-lg leading-7 font-semibold focus-visible:outline-none flex items-center justify-between data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 gap-x-[26px] transition duration-300 hover:bg-primary-25 hover:data-[state=active]:bg-transparent"
            >
              Career Related Questions <ArrowRight className="size-[18px]" />
            </TabsTrigger>
            <TabsTrigger
              value="Technical Questions"
              className="h-[60px] rounded-xl px-7 whitespace-nowrap flex-none border-2 border-transparent text-dark-blue-400 text-lg leading-7 font-semibold focus-visible:outline-none flex items-center justify-between data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 gap-x-[26px] transition duration-300 hover:bg-primary-25 hover:data-[state=active]:bg-transparent"
            >
              Technical Questions <ArrowRight className="size-[18px]" />
            </TabsTrigger>
          </TabsList>

          <TabsContent className="flex-auto" value="General Questions">
            <Accordion type="single" className="flex-auto">
              <AccordionItem
                className="border-b border-gray-200"
                value="item-1"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-2"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-3"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-4"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          <TabsContent className="flex-auto" value="Career Related Questions">
            <Accordion type="single" className="flex-auto">
              <AccordionItem
                className="border-b border-gray-200"
                value="item-1"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is web development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-2"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-3"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-4"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          <TabsContent className="flex-auto" value="Technical Questions">
            <Accordion type="single" className="flex-auto">
              <AccordionItem
                className="border-b border-gray-200"
                value="item-1"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is app development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-2"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-3"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
              <AccordionItem
                className="border-b border-gray-200"
                value="item-4"
              >
                <AccordionTrigger className="py-[20.93px] text-base leading-none font-semibold text-dark-blue-400 flex items-center justify-between w-full">
                  What is software development?{" "}
                  <ChevronRight className="size-[18px]" />
                </AccordionTrigger>
                <DisclosureContent className="pb-5 text-dark-blue-400 text-base font-light leading-[1.5]">
                  We offer a comprehensive range of IT consulting services,
                  including IT strategy development, software development,
                  network infrastructure design and implementation,
                  cybersecurity assessment and solutions, cloud computing
                  solutions, and IT project management.
                </DisclosureContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>

        <div className="mt-[75px]">
          <p className="text-xl text-center leading-none text-dark-blue-400">
            Still have some questions? Visit our{" "}
            <Button className="text-xl leading-none" variant="link">
              Help Center
            </Button>{" "}
            or{" "}
            <Button className="text-xl leading-none" variant="link">
              Chat with Us
            </Button>
          </p>
        </div>
      </div>

      <div className="p-[50px] bg-white border-t border-gray-200">
        <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
          More Ways to Explore
        </h1>
        <div className="mt-6">
          <div className="flex items-center gap-x-3">
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Related Categories
            </Badge>
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Related Searches
            </Badge>
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Trending Searches
            </Badge>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          {fromLength(4).map((key) => (
            <div key={key} className="flex flex-col gap-y-3">
              <span className="text-lg font-bold leading-none text-dark-blue-400">
                Blockchain
              </span>

              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
              <Button size="lg" variant="link" className="text-dark-blue-400">
                Lorem lipsum
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-[50px] bg-primary-25">
        <h1 className="text-[28px] text-center text-dark-blue-400 leading-none font-semibold">
          Stay Up to Date with Marketeq
        </h1>
        <p className="text-base text-center leading-5 mt-5 font-light text-dark-blue-400">
          Subscribe to our newsletter and get the latest updates.
        </p>

        <div className="mt-5 max-w-[506px] mx-auto">
          <div className="flex items-enter gap-x-3">
            <InputGroup fieldHeight={48} className="flex-auto">
              <Input
                className="h-12"
                type="email"
                placeholder="Email Address"
              />
              <InputLeftElement>
                <Mail className="text-gray-500 size-5" />
              </InputLeftElement>
            </InputGroup>
            <Button size="xl">Subscribe</Button>
          </div>

          <div className="mt-3 max-w-[346px] text-xs leading-[19px] text-center mx-auto">
            You may unsubscribe at any time. By signing up, you agree to
            Marketeq’s <span className="underline">Privacy Policy</span> and{" "}
            <span className="underline">Terms of Use</span>.
          </div>
        </div>
      </div>
    </div>
  )
}

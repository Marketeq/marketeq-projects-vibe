import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClockFastForward,
  Home03,
  Mail,
  MarkerPin02,
  Star,
  Star01,
  Star02,
} from "@blend-metrics/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Filter, Grid, List } from "@/components/icons"
import { DropdownIcon } from "@/components/icons/dropdown-icon"
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
import { Sidebar } from "../../(group)/search/sidebar"

export default function Talent() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[50px]">
          <div className="flex gap-x-[50px]">
            <div className="w-[210px] flex-none">
              <Sidebar />
            </div>

            <div className="flex-auto">
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
                    <span className="text-xs leading-6 font-semibold text-white opacity-60">
                      /
                    </span>
                    <span className="text-xs leading-6 font-semibold text-white opacity-60">
                      iOS Development
                    </span>
                  </div>

                  <div className="mt-[50px] pb-6 pl-6 flex items-start justify-between pr-[100px]">
                    <div className="max-w-[440px]">
                      <h1 className="text-[36px] font-bold leading-none text-white">
                        Found a Project?
                      </h1>
                      <p className="text-xl mt-2 leading-none text-white">
                        Explore a diverse pool of iOS developers and find the
                        perfect fit for your project.
                      </p>
                    </div>

                    <Button
                      size="xl"
                      className="mt-6 rounded-full bg-white text-dark-blue-400"
                    >
                      Explore iOS Talent <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h1 className="text-xs leading-none text-dark-blue-400">
                  Suggested Searches:
                </h1>

                <div className="relative space-x-3 mt-3">
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Social Media App
                  </button>
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Game Development
                  </button>
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Augmented Reality App
                  </button>
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Health/Fitness Tracker
                  </button>
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Enterprise App
                  </button>
                  <button className="whitespace-nowrap h-9 px-3.5 py-2 focus-visible:outline-none shrink-0 rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] text-sm font-semibold text-gray-500">
                    Social Media App
                  </button>

                  <button className="absolute rounded-full inset-y-0 my-auto -right-4 focus-visible:outline-none size-9 shrink-0 inline-flex items-center justify-center border-[.97px] border-gray-500 hover:border-gray-950 hover:ring-1 hover:ring-gray-950 bg-white text-gray-500">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-[24px]">
                <div>
                  <div className="mt-6 flex justify-between items-center">
                    <h1 className="text-base leading-none text-dark-blue-400">
                      1,090{" "}
                      <span className="font-light">
                        iOS Development Projects
                      </span>
                    </h1>

                    <div className="flex items-center gap-x-6">
                      <IconButton
                        className="text-gray-500"
                        variant="ghost"
                        visual="gray"
                      >
                        <DropdownIcon className="size-6" />
                      </IconButton>

                      <ToggleGroupRoot className="p-0 gap-x-0">
                        <ToggleGroupItem
                          className="size-10 py-0 px-0 rounded-l-lg rounded-r-none"
                          value="grid"
                        >
                          <Grid />
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          className="size-10 py-0 px-0 rounded-r-lg rounded-l-none"
                          value="list"
                        >
                          <List />
                        </ToggleGroupItem>
                      </ToggleGroupRoot>
                    </div>
                  </div>

                  <div className="mt-6 pb-[50px]">
                    <div className="gap-5 grid grid-cols-3 items-center">
                      {Array(12)
                        .fill(0)
                        .map((_, index) => (
                          <article
                            key={index}
                            className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                          >
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
                                    <Star02 /> All Stars
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
                                <h1 className="text-sm font-bold leading-none text-dark-blue-400">
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
                        ))}
                      {Array(6)
                        .fill(0)
                        .map((_, index) => (
                          <article
                            key={index}
                            className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                          >
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
                                    <Star02 /> All Stars
                                  </div>

                                  <Star01 className="size-5 text-white" />
                                </div>

                                <div className="absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white">
                                  <div className="bg-warning-400 flex items-center justify-center rounded-full text-white">
                                    <ClockFastForward className="size-[13.97px]" />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3">
                                <h1 className="text-sm font-bold leading-none text-dark-blue-400">
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
                        ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <h2 className="text-gray-700 text-sm">Page 1 of 20</h2>

                      <div className="flex items-center gap-x-0.5">
                        <button
                          data-state="active"
                          className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600"
                        >
                          1
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          2
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          3
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          4
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          ...
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          5
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          6
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          7
                        </button>
                        <button className="size-10 shrink-0 rounded-lg data-[state=active]:bg-white data-[state=active]:ring-2 data-[state=active]:ring-gray-100 inline-flex items-center justify-center text-sm font-semibold text-gray-600">
                          8
                        </button>
                      </div>

                      <IconButton
                        size="lg"
                        variant="outlined"
                        className="bg-white"
                      >
                        <ArrowRight className="size-5" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-[50px] bg-white border-t border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
              Guides Related to Software Development
            </h1>

            <Button size="lg" variant="link" visual="gray">
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
                  <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                    The Art of Software Testing: A Comprehensive Guide
                  </h1>
                  <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                    A few sentences about the content of the article. A few
                    sentences about the content of the article. A few sentences
                    about the content of the article. A few sentences about the
                    content of the article.
                  </p>
                  <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                    10 min read
                  </p>

                  <Button
                    className="text-dark-blue-400 mt-3"
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
                  <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                    The Art of Software Testing: A Comprehensive Guide
                  </h1>
                  <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                    A few sentences about the content of the article. A few
                    sentences about the content of the article. A few sentences
                    about the content of the article. A few sentences about the
                    content of the article.
                  </p>
                  <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                    10 min read
                  </p>

                  <Button
                    className="text-dark-blue-400 mt-3"
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
                    sentences about the content of the article. A few sentences
                    about the content of the article. A few sentences about the
                    content of the article.
                  </p>
                  <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                    10 min read
                  </p>

                  <Button
                    className="text-dark-blue-400 mt-3"
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
            {Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex flex-col gap-y-3">
                  <span className="text-lg font-bold leading-none text-dark-blue-400">
                    Blockchain
                  </span>

                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
                    Lorem lipsum
                  </Button>
                  <Button
                    size="lg"
                    variant="link"
                    className="text-dark-blue-400"
                  >
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
    </div>
  )
}

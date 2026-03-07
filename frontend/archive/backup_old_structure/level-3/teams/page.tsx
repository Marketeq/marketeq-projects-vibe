import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home03,
  Mail,
  MarkerPin02,
  Star,
} from "@blend-metrics/icons"
import { AdobeBrand } from "@blend-metrics/icons/brands"
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

export default function Teams() {
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
                      {Array(16)
                        .fill(0)
                        .map((_, index) => (
                          <article
                            key={index}
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
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="md"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="md"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="md"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="md"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Woman"
                                        />
                                        <AvatarFallback>W</AvatarFallback>
                                      </Avatar>
                                      <Avatar
                                        size="md"
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

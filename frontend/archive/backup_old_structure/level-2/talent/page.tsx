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
} from "@blend-metrics/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
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

export default function Talent() {
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
                <span className="text-xs leading-6 font-semibold text-white opacity-60">
                  /
                </span>
                <span className="text-xs leading-6 font-semibold text-white opacity-60">
                  Mobile Applications
                </span>
              </div>

              <div className="mt-[50px] px-[50px]">
                <h1 className="text-[36px] font-bold leading-none text-white">
                  Mobile Applications
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
                Browse Projects by Category
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
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Front-end Development
                  </h1>
                  <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                    Create the interface that users interact with directly.
                  </p>
                </div>
              </article>
              <article className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="size-[35px] rounded-lg bg-gray-200" />

                <div className="mt-5">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
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
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top Mobile Application Teams
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
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Best-Sellers">Best-Sellers</TabsTrigger>
                  </Badge>
                </TabsList>

                <Button size="lg" variant="link" visual="gray">
                  Explore more projects
                  <ArrowRight className="size-[15px]" />
                </Button>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="gap-5 grid grid-cols-4 items-center"
                  value="Featured"
                >
                  {Array(8)
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
                    ))}
                </TabsContent>
              </div>
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

                <Button size="lg" variant="link" visual="gray">
                  Advanced Filters
                  <ArrowRight className="size-[15px]" />
                </Button>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Project Type"
                >
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Agriculture
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Oil & Gas
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Manufacturing
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Construction
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Utilities
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Retail & Wholesale
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Transportation
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Finance & Banking
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Real Estate
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Healthcare
                  </article>
                </TabsContent>
              </div>
            </Tabs>
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
                  E-commerce App Inspiration Starts Here
                </h1>

                <p className="text-xl mt-2 font-light leading-none text-white">
                  Discover top e-commerce app projects demonstrating
                  cutting-edge features and best practices.
                </p>

                <Button
                  className="rounded-full bg-white text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore more <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
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
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
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
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
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
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
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

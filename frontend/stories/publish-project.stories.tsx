import React from "react"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  CheckCircleBroken,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Edit03,
  Eye,
  HelpCircle,
  Home03,
  Lightbulb05,
  Lock01,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Plus2,
  SearchMd,
  Send,
  X,
} from "@blend-metrics/icons"
import { Usflag } from "@blend-metrics/icons/flags"
import { Meta } from "@storybook/react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  Dropzone,
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
  HelperText,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  ScrollArea,
  ScrollBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "PublishProject",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Sidebar = () => {
  return (
    <div className="py-6 px-[15px] flex flex-col shrink-0 gap-y-5 xs:max-[1024px]:hidden w-[260px] border-r border-gray-200 bg-gray-50">
      <button
        className="group flex items-center justify-between focus-visible:outline-none hover:bg-gray-100 disabled:hover:bg-transparent rounded-md"
        data-state="active"
      >
        <span className="flex items-center gap-x-3 px-3 py-2">
          <span className="text-sm leading-[16.94px] font-semibold size-[25px] rounded-full shrink-0 inline-flex justify-center items-center text-white group-data-[state=active]:bg-primary-500 group-disabled:group-data-[state=inactive]:bg-gray-300">
            1
          </span>
          <span className="text-dark-blue-400 group-disabled:text-gray-300 text-sm leading-[16.94px] font-semibold">
            Project Info
          </span>
        </span>

        <Lock01 className="size-[18px] text-gray-300 shrink-0 group-disabled:inline-block hidden" />
      </button>

      <div className="flex flex-col">
        <button
          className="group flex items-center justify-between focus-visible:outline-none hover:bg-gray-100 disabled:hover:bg-transparent rounded-md"
          data-state="inactive"
        >
          <span className="flex items-center gap-x-3 px-3 py-2">
            <span className="text-sm leading-[16.94px] font-semibold size-[25px] rounded-full shrink-0 inline-flex justify-center items-center text-white group-data-[state=inactive]:border-2 group-data-[state=inactive]:text-primary-500 group-data-[state=inactive]:border-primary-500 group-data-[state=active]:bg-primary-300 group-disabled:group-data-[state=inactive]:bg-gray-300">
              2
            </span>
            <span className="text-dark-blue-400 group-disabled:text-gray-300 text-sm leading-[16.94px] font-semibold">
              Media
            </span>
          </span>

          <Lock01 className="size-[18px] text-gray-300 shrink-0 group-disabled:inline-block hidden" />
        </button>

        <div className="pl-[25px]">
          <div className="py-1.5 flex items-center justify-between pl-[25px] pr-3">
            <span className="text-sm leading-6 text-gray-500">Title</span>
            <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
          </div>
          <div className="py-1.5 flex items-center justify-between pl-[25px] pr-3">
            <span className="text-sm leading-6 text-gray-500">Title</span>
            <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
          </div>
          <div className="py-1.5 flex items-center justify-between pl-[25px] pr-3">
            <span className="text-sm leading-6 text-gray-500">Title</span>
            <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
          </div>
          <div className="py-1.5 flex items-center justify-between pl-[25px] pr-3">
            <span className="text-sm leading-6 text-gray-500">Title</span>
            <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
          </div>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="group flex items-center justify-between focus-visible:outline-none hover:bg-gray-100 disabled:hover:bg-transparent rounded-md"
              disabled
              data-state="inactive"
            >
              <span className="flex items-center gap-x-3 px-3 py-2">
                <span className="text-sm leading-[16.94px] font-semibold size-[25px] rounded-full shrink-0 inline-flex justify-center items-center text-white group-data-[state=active]:bg-primary-300 group-disabled:group-data-[state=inactive]:bg-gray-300">
                  3
                </span>
                <span className="text-dark-blue-400 group-disabled:text-gray-300 text-sm leading-[16.94px] font-semibold">
                  Project Scope
                </span>
              </span>

              <Lock01 className="size-[18px] text-gray-300 shrink-0 group-disabled:inline-block hidden" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-[138px] text-center"
            side="top"
            align="center"
          >
            Please complete the current step first
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export const Header = () => {
  return (
    <div className="pr-[17px] pl-[32px] flex items-center justify-between sticky top-0 bg-white h-[70px] border-b border-gray-200">
      <h3 className="text-sm leading-[16.94px] text-gray-900 font-semibold">
        Publish to Marketplace
      </h3>

      <div className="flex items-center gap-x-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                className="text-gray-500"
                variant="outlined"
                visual="gray"
              >
                <HelpCircle className="size-4" />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Help</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button className="bg-primary-500/15 text-primary-500 hover:bg-primary-500 hover:text-white">
          <Eye className="size-[15px]" /> Preview
        </Button>
        <Button className="text-gray-900" variant="outlined" visual="gray">
          Save & Exit
        </Button>
      </div>
    </div>
  )
}

export const BottomBar = () => {
  return (
    <div className="h-[78px] z-40 fixed left-0 min-[1024px]:left-[260px] bottom-0 right-0 bg-white border-b border-gray-200">
      <Progress className="rounded-none" value={30} />
      <div className="flex h-[70px] items-center justify-between py-[15px] pr-[17px] pl-[32px]">
        <span className="text-xs leading-[18px] font-semibold text-gray-700">
          10% Complete
        </span>

        <div className="flex items-center gap-x-6">
          <Button variant="outlined">
            <ChevronLeft className="size-[15px]" />
            Previous
          </Button>
          <Button>
            Next <ChevronRight className="size-[15px]" />
          </Button>
        </div>
      </div>
    </div>
  )
}

const ProjectInfoTip = ({
  closeTrigger,
  showArrow,
  className,
}: {
  closeTrigger?: React.ReactNode
  showArrow?: boolean
  className?: string
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}

      {closeTrigger}

      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-[30px] font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-[14.52px] text-black/60">
          A great title gives your audience a reason to open your project
        </span>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <CheckCircle className="size-5 shrink-0 text-primary-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Focus on purpose
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-[16.94px] text-gray-500">
            Use impactful keywords that communicate value and make it easy to
            identify in a list of projects.
          </span>
        </div>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <CheckCircle className="size-5 shrink-0 text-primary-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Focus on purpose
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-[16.94px] text-gray-500">
            Use impactful keywords that communicate value and make it easy to
            identify in a list of projects.
          </span>
        </div>
      </div>
    </div>
  )
}

export const ProjectInfo = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-auto">
        <Header />
        <ScrollArea
          className="h-[calc(theme(size.full)-148px)]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col min-[1024px]:flex-row gap-y-10 min-[1024px]:gap-x-[41.45px]">
            <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
              <div className="flex items-start gap-x-3">
                <Lightbulb05 className="size-[30px] text-primary-500" />

                <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                  <div className="space-y-0.5 flex-auto">
                    <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                      Tip
                    </h1>
                    <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                      A great title gives your audience a reason to open your
                      project
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link">
                        <PlayCircle className="size-5" /> Show me how
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-[317.55px] p-0">
                      <ProjectInfoTip
                        className="w-full"
                        closeTrigger={
                          <DialogClose asChild>
                            <IconButton
                              className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                              variant="light"
                              visual="gray"
                            >
                              <X className="size-5" />
                            </IconButton>
                          </DialogClose>
                        }
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="flex-auto">
              <h1 className="text-xl leading-[30px] font-semibold text-gray-900">
                Project Info
              </h1>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="title"
                  >
                    Title
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      Write a title that accurately describes your project scope
                      for the marketplace.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/120
                    </span>
                  </div>
                </div>

                <Input id="title" type="text" placeholder="Enter Title" />
              </div>

              <div className="space-y-6 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="email"
                    asChild
                  >
                    <span>Category</span>
                  </Label>

                  <HelperText size="sm">
                    Select categories that best fit your project scope for
                    easier discovery.
                  </HelperText>
                </div>

                <div className="flex items-start gap-x-1.5">
                  <div className="size-11 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                    1
                  </div>

                  <div className="flex flex-col flex-auto gap-y-2.5">
                    <div className="max-w-[202px]">
                      <InputGroup>
                        <Input
                          id="add-category"
                          type="text"
                          placeholder="Add Category"
                        />
                        <InputRightElement>
                          <ChevronDown className="text-gray-400 size-4" />
                        </InputRightElement>
                      </InputGroup>
                    </div>
                    <InputGroup>
                      <Input
                        id="add-sub-category-s"
                        type="text"
                        placeholder="Add Sub-Category(s)"
                      />
                      <InputRightElement>
                        <SearchMd className="text-gray-400 size-4" />
                      </InputRightElement>
                    </InputGroup>
                  </div>
                </div>

                <div className="flex items-start gap-x-1.5">
                  <div className="size-11 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                    2
                  </div>

                  <div className="flex flex-col flex-auto gap-y-2.5">
                    <div className="max-w-[202px]">
                      <InputGroup>
                        <Input
                          id="add-category"
                          type="text"
                          placeholder="Add Category"
                        />
                        <InputRightElement>
                          <ChevronDown className="text-gray-400 size-4" />
                        </InputRightElement>
                      </InputGroup>
                    </div>
                    <InputGroup>
                      <Input
                        id="add-sub-category-s"
                        type="text"
                        placeholder="Add Sub-Category(s)"
                      />
                      <InputRightElement>
                        <SearchMd className="text-gray-400 size-4" />
                      </InputRightElement>
                    </InputGroup>
                  </div>
                </div>

                <div className="flex items-start gap-x-1.5">
                  <div className="size-11 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                    3
                  </div>

                  <div className="flex flex-col flex-auto gap-y-2.5">
                    <div className="max-w-[202px]">
                      <InputGroup>
                        <Input
                          id="add-category"
                          type="text"
                          placeholder="Add Category"
                        />
                        <InputRightElement>
                          <ChevronDown className="text-gray-400 size-4" />
                        </InputRightElement>
                      </InputGroup>
                    </div>
                    <InputGroup>
                      <Input
                        id="add-sub-category-s"
                        type="text"
                        placeholder="Add Sub-Category(s)"
                      />
                      <InputRightElement>
                        <SearchMd className="text-gray-400 size-4" />
                      </InputRightElement>
                    </InputGroup>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-1.5">
                <span className="block text-xs leading-5 text-dark-blue-400">
                  Suggested Skills
                </span>

                <div className="flex items-center gap-x-3">
                  <Badge visual="primary">
                    Node.js
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                  <Badge visual="primary">
                    JavaScript
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                  <Badge visual="primary">
                    Wireframing
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="industry"
                  >
                    Industry
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      Add up to 5 industries that aligns with your project scope
                      for targeted visibility.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/5
                    </span>
                  </div>
                </div>

                <Input id="industry" type="text" placeholder="Enter Industry" />
              </div>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="short-description"
                  >
                    Short Description
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      Provide a brief overview of your project scope.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/300
                    </span>
                  </div>
                </div>

                <Textarea
                  id="short-description"
                  placeholder="Enter a short description..."
                />
              </div>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="full-description"
                  >
                    Full Description
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      Provide a comprehensive description of this project,
                      including its purpose and features.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/2,000
                    </span>
                  </div>
                </div>

                <Textarea
                  id="full-description"
                  placeholder="Enter a short description..."
                />
              </div>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="tags"
                  >
                    Tags
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      Add up to 10 tags that best describe your project. Use
                      relevant keywords to highlight its features and make it
                      easier to find.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/10
                    </span>
                  </div>
                </div>

                <Input id="tags" type="text" placeholder="Enter Industry" />
              </div>

              <div className="space-y-1.5 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="skills"
                  >
                    Skills
                  </Label>
                  <div className="flex items-center justify-between">
                    <HelperText size="sm">
                      List up to 10 key skills or proficiencies required to
                      implement this project effectively.
                    </HelperText>

                    <span className="text-xs leading-[14.52px] text-gray-500">
                      0/10
                    </span>
                  </div>
                </div>

                <Input id="skills" type="text" placeholder="Add Skills" />
              </div>

              <div className="mt-6 space-y-1.5">
                <span className="block text-xs leading-5 text-dark-blue-400">
                  Suggested Skills
                </span>

                <div className="flex items-center gap-x-3">
                  <Badge visual="primary">
                    Node.js
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                  <Badge visual="primary">
                    JavaScript
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                  <Badge visual="primary">
                    Wireframing
                    <button className="focus-visible:outline-none">
                      <Plus2 className="size-3" />
                    </button>
                  </Badge>
                </div>
              </div>
            </div>
            <div className="pl-[17.45px] xs:max-[1024px]:hidden">
              <ProjectInfoTip showArrow />
            </div>
          </div>
        </ScrollArea>

        <BottomBar />
      </div>
    </div>
  )
}

const MediaTip = ({
  showArrow,
  closeTrigger,
  className,
}: {
  showArrow?: boolean
  closeTrigger?: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}
      {closeTrigger}
      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-[30px] font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-[14.52px] text-black/60">
          Make your project stand out with better images.
        </span>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Upload a professional, high-quality image to represent your scope.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500 mt-5">
            Ensure it reflects the essence of your work and attracts attention
            in the marketplace.
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-[16.94px] text-gray-500">
            Use impactful keywords that communicate value and make it easy to
            identify in a list of projects.
          </span>
        </div>
      </div>
    </div>
  )
}

export const Media = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-auto">
        <Header />

        <ScrollArea
          className="h-[calc(theme(size.full)-148px)]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col gap-y-10 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
            <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
              <div className="flex items-start gap-x-3">
                <Lightbulb05 className="size-[30px] text-primary-500" />

                <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                  <div className="space-y-0.5 flex-auto">
                    <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                      Tip
                    </h1>
                    <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                      Make your project stand out with better images.
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link">
                        <PlayCircle className="size-5" /> Show me how
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-[317.55px] p-0">
                      <MediaTip
                        className="w-full"
                        closeTrigger={
                          <DialogClose asChild>
                            <IconButton
                              className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                              variant="light"
                              visual="gray"
                            >
                              <X className="size-5" />
                            </IconButton>
                          </DialogClose>
                        }
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="flex-auto">
              <h1 className="text-xl leading-[30px] font-semibold text-gray-900">
                Media
              </h1>

              <div className="space-y-3 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="title"
                    asChild
                  >
                    <span>Featured Image</span>
                  </Label>

                  <HelperText size="sm">
                    Make a strong first impression with a standout featured
                    image.
                  </HelperText>
                </div>

                <Dropzone size="lg" icon />
              </div>

              <div className="space-y-3 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="title"
                    asChild
                  >
                    <span>Additional Images</span>
                  </Label>

                  <HelperText size="sm">
                    Include additional images to showcase more details.
                  </HelperText>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div className="h-[100px] rounded-[5px] border-2 border-gray-200 border-dashed bg-gray-50 flex flex-col gap-y-2 p-5 items-center justify-center">
                    <Plus className="size-6 text-gray-500" />
                    <span className="text-sm leading-50 font-semibold text-gray-500">
                      Image
                    </span>
                  </div>
                  <div className="h-[100px] rounded-[5px] border-2 border-gray-200 border-dashed bg-gray-50 flex flex-col gap-y-2 p-5 items-center justify-center">
                    <Plus className="size-6 text-gray-500" />
                    <span className="text-sm leading-50 font-semibold text-gray-500">
                      Image
                    </span>
                  </div>
                  <div className="h-[100px] rounded-[5px] border-2 border-gray-200 border-dashed bg-gray-50 flex flex-col gap-y-2 p-5 items-center justify-center">
                    <Plus className="size-6 text-gray-500" />
                    <span className="text-sm leading-50 font-semibold text-gray-500">
                      Image
                    </span>
                  </div>
                  <div className="h-[100px] rounded-[5px] border-2 border-gray-200 border-dashed bg-gray-50 flex flex-col gap-y-2 p-5 items-center justify-center">
                    <Plus className="size-6 text-gray-500" />
                    <span className="text-sm leading-50 font-semibold text-gray-500">
                      Image
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="space-y-0.5">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                    htmlFor="additional-images"
                  >
                    Additional Images
                  </Label>

                  <HelperText size="sm">
                    Include additional images to showcase more details.
                  </HelperText>
                </div>

                <InputGroup>
                  <InputLeftAddon>http://</InputLeftAddon>
                  <Input
                    type="text"
                    id="additional-images"
                    placeholder="www.video.com"
                  />
                </InputGroup>
              </div>
            </div>

            <div className="pl-[17.45px] xs:max-[1024px]:hidden">
              <MediaTip />
            </div>
          </div>
        </ScrollArea>

        <BottomBar />
      </div>
    </div>
  )
}

export const ProjectScopeTip = ({
  showArrow,
  closeTrigger,
  className,
}: {
  showArrow?: boolean
  closeTrigger?: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}

      {closeTrigger}

      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-[30px] font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-[14.52px] block text-dark-blue-400">
          Review and Refine Your Project Scope
        </span>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-xs leading-[14.52px] tracking-[0.01em] text-dark-blue-400">
            Ensure all phases and tasks align with your project goals and
            deliverables.
          </li>
          <li className="text-xs leading-[14.52px] tracking-[0.01em] text-dark-blue-400">
            Review dependencies, timelines, and assignments for clarity.
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Use the project planner to edit existing phases or tasks
            effortlessly.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Double-check for any overlapping or missing tasks to maintain
            efficiency.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Add new phases, tasks, or processes quickly with the + Add option. •
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Leaving phases or tasks incomplete or ambiguous.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Try not to overload a single phase with too many tasks; break them
            down if needed.
          </li>
        </ul>
      </div>
    </div>
  )
}

export const ProjectScope = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-auto">
        <Header />

        <ScrollArea
          className="h-[calc(theme(size.full)-148px)]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] min-[1024px]:flex space-y-10 min-[1024px]:space-y-0 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
            <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
              <div className="flex items-start gap-x-3">
                <Lightbulb05 className="size-[30px] text-primary-500" />

                <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                  <div className="space-y-0.5 flex-auto">
                    <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                      Tip
                    </h1>
                    <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                      A great title gives your audience a reason to open your
                      project
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link">
                        <PlayCircle className="size-5" /> Show me how
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-[317.55px] p-0">
                      <ProjectScopeTip
                        className="w-full"
                        closeTrigger={
                          <DialogClose asChild>
                            <IconButton
                              className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                              variant="light"
                              visual="gray"
                            >
                              <X className="size-5" />
                            </IconButton>
                          </DialogClose>
                        }
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-auto">
              <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
                <h1 className="text-xl leading-[30px] font-semibold text-gray-800">
                  Project Scope
                </h1>

                <div className="flex items-center md:gap-x-3">
                  <div className="flex items-center">
                    <Button
                      className="border-r-0 rounded-r-none"
                      variant="outlined"
                      visual="gray"
                    >
                      <ChevronsDown className="size-[15px]" /> Expand all
                    </Button>
                    <Button
                      className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                      variant="outlined"
                      visual="gray"
                    >
                      <ChevronsUp className="size-[15px]" /> Collapse All
                    </Button>
                  </div>

                  <Button
                    className="border-l-0 rounded-l-none md:border-l md:rounded-l-[5px]"
                    variant="outlined"
                    visual="gray"
                  >
                    <Plus className="size-[15px]" /> Expand all
                  </Button>
                </div>
              </div>

              <InputGroup>
                <Input type="text" placeholder="Find a phase or task" />
                <InputLeftElement>
                  <SearchMd className="text-gray-500 h-5 w-5" />
                </InputLeftElement>
              </InputGroup>

              <Accordion
                defaultValue={["Research"]}
                type="multiple"
                className="flex-auto"
              >
                <AccordionItem value="Research" asChild>
                  <div className="rounded-lg border border-gray-100 shadow-xs">
                    <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                      <div className="flex flex-auto gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                        <AccordionTrigger className="inline-flex items-center gap-x-3.5">
                          <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                            Phase One{" "}
                            <span className="font-light">Research</span>
                          </span>
                        </AccordionTrigger>

                        <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                          <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                            Day 1
                          </span>
                          <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                            -
                          </span>
                          <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                            Day 8
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-x-4 items-center">
                        <Button
                          className="h-[23px] px-1.5 py-1 text-gray-500"
                          variant="ghost"
                          visual="gray"
                        >
                          <MoreHorizontal className="h-[15px] w-[15px]" />
                        </Button>

                        <IconButton
                          className="text-gray-500"
                          variant="outlined"
                          visual="gray"
                        >
                          <Plus className="size-3" />
                        </IconButton>
                      </div>
                    </div>

                    <DisclosureContent className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Experience</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <span className="flex flex-col text-sm font-semibold text-gray-900">
                                Affinity Mapping
                              </span>
                            </TableCell>
                            <TableCell>UX Designer</TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="inline-flex items-center justify-center size-[18px] shrink-0 rounded-full overflow-hidden">
                                  <Usflag className="size-[18px]" />
                                </span>
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  USA
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  Guru
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>40 hours</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <span className="flex flex-col text-sm font-semibold text-gray-900">
                                Affinity Mapping
                              </span>
                            </TableCell>
                            <TableCell>UX Designer</TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="inline-flex items-center justify-center size-[18px] shrink-0 rounded-full overflow-hidden">
                                  <Usflag className="size-[18px]" />
                                </span>
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  USA
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  Guru
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>40 hours</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <span className="flex flex-col text-sm font-semibold text-gray-900">
                                Affinity Mapping
                              </span>
                            </TableCell>
                            <TableCell>UX Designer</TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="inline-flex items-center justify-center size-[18px] shrink-0 rounded-full overflow-hidden">
                                  <Usflag className="size-[18px]" />
                                </span>
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  USA
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>
                              <button className="bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
                                <span className="text-xs leading-[18px] font-medium text-gray-700">
                                  Guru
                                </span>
                                <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
                              </button>
                            </TableCell>
                            <TableCell>40 hours</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </DisclosureContent>
                  </div>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="pl-[17.45px] xs:max-[1024px]:hidden">
              <ProjectScopeTip showArrow />
            </div>
          </div>
        </ScrollArea>

        <BottomBar />
      </div>
    </div>
  )
}

export const PublishMarketPlaceEmptyState = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-auto">
        <Header />

        <ScrollArea
          className="h-[calc(theme(size.full)-148px)]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] min-[1024px]:flex space-y-10 min-[1024px]:space-y-0 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
            <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
              <div className="flex items-start gap-x-3">
                <Lightbulb05 className="size-[30px] text-primary-500" />

                <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                  <div className="space-y-0.5 flex-auto">
                    <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                      Tip
                    </h1>
                    <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                      A great title gives your audience a reason to open your
                      project
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link">
                        <PlayCircle className="size-5" /> Show me how
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-[317.55px] p-0">
                      <ProjectScopeTip
                        className="w-full"
                        closeTrigger={
                          <DialogClose asChild>
                            <IconButton
                              className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                              variant="light"
                              visual="gray"
                            >
                              <X className="size-5" />
                            </IconButton>
                          </DialogClose>
                        }
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-auto">
              <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
                <h1 className="text-xl leading-[30px] font-semibold text-gray-800">
                  Project Scope
                </h1>

                <div className="flex items-center md:gap-x-3">
                  <div className="flex items-center">
                    <Button
                      className="border-r-0 rounded-r-none"
                      variant="outlined"
                      visual="gray"
                    >
                      <ChevronsDown className="size-[15px]" /> Expand all
                    </Button>
                    <Button
                      className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                      variant="outlined"
                      visual="gray"
                    >
                      <ChevronsUp className="size-[15px]" /> Collapse All
                    </Button>
                  </div>

                  <Button
                    className="border-l-0 rounded-l-none md:border-l md:rounded-l-[5px]"
                    variant="outlined"
                    visual="gray"
                  >
                    <Plus className="size-[15px]" /> Expand all
                  </Button>
                </div>
              </div>

              <InputGroup>
                <Input type="text" placeholder="Find a phase or task" />
                <InputLeftElement>
                  <SearchMd className="text-gray-500 h-5 w-5" />
                </InputLeftElement>
              </InputGroup>

              <Accordion
                defaultValue={["Research"]}
                type="multiple"
                className="flex-auto"
              >
                <AccordionItem value="Research" asChild>
                  <div className="rounded-lg border border-gray-100 shadow-xs">
                    <div className="mb-3 flex items-center gap-x-4 px-3 pt-3">
                      <div className="flex flex-auto justify-between items-center">
                        <div className="inline-flex items-center gap-x-3.5">
                          <AccordionTrigger asChild>
                            <IconButton
                              className="size-8"
                              variant="ghost"
                              visual="gray"
                            >
                              <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                            </IconButton>
                          </AccordionTrigger>

                          <div className="inline-flex md:flex-row flex-col md:items-center gap-y-3 md:gap-x-5">
                            <span className="text-base md:text-[18px] font-semibold md:font-light leading-7 text-gray-900">
                              Phase One
                            </span>{" "}
                            <button className="focus-visible:outline-none inline-flex items-center gap-x-2">
                              <Edit03 className="size-[15px] text-gray-800" />
                              <span className="inline-block text-sm leading-5 font-semibold text-gray-800">
                                Edit Phase Name
                              </span>
                            </button>
                            <div className="inline-block md:hidden">
                              <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                Day 1
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:inline-flex items-center gap-x-2 md:pl-0 pl-10">
                          <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                            Day 1
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-x-4 items-center">
                        <Button
                          className="h-[23px] px-1.5 py-1 text-gray-500"
                          variant="ghost"
                          visual="gray"
                        >
                          <MoreHorizontal className="h-[15px] w-[15px]" />
                        </Button>

                        <IconButton
                          className="text-gray-500"
                          variant="outlined"
                          visual="gray"
                        >
                          <Plus className="size-3" />
                        </IconButton>
                      </div>
                    </div>
                    <DisclosureContent className="overflow-auto">
                      <div className="w-full overflow-auto flex border-t border-gray-200 flex-col justify-center min-h-[272px] md:min-h-[292px] lg:min-h-[530px]">
                        <div className="max-w-[352px] mx-auto">
                          <div className="flex justify-center">
                            <div className="size-[48px] rounded-full bg-gray-100 inline-flex items-center justify-center border-[8px] border-gray-50">
                              <CheckCircleBroken className="size-[24px] text-gray-500" />
                            </div>
                          </div>

                          <h1 className="text-base mt-4 font-semibold text-center leading-6 text-gray-800">
                            Create your first task
                          </h1>
                          <p className="text-sm mt-1 leading-5 text-center text-gray-800">
                            Start defining your project scope with a clear,
                            actionable step.
                          </p>

                          <div className="mt-6 flex justify-center">
                            <Button className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white">
                              Add Task
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DisclosureContent>
                  </div>
                </AccordionItem>

                <Button className="mt-5" variant="ghost" visual="gray">
                  <Plus className="size-[15px]" /> Add Phase
                </Button>
              </Accordion>
            </div>

            <div className="pl-[17.45px] xs:max-[1024px]:hidden">
              <ProjectScopeTip showArrow />
            </div>
          </div>
        </ScrollArea>
      </div>

      <BottomBar />
    </div>
  )
}

export const PhaseName = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[371px]">
        <div className="space-y-1.5">
          <Label htmlFor="phase-name" className="text-gray-700" size="sm">
            Phase Name
          </Label>
          <Input
            id="phase-name"
            className="text-gray-900"
            defaultValue="Stage 1"
          />
        </div>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const TaskName = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[371px]">
        <div className="space-y-1.5">
          <Label htmlFor="task-name" className="text-gray-700" size="sm">
            Task Name
          </Label>
          <Input
            id="task-name"
            className="text-gray-900"
            defaultValue="Affinity Mapping"
          />
        </div>

        <div className="space-y-1.5 mt-3">
          <Label htmlFor="duration" className="text-gray-700" size="sm">
            Duration
          </Label>
          <div className="grid grid-cols-2 gap-x-3">
            <Input id="duration" className="text-gray-900" defaultValue="40" />
            <Listbox id="duration" defaultValue="Hours">
              <ListboxButton placeholder="Select" />
              <ListboxOptions>
                {["Hours", "Minutes", "Seconds", "Days", "Months", "Years"].map(
                  (format) => (
                    <ListboxOption key={format} value={format}>
                      {format}
                    </ListboxOption>
                  )
                )}
              </ListboxOptions>
            </Listbox>
          </div>
        </div>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const Duration = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[371px]">
        <div className="space-y-1.5 mt-3">
          <Label htmlFor="duration" className="text-gray-700" size="sm">
            Duration
          </Label>
          <div className="grid grid-cols-2 gap-x-3">
            <Input id="duration" className="text-gray-900" defaultValue="40" />
            <Listbox id="duration" defaultValue="Hours">
              <ListboxButton placeholder="Select" />
              <ListboxOptions>
                {["Hours", "Minutes", "Seconds", "Days", "Months", "Years"].map(
                  (format) => (
                    <ListboxOption key={format} value={format}>
                      {format}
                    </ListboxOption>
                  )
                )}
              </ListboxOptions>
            </Listbox>
          </div>
        </div>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeletePhase = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[348px]">
        <DialogTitle>Delete this phase?</DialogTitle>
        <DialogDescription>
          This phase will be deleted permanently. You will not be able to
          recover it.
        </DialogDescription>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const SaveExit = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[348px]">
        <DialogTitle>Save & Exit</DialogTitle>
        <DialogDescription>
          Would you like to save your project scope progress before exiting? You
          can resume editing any time.
        </DialogDescription>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save & Exit</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const Empty1 = () => {
  return (
    <div className="grid flex-auto place-items-center">
      <div className="flex flex-col max-w-[440px] items-center justify-between">
        <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-primary-50 text-primary-500">
          <Send className="size-7" />
        </div>

        <h1 className="mt-8 text-xl text-center text-gray-800 leading-[30px] font-semibold">
          Your Project Has Been Submitted for a Review!
        </h1>

        <p className="mt-6 text-sm leading-[16.94px] text-center text-gray-500">
          Our team will review your project over the next few days and will get
          back to you if there are any changes to be made.
        </p>

        <div className="flex items-center justify-center gap-x-1 mt-6">
          <p className="text-sm leading-[16.94px] text-gray-500">
            You can check your project status anytime in
          </p>
          <Button variant="link">My Projects</Button>
        </div>

        <p className="text-sm leading-[30px] font-semibold text-center text-gray-800 mt-6">
          Thanks for submitting, we’ll be in touch soon!
        </p>

        <div className="flex justify-center gap-x-3 items-center mt-8">
          <Button visual="gray" variant="outlined">
            <Home03 className="size-[15px]" />
            Take me home
          </Button>

          <Button>View in Dashboard</Button>
        </div>
      </div>
    </div>
  )
}

export const Empty2 = () => {
  return (
    <div className="mx-auto">
      <div className="flex flex-col">
        <div className="flex justify-center">
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-success-100 text-success-500">
            <CheckCircle className="size-7" />
          </div>
        </div>

        <h1 className="mt-8 text-xl text-center text-gray-800 leading-[30px] font-semibold">
          Your project has been successfully published
        </h1>

        <p className="mt-6 text-sm leading-[16.94px] text-center text-gray-500">
          Your project is now live in the marketplace and available for others
          to discover and collaborate. Thank you for contributing!
        </p>

        <div className="mt-6 text-center">
          <p className="text-sm leading-[16.94px] text-gray-500">
            You can check your project status anytime in
          </p>{" "}
          <Button variant="link">My Projects</Button>
        </div>

        <div className="flex gap-3 md:flex-row flex-col justify-center mt-8">
          <Button visual="gray" variant="outlined">
            <Home03 className="size-[15px]" />
            Take me home
          </Button>
          <Button>View in Marketplace</Button>
        </div>
      </div>
    </div>
  )
}

export const Empty3 = () => {
  return (
    <div className="mx-auto">
      <div className="flex flex-col items-center justify-between">
        <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-warning-100 text-warning-500">
          <AlertTriangle className="size-7" />
        </div>

        <h1 className="mt-8 text-xl text-center text-gray-800 leading-[30px] font-semibold">
          Please update your project to meet community guidelines.
        </h1>

        <p className="mt-6 text-sm leading-[16.94px] text-gray-500 text-center">
          Review and adjust your project to ensure it complies with our policies
          before publishing.
        </p>

        <div className="flex items-center justify-center gap-x-1 mt-6">
          <p className="text-sm leading-[16.94px] text-gray-500">
            Read community guidelines
          </p>
          <Button variant="link">Here.</Button>
        </div>

        <div className="flex justify-center mt-8">
          <Button>Update Project</Button>
        </div>
      </div>
    </div>
  )
}

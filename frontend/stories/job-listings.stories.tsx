import * as React from "react"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowCircleBrokenUp,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronUp,
  DollarSign,
  Edit03,
  Eye,
  File02,
  Home03,
  Info,
  MapPin,
  MarkerPin02,
  MessageSquare,
  PencilLine,
  Plus,
  Search,
  Share,
  Star,
  Upload,
  UploadCloud01,
  UserEdit,
  X,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  CircularProgress,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  DisclosureTrigger,
  HeadlessRadioGroupItem,
  HelperText,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  Label,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemSelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui"

const meta: Meta = {
  title: "Job Listings",
}

export default meta

export const NDA = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-[600px]">
        <div className="p-4 pl-6 pb-3.5 flex items-start">
          <div className="flex items-start flex-1 gap-x-3">
            <IconButton className="rounded-full" variant="ghost" visual="gray">
              <ArrowLeft className="size-[18px]" />
            </IconButton>
            <div>
              <DialogTitle className="text-dark-blue-400">
                Non Disclosure Agreement (NDA)
              </DialogTitle>
              <DialogDescription>Review and sign to continue</DialogDescription>
            </div>
          </div>

          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="p-8">
          <h3 className="text-base leading-7 text-dark-blue-400">
            Confirm your name, initials and signature.
          </h3>

          <div className="mt-6 grid grid-cols-5 gap-x-4">
            <div className="col-span-3 space-y-1.5">
              <Label size="sm">Full Name</Label>
              <Input placeholder="Enter your full name" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label size="sm">Initials</Label>
              <Input placeholder="Enter your initials" />
            </div>
          </div>

          <Tabs defaultValue="Upload" className="mt-6">
            <TabsContent value="Draw">
              <div className="py-8 px-3.5 rounded-[5px] h-[180px] border border-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]" />
            </TabsContent>
            <TabsContent value="Upload">
              <div className="p-8 rounded-[5px] h-[195px] border border-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
                <div className="flex items-center justify-center">
                  <UploadCloud01 className="size-[24px] text-primary-300" />
                </div>

                <div className="mt-3">
                  <span className="block text-center text-xs text-gray-500 leading-[1.6]">
                    Upload your signature image
                  </span>
                  <span className="block mt-1 text-center text-[10px] text-gray-400 leading-[1.6]">
                    PNG, JPG, JPEG, SVG formats, up to 10MB
                  </span>
                </div>

                <div className="flex items-center mt-5 gap-x-3 justify-center">
                  <Button variant="outlined" visual="gray">
                    Cancel
                  </Button>
                  <Button variant="outlined" visual="gray">
                    <Upload className="15px" /> Browse File
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsList className="mt-6 grid grid-cols-2 gap-x-3">
              <DisclosureTrigger value="Upload" asChild>
                <Button variant="light" size="sm">
                  <Upload className="size-[15px]" /> Upload my signature
                </Button>
              </DisclosureTrigger>
              <DisclosureTrigger value="Draw" asChild>
                <Button variant="light" size="sm">
                  <PencilLine className="size-[15px]" /> Draw my signature
                </Button>
              </DisclosureTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6">
            <p className="text-xs leading-[1.6] text-gray-400">
              By selecting Sign NDA, I agree that my electronic signature and
              initials are the legally binding equivalent of my handwritten
              signature and initials for this NDA and any related documents I
              sign on Marketeq.
            </p>
          </div>
        </div>

        <div className="py-4 px-6 flex rounded-b-xl border-t border-gray-200 bg-gray-25 items-center justify-between">
          <Button variant="link" visual="gray">
            Cancel
          </Button>
          <Button>Sign NDA</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const ApplyToJoin = () => {
  const [state, setState] = React.useState<string>()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-[515px]">
        <div className="p-3 pl-5 border-b border-gray-200 flex items-center justify-between">
          <DialogTitle className="text-dark-blue-400">
            Apply to join “Marketeq Client Portal” project
          </DialogTitle>

          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="p-6">
          <h1 className="text-base leading-8 text-dark-blue-400">
            Select Pay Rate
          </h1>

          <p className="text-sm font-light mt-3 text-dark-blue-400 leading-none">
            The pay rate listed on your profile differs from the job posting.
            Please select a pay rate option to improve your chances of matching
            with the role.
          </p>

          <RadioGroup
            value={state}
            onValueChange={setState}
            className="grid gap-y-2.5 mt-6"
          >
            <RadioGroupItemSelector value="item-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-sm leading-5 font-medium text-dark-blue-400">
                    Client Rate
                  </h1>
                  <p className="text-sm font-light text-dark-blue-400">
                    The pay rate listed in the job description.
                  </p>
                </div>

                <div className="text-sm font-semibold text-dark-blue-400">
                  <span className="text-xs text-dark-blue-400">$</span>
                  45
                  <span className="text-xs text-dark-blue-400">/hr</span>
                </div>
              </div>
            </RadioGroupItemSelector>
            {state === "item-2" ? (
              <div className="p-5 pt-3 border-2 border-primary-500 bg-white rounded-lg">
                <h1 className="font-medium text-sm text-dark-blue-400">
                  Your Profile Rate
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  A pay rate listed on your profile.
                </p>

                <RadioGroup defaultValue="item-1" className="mt-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-5">
                      <RadioGroupItem value="item-1" />

                      <Label size="sm">Senior UX/UI Designer</Label>
                    </div>

                    <span className="text-xs leading-[18px] text-dark-blue-400">
                      ${" "}
                      <span className="text-sm font-semibold text-dark-blue-400">
                        65
                      </span>{" "}
                      /hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-5">
                      <RadioGroupItem value="item-2" />

                      <Label size="sm">Design System Manager</Label>
                    </div>

                    <span className="text-xs leading-[18px] text-dark-blue-400">
                      ${" "}
                      <span className="text-sm font-semibold text-dark-blue-400">
                        52
                      </span>{" "}
                      /hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-5">
                      <RadioGroupItem value="item-3" />

                      <Label size="sm">UX Manager</Label>
                    </div>

                    <span className="text-xs leading-[18px] text-dark-blue-400">
                      ${" "}
                      <span className="text-sm font-semibold text-dark-blue-400">
                        97
                      </span>{" "}
                      /hr
                    </span>
                  </div>
                </RadioGroup>
              </div>
            ) : (
              <RadioGroupItemSelector value="item-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h1 className="text-sm leading-5 font-medium text-dark-blue-400">
                      Client Rate
                    </h1>
                    <p className="text-sm font-light text-dark-blue-400">
                      The pay rate listed in the job description.
                    </p>
                  </div>
                </div>
              </RadioGroupItemSelector>
            )}

            {state === "item-3" ? (
              <div className="border-2 bg-white border-primary-500 p-5 pt-3 rounded-lg">
                <div className="flex items-center gap-x-5 pb-5 border-b border-gray-200">
                  <RadioGroupItem value="item-3" />

                  <div className="space-y-0.5">
                    <h1 className="text-sm leading-5 font-medium text-dark-blue-400">
                      Custom Rate
                    </h1>
                    <p className="text-sm leading-5 font-light text-dark-blue-400">
                      Custom Rate
                    </p>
                  </div>
                </div>

                <div className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-[5px]">
                      <h1 className="text-sm font-medium leading-none text-dark-blue-400">
                        Client Rate
                      </h1>

                      <p className="text-xs font-light leading-none text-dark-blue-400">
                        This is what the client will see
                      </p>
                    </div>

                    <div className="flex items-center gap-x-2 pr-2.5">
                      <InputGroup>
                        <InputLeftAddon className="inline-flex items-center gap-x-1">
                          USD <Info className="size-4" />
                        </InputLeftAddon>
                        <Input
                          placeholder="$78"
                          className="field-sizing-content [direction:rtl]"
                        />
                      </InputGroup>

                      <span className="inline-block text-base leading-6 text-gray-500">
                        /hr
                      </span>
                    </div>
                  </div>

                  <div className="border border-gray-300 flex items-center gap-x-3 bg-gray-25 mt-6 rounded-lg p-4">
                    <AlertCircle className="text-gray-500 size-5" />

                    <div className="space-y-1 flex-1">
                      <h1 className="text-sm font-semibold leading-5 text-gray-600">
                        Marketeq Service Fee (20%)
                      </h1>

                      <p className="text-sm text-gray-500">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit.
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-x-2">
                      <Input
                        className="disabled:opacity-50 field-sizing-content"
                        placeholder="$13"
                        disabled
                      />
                      <span className="text-base leading-6 text-gray-500">
                        /hr
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="space-y-[5px]">
                      <h1 className="text-sm font-medium leading-none text-dark-blue-400">
                        Your Earnings
                      </h1>
                      <p className="text-xs font-light text-dark-blue-400">
                        Estimated take-home pay after fees
                      </p>
                    </div>

                    <div className="flex items-center gap-x-2 pr-2.5">
                      <InputGroup>
                        <InputLeftAddon className="inline-flex items-center gap-x-1">
                          USD <Info className="size-4" />
                        </InputLeftAddon>
                        <Input
                          placeholder="$78"
                          className="field-sizing-content [direction:rtl]"
                        />
                      </InputGroup>

                      <span className="inline-block text-base leading-6 text-gray-500">
                        /hr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <RadioGroupItemSelector value="item-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h1 className="text-sm leading-5 font-medium text-dark-blue-400">
                      Client Rate
                    </h1>
                    <p className="text-sm font-light text-dark-blue-400">
                      The pay rate listed in the job description.
                    </p>
                  </div>
                </div>
              </RadioGroupItemSelector>
            )}
          </RadioGroup>
        </div>

        <div className="p-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-dark-blue-400">
            Step 2 of 2
          </span>
          <div className="inline-flex items-center gap-x-3">
            <Button variant="ghost" visual="gray">
              Back
            </Button>
            <Button>Next</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Application = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <div className="flex items-center justify-end">
          <Button variant="ghost" visual="gray">
            <X className="size-[15px]" />
          </Button>
        </div>

        <h1 className="text-lg font-semibold mt-6 text-dark-blue-400 text-center">
          Your application has been sent for
        </h1>

        <p className="text-base text-center font-light mt-3 text-dark-blue-400">
          Marketeq Client Portal
          <span className="font-light text-base leading-none">
            UX Architect
          </span>
        </p>

        <div className="border border-gray-200 bg-white rounded-lg mt-8 p-5 space-y-5">
          <div className="flex items-start justify-between gap-x-3">
            <div className="space-y-2">
              <h1 className="text-xs font-semibold text-dark-blue-400">
                Your Message
              </h1>
              <p className="text-xs text-dark-blue-400">
                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed
                diam nonumy eirmod tempor invidunt ut...
              </p>
            </div>

            <Button className="text-xs" variant="link">
              View my application
            </Button>
          </div>

          <div className="flex items-start justify-between gap-x-3">
            <div className="space-y-2">
              <h1 className="text-xs font-semibold text-dark-blue-400">
                Pay Rate
              </h1>
              <p className="text-xs text-dark-blue-400">Client: $39/hour</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-sm leading-[36px] font-semibold">
          Track your application in{" "}
          <Button variant="link">My Saved Jobs</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Apply = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-[515px]">
        <div className="border-b border-gray-200 p-3 pl-5 flex justify-between items-center gap-x-8">
          <h1 className="text-base text-dark-blue-400 text-base font-bold">
            Apply to join “Marketeq Client Portal” project
          </h1>

          <IconButton variant="ghost" visual="gray">
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="h-[689px] scrollbar-thin scrollbar-thumb-gray-200 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-3">
              <Input placeholder="UX Architect" />

              <HelperText size="sm" className="text-dark-blue-400">
                Your profile and relevant matching information will be sent to
                the client for this open role.
              </HelperText>
            </div>

            <div className="mt-8">
              <div className="flex gap-x-5">
                <div className="space-y-2">
                  <div className="relative">
                    <CircularProgress
                      size={86}
                      strokeWidth={4}
                      show={false}
                      value={85}
                    />
                    <Avatar
                      containerClassName="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      size="2xl"
                    >
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                  </div>

                  <span className="block text-xs text-center leading-none font-medium text-dark-blue-400">
                    92% match
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <h1 className="text-base font-bold leading-none text-dark-blue-400 leading-none">
                      Pelumi{" "}
                      <span className="text-sm font-light leading-none"></span>
                    </h1>
                    <p className="text-xs leading-none font-semibold text-dark-blue-400">
                      Senior UX/UI Designer
                    </p>
                    <p className="text-xs leading-none font-light text-dark-blue-400">
                      years of experience
                    </p>
                  </div>

                  <div className="flex items-center gap-x-1">
                    <MapPin className="size-4 text-dark-blue-400" />
                    <span className="text-xs text-dark-blue-400 leading-none">
                      Vatican
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-y-6 border-gray-200">
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-x-2">
                      <UserEdit className="size-[15px] text-gray-500" />
                      <span className="text-sm font-bold leading-none text-dark-blue-400">
                        Job Title
                      </span>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <CircularProgress
                        size={20}
                        strokeWidth={2}
                        show={false}
                        value={85}
                      />

                      <span className="inline-block font-medium text-xs text-dark-blue-400">
                        85% match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-none text-gray-500">
                    Min Requirement: UX Architect
                  </p>

                  <Badge variant="circular" visual="gray">
                    <Check className="size-3 text-primary-500" /> UX Architect
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-x-2">
                      <UserEdit className="size-[15px] text-gray-500" />
                      <span className="text-sm font-bold leading-none text-dark-blue-400">
                        Job Title
                      </span>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <CircularProgress
                        size={20}
                        strokeWidth={2}
                        show={false}
                        value={85}
                      />

                      <span className="inline-block font-medium text-xs text-dark-blue-400">
                        85% match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-none text-gray-500">
                    Min Requirement: UX Architect
                  </p>

                  <Badge variant="circular" visual="gray">
                    <Check className="size-3 text-primary-500" /> UX Architect
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-x-2">
                      <UserEdit className="size-[15px] text-gray-500" />
                      <span className="text-sm font-bold leading-none text-dark-blue-400">
                        Job Title
                      </span>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <CircularProgress
                        size={20}
                        strokeWidth={2}
                        show={false}
                        value={85}
                      />

                      <span className="inline-block font-medium text-xs text-dark-blue-400">
                        85% match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-none text-gray-500">
                    Min Requirement: UX Architect
                  </p>

                  <Badge variant="circular" visual="gray">
                    <Check className="size-3 text-primary-500" /> UX Architect
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-x-2">
                      <UserEdit className="size-[15px] text-gray-500" />
                      <span className="text-sm font-bold leading-none text-dark-blue-400">
                        Job Title
                      </span>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <CircularProgress
                        size={20}
                        strokeWidth={2}
                        show={false}
                        value={85}
                      />

                      <span className="inline-block font-medium text-xs text-dark-blue-400">
                        85% match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-none text-gray-500">
                    Min Requirement: UX Architect
                  </p>

                  <Badge variant="circular" visual="gray">
                    <Check className="size-3 text-primary-500" /> UX Architect
                  </Badge>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t space-y-3 border-gray-200">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold" size="sm">
                    Write a short message to the hiring manager{" "}
                    <span className="font-light">(optional)</span>
                  </Label>

                  <span className="text-xs leading-none text-dark-blue-400">
                    0/200
                  </span>
                </div>

                <Textarea
                  className="h-[128px]"
                  placeholder="What makes you the best candidate?"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 flex border-t border-gray-200 bg-white rounded-b-xl items-center justify-between">
          <h1 className="text-sm font-medium text-dark-blue-400">
            Step 1 of 2
          </h1>

          <Button>Next</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const JobInfo = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-[700px]">
        <div className="p-6 flex items-center justify-between border-b border-gray-200">
          <div className="space-y-2">
            <DialogTitle className="text-dark-blue-400">Job Info</DialogTitle>
            <DialogDescription>
              Create a compelling job listing that attracts the right
              candidates!
            </DialogDescription>
          </div>

          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray">
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="space-y-1.5">
            <Label className="font-semibold text-dark-blue-400" size="md">
              Project Title
            </Label>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Write a clear title that accurately describes your project.
              </p>

              <span className="text-xs text-gray-500 leading-none">0/120</span>
            </div>

            <Input className="w-full" />
          </div>

          <div className="space-y-1.5 mt-6">
            <Label className="font-semibold text-dark-blue-400" size="md">
              Project Type
            </Label>

            <p className="text-sm text-gray-500">
              Select the category that best represents your project scope.
            </p>

            <Input />
          </div>
          <div className="space-y-3 mt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-x-2">
                <Label className="font-semibold text-dark-blue-400" size="md">
                  Include a Non-Disclosure Agreement (NDA)? 
                </Label>
                <AlertCircle className="size-4 text-gray-400" />
              </div>

              <p className="text-sm text-gray-500">
                We'll generate an NDA with your company name. Candidates must
                sign it before they can view your project scope or team.
              </p>
            </div>

            <RadioGroup className="flex items-center gap-x-2">
              <HeadlessRadioGroupItem
                value="item-1"
                className="text-dark-blue-400 text-sm font-bold leading-none data-[state=checked]:text-primary-500 focus-visible:outline-none px-4 py-2.5 rounded-full data-[state=checked]:bg-primary-25 border-[2px] border-primary-500 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]"
              >
                Yes, Include NDA
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-2"
                className="text-dark-blue-400 text-sm font-bold leading-none data-[state=checked]:text-primary-500 focus-visible:outline-none px-4 py-2.5 rounded-full data-[state=checked]:bg-primary-25 border-[2px] border-primary-500 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]"
              >
                No NDA
              </HeadlessRadioGroupItem>
            </RadioGroup>
          </div>
        </div>

        <div className="py-4 px-6 flex rounded-b-xl bg-gray-25 items-center justify-between">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" />
            Cancel
          </Button>
          <Button>Sign NDA</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Public = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 rounded-xl">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Publish this job?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your job will be visible live in the job board.
          </DialogDescription>
        </div>

        <div className="px-6 py-4 flex items-center border-t border-gray-200 justify-between bg-gray-25 rounded-b-xl">
          <DialogClose asChild>
            <Button variant="link" visual="gray">
              <X className="size-[15px]" />
              Cancel
            </Button>
          </DialogClose>

          <Button variant="outlined" visual="gray">
            Yes, Publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const RequiredSkills = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-w-[700px]">
        <div className="p-6 pb-[50px]">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-dark-blue-400">Job Info</DialogTitle>
              <DialogDescription>
                Create a compelling job listing that attracts the right
                candidates!
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="mt-8">
            <Input className="w-auto" placeholder="UX Designer" />
          </div>

          <div className="mt-8">
            <InputGroup>
              <InputLeftElement>
                <Search className="size-5 text-gray-400" />
              </InputLeftElement>
              <Input placeholder="Search for skills" />
            </InputGroup>
          </div>
        </div>

        <div className="py-4 px-6 flex border-t rounded-b-xl bg-gray-25 items-center justify-between">
          <Button variant="link" visual="gray">
            <X className="size-[15px]" />
            Cancel
          </Button>
          <Button>Sign NDA</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Locked = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-10", className)}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x={0.75}
        y={0.75}
        width={38.5}
        height={38.5}
        rx={19.25}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M16.056 18.2V15c0-1.06.468-2.078 1.301-2.828.834-.75 1.964-1.172 3.143-1.172s2.31.421 3.143 1.172 1.301 1.767 1.301 2.828v3.2m-10.666 0h12.444c.982 0 1.778.716 1.778 1.6v5.6c0 .884-.796 1.6-1.778 1.6H14.278c-.982 0-1.778-.716-1.778-1.6v-5.6c0-.884.796-1.6 1.778-1.6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const Blocked = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[352px] bg-transparent shadow-none"
        dialogOverlay={
          <DialogOverlay className="bg-white/80 backdrop-blur-md" />
        }
      >
        <div className="flex items-center justify-center">
          <Locked className="text-dark-blue-400" />
        </div>

        <div className="mt-6">
          <h1 className="text-[20px] font-semibold text-center leading-none text-dark-blue-400">
            This contract is currently under NDA
          </h1>
          <p className="text-center leading-none text-sm text-gray-500">
            To view the scope please sign NDA
          </p>

          <div className="mt-6 flex items-center justify-center">
            <Button variant="outlined" visual="gray">
              Sign NDA
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-[10px] text-center text-gray-500 leading-none font-light">
              Signing the NDA does not accept the offer.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const UpgradeNow = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[265px] p-4"
        dialogOverlay={
          <DialogOverlay className="bg-white/50 backdrop-blur-md" />
        }
      >
        <div className="flex items-start gap-x-4">
          <div className="size-10 rounded-lg border-[1.5px] flex-none inline-flex items-center justify-center border-gray-200">
            <ArrowCircleBrokenUp className="size-5 text-primary-500" />
          </div>

          <div className="flex-auto">
            <h1 className="text-sm leading-5 text-gray-950 font-semibold">
              Upgrade your account to see client info
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              In order to see detailed client info, you will have to have a
              premium membership.{" "}
            </p>

            <Button className="mt-4 text-sm font-semibold" variant="link">
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const TotalEarningsOpportunity = () => {
  return (
    <div className="p-5 rounded-[8px] border bg-white border-gray-200 drop-shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="pb-5 border-b border-gray-200">
        <div className="flex items-center gap-x-3">
          <h1 className="text-sm leading-none font-bold text-dark-blue-400">
            Total Earnings Opportunity
          </h1>
          <Info className="size-3.5 shrink-0 text-gray-500" />
        </div>

        <div className="mt-5 flex items-center gap-x-[2.48px]">
          <span className="text-[19.86px] leading-none text-dark-blue-400">
            $
          </span>
          <span className="text-[29.79px] text-dark-blue-400 leading-none font-semibold">
            66,777
          </span>
        </div>

        <div className="mt-5">
          <div className="py-2 px-3 bg-primary-25 flex items-center justify-between rounded-[4px]">
            <span className="text-xs leading-none text-dark-blue-400">
              Based on your offer rate of{" "}
              <span className="font-bold">$67/hr</span>
            </span>
            <Button variant="link">View Details</Button>
          </div>
        </div>
      </div>

      <div className="mt-5 pb-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-light text-dark-blue-400">
            Work Schedule
          </span>

          <span className="text-[13px] text-dark-blue-400 leading-none font-semibold">
            Full-Time 40 hrs<span className="font-normal">/wk</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-light text-dark-blue-400">
            Duration
          </span>

          <span className="text-[13px] text-dark-blue-400 leading-none font-semibold">
            6 months
          </span>
        </div>
      </div>

      <div className="flex items-center mt-5 justify-between">
        <span className="text-[13px] font-light leading-none text-dark-blue-400">
          Anticipated Start Date
        </span>

        <span className="text-[13px] leading-none text-dark-blue-400 font-semibold">
          Jan 30th, 2025
        </span>
      </div>
    </div>
  )
}

export const About = () => {
  return (
    <div className="p-5 rounded-[8px] border bg-white border-gray-200 drop-shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="pb-5 border-b border-gray-200">
        <div className="flex items-center gap-x-2">
          <Avatar size="md">
            <AvatarImage src="/man.jpg" alt="Man" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>

          <div className="flex-auto space-y-1.5">
            <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
              Bitcoin Master Devs
            </h1>
            <div className="flex items-center gap-x-0.5">
              <MarkerPin02 className="size-[10px]" />
              <span className="text-[10px] text-dark-blue-400 font-light leading-none">
                Moscow, Russia
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="py-1.5 px-2 inline-flex rounded-[5px] items-center justify-center text-white border border-gray-300">
              <DollarSign className="size-3.5 text-success-500" />
              <span className="text-[12px] leading-none text-dark-blue-400">
                Payment Verified
              </span>
            </div>

            <Button
              className="text-dark-blue-400"
              variant="outlined"
              visual="gray"
            >
              <Plus className="size-[15px]" />
              Follow
            </Button>
          </div>
        </div>
      </div>

      <div className="pb-5 border-b space-y-5 border-gray-200 mt-5">
        <div className="flex items-center gap-x-3">
          <div className="py-1 px-2 rounded-[4px] drop-shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)] gap-x-1 bg-gray-200 text-gray-500 inline-flex items-center justify-center">
            <Star className="text-gray-500" />{" "}
            <span className="text-gray-500 text-xs font-medium leading-none">
              0.0
            </span>
          </div>

          <span className="text-xs leading-none text-dark-blue-400">
            no reviews yet
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] leading-none font-light text-dark-blue-400">
            no reviews yet
          </span>
          <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
            101
          </span>
        </div>
      </div>

      <div className="space-y-5 mt-5">
        <div className="space-y-3">
          <h1 className="text-sm block font-bold text-dark-blue-400">About</h1>

          <p className="block text-[13px] text-dark-blue-400 leading-none">
            Lorem ipsum dolor sit amet consectetur. Eget mauris elit morbi
            tellus morbi.
          </p>
        </div>

        <Button className="w-full" variant="outlined" visual="gray">
          <MessageSquare className="size-[15px]" />
          Message
        </Button>

        <div className="flex items-center gap-x-1.5 justify-center">
          <h1 className="text-xs leading-none text-dark-blue-400">
            Member since
          </h1>
          <h1 className="text-xs leading-none font-semibold text-dark-blue-400">
            Sep 2024
          </h1>
        </div>
      </div>
    </div>
  )
}

const Robots = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-5", className)}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.334 17.5v-4.167q0-.687.49-1.177.488-.49 1.176-.49h10q.688 0 1.177.49t.49 1.177V17.5zM7.5 10.833q-1.729 0-2.948-1.218-1.218-1.22-1.218-2.948 0-1.73 1.218-2.948Q5.771 2.499 7.5 2.5h5q1.73 0 2.948 1.219 1.22 1.218 1.219 2.948 0 1.728-1.219 2.948-1.218 1.218-2.948 1.218zm-2.5 5h10v-2.5H5zm2.5-6.666h5a2.4 2.4 0 0 0 1.771-.73q.73-.729.73-1.77 0-1.042-.73-1.771a2.4 2.4 0 0 0-1.77-.73h-5a2.4 2.4 0 0 0-1.772.73A2.4 2.4 0 0 0 5 6.666q0 1.042.73 1.771a2.4 2.4 0 0 0 1.77.73m0-1.667q.354 0 .594-.24t.24-.593a.8.8 0 0 0-.24-.594.8.8 0 0 0-.594-.24.8.8 0 0 0-.594.24.8.8 0 0 0-.24.594q0 .354.24.593.24.24.594.24m5 0q.354 0 .594-.24t.24-.593a.8.8 0 0 0-.24-.594.8.8 0 0 0-.594-.24.8.8 0 0 0-.594.24.8.8 0 0 0-.24.594q0 .354.24.593.24.24.594.24"
      fill="currentColor"
    />
  </svg>
)

const Wand = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-5", className)}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6.54183 10.8749L8.3335 13.7499C8.48627 13.986 8.69808 14.0832 8.96891 14.0415C9.23975 13.9999 9.40988 13.8402 9.47933 13.5624L10.0627 11.229L15.7502 16.9165C15.9029 17.0693 16.0939 17.1492 16.3231 17.1561C16.5522 17.1631 16.7502 17.0832 16.9168 16.9165C17.0696 16.7638 17.146 16.5693 17.146 16.3332C17.146 16.0971 17.0696 15.9027 16.9168 15.7499L11.2293 10.0415L13.5627 9.45822C13.8404 9.38877 14.0002 9.21863 14.0418 8.9478C14.0835 8.67697 13.9863 8.46516 13.7502 8.31238L10.8752 6.54155L11.1252 3.14571C11.1529 2.86794 11.0418 2.66655 10.7918 2.54155C10.5418 2.41655 10.3127 2.44433 10.1043 2.62488L7.50016 4.81238L4.35433 3.54155C4.09044 3.43044 3.86127 3.4721 3.66683 3.66655C3.47238 3.86099 3.43072 4.09016 3.54183 4.35405L4.81266 7.49988L2.62516 10.0832C2.44461 10.2915 2.41683 10.5207 2.54183 10.7707C2.66683 11.0207 2.86822 11.1318 3.146 11.104L6.54183 10.8749ZM17.2085 5.29155C17.2918 5.20822 17.3335 5.11099 17.3335 4.99988C17.3335 4.88877 17.2918 4.79155 17.2085 4.70821L16.1252 3.62488C16.0418 3.54155 15.9446 3.49988 15.8335 3.49988C15.7224 3.49988 15.6252 3.54155 15.5418 3.62488L14.4585 4.70821C14.3752 4.79155 14.3335 4.88877 14.3335 4.99988C14.3335 5.11099 14.3752 5.20822 14.4585 5.29155L15.5418 6.37488C15.6252 6.45822 15.7224 6.49988 15.8335 6.49988C15.9446 6.49988 16.0418 6.45822 16.1252 6.37488L17.2085 5.29155ZM8.43766 10.7707L7.43766 9.12488L5.50016 9.27072L6.75016 7.79155L6.021 5.99988L7.81266 6.72905L9.29183 5.49988L9.146 7.41655L10.7918 8.43738L8.91683 8.89572L8.43766 10.7707ZM5.29183 17.2082L6.37516 16.1249C6.4585 16.0415 6.50016 15.9443 6.50016 15.8332C6.50016 15.7221 6.4585 15.6249 6.37516 15.5415L5.29183 14.4582C5.2085 14.3749 5.11127 14.3332 5.00016 14.3332C4.88905 14.3332 4.79183 14.3749 4.7085 14.4582L3.62516 15.5415C3.54183 15.6249 3.50016 15.7221 3.50016 15.8332C3.50016 15.9443 3.54183 16.0415 3.62516 16.1249L4.7085 17.2082C4.79183 17.2915 4.88905 17.3332 5.00016 17.3332C5.11127 17.3332 5.2085 17.2915 5.29183 17.2082Z"
      fill="#98A2B3"
    />
  </svg>
)

export const SmartAssistant = () => {
  return (
    <div className="p-5 rounded-[8px] min-h-screen flex flex-col border bg-white border-gray-200 drop-shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h1 className="text-base leading-6 text-dark-blue-400">
          Smart Assistant
        </h1>

        <Robots className="text-gray-400" />
      </div>

      <div className="flex-1 p-5 pb-0">
        <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
          Carify what this role involves
        </h1>
        <p className="text-sm leading-5 mt-1 text-dark-blue-400">
          Carify what this role involves
        </p>

        <div className="mt-6 inline-flex items-start flex-col gap-y-2">
          <span className="px-6 py-2.5 text-dark-blue-400 inline-block text-sm rounded-full border border-gray-300">
            Add more specifics
          </span>
          <span className="px-6 py-2.5 text-dark-blue-400 inline-block text-sm rounded-full border border-gray-300">
            Simplify the task list
          </span>
          <span className="px-6 py-2.5 text-dark-blue-400 inline-block text-sm rounded-full border border-gray-300">
            Group similar tasks
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="p-3 pl-2.5 rounded-lg bg-gray-50 border border-gray-300 gap-y-3 flex flex-col">
          <h1 className="text-sm text-gray-400">I want to change…</h1>

          <div className="flex items-center justify-between">
            <Wand className="text-gray-400" />

            <button className="inline-flex justify-center text-white focus-visible:outline-none items-center shrink-0 size-6 rounded-full bg-primary-500 opacity-50">
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Editing = () => {
  return (
    <div className="bg-gray-50">
      <div className="px-[100px] py-[50px]">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">
              <Home03 className="size-[18px]" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Jobs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Mobile Applications</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href="#">iOS Development </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <div className="mt-6">
          <div className="flex items-start gap-x-8">
            <div className="flex-1">
              <div className="border bg-white rounded-lg border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start gap-x-5">
                    <div className="flex-1">
                      <Badge visual="gray">Mobile Application</Badge>
                      <h1 className="text-[28px] mt-3 font-bold leading-none text-dark-blue-400">
                        UX Designer
                      </h1>
                      <p className="text-[28px] mt-2 font-medium leading-none text-gray-500">
                        The Ultimate Mobile App Experience
                      </p>
                    </div>

                    <div className="flex items-center gap-x-3">
                      <IconButton visual="gray" variant="ghost">
                        <Edit03 className="size-4" />
                      </IconButton>
                      <Button>Publish</Button>
                      <Button variant="outlined" visual="gray">
                        <Eye className="size-3" /> Preview Job
                      </Button>
                      <IconButton variant="outlined" visual="gray">
                        <Share className="size-5" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-4.5 flex items-center gap-x-6">
                    <div className="flex items-center gap-x-2">
                      <span className="text-xs inline-block leading-none text-dark-blue-400">
                        Posted 2 days ago
                      </span>
                      <span className="inline-block size-1 rounded-full shrink-0 text-dark-blue-400" />
                      <span className="font-medium text-dark-blue-400 text-xs leading-none">
                        Full time job
                      </span>
                    </div>

                    <div className="flex items-center gap-x-3">
                      <span className="inline-flex text-xs leading-none text-dark-blue-400 gap-x-1 px-2 py-1.5 rounded-[5px] bg-white border border-gray-300">
                        <DollarSign className="size-3.5 text-success-600" />
                        Payment Verified
                      </span>
                      <span className="inline-flex text-xs leading-none text-dark-blue-400 gap-x-1 px-2 py-1.5 rounded-[5px] bg-white border border-gray-300">
                        <File02 className="size-3.5 text-primary-500" /> NDA
                        Required
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h1 className="text-[13px] leading-none font-medium text-dark-blue-400">
                    41 required skills
                  </h1>
                  <div className="mt-3 gap-x-6">
                    <Badge size="lg" visual="gray">
                      Visual Design
                    </Badge>
                    <Badge size="lg" visual="gray">
                      Tailwind CSS
                    </Badge>
                    <Badge size="lg" visual="gray">
                      Next.js
                    </Badge>
                    <Badge size="lg" visual="gray">
                      Wireframing
                    </Badge>
                    <Badge size="lg" visual="gray">
                      Figma
                    </Badge>
                    <Badge size="lg" visual="gray">
                      Axure RP
                    </Badge>
                    <IconButton visual="gray">
                      <Edit03 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 mt-6 bg-white rounded-lg">
                <Tabs defaultValue="Project Description">
                  <TabsList className="justify-start">
                    <TabsTrigger value="Project Description">
                      Project Description
                    </TabsTrigger>
                    <TabsTrigger value="Project Scope">
                      Project Scope
                    </TabsTrigger>
                    <TabsTrigger value="Project Team">Project Team</TabsTrigger>
                  </TabsList>

                  <TabsContent className="p-6" value="Project Description">
                    <h1 className="text-xl font-bold text-dark-blue-400">
                      Project Overview
                    </h1>
                    <p className="mt-3 text-sm font-light text-dark-blue-400">
                      Front-end Technologies & Web Accessibility | Exploring
                      Human Interface Design
                    </p>
                    <p className="mt-3 text-sm font-light text-dark-blue-400">
                      I’m passionate about crafting intuitive, user-friendly
                      digital experiences with a strong focus on accessibility
                      and human-centered design. With expertise in HTML, CSS,
                      JavaScript, and modern frameworks, I create seamless
                      interfaces that enhance usability for all users, including
                      those with disabilities. I believe technology should be
                      inclusive, aesthetically engaging, and functionally
                      efficient.
                    </p>
                    <p className="mt-3 text-sm font-light text-dark-blue-400">
                      I’m always exploring the latest trends in UI/UX and human
                      interface design to ensure that every project balances
                      innovation with practicality. Whether it’s optimizing
                      website performance, implementing responsive design, or
                      improving accessibility compliance, I take a
                      detail-oriented approach to building digital products that
                      truly connect with users. I thrive on solving complex
                      design challenges and turning ideas into meaningful,
                      interactive experiences.
                    </p>
                  </TabsContent>

                  <TabsContent className="relative" value="Project Scope">
                    <div className="p-6">
                      <div className="rounded-lg bg-white border border-gray-200 overflow-hidden shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                        <div className="flex items-center gap-x-4 p-3">
                          <div className="flex-1 flex items-center gap-x-2">
                            <IconButton variant="ghost" visual="gray">
                              <ChevronUp className="size-5" />
                            </IconButton>
                            <span className="inline-flex text-lg text-gray-700 items-center gap-x-1.5">
                              <span className="font-bold">Phase One</span>{" "}
                              Research
                            </span>
                          </div>

                          <div className="flex items-center gap-x-8">
                            <div className="inline-flex items-center gap-x-2">
                              <span className="text-[13px] text-dark-blue-400 font-semibold leading-none">
                                Day 1
                              </span>
                              <span className="text-[13px] text-dark-blue-400 font-semibold leading-none">
                                -
                              </span>
                              <span className="text-[13px] text-dark-blue-400 font-semibold leading-none">
                                Day 8
                              </span>
                            </div>

                            <Button variant="outlined" visual="gray">
                              <Plus className="size-[15px]" />
                              Add task
                            </Button>
                          </div>
                        </div>

                        <table className="border-collapsed">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-6 border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                                Task
                              </th>
                              <th className="px-6 border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                                Description
                              </th>
                              <th className="px-6 border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                                Assignee
                              </th>
                              <th className="px-6 border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                                Duration
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-5 text-dark-blue-400">
                                Consumer Research
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm line-clamp-2 leading-5 text-dark-blue-400">
                                Conduct research to understand consumer needs,
                                behaviors, and preferences for product
                                optimization.
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-xs leading-[16.26px] text-dark-blue-400">
                                <div className="inline-flex items-center gap-x-2">
                                  <Avatar>
                                    <AvatarImage src="/man.jpg" alt="Man" />
                                    <AvatarFallback>M</AvatarFallback>
                                  </Avatar>
                                  <div className="inline-flex gap-y-0.5">
                                    <span className="inline-block">Vivek</span>
                                    <span className="inline-block">
                                      @topdesigner321
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                                40 hours
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-5 text-dark-blue-400">
                                Consumer Research
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm line-clamp-2 leading-5 text-dark-blue-400">
                                Conduct research to understand consumer needs,
                                behaviors, and preferences for product
                                optimization.
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-xs leading-[16.26px] text-dark-blue-400">
                                <div className="inline-flex items-center gap-x-2">
                                  <Avatar>
                                    <AvatarImage src="/man.jpg" alt="Man" />
                                    <AvatarFallback>M</AvatarFallback>
                                  </Avatar>
                                  <div className="inline-flex gap-y-0.5">
                                    <span className="inline-block">Vivek</span>
                                    <span className="inline-block">
                                      @topdesigner321
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                                40 hours
                              </td>
                            </tr>
                            <tr>
                              <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-5 text-dark-blue-400">
                                Consumer Research
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm line-clamp-2 leading-5 text-dark-blue-400">
                                Conduct research to understand consumer needs,
                                behaviors, and preferences for product
                                optimization.
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-xs leading-[16.26px] text-dark-blue-400">
                                <div className="inline-flex items-center gap-x-2">
                                  <Avatar>
                                    <AvatarImage src="/man.jpg" alt="Man" />
                                    <AvatarFallback>M</AvatarFallback>
                                  </Avatar>
                                  <div className="inline-flex gap-y-0.5">
                                    <span className="inline-block">Vivek</span>
                                    <span className="inline-block">
                                      @topdesigner321
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                                40 hours
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="h-[442px] absolute inset-0 bg-white/80 flex flex-col justify-center backdrop-blur-sm">
                      <div className="max-w-[352px] mx-auto">
                        <div className="flex items-center justify-center">
                          <Locked className="text-dark-blue-400" />
                        </div>

                        <div className="mt-6">
                          <h1 className="text-[20px] font-semibold text-center leading-none text-dark-blue-400">
                            This contract is currently under NDA
                          </h1>
                          <p className="text-center leading-none text-sm text-gray-500">
                            To view the scope please sign NDA
                          </p>

                          <div className="mt-6 flex items-center justify-center">
                            <Button variant="outlined" visual="gray">
                              Sign NDA
                            </Button>
                          </div>

                          <div className="mt-6">
                            <p className="text-[10px] text-center text-gray-500 leading-none font-light">
                              Signing the NDA does not accept the offer.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="Project Team">
                    <div className="rounded-b-lg bg-white border border-gray-200 overflow-hidden shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                      <table className="border-collapsed w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-6 text-left border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                              <div className="inline-flex items-center gap-x-1">
                                Role
                                <ArrowDown className="size-3" />
                              </div>
                            </th>
                            <th className="px-6 text-left border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                              Desired Location(s)
                            </th>
                            <th className="px-6 text-left border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                              Applicants
                            </th>
                            <th className="px-6 text-left border-y border-gray-200 py-3 text-xs font-medium text-dark-blue-400 leading-[18px]">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-[16.26px] text-dark-blue-400">
                              <span className="inline-flex flex-col gap-y-0.5">
                                Solutions architect
                                <span className="text-xs leading-[16.26px] text-gray-500">
                                  {" "}
                                  Senior Level{" "}
                                </span>
                              </span>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4">
                              <div className="inline-flex items-center gap-x-2 flex-wrap">
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  USA
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  Colombia
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  2 more...
                                </div>
                              </div>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                              307 applications
                            </td>
                            <td className="border-b border-gray-200 px-6 py-4">
                              <Badge visual="gray">Open</Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-[16.26px] text-dark-blue-400">
                              <span className="inline-flex flex-col gap-y-0.5">
                                Solutions architect
                                <span className="text-xs leading-[16.26px] text-gray-500">
                                  {" "}
                                  Senior Level{" "}
                                </span>
                              </span>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4">
                              <div className="inline-flex items-center gap-x-2 flex-wrap">
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  USA
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  Colombia
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  2 more...
                                </div>
                              </div>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                              307 applications
                            </td>
                            <td className="border-b border-gray-200 px-6 py-4">
                              <Badge visual="gray">Open</Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="border-b border-gray-200 px-6 py-4 font-semibold text-sm leading-[16.26px] text-dark-blue-400">
                              <span className="inline-flex flex-col gap-y-0.5">
                                Solutions architect
                                <span className="text-xs leading-[16.26px] text-gray-500">
                                  {" "}
                                  Senior Level{" "}
                                </span>
                              </span>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4">
                              <div className="inline-flex items-center gap-x-2 flex-wrap">
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  USA
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  Colombia
                                </div>
                                <div className="inline-flex items-center px-2 font-medium text-xs text-gray-700 leading-[18px] shrink-0 py-[5px] bg-white border border-gray-200 rounded-[5px]">
                                  2 more...
                                </div>
                              </div>
                            </td>

                            <td className="border-b border-gray-200 px-6 py-4 font-light text-sm leading-5 text-dark-blue-400">
                              307 applications
                            </td>
                            <td className="border-b border-gray-200 px-6 py-4">
                              <Badge visual="gray">Open</Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="w-[345px] flex flex-col gap-y-6 shrink-0">
              <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                <div className="pb-5 border-b border-gray-200">
                  <div className="flex items-center gap-x-1.5">
                    <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                      Total Earnings Opportunity
                    </h1>
                    <Info className="size-3.5" />
                  </div>

                  <div className="mt-5 flex items-center gap-x-[2.48px]">
                    <span className="text-[19.89px] leading-none text-dark-blue-400/50">
                      $
                    </span>
                    <h1 className="text-[29.79px] leading-none text-dark-blue-400 font-semibold">
                      66,777
                    </h1>
                  </div>

                  <div className="mt-5">
                    <div className="h-[31px] flex text-xs text-dark-blue-400 items-center justify-between bg-primary-25 rounded-[4px] py-2 px-3">
                      Based on your offer rate of{" "}
                      <span className="font-bold">$67/hr</span>{" "}
                      <Button variant="link">View Details</Button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-5 pb-5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] leading-none text-dark-blue-400 font-light">
                      Work Schedule
                    </span>

                    <span className="text-[13px] leading-none text-dark-blue-400 font-semibold">
                      Full-Time 40 hrs<span className="font-normal">/wk</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] leading-none text-dark-blue-400 font-light">
                      Duration
                    </span>

                    <span className="text-[13px] leading-none text-dark-blue-400 font-semibold">
                      6 months
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="font-light text-[13px] leading-none text-dark-blue-400">
                    Anticipated Start Date
                  </span>

                  <span className="text-[13px] leading-none text-dark-blue-400 font-semibold">
                    Jan 30th, 2025
                  </span>
                </div>
              </div>

              <div className="mt-6 relative">
                <div className="p-5 rounded-lg border border-gray-200 bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                  <div className="border-b border-gray-200 pb-5">
                    <div className="flex items-center gap-x-8">
                      <Avatar size="sm">
                        <AvatarImage src="/logo-03.png" alt="Logo" />
                        <AvatarFallback>L</AvatarFallback>
                      </Avatar>

                      <div className="space-y-1.5">
                        <h1 className="text-sm leading-none text-dark-blue-400 font-semibold">
                          Bitcoin Master Devs
                        </h1>

                        <div className="flex items-center gap-x-1">
                          <MarkerPin02 className="size-[10px]" />
                          <span className="font-light text-[10px] leading-none text-dark-blue-400">
                            Moscow, Russia
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="rounded-[5px] text-xs inline-flex items-center gap-x-1 font-semibold text-dark-blue-400 bg-white py-1.5 px-2 border border-gray-300">
                        <DollarSign className="text-success-500 size-3.5" />{" "}
                        Payment Verified
                      </div>

                      <Button
                        className="rounded-full"
                        variant="outlined"
                        size="md"
                        visual="gray"
                      >
                        <Plus className="size-[15px]" /> Follow
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 pb-5 space-y-5 border-b border-gray-200">
                    <div className="flex items-center gap-x-3">
                      <div className="py-1 px-2 text-xs gap-x-1 font-medium text-gray-500 bg-gray-200 rounded-sm flex items-center drop-shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
                        <Star className="size-3 text-gray-500" /> 0.0
                      </div>

                      <span className="text-xs leading-none text-dark-blue-400">
                        no reviews yet
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-light text-dark-blue-400">
                        Open Projects
                      </span>

                      <span className="text-[13px] font-semibold text-dark-blue-400 leading-none">
                        101
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="space-y-5">
                      <h1 className="text-sm leading-none font-bold text-dark-blue-400">
                        About
                      </h1>

                      <p className="text-[13px] leading-none font-light text-dark-blue-400">
                        Lorem ipsum dolor sit amet consectetur. Eget mauris elit
                        morbi tellus morbi.
                      </p>
                    </div>

                    <div className="mt-5">
                      <Button
                        className="w-full"
                        variant="outlined"
                        visual="gray"
                      >
                        <MessageSquare className="size-[15px]" />
                        Message
                      </Button>

                      <div className="mt-5 flex text-xs items-center text-dark-blue-400 justify-center gap-x-1.5">
                        Member since{" "}
                        <span className="font-semibold">Sep 2024</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg absolute inset-0 bg-white/50 backdrop-blur-xs flex flex-col justify-center">
                  <div className="p-4 border rounded-xl bg-white max-w-[265px] mx-auto">
                    <div className="flex items-start gap-x-4">
                      <div className="size-10 rounded-lg border-[1.5px] flex-none inline-flex items-center justify-center border-gray-200">
                        <ArrowCircleBrokenUp className="size-5 text-primary-500" />
                      </div>

                      <div className="flex-auto">
                        <h1 className="text-sm leading-5 text-gray-950 font-semibold">
                          Upgrade your account to see client info
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                          In order to see detailed client info, you will have to
                          have a premium membership.{" "}
                        </p>

                        <Button
                          className="mt-4 text-sm font-semibold"
                          variant="link"
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

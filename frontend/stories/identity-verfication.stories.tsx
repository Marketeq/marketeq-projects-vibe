import Image from "next/image"
import { cn } from "@/utils/functions"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Certificate02,
  CheckCircle,
  ChevronRight,
  ClockStopwatch,
  CreditCardCheck,
  FileCheck02,
  Flash,
  Info,
  Monitor01,
  Passport,
  RefreshCw,
  Repeat03,
  RotateCcw,
  Webcam02,
  X,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  IconButton,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui"

const meta: Meta = {
  title: "Identity Verification",
}

export default meta

export const Default = () => {
  return (
    <div className="min-h-screen flex justify-center flex-col gap-y-12 px-5 py-6">
      <div className="space-y-8">
        <h1 className="text-[22px] text-center font-semibold text-dark-blue-400 leading-none">
          Scan your passport
        </h1>

        <div className="flex items-center justify-center">
          <Button className="underline cursor-pointer" variant="link">
            <ArrowLeft className="size-[15px]" /> Change document type
          </Button>
        </div>
      </div>

      <div className="gap-y-6 flex items-center flex-col">
        <Button className="cursor-pointer">
          <Webcam02 className="size-[15px]" /> Start Scanning
        </Button>

        <Button className="cursor-pointer" variant="link" visual="gray">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export const Exit = () => {
  return (
    <div className="min-h-screen flex justify-center flex-col gap-y-12 px-5 py-6">
      <div>
        <h1 className="text-[18px] text-center font-semibold text-dark-blue-400 leading-none">
          Are you sure you want to exit?
        </h1>

        <p className="mt-3 text-center text-sm text-dark-blue-400">
          Your verification process will not be saved
        </p>

        <div className="flex flex-col gap-y-3 mt-12">
          <Button>Continue scanning</Button>
          <Button variant="outlined" visual="gray">
            Exit
          </Button>
        </div>
      </div>
    </div>
  )
}

export const ExitModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[456px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          Are you sure you want to exit?
        </h1>

        <p className="text-sm mt-2 text-center leading-5 text-dark-blue-400">
          Your verification process will not be saved
        </p>

        <div className="mt-[50px] grid grid-cols-2 gap-x-3">
          <Button variant="outlined" size="md">
            Cancel
          </Button>
          <Button size="md">Exit</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const ChangeLocation = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[456px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <p className="text-sm mt-5 text-center leading-5 text-dark-blue-400">
          You’re logging in from a location outside your usual one. Just
          checking if you’re still away.
        </p>

        <div className="mt-[50px] grid grid-cols-2 gap-x-3">
          <Button variant="outlined" size="md">
            I’m still traveling
          </Button>
          <Button size="md">Change my home country</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Verify = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[418px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <p className="text-sm mt-5 text-center leading-5 text-dark-blue-400">
          Please verify your identity before continuing with you location
          verification
        </p>

        <div className="mt-[50px] flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Cancel
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            Verify My Identity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const CircleCheck = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("size-[40px]", className)}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width={40} height={40} rx={20} fill="#12B76A" />
      <path
        d="M26.6668 15L17.5002 24.1667L13.3335 20"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const Scan03 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Passport
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <div className="w-[262px] h-[179.6px] absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
            <SquaredScannable01 className="absolute left-1/2 bottom-[8.87px] -translate-x-1/2" />
          </div>

          <CircleCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

const SquaredScannable01 = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("width-[255px] h-[38px]", className)}
      viewBox="0 0 255 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x={1.23584}
        y={1.23584}
        width={252.119}
        height={35.4285}
        rx={3.29567}
        fill="#12B76A"
        fillOpacity={0.25}
      />
      <path
        d="M11.1229 1.23584H4.53151C2.71136 1.23584 1.23584 2.71136 1.23584 4.53151V11.1229"
        stroke="#12B76A"
        strokeWidth={2.47176}
        strokeLinecap="round"
      />
      <path
        d="M243.468 1.23584H250.059C251.879 1.23584 253.355 2.71136 253.355 4.53151V11.1229"
        stroke="#12B76A"
        strokeWidth={2.47176}
        strokeLinecap="round"
      />
      <path
        d="M11.1229 36.6641H4.53151C2.71136 36.6641 1.23584 35.1885 1.23584 33.3684V26.777"
        stroke="#12B76A"
        strokeWidth={2.47176}
        strokeLinecap="round"
      />
      <path
        d="M243.468 36.6641H250.059C251.879 36.6641 253.355 35.1885 253.355 33.3684V26.777"
        stroke="#12B76A"
        strokeWidth={2.47176}
        strokeLinecap="round"
      />
    </svg>
  )
}

export const Scan02 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Passport
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <div className="w-[262px] h-[179.6px] absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
            <SquaredScannable01 className="absolute left-1/2 bottom-[8.87px] -translate-x-1/2" />
          </div>

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

const SquaredScannable = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("h-[211px] w-[293px]", className)}
      viewBox="0 0 293 211"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#a)" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
        <path d="M30.886 1.25H7.177A3.387 3.387 0 0 0 3.79 4.637v23.71M259.886 1.25h23.709a3.387 3.387 0 0 1 3.387 3.387v23.71M30.886 202.442H7.177a3.387 3.387 0 0 1-3.387-3.387v-23.709m256.096 27.096h23.709a3.386 3.386 0 0 0 3.387-3.387v-23.709" />
      </g>
      <defs>
        <filter
          id="a"
          x={0}
          y={0}
          width={292.466}
          height={210.466}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx={0.847} dy={3.387} />
          <feGaussianBlur stdDeviation={1.694} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_13105_2777"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_13105_2777"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

export const Scan01 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Passport
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <SquaredScannable className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2" />

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

const SquaredScannable03 = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("w-[293px] h-[193px]", className)}
    width={293}
    height={193}
    viewBox="0 0 293 193"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g filter="url(#a)" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <path d="M30.886 1.25H7.177A3.387 3.387 0 0 0 3.79 4.637v23.71M259.694 1.25h23.709a3.387 3.387 0 0 1 3.387 3.387v23.71M30.886 184.25H7.177a3.387 3.387 0 0 1-3.387-3.387v-23.709m255.904 27.096h23.709a3.386 3.386 0 0 0 3.387-3.387v-23.709" />
    </g>
    <defs>
      <filter
        id="a"
        x={0}
        y={0}
        width={292.274}
        height={192.274}
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dx={0.847} dy={3.387} />
        <feGaussianBlur stdDeviation={1.694} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_13107_2314"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_13107_2314"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
)

export const Scan05 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute scale-[.9] left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <SquaredScannable03 className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2" />

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

const SquaredScannable02 = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("h-[293px] w-[193px]", className)}
      viewBox="0 0 293 193"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        filter="url(#a)"
        stroke="#12b76a"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <path d="M30.886 1.25H7.177A3.387 3.387 0 0 0 3.79 4.637v23.71M259.694 1.25h23.709a3.387 3.387 0 0 1 3.387 3.387v23.71M30.886 184.25H7.177a3.387 3.387 0 0 1-3.387-3.387v-23.709m255.904 27.096h23.709a3.386 3.386 0 0 0 3.387-3.387v-23.709" />
      </g>
      <defs>
        <filter
          id="a"
          x={0}
          y={0}
          width={292.274}
          height={192.274}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx={0.847} dy={3.387} />
          <feGaussianBlur stdDeviation={1.694} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_13107_2425"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect1_dropShadow_13107_2425"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

export const Scan06 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute scale-[.55] left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <SquaredScannable02 className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2" />

          <CircleCheck className="absolute size-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

const SquareScannable04 = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={258}
      height={73}
      viewBox="0 0 258 73"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_d_13105_3145)">
        <rect
          x={4.5}
          y={1.5}
          width={247}
          height={62}
          rx={4}
          fill="#12B76A"
          fillOpacity={0.25}
          shapeRendering="crispEdges"
        />
        <path
          d="M20.5 1.5H8.5C6.29086 1.5 4.5 3.29086 4.5 5.5V17.5"
          stroke="#12B76A"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M235.5 1.5H247.5C249.709 1.5 251.5 3.29086 251.5 5.5V17.5"
          stroke="#12B76A"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M20.5 63.5H8.5C6.29086 63.5 4.5 61.7091 4.5 59.5V47.5"
          stroke="#12B76A"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M235.5 63.5H247.5C249.709 63.5 251.5 61.7091 251.5 59.5V47.5"
          stroke="#12B76A"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_13105_3145"
          x={0}
          y={0}
          width={258}
          height={73}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx={1} dy={4} />
          <feGaussianBlur stdDeviation={2} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_13105_3145"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_13105_3145"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

export const Scan08 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <div className="w-[262px] h-[179.6px] absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
            <SquaredScannable01 className="absolute left-1/2 top-[5px] -translate-x-1/2" />
          </div>

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

export const Scan09 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <Image
            className="object-contain absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2"
            src="/passport.png"
            alt="Map"
            width={262}
            height={179.6}
          />

          <div className="w-[262px] h-[179.6px] absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
            <SquaredScannable01 className="absolute left-1/2 top-[5px] -translate-x-1/2" />
          </div>

          <CircleCheck className="absolute size-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

export const Scan07 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden px-9 flex flex-col justify-center flex-1 rounded-[4.45px] border-[.56px] border-gray-200">
          <Image className="object-cover" src="/bg.jpg" alt="Map" fill />

          <div className="relative shadow-[0px_11.46px_15.29px_-3.82px_rgba(16,24,40,.08)] rounded-[12px] py-[42px] flex flex-col px-5 bg-white">
            <div className="size-10 rounded-full shrink-0 inline-flex mx-auto justify-center items-center bg-primary-50">
              <RotateCcw className="size-[15.29px] text-primary-500" />
            </div>

            <div className="mt-3">
              <h1 className="text-medium text-xs text-center leading-5 text-dark-blue-400">
                Flip your license to the back side
              </h1>
            </div>
          </div>

          <div className="flex absolute bottom-[30px] right-[30px] items-center gap-x-6">
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Flash className="size-[19.15px]" />
            </button>
            <button className="focus-visible:outline-none size-[45px] rounded-full shrink-0 bg-black/50 shadow-[0px_2.02px_4.04px_0px_rgba(16,24,40,.05)] inline-flex items-center justify-center text-white">
              <Repeat03 className="size-[19.15px]" />
            </button>
          </div>
        </div>

        <Alert variant="success">
          <AlertIcon>
            <Camera className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Scan the front of your passport.</AlertTitle>
          </AlertContent>
        </Alert>
      </div>
    </div>
  )
}

export const Scan04 = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-x-1">
          <IconButton
            variant="ghost"
            visual="gray"
            size="md"
            className="rounded-full"
          >
            <X className="size-5" />
          </IconButton>
          <h1 className="text-base leading-none font-medium text-dark-blue-400">
            Scan your Driver’s License
          </h1>
        </div>

        <Button className="underline" variant="link">
          How to Scan
        </Button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-y-5 min-h-[calc(theme(height.screen)-60px)]">
        <div className="relative overflow-hidden flex-1 grid place-items-center rounded-[4.45px] border-[.56px] border-gray-200">
          <Image
            className="object-cover"
            src="/scanning-02.png"
            alt="Map"
            fill
          />

          <div className="absolute inset-0 bg-white/50 backdrop-blur-[20.7px]" />

          <div className="text-base relative leading-7 text-gray-700">
            Processing your document...
          </div>
        </div>
      </div>
    </div>
  )
}

export const AllSet = () => {
  return (
    <div className="min-h-screen flex justify-center flex-col gap-y-12 px-5 py-6">
      <div className="space-y-8">
        <div className="flex items-center justify-center">
          <div className="size-[48px] inline-flex items-center text-success-500 justify-center border-[8px] border-success-50 bg-success-100 rounded-full">
            <CheckCircle className="size-6" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg leading-7 font-semibold text-center text-dark-blue-400">
            You’re all set!
          </h1>
          <p className="text-sm leading-5 text-center text-dark-blue-400">
            You’ve completed the scanning step.
          </p>
        </div>
      </div>

      <Button className="cursor-pointer">
        <Monitor01 className="size-[15px]" /> Return to desktop
      </Button>

      <p className="cursor-pointer text-sm leading-5 text-center max-w-[243px] mx-auto">
        Please return to your desktop to continue verification
      </p>
    </div>
  )
}

export const Selection = () => {
  return (
    <div className="min-h-screen">
      <div className="p-3 h-[60px] flex items-center justify-between">
        <IconButton
          variant="ghost"
          visual="gray"
          size="md"
          className="rounded-full"
        >
          <ArrowRight className="size-5" />
        </IconButton>
      </div>

      <div className="p-5">
        <h1 className="text-[20px] leading-none font-semibold text-dark-blue-400">
          Select a document to scan
        </h1>

        <p className="text-sm text-dark-blue-400 mt-3">
          Select one of the document types below
        </p>

        <div className="mt-[30px]">
          <div className="space-y-1.5">
            <Label size="sm">Issuing country</Label>

            <Input className="w-full" />
          </div>

          <div className="mt-8">
            <h3 className="text-sm text-dark-blue-400 font-semibold">
              Accepted Documents
            </h3>

            <div className="mt-3 space-y-2.5">
              <button className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg">
                <div className="inline-flex items-center gap-x-3">
                  <Passport className="size-5 shrink-0 text-primary-500" />{" "}
                  <span className="text-sm font-medium text-dark-blue-400">
                    Passport
                  </span>
                </div>

                <ChevronRight className="size-5 text-gray-500" />
              </button>
              <button className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg">
                <div className="inline-flex items-center gap-x-3">
                  <CreditCardCheck className="size-5 shrink-0 text-primary-500" />{" "}
                  <span className="text-sm font-medium text-dark-blue-400">
                    Driver’s License
                  </span>
                </div>

                <ChevronRight className="size-5 text-gray-500" />
              </button>
              <button className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg">
                <div className="inline-flex items-center gap-x-3">
                  <FileCheck02 className="size-5 shrink-0 text-primary-500" />{" "}
                  <span className="text-sm font-medium text-dark-blue-400">
                    Residence Permit
                  </span>
                </div>

                <ChevronRight className="size-5 text-gray-500" />
              </button>
              <button className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg">
                <div className="inline-flex items-center gap-x-3">
                  <Certificate02 className="size-5 shrink-0 text-primary-500" />{" "}
                  <span className="text-sm font-medium text-dark-blue-400">
                    Birth Certificate
                  </span>
                </div>

                <ChevronRight className="size-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ManualPassportForm = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <div className="flex items-center justify-between">
          <IconButton size="md" visual="gray" variant="ghost">
            <ArrowLeft className="size-5" />
          </IconButton>

          <IconButton size="md" visual="gray" variant="ghost">
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="mt-3 pt-[9px]">
          <h1 className="text-lg font-medium">
            Enter your <span className="font-semibold">Passport</span>{" "}
            information manually
          </h1>
          <p className="text-sm font-light text-dark-blue-400 mt-1">
            To verify your identity, please fill in your information below
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-1.5">
            <Label size="sm">Passport Number</Label>
            <Input placeholder="KX123456" />
          </div>

          <div className="space-y-1.5">
            <Label size="sm">Expiration Date</Label>
            <Input placeholder="MM/YY" />
          </div>

          <Alert>
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Scan the front of your passport.</AlertTitle>
            </AlertContent>
          </Alert>

          <div className="grid">
            <Button>Continue</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const TravelingForm = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <div className="flex items-center justify-between">
          <IconButton size="md" visual="gray" variant="ghost">
            <ArrowLeft className="size-5" />
          </IconButton>

          <DialogClose asChild>
            <IconButton
              className="text-gray-500/50 hover:text-gray-500"
              size="md"
              visual="gray"
              variant="ghost"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="mt-3 pt-[9px]">
          <h1 className="text-lg font-medium">How long are you traveling?</h1>
          <p className="text-sm font-light text-dark-blue-400 mt-1">
            You’re marked as temporarily traveling. Some features may be limited
            until you&apos;re back in your home country.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <RadioGroup>
            <div className="flex items-center gap-x-3">
              <RadioGroupItem value="item-1" />
              <Label>A few days</Label>
            </div>
            <div className="flex items-center gap-x-3">
              <RadioGroupItem value="item-2" />
              <Label>1–2 weeks</Label>
            </div>
            <div className="flex items-center gap-x-3">
              <RadioGroupItem value="item-3" />
              <Label>More than 2 weeks</Label>
            </div>
            <div className="flex items-center gap-x-3">
              <RadioGroupItem value="item-4" />
              <Label>Not sure</Label>
            </div>
          </RadioGroup>

          <Alert>
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                We’ll remind you later to check if your status has changed.
              </AlertTitle>
            </AlertContent>
          </Alert>

          <div className="grid">
            <Button variant="outlined" visual="gray">
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const TravelMode = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <div className="flex items-center justify-between">
          <IconButton size="md" visual="gray" variant="ghost">
            <ArrowLeft className="size-5" />
          </IconButton>

          <DialogClose asChild>
            <IconButton
              className="text-gray-500/50 hover:text-gray-500"
              size="md"
              visual="gray"
              variant="ghost"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="mt-3 pt-[9px]">
          <h1 className="text-lg font-medium">Travel Mode is now active!</h1>
          <p className="text-sm font-light text-dark-blue-400 mt-1">
            You’re marked as temporarily traveling. You can now use the platform
            without restrictions.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <Alert>
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                You’ll remain in Travel Mode until you return to your home
                country or update your location.
              </AlertTitle>
            </AlertContent>
          </Alert>

          <div className="grid">
            <Button>Skip</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Mismatch = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[418px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <div className="max-w-[317px] mx-auto mt-5">
          <h1 className="text-lg font-semibold text-center leading-none text-dark-blue-400">
            Your account information does not match your document
          </h1>
        </div>

        <div className="max-w-[405px] mt-2">
          <p className="text-sm text-center leading-5 text-dark-blue-400">
            Please verify your identity before continuing with you location
            verification
          </p>
        </div>

        <div className="mt-[50px] flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Enter Manually
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            <RefreshCw className="size-[15px]" />
            Rescan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const NotVerifiable = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[418px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <div className="mt-5">
          <h1 className="text-lg font-semibold text-center leading-none text-dark-blue-400">
            Couldn't Verify
          </h1>
        </div>

        <div className="max-w-[289px] mt-2">
          <p className="text-sm text-center leading-5 text-dark-blue-400">
            We could not read your document number. Please rescan it or enter it
            manually.
          </p>
        </div>

        <div className="mt-[50px] flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Enter Manually
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            <RefreshCw className="size-[15px]" />
            Rescan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const NotPublic = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <div className="mt-5">
          <h1 className="text-lg font-semibold text-center leading-none text-dark-blue-400">
            Your profile is not public
          </h1>
        </div>

        <div className="mt-2">
          <p className="text-sm text-center leading-5 text-dark-blue-400">
            To access full platform features, please verify your account
          </p>
        </div>

        <div className="mt-[50px] flex justify-center items-center gap-x-3">
          <Button size="md">Verify My Account</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const ToastContent = () => {
  return (
    <div className="rounded-xl flex items-start gap-x-5 p-4 bg-white shadow-[0px_4px_6px_-2px_rgba(16,24,40,.03)]">
      <div className="size-[66px] bg-primary-50 text-primary-500 inline-flex items-center border-[9.9px] border-primary-25 justify-center shrink-0 rounded-full">
        <ClockStopwatch className="size-[24.75px]" />
      </div>

      <div className="flex-1">
        <h1 className="text-sm text-gray-950 font-semibold">
          Your location verification was submitted.
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          We will notify you once it is reviewed.
        </p>
      </div>

      <button className="focus-visible:outline-none text-gray-500/50 hover:text-gray-500 shrink-0">
        <X className="size-5" />
      </button>
    </div>
  )
}

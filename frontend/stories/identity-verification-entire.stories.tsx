"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/utils/functions"
import { useStateMachine } from "@/utils/hooks"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Certificate02,
  CheckCircle,
  ChevronRight,
  CreditCardCheck,
  FileCheck02,
  Home03,
  Info,
  Luggage02,
  Passport,
  RefreshCw,
  Webcam02,
  X,
} from "@blend-metrics/icons"
import { WebCamera, WebCameraHandler } from "@shivantra/react-web-camera"
import { useMountedState } from "react-use"
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
  ToastAction,
  useToast,
} from "@/components/ui"
import { Meta } from "@storybook/react"

const meta: Meta = {
  title: "Identity Verification Entire",
}

export default meta

const QR = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    className={cn("size-[47px]", className)}
    {...props}
  >
    <path
      fill="url(#a)"
      d="M.97 0A.97.97 0 0 0 0 .97v13.582c0 .535.434.97.97.97h13.582a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97H.97Zm17.74 0a.97.97 0 0 0-.97.97v2.495c0 .535.434.97.97.97h.276a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h1.248V.97a.97.97 0 0 0-.97-.97h-2.495Zm3.464 2.217v1.248c0 .535.434.97.97.97h1.247V3.188a.97.97 0 0 0-.97-.97h-1.247Zm2.217 2.218v2.217h3.465a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v2.495a.97.97 0 0 1-.97.97H24.39Zm0 2.217H18.71a.97.97 0 0 0-.97.97V7.9c0 .536.434.97.97.97h2.495a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v1.247h1.247a.97.97 0 0 1 .97.97v.278c0 .535.434.97.97.97h1.247v-1.248a.97.97 0 0 1 .97-.97h.278a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97H24.39v1.247a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v1.247h3.465a.97.97 0 0 1 .97.97v1.248h1.247a.97.97 0 0 0 .97-.97v-9.147a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97V9.84a.97.97 0 0 0-.97-.97h-.278a.97.97 0 0 1-.97-.97V6.651Zm2.218 15.522H25.36a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-1.247V28.826h1.247a.97.97 0 0 1 .97.97v2.495a.97.97 0 0 1-.97.97h-2.494a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-1.248h-1.247a.97.97 0 0 1-.97-.97v-3.465h-1.248a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v1.247h2.218V19.956h-3.465a.97.97 0 0 1-.97-.97V17.74h-5.682a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97H8.87v1.248a.97.97 0 0 1-.97.97h-.278a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97H8.87v-1.248a.97.97 0 0 0-.97-.97H5.404a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97H2.217V26.61h2.218V25.36a.97.97 0 0 1 .97-.97h5.682v-1.247a.97.97 0 0 1 .97-.97h1.247v-1.247a.97.97 0 0 1 .97-.97h.278a.97.97 0 0 1 .97.97v.277a.97.97 0 0 1-.97.97h-1.248v2.217h1.248a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-1.248v1.247c0 .536.435.97.97.97h2.495a.97.97 0 0 1 .97.97v4.712c0 .536.434.97.97.97h.277a.97.97 0 0 1 .97.97v1.248H25.64a.97.97 0 0 1 .97.97v.277a.97.97 0 0 1-.97.97h-4.712a.97.97 0 0 1-.97-.97v-1.247h-1.248a.97.97 0 0 0-.97.97v2.494c0 .536.434.97.97.97h.277a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h2.495a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h6.93a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h4.712a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97h-2.494a.97.97 0 0 1-.97-.97V42.13h-1.248a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 0-.97-.97h-1.247v1.247a.97.97 0 0 1-.97.97h-3.465v1.248a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 1-.97-.97V43.1a.97.97 0 0 1 .97-.97h1.247v-5.682a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97H27.58a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97V25.36a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97v-1.247Zm6.652 17.739v-1.247a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h1.247Zm4.435 2.217H41.16a.97.97 0 0 0 .97-.97v-1.247H38.666a.97.97 0 0 0-.97.97v1.247Zm4.434-2.217h1.248a.97.97 0 0 0 .97-.97v-6.929a.97.97 0 0 0-.97-.97h-4.712a.97.97 0 0 1-.97-.97v-1.248h-2.218v1.247a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v2.495c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v2.494c0 .536.435.97.97.97h2.495a.97.97 0 0 1 .97.97v1.248Zm-6.652-11.087V27.58a.97.97 0 0 0-.97-.97h-2.494a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97H35.478Zm2.218 0h1.247a.97.97 0 0 0 .97-.97v-4.712a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h.278a.97.97 0 0 1 .97.97v1.248h1.247a.97.97 0 0 0 .97-.97v-2.495a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-.278a.97.97 0 0 0-.97-.97H43.1a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-.278a.97.97 0 0 0-.97.97v1.248h1.247a.97.97 0 0 1 .97.97v5.682Zm-2.218-6.652h-1.247a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-1.247Zm8.87 4.435H43.1a.97.97 0 0 0-.97.97v.277c0 .536.435.97.97.97h.278a.97.97 0 0 0 .97-.97v-1.247Zm-31.044 0V24.39h-2.217v2.218h2.217Zm-2.217 0H4.435v1.247c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97v-1.247Zm-8.87 0H.97a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-1.247Zm0-6.653V18.71a.97.97 0 0 0-.97-.97H.97a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h1.247ZM17.74 17.74h1.247a.97.97 0 0 0 .97-.97v-3.465H18.71a.97.97 0 0 0-.97.97v3.465ZM32.014 0a.97.97 0 0 0-.97.97v13.582c0 .535.434.97.97.97H45.595a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97H32.014ZM2.217 3.188a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.146a.97.97 0 0 1-.97.97H3.188a.97.97 0 0 1-.97-.97V3.188Zm31.044 0a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.146a.97.97 0 0 1-.97.97H34.23a.97.97 0 0 1-.97-.97V3.188ZM5.405 4.434a.97.97 0 0 0-.97.97v4.712c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97V5.405a.97.97 0 0 0-.97-.97H5.405Zm31.043 0a.97.97 0 0 0-.97.97v4.712c0 .536.435.97.97.97h4.712a.97.97 0 0 0 .97-.97V5.405a.97.97 0 0 0-.97-.97H36.448Zm-4.434 13.304a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97h-.277ZM.97 31.044a.97.97 0 0 0-.97.97V45.595c0 .536.434.97.97.97h13.582a.97.97 0 0 0 .97-.97V32.014a.97.97 0 0 0-.97-.97H.97Zm1.247 3.187a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.147a.97.97 0 0 1-.97.97H3.188a.97.97 0 0 1-.97-.97V34.23Zm3.188 1.247a.97.97 0 0 0-.97.97v4.712c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97V36.448a.97.97 0 0 0-.97-.97H5.405Zm39.913 6.652a.97.97 0 0 0-.97.97v.278c0 .535.434.97.97.97h.277a.97.97 0 0 0 .97-.97V43.1a.97.97 0 0 0-.97-.97h-.277Z"
    />
    <defs>
      <linearGradient
        id="a"
        x1={23.283}
        x2={23.283}
        y1={0}
        y2={46.565}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#032782" />
        <stop offset={1} stopColor="#306CFE" />
      </linearGradient>
    </defs>
  </svg>
)

const VPNDetected = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>VPN Detected</Button>
      </DialogTrigger>
      <DialogContent className="w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          VPN Detected
        </h1>

        <p className="text-sm mt-2 text-center leading-5 text-dark-blue-400">
          To protect the integrity of your account and to verify your actual
          location, we do not allow using vpn services.
        </p>

        <div className="mt-6">
          <p className="text-sm text-center text-dark-blue-400 leading-7">
            Please turn off your VPN to continue
          </p>
        </div>

        <div className="mt-5 flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Dismiss
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            <RefreshCw className="size-[15px]" />
            Reload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ProxyDetected = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>VPN Detected</Button>
      </DialogTrigger>
      <DialogContent className="w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          Proxy Detected
        </h1>

        <p className="text-sm mt-2 text-center leading-5 text-dark-blue-400">
          To protect the integrity of your account and to verify your actual
          location, we do not allow the use of proxy services.
        </p>

        <div className="mt-6">
          <p className="text-sm text-center text-dark-blue-400 leading-7">
            Please disable your proxy to continue
          </p>
        </div>

        <div className="mt-5 flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Dismiss
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            <RefreshCw className="size-[15px]" />
            Reload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const VPNProxyDetected = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>VPN & Proxy Detected</Button>
      </DialogTrigger>
      <DialogContent className="w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          VPN & Proxy Detected
        </h1>

        <p className="text-sm mt-2 text-center leading-5 text-dark-blue-400">
          To protect the integrity of your account and to verify your actual
          location, we do not allow the use of vpn or proxy services.
        </p>

        <div className="mt-6">
          <p className="text-sm text-center text-dark-blue-400 leading-7">
            Please disable your VPN and proxy to continue
          </p>
        </div>

        <div className="mt-5 flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Dismiss
          </Button>
          <Button
            className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
            size="md"
          >
            <RefreshCw className="size-[15px]" />
            Reload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ActionBlocked = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Action Blocked</Button>
      </DialogTrigger>
      <DialogContent className="w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          Action Blocked
        </h1>

        <div className="mt-2">
          <p className="text-sm text-center text-dark-blue-400 leading-7">
            Please disable your VPN and proxy to continue
          </p>
        </div>

        <div className="mt-6 flex justify-center items-center gap-x-3">
          <Button variant="outlined" size="md">
            Cancel
          </Button>
          <Button size="md">Verify Location</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StartVerfication = ({
  open,
  onOpenChange,
  title,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Action Blocked</Button>
      </DialogTrigger>
      <DialogContent className="w-[469px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          {title}
        </h1>

        <div className="mt-6 flex justify-center items-center gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" size="md">
              Cancel
            </Button>
          </DialogClose>
          <Button size="md">Start Verification</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const VerficationDone = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Verification</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[456px]">
        <div className="flex items-center justify-center">
          <div className="size-12 rounded-full border-[8px] inline-flex items-center justify-center text-success-500 border-success-50 bg-success-100">
            <CheckCircle className="size-6" />
          </div>
        </div>

        <h1 className="text-lg text-center font-semibold mt-5 text-dark-blue-400 leading-7">
          Your verification has been submitted
        </h1>

        <p className="text-sm text-center mt-2 text-dark-blue-400 leading-5">
          Once approved, your new location will be confirmed and your profile
          will be updated. You’ll receive a notification when the verification
          is complete.
        </p>

        <div className="mt-[50px] grid">
          <Button>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ManualEntryForm = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Manual Entry Form</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <div className="flex items-center justify-between">
          <IconButton variant="ghost" visual="gray" size="md">
            <ArrowLeft className="size-5" />
          </IconButton>

          <IconButton variant="ghost" visual="gray" size="md">
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="mt-3">
          <h1 className="text-lg font-medium leading-5 text-dark-blue-400">
            Enter your <span className="font-bold">Passport</span> information
            manually
          </h1>
          <p className="text-sm font-light mt-1 text-dark-blue-400">
            To verify your identity, please fill in your information below
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <div className="space-y-1.5">
            <Label size="sm" id="passport-number">
              Passport Number
            </Label>

            <Input id="passport-number" placeholder="KX123456" />
          </div>
          <div className="space-y-1.5">
            <Label size="sm" id="expiration-date">
              Expiration date
            </Label>

            <Input id="expiration-date" placeholder="MM/YY" />
          </div>
        </div>

        <Alert className="mt-6">
          <AlertIcon>
            <Info className="h-5 w-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>
              Your information will NOT be shared with any 3rd parties
            </AlertTitle>
          </AlertContent>
        </Alert>

        <div className="grid mt-6">
          <Button>Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const AllSet = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>All set!</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[456px]">
        <div className="flex items-center justify-center">
          <div className="size-12 rounded-full border-[8px] inline-flex items-center justify-center text-success-500 border-success-50 bg-success-100">
            <CheckCircle className="size-6" />
          </div>
        </div>

        <h1 className="text-lg text-center text-dark-blue-400 mt-5 font-semibold">
          You’re all set!
        </h1>
        <p className="text-sm text-center text-dark-blue-400 leading-5 mt-2">
          Your identity and location have been successfully verified. You can
          now access all platform features.
        </p>

        <div className="mt-[50px] grid">
          <Button>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function IdentityVerification() {
  const getIsMounted = useMountedState()
  const [state, send] = useStateMachine("ideal", {
    ideal: {
      NEXT: "home-country-showcase",
      NO: "current-location-showcase",
    },
    "home-country-showcase": {
      NEXT: "add-doc-showcase",
      BACK: "ideal",
    },
    "add-doc-showcase": {
      NEXT: "scan",
      BACK: "home-country-showcase",
    },
    scan: {
      BACK: "add-doc-showcase",
      NEXT: "all-set",
    },
    "all-set": {},
    "current-location-showcase": {
      BACK: "ideal",
      NEXT: "traveling-showcase",
    },
    "traveling-showcase": {
      BACK: "current-location-showcase",
      NEXT: "travel-mode",
    },
    "travel-mode": {
      BACK: "traveling-showcase",
    },
  })
  const { toast } = useToast()
  const cameraHandler = useRef<WebCameraHandler>(null)
  const [images, setImages] = useState<string[]>([])

  if (state === "ideal") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="space-y-2 flex-auto">
              <h1 className="text-lg leading-none text-dark-blue-400">
                We detected your current location as:
              </h1>
              <p className="text-lg font-bold text-dark-blue-400">
                New York, NY, United States
              </p>
            </div>

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

          <div className="rounded-lg overflow-hidden relative mt-6 h-[170px]">
            <Image
              className="object-cover"
              src="/map.png"
              alt="Map"
              sizes="100vw"
              fill
            />
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold text-center text-dark-blue-400">
              Is this your home country?
            </h1>

            <div className="mt-6 flex items-center justify-center gap-x-3">
              <Button
                size="md"
                variant="outlined"
                visual="gray"
                onClick={() => send("NO")}
              >
                No, I’m currently traveling
              </Button>
              <Button
                className="bg-primary-50 hover:bg-primary-500 hover:text-white"
                size="md"
                variant="ghost"
                onClick={() => send("NEXT")}
              >
                Yes, this is my home country
              </Button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-xs leading-none text-gray-500">
                Your data is encrypted and handled securely.{" "}
                <Link href="#" className="focus-visible:outline-none underline">
                  Learn More
                </Link>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "home-country-showcase") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Please confirm your home country
              </h1>
            </div>

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

          <div className="mt-8">
            <div className="space-y-1.5">
              <Label size="sm" className="text-dark-blue-400">
                Issuing country
              </Label>
              <Input className="w-full" placeholder="United States" />
            </div>

            <div className="mt-8">
              <h3 className="text-sm text-dark-blue-400 font-semibold">
                Accepted Documents
              </h3>

              <div className="mt-3 space-y-2.5">
                <button
                  onClick={() => send("NEXT")}
                  className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
                >
                  <div className="inline-flex items-center gap-x-3">
                    <Passport className="size-5 shrink-0 text-primary-500" />{" "}
                    <span className="text-sm font-medium text-dark-blue-400">
                      Passport
                    </span>
                  </div>

                  <ChevronRight className="size-5 text-gray-500" />
                </button>
                <button
                  onClick={() => send("NEXT")}
                  className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
                >
                  <div className="inline-flex items-center gap-x-3">
                    <CreditCardCheck className="size-5 shrink-0 text-primary-500" />{" "}
                    <span className="text-sm font-medium text-dark-blue-400">
                      Driver’s License
                    </span>
                  </div>

                  <ChevronRight className="size-5 text-gray-500" />
                </button>
                <button
                  onClick={() => send("NEXT")}
                  className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
                >
                  <div className="inline-flex items-center gap-x-3">
                    <FileCheck02 className="size-5 shrink-0 text-primary-500" />{" "}
                    <span className="text-sm font-medium text-dark-blue-400">
                      Residence Permit
                    </span>
                  </div>

                  <ChevronRight className="size-5 text-gray-500" />
                </button>
                <button
                  onClick={() => send("NEXT")}
                  className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
                >
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
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "add-doc-showcase") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                How would you like to add your document?
              </h1>
            </div>

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

          <div className="mt-8">
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between rounded-lg border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]"
            >
              <div className="flex items-center gap-x-3">
                <Webcam02 className="size-5 text-primary-500" />
                <h1 className="text-sm leading-none font-medium text-dark-blue-400">
                  Take a photo with your webcam
                </h1>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>

            <div className="mt-6 flex gap-x-3 items-center">
              <span className="h-px inline-block flex-1 bg-gray-200" />
              <span className="text-xs leading-5 font-medium text-gray-500">
                Or
              </span>
              <span className="h-px inline-block flex-1 bg-gray-200" />
            </div>

            <div className="mt-6">
              <div className="p-3 pl-[18px] flex items-center gap-x-3 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                <QR className="shrink-0" />

                <div className="space-y-0.5">
                  <h1 className="text-sm leading-none font-medium text-dark-blue-400">
                    Scan with your mobile device
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    Scan the QR code to use the camera on you mobile device
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "scan") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Scan your Passport
              </h1>
            </div>

            <div className="flex items-center gap-x-7">
              <Button className="underline underline-offset-4" variant="link">
                How to Scan
              </Button>
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
          </div>

          <div className="relative rounded-[5px] overflow-hidden mt-3.5 border border-gray-200 h-[373px]">
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 5 }}
              captureMode="back"
              ref={cameraHandler}
            />
          </div>

          <div className="mt-3">
            <Alert variant="success">
              <AlertIcon>
                <Camera className="h-5 w-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>Scan the front of your passport.</AlertTitle>
              </AlertContent>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "all-set") {
    return (
      <Dialog>
        <DialogContent className="max-w-[456px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-12 rounded-full inline-flex items-center justify-center bg-success-100 border-[8px] border-success-50">
              <CheckCircle className="size-6" />
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-lg text-center fold-semibold leading-7 text-dark-blue-400">
              You’re all set!
            </h1>

            <p className="mt-2 text-sm text-dark-blue-400 text-center">
              Your identity and location have been successfully verified. You
              can now access all platform features.
            </p>

            <div className="mt-[50px] grid">
              <Button>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "current-location-showcase") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between">
            <IconButton
              size="md"
              visual="gray"
              variant="ghost"
              onClick={() => send("BACK")}
            >
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

          <div className="mt-3">
            <h1 className="text-lg font-medium text-dark-blue-400">
              Tell us more about you current location
            </h1>
            <p className="mt-1 font-light text-dark-blue-400 max-w-[460px]">
              This helps us confirm if you’re changing your home country or just
              on a short trip.
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
            >
              <div className="inline-flex items-center gap-x-3">
                <Luggage02 className="size-5 shrink-0 text-primary-500" />{" "}
                <span className="text-sm font-medium text-dark-blue-400">
                  Temporarily traveling
                </span>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
            >
              <div className="inline-flex items-center gap-x-3">
                <Home03 className="size-5 shrink-0 text-primary-500" />{" "}
                <span className="text-sm font-medium text-dark-blue-400">
                  Permanently relocated
                </span>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "traveling-showcase") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between">
            <IconButton
              size="md"
              visual="gray"
              variant="ghost"
              onClick={() => send("BACK")}
            >
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

          <div className="mt-3 max-w-[554px]">
            <h1 className="text-lg font-medium text-dark-blue-400">
              How long are you traveling?
            </h1>
            <p className="mt-1 font-light text-dark-blue-400">
              You’re marked as temporarily traveling. Some features may be
              limited until you are back in your home country.
            </p>
          </div>

          <RadioGroup className="mt-6 space-y-2.5">
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="A few days" id="item-1" />{" "}
              <Label id="item-1">A few days</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="1–2 weeks" id="item-2" />{" "}
              <Label id="item-2">1–2 weeks</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="More than 2 weeks" id="item-3" />{" "}
              <Label id="item-3">More than 2 weeks</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="Not sure" id="item-4" />{" "}
              <Label id="item-4">Not sure</Label>
            </div>
          </RadioGroup>

          <Alert className="mt-6">
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                We’ll remind you later to check if your status has changed.
              </AlertTitle>
            </AlertContent>
          </Alert>

          <div className="grid grid-cols-2 gap-x-3 mt-6">
            <Button variant="outlined" visual="gray">
              Skip
            </Button>
            <Button onClick={() => send("NEXT")}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (state === "travel-mode") {
    return (
      <Dialog defaultOpen>
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between">
            <IconButton
              size="md"
              visual="gray"
              variant="ghost"
              onClick={() => send("BACK")}
            >
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

          <div className="mt-3 max-w-[554px]">
            <h1 className="text-lg font-medium text-dark-blue-400">
              Travel Mode is now active!
            </h1>
            <p className="mt-1 font-light text-dark-blue-400">
              You’re marked as temporarily traveling. You can now use the
              platform without restrictions.
            </p>
          </div>

          <Alert className="mt-6">
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

          <div className="mt-6 grid">
            <Button
              onClick={() => {
                toast({
                  title: "Phase added below",
                  variant: "success",
                  action: (
                    <ToastAction
                      altText="Undo"
                      className="ml-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-hidden"
                    >
                      Undo
                    </ToastAction>
                  ),
                })
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}

export function IdentityVerificationRoot() {
  return (
    <>
      <VPNDetected />
      <ActionBlocked />
      <ManualEntryForm />
      <ProxyDetected />
      <VPNProxyDetected />
      <VerficationDone />
      <AllSet />
      <IdentityVerification />
    </>
  )
}

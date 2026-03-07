import { SVGProps } from "react"
import { cn } from "@/utils/functions"
import { X } from "@blend-metrics/icons"
import * as RadixTabs from "@radix-ui/react-tabs"
import { Meta } from "@storybook/react"
import NextImage from "@/components/next-image"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Video Player Modal",
}

export default meta

const VidePlayer = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-[19.08px]", className)}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.3687 19.3653C15.6378 19.3653 19.9092 15.0938 19.9092 9.82473C19.9092 4.55563 15.6378 0.28418 10.3687 0.28418C5.09957 0.28418 0.828125 4.55563 0.828125 9.82473C0.828125 15.0938 5.09957 19.3653 10.3687 19.3653ZM14.2442 10.3247C14.6418 10.1025 14.6418 9.547 14.2442 9.32481L8.87769 6.32523C8.48017 6.10304 7.98326 6.38078 7.98326 6.82516L7.98326 12.8243C7.98326 13.2687 8.48017 13.5464 8.87769 13.3242L14.2442 10.3247Z"
      fill="currentColor"
    />
  </svg>
)

export const Default = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[885.66px] rounded-none p-0 shadow-none bg-transparent">
        <RadixTabs.Tabs defaultValue="album-1">
          <div className="group">
            <DialogClose className="group-hover:opacity-100 opacity-0 absolute z-10 transition duration-300 hover:border-black hover:text-white hover:bg-black inline-flex items-center justify-center text-gray-500 -right-[22px] -top-[22px] size-11 border shrink-0 border-gray-200 bg-white rounded-full">
              <X className="size-6" />
            </DialogClose>

            <RadixTabs.Content
              className="opacity-0 data-[state=active]:opacity-100 transition duration-300"
              value="album-1"
            >
              <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden">
                <NextImage
                  className="object-cover"
                  src="/building.jpg"
                  alt="Building"
                  fill
                  sizes="25vw"
                />
                <div className="absolute p-8 bottom-0 inset-x-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
                  <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                    Image Title
                  </h1>
                </div>
              </div>
            </RadixTabs.Content>
            <RadixTabs.Content
              className="opacity-0 data-[state=active]:opacity-100 transition duration-300"
              value="album-2"
            >
              <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden">
                <NextImage
                  className="object-cover"
                  src="/building.jpg"
                  alt="Building"
                  fill
                  sizes="25vw"
                />
                <div className="absolute p-8 bottom-0 inset-x-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
                  <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                    Image Title
                  </h1>
                </div>
              </div>
            </RadixTabs.Content>
            <RadixTabs.Content
              className="opacity-0 data-[state=active]:opacity-100 transition duration-300"
              value="album-3"
            >
              <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden">
                <NextImage
                  className="object-cover"
                  src="/building.jpg"
                  alt="Building"
                  fill
                  sizes="25vw"
                />
                <div className="absolute p-8 bottom-0 inset-x-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
                  <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                    Image Title
                  </h1>
                </div>
              </div>
            </RadixTabs.Content>
            <RadixTabs.Content
              className="opacity-0 data-[state=active]:opacity-100 transition duration-300"
              value="album-4"
            >
              <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden">
                <NextImage
                  className="object-cover"
                  src="/building.jpg"
                  alt="Building"
                  fill
                  sizes="25vw"
                />
                <div className="absolute p-8 bottom-0 inset-x-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
                  <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                    Image Title
                  </h1>
                </div>
              </div>
            </RadixTabs.Content>
            <RadixTabs.Content
              className="opacity-0 data-[state=active]:opacity-100 transition duration-300"
              value="album-5"
            >
              <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden">
                <NextImage
                  className="object-cover"
                  src="/building.jpg"
                  alt="Building"
                  fill
                  sizes="25vw"
                />
                <div className="absolute p-8 bottom-0 inset-x-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
                  <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                    Image Title
                  </h1>
                </div>
              </div>
            </RadixTabs.Content>
          </div>

          <RadixTabs.List className="pt-6 flex gap-x-6 items-center">
            <RadixTabs.Trigger
              value="album-1"
              className="group relative transition duration-300 data-[state=active]:ring-2 data-[state=active]:ring-white h-[55px] w-[82px] shrink-0 rounded-[5px] overflow-hidden"
            >
              <NextImage
                className="object-cover"
                src="/building.jpg"
                alt="Building"
                fill
                sizes="25vw"
              />
              <div className="group-data-[state=active]:opacity-100 opacity-0 transition-opacity duration-300 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=active]:opacity-100">
                <VidePlayer className="text-white" />
              </div>
            </RadixTabs.Trigger>
            <RadixTabs.Trigger
              value="album-2"
              className="group relative transition duration-300 data-[state=active]:ring-2 data-[state=active]:ring-white h-[55px] w-[82px] shrink-0 rounded-[5px] overflow-hidden"
            >
              <NextImage
                className="object-cover"
                src="/building.jpg"
                alt="Building"
                fill
                sizes="25vw"
              />
            </RadixTabs.Trigger>
            <RadixTabs.Trigger
              value="album-3"
              className="group relative transition duration-300 data-[state=active]:ring-2 data-[state=active]:ring-white h-[55px] w-[82px] shrink-0 rounded-[5px] overflow-hidden"
            >
              <NextImage
                className="object-cover"
                src="/building.jpg"
                alt="Building"
                fill
                sizes="25vw"
              />
            </RadixTabs.Trigger>
            <RadixTabs.Trigger
              value="album-4"
              className="group relative transition duration-300 data-[state=active]:ring-2 data-[state=active]:ring-white h-[55px] w-[82px] shrink-0 rounded-[5px] overflow-hidden"
            >
              <NextImage
                className="object-cover"
                src="/building.jpg"
                alt="Building"
                fill
                sizes="25vw"
              />
            </RadixTabs.Trigger>
            <RadixTabs.Trigger
              value="album-5"
              className="group relative transition duration-300 data-[state=active]:ring-2 data-[state=active]:ring-white h-[55px] w-[82px] shrink-0 rounded-[5px] overflow-hidden"
            >
              <NextImage
                className="object-cover"
                src="/building.jpg"
                alt="Building"
                fill
                sizes="25vw"
              />
            </RadixTabs.Trigger>
          </RadixTabs.List>
        </RadixTabs.Tabs>
      </DialogContent>
    </Dialog>
  )
}

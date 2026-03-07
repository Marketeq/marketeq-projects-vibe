import * as React from "react"
import Link from "next/link"
import {
  AtlassianBrand,
  GmailBrand,
  GoogleMeetBrand,
  ShopifyBrand,
  SlackBrand,
  TiktokBrand,
} from "@blend-metrics/icons/brands"
import { Meta } from "@storybook/react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Command",
  parameters: {
    layout: "centered",
    design: {
      type: "figma",
      url: "https://www.figma.com/file/kZ8j7MB6ONYIOy27cG290j/BM---Workflow---Development?type=design&node-id=961-72439&mode=design&t=eSRdYRP0E2StqRM1-4",
    },
  },
}

export default meta

export const Default = () => {
  const [value, onValueChange] = React.useState("")

  return (
    <Command value={value} onValueChange={onValueChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup className="pb-4" heading="Workflow Steps">
          <HoverCard>
            <HoverCardTrigger asChild>
              <CommandItem value="slack">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <SlackBrand className="h-4 w-4 flex-none" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-800">
                    New Message received
                  </span>
                  <span className="text-xs text-gray-500">Slack</span>
                </div>
              </CommandItem>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">Id</span>
                <span className="text-xs italic text-gray-500">
                  ex. 129390293
                </span>
              </div>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">
                  Sender
                </span>
                <span className="text-xs italic text-gray-500">
                  ex. John Doe
                </span>
              </div>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">
                  Channel
                </span>
                <span className="text-xs italic text-gray-500">
                  ex. #general
                </span>
              </div>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">
                  Timestamp
                </span>
                <span className="text-xs italic text-gray-500">
                  ex. 023-06-08T10:30:00
                </span>
              </div>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">
                  Content
                </span>
                <span className="text-xs italic text-gray-500">
                  ex. Hey everyone, just a quick reminder ab...
                </span>
              </div>
              <div className="flex h-10 flex-col p-1 pl-3.5">
                <span className="text-xs font-medium text-gray-800">
                  Flagged
                </span>
                <span className="text-xs italic text-gray-500">ex. true</span>
              </div>
              <Link
                className="mt-2.5 pl-3.5 text-xs font-medium text-primary-500 focus-visible:outline-none"
                href="#"
              >
                Show Advanced...
              </Link>
            </HoverCardContent>
          </HoverCard>
          <CommandItem value="google meet">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
              <GoogleMeetBrand className="h-4 w-4 flex-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-800">
                Create a new meeting
              </span>
              <span className="text-xs text-gray-500">Slack</span>
            </div>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Connected Apps">
          <CommandItem value="gmail">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
              <GmailBrand className="h-4 w-4 flex-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-800">Gmail</span>
              <span className="text-xs text-gray-500">
                Workflow will continue if new emails are received, email are
                flagged, or if emails are read
              </span>
            </div>
          </CommandItem>
          <CommandItem value="tiktok">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
              <TiktokBrand className="h-4 w-4 flex-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-800">Tiktok</span>
              <span className="text-xs text-gray-500">
                Workflow will continue if a new video is posted or if a video
                received likes or comments
              </span>
            </div>
          </CommandItem>
          <CommandItem value="atlassian">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
              <AtlassianBrand className="h-4 w-4 flex-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-800">
                Atlassian
              </span>
              <span className="text-xs text-gray-500">
                Workflow will continue if issues are updated or created
              </span>
            </div>
          </CommandItem>
          <CommandItem value="shopify">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
              <ShopifyBrand className="h-4 w-4 flex-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-800">Shopify</span>
              <span className="text-xs text-gray-500">
                Workflow will continue when a new products are created or new
                orders are received
              </span>
            </div>
          </CommandItem>
        </CommandGroup>

        <div className="p-2.5">
          <span className="text-xs leading-[14.52px] text-gray-400">
            Can&apos;t find what you need?{" "}
            <Link className="text-primary-500 underline" href="#">
              Connect an app
            </Link>{" "}
            or{" "}
            <Link className="text-primary-500 underline" href="#">
              {" "}
              create an integration.
            </Link>
          </span>
        </div>
      </CommandList>
    </Command>
  )
}

import { ChevronDown } from "@blend-metrics/icons"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

export default function MarketplaceGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="xs:max-lg:hidden py-1.5 flex border-t border-gray-200 bg-[#FAFBFB] items-center gap-x-[30px] px-[50px] shadow-[0px_1px_3px_0px_theme(colors.gray.900/.1)]">
        <Button
          className="text-[13px] text-gray-800 leading-6 opacity-50 hover:opacity-100 font-bold"
          variant="link"
          visual="gray"
        >
          Mobile Development <ChevronDown className="size-[15px]" />
        </Button>
        <div className="flex items-center gap-x-[50px]">
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Security
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Mobile
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Front-End
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            API
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Database
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Cloud
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Front-End
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Desktop
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Security
          </Button>
          <Button
            className="text-[13px] text-gray-800 leading-6 opacity-60 hover:opacity-100"
            variant="link"
            visual="gray"
          >
            Database
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="text-[13px] text-gray-800 leading-6 opacity-50 hover:opacity-100 font-bold"
              variant="link"
              visual="gray"
            >
              More <ChevronDown className="size-[15px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ScrollArea
              viewportClassName="max-h-[250px]"
              scrollBar={<ScrollBar className="w-4 p-1" />}
            >
              <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
              <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </>
  )
}

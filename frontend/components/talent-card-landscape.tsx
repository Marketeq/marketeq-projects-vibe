import {
  Check,
  Copy,
  Edit03,
  MessageSquare,
  MoreHorizontal,
  Star,
  Trash2,
  Zap,
} from "@blend-metrics/icons"
import NextLink from "./next-link"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from "./ui"

export const TalentCardLandscape = () => {
  return (
    <div className="shadow-[0px_2px_5px_0px_theme(colors.black/[.04])] rounded-[6px] lg:rounded-lg">
      <div className="flex xs:max-lg:flex-col xs:max-lg:gap-y-3 border border-gray-200 bg-white rounded-t-lg xs:max-lg:p-3">
        <div className="lg:contents flex items-start justify-between">
          <div className="lg:flex-auto flex items-center gap-x-3 lg:first:pl-5 lg:py-5 lg:last:pr-5">
            <NextLink
              href="#"
              className="focus-visible:outline-none relative inline-block"
            >
              <Avatar className="border-2 size-[54px] border-white" size="xl">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <span className="inline-flex items-center justify-center size-[21px] border-[1.5px] border-white rounded-full shrink-0 absolute bottom-[1.5px] left-[1.5px] bg-success-500 text-white">
                <Check className="size-[9.31px]" />
              </span>
            </NextLink>
            <div className="flex flex-col">
              <NextLink
                href="#"
                className="focus-visible:outline-none hover:underline inline-block text-[13px] leading-[15.73px] lg:text-base lg:leading-[19.36px] font-bold text-dark-blue-400"
              >
                berra.unall4
              </NextLink>
              <span className="mt-0.5 text-[11px] leading-[13.31px] lg:text-sm inline-block lg:leading-[16.94px] font-light text-[#585C65]">
                Lead Software Developer
              </span>

              <div className="mt-1.5 lg:hidden flex items-center gap-x-2 lg:gap-x-3">
                <div className="inline-flex items-center bg-primary-500 gap-x-[3px] lg:gap-x-1 flex-none py-[3px] px-1.5 lg:py-1 lg:px-2 rounded-[4px] shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05);]">
                  <Star className="size-[9px] lg:size-3 shrink-0 fill-white text-white" />
                  <span className="text-[10px] leading-[12.1px] lg:text-xs inline-block lg:leading-[14.52px] font-medium text-white">
                    5.0
                  </span>
                </div>
                <span className="text-[10px] leading-[12.1px] lg:text-xs lg:leading-[14.52px] text-dark-blue-400">
                  24 reviews
                </span>
              </div>
            </div>
          </div>

          <div className="flex-auto flex items-center gap-x-3 xs:max-lg:hidden first:pl-5 py-5 last:pr-5">
            <div className="inline-flex items-center bg-primary-500 gap-x-1 flex-none py-1 px-2 rounded-[4px] shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05);]">
              <Star className="size-3 shrink-0 fill-white text-white" />
              <span className="text-xs inline-block leading-[14.52px] font-medium text-white">
                5.0
              </span>
            </div>
            <span className="text-xs leading-[14.52px] text-dark-blue-400">
              24 reviews
            </span>
          </div>

          <div className="flex-auto flex items-center gap-x-2 xs:max-lg:hidden first:pl-5 py-5 last:pr-5">
            <span className="text-sm leading-[16.94px] font-light inline-block text-dark-blue-400">
              Availability
            </span>
            <span className="inline-flex gap-x-1 items-center text-sm leading-[16.94px] font-light text-dark-blue-400">
              <span className="font-bold">40 hrs</span>/ wk
            </span>
          </div>

          <div className="flex-auto flex items-center gap-x-2 xs:max-lg:hidden first:pl-5 py-5 last:pr-5">
            <span className="text-sm leading-[16.94px] font-light inline-block text-dark-blue-400">
              Status
            </span>
            <span className="inline-block font-bold items-center text-sm leading-[16.94px] text-dark-blue-400">
              Unassigned
            </span>
          </div>

          <div className="lg:flex-auto flex justify-end items-center gap-x-1 lg:lg:gap-x-1.5 lg:first:pl-5 lg:py-5 lg:last:pr-5">
            <IconButton
              className="text-gray-400 xs:max-lg:size-[30px]"
              variant="ghost"
              visual="gray"
            >
              <MessageSquare className="size-3.5 lg:size-4" />
            </IconButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-auto py-0.5 px-1.5 text-gray-400"
                  variant="ghost"
                  visual="gray"
                >
                  <MoreHorizontal className="size-[18px] lg:size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[165px]">
                <DropdownMenuItem>
                  <Edit03 className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Zap className="h-4 w-4" /> Run Test
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem visual="destructive">
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-x-2">
            <span className="text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
              Rate
            </span>
            <span className="inline-flex gap-x-[3px] lg:gap-x-1 items-center text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] font-light text-dark-blue-400">
              <span className="font-bold">$58</span>/hr
            </span>
          </div>

          <div className="flex items-center gap-x-1.5 lg:gap-x-2">
            <span className="text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
              Availability
            </span>
            <span className="inline-flex gap-x-[3px] lg:gap-x-1 items-center text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] font-light text-dark-blue-400">
              <span className="font-bold">40 hrs</span>/ wk
            </span>
          </div>

          <div className="flex items-center gap-x-1.5 lg:gap-x-2">
            <span className="text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
              Status
            </span>
            <span className="inline-block font-bold items-center text-[10px] lg:text-sm leading-[12.1px] lg:leading-[16.94px] text-dark-blue-400">
              Unassigned
            </span>
          </div>
        </div>
      </div>

      <div className="border-x border-b gap-x-3 flex items-center flex-wrap rounded-b-lg border-gray-200 bg-[#122A4B]/[.02] px-3 pt-1 pb-1.5 lg:py-3 lg:px-5">
        <span className="xs:max-lg:hidden text-dark-blue-400 font-light text-[15px] leading-[18.15px] inline-block">
          <span className="font-bold">$50</span>/hr
        </span>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
        <Button
          className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline"
          variant="link"
          visual="gray"
        >
          Wireframing
        </Button>
      </div>
    </div>
  )
}

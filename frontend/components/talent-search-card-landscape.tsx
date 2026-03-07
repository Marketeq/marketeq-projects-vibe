import React from "react"
import { cn } from "@/utils/functions"
import {
  Check,
  ChevronDown,
  MarkerPin02,
  Plus,
  Star,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Input,
} from "./ui"

export const TalentSearchCardLandscape = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const [value, setValue] = React.useState("")
  const [isExpanded, toggleIsExpanded] = useToggle(false)

  return (
    <article className="relative overflow-hidden border-gray-200 border rounded-lg shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="px-3 pt-3 lg:p-10 flex gap-x-[13px] lg:gap-x-[17px] justify-between">
        <div className="relative inline-block">
          <Avatar className="lg:size-[140px] size-[62px]" size="2xl">
            <AvatarImage src="/woman.jpg" alt="Woman" />
            <AvatarFallback>W</AvatarFallback>
          </Avatar>
          <span className="lg:size-[29px] size-[18px] absolute inline-flex items-center justify-center rounded-full bottom-2 lg:bottom-[18.5px] left-[-1.5px] border-[1.69px] lg:border-[1.5px] border-white bg-success-500">
            <Check className="text-white lg:size-[15px] size-[9.31px]" />
          </span>
        </div>

        <div className="flex-auto flex justify-between items-center">
          <div className="flex flex-col gap-y-[5.5px] lg:gap-y-3 justify-center">
            <div className="flex flex-col gap-y-[5.5px] lg:gap-y-1">
              <h1 className="text-[13px] leading-[15.73px] lg:text-[22px] font-bold lg:leading-[29.96px] text-dark-blue-400">
                rightflair2046
              </h1>
              <p className="text-[11px] leading-[13.31px] lg:text-lg lg:leading-[24.52px] font-light text-gray-500">
                Project Manager
              </p>
            </div>

            <div className="lg:absolute inline-flex items-center gap-x-2 lg:gap-x-3 lg:top-[11px] lg:left-[11px]">
              <div className="inline-flex items-center gap-x-[3px] lg:gap-x-1 shrink-0 py-[3px] px-1.5 lg:px-2 bg-primary-500 text-white rounded-[4px] shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
                <Star className="size-3 fill-white" />
                <span className="text-[10px] leading-[12.1px] lg:text-xs lg:leading-[14.52px] font-medium">
                  5.0
                </span>
              </div>
              <span className="text-[10px] leading-[12.1px] lg:text-xs lg:leading-[14.52px] text-primary-500">
                24 reviews
              </span>
            </div>

            <div className="flex items-center gap-x-2 xs:max-lg:hidden">
              <MarkerPin02 className="size-[15px] text-primary-500 shrink-0" />
              <span className="text-xs leading-5 text-primary-500 font-semibold">
                Italy
              </span>
            </div>
          </div>

          <Favorite
            starClassName="size-5"
            className="size-5 md:hidden self-start"
          />

          <div className="hidden flex-col items-end gap-y-[55px] self-start md:flex">
            <div className="flex items-center gap-x-[15.3px] lg:gap-x-6">
              <div className="flex items-center">
                <Button
                  className="border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none"
                  variant="outlined"
                  visual="gray"
                >
                  <Favorite
                    starClassName="size-[12.75px] lg:size-5"
                    className="size-[12.75px] lg:size-5"
                  />
                  Save
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
                      variant="outlined"
                      visual="gray"
                    >
                      <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom">
                    <DropdownMenuRadioGroup
                      value={value}
                      onValueChange={setValue}
                    >
                      <DropdownMenuRadioTrigger value="Digital Marketing">
                        Digital Marketing
                      </DropdownMenuRadioTrigger>
                      <DropdownMenuRadioTrigger value="Customer Service">
                        Customer Service
                      </DropdownMenuRadioTrigger>
                      <DropdownMenuRadioTrigger value="Email Marketing">
                        Email Marketing
                      </DropdownMenuRadioTrigger>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => toggleIsOpen()}
                      className="text-primary-500"
                    >
                      <Plus className="size-4" /> Create New List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
                  <DialogContent>
                    <form className="flex items-center gap-x-3">
                      <Input
                        placeholder="Enter List Name"
                        className="flex-auto"
                      />
                      <Button size="lg">Save</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Button
                className="border-primary-500 text-primary-500 xs:max-lg:gap-x-[5.1px] xs:max-lg:text-[8.93px] xs:max-lg:leading-[15.3px] xs:max-lg:px-[8.93px] xs:max-lg:h-[26.2px] hover:text-white hover:bg-primary-500"
                variant="outlined"
                visual="gray"
              >
                <Plus className="size-[9.56px] lg:size-[15px]" /> Add to My Team
              </Button>
            </div>

            <div className="hidden items-center gap-x-[24.5px] lg:flex">
              <div className="inline-flex gap-x-2 items-center">
                <span className="text-sm text-[#122A4B] leading-[16.94px] font-light">
                  Availability
                </span>
                <div className="inline-flex gap-x-1 items-center">
                  <span className="text-sm text-[#122A4B] leading-[16.94px] font-bold">
                    40 hrs
                  </span>
                  <span className="text-sm text-[#122A4B] leading-[16.94px] font-light">
                    / wk
                  </span>
                </div>
              </div>

              <span className="block shrink-0 w-px h-[17px]" />

              <div className="inline-flex gap-x-2 items-center">
                <span className="text-sm text-[#122A4B] leading-[16.94px] font-light">
                  Total Work Experience
                </span>

                <span className="text-sm text-[#122A4B] leading-[16.94px] font-bold">
                  14 years
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden items-center justify-between p-3">
        <div className="inline-flex items-center gap-x-2 lg:hidden">
          <span className="text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light text-[#122A4B]">
            Rate
          </span>
          <span className="text-[15px] leading-[18.15px] lg:text-xl lg:leading-[24.2px] font-light text-[#122A4B]">
            <span className="font-bold">$85</span>
            /hr
          </span>
        </div>

        <div className="inline-flex gap-x-1.5 lg:gap-x-2 items-center">
          <span className="text-[10px] leading-[12.1px] lg:text-sm text-[#122A4B] lg:leading-[16.94px] font-light">
            Availability
          </span>
          <div className="inline-flex gap-x-[3px] lg:gap-x-1 items-center">
            <span className="text-[10px] leading-[12.1px] lg:text-sm text-[#122A4B] lg:leading-[16.94px] font-bold">
              40 hrs
            </span>
            <span className="text-[10px] leading-[12.1px] lg:text-sm text-[#122A4B] lg:leading-[16.94px] font-light">
              / wk
            </span>
          </div>
        </div>

        <div className="inline-flex gap-x-1.5 lg:gap-x-2 items-center">
          <span className="text-[10px] leading-[12.1px] lg:text-sm text-[#122A4B] lg:leading-[16.94px] font-light">
            Total Work Experience
          </span>

          <span className="text-[10px] leading-[12.1px] lg:text-sm text-[#122A4B] lg:leading-[16.94px] font-bold">
            14 years
          </span>
        </div>
      </div>

      <div className="border-t lg:flex lg:gap-x-[35px] lg:items-center border-gray-200 bg-[#122A4B]/[0.02] pt-1 lg:py-3 px-3 lg:px-10 pb-[6px] lg:lg:pr-[57px]">
        <div className="items-center gap-x-2 lg:inline-flex hidden">
          <span className="text-sm leading-[16.94px] font-light text-[#122A4B]">
            Rate
          </span>
          <span className="text-xl leading-[24.2px] font-light text-[#122A4B]">
            <span className="font-bold">$85</span>
            /hr
          </span>
        </div>

        <div className="flex items-center gap-x-3">
          {!isExpanded && (
            <h1 className="text-[10px] leading-5 lg:text-sm lg:leading-5 font-bold whitespace-nowrap text-gray-700">
              Top Skills
            </h1>
          )}

          <div
            className={cn(
              "flex flex-wrap gap-3 overflow-x-hidden",
              isExpanded ? "flex-wrap" : "flex-nowrap"
            )}
          >
            {isExpanded && (
              <h1 className="text-[10px] leading-5 lg:text-sm lg:leading-5 font-bold whitespace-nowrap text-gray-700">
                Top Skills
              </h1>
            )}
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Wireframing
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Axure RP
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Visual Design
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Wireframing
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Axure RP
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Visual Design
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Sketch App
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Wireframing
            </Button>
            <Button
              className="text-[10px] lg:text-xs leading-5 opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
            >
              Axure RP
            </Button>

            {isExpanded && (
              <Button
                className="xs:max-lg:text-[10px] xs:max-lg:leading-5 font-bold text-xs leading-5"
                visual="gray"
                variant="link"
                onClick={toggleIsExpanded}
              >
                View Less
              </Button>
            )}
          </div>

          {!isExpanded && (
            <Button
              className="xs:max-lg:text-[10px] xs:max-lg:leading-5 font-bold text-xs leading-5"
              visual="gray"
              variant="link"
              onClick={toggleIsExpanded}
            >
              More...
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

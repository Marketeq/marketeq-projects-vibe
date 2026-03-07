import React from "react"
import {
  AlignLeft,
  CalendarPlus01,
  CheckSquareBroken,
  ChevronSelectorVertical,
  File,
  Film,
  Globe,
  Image as ImageIcon,
  Lock01,
  Mail,
  Numbers,
  Phone,
  Plus,
  RadioButtonCheckedOutline,
  SearchMd,
  TextInput,
  Toggle03Left,
  X,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Button,
  CommandPalette,
  CommandPaletteDialog,
  CommandPaletteDialogClose,
  CommandPaletteDialogContent,
  CommandPaletteDialogTrigger,
  CommandPaletteEmpty,
  CommandPaletteGroup,
  CommandPaletteHeader,
  CommandPaletteInput,
  CommandPaletteItem,
  CommandPaletteList,
  CommandPaletteTitle,
  IconButton,
} from "@/components/ui"

const meta: Meta = {
  title: "CommandPalette",
}

export default meta

export const Default = () => {
  const [selected, setSelected] = React.useState("")

  return (
    <CommandPaletteDialog>
      <CommandPaletteDialogTrigger asChild>
        <Button variant="outlined" visual="gray">
          <Plus className="h-[15px] w-[15px]" />
          Add Field
        </Button>
      </CommandPaletteDialogTrigger>
      <CommandPaletteDialogContent>
        <CommandPalette value={selected} onValueChange={setSelected}>
          <CommandPaletteHeader>
            <CommandPaletteTitle>New Field</CommandPaletteTitle>
            <CommandPaletteDialogClose asChild>
              <IconButton variant="ghost" visual="gray" className="h-6 w-6">
                <X className="h-6 w-6 text-gray-500" />
              </IconButton>
            </CommandPaletteDialogClose>
          </CommandPaletteHeader>

          <CommandPaletteInput />

          <CommandPaletteList>
            <CommandPaletteEmpty>No results found.</CommandPaletteEmpty>
            <CommandPaletteGroup heading="Input Fields">
              <CommandPaletteItem value="short text">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <TextInput className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Short Text
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Small text like title
                  </span>
                </div>
              </CommandPaletteItem>

              <CommandPaletteItem value="long text">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <TextInput className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Long Text
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Long text like description
                  </span>
                </div>
              </CommandPaletteItem>

              <CommandPaletteItem value="rich text">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <AlignLeft className="text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Rich Text
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    A rich text editor with formating options
                  </span>
                </div>
              </CommandPaletteItem>

              <CommandPaletteItem value="numbers">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Numbers className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Numbers
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Numbers (integer, float, decimal)
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="date/time">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <CalendarPlus01 className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Date/Time
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    A date picker with hours, minute, seconds
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="search">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <SearchMd className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Search
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>

              <CommandPaletteItem value="email">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Mail className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Email
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Email field with validation format
                  </span>
                </div>
              </CommandPaletteItem>

              <CommandPaletteItem value="password">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Lock01 className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Password
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Password field with encryption
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="phone number">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Phone className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Phone Number
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="website">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Globe className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Website
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Collect valid URLs or website addresses.
                  </span>
                </div>
              </CommandPaletteItem>
            </CommandPaletteGroup>
            <CommandPaletteGroup heading="Selections">
              <CommandPaletteItem value="checkbox">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <CheckSquareBroken className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Checkbox
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="radio group">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <RadioButtonCheckedOutline className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Radio Group
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="dropdown">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <ChevronSelectorVertical className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Dropdown
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="toggle">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Toggle03Left className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Toggle
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Yes or no, 1 or 0, true or false
                  </span>
                </div>
              </CommandPaletteItem>
            </CommandPaletteGroup>
            <CommandPaletteGroup heading="Other">
              <CommandPaletteItem value="dropdown">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <File className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Dropdown
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="image upload">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <ImageIcon className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Image Upload
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
              <CommandPaletteItem value="video">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                  <Film className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-grow flex-col">
                  <span className="text-sm font-medium leading-6 text-gray-900">
                    Video
                  </span>
                  <span className="text-xs leading-[14.52px] text-gray-500">
                    Choose this to start your workflow
                  </span>
                </div>
              </CommandPaletteItem>
            </CommandPaletteGroup>
          </CommandPaletteList>
        </CommandPalette>
      </CommandPaletteDialogContent>
    </CommandPaletteDialog>
  )
}

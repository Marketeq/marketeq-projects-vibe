"use client"

import React, { useState } from "react"
import { callAll, cn, isNotEmpty } from "@/utils/functions"
import {
  AlertCircle,
  ChevronDown,
  Link01,
  Minus,
  Plus,
  Settings,
  X2,
} from "@blend-metrics/icons"
import { Combobox } from "@headlessui/react"
import { Slot } from "@radix-ui/react-slot"
import { normalizeProps, useMachine } from "@zag-js/react"
import * as tagsInput from "@zag-js/tags-input"
import { flushSync } from "react-dom"
import { useToggle } from "react-use"
import { z } from "zod"
import { create } from "zustand"
import { combine } from "zustand/middleware"
import NextImage from "./next-image"
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioCheckItem,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
} from "./ui"

interface Invitee {
  avatar?: string
  username?: string
  email: string
}

type Invitees = Invitee[]

const options = [
  {
    avatar: "/man.jpg",
    username: "Thomas",
    email: "tranthuy.nute@gmail.com",
  },
  {
    avatar: "/woman.jpg",
    username: "Tiffany Steiner",
    email: "tiff.steinter@gmail.com",
  },
]

const isEmail = (value: string) => z.string().email().safeParse(value).success

export const useInviteWindowStore = create(
  combine({ open: false }, (set) => ({
    toggle: (open?: boolean) =>
      set((state) => ({
        ...state,
        open: typeof open === "boolean" ? open : !state.open,
      })),
  }))
)

export const InviteWindowTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, onClick, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const { toggle } = useInviteWindowStore()
  return <Comp onClick={callAll(onClick, toggle)} {...props} ref={ref} />
})

InviteWindowTrigger.displayName = "InviteWindowTrigger"

export const InviteWindow = () => {
  return null
  /* const [selected, setSelected] = React.useState<Invitees>()
  const [inputValue, setInputValue] = React.useState("")
  const { open, toggle: toggleInviteWindow } = useInviteWindowStore()

  const value = React.useMemo(
    () => selected?.map((value) => value.email),
    [selected]
  )
  const [state, send] = useMachine(
    tagsInput.machine({
      id: React.useId(),

      validate: (details) => {
        const exists = details.value.includes(details.inputValue)
        return exists ? false : isEmail(details.inputValue)
      },
    }),
    {
      context: {
        value,
        onValueChange: (details) => {
          const endItem = details.value[details.value.length - 1]
          flushSync(() =>
            setSelected((prev) =>
              prev ? [...prev, { email: endItem }] : [{ email: endItem }]
            )
          )
        },
        inputValue,
      },
    }
  )
  const id = React.useId()
  const [isOpen, toggle] = useToggle(false)
  const [message, setMessage] = useState("")

  const getIsValid = () => {
    return value?.includes(inputValue) ? false : isEmail(inputValue)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && getIsValid()) {
      setInputValue("")
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    flushSync(() => setInputValue(value))
  }

  const handleAddTag = () => {
    if (getIsValid()) {
      api.addValue(inputValue)
      setInputValue("")
    }
  }

  const onMessageChanged = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setMessage(value)
  }

  const handleRemove = (email: string) => {
    const filtered = selected?.filter((value) => value.email !== email)
    setSelected(filtered)
  }

  const api = tagsInput.connect(state, send, normalizeProps)

  const filteredOptions =
    inputValue === ""
      ? options
      : options.filter((option) => {
          return option.username
            .toLowerCase()
            .includes(inputValue.toLowerCase())
        })

  const props = { multiple: true } as unknown as { multiple: false }

  return (
    <Dialog open={open} onOpenChange={toggleInviteWindow}>
      <DialogContent className="max-w-[690px] p-0">
        <div className="max-w-[690px] bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-lg leading-7 font-semibold text-gray-800">
              Invite Your Team
            </h2>

            <div className="inline-flex items-center gap-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-gray-500 hover:text-gray-900">
                    <AlertCircle className="h-6 w-6" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Support</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-gray-500 hover:text-gray-900">
                    <Settings className="h-6 w-6" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-2 mt-8">
            <Label className="text-gray-700" size="md" htmlFor={id}>
              Invite by email
            </Label>
            <div className="flex items center gap-x-3">
              <Combobox
                className="flex-auto relative"
                as="div"
                value={selected}
                onChange={setSelected}
                {...props}
              >
                <div
                  {...api.getRootProps()}
                  className={cn(
                    inputVariants({
                      className:
                        "min-h-[44px] h-auto flex flex-wrap gap-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50",
                    })
                  )}
                  tabIndex={0}
                >
                  {api.value.map((value, index) => (
                    <Badge
                      {...api.getItemProps({ index, value })}
                      key={index}
                      visual="primary"
                    >
                      {value}
                      <button
                        {...api.getItemDeleteTriggerProps({ index, value })}
                        onClick={callAll(
                          api.getItemDeleteTriggerProps({ index, value })
                            .onClick,
                          () => handleRemove(value)
                        )}
                        className="focus-visible:outline-none flex-none"
                      >
                        <X2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Combobox.Input
                    {...api.getInputProps()}
                    className="text-base min-w-[132px] flex-auto text-gray-700 p-0 focus:ring-0 border-none placeholder:text-gray-500"
                    placeholder="Add emails or find contacts"
                    id={id}
                    value={inputValue}
                    onKeyDown={callAll(
                      api.getInputProps().onKeyDown,
                      handleKeyDown
                    )}
                    onChange={callAll(
                      api.getInputProps().onChange,
                      handleChange
                    )}
                  />
                </div>

                <Combobox.Options className="absolute w-full z-50 rounded-lg bg-white border border-gray-100 shadow-lg mt-2">
                  {filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option.email}
                      className="flex cursor-pointer items-center gap-x-3 py-2.5 h-16 px-3.5"
                      value={option}
                    >
                      <div className="h-10 flex-none relative rounded-full overflow-hidden w-10">
                        <NextImage
                          className="object-cover"
                          src={option.avatar}
                          alt="man.jpg"
                          sizes="100vh"
                          fill
                        />
                      </div>
                      <div className="flex-auto">
                        <h2 className="text-sm leading-6 font-medium text-gray-800">
                          {option.username}
                        </h2>
                        <p className="text-sm leading-5 text-gray-500">
                          {option.email}
                        </p>
                      </div>
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox>
              <Button
                variant="light"
                size="lg"
                type="button"
                onClick={handleAddTag}
              >
                Add
              </Button>
            </div>
          </div>

          <button
            className="inline-flex focus-visible:outline-none gap-x-2 mt-6 text-base font-semibold text-gray-700 items-center"
            onClick={toggle}
          >
            Add a Message{" "}
            {isOpen ? (
              <Minus className="h-6 w-6 flex-none" />
            ) : (
              <Plus className="h-6 w-6 flex-none" />
            )}
          </button>

          {isOpen && (
            <Textarea
              className="h-20 mt-3"
              value={message}
              onChange={onMessageChanged}
              placeholder="Write message here..."
            />
          )}

          {selected && isNotEmpty(selected) && (
            <div className="mt-6 space-y-3">
              <span className="text-base leading-5 font-medium text-gray-700">
                Invites
              </span>
              {selected.map(({ email, avatar, username }) => (
                <div className="space-y-3 mt-3" key={email}>
                  <div className="flex justify-between items-center">
                    <div className="inline-flex items-center gap-x-3">
                      {avatar ? (
                        <div className="h-8 w-8 rounded-full overflow-hidden relative">
                          <NextImage
                            className="object-cover"
                            src={avatar}
                            alt="Man"
                            sizes="100vh"
                            fill
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-300 border-dashed bg-gray-50 relative" />
                      )}
                      <span className="font-medium text-sm leading-5 text-gray-800">
                        {username ? username : email}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center gap-x-1 text-sm font-medium text-gray-900">
                        Viewer
                        <ChevronDown className="text-gray-500 h-5 w-5 flex-none" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuRadioGroup>
                          <DropdownMenuRadioCheckItem value="Viewer">
                            Viewer
                          </DropdownMenuRadioCheckItem>
                          <DropdownMenuRadioCheckItem value="Editor">
                            Editor
                          </DropdownMenuRadioCheckItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                        <DropdownMenuItem>Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex mt-8 justify-between">
            <button className="inline-flex gap-x-2 focus-visible:outline-none text-primary-500 font-semibold items-center">
              <Link01 className="h-[15px] w-[15px]" />
              Copy Link
            </button>
            <div className="inline-flex items-center gap-x-3">
              <DialogClose asChild>
                <Button visual="gray" variant="outlined">
                  Cancel
                </Button>
              </DialogClose>
              <Button>Send Invite</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
    */
}

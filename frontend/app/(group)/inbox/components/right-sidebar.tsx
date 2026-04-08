"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useEffect } from "react"
import {
  ensureEncryptionKeysExist,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  savePrivateKey,
  savePublicKey,
} from "@/src/crypto/keys"
import { getCurrentUser } from "@/utils/auth"
import { noop, toPxIfNumber } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
// FIXME: a wrong import
// import { useMessaging } from "..//../../../src//hooks/useMessaging";
import { useAblyChannel } from "@/utils/useAblyChannel"
import {
  AlertTriangle,
  Archive,
  Attachment01,
  ChevronDown,
  Edit05,
  Image03,
  Info,
  Mail05,
  MoreHorizontal,
  Pin02,
  Plus,
  SearchMd,
  Send,
  Smile,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { useMeasure, useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  CircularProgressDropzone,
  CircularProgressDropzoneState,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
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
  InputGroup,
  InputLeftElement,
  InputRightElement,
  ScrollArea,
  ScrollBar,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const RightSidebar = () => {
  return (
    <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200">
      <div className="pb-5 flex flex-col items-center border-b border-gray-200">
        <Avatar size="2xl">
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>

        <div className="mt-2 flex flex-col gap-y-1.5">
          <h3 className="text-base leading-[19.36px] text-center font-bold text-dark-blue-400">
            Andrew
          </h3>
          <p className="text-[13px] leading-[15.73px] text-center text-dark-blue-400">
            @designome234i
          </p>
        </div>

        <div className="mt-5 flex items-center gap-x-2 justify-center">
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
                <DropdownMenuRadioGroup>
                  <DropdownMenuRadioTrigger value="Customer Service">
                    Customer Service
                  </DropdownMenuRadioTrigger>
                  <DropdownMenuRadioTrigger value="Digital Marketing">
                    Digital Marketing
                  </DropdownMenuRadioTrigger>
                  <DropdownMenuRadioTrigger value="Email Marketing">
                    Email Marketing
                  </DropdownMenuRadioTrigger>
                  <DropdownMenuRadioTrigger value="React Developers">
                    React Developers
                  </DropdownMenuRadioTrigger>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-primary-500">
                  <Plus className="size-4" /> Create New List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button visual="primary" variant="filled">
            Hire Me
          </Button>
        </div>
      </div>

      <div className="mt-5 pb-5 flex flex-col gap-y-3 border-b border-gray-200">
        <div className="flex items-center gap-x-2">
          <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
            Rate
          </span>
          <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
            <span className="font-bold">$85 - $120</span> /hr
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
            Current Availability
          </span>
          <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
            <span className="font-bold">40 hrs</span> /wk
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          <span className="inline-flex text-dark-blue-400 items-center text-xs leading-[14.52px] font-medium gap-x-1 py-1 px-2 bg-primary-50 rounded-[4px]">
            <Star className="size-3 fill-dark-blue-400" /> 4.7
          </span>

          <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
            240 reviews
          </span>
        </div>
      </div>

      <div className="mt-3">
        <h3 className="font-bold text-sm text-dark-blue-400">Skills</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
          <Badge visual="gray">Lorem</Badge>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-y-6">
        <Button visual="gray" variant="outlined">
          View Full Profile
        </Button>

        <span className="text-center text-xs leading-[14.52px] text-dark-blue-400">
          Member since <span className="font-semibold">Sep 2024</span>
        </span>
      </div>
    </div>
  )
}

export default RightSidebar

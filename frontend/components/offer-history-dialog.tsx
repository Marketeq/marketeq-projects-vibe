"use client"

import * as React from "react"
import { ChevronDown, X } from "@blend-metrics/icons"
import type { OfferHistoryItem } from "@/components/offer-dialog.types"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DisclosureContent,
  IconButton,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

interface OfferHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: OfferHistoryItem[]
  defaultExpandedId?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export function OfferHistoryDialog({
  open,
  onOpenChange,
  items,
  defaultExpandedId,
  ctaLabel = "View Contract",
  onCtaClick,
}: OfferHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="unanimated"
        className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onOpenChange(false)
          }
        }}
      >
        <div className="pointer-events-auto h-[506px] max-h-[calc(100dvh-24px)] w-[480px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3">
            <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
              Offer History
            </DialogTitle>

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="flex h-[446px] flex-col">
            <ScrollArea
              className="flex-1"
              scrollBar={<ScrollBar className="w-4 px-1" />}
            >
              <Accordion
                type="single"
                collapsible
                defaultValue={defaultExpandedId}
                className="divide-y divide-gray-100"
              >
                {items.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="data-[state=open]:bg-gray-25"
                  >
                    <AccordionTrigger className="w-full px-6 py-[18px] text-left">
                      <div className="flex w-full items-center gap-2">
                        <Avatar size="md">
                          <AvatarImage
                            src={item.actorAvatarSrc}
                            alt={item.actorName}
                          />
                          <AvatarFallback>
                            {item.actorName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold leading-[17px] text-dark-blue-400">
                            {item.title}
                          </div>
                          <div className="mt-1 text-[13px] leading-4 text-gray-500">
                            {item.timestampLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-3">
                          <span className="text-sm font-semibold leading-[18px] text-dark-blue-500">
                            {item.rateLabel}
                          </span>
                          <ChevronDown className="size-[18px] text-gray-500 transition-transform duration-300 group-data-[state=open]/trigger:rotate-180" />
                        </div>
                      </div>
                    </AccordionTrigger>

                    <DisclosureContent>
                      <div className="grid grid-cols-[138px_1fr] gap-x-6 gap-y-3 pb-[18px] pl-[74px] pr-6">
                        {item.role ? (
                          <>
                            <div className="text-xs leading-[19px] text-gray-600">
                              Role
                            </div>
                            <div className="text-xs font-medium leading-[18px] text-dark-blue-500">
                              {item.role}
                            </div>
                          </>
                        ) : null}

                        {item.duration ? (
                          <>
                            <div className="text-xs leading-[19px] text-gray-600">
                              Contract Duration
                            </div>
                            <div className="text-xs font-medium leading-[18px] text-dark-blue-500">
                              {item.duration}
                            </div>
                          </>
                        ) : null}

                        {item.schedule ? (
                          <>
                            <div className="text-xs leading-[19px] text-gray-600">
                              Work Schedule
                            </div>
                            <div className="text-xs font-medium leading-[18px] text-dark-blue-500">
                              {item.schedule}
                            </div>
                          </>
                        ) : null}

                        {item.startDate ? (
                          <>
                            <div className="text-xs leading-[19px] text-gray-600">
                              Start Date
                            </div>
                            <div className="text-xs font-medium leading-[18px] text-dark-blue-500">
                              {item.startDate}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </DisclosureContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            <div className="flex h-[60px] shrink-0 justify-end border-t border-gray-100 p-3">
              <Button
                variant="link"
                visual="primary"
                className="h-9 px-[14px] text-xs font-semibold leading-5 no-underline hover:no-underline"
                onClick={onCtaClick}
              >
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

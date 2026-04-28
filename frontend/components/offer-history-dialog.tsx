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
        <div className="pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]">
          <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3">
            <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
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
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="w-full px-6 py-4 text-left">
                      <div className="flex w-full items-start gap-3">
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
                          <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                            {item.title}
                          </div>
                          <div className="text-[15px] leading-6 text-gray-500">
                            {item.timestampLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-3">
                          <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                            {item.rateLabel}
                          </span>
                          <ChevronDown className="size-5 text-gray-500 transition-transform duration-300 group-data-[state=open]/trigger:rotate-180" />
                        </div>
                      </div>
                    </AccordionTrigger>

                    <DisclosureContent>
                      <div className="grid grid-cols-[156px_1fr] gap-x-8 gap-y-3 px-20 pb-6 pt-1">
                        {item.role ? (
                          <>
                            <div className="text-[15px] leading-7 text-gray-500">
                              Role
                            </div>
                            <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                              {item.role}
                            </div>
                          </>
                        ) : null}

                        {item.duration ? (
                          <>
                            <div className="text-[15px] leading-7 text-gray-500">
                              Contract Duration
                            </div>
                            <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                              {item.duration}
                            </div>
                          </>
                        ) : null}

                        {item.schedule ? (
                          <>
                            <div className="text-[15px] leading-7 text-gray-500">
                              Work Schedule
                            </div>
                            <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                              {item.schedule}
                            </div>
                          </>
                        ) : null}

                        {item.startDate ? (
                          <>
                            <div className="text-[15px] leading-7 text-gray-500">
                              Start Date
                            </div>
                            <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
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

            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <Button
                variant="link"
                visual="primary"
                className="underline-offset-2 hover:underline"
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

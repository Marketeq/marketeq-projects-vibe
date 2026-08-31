"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as AccordionPrimitive from "@radix-ui/react-accordion"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("group/item", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header asChild>
    <AccordionPrimitive.Trigger
      ref={ref}
      // Plain `group` is deliberate and load-bearing. Chevron rotation is done
      // at the call site with `group-data-[state=open]:rotate-180`; the NAMED
      // form (`group-data-[state=open]/trigger:`) emits no CSS in this setup,
      // and neither does the stacked `data-[state=open]:[&>svg]:rotate-180`.
      // `group/trigger` is kept for existing call sites that reference it.
      className={cn(
        "group group/trigger focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> & {
    innerClassName?: string
  }
>(({ className, children, innerClassName, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      // No border here. Every caller already borders the item or its wrapper,
      // so a border on the content drew a second line down the sides and along
      // the bottom once opened. The container owns the border; the content
      // owns only the reveal animation.
      "overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  >
    <div className={cn("p-6", innerClassName)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

const DisclosureContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  >
    {children}
  </AccordionPrimitive.Content>
))
DisclosureContent.displayName = AccordionPrimitive.Content.displayName

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  DisclosureContent,
}

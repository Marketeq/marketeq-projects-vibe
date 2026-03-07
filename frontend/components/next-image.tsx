import React from "react"
import { StaticImport } from "next/dist/shared/lib/get-img-props"
import Image from "next/image"
import { IMAGE_QUALITY } from "@/utils/constants"

export const NextImage = React.forwardRef<
  React.ElementRef<typeof Image>,
  Omit<
    React.ComponentPropsWithoutRef<typeof Image>,
    "quality" | "src" | "alt"
  > & {
    src?: string | StaticImport
    alt?: string
  }
>(({ alt = "", src, ...props }, ref) =>
  src ? (
    <Image {...props} alt={alt} ref={ref} src={src} quality={IMAGE_QUALITY} />
  ) : null
)

NextImage.displayName = "NextImage"

export default NextImage

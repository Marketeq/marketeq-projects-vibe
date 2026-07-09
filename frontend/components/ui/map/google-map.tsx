import React from "react"
import { cn } from "@/utils/functions"

type GoogleMapProps = {
  location: string
  latitude?: number
  longitude?: number
  title?: string
  className?: string
}

export const GoogleMap = ({
  location,
  latitude,
  longitude,
  title = "Google map",
  className,
}: GoogleMapProps) => {
  const hasCoordinates =
    typeof latitude === "number" && typeof longitude === "number"
  const query = hasCoordinates ? `loc:${latitude},${longitude}` : location

  return (
    <iframe
      title={title}
      src={`https://maps.google.com/maps?hl=en&q=${encodeURIComponent(
        query
      )}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
      className={cn("h-[180px] md:h-[220px] w-full border-0", className)}
      loading="lazy"
    />
  )
}

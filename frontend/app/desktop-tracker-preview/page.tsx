"use client"

import { TimeTrackerApp } from "@/components/desktop-tracker"

export default function DesktopTrackerPreview() {
  return (
    <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center">
      <div style={{ padding: 8 }}>
        <TimeTrackerApp />
      </div>
    </div>
  )
}

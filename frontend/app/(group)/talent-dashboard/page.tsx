"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ChevronRight, X } from "@blend-metrics/icons"
import { useToggle } from "react-use"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  BecomeTopSeller,
  Carousel,
  CreateYourOwnProject,
  Footer,
  LeftSidebar,
  RecentProjects,
  RecommendedForYou,
  RightDrawer,
  RightSidebar,
  TakeCareersToNextLevel,
  Welcome,
} from "@/components/talent-dashboard-comps"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  IconButton,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"

export default function TalentDashboard() {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const { user } = useAuth()
  const [showSecurityModal, setShowSecurityModal] = useState(false)

  useEffect(() => {
    const safeUser = user as {
      provider?: string
      hasPassword?: boolean
    }

    const needsPasswordSetup =
      safeUser?.provider === "EMAIL" && !safeUser?.hasPassword

    if (safeUser && needsPasswordSetup) {
      setShowSecurityModal(true)
    }
    // setShowSecurityModal(true)
  }, [user])

  return (
    <>
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <SecuritySettingsStepper
            onCloseModal={() => setShowSecurityModal(false)}
          />
        </div>
      )}
      <AuthenticatedRoute>
        <div className="flex bg-gray-50">
          <LeftSidebar />
          <div className="flex-auto p-6 gap-x-8 flex justify-center min-[1024px]:py-8 min-[1024px]:pl-[256px] min-[1024px]:pr-8 xl:pr-[50px] xl:pl-[274px] 2xl:pr-[150px] 2xl:pl-[374px] overflow-hidden">
            <div className="max-w-[1042px] space-y-3 md:space-y-5 min-w-0">
              <Welcome onToggle={toggleIsOpen} />

              <RecentProjects />

              <CreateYourOwnProject />

              <RecommendedForYou />

              <BecomeTopSeller />

              <Carousel />

              <TakeCareersToNextLevel />

              <Footer />
            </div>

            <RightSidebar />
          </div>

          <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
            <DialogContent
              variant="unanimated"
              className="w-full md:w-[322px] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 inset-x-0 md:left-auto md:right-0 inset-y-0"
            >
              <button
                className="size-[28px] -left-3.5 absolute z-10 top-[104px] text-gray-500 focus-visible:outline-none rounded-full bg-white hidden md:inline-flex border border-gray-300 items-center justify-center shrink-0"
                onClick={toggleIsOpen}
              >
                <ChevronRight className="size-3" />
              </button>

              <div className="pl-3.5 p-1 sticky top-0 h-12 flex md:hidden items-center justify-between">
                <h1 className="text-sm leading-5 font-semibold text-dark-blue-400">
                  My Profile
                </h1>

                <DialogTrigger asChild>
                  <IconButton
                    className="opacity-50 hover:opacity-100"
                    size="md"
                    variant="ghost"
                    visual="gray"
                  >
                    <X className="size-[18px]" />
                  </IconButton>
                </DialogTrigger>
              </div>

              <ScrollArea
                className="w-full h-[calc(theme(size.full)-theme(size.12))]"
                scrollBar={<ScrollBar className="w-4 p-1" />}
              >
                <RightDrawer />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </AuthenticatedRoute>
    </>
  )
}

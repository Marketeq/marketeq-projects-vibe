import { User, X } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import { Button, IconButton } from "@/components/ui"

const meta: Meta = {
  title: "Client View Components",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Card = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="flex items-start">
        <div className="flex-auto">
          <h1 className="text-[20px] leading-none font-bold text-dark-blue-400">
            Ready to Get Hired?
          </h1>

          <p className="text-base font-light mt-1 text-dark-blue-400">
            Clients are 4x more likely to hire users with completed profiles!
          </p>
        </div>

        <IconButton variant="ghost" visual="gray">
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="mt-3">
        <div className="rounded-lg px-4 py-3 flex items-center gap-x-3 bg-white border border-gray-300 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
          <div className="rounded-full border border-gray-300 size-11 shrink-0 inline-flex items-center justify-center">
            <User className="size-5" />
          </div>

          <div className="flex-auto">
            <h1 className="text-base leading-6 font-bold text-dark-blue-400">
              Next up: Add Your Bio
            </h1>
            <p className="text-xs leading-none text-gray-500">
              Share what drives you and let clients connect on a personal level.
            </p>
          </div>

          <Button className="text-xs leading-5 font-semibold text-primary-500 border border-primary-500 bg-transparent rounded-full hover:bg-primary-500 hover:text-white">
            Finish This Step
          </Button>
        </div>
      </div>
    </div>
  )
}

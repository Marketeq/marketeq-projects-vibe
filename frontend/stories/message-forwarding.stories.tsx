import { Meta } from "@storybook/react"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Message Forwarding",
}

export default meta

export const MessageForwardingLimitDialog = () => {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[348px] shadow-xl p-6">
        <div className="rounded-xl bg-white">
          <h1 className="text-lg leading-7 font-semibold text-gray-900">
            Message Forwarding Limit
          </h1>

          <div className="mt-2 text-gray-500">
            You can forward messages to{" "}
            <span className="font-semibold text-gray-900">max 5 people</span> at
            a time
          </div>

          <div className="mt-9">
            <DialogClose asChild>
              <Button className="w-full" variant="outlined" visual="gray">
                Ok
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

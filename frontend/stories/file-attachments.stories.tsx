import { X } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Button,
  CircularProgressDropzone,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  IconButton,
} from "@/components/ui"

const meta: Meta = {
  title: "File Attachments",
}

export default meta

export const Default = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[467px] p-4">
        <h3 className="text-xs text-gray-900 leading-[14.52px] font-semibold">
          Upload Files
        </h3>
        <DialogClose asChild>
          <IconButton
            className="absolute rounded-full top-[3px] right-[3px] text-gray-800/50 hover:text-gray-900"
            visual="gray"
            variant="ghost"
          >
            <X className="size-4" />
          </IconButton>
        </DialogClose>

        <div className="mt-[9px]">
          <CircularProgressDropzone icon />
        </div>

        <div className="mt-[120px] grid grid-cols-2 gap-x-3">
          <DialogClose asChild>
            <Button visual="gray" variant="outlined">
              Cancel
            </Button>
          </DialogClose>
          <Button visual="primary" variant="filled">
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

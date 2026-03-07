import { Meta } from "@storybook/react"
import { Button } from "../button"
import { ToastAction } from "./toast"
import { Toaster } from "./toaster"
import { useToast } from "./use-toast"

const meta: Meta = {
  title: "Toast",
}

export default meta

export const Default = () => {
  const { toast } = useToast()
  return (
    <>
      <Button
        onClick={() =>
          toast({
            title: "“rightflair2046” has been saved to “Customer Service”",
          })
        }
      >
        Toast
      </Button>
      <Toaster />
    </>
  )
}
export const Success = () => {
  const { toast } = useToast()
  return (
    <>
      <Button
        onClick={() =>
          toast({
            title: "Phase added below",
            variant: "success",
            action: (
              <ToastAction
                altText="Undo"
                className="ml-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
              >
                Undo
              </ToastAction>
            ),
          })
        }
      >
        Success Toast
      </Button>
      <Toaster />
    </>
  )
}

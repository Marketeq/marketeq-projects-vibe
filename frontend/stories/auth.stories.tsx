import { Eye } from "@blend-metrics/icons"
import { GoogleDefault, LinkedInDefault } from "@blend-metrics/icons/social"
import { Meta } from "@storybook/react"
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTrigger,
  Input,
  InputGroup,
  InputRightElement,
  Label,
} from "@/components/ui"

const meta: Meta = {
  title: "Authentication",
}

export default meta

export const SignUp = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>

      <DialogContent className="max-w-[408px]">
        <h1 className="text-[28px] leading-9 font-semibold text-dark-blue-400">
          Create your free account
        </h1>

        <p className="text-base font-light mt-2 text-dark-blue-400">
          Get the most of our Marketeq
        </p>

        <div className="mt-5">
          <div className="grid gap-y-3">
            <Button
              className="gap-x-3 active:ring-4 active:ring-gray-100"
              visual="gray"
              variant="outlined"
              leftIcon={<GoogleDefault />}
            >
              Sign in with Google
            </Button>
            <Button
              className="gap-x-3 active:ring-4 active:ring-gray-100"
              visual="gray"
              variant="outlined"
              leftIcon={<LinkedInDefault />}
            >
              Sign in with Linkedin
            </Button>
          </div>

          <div className="mt-5 flex gap-x-[9px]">
            <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
            <span className="inline-block text-xs font-medium text-gray-400">
              Or use your email
            </span>
            <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
          </div>

          <form className="mt-5">
            <div className="flex flex-col gap-y-1.5">
              <Label>Email</Label>

              <Input placeholder="you@email.com" />
            </div>

            <div className="flex flex-col gap-y-1.5 mt-5">
              <Label size="sm" htmlFor="password">
                Password
              </Label>
              <InputGroup>
                <Input
                  id="password"
                  type="password"
                  placeholder="enter your password"
                />
                <InputRightElement>
                  <Eye className="text-gray-400 h-4 w-4" />
                </InputRightElement>
              </InputGroup>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <Checkbox />
                <Label className="font-normal text-gray-400" size="sm">
                  Remember me
                </Label>
              </div>

              <Button className="underline" visual="gray" variant="link">
                Forgot password
              </Button>
            </div>

            <div className="mt-5">
              <Button className="w-full">Create my account</Button>
            </div>
          </form>

          <div className="mt-10">
            <div className="text-sm text-gray-500">
              <span>Don’t have an account?</span>{" "}
              <Button variant="link" className="font-normal underline">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

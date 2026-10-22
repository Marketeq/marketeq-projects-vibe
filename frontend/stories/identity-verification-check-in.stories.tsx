import { useState } from "react"
import {
  CHECK_IN_COPY,
  CHECK_IN_DURATION_LABELS,
  durationCopyFor,
} from "@/src/lib/api/travel-check-in"
import { AlertTriangle, ArrowLeft, Info, X } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui"

// The periodic "Still traveling?" check-in (PMCM-641). The talent dashboard composes the
// same two states from the same parts and the same copy module.
//   CheckIn  — Figma node 13101-46785
//   DurationAskedBefore — Figma node 13101-46818 (the second and later time)
// The first-time duration question is the existing "Identity Verification / TravelingForm".
const meta: Meta = {
  title: "Identity Verification Check-In",
}

export default meta

export const CheckIn = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="w-[405px] pt-[50px]">
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-y-2">
          <DialogTitle className="max-w-[317px] text-center text-lg font-semibold leading-7 text-dark-blue-400">
            {CHECK_IN_COPY.prompt.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-center leading-5 text-dark-blue-400">
            {CHECK_IN_COPY.prompt.body}
          </DialogDescription>
        </div>

        <div className="mt-[50px] flex items-center justify-center gap-x-3">
          <Button variant="outlined" visual="gray" size="md">
            {CHECK_IN_COPY.prompt.stillTraveling}
          </Button>
          <Button variant="light" size="md">
            {CHECK_IN_COPY.prompt.updateHomeCountry}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// The duration question. Every row is one label tied to its radio: the circle, the text and
// the space around them select it, and a choice is the answer. The story keeps the choice and
// counts submissions so a click on the text can be seen to submit exactly once.
const DurationQuestion = ({ answerCount }: { answerCount: number }) => {
  const copy = durationCopyFor(answerCount)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [submissions, setSubmissions] = useState(0)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <div className="flex items-start justify-between">
          <IconButton size="md" visual="gray" variant="ghost">
            <ArrowLeft className="size-5" />
          </IconButton>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
          >
            <X className="size-5" />
          </IconButton>
        </div>

        <div className="mt-3 max-w-[554px] pt-[9px]">
          <DialogTitle className="text-lg font-medium leading-5 text-dark-blue-400">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
            {copy.body}
          </DialogDescription>
        </div>

        <RadioGroup
          className="mt-5 gap-y-0.5"
          aria-label={copy.title}
          value={selected}
          onValueChange={(label) => {
            setSelected(label)
            setSubmissions((n) => n + 1)
          }}
        >
          {CHECK_IN_DURATION_LABELS.map((label, index) => (
            <Label
              key={label}
              htmlFor={`check-in-duration-${answerCount}-${index}`}
              className="flex w-full cursor-pointer items-center gap-x-3 rounded-[5px] -mx-2 px-2 py-1 text-xs font-medium text-dark-blue-400 transition-colors hover:bg-gray-50 has-[:focus-visible]:bg-gray-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-100 has-[[data-state=checked]]:bg-primary-25 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:disabled]:hover:bg-transparent has-[:disabled]:has-[[data-state=checked]]:bg-primary-25"
            >
              <RadioGroupItem
                value={label}
                id={`check-in-duration-${answerCount}-${index}`}
              />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <p className="sr-only" aria-live="polite" data-testid="submissions">
          Submissions: {submissions}
        </p>

        <Alert className="mt-6">
          <AlertIcon>
            <Info className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>{copy.alert}</AlertTitle>
          </AlertContent>
        </Alert>

        <div className="mt-6 grid">
          <Button variant="outlined" visual="gray">
            {CHECK_IN_COPY.skip}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const DurationFirstTime = () => <DurationQuestion answerCount={0} />

export const DurationAskedBefore = () => <DurationQuestion answerCount={1} />

import Image from "next/image"
import {
  Award02,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  CoinsStacked02,
  CreditCard02,
  Edit03,
  FaceContent,
  FaceFrown,
  FaceNeutral,
  FaceSad,
  FaceSmile,
  Hand,
  Home03,
  Plus,
  Star,
  Target04,
  ThumbsDown,
  ThumbsUp,
  Trophy01,
  X,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Favorite,
  HeadlessRadioGroupItem,
  IconButton,
  Input,
  RadioGroup,
  Textarea,
} from "@/components/ui"

const meta: Meta = {
  title: "Reviews",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Default = () => {
  return (
    <div className="bg-gray-25 min-h-screen">
      <div className="border-b sticky top-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with Referrizer
            </h1>

            <div className="flex items-center gap-x-3">
              <Image
                className="object-contain"
                src="/player.png"
                alt="Player"
                height={48}
                width={75.08}
              />

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  Referrizer Website
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    Contract Completed
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    3 weeks
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    $35,000 earned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div className="py-[100px] px-[200px]">
        <div className="flex flex-col gap-y-3">
          <h1 className="text-[32px] leading-none text-dark-blue-400 font-bold">
            Leave Public Feedback
          </h1>
          <p className="text-sm text-gray-500">
            Your review will be public and help others understand your
            experience.
          </p>
        </div>

        <div className="mt-[50px]">
          <div className="space-y-6">
            <h1 className="text-[36px] font-semibold text-dark-blue-400">
              Your review will be public and help others understand your
              experience.
            </h1>

            <RadioGroup className="flex items-center gap-x-[50px]">
              <HeadlessRadioGroupItem
                value="item-1"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div className="group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:group-data-[state=checked]:border-primary-500 hover:group-data-[state=checked]:text-primary-500 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 border-[2px] border-gray-200 hover:border-gray-300 text-gray-500">
                  <FaceSad className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-primary-500">
                  Terrible
                </span>

                <div className="flex items-center gap-x-[1.47px]">
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                </div>
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-2"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div className="group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:group-data-[state=checked]:border-primary-500 hover:group-data-[state=checked]:text-primary-500 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 border-[2px] border-gray-200 hover:border-gray-300 text-gray-500">
                  <FaceFrown className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-primary-500">
                  Bad
                </span>

                <div className="flex items-center gap-x-[1.47px]">
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />

                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                </div>
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-3"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div className="group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:group-data-[state=checked]:border-primary-500 hover:group-data-[state=checked]:text-primary-500 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 border-[2px] border-gray-200 hover:border-gray-300 text-gray-500">
                  <FaceNeutral className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-primary-500">
                  Neutral
                </span>

                <div className="flex items-center gap-x-[1.47px]">
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />

                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                </div>
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-4"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div className="group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:group-data-[state=checked]:border-primary-500 hover:group-data-[state=checked]:text-primary-500 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 border-[2px] border-gray-200 hover:border-gray-300 text-gray-500">
                  <FaceSmile className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-primary-500">
                  Good
                </span>

                <div className="flex items-center gap-x-[1.47px]">
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />

                  <Star className="size-[14px] text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500" />
                </div>
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-5"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div className="group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:group-data-[state=checked]:border-primary-500 hover:group-data-[state=checked]:text-primary-500 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 border-[2px] border-gray-200 hover:border-gray-300 text-gray-500">
                  <FaceContent className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-primary-500">
                  Excellent
                </span>

                <div className="flex items-center gap-x-[1.47px]">
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                  <Star className="size-[14px] fill-dark-blue-400 text-dark-blue-400 shrink-0 group-data-[state=checked]:text-primary-500 group-data-[state=checked]:fill-primary-500" />
                </div>
              </HeadlessRadioGroupItem>
            </RadioGroup>
          </div>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-lg text-dark-blue-400 font-semibold leading-9">
            Would you work with this client again?
          </h1>

          <RadioGroup className="mt-6 flex items-center gap-x-[50px]">
            <HeadlessRadioGroupItem
              value="item-1"
              className="focus-visible:outline-none group flex flex-col gap-y-1"
            >
              <div className="group-data-[state=checked]:bg-success-25 group-data-[state=checked]:border-success-500 group-data-[state=checked]:text-success-500 text-gray-500 hover:bg-gray-50 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200">
                <ThumbsUp className="size-[37px]" />
              </div>

              <span className="group-data-[state=checked]:text-success-500 text-sm inline-block text-center leading-5 font-semibold text-gray-500">
                Yes
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-2"
              className="focus-visible:outline-none group flex flex-col gap-y-1"
            >
              <div className="group-data-[state=checked]:bg-error-25 group-data-[state=checked]:border-error-500 group-data-[state=checked]:text-error-500 text-gray-500 hover:bg-gray-50 size-[67px] shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200">
                <ThumbsDown className="size-[37px]" />
              </div>

              <span className="group-data-[state=checked]:text-error-500 text-sm inline-block text-center leading-5 font-semibold text-gray-500">
                No
              </span>
            </HeadlessRadioGroupItem>
          </RadioGroup>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-lg text-dark-blue-400 font-semibold leading-9">
            Would you work with this client again?{" "}
            <span className="text-sm font-normal">(Select up to 4) </span>
          </h1>

          <RadioGroup className="mt-6 flex items-center gap-x-6">
            <HeadlessRadioGroupItem
              value="item-1"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] hover:bg-gray-50 text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:group-data-[state=checked]:border-success-500 group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-25 group-data-[state=checked]:bg-success-25 group-data-[state=checked]:text-success-500">
                <Award02 className="size-[37px]" />
              </div>

              <span className="text-sm inline-block text-center leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Clear Expectations
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-2"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] hover:bg-gray-50 text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:group-data-[state=checked]:border-success-500 group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-25 group-data-[state=checked]:bg-success-25 group-data-[state=checked]:text-success-500">
                <Hand className="size-[37px]" />
              </div>

              <span className="text-sm inline-block text-center leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Smooth Collaboration
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-3"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] hover:bg-gray-50 text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:group-data-[state=checked]:border-success-500 group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-25 group-data-[state=checked]:bg-success-25 group-data-[state=checked]:text-success-500">
                <CoinsStacked02 className="size-[37px]" />
              </div>

              <span className="text-sm inline-block text-center leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Timely Payments
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-4"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] hover:bg-gray-50 text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:group-data-[state=checked]:border-success-500 group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-25 group-data-[state=checked]:bg-success-25 group-data-[state=checked]:text-success-500">
                <Target04 className="size-[37px]" />
              </div>

              <span className="text-sm inline-block text-center leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Detail-Oriented{" "}
              </span>
            </HeadlessRadioGroupItem>
          </RadioGroup>

          <RadioGroup className="mt-6 flex items-center gap-x-6">
            <HeadlessRadioGroupItem
              value="item-1"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-50 group-data-[state=checked]:border-success-500 group-data-[state=checked]:bg-success-50 group-data-[state=checked]:text-success-500">
                <Trophy01 className="size-[37px]" />
              </div>

              <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Great Team Player
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-2"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-50 group-data-[state=checked]:border-success-500 group-data-[state=checked]:bg-success-50 group-data-[state=checked]:text-success-500">
                <Clock className="size-[37px]" />
              </div>

              <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Respects Deadlines
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-3"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-50 group-data-[state=checked]:border-success-500 group-data-[state=checked]:bg-success-50 group-data-[state=checked]:text-success-500">
                <CheckSquare className="size-[37px]" />
              </div>

              <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Highly Professional
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-4"
              className="gap-y-1 flex flex-col items-center group focus-visible:outline-none"
            >
              <div className="size-[67px] text-gray-500 shrink-0 inline-flex items-center justify-center rounded-full bg-white border-[2px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:group-data-[state=checked]:border-success-500 hover:group-data-[state=checked]:bg-success-50 group-data-[state=checked]:border-success-500 group-data-[state=checked]:bg-success-50 group-data-[state=checked]:text-success-500">
                <CreditCard02 className="size-[37px]" />
              </div>

              <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 group-data-[state=checked]:text-success-500">
                Competitive Pay
              </span>
            </HeadlessRadioGroupItem>
          </RadioGroup>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-[22px] leading-[30px] font-bold text-dark-blue-400">
            How would you rate these aspects of the project?
          </h1>

          <div className="inline-grid grid-cols-2 mt-6 gap-x-6">
            <div className="space-y-6">
              <div className="h-10 flex items-center">
                <h1 className="text-sm leading-5 font-semibold text-gray-500">
                  Responsiveness
                </h1>
              </div>

              <div className="h-10 flex items-center">
                <h1 className="text-sm leading-5 font-semibold text-gray-500">
                  Timeliness
                </h1>
              </div>

              <div className="h-10 flex items-center">
                <h1 className="text-sm leading-5 font-semibold text-gray-500">
                  On-time Payment
                </h1>
              </div>

              <div className="h-10 flex items-center">
                <h1 className="text-sm leading-5 font-semibold text-gray-500">
                  Project Clarity
                </h1>
              </div>

              <div className="h-10 flex items-center">
                <h1 className="text-sm leading-5 font-semibold text-gray-500">
                  Professionalism
                </h1>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-x-[4.45px]">
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
              </div>

              <div className="flex items-center gap-x-[4.45px]">
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
              </div>

              <div className="flex items-center gap-x-[4.45px]">
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
              </div>

              <div className="flex items-center gap-x-[4.45px]">
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
              </div>

              <div className="flex items-center gap-x-[4.45px]">
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
                <Favorite
                  starClassName="size-[40.04px]"
                  className="size-[40.04px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[50px] space-y-6">
          <div className="space-y-3">
            <h1 className="text-lg leading-none font-semibold text-dark-blue-400">
              Tell us more about your experience working with this client.
              Elaborate on what went well or areas for improvement.
            </h1>

            <p className="text-sm leading-5 text-gray-500">
              Your review, along with project details and pricing, will be
              publicly visible.
            </p>
          </div>

          <Input
            className="w-full"
            placeholder="Write your public review title here..."
          />

          <Textarea
            className="h-[128px]"
            placeholder="Write your public review here..."
          />
        </div>

        <div className="mt-[50px] space-y-6">
          <div className="space-y-3">
            <h1 className="text-lg leading-9 text-dark-blue-400 font-semibold">
              Attach Images{" "}
              <span className="text-sm font-normal">(Up to 10)</span>
            </h1>

            <div className="flex items-center justify-between">
              <p className="text-sm leading-5 text-gray-500">
                Selected images will be included with your review.
              </p>
              <span className="text-xs leading-none text-gray-500">0/10</span>
            </div>
          </div>

          <div className="space-y-2.5 mt-6">
            <div className="grid grid-cols-5 gap-x-2.5">
              <div className="h-[100px] flex-col rounded-[5px] border-[2px] hover:border-gray-400 hover:bg-gray-100 text-gray-400 hover:text-gray-600 border-gray-300 bg-gray-50 border-dashed flex gap-y-2 items-center justify-center cursor-pointer">
                <Plus className="size-6" />
                <span className="inline-block text-sm leading-5">Image</span>
              </div>

              <div className="h-[100px] flex-col rounded-[5px] border-[2px] hover:border-gray-400 hover:bg-gray-100 text-gray-400 hover:text-gray-600 border-gray-300 bg-gray-50 border-dashed flex gap-y-2 items-center justify-center cursor-pointer">
                <Plus className="size-6" />
                <span className="inline-block text-sm leading-5">Image</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="link"
                visual="gray"
              >
                <X className="size-[15px]" />
                Add More
              </Button>

              <span className="inline-block text-xs leading-none text-gray-500">
                Supported formats: JPG, PNG
              </span>
            </div>
          </div>
        </div>

        <div className="mt-[50px] flex items-center justify-between">
          <Button size="md" variant="outlined" visual="gray">
            Need Help?
          </Button>

          <Button size="md">Continue</Button>
        </div>
      </div>
    </div>
  )
}

export const SendFeedback = () => {
  return (
    <div className="bg-gray-25 min-h-screen">
      <div className="border-b sticky top-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with Referrizer
            </h1>

            <div className="flex items-center gap-x-3">
              <Image
                className="object-contain"
                src="/player.png"
                alt="Player"
                height={48}
                width={75.08}
              />

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  Referrizer Website
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    Contract Completed
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    3 weeks
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    $35,000 earned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div className="py-[100px] px-[200px]">
        <div className="space-y-3">
          <h1 className="text-[32px] leading-none font-bold text-dark-blue-400">
            Leave Private Feedback{" "}
            <span className="font-normal text-lg">(optional)</span>
          </h1>

          <p className="text-sm leading-5 text-gray-500">
            Your private feedback helps improve platform quality, but will not
            be shared publicly.
          </p>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-[22px] font-bold leading-[30px] text-dark-blue-400">
            Was the process smooth, timely, and free of disputes?{" "}
            <span className="block">Select all that apply.</span>
          </h1>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold leading-none text-dark-blue-400">
              What went well?
            </h1>

            <div className="flex gap-3 mt-3 flex-wrap">
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
            </div>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold leading-none text-dark-blue-400">
              What went well?
            </h1>

            <div className="flex gap-3 mt-3 flex-wrap">
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
            </div>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg leading-none text-dark-blue-400 font-semibold">
              Submit your private feedback
            </h1>

            <p className="mt-3 text-base leading-none text-gray-500">
              Your private feedback helps us improve the platform. This
              conversation remains private between you and the platform and will
              not be shared with the client.
            </p>

            <Textarea
              className="mt-6 h-[128px]"
              placeholder="Enter your private feedback here..."
            />
          </div>

          <div className="mt-[50px] flex items-center justify-between">
            <Button variant="outlined" visual="gray" size="md">
              Need Help?
            </Button>

            <div className="flex items-center justify-center gap-x-3">
              <Button size="md" variant="outlined" visual="gray">
                Skip
              </Button>

              <Button size="md">Submit Feedback</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const BrowserProjects = () => {
  return (
    <div className="bg-gray-25 min-h-screen flex flex-col">
      <div className="border-b sticky top-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with Referrizer
            </h1>

            <div className="flex items-center gap-x-3">
              <Image
                className="object-contain"
                src="/player.png"
                alt="Player"
                height={48}
                width={75.08}
              />

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  Referrizer Website
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    Contract Completed
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    3 weeks
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    $35,000 earned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div className="px-[200px] grid place-items-center flex-1 py-[100px]">
        <div className="max-w-[1040px] w-full">
          <div className="flex items-center justify-center">
            <div className="size-[56px] inline-flex text-success-500 items-center justify-center shrink-0 border-[10px] bg-success-100 rounded-full border-success-50">
              <CheckCircle className="size-7" />
            </div>
          </div>

          <h1 className="text-[30px] mt-6 text-center text-dark-blue-400 font-bold leading-none">
            Your review has been submitted, thank you!
          </h1>

          <div className="max-w-[600px] text-center mt-6 mx-auto">
            We’ve received your review and are processing it. This may take a
            few days, and we appreciate your patience. You’ll be notified once
            it’s published.
          </div>

          <div className="mt-[50px] flex justify-center items-center gap-x-6">
            <Button size="2xl" visual="gray" variant="outlined">
              <Edit03 className="size-[18px]" />
              Edit your review
            </Button>
            <Button size="2xl">Browse Projects</Button>
          </div>

          <div className="mt-[50px] flex justify-center">
            <Button size="lg" variant="ghost">
              <Home03 className="size-[15px]" /> Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Modal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 rounded-xl">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Are you sure you want to exit?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your feedback helps others make informed decisions. You can return
            within 3 days to complete it.
          </DialogDescription>
        </div>

        <div className="px-6 py-4 flex items-center border-t border-gray-200 justify-between bg-gray-25 rounded-b-xl">
          <DialogClose asChild>
            <Button variant="link" visual="gray">
              <X className="size-[15px]" />
              Cancel
            </Button>
          </DialogClose>

          <Button variant="outlined" visual="gray">
            Save & Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

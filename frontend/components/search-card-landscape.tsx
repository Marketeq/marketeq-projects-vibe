import { ChevronRight, Clock, DollarSign, Users } from "@blend-metrics/icons"
import NextImage from "./next-image"
import NextLink from "./next-link"
import { Button } from "./ui"

export const SearchCardLandscape = () => {
  return (
    <article className="flex md:flex-row flex-col rounded-lg overflow-hidden border border-gray-[#122A4B]/[0.15] bg-white">
      <div className="relative flex-none h-[154.16px] md:h-auto md:w-[284px]">
        <NextImage
          className="object-cover"
          src="/ui-ux.png"
          alt="UI-UX"
          sizes="25vw"
          fill
        />
      </div>
      <div className="flex-auto p-5 border-t md:border-l border-gray-[#122A4B]/[0.15]">
        <h1 className="text-sm leading-[16.94px] lg:text-base lg:leading-[18.75px] font-bold text-[#122A4B]">
          The Ultimate Mobile App Experience
        </h1>
        <p className="text-xs leading-[14.52px] lg:text-sm lg:leading-[16.41px] font-light text-[#585C65] mt-2 lg:mt-[17px]">
          A complete funnel system for your customer service needs. Lorem sit
          voluptatem consoridus adipiscing elit sed do eiusmod tempor incididunt
          et dolore aliqua. Duis aute irure dolor in reprehenderit in voluptate
          velit esse cillum dolore.
        </p>

        <div className="flex items-center gap-x-[17px] mt-[17px]">
          <NextLink
            href="#"
            className="text-xs leading-[14.52px] lg:text-[13px] focus-visible:outline-none underline lg:leading-[15.23px] text-primary-500"
          >
            Cloud Software
          </NextLink>
          <NextLink
            href="#"
            className="text-xs leading-[14.52px] lg:text-[13px] focus-visible:outline-none underline lg:leading-[15.23px] text-primary-500"
          >
            Fintech
          </NextLink>
        </div>

        <div className="flex md:flex-row flex-col gap-y-5 justify-between md:items-end mt-5 lg:mt-1.5">
          <div className="lg:contents flex flex-col gap-y-5">
            <div className="inline-flex items-center gap-x-3">
              <Clock className="flex-none size-3.5 text-primary-500" />
              <span className="text-xs leading-[14.52px] lg:text-sm lg:leading-none font-light text-[#122A4B]">
                Average 12 weeks
              </span>
            </div>

            <div className="inline-flex items-center gap-x-3">
              <DollarSign className="flex-none size-3.5 text-primary-500" />
              <span className="text-xs leading-[14.52px] lg:text-sm lg:leading-none font-light text-[#122A4B]">
                Starting at $40k
              </span>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <Users className="flex-none size-3.5 fill-primary-500 text-primary-500" />
              <span className="text-xs leading-[14.52px] lg:text-sm lg:leading-none font-light text-[#122A4B]">
                Min 4 team members
              </span>
            </div>
          </div>

          <Button
            className="border-primary-500 text-primary-500 hover:text-white hover:bg-primary-500"
            variant="outlined"
            visual="gray"
          >
            View Details <ChevronRight className="size-[15px]" />
          </Button>
        </div>
      </div>
    </article>
  )
}

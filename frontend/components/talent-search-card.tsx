import { Check, MarkerPin02, Star } from "@blend-metrics/icons"
import { useMeasure, useToggle } from "react-use"
import NextLink from "./next-link"
import { Avatar, AvatarFallback, AvatarImage, Button, Favorite } from "./ui"

const links = [
  "Wireframing",
  "Sketch App",
  "Axure RP",
  "Visual Design",
  "Sketch App",
  "Figma",
  "Affinity Photo",
]

export const TalentSearchCard = () => {
  const [linkRef, { height: linkHeight }] = useMeasure<HTMLButtonElement>()
  const [linksContainerRef, { height: linksContainerHeight }] =
    useMeasure<HTMLDivElement>()
  const hasMoreThanThreeLines = linksContainerHeight >= linkHeight * 4
  const [isExpanded, toggleIsExpanded] = useToggle(false)
  return (
    <article className="rounded-lg flex flex-col shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] bg-white border border-gray-200">
      <div className="relative p-5 lg:pt-[35px] lg:p-[30px] lg:pb-[25px]">
        <div className="inline-flex top-[11px] left-[11px] absolute items-center gap-x-1 shrink-0 py-[3px] px-1.5 lg:py-1 lg:px-2 bg-primary-500 text-white rounded-[4px] shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
          <Star className="size-3 fill-white" />
          <span className="text-[10px] leading-[12.1px] lg:text-xs lg:leading-[14.52px] font-medium">
            5.0
          </span>
        </div>

        <Favorite
          className="size-5 absolute top-[11px] right-[11px] lg:top-[12px] lg:right-[12px]"
          starClassName="size-5"
        />

        <div className="flex justify-center">
          <NextLink href="#" className="relative inline-block">
            <Avatar className="size-[62px] lg:size-[116px]" size="2xl">
              <AvatarImage src="/woman.jpg" alt="Woman" />
              <AvatarFallback>W</AvatarFallback>
            </Avatar>
            <span className="size-[18px] lg:size-[29px] absolute inline-flex items-center justify-center rounded-full bottom-[4.28px] left-1 border-[1.5px] border-white bg-success-500">
              <Check className="text-white size-[9.31px] lg:size-[15px]" />
            </span>
          </NextLink>
        </div>

        <div className="mt-3 lg:mt-[17px] space-y-2 lg:space-y-1">
          <NextLink
            href="#"
            className="block text-[13px] hover:underline leading-[15.73px] lg:text-base text-center lg:leading-[21.79px] font-bold text-gray-[#122A4B]"
          >
            berra.unall4
          </NextLink>
          <p className="text-center text-[11px] leading-[13.31px] lg:text-sm lg:leading-[19.07px] font-light text-[#585C65]">
            Lead Software Developer
          </p>
        </div>

        <div className="flex mt-3 lg:mt-[17px] items-center justify-center">
          <Button
            className="xs:max-lg:text-[10px] xs:max-lg:leading-5 xs:max-lg:gap-x-1 text-xs leading-5"
            variant="link"
          >
            <MarkerPin02 className="size-3 lg:size-[15px]" /> Slovakia
          </Button>
        </div>
      </div>
      <div
        className="border-t mt-auto border-gray-200 flex gap-2 flex-wrap bg-[#122A4B]/[0.02] p-3 lg:p-5"
        ref={linksContainerRef}
      >
        {isExpanded && hasMoreThanThreeLines
          ? links.map((item, index) => (
              <Button
                className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline text-xs leading-5"
                variant="link"
                visual="gray"
                ref={linkRef}
                key={index}
              >
                {item}
              </Button>
            ))
          : links.slice(0, 5).map((item, index) => (
              <Button
                className="xs:max-lg:text-[10px] xs:max-lg:leading-5 opacity-50 hover:opacity-100 hover:no-underline text-xs leading-5"
                variant="link"
                visual="gray"
                ref={linkRef}
                key={index}
              >
                {item}
              </Button>
            ))}

        {hasMoreThanThreeLines &&
          (isExpanded ? (
            <Button
              className="xs:max-lg:text-[10px] xs:max-lg:leading-5 hover:no-underline text-xs leading-5"
              variant="link"
              visual="gray"
              onClick={toggleIsExpanded}
            >
              View Less
            </Button>
          ) : (
            <Button
              className="xs:max-lg:text-[10px] xs:max-lg:leading-5 hover:no-underline text-xs leading-5"
              variant="link"
              visual="gray"
              onClick={toggleIsExpanded}
            >
              More...
            </Button>
          ))}
      </div>
    </article>
  )
}

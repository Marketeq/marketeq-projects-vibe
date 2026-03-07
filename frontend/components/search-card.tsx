import NextImage from "./next-image"
import { Favorite } from "./ui"

export const SearchCard = () => {
  return (
    <article className="rounded-[8px] border bg-white border-gray-[#122A4B]/[.15] overflow-hidden shadow-[0px_2px_5px_0px_theme(colors.black/.04)]">
      <div className="relative h-[140px]">
        <NextImage
          className="object-cover"
          src="/ux.jpeg"
          alt="UX"
          fill
          sizes="25vw"
        />
      </div>

      <div className="p-5">
        <h1 className="text-base leading-[18.75px] font-bold text-dark-blue-400">
          The Ultimate Mobile App Experience
        </h1>

        <p className="text-sm mt-3 font-light text-[#667085]">
          A complete funnel system for your customer service needs
        </p>

        <div className="flex items-center justify-between mt-[19px]">
          <p className="text-sm font-light text-[#667085]">
            Starts at $40k, 12 weeks
          </p>

          <Favorite
            className="text-[#122A4B]/[.15] size-6"
            starClassName="size-6"
          />
        </div>
      </div>
    </article>
  )
}

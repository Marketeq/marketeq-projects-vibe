import { Meta } from "@storybook/react"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import {
  RatingGroupContext,
  RatingGroupControl,
  RatingGroupHiddenInput,
  RatingGroupItem,
  RatingGroupItemContext,
  RatingGroupLabel,
  RatingGroupRoot,
} from "./rating-group"

const meta: Meta = {
  title: "RatingGroup",
}

export default meta

export const Default = () => {
  return (
    <RatingGroupRoot allowHalf count={5} defaultValue={3}>
      <RatingGroupLabel>Label</RatingGroupLabel>
      <RatingGroupControl>
        <RatingGroupContext>
          {({ items }) =>
            items.map((item) => (
              <RatingGroupItem key={item} index={item}>
                <RatingGroupItemContext>
                  {({ half }) => (half ? <TbStarHalfFilled /> : <TbStar />)}
                </RatingGroupItemContext>
              </RatingGroupItem>
            ))
          }
        </RatingGroupContext>
        <RatingGroupHiddenInput />
      </RatingGroupControl>
    </RatingGroupRoot>
  )
}

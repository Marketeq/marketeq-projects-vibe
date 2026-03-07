import { Meta } from "@storybook/react"
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "@/components/ui"

const meta: Meta = {
  title: "Slider",
}

export default meta

export const Default = () => {
  return (
    <SliderRoot>
      <SliderTrack>
        <SliderRange />
      </SliderTrack>
      <SliderThumb />
    </SliderRoot>
  )
}

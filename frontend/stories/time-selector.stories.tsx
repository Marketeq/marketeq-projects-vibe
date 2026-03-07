import { TIMES } from "@/utils/constants"
import { Meta } from "@storybook/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"

const meta: Meta = {
  title: "Time Selector",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Default = () => {
  return (
    <Select>
      <SelectTrigger className="rounded-[5px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIMES.map((item, index) => (
          <SelectItem value={item} key={index}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

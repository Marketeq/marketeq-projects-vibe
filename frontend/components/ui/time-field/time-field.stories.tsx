import { Meta } from "@storybook/react"
import {
  TimeField,
  TimeFieldInput,
  TimeFieldLabel,
  TimeFieldSegment,
} from "./time-field"

const meta: Meta = {
  title: "TimeField",
}

export default meta

export const Default = () => {
  return (
    <TimeField>
      <TimeFieldLabel>Event time</TimeFieldLabel>
      <TimeFieldInput>
        {(segment) => <TimeFieldSegment segment={segment} />}
      </TimeFieldInput>
    </TimeField>
  )
}

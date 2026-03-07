import { Meta } from "@storybook/react"
import {
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
} from "./editable"

const meta: Meta = {
  title: "Editable",
}

export default meta

export const Default = () => {
  return (
    <EditableRoot placeholder="Task">
      <EditableLabel>Task</EditableLabel>
      <EditableArea>
        <EditableInput />
        <EditablePreview />
      </EditableArea>
    </EditableRoot>
  )
}

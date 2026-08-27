import { useState } from "react"
import { Meta } from "@storybook/react"
import { EditorTopBar } from "@/components/case-study/editor-top-bar"
import CaseStudyEditor from "@/components/case-study/case-study-editor"

const meta: Meta = {
  title: "Case Study Editor",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const TopBar = () => {
  const [isPreview, setIsPreview] = useState(false)
  return (
    <EditorTopBar
      projectName="Project Name Here"
      canUndo={false}
      canRedo={false}
      lastSavedAt="2:45 PM"
      isPreview={isPreview}
      onPreviewToggle={() => setIsPreview((v) => !v)}
    />
  )
}

export const FullEditor = () => <CaseStudyEditor />

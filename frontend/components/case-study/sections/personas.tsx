"use client"

import { useEffect, useState } from "react"
import { PictureEditor, useToast } from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { PersonasData } from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"
import { ImageEditModal } from "@/components/case-study/image-edit-modal"
import { BlockImage, Html, RichTextEditor, imageTransformStyle } from "./_shared"

function PersonasEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: PersonasData) => void
}) {
  const [name, setName] = useState(
    (initialData?.nameHtml as string) ?? "Jane Doe"
  )
  const [role, setRole] = useState(
    (initialData?.roleHtml as string) ?? "28, Professional Model"
  )
  const [about, setAbout] = useState(
    (initialData?.aboutHtml as string) ??
      "Jane is a Professional Model who lives in New York. She has been modeling for about 10 years at different companies like GAP, Levi's, Banana Republic and Theory. It was when she was around 21 when she was contacted by the agency."
  )
  const [goals, setGoals] = useState(
    (initialData?.goalsHtml as string) ??
      "Always stay up-to-date and follow on her dietary restrictions and schedule"
  )
  const [frustrations, setFrustrations] = useState(
    (initialData?.frustrationsHtml as string) ??
      "Not all restaurants and markets provide exact ingredients"
  )
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    initialData?.imageUrl as string | undefined
  )
  const [imageZoom, setImageZoom] = useState<number>(
    (initialData?.imageZoom as number) ?? 1
  )
  const [imageRotation, setImageRotation] = useState<number>(
    (initialData?.imageRotation as number) ?? 0
  )
  const [imageOffsetX, setImageOffsetX] = useState<number>(
    (initialData?.imageOffsetX as number) ?? 50
  )
  const [imageOffsetY, setImageOffsetY] = useState<number>(
    (initialData?.imageOffsetY as number) ?? 50
  )
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    onDataChange?.({
      nameHtml: name,
      roleHtml: role,
      aboutHtml: about,
      goalsHtml: goals,
      frustrationsHtml: frustrations,
      imageUrl,
      imageZoom,
      imageRotation,
      imageOffsetX,
      imageOffsetY,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, role, about, goals, frustrations, imageUrl, imageZoom, imageRotation, imageOffsetX, imageOffsetY])

  return (
    <div className="grid grid-cols-[493fr_545fr] border border-gray-200 rounded-lg  relative group">
      <div className="group/column relative rounded-l-lg flex flex-col justify-end">
        <PictureEditor
          skipEditStep
          onValueChange={(files) => {
            const file = (files as File[] | undefined)?.[0]
            if (file instanceof File) {
              uploadCaseStudyImage(file)
                .then(setImageUrl)
                .catch(() => {
                  toast({
                    title: "Couldn't upload image",
                    description: "Please try again.",
                  })
                })
            }
          }}
          startingPoint={({ dataUrl, open, onRemove }) => (
            <div className="group/image absolute inset-0 bg-gray-100 grid rounded-l-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
              {dataUrl || imageUrl ? (
                <div className="size-full relative rounded-l-lg overflow-hidden">
                  <img
                    src={dataUrl || imageUrl}
                    aria-label="Picture"
                    className="size-full object-cover rounded-l-lg"
                    style={imageTransformStyle(imageZoom, imageRotation, imageOffsetX, imageOffsetY)}
                  />
                </div>
              ) : null}
              <BlockImageToolbar
                className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover/image:opacity-100 group-hover/image:pointer-events-auto transition duration-300"
                onAddImage={open}
                onRemove={() => {
                  onRemove()
                  setImageUrl(undefined)
                  setImageZoom(1)
                  setImageRotation(0)
                  setImageOffsetX(50)
                  setImageOffsetY(50)
                }}
                onEdit={() => setIsImageEditOpen(true)}
                enableEdit={!!dataUrl || !!imageUrl}
                enableRemove={!!dataUrl || !!imageUrl}
              />
            </div>
          )}
        />
        <ImageEditModal
          open={isImageEditOpen}
          onClose={() => setIsImageEditOpen(false)}
          imageUrl={imageUrl ?? ""}
          title="Edit Image"
          initialZoom={imageZoom}
          initialRotation={imageRotation}
          initialOffsetX={imageOffsetX}
          initialOffsetY={imageOffsetY}
          aspectRatio={493 / 430.9}
          objectFit="cover"
          onSave={({ zoom, rotation, offsetX, offsetY }) => {
            setImageZoom(zoom)
            setImageRotation(rotation)
            setImageOffsetX(offsetX)
            setImageOffsetY(offsetY)
          }}
        />

        <div className="rounded-l-lg relative group-hover/column:bg-none bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,.2)_100%)] p-8">
          <div>
            <div className="relative">
              <RichTextEditor
                defaultValue={name}
                onUpdate={setName}
                editorClassName="text-[40px] leading-[48px] font-semibold text-white"
              />
            </div>
            <div className="relative mt-3">
              <RichTextEditor
                defaultValue={role}
                onUpdate={setRole}
                editorClassName="text-2xl leading-[29px] text-white"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        <div className="relative">
          <h1 className="text-2xl leading-[29px] font-semibold text-dark-blue-400">
            About
          </h1>
        </div>

        <div className="mt-3 relative">
          <RichTextEditor
            defaultValue={about}
            onUpdate={setAbout}
            editorClassName="text-2xl font-light leading-[29px] text-dark-blue-400"
          />
        </div>

        <div className="mt-[34.45px]">
          <div className="relative">
            <h1 className="text-2xl leading-[29px] font-semibold text-dark-blue-400">
              Goals
            </h1>
          </div>

          <div className="mt-3 relative">
            <RichTextEditor
              defaultValue={goals}
              onUpdate={setGoals}
              editorClassName="text-2xl font-light leading-[29px] text-dark-blue-400"
            />
          </div>
        </div>
        <div className="mt-[34.45px]">
          <div className="relative">
            <h1 className="text-2xl leading-[29px] font-semibold text-dark-blue-400">
              Frustrations
            </h1>
          </div>

          <div className="mt-3 relative">
            <RichTextEditor
              defaultValue={frustrations}
              onUpdate={setFrustrations}
              editorClassName="text-2xl font-light leading-[29px] text-dark-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonasView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  return (
    <section className="grid md:grid-cols-[493fr_545fr] border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative min-h-[300px] overflow-hidden">
        <BlockImage
          url={d.imageUrl}
          zoom={d.imageZoom}
          rotation={d.imageRotation}
          offsetX={d.imageOffsetX}
          offsetY={d.imageOffsetY}
          className="absolute inset-0 h-full w-full rounded-none"
        />
        <div className="bg-black/20 p-8 flex flex-col justify-end absolute inset-0">
          <Html
            html={d.nameHtml}
            className="text-[40px] leading-[48px] font-semibold text-white"
          />
          <Html
            html={d.roleHtml}
            className="text-2xl mt-3 leading-[29px] text-white"
          />
        </div>
      </div>
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-dark-blue-400 leading-[29px]">
          About
        </h1>
        <Html
          html={d.aboutHtml}
          className="font-light text-dark-blue-400 mt-3 leading-[29px] text-2xl"
        />
        <h1 className="text-2xl font-semibold text-dark-blue-400 leading-[29px] mt-[34.45px]">
          Goals
        </h1>
        <Html
          html={d.goalsHtml}
          className="font-light text-dark-blue-400 mt-3 leading-[29px] text-2xl"
        />
        <h1 className="text-2xl font-semibold text-dark-blue-400 leading-[29px] mt-[34.45px]">
          Frustrations
        </h1>
        <Html
          html={d.frustrationsHtml}
          className="font-light text-dark-blue-400 mt-3 leading-[29px] text-2xl"
        />
      </div>
    </section>
  )
}

export function PersonasSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: PersonasData) => void
}) {
  if (isEditing) {
    return <PersonasEdit initialData={data} onDataChange={onDataChange} />
  }
  return <PersonasView data={data} />
}

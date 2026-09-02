"use client"

import React, { useEffect, useState } from "react"
import { Reorder } from "framer-motion"
import { AlertCircle } from "@blend-metrics/icons"
import { getId } from "@/utils/functions"
import { Alert, AlertContent, AlertDescription, AlertIcon, PictureEditor } from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { ColumnItem, CustomColumnsData } from "@/lib/case-study-mapper"
import { BlockImageToolbar, BlockToolbar } from "@/components/case-study/toolbars"
import { AddBlockDivider } from "@/components/case-study/add-block-divider"
import { ImageEditModal } from "@/components/case-study/image-edit-modal"
import { ArticleRoot, BlockImage, ControlledDraggable, Html, Picture, RichTextEditor, imageTransformStyle, swap } from "./_shared"

const MIN_COLUMNS = 2
const MAX_COLUMNS = 3

const defaultColumns: ColumnItem[] = [
  {
    width: 1,
    titleHtml: "This is your heading",
    bodyHtml:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  },
  {
    width: 1,
    titleHtml: "This is your heading",
    bodyHtml:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  },
]

/** Contextual heads-up shown while a columns section sits at the min or max column count. */
function ColumnLimitBanner({ count }: { count: number }) {
  if (count === MAX_COLUMNS) {
    return (
      <Alert variant="warning" className="mb-6">
        <AlertIcon>
          <AlertCircle className="size-5" />
        </AlertIcon>
        <AlertContent>
          <AlertDescription className="mt-0">
            You have a maximum of three columns. Once you already have three
            columns, we remove the ability to duplicate the column.
          </AlertDescription>
        </AlertContent>
      </Alert>
    )
  }

  if (count === MIN_COLUMNS) {
    return (
      <Alert variant="warning" className="mb-6">
        <AlertIcon>
          <AlertCircle className="size-5" />
        </AlertIcon>
        <AlertContent>
          <AlertDescription className="mt-0">
            You have a minimum of two columns. Once you already have two
            columns, we remove the ability to hide and delete any column.
            You will be able to duplicate any column to add a new one.
          </AlertDescription>
        </AlertContent>
      </Alert>
    )
  }

  return null
}

function ColumnsEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: CustomColumnsData) => void
}) {
  const [title, setTitle] = useState(
    (initialData?.titleHtml as string) ?? "These are your columns"
  )
  const initialCols = (initialData?.columns as ColumnItem[] | undefined)
    ?.length
    ? (initialData!.columns as ColumnItem[])
    : defaultColumns
  const [ids] = useState(() => initialCols.map(() => getId()))
  const [items, setItems] = useState(ids)
  const [colData, setColData] = useState<Record<number, ColumnItem>>(() =>
    Object.fromEntries(ids.map((id, i) => [id, initialCols[i]]))
  )
  const [editingImageItem, setEditingImageItem] = useState<number | null>(null)
  const len = items.length

  // Inserts a fresh column at `at`, seeding colData too — items and colData
  // must stay in lockstep, otherwise columns.map((id) => colData[id]) below
  // (and ColumnsView's render) hits an undefined entry for the new id.
  const addColumnAt = (at: number) => {
    const uniqueId = getId() + 2
    setItems((prev) => prev.toSpliced(at, 0, uniqueId))
    setColData((prev) => ({
      ...prev,
      [uniqueId]: {
        width: 1,
        titleHtml: "This is your heading",
        bodyHtml:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      },
    }))
  }

  useEffect(() => {
    onDataChange?.({ titleHtml: title, columns: items.map((id) => colData[id]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, items, colData])

  return (
    <div className="relative group">
      <ColumnLimitBanner count={len} />

      <div className="relative">
        <RichTextEditor
          defaultValue={title}
          onUpdate={setTitle}
          editorClassName="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
        />
      </div>

      <div className="mt-8">
        <Reorder.Group
          as="div"
          className="isolate relative flex items-stretch gap-x-[50px]"
          axis="x"
          values={items}
          onReorder={setItems}
        >
          {items.map((item, index) => (
            <React.Fragment key={item}>
              <div
                style={{ flexGrow: colData[item]?.width ?? 1, flexBasis: 0 }}
                className="relative min-w-0 flex group/gap"
              >
              <ControlledDraggable withFragments>
                {(dragControls) => (
                  <ArticleRoot
                    value={item}
                    isLast={index === len - 1}
                    dragControls={dragControls}
                    className="border-0 w-full"
                    outlinedContainer
                  >
                    <BlockToolbar
                      className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10 group-focus-within/article:hidden group-hover/article:group-focus-within/article:hidden"
                      onDrag={(event) => dragControls.start(event)}
                      canMoveLeft={Boolean(index)}
                      moveLeft={() => setItems(swap(items, index, index - 1))}
                      canMoveRight={index < len - 1}
                      moveRight={() => setItems(swap(items, index, index + 1))}
                      canRemove={len > MIN_COLUMNS}
                      onRemove={() =>
                        setItems(items.filter((itm) => itm !== item))
                      }
                      canDuplicate={len < MAX_COLUMNS}
                      onDuplicate={() => addColumnAt(index)}
                    />

                    <div className="relative">
                      <PictureEditor
                        skipEditStep
                        onValueChange={(files) => {
                          const file = (files as File[] | undefined)?.[0]
                          if (file instanceof File) {
                            uploadCaseStudyImage(file).then((url) =>
                              setColData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], imageUrl: url },
                              }))
                            )
                          }
                        }}
                        startingPoint={({
                          dataUrl,
                          open,
                          style,
                          onRemove,
                          onEdit,
                        }) => (
                          <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image h-[250px] bg-gray-100 grid rounded-lg place-items-center hover:bg-black/20 hover:ring-2 hover:ring-primary-500 transition duration-300">
                            {dataUrl || colData[item]?.imageUrl ? (
                              <div className="size-full rounded-lg overflow-hidden">
                                <img
                                  src={dataUrl || colData[item]?.imageUrl}
                                  aria-label="Picture"
                                  className="size-full object-contain rounded-lg"
                                  style={imageTransformStyle(
                                    colData[item]?.imageZoom,
                                    colData[item]?.imageRotation,
                                    colData[item]?.imageOffsetX,
                                    colData[item]?.imageOffsetY
                                  )}
                                />
                              </div>
                            ) : (
                              <>
                                <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-white" />
                              </>
                            )}
                            <BlockImageToolbar
                              className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover/image:opacity-100 group-hover/image:pointer-events-auto transition duration-300"
                              onAddImage={open}
                              onRemove={() => {
                                onRemove()
                                setColData((prev) => ({
                                  ...prev,
                                  [item]: {
                                    ...prev[item],
                                    imageUrl: undefined,
                                    imageZoom: undefined,
                                    imageRotation: undefined,
                                    imageOffsetX: undefined,
                                    imageOffsetY: undefined,
                                  },
                                }))
                              }}
                              onEdit={() => setEditingImageItem(item)}
                              enableEdit={!!dataUrl || !!colData[item]?.imageUrl}
                              enableRemove={!!dataUrl || !!colData[item]?.imageUrl}
                            />
                          </div>
                        )}
                      />

                      <ImageEditModal
                        open={editingImageItem === item}
                        onClose={() => setEditingImageItem(null)}
                        imageUrl={colData[item]?.imageUrl ?? ""}
                        title="Edit Image"
                        initialZoom={colData[item]?.imageZoom ?? 1}
                        initialRotation={colData[item]?.imageRotation ?? 0}
                        initialOffsetX={colData[item]?.imageOffsetX ?? 50}
                        initialOffsetY={colData[item]?.imageOffsetY ?? 50}
                        aspectRatio={346.67 / 250}
                        onSave={({ zoom, rotation, offsetX, offsetY }) =>
                          setColData((prev) => ({
                            ...prev,
                            [item]: {
                              ...prev[item],
                              imageZoom: zoom,
                              imageRotation: rotation,
                              imageOffsetX: offsetX,
                              imageOffsetY: offsetY,
                            },
                          }))
                        }
                      />
                      <div className="mt-6">
                        <div className="relative">
                          <RichTextEditor
                            defaultValue={
                              colData[item]?.titleHtml ?? "This is your heading"
                            }
                            onUpdate={(val) =>
                              setColData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], titleHtml: val },
                              }))
                            }
                            editorClassName="text-2xl leading-[29px] font-semibold text-dark-blue-400"
                          />
                        </div>
                        <div className="relative mt-3">
                          <RichTextEditor
                            defaultValue={
                              colData[item]?.bodyHtml ??
                              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
                            }
                            onUpdate={(val) =>
                              setColData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], bodyHtml: val },
                              }))
                            }
                            editorClassName="text-2xl leading-[29px] font-light text-dark-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  </ArticleRoot>
                )}
              </ControlledDraggable>

              {index < len - 1 && len < MAX_COLUMNS && (
                <div className="absolute -right-[25px] top-0 h-full flex items-center justify-center pointer-events-none">
                  <div className="pointer-events-auto invisible group-hover/gap:visible transition-[visibility] duration-300">
                    <AddBlockDivider.Vertical
                      className="h-[402px] max-h-full"
                      onAdd={() => addColumnAt(index + 1)}
                    />
                  </div>
                </div>
              )}
              </div>
            </React.Fragment>
          ))}
        </Reorder.Group>
      </div>
    </div>
  )
}

function ColumnsView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  const columns = Array.isArray(d.columns) ? (d.columns as ColumnItem[]) : []
  return (
    <section>
      <Html
        html={d.titleHtml}
        className="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
      />
      {columns.length ? (
        <div className="flex flex-col md:flex-row gap-x-[50px] gap-y-[50px] mt-8">
          {columns.map((col, i) => (
            <div
              key={i}
              style={{ flexGrow: col.width ?? 1, flexBasis: 0 }}
              className="min-w-0"
            >
              <div className="relative overflow-hidden rounded-lg h-[250px]">
                <BlockImage
                  url={col.imageUrl}
                  zoom={col.imageZoom}
                  rotation={col.imageRotation}
                  offsetX={col.imageOffsetX}
                  offsetY={col.imageOffsetY}
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
              <Html
                html={col.titleHtml}
                className="text-2xl leading-[29px] font-semibold text-dark-blue-400 mt-6"
              />
              <Html
                html={col.bodyHtml}
                className="text-2xl leading-[29px] font-light text-dark-blue-400 mt-3"
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function ColumnsSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: CustomColumnsData) => void
}) {
  if (isEditing) {
    return <ColumnsEdit initialData={data} onDataChange={onDataChange} />
  }
  return <ColumnsView data={data} />
}

"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getComputedStyle, matchesExtensions } from "@/utils/dom-utils"
import { cn, getIsNotEmpty, noop, toDeg, toPxIfNumber } from "@/utils/functions"
import { useStateMachine, useUncontrolledState } from "@/utils/hooks"
import {
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  RotateCw,
  Trash03,
  X,
  ZoomIn,
  ZoomOut,
} from "@blend-metrics/icons"
import { motion, useDragControls, useMotionValue } from "framer-motion"
import { ErrorCode, FileWithPath, useDropzone } from "react-dropzone"
import { useMeasure } from "react-use"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ErrorMessage,
  Slider,
} from "@/components/ui"

const defaultState = {
  scaled: 0,
  rotated: 0,
  translateX: 0,
  translateY: 0,
}

const AVATAR_FRAME_SIZE = 238.22
const IMAGE_FRAME_WIDTH = 324
const IMAGE_FRAME_HEIGHT = 202

const cloneDefaultState = () => ({
  scaled: defaultState.scaled,
  rotated: defaultState.rotated,
  translateX: defaultState.translateX,
  translateY: defaultState.translateY,
})

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(reader.result as string))
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Unable to read image."))
    })
    reader.readAsDataURL(blob)
  })

const resolveImageDataUrl = async (value: string) => {
  if (value.startsWith("data:")) {
    return value
  }

  const response = await fetch(value)
  if (!response.ok) {
    throw new Error("Unable to load image.")
  }

  return readBlobAsDataUrl(await response.blob())
}

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Unable to load image."))
    image.src = src
  })

const getFileMimeType = (fileName?: string | null) => {
  const normalized = fileName?.toLowerCase() ?? ""

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg"
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp"
  }

  return "image/png"
}

const ensureFileExtension = (fileName: string, mimeType: string) => {
  if (/\.[a-z0-9]+$/i.test(fileName)) {
    return fileName
  }

  if (mimeType === "image/jpeg") return `${fileName}.jpg`
  if (mimeType === "image/webp") return `${fileName}.webp`

  return `${fileName}.png`
}

const renderEditedImageFile = async ({
  dataUrl,
  fileName,
  variant,
  scaled,
  rotated,
  translateX,
  translateY,
}: {
  dataUrl: string
  fileName?: string | null
  variant: "avatar" | "image"
  scaled: number
  rotated: number
  translateX: number
  translateY: number
}) => {
  const image = await loadImageElement(dataUrl)
  const isAvatar = variant === "avatar"
  const frameWidth = isAvatar ? AVATAR_FRAME_SIZE : IMAGE_FRAME_WIDTH
  const frameHeight = isAvatar ? AVATAR_FRAME_SIZE : IMAGE_FRAME_HEIGHT
  const frameAspect = frameWidth / frameHeight

  let canvasWidth = image.naturalWidth
  let canvasHeight = image.naturalHeight

  if (isAvatar) {
    const squareSize = Math.min(image.naturalWidth, image.naturalHeight)
    canvasWidth = squareSize
    canvasHeight = squareSize
  } else {
    const naturalAspect = image.naturalWidth / image.naturalHeight

    if (naturalAspect >= frameAspect) {
      canvasHeight = image.naturalHeight
      canvasWidth = Math.round(canvasHeight * frameAspect)
    } else {
      canvasWidth = image.naturalWidth
      canvasHeight = Math.round(canvasWidth / frameAspect)
    }
  }

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Unable to edit image.")
  }

  const imageAspect = image.naturalWidth / image.naturalHeight
  const canvasAspect = canvasWidth / canvasHeight

  let drawWidth = canvasWidth
  let drawHeight = canvasHeight

  if (imageAspect > canvasAspect) {
    drawHeight = canvasHeight
    drawWidth = drawHeight * imageAspect
  } else {
    drawWidth = canvasWidth
    drawHeight = drawWidth / imageAspect
  }

  const scale = 1 + scaled / 100
  const offsetX = translateX * (canvasWidth / frameWidth)
  const offsetY = translateY * (canvasHeight / frameHeight)

  context.clearRect(0, 0, canvasWidth, canvasHeight)
  context.translate(canvasWidth / 2 + offsetX, canvasHeight / 2 + offsetY)
  context.rotate((rotated * Math.PI) / 180)
  context.scale(scale, scale)
  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  )

  const mimeType = getFileMimeType(fileName)
  const outputFileName = ensureFileExtension(
    fileName || "edited-image",
    mimeType
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob)
          return
        }

        reject(new Error("Unable to save edited image."))
      },
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined
    )
  })

  return new File([blob], outputFileName, {
    type: mimeType,
    lastModified: Date.now(),
  })
}

export const PictureEditor = ({
  onValueChange,
  startingPoint,
}: {
  onValueChange?: (files: readonly FileWithPath[] | undefined) => void
  startingPoint: (options: {
    open: () => void
    dataUrl: string | null
    style: Record<string, string | number>
    onRemove: () => void
    onEdit: () => void
  }) => React.ReactNode
}) => {
  const [state, send] = useStateMachine("ideal", {
    ideal: {
      UPLOAD: "uploading",
      REMOVE: "removing",
      EDIT: "editing",
    },
    uploading: {
      EDIT: "editing",
      TOGGLE: "ideal",
    },
    removing: {
      TOGGLE: "ideal",
      EDIT: "editing",
    },
    editing: {
      TOGGLE: "ideal",
      UPLOAD: "uploading",
      REMOVE: "removing",
    },
  })
  const [{ scaled, rotated, translateX, translateY }, setState] =
    useState(defaultState)
  const reset = () => setState(defaultState)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  const [overlayContainer, { height, width }] = useMeasure<HTMLDivElement>()
  const overlayRef = useRef<HTMLDivElement>(null)

  const { fileRejections, acceptedFiles, getInputProps, getRootProps, open } =
    useDropzone({
      noClick: true,
      maxFiles: 1,
      onDropAccepted: () => {
        reset()
        send("EDIT")
      },
      onDropRejected: reset,
      validator: (file) => {
        const matches = matchesExtensions({
          file,
          extensions: [".png", ".jpg", ".jpeg"],
        })
        return matches
          ? null
          : {
              code: ErrorCode.FileInvalidType,
              message:
                "Please upload file(s) with .png, .jpg, or .jpeg extension",
            }
      },
    })
  const [dataUrl, setDataUrl] = useUncontrolledState<string | null>({
    defaultValue: null,
    onChange: (value) => {
      value ? onValueChange?.(acceptedFiles) : onValueChange?.(undefined)
    },
  })

  useEffect(() => {
    const [firstAcceptedFile] = acceptedFiles

    if (firstAcceptedFile) {
      const reader = new FileReader()
      const onLoad = () => {
        setDataUrl(reader.result as string)
      }
      reader.addEventListener("load", onLoad)
      reader.readAsDataURL(firstAcceptedFile)

      return () => {
        reader.removeEventListener("load", onLoad)
      }
    }
    if (getIsNotEmpty(fileRejections)) {
      setDataUrl(null)
    }
  }, [acceptedFiles, fileRejections, setDataUrl])

  const rotate = () => {
    setState((prev) => ({
      ...prev,
      rotated: prev.rotated < 360 ? prev.rotated + 90 : 90,
    }))
  }

  const dragConstraints = useMemo(() => {
    const denominator = parseFloat((scaled / 100).toFixed(2))

    return {
      top: -(height * denominator),
      right: width * denominator,
      bottom: height * denominator,
      left: -(width * denominator),
    }
  }, [height, width, scaled])

  useEffect(() => {
    const overlayElement = overlayRef.current

    if (!overlayElement) return

    const computedStyles = getComputedStyle(overlayElement)
    const transform = computedStyles.getPropertyValue("transform")
    const [translateX, translateY] =
      transform !== "none"
        ? transform.slice(7, -1).split(",").slice(-2).map(parseFloat)
        : [0, 0]

    if (translateX >= 0 && translateX > dragConstraints.right) {
      x.set(dragConstraints.right)
    } else if (translateX < 0 && translateX < dragConstraints.left) {
      x.set(dragConstraints.left)
    }

    if (translateY >= 0 && translateY > dragConstraints.bottom) {
      y.set(dragConstraints.bottom)
    } else if (translateY < 0 && translateY < dragConstraints.top) {
      y.set(dragConstraints.top)
    }
  }, [dragConstraints, dragControls, overlayRef, x, y])

  useEffect(() => {
    const cleanup = x.on("change", (value) =>
      setState((prev) => ({ ...prev, translateX: value }))
    )
    const unsubscribe = y.on("change", (value) =>
      setState((prev) => ({ ...prev, translateY: value }))
    )

    return () => {
      cleanup()
      unsubscribe()
    }
  }, [x, y])

  const extraScaled = (1 + scaled / 100).toFixed(2)

  const style = useMemo(
    () =>
      ({
        "--tw-scale": extraScaled,
        "--tw-scale-x": "var(--tw-scale)",
        "--tw-scale-y": "var(--tw-scale)",
        "--tw-rotate": toDeg(rotated),
        "--tw-translate-x": toPxIfNumber(translateX),
        "--tw-translate-y": toPxIfNumber(translateY),
      }) as Record<string, string | number>,
    [extraScaled, rotated, translateX, translateY]
  )

  const scaleDown = () => {
    setState((prev) => ({
      ...prev,
      scaled:
        prev.scaled === 0
          ? prev.scaled
          : prev.scaled % 10 !== 0
            ? prev.scaled - (prev.scaled % 10)
            : prev.scaled - 10,
    }))
  }

  const scaleUp = () => {
    setState((prev) => ({
      ...prev,
      scaled:
        prev.scaled === 100
          ? prev.scaled
          : prev.scaled % 10 !== 0
            ? prev.scaled + (prev.scaled % 10)
            : prev.scaled + 10,
    }))
  }

  const onRemove = useCallback(() => setDataUrl(null), [setDataUrl])

  const onEdit = useCallback(() => {
    dataUrl ? send("EDIT") : noop()
  }, [send, dataUrl])

  return (
    <>
      {startingPoint({
        open: () => {
          if (dataUrl) {
            send("REMOVE")
          } else {
            send("UPLOAD")
            open()
          }
        },
        dataUrl,
        style,
        onRemove,
        onEdit,
      })}

      <div className="sr-only" {...getRootProps()}>
        <input {...getInputProps()} />
        <span className="sr-only">Picture</span>
      </div>

      <Dialog open={state === "removing"}>
        <DialogContent className="max-w-[467px] bg-white p-6 shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            {dataUrl ? "Change Profile Image" : "Add Profile Image"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage your profile image.
          </DialogDescription>

          <button
            className="size-9 text-gray-700/50 hover:text-gray-700 hover:bg-gray-100 shrink-0 absolute right-2.5 top-2.5 inline-flex items-center justify-center focus-visible:outline-none rounded-full"
            onClick={() => send("TOGGLE")}
          >
            <X className="size-5" />
          </button>

          <div className="mt-5 flex items-center justify-center">
            {dataUrl ? (
              <div className="size-[160px] rounded-full overflow-hidden shrink-0">
                <img
                  src={dataUrl}
                  alt="Image"
                  className="object-cover rounded-full transform size-full"
                  style={style}
                />
              </div>
            ) : (
              <div className="size-[160px] rounded-full flex items-center justify-center bg-gray-50 shrink-0">
                <div className="flex items-center justify-center shrink-0 rounded-full bg-gray-100 size-[100px]">
                  <Camera className="size-[50px] shrink-0 text-gray-500" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-x-3">
            {dataUrl && (
              <Button
                onClick={() => setDataUrl(null)}
                variant="ghost"
                className="bg-error-100 text-error-500 hover:bg-error-500 hover:text-white"
                leftIcon={<Trash03 className="size-4" />}
              >
                Remove Photo
              </Button>
            )}
            <Button
              onClick={open}
              variant="outlined"
              leftIcon={<ImageIcon className="size-4" />}
            >
              Change Profile Image
            </Button>
          </div>

          {getIsNotEmpty(fileRejections) && (
            <ErrorMessage className="mt-2.5" size="sm">
              {fileRejections
                .map(({ errors }) =>
                  errors.map(({ message }) => message).join(". ")
                )
                .join(". ")}
            </ErrorMessage>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={state === "editing"}>
        <DialogContent className="max-w-[486px] p-0 bg-white shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogDescription className="sr-only">
            Adjust the crop and scale of your profile image.
          </DialogDescription>
          <div className="p-5 flex items-center justify-between">
            <Button size="md" variant="link" onClick={() => send("REMOVE")}>
              <ArrowLeft className="size-4" /> Back
            </Button>

            <DialogTitle className="text-lg leading-7 font-semibold text-dark-blue-400">
              Edit Profile Image
            </DialogTitle>

            <button
              className="size-[38px] shrink-0 inline-flex items-center justify-center focus-visible:outline-none text-gray-500/50 hover:text-gray-500 hover:bg-gray-100 rounded-full"
              onClick={() => send("TOGGLE")}
            >
              <X className="size-6" />
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="py-[25px] flex items-center justify-center bg-gray-100">
              <div className="rounded-full border-[5.96px] border-white">
                <div
                  className="relative overflow-hidden size-[238.22px] shrink-0 rounded-full"
                  ref={overlayContainer}
                >
                  {dataUrl && (
                    <img
                      src={dataUrl}
                      className="object-cover size-[238.22px] transform"
                      alt="Image"
                      style={style}
                    />
                  )}
                  <motion.div
                    drag
                    style={{
                      x,
                      y,
                      scale: extraScaled,
                    }}
                    ref={overlayRef}
                    className="absolute size-[238.22px] inset-0"
                    dragConstraints={dragConstraints}
                    dragControls={dragControls}
                    dragElastic={0}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-x-3">
              <button
                className="text-gray-500 shrink-0 focus-visible:outline-none"
                onClick={scaleDown}
              >
                <ZoomOut className="size-6" />
              </button>
              <Slider
                value={[scaled]}
                onValueChange={([value]) =>
                  setState((prev) => ({ ...prev, scaled: value }))
                }
              />
              <button
                className="text-gray-500 shrink-0 focus-visible:outline-none"
                onClick={scaleUp}
              >
                <ZoomIn className="size-6" />
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outlined"
                leftIcon={<RotateCw className="size-4" />}
                onClick={rotate}
              >
                Rotate
              </Button>

              <div className="flex items-center gap-x-3">
                <Button variant="outlined" onClick={() => send("TOGGLE")}>
                  Cancel
                </Button>
                <Button
                  leftIcon={<Check className="size-4" />}
                  onClick={() => send("TOGGLE")}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ImageEditor = ({
  onValueChange,
  startingPoint,
  defaultDataUrl,
  variant = "avatar",
  editDialogTitle,
  defaultFileName,
  onSaveImage,
  onEditDialogOpenChange,
}: {
  onValueChange?: (files: readonly FileWithPath[] | undefined) => void
  startingPoint: (options: {
    open: () => void
    dataUrl: string | null
    style: Record<string, string | number>
    onRemove: () => void
    onEdit: () => void
  }) => React.ReactNode
  defaultDataUrl?: string | null
  variant?: "avatar" | "image"
  editDialogTitle?: string
  defaultFileName?: string
  onSaveImage?: (file: File) => void | Promise<void>
  onEditDialogOpenChange?: (open: boolean) => void
}) => {
  const [state, send] = useStateMachine("ideal", {
    ideal: {
      UPLOAD: "uploading",
      REMOVE: "removing",
    },
    uploading: {
      EDIT: "editing",
      TOGGLE: "ideal",
    },
    removing: {
      TOGGLE: "ideal",
      EDIT: "editing",
    },
    editing: {
      TOGGLE: "ideal",
      UPLOAD: "uploading",
      REMOVE: "removing",
    },
  })
  const [{ scaled, rotated, translateX, translateY }, setState] =
    useState(defaultState)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const reset = useCallback(() => {
    const next = cloneDefaultState()
    setState(next)
    x.set(next.translateX)
    y.set(next.translateY)
  }, [x, y])
  const [isSaving, setIsSaving] = useState(false)

  const [overlayContainer, { height, width }] = useMeasure<HTMLDivElement>()
  const overlayRef = useRef<HTMLDivElement>(null)
  const editStateSnapshotRef = useRef(cloneDefaultState())

  const { fileRejections, acceptedFiles, getInputProps, getRootProps, open } =
    useDropzone({
      noClick: true,
      maxFiles: 1,
      onDropAccepted: () => {
        reset()
        send("EDIT")
      },
      onDropRejected: reset,
      validator: (file) => {
        const matches = matchesExtensions({
          file,
          extensions: [".png", ".jpg", ".jpeg"],
        })
        return matches
          ? null
          : {
              code: ErrorCode.FileInvalidType,
              message:
                "Please upload file(s) with .png, .jpg, or .jpeg extension",
            }
      },
    })
  const [dataUrl, setDataUrl] = useUncontrolledState<string | null>({
    defaultValue: null,
    onChange: (value) => {
      if (!value) {
        onValueChange?.(undefined)
        return
      }
      if (acceptedFiles.length > 0) {
        onValueChange?.(acceptedFiles)
      }
    },
  })

  // Restore a previously saved image (e.g. when navigating back to this step).
  // No ref gating needed: onChange above skips notification when acceptedFiles
  // is empty, so this setDataUrl call won't clobber the form state.
  const defaultDataUrlApplied = useRef(false)
  useEffect(() => {
    if (!defaultDataUrl || defaultDataUrlApplied.current) {
      return
    }

    let cancelled = false

    const applyDefaultDataUrl = async () => {
      defaultDataUrlApplied.current = true

      try {
        const resolved =
          variant === "image"
            ? await resolveImageDataUrl(defaultDataUrl)
            : defaultDataUrl
        if (cancelled) return
        reset()
        setDataUrl(resolved)
      } catch {
        if (cancelled) return
        reset()
        setDataUrl(defaultDataUrl)
      }
    }

    void applyDefaultDataUrl()

    return () => {
      cancelled = true
    }
  }, [defaultDataUrl, reset, setDataUrl])

  useEffect(() => {
    const [firstAcceptedFile] = acceptedFiles

    if (firstAcceptedFile) {
      const reader = new FileReader()
      const onLoad = () => {
        setDataUrl(reader.result as string)
      }
      reader.addEventListener("load", onLoad)
      reader.readAsDataURL(firstAcceptedFile)

      return () => {
        reader.removeEventListener("load", onLoad)
      }
    }
    if (getIsNotEmpty(fileRejections)) {
      setDataUrl(null)
    }
  }, [acceptedFiles, fileRejections, setDataUrl])

  const rotate = () => {
    setState((prev) => ({
      ...prev,
      rotated: prev.rotated < 360 ? prev.rotated + 90 : 90,
    }))
  }

  const dragConstraints = useMemo(() => {
    const denominator = parseFloat((scaled / 100).toFixed(2))

    return {
      top: -(height * denominator),
      right: width * denominator,
      bottom: height * denominator,
      left: -(width * denominator),
    }
  }, [height, width, scaled])

  useEffect(() => {
    const overlayElement = overlayRef.current

    if (!overlayElement) return

    const computedStyles = getComputedStyle(overlayElement)
    const transform = computedStyles.getPropertyValue("transform")
    const [translateX, translateY] =
      transform !== "none"
        ? transform.slice(7, -1).split(",").slice(-2).map(parseFloat)
        : [0, 0]

    if (translateX >= 0 && translateX > dragConstraints.right) {
      x.set(dragConstraints.right)
    } else if (translateX < 0 && translateX < dragConstraints.left) {
      x.set(dragConstraints.left)
    }

    if (translateY >= 0 && translateY > dragConstraints.bottom) {
      y.set(dragConstraints.bottom)
    } else if (translateY < 0 && translateY < dragConstraints.top) {
      y.set(dragConstraints.top)
    }
  }, [dragConstraints, dragControls, overlayRef, x, y])

  useEffect(() => {
    const cleanup = x.on("change", (value) =>
      setState((prev) => ({ ...prev, translateX: value }))
    )
    const unsubscribe = y.on("change", (value) =>
      setState((prev) => ({ ...prev, translateY: value }))
    )

    return () => {
      cleanup()
      unsubscribe()
    }
  }, [x, y])

  const extraScaled = (1 + scaled / 100).toFixed(2)

  const style = useMemo(
    () =>
      ({
        "--tw-scale": extraScaled,
        "--tw-scale-x": "var(--tw-scale)",
        "--tw-scale-y": "var(--tw-scale)",
        "--tw-rotate": toDeg(rotated),
        "--tw-translate-x": toPxIfNumber(translateX),
        "--tw-translate-y": toPxIfNumber(translateY),
      }) as Record<string, string | number>,
    [extraScaled, rotated, translateX, translateY]
  )

  const scaleDown = () => {
    setState((prev) => ({
      ...prev,
      scaled:
        prev.scaled === 0
          ? prev.scaled
          : prev.scaled % 10 !== 0
            ? prev.scaled - (prev.scaled % 10)
            : prev.scaled - 10,
    }))
  }

  const scaleUp = () => {
    setState((prev) => ({
      ...prev,
      scaled:
        prev.scaled === 100
          ? prev.scaled
          : prev.scaled % 10 !== 0
            ? prev.scaled + (prev.scaled % 10)
            : prev.scaled + 10,
    }))
  }

  const onRemove = useCallback(() => setDataUrl(null), [setDataUrl])

  const onEdit = useCallback(() => {
    if (dataUrl) {
      send("EDIT")
    }
  }, [dataUrl, send])

  const isImageVariant = variant === "image"

  useEffect(() => {
    onEditDialogOpenChange?.(state === "editing")
  }, [onEditDialogOpenChange, state])

  useEffect(() => {
    if (state === "editing") {
      editStateSnapshotRef.current = {
        scaled,
        rotated,
        translateX,
        translateY,
      }
    }
  }, [rotated, scaled, state, translateX, translateY])

  const restoreSnapshot = useCallback(() => {
    const snapshot = editStateSnapshotRef.current
    setState(snapshot)
    x.set(snapshot.translateX)
    y.set(snapshot.translateY)
  }, [x, y])

  const handleCancelEdit = useCallback(() => {
    if (isImageVariant) {
      restoreSnapshot()
    }
    send("TOGGLE")
  }, [isImageVariant, restoreSnapshot, send])

  const handleSaveEdit = useCallback(async () => {
    if (!isImageVariant || !dataUrl || !onSaveImage) {
      send("TOGGLE")
      return
    }

    try {
      setIsSaving(true)
      const file = await renderEditedImageFile({
        dataUrl,
        fileName: defaultFileName,
        variant,
        scaled,
        rotated,
        translateX,
        translateY,
      })
      await onSaveImage(file)
      send("TOGGLE")
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.reason ||
        error?.message ||
        "We couldn't save that image. Please try again."
      window.alert(message)
    } finally {
      setIsSaving(false)
    }
  }, [
    dataUrl,
    defaultFileName,
    onSaveImage,
    rotated,
    scaled,
    send,
    translateX,
    translateY,
    isImageVariant,
    variant,
  ])

  const currentEditDialogTitle =
    editDialogTitle ?? (isImageVariant ? "Edit Image" : "Edit Profile Image")
  const frameWidth = isImageVariant ? IMAGE_FRAME_WIDTH : AVATAR_FRAME_SIZE
  const frameHeight = isImageVariant ? IMAGE_FRAME_HEIGHT : AVATAR_FRAME_SIZE

  return (
    <>
      {/* Keep input mounted so open() works from any step/dialog state. */}
      <input hidden {...getInputProps()} />

      {startingPoint({
        open: () => (dataUrl ? send("REMOVE") : send("UPLOAD")),
        dataUrl,
        style,
        onRemove,
        onEdit,
      })}

      <Dialog open={state === "uploading"}>
        <DialogContent className="max-w-[467px] bg-white p-6 shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            Change Profile Image
          </DialogTitle>
          <DialogDescription className="sr-only">
            Upload a new profile image.
          </DialogDescription>

          <button
            className="size-9 text-gray-700/50 hover:text-gray-700 hover:bg-gray-100 shrink-0 absolute right-2.5 top-2.5 inline-flex items-center justify-center focus-visible:outline-none rounded-full"
            onClick={() => send("TOGGLE")}
          >
            <X className="size-5" />
          </button>

          <div className="flex mt-5 justify-center">
            <div
              className="size-[160px] shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-center"
              {...getRootProps()}
            >
              <span className="text-[60px] leading-none text-gray-300 font-medium">
                CH
              </span>
            </div>
          </div>

          <div className="mt-8">
            <div
              className="border border-gray-200 rounded-[4px] py-4 px-6"
              {...getRootProps()}
            >
              <span className="block text-sm leading-5 text-center text-gray-600">
                <button
                  className="font-semibold transition duration-300 text-dark-blue-400 hover:underline focus-visible:outline-none"
                  onClick={open}
                >
                  Click to upload
                </button>{" "}
                or drag and drop
              </span>
              <span className="text-xs block leading-[18px] text-center text-gray-600">
                SVG, PNG, JPG or GIF (max. 800x400px)
              </span>
            </div>
          </div>

          {fileRejections.length > 0 && (
            <ErrorMessage className="mt-2.5" size="sm">
              {fileRejections
                .map(({ errors }) =>
                  errors.map(({ message }) => message).join(". ")
                )
                .join(". ")}
            </ErrorMessage>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={state === "removing"}>
        <DialogContent className="max-w-[467px] bg-white p-6 shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            {dataUrl ? "Change Profile Image" : "Add Profile Image"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage your profile image.
          </DialogDescription>

          <button
            className="size-9 text-gray-700/50 hover:text-gray-700 hover:bg-gray-100 shrink-0 absolute right-2.5 top-2.5 inline-flex items-center justify-center focus-visible:outline-none rounded-full"
            onClick={() => send("TOGGLE")}
          >
            <X className="size-5" />
          </button>

          <div className="mt-5 flex items-center justify-center">
            {dataUrl ? (
              <div className="size-[160px] rounded-full overflow-hidden shrink-0">
                <img
                  src={dataUrl}
                  alt="Image"
                  className="object-cover rounded-full transform size-full"
                  style={style}
                />
              </div>
            ) : (
              <div className="size-[160px] rounded-full flex items-center justify-center bg-gray-50 shrink-0">
                <div className="flex items-center justify-center shrink-0 rounded-full bg-gray-100 size-[100px]">
                  <Camera className="size-[50px] shrink-0 text-gray-500" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-x-3">
            {dataUrl && (
              <Button
                onClick={() => setDataUrl(null)}
                variant="ghost"
                className="bg-error-100 text-error-500 hover:bg-error-500 hover:text-white"
                leftIcon={<Trash03 className="size-4" />}
              >
                Remove Photo
              </Button>
            )}
            <Button
              onClick={open}
              variant="outlined"
              leftIcon={<ImageIcon className="size-4" />}
            >
              Change Profile Image
            </Button>
          </div>

          {getIsNotEmpty(fileRejections) && (
            <ErrorMessage className="mt-2.5" size="sm">
              {fileRejections
                .map(({ errors }) =>
                  errors.map(({ message }) => message).join(". ")
                )
                .join(". ")}
            </ErrorMessage>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={state === "editing"}>
        <DialogContent className="max-w-[486px] p-0 bg-white shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogDescription className="sr-only">
            Adjust the crop and scale of your image.
          </DialogDescription>
          <div className="p-5 flex items-center justify-between">
            {isImageVariant ? (
              <DialogTitle className="text-lg leading-7 font-semibold text-dark-blue-400">
                {currentEditDialogTitle}
              </DialogTitle>
            ) : (
              <>
                <Button size="md" variant="link" onClick={() => send("REMOVE")}>
                  <ArrowLeft className="size-4" /> Back
                </Button>

                <DialogTitle className="text-lg leading-7 font-semibold text-dark-blue-400">
                  {currentEditDialogTitle}
                </DialogTitle>
              </>
            )}

            <button
              className="size-[38px] shrink-0 inline-flex items-center justify-center focus-visible:outline-none text-gray-500/50 hover:text-gray-500 hover:bg-gray-100 rounded-full"
              onClick={handleCancelEdit}
            >
              <X className="size-6" />
            </button>
          </div>

          <div className="px-5 pb-5">
            <div
              className={cn(
                "flex items-center justify-center bg-gray-100",
                isImageVariant ? "px-6 py-5" : "py-[25px]"
              )}
            >
              <div
                className={cn(
                  "border-white",
                  isImageVariant
                    ? "overflow-hidden rounded-2xl border-4"
                    : "rounded-full border-[5.96px]"
                )}
              >
                <div
                  className={cn(
                    "relative overflow-hidden shrink-0",
                    isImageVariant ? "rounded-xl" : "rounded-full"
                  )}
                  style={{
                    width: frameWidth,
                    height: frameHeight,
                  }}
                  ref={overlayContainer}
                >
                  {dataUrl && (
                    <img
                      src={dataUrl}
                      className="h-full w-full object-cover transform"
                      alt="Image"
                      style={style}
                    />
                  )}
                  <motion.div
                    drag
                    style={{
                      x,
                      y,
                      scale: extraScaled,
                    }}
                    ref={overlayRef}
                    className="absolute inset-0"
                    dragConstraints={dragConstraints}
                    dragControls={dragControls}
                    dragElastic={0}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-x-3">
              <button
                className="text-gray-500 shrink-0 focus-visible:outline-none"
                onClick={scaleDown}
              >
                <ZoomOut className="size-6" />
              </button>
              <Slider
                value={[scaled]}
                onValueChange={([value]) =>
                  setState((prev) => ({ ...prev, scaled: value }))
                }
              />
              <button
                className="text-gray-500 shrink-0 focus-visible:outline-none"
                onClick={scaleUp}
              >
                <ZoomIn className="size-6" />
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outlined"
                leftIcon={<RotateCw className="size-4" />}
                onClick={rotate}
              >
                Rotate
              </Button>

              <div className="flex items-center gap-x-3">
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<Check className="size-4" />}
                  onClick={handleSaveEdit}
                  loading={isSaving}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getComputedStyle, matchesExtensions } from "@/utils/dom-utils"
import { getIsNotEmpty, noop, toDeg, toPxIfNumber } from "@/utils/functions"
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
  ErrorMessage,
  Slider,
} from "@/components/ui"

const defaultState = {
  scaled: 0,
  rotated: 0,
  translateX: 0,
  translateY: 0,
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
          <h1 className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            {dataUrl ? "Change Profile Image" : "Add Profile Image"}
          </h1>

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
          <div className="p-5 flex items-center justify-between">
            <Button size="md" variant="link" onClick={() => send("REMOVE")}>
              <ArrowLeft className="size-4" /> Back
            </Button>

            <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
              Edit Profile Image
            </h1>

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
}: {
  onValueChange?: (files: readonly FileWithPath[] | undefined) => void
  startingPoint: (options: {
    open: () => void
    dataUrl: string | null
    style: Record<string, string | number>
  }) => React.ReactNode
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

  return (
    <>
      <Dialog open={state === "uploading"}>
        {startingPoint({
          open: () => (dataUrl ? send("REMOVE") : send("UPLOAD")),
          dataUrl,
          style,
        })}

        <DialogContent className="max-w-[467px] bg-white p-6 shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <h1 className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            Change Profile Image
          </h1>

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
              <input {...getInputProps()} />
              <span className="text-[60px] leading-none text-gray-300 font-medium">
                CH
              </span>
            </div>
          </div>

          <div className="mt-8">
            <div className="border border-gray-200  rounded-[4px] py-4 px-6">
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
          <h1 className="text-lg leading-7 text-center font-semibold text-dark-blue-400">
            {dataUrl ? "Change Profile Image" : "Add Profile Image"}
          </h1>

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
          <div className="p-5 flex items-center justify-between">
            <Button size="md" variant="link" onClick={() => send("REMOVE")}>
              <ArrowLeft className="size-4" /> Back
            </Button>

            <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
              Edit Profile Image
            </h1>

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

"use client"

import * as React from "react"
import { ONE_SECOND } from "@/utils/constants"
import { getFileName, getHasExtension, getPreview } from "@/utils/dom-utils"
import {
  cn,
  convertByteToMb,
  convertToKbOrMb,
  getFirstItem,
  getId,
  getIsEmpty,
  isDoc,
  isEmpty,
  isImg,
  isVideo,
  toPercentage,
  verifyFileType,
} from "@/utils/functions"
import { useCallbackRef, useControllableState } from "@/utils/hooks"
import * as hooks from "@/utils/hooks"
import {
  Check,
  File,
  Image as ImageIcon,
  Plus,
  Repeat04,
  Trash01,
  Trash2,
  UploadCloud,
  Video,
} from "@blend-metrics/icons"
import { ErrorCode, FileRejection, useDropzone } from "react-dropzone"
import { useMount, useToggle } from "react-use"
import { Button } from "../button"
import { IconButton } from "../icon-button"
import { CircularProgress, Progress } from "../progress"

export type Category = "doc" | "img" | "video" | "other"

export type DropzoneState = {
  meta: File
  hasError: boolean
  progress: number
}[]

const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg"]

export const ONE_MB = 1024 * 1024

const Success = ({
  progress,
  meta,
  onRemove,
  open,
}: {
  progress: number
  meta: File
  onRemove: () => void
  open: () => void
}) => {
  const [showPreview, { off, on }] = hooks.useToggle(false)
  React.useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(on, ONE_SECOND)

      return () => clearTimeout(timeout)
    }
  }, [progress, off, on])
  const [preview, setPreview] = React.useState<string>()

  React.useEffect(() => {
    const unsubscribe = getPreview(meta, setPreview)
    return unsubscribe
  }, [meta])

  return (
    <>
      {showPreview ? (
        <div className="group h-[336px] rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 overflow-hidden relative">
          <div className="absolute inset-0">
            {preview ? (
              <img
                className="size-full object-cover"
                src={preview}
                alt={getFileName(meta)}
              />
            ) : null}

            <div className="absolute opacity-0 transition duration-300 group-hover:opacity-100 inset-x-0 top-1/2 -translate-y-1 flex justify-center items-center gap-x-2">
              <button
                className="hover:bg-black inline-flex text-sm items-center font-semibold text-white gap-x-2 py-2 px-3.5 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] bg-black/40 focus-visible:outline-none"
                onClick={open}
                type="button"
              >
                <Repeat04 className="size-[15px]" /> Change Image
              </button>
              <button
                className="hover:bg-black hover:text-error-500 inline-flex text-sm items-center font-semibold text-white gap-x-2 py-2 px-3.5 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] bg-black/40 focus-visible:outline-none"
                onClick={onRemove}
                type="button"
              >
                <Trash01 className="size-[15px]" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-[100px] rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 overflow-hidden relative">
          <div className="rounded-lg p-2 pb-4 pl-4">
            <div className="flex">
              <div className="flex flex-auto pt-2">
                <div className="flex flex-auto flex-col">
                  <span className="inline-block text-sm font-medium text-gray-700">
                    {getFileName(meta)}
                  </span>
                  <span className="inline-block text-sm text-gray-500">
                    {convertToKbOrMb(meta.size)}
                  </span>
                </div>
              </div>

              {progress === 100 ? (
                <div className="pr-2 pt-2">
                  <span className="inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                </div>
              ) : (
                <IconButton
                  onClick={onRemove}
                  className="text-gray-500 hover:text-error-500"
                  variant="ghost"
                  visual="error"
                  type="button"
                >
                  <Trash2 className="h-5 w-5" />
                </IconButton>
              )}
            </div>

            <div className="mt-1 flex items-center gap-x-3">
              <div className="flex-auto py-1.5">
                <Progress value={progress} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const Dropzone = ({
  maxFiles = 1,
  maxSize = ONE_MB * 2,
  onError,
  value: valueProp,
  onValueChange,
  onRetry: onRetryProp,
  acceptedExtensions = ACCEPTED_EXTENSIONS,
  onBlur,
  className,
  icon,
  size,
}: {
  maxSize?: number
  maxFiles?: number
  onError?: (errors?: string) => void
  value?: DropzoneState
  onValueChange?: (value?: DropzoneState) => void
  onRetry?: () => void
  acceptedExtensions?: string[]
  onBlur?: () => void
  className?: string
  icon?: boolean
  size?: "sm" | "lg"
}) => {
  const [, setErrors] = useControllableState<undefined | string[]>({
    onChange: (errors) => {
      onError?.(errors?.join(" "))
    },
  })
  const [value, setValue] = useControllableState<DropzoneState | undefined>({
    value: valueProp,
    onChange: onValueChange,
  })
  const [isDragAccept, toggleIsDragAccept] = useToggle(false)
  const [hasValidationError, toggleHasValidationError] = useToggle(false)

  useMount(() => {
    const controlled = value !== undefined
    if (controlled) {
      toggleIsDragAccept(true)
    }
  })

  const onDropRejected = React.useCallback(
    (fileRejections: FileRejection[]) => {
      const errors = fileRejections.reduce<string[]>(
        (prevValue, { errors }) => {
          toggleIsDragAccept(false)
          toggleHasValidationError(true)

          const { message } = getFirstItem([...errors])
          const hasMessageAlready = prevValue.includes(message)
          return hasMessageAlready ? prevValue : [...prevValue, message]
        },
        []
      )
      setErrors(errors)
    },
    [setErrors, toggleIsDragAccept, toggleHasValidationError]
  )
  const onDropAccept = React.useCallback(
    (acceptedFiles: File[]) => {
      const value = acceptedFiles.reduce<DropzoneState>(
        (prevValue, currentValue) => {
          toggleIsDragAccept(true)
          setErrors(undefined)
          toggleHasValidationError(false)

          return [
            ...prevValue,
            { meta: currentValue, hasError: false, progress: 0 },
          ]
        },
        []
      )
      setValue(value)
    },
    [setValue, toggleIsDragAccept, setErrors, toggleHasValidationError]
  )

  const onDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const isEmpty = getIsEmpty(fileRejections)

      if (isEmpty) onDropAccept(acceptedFiles)
      else onDropRejected(fileRejections)
    },
    [onDropAccept, onDropRejected]
  )

  const validator = React.useCallback(
    <T extends File>(file: T) => {
      const hasExtension = getHasExtension({
        extensions: acceptedExtensions,
        meta: file,
      })

      if (hasExtension) return null
      else
        return {
          code: ErrorCode.FileInvalidType,
          message: `Must be in ${acceptedExtensions.join(" ")} format(s)`,
        }
    },
    [acceptedExtensions]
  )

  const onRemove = (index: number) => {
    setValue((prev) => {
      const nextState = prev?.filter((item, i) => i !== index)
      const isEmpty = getIsEmpty(nextState)
      if (isEmpty) {
        toggleIsDragAccept(false)
        return undefined
      }
      return nextState
    })
  }

  const { getInputProps, getRootProps, open } = useDropzone({
    noKeyboard: true,
    onDrop: onDrop,
    validator,
    maxSize,
    maxFiles,
    multiple: maxFiles > 1,
    noClick: true,
  })

  const onRetryPropRef = useCallbackRef(onRetryProp)

  const onRetry = React.useCallback(
    (index: number) => {
      onRetryPropRef()
      setValue((prev) =>
        prev?.reduce<DropzoneState>(
          (prevValue, currentValue, currentIndex) =>
            currentIndex == index
              ? [...prevValue, { ...currentValue, hasError: false }]
              : [...prevValue, currentValue],
          []
        )
      )
    },
    [onRetryPropRef, setValue]
  )

  return (
    <div
      {...getRootProps({
        onBlur,
      })}
      className={cn("rounded-lg focus-visible:outline-none", className)}
    >
      <input {...getInputProps()} />
      {isDragAccept ? (
        <div className="space-y-3">
          {value?.map(({ hasError, progress, meta }, idx) => {
            const category = isImg(getFileName(meta))
              ? "img"
              : isVideo(getFileName(meta))
                ? "video"
                : isDoc(getFileName(meta))
                  ? "doc"
                  : "other"

            return (
              <React.Fragment key={idx}>
                {size === "sm" ? (
                  <>
                    {hasError ? (
                      <div className="rounded-lg border border-error-300 bg-error-25 p-2 pb-4 pl-4">
                        <div className="flex">
                          <div className="flex flex-auto gap-x-4 pt-2">
                            <div className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-error-50 bg-error-100 text-error-500">
                              <UploadCloud className="h-4 w-4" />
                            </div>
                            <div className="flex flex-auto flex-col items-start">
                              <span className="inline-block text-sm font-medium text-error-500">
                                Upload failed, please try again
                              </span>
                              <span className="inline-block text-sm text-error-500">
                                {getFileName(meta)}
                              </span>
                              <button
                                className="mt-1 text-sm font-semibold text-error-500 hover:underline focus:outline-none"
                                onClick={() => onRetry(idx)}
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                          <IconButton
                            onClick={() => onRemove(idx)}
                            variant="ghost"
                            visual="error"
                            type="button"
                          >
                            <Trash2 className="h-5 w-5" />
                          </IconButton>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-white p-2 pb-4 pl-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500">
                        <div className="flex">
                          <div className="flex flex-auto gap-x-4 pt-2">
                            <div className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-primary-25 bg-primary-50 text-primary-500">
                              {category === "img" && (
                                <ImageIcon className="h-4 w-4" />
                              )}
                              {category === "video" && (
                                <Video className="h-4 w-4" />
                              )}
                              {category === "doc" && (
                                <File className="h-4 w-4" />
                              )}
                              {category === "other" && (
                                <UploadCloud className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex flex-auto flex-col">
                              <span className="inline-block text-sm font-medium text-gray-700">
                                {getFileName(meta)}
                              </span>
                              <span className="inline-block text-sm text-gray-500">
                                {size}
                              </span>
                            </div>
                          </div>

                          {progress === 100 ? (
                            <div className="pr-2 pt-2">
                              <span className="inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </span>
                            </div>
                          ) : (
                            <IconButton
                              onClick={() => onRemove(idx)}
                              variant="ghost"
                              visual="error"
                              type="button"
                            >
                              <Trash2 className="h-5 w-5" />
                            </IconButton>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-x-3 pl-12">
                          <div className="flex-auto py-1.5">
                            <Progress value={progress} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {hasError ? (
                      <div className="p-[100px] rounded-lg bg-gray-50 border-2 border-dashed hover:border-gray-300 overflow-hidden relative border-error-300">
                        <div className="rounded-lg p-2 pb-4 pl-4">
                          <div className="flex">
                            <div className="flex flex-auto pt-2">
                              <div className="flex flex-auto flex-col items-start">
                                <span className="inline-block text-sm font-medium text-error-500">
                                  Upload failed, please try again
                                </span>
                                <span className="inline-block text-sm text-error-500">
                                  {getFileName(meta)}
                                </span>
                                <button
                                  className="mt-1 text-sm font-semibold text-error-500 hover:underline focus:outline-none"
                                  onClick={() => onRetry(idx)}
                                >
                                  Try again
                                </button>
                              </div>
                            </div>
                            <IconButton
                              onClick={() => onRemove(idx)}
                              variant="ghost"
                              visual="error"
                              type="button"
                            >
                              <Trash2 className="h-5 w-5" />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Success
                        open={open}
                        meta={meta}
                        progress={progress}
                        onRemove={() => onRemove(idx)}
                      />
                    )}
                  </>
                )}
              </React.Fragment>
            )
          })}
        </div>
      ) : (
        <>
          {size === "sm" ? (
            <div
              className={cn(
                "rounded-lg border border-gray-200 bg-white px-[25px] py-[17px]",
                {
                  "border-error-500": hasValidationError,
                }
              )}
            >
              {icon && (
                <div className="mb-3 flex items-center justify-center">
                  <div className="inline-flex size-10 items-center justify-center rounded-full border-[6px] border-gray-50 bg-gray-100">
                    <UploadCloud className="size-5 text-gray-500" />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-x-1">
                <button
                  className="text-center text-sm font-semibold text-primary-500 hover:underline focus:outline-none"
                  onClick={open}
                  type="button"
                >
                  Click to upload
                </button>
                <span className="text-center text-sm text-gray-600">
                  or drag and drop
                </span>
              </div>
              <div className="mt-1 flex justify-center">
                <span className="text-center text-sm leading-[18px] text-gray-600">
                  {acceptedExtensions.join(" ")}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-[5px]">
              <div
                className={cn(
                  "py-10 md:py-[100px] px-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg",
                  {
                    "border-error-500": hasValidationError,
                  }
                )}
              >
                {icon && (
                  <div className="mb-3 flex items-center justify-center">
                    <div className="inline-flex size-[52px] items-center justify-center rounded-full border-[6px] border-gray-100 bg-white">
                      <UploadCloud className="size-5 text-gray-500" />
                    </div>
                  </div>
                )}

                <div className="flex justify-center items-center gap-x-1">
                  <span className="text-xs leading-5 text-gray-600">
                    Drag and drop a cover image or
                  </span>
                  <Button size="md" variant="link" onClick={open} type="button">
                    Choose a File
                  </Button>
                </div>

                <div className="mt-3 max-w-[408px] mx-auto text-center">
                  <span className="text-xs leading-[14.52px] font-light text-gray-500">
                    Upload a cover photo that will help your potential clients
                    understand your project and increase your chance of getting
                    featured.
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-center">
                  <span className="text-xs text-center leading-[14.52px] text-gray-500">
                    Recommended Size: 1600px x 1200px
                  </span>
                </div>
              </div>

              <span className="text-xs leading-[14.52px] text-gray-500 block">
                Supported formats:{" "}
                {acceptedExtensions
                  .map((item) => item.toUpperCase())
                  .join(", ")}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const SquareShapeDropzoneSuccess = ({
  meta,
  onRemove,
  open,
}: {
  meta: File
  onRemove: () => void
  open: () => void
}) => {
  const [dataUrl, setDataUrl] = React.useState<string>()
  React.useEffect(() => {
    const reader = new FileReader()
    const onLoad = () => {
      setDataUrl(reader.result as string)
    }
    reader.addEventListener("load", onLoad)
    reader.readAsDataURL(meta)

    return () => {
      reader.removeEventListener("load", onLoad)
    }
  }, [meta])
  return (
    <div className="group relative border-2 border-gray-300 rounded-[5px] h-[100px] overflow-hidden">
      {dataUrl ? (
        <img
          className="size-full object-cover"
          src={dataUrl}
          alt={getFileName(meta)}
        />
      ) : null}

      <div className="absolute inset-0 bg-black/20 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-x-2 px-2">
          <button
            className="hover:bg-black inline-flex text-xs items-center font-semibold text-white gap-x-1.5 py-1.5 px-2.5 rounded-[5px] bg-black/40 focus-visible:outline-none"
            onClick={open}
            type="button"
          >
            <Repeat04 className="size-3.5" /> Change Image
          </button>
          <button
            className="hover:bg-black hover:text-error-500 inline-flex text-xs items-center font-semibold text-white gap-x-1.5 py-1.5 px-2.5 rounded-[5px] bg-black/40 focus-visible:outline-none"
            onClick={onRemove}
            type="button"
          >
            <Trash01 className="size-3.5" /> Remove
          </button>
        </div>
      </div>

      <button
        className="absolute right-2.5 transition duration-300 group-hover:opacity-100 opacity-0 text-white hover:text-error-500 top-2.5 size-7 focus-visible:outline-none bg-black/20 hover:bg-black rounded-full inline-flex items-center justify-center"
        onClick={onRemove}
        type="button"
      >
        <Trash01 className="size-4" />
      </button>
    </div>
  )
}

export const SquareShapeDropzone = ({
  maxFiles = 1,
  maxSize = ONE_MB * 2,
  onError,
  value: valueProp,
  onValueChange,
  onRetry: onRetryProp,
  acceptedExtensions = ACCEPTED_EXTENSIONS,
  onBlur,
  className,
}: {
  maxSize?: number
  maxFiles?: number
  onError?: (errors?: string) => void
  value?: DropzoneState
  onValueChange?: (value?: DropzoneState) => void
  onRetry?: () => void
  acceptedExtensions?: string[]
  onBlur?: () => void
  className?: string
}) => {
  const [, setErrors] = useControllableState<undefined | string[]>({
    onChange: (errors) => {
      onError?.(errors?.join(" "))
    },
  })
  const [value, setValue] = useControllableState<DropzoneState | undefined>({
    value: valueProp,
    onChange: onValueChange,
  })
  const [isDragAccept, toggleIsDragAccept] = useToggle(false)
  const [hasValidationError, toggleHasValidationError] = useToggle(false)

  useMount(() => {
    const controlled = value !== undefined
    if (controlled) {
      toggleIsDragAccept(true)
    }
  })

  const onDropRejected = React.useCallback(
    (fileRejections: FileRejection[]) => {
      const errors = fileRejections.reduce<string[]>(
        (prevValue, { errors }) => {
          toggleIsDragAccept(false)
          toggleHasValidationError(true)

          const { message } = getFirstItem([...errors])
          const hasMessageAlready = prevValue.includes(message)
          return hasMessageAlready ? prevValue : [...prevValue, message]
        },
        []
      )
      setErrors(errors)
    },
    [setErrors, toggleIsDragAccept, toggleHasValidationError]
  )
  const onDropAccept = React.useCallback(
    (acceptedFiles: File[]) => {
      const value = acceptedFiles.reduce<DropzoneState>(
        (prevValue, currentValue) => {
          toggleIsDragAccept(true)
          setErrors(undefined)
          toggleHasValidationError(false)

          return [
            ...prevValue,
            { meta: currentValue, hasError: false, progress: 0 },
          ]
        },
        []
      )
      setValue(value)
    },
    [setValue, toggleIsDragAccept, setErrors, toggleHasValidationError]
  )

  const onDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const isEmpty = getIsEmpty(fileRejections)

      if (isEmpty) onDropAccept(acceptedFiles)
      else onDropRejected(fileRejections)
    },
    [onDropAccept, onDropRejected]
  )

  const validator = React.useCallback(
    <T extends File>(file: T) => {
      const hasExtension = getHasExtension({
        extensions: acceptedExtensions,
        meta: file,
      })

      if (hasExtension) return null
      else
        return {
          code: ErrorCode.FileInvalidType,
          message: `Must be in ${acceptedExtensions.join(" ")} format(s)`,
        }
    },
    [acceptedExtensions]
  )

  const onRemove = (index: number) => {
    setValue((prev) => {
      const nextState = prev?.filter((item, i) => i !== index)
      const isEmpty = getIsEmpty(nextState)
      if (isEmpty) {
        toggleIsDragAccept(false)
        return undefined
      }
      return nextState
    })
  }

  const { getInputProps, getRootProps, open } = useDropzone({
    noKeyboard: true,
    onDrop: onDrop,
    validator,
    maxSize,
    maxFiles,
    multiple: maxFiles > 1,
    noClick: true,
  })

  const onRetryPropRef = useCallbackRef(onRetryProp)

  const onRetry = React.useCallback(
    (index: number) => {
      onRetryPropRef()
      setValue((prev) =>
        prev?.reduce<DropzoneState>(
          (prevValue, currentValue, currentIndex) =>
            currentIndex == index
              ? [...prevValue, { ...currentValue, hasError: false }]
              : [...prevValue, currentValue],
          []
        )
      )
    },
    [onRetryPropRef, setValue]
  )

  return (
    <div
      {...getRootProps({
        onBlur,
      })}
      className={cn("rounded-lg focus-visible:outline-none", className)}
    >
      <input {...getInputProps()} />
      {isDragAccept ? (
        <div className="space-y-3">
          {value?.map(({ hasError, progress, meta }, idx) => {
            const hasUploaded = progress === 100

            return (
              <React.Fragment key={idx}>
                {hasError ? (
                  <div className="h-[100px] shrink-0 grid place-items-center rounded-[5px] border-2 border-error-300 border-dashed bg-error-25">
                    <Button
                      visual="error"
                      variant="link"
                      onClick={() => onRetry(idx)}
                      type="button"
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    {hasUploaded ? (
                      <SquareShapeDropzoneSuccess
                        meta={meta}
                        onRemove={() => onRemove(idx)}
                        open={open}
                      />
                    ) : (
                      <div className="border-2 border-gray-300 border-dashed rounded-[5px] h-[100px]">
                        <div className="pt-[25px]">
                          <div className="flex items-center justify-center">
                            <CircularProgress
                              size={32}
                              strokeWidth={3}
                              value={progress}
                              show={false}
                            />
                          </div>

                          <h3 className="mt-[7px] text-sm text-gray-500 text-center">
                            {convertToKbOrMb(meta.size)} - {progress}%
                          </h3>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </React.Fragment>
            )
          })}
        </div>
      ) : (
        <>
          <button
            className={cn(
              "group h-[100px] w-full focus-visible:outline-none rounded-[5px] border-2 border-gray-200 border-dashed hover:border-gray-400 bg-gray-50 transition hover:bg-gray-100 flex flex-col gap-y-2 p-5 items-center justify-center",
              {
                "border-error-500 hover:border-error-500": hasValidationError,
              }
            )}
            onClick={open}
            type="button"
          >
            <Plus className="size-6 transition text-gray-500 group-aria-checked:hover:text-gray-600" />

            <span className="text-sm leading-50 font-semibold transition text-gray-500 group-hover:text-gray-600">
              Image
            </span>
          </button>
        </>
      )}
    </div>
  )
}

interface Data {
  id: number
  name: string
  category: Category
  size: string
  hasError: boolean
  progress: number
  data: File
}

export type CircularProgressDropzoneState = Data[]

interface CircularProgressDropzoneProps {
  value?: CircularProgressDropzoneState
  className?: string
  maxFiles?: number
  onChange?: (value: CircularProgressDropzoneState | undefined) => void
  onBlur?: () => void
  onTryAgain?: () => void
  icon?: boolean
  accepted?: string[]
  multiple?: boolean
}

export const CircularProgressDropzone = ({
  value,
  onChange,
  className,
  onBlur,
  onTryAgain,
  maxFiles = 0,
  icon = false,
  accepted = [".svg", ".png", ".gif", ".jpg"],
}: CircularProgressDropzoneProps) => {
  const [isDragAccept, { off, on }] = hooks.useToggle()
  const [state, setState] = useControllableState<
    CircularProgressDropzoneState | undefined
  >({
    value,
    onChange,
  })

  const clear = React.useCallback(() => setState(undefined), [setState])

  const update = React.useCallback(
    (cb: (value: Data) => Data) =>
      setState((prev) => prev?.map((value) => cb(value))),
    [setState]
  )

  const onDropAccepted = React.useCallback(
    (files: File[]) => {
      setState(() =>
        files.map((data) => {
          const { name, size } = data
          const category = isImg(name)
            ? "img"
            : isVideo(name)
              ? "video"
              : isDoc(name)
                ? "doc"
                : "other"

          return {
            category,
            name,
            data,
            hasError: false,
            id: getId(),
            progress: 0,
            size: convertToKbOrMb(size),
          }
        })
      )

      on()
    },
    [on, setState]
  )

  const onDropRejected = React.useCallback(() => {
    off()
    clear()
  }, [off, clear])

  const onDelete = (id: number) => {
    if (!state) return

    const result = state.filter((value) => value.id !== id)
    if (isEmpty(result)) {
      setState(undefined)
      off()
    } else {
      setState(result)
    }
  }

  const onRecover = (id: number) => {
    update((value) => (value.id === id ? { ...value, hasError: false } : value))
    onTryAgain?.()
  }

  const { getInputProps, getRootProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles,
    onDropAccepted,
    onDropRejected,
    multiple: maxFiles > 1,
    validator: (data) => {
      if (!accepted) return null

      const isValid = verifyFileType(data.name, accepted)
      return isValid
        ? null
        : {
            code: ErrorCode.FileInvalidType,
            message: "Its type is invalid",
          }
    },
  })

  return (
    <div
      {...getRootProps({
        onBlur,
      })}
      className={cn("rounded-lg focus-visible:outline-none", className)}
    >
      <input {...getInputProps()} />
      {isDragAccept ? (
        <div className="space-y-3">
          {state?.map(({ category, hasError, id, name, progress, size }) => (
            <React.Fragment key={id}>
              {hasError ? (
                <div className="flex gap-x-1 rounded-lg border border-error-300 bg-error-25 pb-4 pl-4 pr-2 pt-2">
                  <div className="flex flex-auto gap-x-4 pt-2">
                    <div className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-error-50 bg-error-100 text-error-500">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                    <div className="flex-auto">
                      <div className="text-sm font-medium text-error-500">
                        {name}
                      </div>
                      <span className="block text-sm text-error-500">
                        {size} - {progress}% uploaded
                      </span>
                      <button
                        className="ml-1 text-sm font-semibold text-error-500 hover:underline focus-visible:outline-none"
                        onClick={() => onRecover(id)}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                  <IconButton
                    variant="ghost"
                    visual="error"
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </IconButton>
                </div>
              ) : (
                <div className="relative rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500">
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div
                      className="h-full w-full translate-x-[--translate-x] bg-gray-50 transition duration-500"
                      style={{
                        ...({
                          "--translate-x": toPercentage(-(100 - progress)),
                        } as Record<string, string>),
                      }}
                    />
                  </div>
                  <div className="relative flex items-start">
                    <div className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-primary-25 bg-primary-50 text-primary-500">
                      {category === "img" && <ImageIcon className="h-4 w-4" />}
                      {category === "doc" && <File className="h-4 w-4" />}
                      {category === "video" && <Video className="h-4 w-4" />}
                      {category === "other" && (
                        <UploadCloud className="h-4 w-4" />
                      )}
                    </div>
                    <div className="ml-4 flex-auto">
                      <div className="text-sm font-medium text-gray-700">
                        {name}
                      </div>
                      <span className="block text-sm text-gray-600">
                        {size} - {progress}% uploaded
                      </span>
                    </div>
                    {progress === 100 ? (
                      <span className="ml-4 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    ) : (
                      <div className="ml-2 flex-none">
                        <CircularProgress
                          show={false}
                          value={progress}
                          size={32}
                          strokeWidth={4}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500">
          {icon && (
            <div className="mb-3 flex items-center justify-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[6px] border-gray-50 bg-gray-100">
                <UploadCloud className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-x-1">
            <button
              className="text-center text-sm font-semibold text-primary-500 hover:underline focus:outline-none"
              onClick={open}
              type="button"
            >
              Click to upload
            </button>
            <span className="text-center text-sm text-gray-600">
              or drag and drop
            </span>
          </div>
          <div className="mt-1 flex justify-center">
            <span className="text-center text-sm leading-[18px] text-gray-600">
              {accepted.join(" ")}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

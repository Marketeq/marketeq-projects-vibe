import { isUndefined } from "./functions"

export function preventDefault<T extends { preventDefault: () => void }>(
  value: T
) {
  return value.preventDefault()
}

export function stopPropagation<T extends { stopPropagation: () => void }>(
  value: T
) {
  return value.stopPropagation()
}

export function scrollToTop({
  behavior = "smooth",
  left,
  top = 0,
}: ScrollToOptions = {}) {
  scroll({
    behavior,
    left,
    top,
  })
}

export function reload() {
  return window.location.reload()
}

export function getFileName(file: File) {
  const { name } = file
  return name
}

export function getHasExtension({
  extensions,
  meta,
}: {
  extensions: string[]
  meta: File
}) {
  const value = getFileName(meta)
  return extensions.some((extension) => value.endsWith(extension))
}

export function matchesExtensions({
  extensions,
  file,
}: {
  extensions: string[]
  file: File
}) {
  const value = getFileName(file)
  return extensions.some((extension) => value.endsWith(extension))
}

export function getPreview<T extends File>(
  file: T | undefined,
  onComplete: (dataUrl?: string) => void
) {
  if (isUndefined(file)) {
    onComplete(undefined)
    return () => {}
  }

  const onLoadEnd = (
    reader: FileReader,
    onComplete: (dataUrl?: string) => void
  ) => {
    return () => {
      const result = reader.result
      if (result) {
        onComplete(result as string)
      } else {
        onComplete(undefined)
      }
    }
  }

  const reader = new FileReader()
  const handleLoadEnd = onLoadEnd(reader, onComplete)
  reader.addEventListener("loadend", handleLoadEnd)
  reader.readAsDataURL(file)

  return () => reader.removeEventListener("loadend", handleLoadEnd)
}

export function addEvent<
  TTarget extends EventTarget,
  TListener extends (...events: any[]) => any,
  TEvent extends string = string,
>({
  target,
  event,
  listener,
  options,
}: {
  target: TTarget
  event: TEvent
  listener: TListener
  options?: boolean | AddEventListenerOptions
}) {
  target.addEventListener(event, listener, options)

  return () => {
    target.removeEventListener(event, listener, options)
  }
}

const getBoundingClientRect = <T extends Element>(element: T) => {
  return element.getBoundingClientRect()
}

export const getComputedStyle = <T extends Element>(element: T) => {
  return window.getComputedStyle(element)
}

export const getCoordinates = <T extends Element>(element: T) => {
  const { x, y } = element.getBoundingClientRect()
  const scrollX = window.scrollX ?? document.documentElement.scrollLeft
  const scrollY = window.scrollY ?? document.documentElement.scrollTop
  return { x: x + scrollX, y: y + scrollY }
}

export const getSize = <T extends Element>(element: T) => {
  const { width, height } = getBoundingClientRect(element)
  return {
    width,
    height,
  }
}

export const isElement = (element: any): element is Element => {
  return element instanceof Element
}

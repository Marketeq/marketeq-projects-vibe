import clsx, { ClassValue } from "clsx"
import { format, parseISO } from "date-fns"
import { FieldErrors, FieldPath, get } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import { z } from "zod"
import { Keys } from "@/types/core"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}

export function isNumber(arg: any): arg is number {
  return typeof arg === "number"
}

export function toDeg(value: string | number) {
  if (isNumber(value)) {
    return `${value}deg`
  }
  return value
}

export function toPxIfNumber(value: string | number) {
  if (isNumber(value)) {
    return `${value}px`
  }
  return value
}

export function generateArray(values: number) {
  return Array.from({ length: values }, (_, index) => index + 1)
}
export const getDays = (date: any) => {
  const givenDate = new Date(date)
  const today = new Date()
  const timeDifference = today.getTime() - givenDate.getTime()
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24))

  return daysDifference
}
export const getDate = (date: any) => {
  const givenDate = new Date(date)
  return givenDate
}

export const formatDatePosting = (
  postedDate: string | null | undefined
): string => {
  return getDays(postedDate) == 0
    ? "Today"
    : getDays(postedDate) == 1
      ? "Yesterday"
      : `${getDays(postedDate)} Days Ago`
}

export function noop() {}

export const getId = (
  (id = 0) =>
  () =>
    id++
)()

export function callAll(...cbs: (((...args: any[]) => any) | undefined)[]) {
  return (...args: any[]) => cbs.forEach((cb) => cb?.(...args))
}

export function formatDate(date?: string) {
  return date ? format(parseISO(date), "MMMM d, yyyy") : undefined
}
export function formatDateArticle(isoDateStr: string) {
  const date = new Date(isoDateStr) // Parse the ISO date string

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "2-digit",
  }
  return date.toLocaleDateString("en-US", options)
}
export function hookFormHasError<
  TFormValues extends Record<string, any> = Record<string, any>,
>({
  errors,
  name,
}: {
  errors: FieldErrors<TFormValues>
  name: FieldPath<TFormValues>
}) {
  const error = get(errors, name)
  return error ? true : false
}

export function convertByteToMb(kb: number): number {
  const mb = kb / 1024 / 1024
  return Number(mb.toFixed(2))
}
export const getStringValue = (value: string | File | null): string => {
  return typeof value === "string" ? value : ""
}

export function getFirstItem<T extends any[] | string>(value: T) {
  const firstItem = typeof value === "string" ? value.slice(0, 1) : value[0]
  return firstItem
}
export function getLastItem<T extends any[] | string>(value: T) {
  const firstItem =
    typeof value === "string" ? value.slice(-1) : value[value.length - 1]
  return firstItem
}

export function getIsEmpty<T extends any[] | string>(value?: T) {
  const len = Number(value?.length)
  return len <= 0
}

export function getIsNotEmpty<T extends readonly any[] | string>(value?: T) {
  const len = Number(value?.length)
  return len > 0
}
export function capitalize(str: string) {
  if (!str) return "" // Check if the string is empty or undefined
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
export function debounce(cb: () => void, wait?: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
    cb,
    wait
  )

  function cancel() {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  function flush() {
    cancel()
    cb()
  }

  return {
    cancel,
    flush,
  }
}

export const getDynamicallyStackableRootIndex = <T extends any[]>({
  numberToAdd,
  value,
}: {
  value?: T
  numberToAdd: number
}) => {
  if (value) {
    return value.length + numberToAdd
  }
  return numberToAdd
}

export function getUnmatched({
  value,
  query,
}: {
  value: string
  query: string
}) {
  const lowercasedValue = value.toLowerCase()
  const lowercasedQuery = query.toLowerCase()
  let i = 0
  while (i < lowercasedQuery.length && i < lowercasedValue.length) {
    if (lowercasedQuery[i] !== lowercasedValue[i]) break
    i++
  }

  return value.slice(i)
}

export function getMatched({ value, query }: { value: string; query: string }) {
  const lowercasedValue = value.toLowerCase()
  const lowercasedQuery = query.toLowerCase()
  let i = 0
  while (i < lowercasedQuery.length && i < lowercasedValue.length) {
    if (lowercasedQuery[i] !== lowercasedValue[i]) break
    i++
  }

  return value.slice(0, i)
}

interface ContainsNumberOfCharsOptions {
  /** A number of characters `value` should contain. */
  numberOfChars: number
  /** The string needs to be tested. */
  value: string
}

/**
 * Tests whether the given value contains the given number of characters.
 * @param options - An object containing the configuration
 * @returns Whether it contains the given number of characters, a boolean is returned.
 */
export const containsNumberOfChars = (
  options: ContainsNumberOfCharsOptions
) => {
  const { numberOfChars, value } = options
  const { success } = z.string().min(numberOfChars).safeParse(value)
  return success
}

/**
 * Tests whether the given value contains at least one number.
 * @param value - The string needs to be tested.
 */
export const containsOneNumber = (value: string) => {
  const { success } = z
    .string()
    .refine((data) => /\d/.test(data))
    .safeParse(value)
  return success
}

export function getNameParts(fullName: string) {
  const [firstName, ...lastName] = fullName.split(" ")
  return {
    firstName,
    lastName: lastName.join(" "),
  }
}
/**
 * Tests whether the given value contains at least one lower case letter.
 * @param value - The string needs to be tested.
 */
export const containsOneLowerCaseLetter = (value: string) => {
  const { success } = z
    .string()
    .refine((data) => /(?=.*[a-z])/.test(data))
    .safeParse(value)
  return success
}

/**
 * Tests whether the given value contains at least one upper case letter.
 * @param value - The string needs to be tested.
 */
export const containsOneUpperCaseLetter = (value: string) => {
  const { success } = z
    .string()
    .refine((data) => /(?=.*[A-Z])/.test(data))
    .safeParse(value)
  return success
}

/**
 * Tests whether the given value contains at least one symbol.
 * @param value - The string needs to be tested.
 */
export const containsOneSymbol = (value: string) => {
  const { success } = z
    .string()
    .refine((data) => /(?=.*[-+_!@#$%^&*., ?])/.test(data))
    .safeParse(value)
  return success
}

export const isFn = (value: any): value is (...args: any[]) => any =>
  typeof value === "function"

export function computePercentage(value: number, percentage: number) {
  return (value * percentage) / 100
}

export function computeCircumference(radius: number) {
  return 2 * Math.PI * radius
}

export function nope() {}

export function isString(arg: any): arg is string {
  return typeof arg === "string"
}

export function first<T extends any[] | string>(arg: T) {
  return arg[0]
}

export function last(arg: string | string[]) {
  return arg[0]
}

export function verifyFileType(
  fileName: string,
  extensions: string[]
): boolean {
  if (extensions.length === 0) {
    return false
  }
  const [extension, ...remainExtensions] = extensions
  return fileName.endsWith(extension)
    ? true
    : verifyFileType(fileName, remainExtensions)
}

export const isImg = (name: string) => {
  return verifyFileType(name, [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".bmp",
    ".ico",
    ".tif",
    ".tiff",
    ".avif",
  ])
}

export const isVideo = (name: string) => {
  return verifyFileType(name, [
    ".mp4",
    ".mpeg",
    ".ogv",
    ".ts",
    ".webm",
    ".3gp",
    ".3g2",
    ".avi",
  ])
}

export const isDoc = (name: string) => {
  return verifyFileType(name, [".pdf"])
}

export function convertToKbOrMb(bytes: number) {
  const kbs = bytes / 1000
  return kbs < 1000 ? `${kbs.toFixed(2)}KB` : `${(kbs / 1000).toFixed(2)}MB`
}

export function isArray(arg: any): arg is any[] {
  return Array.isArray(arg)
}

export function countCharacters(
  arg: string | number | any[] | Record<string, any> | null | undefined
): number {
  if (isNull(arg) || isUndefined(arg)) {
    return 0
  } else if (isNumber(arg)) {
    return arg
  } else if (isString(arg)) {
    return arg.length
  } else if (isArray(arg)) {
    return arg.length
  }
  return 1
}

export function isUndefined(arg: any): arg is undefined {
  return typeof arg === "undefined"
}

export function isNotUndefined(arg: any) {
  return typeof arg !== "undefined"
}

export function isNull(arg: any): arg is null {
  return arg === null
}

export function toPercentage(arg: number) {
  return `${arg}%`
}

export function get2DArray<T extends any[]>(arr: T, size = 2): T[] {
  if (isEmpty(arr) || size < 1) {
    return []
  }

  const recursion = (arr: T, size: number, result = [] as T[]): T[] => {
    if (size >= arr.length) {
      return [...result, [...arr]] as T[]
    }

    const remain = arr.slice(size)
    const slice = arr.slice(0, size)

    return recursion(remain as T, size, [...result, slice] as T[])
  }

  return recursion(arr, size)
}

export function add(...nums: number[]): number {
  function recursion(nums: number[], left = 0, result = 0): number {
    if (nums.length === left) {
      return result
    }
    const newResult = result + nums[left]
    return recursion(nums, left + 1, newResult)
  }
  return recursion(nums)
}

export function isEmpty<T extends unknown[]>(arr: T): boolean {
  return arr.length === 0
}

export function isNotEmpty<T extends unknown[]>(arr: T): boolean {
  return arr.length > 0
}

export function flatten<T extends any[]>(arr: T) {
  return arr.flat(1)
}

export function keys<T extends Record<string, any>>(record: T): (keyof T)[] {
  return Object.keys(record)
}

export function withId<T = unknown>(arr: T[]) {
  let id = 0
  return arr.map((value) => ({ value, id: id++ }))
}

// FIXME: return types
export function pick<T extends Record<string, any>, K extends keyof T>(
  record?: T,
  ...keys: K[]
) {
  if (!record) {
    return
  }

  let result = {} as {
    [Property in K]-?: T[Property]
  }

  keys.forEach((key) => {
    if (record[key] !== undefined) {
      result = {
        ...result,
        [key]: record[key],
      }
    }
  })

  return result
}

export function values<T extends Record<string, any> = Record<string, any>>(
  record: T
): T[keyof T][] {
  return Object.values(record)
}

export function isNaturalNumber(number?: number) {
  if (isUndefined(number)) {
    return false
  }
  return number > 0
}

export function toString(value?: number): undefined | string {
  if (!value) return

  return `${value}`
}

export const min = (...values: number[]) => {
  return Math.min(...values)
}

export const abs = (value: number) => {
  return Math.abs(value)
}

export const max = (...values: number[]) => {
  return Math.max(...values)
}

export const toNumber = (value: any): number => {
  return Number(value)
}
export const convertToTitleCase = (str: string) => {
  // Handle snake_case
  str = str.replace(/_/g, " ")

  // Handle camelCase
  str = str.replace(/([A-Z])/g, " $1")

  // Capitalize the first letter of each word and trim any extra spaces
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim()
}

export enum EmojiProperties {
  name = "n",
  unified = "u",
  variations = "v",
  added_in = "a",
  imgUrl = "imgUrl",
}

export interface DataEmoji {
  [EmojiProperties.name]: string[]
  [EmojiProperties.unified]: string
  [EmojiProperties.variations]?: string[]
  [EmojiProperties.added_in]: string
  [EmojiProperties.imgUrl]?: string
}

export const emojiUnified = (emoji: DataEmoji): string => {
  const unified = emoji[EmojiProperties.unified]
  return unified
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((key) => delete result[key])
  return result
}

export function getMiddleIndex<T extends any[] | string>(value: T) {
  return Math.round(value.length / 2)
}

export function strToArray(value: string) {
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim())
  }
}

export function fromLength(length: number) {
  return Array.from({ length }, (_, index) => index)
}

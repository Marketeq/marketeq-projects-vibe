export type Keys<T> = keyof T
export type Values<T> = T[Keys<T>]

export type Prettify<T> = {
  [Key in keyof T]: T[Key]
} & {}

export type ArrayFromUnion<T> = T extends any[] ? T : never

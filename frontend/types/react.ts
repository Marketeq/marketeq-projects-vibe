export type WithoutChildren<T extends { children?: K }, K = any> = Omit<
  T,
  "children"
>

export type WithoutRef<T extends { ref?: K }, K = any> = Omit<T, "ref">

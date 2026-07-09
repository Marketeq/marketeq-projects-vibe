declare module 'image-size' {
  export function imageSize(input: Buffer | string): { width?: number; height?: number; type?: string };
  export default imageSize;
}

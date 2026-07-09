export async function scanImage(imageUrl: string): Promise<{ containsInappropriateContent: boolean }> {
  return { containsInappropriateContent: false };
}
export async function scanVideo(videoUrl: string): Promise<{ containsInappropriateContent: boolean }> {
  return { containsInappropriateContent: false };
}

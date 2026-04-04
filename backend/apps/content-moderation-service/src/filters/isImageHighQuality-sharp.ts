import sharp from 'sharp';

export const isImageHighQuality = async (filePath: string) => {
  try {
    console.log("[isImageHighQuality] Using sharp...");

    const metadata = await sharp(filePath).metadata();

    console.log("[isImageHighQuality] Metadata:", metadata);

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image dimensions");
    }

    return metadata.width >= 200 && metadata.height >= 200; // adjust threshold
  } catch (err) {
    console.error("[isImageHighQuality] Error:", err);
    throw err;
  }
};
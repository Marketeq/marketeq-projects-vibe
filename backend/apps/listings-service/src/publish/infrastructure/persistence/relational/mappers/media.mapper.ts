import { MediaEntity } from '../entities/media.entity';
import { Media } from '../../../../interface/media';

export class MediaMapper {
  static toDomain(raw: MediaEntity): Media {
    return {
      id: raw.id,
      featuredImage: raw.featuredImage,
      additionalImages: raw.additionalImages ?? [],
      featuredVideo: raw.videoUrl ?? undefined,
      projectId: raw.projectId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    };
  }

  static toPersistence(media: Media): MediaEntity {
    const mediaEntity = new MediaEntity();

    if (media.id) {
      mediaEntity.id = media.id;
    }

    mediaEntity.featuredImage = media.featuredImage;
    mediaEntity.additionalImages = media.additionalImages ?? [];
    mediaEntity.videoUrl = media.featuredVideo ?? undefined;
    mediaEntity.projectId = media.projectId;
    mediaEntity.createdAt = media.createdAt!;
    mediaEntity.updatedAt = media.updatedAt!;
    mediaEntity.deletedAt = media.deletedAt ?? null;

    return mediaEntity;
  }
}

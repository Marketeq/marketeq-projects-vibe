import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);
  private readonly moderationApiUrl = 'http://localhost:8000/moderate';

  async moderateImage(imagePath: string): Promise<{
    is_safe: boolean;
    label: string;
    confidence: number;
    probabilities: Record<string, number>;
  }> {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));
    try {
      const response = await axios.post(this.moderationApiUrl, form, {
        headers: form.getHeaders(),
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Image moderation API error', error);
      throw new Error('Image moderation failed');
    }
  }
}

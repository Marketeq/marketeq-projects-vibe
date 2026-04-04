import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PerspectiveApiService {
  private readonly logger = new Logger(PerspectiveApiService.name);
  private readonly apiKey = process.env.PERSPECTIVE_API_KEY;
  private readonly apiUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

  async analyzeText(text: string): Promise<any> {
    if (!this.apiKey) {
      this.logger.error('Perspective API key is not set.');
      throw new Error('Perspective API key is not set.');
    }
    try {
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          comment: { text },
          languages: ['en'],
          requestedAttributes: { TOXICITY: {} },
        }
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error calling Perspective API', error);
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
@Injectable()
export class AppService {
  private client: any = null;
  private isMockMode = process.env.MOCK_MODE === 'true';

  constructor() {
    if (this.isMockMode) {
      console.log('MOCK_MODE enabled - skipping Algolia');
      return;
    }

    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_API_KEY;

    if (!appId || !apiKey) {
      console.warn(
        'Algolia credentials are missing. Continuing without Algolia client in non-mock mode.',
      );
      return;
    }

    const algoliaModule = require('algoliasearch');
    const algoliaFactory =
      algoliaModule?.default ?? algoliaModule?.algoliasearch ?? algoliaModule;

    if (typeof algoliaFactory !== 'function') {
      console.warn(
        'Algolia module export shape is unsupported. Continuing without Algolia client.',
      );
      return;
    }

    this.client = algoliaFactory(appId, apiKey);
  }

  getHello(): string {
    return this.isMockMode
      ? 'Hello from MOCK mode 🚀'
      : 'Hello World!';
  }
}
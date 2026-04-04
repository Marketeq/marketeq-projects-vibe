import { Injectable } from '@nestjs/common';
@Injectable()
export class AppService {
  private client: any = null;
  private isMockMode = process.env.MOCK_MODE === 'true';

  constructor() {
    if (!this.isMockMode) {
      const algoliasearch = require('algoliasearch');
      this.client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
    } else {
      console.log('MOCK_MODE enabled — skipping Algolia');
    }
  }

  getHello(): string {
    return this.isMockMode
      ? 'Hello from MOCK mode 🚀'
      : 'Hello World!';
  }
}
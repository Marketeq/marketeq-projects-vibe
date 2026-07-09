import { Injectable } from '@nestjs/common';

@Injectable()
export class LocationValidationService {
  private validLocations = ['new york', 'san francisco', 'london', 'berlin']; // Example locations

  async check(location: string): Promise<boolean> {
    return this.validLocations.includes(location.toLowerCase());
  }
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class AutocompleteValidationService {
  private allowedEntries: { [key: string]: string[] } = {
    role: ['developer', 'designer'],
    skill: ['typescript', 'nodejs'],
    // Add more types as needed
  };

  async check(entry: string, type: string): Promise<boolean> {
    const allowed = this.allowedEntries[type] || [];
    return allowed.includes(entry.toLowerCase());
  }
}

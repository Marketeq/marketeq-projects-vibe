
import { Injectable } from '@nestjs/common';

@Injectable()
export class AutocompleteService {
  private data: Record<string, Set<string>> = {
    role: new Set(['developer', 'qa']),
    skill: new Set(['javascript', 'python']),
    location: new Set(['new york', 'london']),
  };

  async add(type: string, value: string): Promise<void> {
    if (!this.data[type]) {
      this.data[type] = new Set(); 
    }
    this.data[type].add(value.toLowerCase());
  }

  getAll() {
    return this.data;
  }
}

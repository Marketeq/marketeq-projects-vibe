import { Injectable } from '@nestjs/common';
const BadWordsFilter = require('bad-words');
import { BannedKeywordsService } from './banned-keywords.service';
import { RoleValidationService } from './role-validation.service';
import { SkillValidationService } from './skill-validation.service';
import { LocationValidationService } from './location-validation.service';
import { AutocompleteValidationService } from './autocomplete-validation.service';

@Injectable()
export class ContentValidationService {
  private readonly filter = new BadWordsFilter();

  constructor(
    private readonly bannedKeywordsService: BannedKeywordsService,
    private readonly roleValidationService: RoleValidationService,
    private readonly skillValidationService: SkillValidationService,
    private readonly locationValidationService: LocationValidationService,
    private readonly autocompleteValidationService: AutocompleteValidationService,
  ) {}

  async validateContent(content: string): Promise<boolean> {
    if (this.filter.isProfane(content)) {
      return false;
    }

    const bannedKeywordsCheck = await this.bannedKeywordsService.check(content);
    if (bannedKeywordsCheck.failed) {
      return false;
    }

    return true;
  }

  async validateRole(role: string): Promise<boolean> {
    return await this.roleValidationService.check(role);
  }

  async validateSkills(skills: string[]): Promise<boolean> {
    const invalidSkills = await Promise.all(
      skills.map(async (skill) => !(await this.skillValidationService.check(skill)))
    );
    return !invalidSkills.includes(true);
  }

  async validateLocation(location: string): Promise<boolean> {
    return await this.locationValidationService.check(location);
  }

  async validateAutocompleteEntry(entry: string, type: string): Promise<boolean> {
    return await this.autocompleteValidationService.check(entry, type);
  }

  validateProjectFields(project: {
    title: string;
    description: string;
    tags: string[];
    categories: string[];
  }): void {
    const { title, description, tags, categories } = project;

    // Test Case 11: Empty fields or invalid characters
    if (!title?.trim() || !description?.trim()) {
      throw new Error('Title and description are required.');
    }

    const invalidCharRegex = /[^a-zA-Z0-9\s.,!?'"-]/;
    if (invalidCharRegex.test(title) || invalidCharRegex.test(description)) {
      throw new Error('Fields contain invalid characters.');
    }

    // Test Case 12: Long strings or excessive whitespace
    if (title.length > 100 || description.length > 1000) {
      throw new Error('Title or description is too long.');
    }

    // const excessiveSpaceRegex = /\s{2,}/;
    // if (excessiveSpaceRegex.test(title) || excessiveSpaceRegex.test(description)) {
    //   throw new Error('Fields contain excessive whitespace.');
    // }

    // Test Case 13: Duplicate tags or categories
    const tagSet = new Set(tags.map(tag => tag.toLowerCase().trim()));
    if (tagSet.size !== tags.length) {
      throw new Error('Duplicate tags are not allowed.');
    }

    const categorySet = new Set(categories.map(cat => cat.toLowerCase().trim()));
    if (categorySet.size !== categories.length) {
      throw new Error('Duplicate categories are not allowed.');
    }
  }
}

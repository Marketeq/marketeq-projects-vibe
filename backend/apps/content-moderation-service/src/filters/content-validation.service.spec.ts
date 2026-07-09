import { ContentValidationService } from './content-validation.service';
import { BannedKeywordsService } from './banned-keywords.service';
import { RoleValidationService } from './role-validation.service';
import { SkillValidationService } from './skill-validation.service';
import { LocationValidationService } from './location-validation.service';
import { AutocompleteValidationService } from './autocomplete-validation.service';

describe('ContentValidationService - validateProjectFields()', () => {
  let service: ContentValidationService;

  beforeEach(() => {
    service = new ContentValidationService(
      {} as BannedKeywordsService,
      {} as RoleValidationService,
      {} as SkillValidationService,
      {} as LocationValidationService,
      {} as AutocompleteValidationService,
    );
  });

  it('should throw error for empty title or description', () => {
    const project = {
      title: '   ',
      description: '',
      tags: ['AI'],
      categories: ['Tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Title and description are required.');
  });

  it('should throw error for invalid characters in title or description', () => {
    const project = {
      title: 'ValidTitle@',
      description: 'Clean description!',
      tags: ['AI'],
      categories: ['Tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Fields contain invalid characters.');
  });

  it('should throw error for title or description that is too long', () => {
    const project = {
      title: 'a'.repeat(101),
      description: 'b'.repeat(1001),
      tags: ['AI'],
      categories: ['Tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Title or description is too long.');
  });

  it('should throw error for excessive whitespace in title or description', () => {
    const project = {
      title: 'This  title has  double  spaces',
      description: 'Clean description!',
      tags: ['AI'],
      categories: ['Tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Fields contain excessive whitespace.');
  });

  it('should throw error for duplicate tags', () => {
    const project = {
      title: 'AI Project',
      description: 'Machine learning project',
      tags: ['AI', 'ai'],
      categories: ['Tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Duplicate tags are not allowed.');
  });

  it('should throw error for duplicate categories', () => {
    const project = {
      title: 'AI Project',
      description: 'Machine learning project',
      tags: ['AI'],
      categories: ['Tech', 'tech'],
    };

    expect(() => service.validateProjectFields(project)).toThrow('Duplicate categories are not allowed.');
  });

  it('should pass for valid project fields', () => {
    const project = {
      title: 'Clean Title',
      description: 'Valid project description without any problems.',
      tags: ['AI', 'ML'],
      categories: ['Tech', 'Education'],
    };

    expect(() => service.validateProjectFields(project)).not.toThrow();
  });
});

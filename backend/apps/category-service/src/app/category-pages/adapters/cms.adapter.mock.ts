import { Injectable, Logger } from '@nestjs/common';
import { CmsAdapter } from './cms.adapter';
import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * Mock implementation of CmsAdapter for development.
 * Returns hardcoded taxonomy groups until real CMS is configured.
 */
@Injectable()
export class CmsAdapterMock extends CmsAdapter {
  private readonly logger = new Logger(CmsAdapterMock.name);

  async getTaxonomyGroups(categoryUuid: string): Promise<TaxonomyGroup[]> {
    this.logger.log(`Mock: getTaxonomyGroups(${categoryUuid})`);

    return [
      {
        id: 1, name: 'Show All - Combined View', path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          { name: 'Featured Projects', entity: 'projects', kind: 'top_rated', type: 'show-all' },
          { name: 'Trending Services', entity: 'services', kind: 'trending', type: 'show-all' },
          { name: 'New Teams', entity: 'teams', kind: 'new', type: 'show-all' },
        ],
      },
      {
        id: 2, name: 'Projects Page', path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          { name: 'Top Rated Projects', entity: 'projects', kind: 'top_rated', type: 'projects' },
          { name: 'Trending Projects', entity: 'projects', kind: 'trending', type: 'projects' },
          { name: 'New Projects', entity: 'projects', kind: 'new', type: 'projects' },
        ],
      },
      {
        id: 3, name: 'Services Page', path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          { name: 'Top Rated Services', entity: 'services', kind: 'top_rated', type: 'services' },
          { name: 'Trending Services', entity: 'services', kind: 'trending', type: 'services' },
          { name: 'New Services', entity: 'services', kind: 'new', type: 'services' },
        ],
      },
      {
        id: 4, name: 'Teams Page', path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          { name: 'Top Rated Teams', entity: 'teams', kind: 'top_rated', type: 'teams' },
          { name: 'New Teams', entity: 'teams', kind: 'new', type: 'teams' },
        ],
      },
      {
        id: 5, name: 'Talent Page', path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          { name: 'Top Rated Talent', entity: 'talent', kind: 'top_rated', type: 'talent' },
          { name: 'Curated Talent', entity: 'talent', kind: 'curated', type: 'talent' },
        ],
      },
    ];
  }

  async getEditorial(categoryUuid: string): Promise<EditorialContent | null> {
    this.logger.log(`Mock: getEditorial(${categoryUuid})`);
    return {
      seoOverride: {
        title: 'Explore Top Talent & Projects - Category Name',
        description: 'Discover talented professionals and amazing projects in this category.',
        canonical: `https://marketplace.com/c/${categoryUuid}`,
      },
      hero: {
        title: 'Discover Amazing Talent & Projects',
        subtitle: 'Browse thousands of portfolios and hire the best professionals',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop',
        link: '/guides/getting-started',
      },
      guides: [
        { id: 'guide-1', title: 'Getting Started Guide', description: 'Learn how to find and hire top professionals.', link: '/guides/getting-started' },
        { id: 'guide-2', title: 'Best Practices for Hiring', description: 'Expert tips on writing job posts and evaluating candidates.', link: '/guides/hiring-best-practices' },
      ],
      courses: [
        { id: 'course-1', title: 'Platform Fundamentals', description: 'Learn the basics.', link: '/courses/beginner-fundamentals', duration: '2 hours' },
        { id: 'course-2', title: 'Project Management', description: 'Master remote project management.', link: '/courses/project-management', duration: '4 hours' },
      ],
      faq: [
        { question: 'What is this category about?', answer: 'This category features talented professionals and projects in a specific domain.' },
        { question: 'How do I find the right professional?', answer: 'Use filters to narrow down by skills, experience level, and ratings.' },
        { question: 'Is there a money-back guarantee?', answer: 'Yes! We offer buyer protection with funds held in escrow.' },
      ],
    };
  }
}

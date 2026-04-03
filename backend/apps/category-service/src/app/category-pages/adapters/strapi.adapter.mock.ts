import { Injectable, Logger } from '@nestjs/common';
import { StrapiAdapter } from './strapi.adapter';
import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * Mock implementation of StrapiAdapter for development.
 * Returns hardcoded taxonomy groups until Jayesh provides real implementation.
 */
@Injectable()
export class StrapiAdapterMock extends StrapiAdapter {
  private readonly logger = new Logger(StrapiAdapterMock.name);

  async getTaxonomyGroups(categoryUuid: string): Promise<TaxonomyGroup[]> {
    this.logger.log(`Mock: getTaxonomyGroups(${categoryUuid})`);
  
    return [
      {
        id: 1,
        name: 'Show All - Combined View',
        path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          {
            name: 'Featured Projects',
            entity: 'projects',
            kind: 'top_rated',
            type: 'show-all'
          },
          {
            name: 'Trending Services',
            entity: 'services',
            kind: 'trending',
            type: 'show-all'
          },
          {
            name: 'New Teams',
            entity: 'teams',
            kind: 'new',
            type: 'show-all'
          }
        ]
      },
      {
        id: 2,
        name: 'Projects Page',
        path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          {
            name: 'Top Rated Projects',
            entity: 'projects',
            kind: 'top_rated',
            type: 'projects'
          },
          {
            name: 'Trending Projects',
            entity: 'projects',
            kind: 'trending',
            type: 'projects'
          },
          {
            name: 'New Projects',
            entity: 'projects',
            kind: 'new',
            type: 'projects'
          }
        ]
      },
      {
        id: 3,
        name: 'Services Page',
        path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          {
            name: 'Top Rated Services',
            entity: 'services',
            kind: 'top_rated',
            type: 'services'
          },
          {
            name: 'Trending Services',
            entity: 'services',
            kind: 'trending',
            type: 'services'
          },
          {
            name: 'New Services',
            entity: 'services',
            kind: 'new',
            type: 'services'
          }
        ]
      },
      {
        id: 4,
        name: 'Teams Page',
        path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          {
            name: 'Top Rated Teams',
            entity: 'teams',
            kind: 'top_rated',
            type: 'teams'
          },
          {
            name: 'New Teams',
            entity: 'teams',
            kind: 'new',
            type: 'teams'
          }
        ]
      },
      {
        id: 5,
        name: 'Talent Page',
        path_scope: 'l1',
        categoryUuids: [categoryUuid],
        rules: [
          {
            name: 'Top Rated Talent',
            entity: 'talent',
            kind: 'top_rated',
            type: 'talent'
          },
          {
            name: 'Curated Talent',
            entity: 'talent',
            kind: 'curated',
            type: 'talent'
          }
        ]
      }
    ];
  }

  async getEditorial(categoryUuid: string): Promise<EditorialContent | null> {
    this.logger.log(`Mock: getEditorial(${categoryUuid})`);

    // Return realistic editorial content for all categories
    return {
      seoOverride: {
        title: 'Explore Top Talent & Projects - Category Name',
        description: 'Discover talented professionals and amazing projects in this category. Browse portfolios, hire experts, and find inspiration.',
        canonical: `https://marketplace.com/c/${categoryUuid}`
      },

      hero: {
        title: 'Discover Amazing Talent & Projects',
        subtitle: 'Browse thousands of portfolios and hire the best professionals for your next project',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=400&fit=crop',
        link: '/guides/getting-started'
      },

      guides: [
        {
          id: 'guide-1',
          title: 'Getting Started Guide',
          description: 'Learn how to find and hire top professionals for your project. Understand the platform, explore categories, and make your first hire.',
          link: '/guides/getting-started',
          thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'
        },
        {
          id: 'guide-2',
          title: 'Best Practices for Hiring',
          description: 'Expert tips on writing job posts, evaluating candidates, and managing projects successfully.',
          link: '/guides/hiring-best-practices',
          thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop'
        },
        {
          id: 'guide-3',
          title: 'Building Your Portfolio',
          description: 'Showcase your work effectively. Learn how to create a portfolio that stands out and attracts clients.',
          link: '/guides/portfolio-building',
          thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=200&fit=crop'
        }
      ],

      courses: [
        {
          id: 'course-1',
          title: 'Beginner Course: Platform Fundamentals',
          description: 'Perfect for newcomers. Learn the basics of navigating the platform, creating your profile, and finding opportunities.',
          link: '/courses/beginner-fundamentals',
          thumbnail: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=300&h=200&fit=crop',
          duration: '2 hours'
        },
        {
          id: 'course-2',
          title: 'Intermediate: Project Management',
          description: 'Master the art of managing remote projects. Communication, deadlines, and client relationships.',
          link: '/courses/project-management',
          thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&h=200&fit=crop',
          duration: '4 hours'
        },
        {
          id: 'course-3',
          title: 'Advanced: Building Your Business',
          description: 'Scale your freelance career. Pricing strategies, client acquisition, and long-term growth.',
          link: '/courses/business-building',
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
          duration: '6 hours'
        }
      ],

      faq: [
        {
          question: 'What is this category about?',
          answer: 'This category features talented professionals and projects in a specific domain. You can browse portfolios, view completed work, and hire experts for your projects.'
        },
        {
          question: 'How do I find the right professional for my project?',
          answer: 'Use the filters to narrow down by skills, experience level, and ratings. Review portfolios and past work samples. You can also post a job and let professionals come to you.'
        },
        {
          question: 'What are the typical rates in this category?',
          answer: 'Rates vary based on experience, project complexity, and timeline. Most professionals list their hourly rates or project-based pricing on their profiles.'
        },
        {
          question: 'How does the hiring process work?',
          answer: 'Browse profiles or post a job, communicate with candidates, review proposals, select your professional, define project scope, and work together using our secure platform.'
        },
        {
          question: 'Is there a money-back guarantee?',
          answer: 'Yes! We offer buyer protection. Funds are held in escrow and only released when you approve the completed work. If issues arise, our support team can help mediate.'
        },
        {
          question: 'Can I hire for long-term or ongoing projects?',
          answer: 'Absolutely! Many clients establish long-term relationships with professionals. You can set up recurring projects or retainer agreements.'
        }
      ]
    };
  }
}
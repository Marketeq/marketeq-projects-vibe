import { MigrationInterface, QueryRunner } from 'typeorm';

const SEED_TITLES: { title: string; industry: string; category: string }[] = [
  // Engineering
  { title: 'Software Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Frontend Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Backend Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Full Stack Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Mobile Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'iOS Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Android Developer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'DevOps Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Cloud Architect', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Data Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Machine Learning Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'QA Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Security Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Site Reliability Engineer', industry: 'Tech & Software', category: 'Engineering' },
  { title: 'Embedded Systems Engineer', industry: 'Tech & Software', category: 'Engineering' },
  // Product
  { title: 'Product Manager', industry: 'Tech & Software', category: 'Product Management' },
  { title: 'Technical Product Manager', industry: 'Tech & Software', category: 'Product Management' },
  { title: 'Product Owner', industry: 'Tech & Software', category: 'Product Management' },
  { title: 'Scrum Master', industry: 'Tech & Software', category: 'Product Management' },
  { title: 'Program Manager', industry: 'Tech & Software', category: 'Product Management' },
  // Design
  { title: 'UX Designer', industry: 'Tech & Software', category: 'Design' },
  { title: 'UI Designer', industry: 'Tech & Software', category: 'Design' },
  { title: 'Product Designer', industry: 'Tech & Software', category: 'Design' },
  { title: 'Graphic Designer', industry: 'Creative & Media', category: 'Design' },
  { title: 'Motion Designer', industry: 'Creative & Media', category: 'Design' },
  { title: 'Brand Designer', industry: 'Creative & Media', category: 'Design' },
  { title: 'Interaction Designer', industry: 'Tech & Software', category: 'Design' },
  // Data & Analytics
  { title: 'Data Scientist', industry: 'Tech & Software', category: 'Data & Analytics' },
  { title: 'Data Analyst', industry: 'Tech & Software', category: 'Data & Analytics' },
  { title: 'Business Analyst', industry: 'Business & Finance', category: 'Data & Analytics' },
  { title: 'Business Intelligence Analyst', industry: 'Business & Finance', category: 'Data & Analytics' },
  // Marketing
  { title: 'Digital Marketing Manager', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'Content Strategist', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'SEO Specialist', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'Social Media Manager', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'Growth Marketing Manager', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'Email Marketing Specialist', industry: 'Marketing & Advertising', category: 'Marketing' },
  { title: 'Performance Marketing Manager', industry: 'Marketing & Advertising', category: 'Marketing' },
  // Writing & Content
  { title: 'Copywriter', industry: 'Creative & Media', category: 'Writing & Content' },
  { title: 'Technical Writer', industry: 'Tech & Software', category: 'Writing & Content' },
  { title: 'Content Writer', industry: 'Creative & Media', category: 'Writing & Content' },
  { title: 'UX Writer', industry: 'Tech & Software', category: 'Writing & Content' },
  // Finance & Accounting
  { title: 'Financial Analyst', industry: 'Business & Finance', category: 'Finance' },
  { title: 'Accountant', industry: 'Business & Finance', category: 'Finance' },
  { title: 'Bookkeeper', industry: 'Business & Finance', category: 'Finance' },
  { title: 'Tax Specialist', industry: 'Business & Finance', category: 'Finance' },
  // Legal
  { title: 'Contract Attorney', industry: 'Legal', category: 'Legal' },
  { title: 'Paralegal', industry: 'Legal', category: 'Legal' },
  { title: 'Compliance Specialist', industry: 'Legal', category: 'Legal' },
  // Consulting
  { title: 'Management Consultant', industry: 'Business & Finance', category: 'Consulting' },
  { title: 'Strategy Consultant', industry: 'Business & Finance', category: 'Consulting' },
  { title: 'IT Consultant', industry: 'Tech & Software', category: 'Consulting' },
  // Project Management
  { title: 'Project Manager', industry: 'Tech & Software', category: 'Project Management' },
  { title: 'Agile Coach', industry: 'Tech & Software', category: 'Project Management' },
  { title: 'Delivery Manager', industry: 'Tech & Software', category: 'Project Management' },
  // Video & Media
  { title: 'Video Editor', industry: 'Creative & Media', category: 'Media Production' },
  { title: 'Videographer', industry: 'Creative & Media', category: 'Media Production' },
  { title: 'Photographer', industry: 'Creative & Media', category: 'Media Production' },
  { title: 'Audio Engineer', industry: 'Creative & Media', category: 'Media Production' },
  // Healthcare
  { title: 'Health IT Specialist', industry: 'Healthcare', category: 'Healthcare' },
  { title: 'Clinical Data Manager', industry: 'Healthcare', category: 'Healthcare' },
  { title: 'Medical Writer', industry: 'Healthcare', category: 'Healthcare' },
  // Education
  { title: 'Instructional Designer', industry: 'Education', category: 'Education' },
  { title: 'Curriculum Developer', industry: 'Education', category: 'Education' },
  { title: 'E-Learning Developer', industry: 'Education', category: 'Education' },
];

export class SeedJobTitles1710000100000 implements MigrationInterface {
  name = 'SeedJobTitles1710000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of SEED_TITLES) {
      await queryRunner.query(
        `INSERT INTO suggestion_job_titles (title, industry, category, is_active, usage_count)
         VALUES ($1, $2, $3, true, 10)
         ON CONFLICT (LOWER(title), LOWER(COALESCE(industry, '')), LOWER(COALESCE(goal, ''))) DO NOTHING`,
        [t.title, t.industry, t.category],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM suggestion_job_titles WHERE usage_count = 10`);
  }
}

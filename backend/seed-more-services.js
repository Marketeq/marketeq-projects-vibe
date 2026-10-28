#!/usr/bin/env node
/**
 * Seed additional services across categories to enable horizontal scrolling carousels.
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}
const SCHEMA = 'listings';

const NEW_SERVICES = [
  // Research category
  {
    title: 'Qualitative Research & Interviews Service',
    description: 'Expert qualitative research service offering in-depth interviews, focus groups, ethnographic studies, and thematic analysis. Our research team conducts structured and semi-structured interviews with target demographics, synthesizes findings into actionable insights, and provides detailed reports with video highlights.',
    shortDescription: 'In-depth qualitative research with expert interviewers, focus groups, and thematic analysis for product and market insights.',
    slug: 'qualitative-research-interviews-service',
    category: 'research',
    categories: ['Research', 'Qualitative Research', 'Interviews'],
    subcategories: ['Qualitative Research', 'Focus Groups', 'Ethnography', 'User Interviews', 'Research', 'Insights'],
    skills: ['Qualitative Analysis', 'Interview Design', 'Focus Groups', 'Ethnography', 'NVivo'],
    tags: ['Qualitative', 'Interviews', 'Focus Groups', 'Insights', 'User Research', 'Ethnography', 'Thematic Analysis'],
    industry: ['Research', 'Healthcare', 'Consumer Goods'],
    programmingLanguages: [],
    developmentTech: ['NVivo', 'Dovetail', 'Zoom', 'Miro'],
    languages: ['English', 'Spanish', 'French'],
    locations: ['USA', 'UK', 'Canada'],
    deliverables: ['Interview Guide Design', 'Participant Recruitment', 'In-depth Interview Sessions', 'Thematic Analysis Report', 'Video Highlight Reel'],
    priceMin: 3000,
    priceMax: 12000,
    deliveryTime: '3-6 weeks',
  },
  {
    title: 'Data Visualization & Reporting Service',
    description: 'Transform raw research data into compelling visual narratives. We create interactive dashboards, infographics, and presentation-ready reports using tools like Tableau, Power BI, and D3.js. Perfect for research teams needing to communicate complex findings to stakeholders.',
    shortDescription: 'Turn raw data into compelling visual stories with interactive dashboards, infographics, and executive-ready reports.',
    slug: 'data-visualization-reporting-service',
    category: 'research',
    categories: ['Research', 'Data Visualization', 'Reporting'],
    subcategories: ['Data Visualization', 'Reporting', 'Dashboard Design', 'Infographics', 'Research', 'Analytics'],
    skills: ['Tableau', 'Power BI', 'D3.js', 'Data Storytelling', 'Information Design'],
    tags: ['Visualization', 'Dashboards', 'Reporting', 'Infographics', 'Data Stories', 'Executive Reports', 'Analytics'],
    industry: ['Research', 'Finance', 'Healthcare'],
    programmingLanguages: ['Python', 'R', 'JavaScript'],
    developmentTech: ['Tableau', 'Power BI', 'D3.js', 'Plotly'],
    languages: ['English', 'German'],
    locations: ['USA', 'Germany', 'UK'],
    deliverables: ['Interactive Dashboard', 'Executive Summary Report', 'Custom Infographics', 'Data Pipeline Setup', 'Training Documentation'],
    priceMin: 2500,
    priceMax: 8000,
    deliveryTime: '2-4 weeks',
  },
  {
    title: 'Academic Research Assistant Service',
    description: 'Professional academic research support including systematic literature reviews, meta-analysis, statistical consulting, and manuscript preparation. Our team of PhD-level researchers provides rigorous support for academic publications, grant proposals, and thesis projects.',
    shortDescription: 'PhD-level research support for literature reviews, meta-analysis, statistical consulting, and manuscript preparation.',
    slug: 'academic-research-assistant-service',
    category: 'research',
    categories: ['Research', 'Academic Research', 'Statistical Analysis'],
    subcategories: ['Academic Research', 'Literature Review', 'Meta-Analysis', 'Statistical Consulting', 'Research', 'Publishing'],
    skills: ['Systematic Reviews', 'Meta-Analysis', 'SPSS', 'R', 'Academic Writing'],
    tags: ['Academic', 'Literature Review', 'Meta-Analysis', 'Statistics', 'Publishing', 'Grant Writing', 'Thesis'],
    industry: ['Education', 'Healthcare', 'Social Sciences'],
    programmingLanguages: ['R', 'Python', 'SPSS'],
    developmentTech: ['Zotero', 'Covidence', 'RevMan', 'SPSS'],
    languages: ['English', 'French', 'German'],
    locations: ['USA', 'UK', 'Australia'],
    deliverables: ['Systematic Literature Review', 'Statistical Analysis Report', 'Manuscript Draft', 'Reference Database', 'Methodology Documentation'],
    priceMin: 2000,
    priceMax: 10000,
    deliveryTime: '4-8 weeks',
  },
  {
    title: 'Sentiment Analysis & Social Listening',
    description: 'Real-time brand monitoring and sentiment analysis across social media, review sites, and forums. Using NLP and ML models, we track brand perception, identify emerging trends, monitor competitor sentiment, and provide actionable insights for marketing and PR teams.',
    shortDescription: 'AI-powered sentiment analysis and social listening for brand monitoring, trend detection, and competitive intelligence.',
    slug: 'sentiment-analysis-social-listening',
    category: 'research',
    categories: ['Research', 'Sentiment Analysis', 'Social Listening'],
    subcategories: ['Sentiment Analysis', 'Social Listening', 'Brand Monitoring', 'NLP', 'Research', 'Marketing Research'],
    skills: ['NLP', 'Sentiment Analysis', 'Social Media Analytics', 'Python', 'Brand Monitoring'],
    tags: ['Sentiment', 'Social Listening', 'Brand Monitor', 'NLP', 'Trends', 'PR Analytics', 'Real-time'],
    industry: ['Marketing', 'PR', 'Consumer Goods'],
    programmingLanguages: ['Python', 'R'],
    developmentTech: ['Brandwatch', 'Sprout Social', 'Hugging Face', 'spaCy'],
    languages: ['English', 'Spanish', 'Portuguese'],
    locations: ['USA', 'Brazil', 'Mexico'],
    deliverables: ['Sentiment Dashboard', 'Weekly Trend Reports', 'Competitor Sentiment Analysis', 'Alert System Setup', 'Quarterly Deep-Dive Report'],
    priceMin: 3500,
    priceMax: 15000,
    deliveryTime: 'Ongoing monthly',
  },
  {
    title: 'Industry Benchmarking & Analysis Service',
    description: 'Comprehensive industry benchmarking using proprietary data sources and analytical frameworks. We deliver detailed comparisons of key performance indicators, market positioning analysis, and strategic recommendations based on industry best practices and competitor performance.',
    shortDescription: 'Comprehensive industry benchmarking with KPI analysis, market positioning, and strategic recommendations.',
    slug: 'industry-benchmarking-analysis-service',
    category: 'research',
    categories: ['Research', 'Industry Analysis', 'Benchmarking'],
    subcategories: ['Industry Analysis', 'Benchmarking', 'KPI Analysis', 'Market Positioning', 'Research', 'Strategy'],
    skills: ['Industry Analysis', 'Financial Modeling', 'Benchmarking', 'Strategy', 'Data Analysis'],
    tags: ['Benchmarking', 'Industry Analysis', 'KPI', 'Strategy', 'Market Position', 'Best Practices', 'Competitor'],
    industry: ['Consulting', 'Finance', 'Technology'],
    programmingLanguages: ['Python', 'R', 'SQL'],
    developmentTech: ['Tableau', 'Excel', 'Bloomberg Terminal', 'Statista'],
    languages: ['English', 'Mandarin', 'Japanese'],
    locations: ['USA', 'Singapore', 'Japan'],
    deliverables: ['Industry Benchmark Report', 'KPI Scorecard', 'Competitive Positioning Map', 'Strategic Recommendations', 'Executive Presentation'],
    priceMin: 5000,
    priceMax: 20000,
    deliveryTime: '4-6 weeks',
  },
  // Software Development category - a few more
  {
    title: 'API Design & Integration Service',
    description: 'Expert API design, documentation, and third-party integration service. We build RESTful and GraphQL APIs following OpenAPI standards, implement webhook systems, and integrate with popular platforms like Stripe, Twilio, Salesforce, and custom enterprise APIs.',
    shortDescription: 'Expert REST/GraphQL API design, documentation, and third-party integration with enterprise platforms.',
    slug: 'api-design-integration-service',
    category: 'software-development',
    categories: ['Software Development', 'API Design', 'Integration'],
    subcategories: ['API Design', 'Integration', 'REST', 'GraphQL', 'Software Development', 'Webhooks'],
    skills: ['API Design', 'REST', 'GraphQL', 'OpenAPI', 'Integration'],
    tags: ['API', 'REST', 'GraphQL', 'Integration', 'Webhooks', 'OpenAPI', 'Microservices'],
    industry: ['Technology', 'SaaS', 'Enterprise'],
    programmingLanguages: ['TypeScript', 'Python', 'Go'],
    developmentTech: ['Express', 'FastAPI', 'Apollo', 'Swagger'],
    languages: ['English', 'Hindi'],
    locations: ['USA', 'India', 'UK'],
    deliverables: ['API Architecture Design', 'OpenAPI Specification', 'Integration Implementation', 'API Documentation', 'Postman Collection'],
    priceMin: 3000,
    priceMax: 15000,
    deliveryTime: '2-6 weeks',
  },
  {
    title: 'Mobile App Development Service',
    description: 'End-to-end mobile application development for iOS and Android using React Native and Flutter. From wireframes to App Store submission, we handle design, development, testing, and deployment. Includes push notifications, analytics, and crash reporting setup.',
    shortDescription: 'Full-service mobile app development for iOS and Android with React Native or Flutter.',
    slug: 'mobile-app-development-service',
    category: 'software-development',
    categories: ['Software Development', 'Mobile Development', 'Cross-Platform'],
    subcategories: ['Mobile Development', 'iOS', 'Android', 'Cross-Platform', 'Software Development', 'React Native'],
    skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile UI'],
    tags: ['Mobile', 'iOS', 'Android', 'React Native', 'Flutter', 'Cross-Platform', 'App Store'],
    industry: ['Technology', 'Consumer', 'Enterprise'],
    programmingLanguages: ['TypeScript', 'Dart', 'Swift', 'Kotlin'],
    developmentTech: ['React Native', 'Flutter', 'Expo', 'Firebase'],
    languages: ['English', 'Spanish'],
    locations: ['USA', 'Argentina', 'Colombia'],
    deliverables: ['Mobile App (iOS & Android)', 'UI/UX Design Files', 'App Store Submission', 'Analytics & Crash Reporting Setup', 'Maintenance Documentation'],
    priceMin: 8000,
    priceMax: 40000,
    deliveryTime: '8-16 weeks',
  },
  // Design category
  {
    title: 'Brand Identity & Design System Service',
    description: 'Complete brand identity design including logo, color palette, typography, iconography, and comprehensive design system. We create Figma-based design systems with reusable components, design tokens, and documentation for seamless developer handoff.',
    shortDescription: 'Complete brand identity and Figma-based design system with reusable components and developer-ready documentation.',
    slug: 'brand-identity-design-system-service',
    category: 'design',
    categories: ['Design', 'Brand Identity', 'Design Systems'],
    subcategories: ['Brand Identity', 'Design Systems', 'Logo Design', 'Typography', 'Design', 'Visual Design'],
    skills: ['Brand Design', 'Figma', 'Design Systems', 'Typography', 'Visual Design'],
    tags: ['Brand', 'Logo', 'Design System', 'Figma', 'Identity', 'Typography', 'Components'],
    industry: ['Marketing', 'Technology', 'Consumer'],
    programmingLanguages: [],
    developmentTech: ['Figma', 'Adobe Illustrator', 'Storybook'],
    languages: ['English', 'French', 'Italian'],
    locations: ['USA', 'France', 'Italy'],
    deliverables: ['Logo & Brand Mark', 'Brand Guidelines PDF', 'Figma Design System', 'Icon Library', 'Design Token Documentation'],
    priceMin: 5000,
    priceMax: 25000,
    deliveryTime: '4-8 weeks',
  },
];

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  console.log('Connected\n');

  // Get a creator ID
  const creator = await db.query(`SELECT id FROM listings.services LIMIT 1`);
  const creatorId = creator.rows[0]?.id ? (await db.query(`SELECT "createdBy" FROM listings.services LIMIT 1`)).rows[0].createdBy : uuidv4();

  for (const svc of NEW_SERVICES) {
    // Check if already exists
    const exists = await db.query(`SELECT id FROM ${SCHEMA}.services WHERE slug = $1`, [svc.slug]);
    if (exists.rows.length > 0) {
      console.log(`  ⏭️  ${svc.title} (already exists)`);
      continue;
    }

    await db.query(
      `INSERT INTO ${SCHEMA}.services (
        title, description, slug, category, categories, subcategories,
        skills, tags, industry, "programmingLanguages", "developmentTech",
        languages, locations, "mediaUrls", status, "priceMin", "priceMax",
        "deliveryTime", "createdBy", "shortDescription", deliverables
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        svc.title, svc.description, svc.slug, svc.category, svc.categories, svc.subcategories,
        svc.skills, svc.tags, svc.industry, svc.programmingLanguages, svc.developmentTech,
        svc.languages, svc.locations, [], 'published', svc.priceMin, svc.priceMax,
        svc.deliveryTime, creatorId, svc.shortDescription, svc.deliverables,
      ]
    );
    console.log(`  ✅ ${svc.title} (${svc.category})`);
  }

  // Count by category
  const counts = await db.query(`SELECT category, count(*) FROM ${SCHEMA}.services GROUP BY category ORDER BY count DESC`);
  console.log('\nService counts by category:');
  counts.rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));

  console.log('\n✅ Done!');
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });

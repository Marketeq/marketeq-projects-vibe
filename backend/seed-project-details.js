#!/usr/bin/env node
/**
 * Add detailed fields and populate project/service data.
 * Fields: subcategories, programmingLanguages, developmentTech, languages, locations, tags (update)
 */

const { Client } = require('pg');

const DATABASE_URL =
  'postgres://supabase_admin:VVLjT29C33ZrP4vzhzmBEGEit3529MAa@72.61.77.231:5433/postgres';
const SCHEMA = 'listings';

// Detailed data per project slug
const PROJECT_DETAILS = {
  'ai-powered-customer-support-platform': {
    subcategories: ['iOS', 'SaaS', 'Mobile Application', 'Customer Support', 'Software Development', 'Artificial Intelligence'],
    programmingLanguages: ['Python', 'TypeScript', 'Node.js'],
    developmentTech: ['React', 'TensorFlow', 'Docker', 'AWS'],
    languages: ['English', 'Spanish', 'French'],
    locations: ['USA', 'UK', 'Canada'],
    tags: ['B2B', 'SaaS', 'NLP', 'Chatbot', 'Enterprise', 'AI', 'Automation'],
  },
  'e-commerce-marketplace-redesign': {
    subcategories: ['E-Commerce', 'Mobile Application', 'Web Application', 'Marketplace', 'Small Business', 'Software Development'],
    programmingLanguages: ['Python', 'React.js', 'Node.js'],
    developmentTech: ['Flutter', 'React Native', 'Ionic'],
    languages: ['English', 'Spanish', 'French'],
    locations: ['USA', 'UK', 'Brazil'],
    tags: ['B2C', 'Marketplace', 'Small Business', 'Custom', 'Native Application', 'Redesign', 'UX'],
  },
  'healthcare-patient-portal': {
    subcategories: ['Healthcare', 'Telemedicine', 'Web Application', 'HIPAA Compliance', 'Software Development', 'Patient Portal'],
    programmingLanguages: ['TypeScript', 'Java', 'Python'],
    developmentTech: ['React', 'Spring Boot', 'PostgreSQL', 'Docker'],
    languages: ['English', 'Spanish'],
    locations: ['USA', 'India', 'UK'],
    tags: ['Healthcare', 'HIPAA', 'Telemedicine', 'Compliance', 'Patient Care', 'Portal', 'Medical'],
  },
  'real-estate-property-management-dashboard': {
    subcategories: ['Real Estate', 'Dashboard', 'SaaS', 'Property Management', 'Analytics', 'Software Development'],
    programmingLanguages: ['TypeScript', 'Python', 'SQL'],
    developmentTech: ['Next.js', 'Django', 'PostgreSQL', 'Redis'],
    languages: ['English', 'Spanish', 'Portuguese'],
    locations: ['USA', 'Brazil', 'Mexico'],
    tags: ['SaaS', 'Dashboard', 'Property Management', 'Real Estate', 'Analytics', 'Landlord', 'Tenant'],
  },
  'supply-chain-analytics-platform': {
    subcategories: ['Supply Chain', 'Machine Learning', 'Data Analytics', 'Logistics', 'Enterprise', 'Software Development'],
    programmingLanguages: ['Python', 'R', 'SQL'],
    developmentTech: ['Apache Spark', 'Tableau', 'AWS', 'Kubernetes'],
    languages: ['English', 'Mandarin', 'German'],
    locations: ['USA', 'Germany', 'China'],
    tags: ['Analytics', 'Supply Chain', 'Machine Learning', 'Data Pipeline', 'Enterprise', 'Logistics', 'Forecasting'],
  },
  'mobile-banking-application': {
    subcategories: ['FinTech', 'Mobile Application', 'iOS', 'Android', 'Banking', 'Software Development'],
    programmingLanguages: ['Swift', 'Kotlin', 'TypeScript'],
    developmentTech: ['React Native', 'Firebase', 'Plaid API', 'AWS'],
    languages: ['English', 'Spanish'],
    locations: ['USA', 'UK', 'Canada', 'Australia'],
    tags: ['FinTech', 'Mobile', 'Banking', 'Security', 'Payments', 'KYC', 'Compliance'],
  },
  'edtech-learning-management-system': {
    subcategories: ['EdTech', 'LMS', 'SaaS', 'Education', 'E-Learning', 'Software Development'],
    programmingLanguages: ['TypeScript', 'Python', 'Go'],
    developmentTech: ['Next.js', 'FastAPI', 'MongoDB', 'WebRTC'],
    languages: ['English', 'French', 'Arabic'],
    locations: ['USA', 'France', 'UAE'],
    tags: ['EdTech', 'LMS', 'Education', 'SaaS', 'Gamification', 'E-Learning', 'Certification'],
  },
  'market-research-intelligence-dashboard': {
    subcategories: ['Market Research', 'Business Intelligence', 'Dashboard', 'Data Visualization', 'Analytics', 'Research'],
    programmingLanguages: ['Python', 'R', 'JavaScript'],
    developmentTech: ['D3.js', 'Plotly', 'Django', 'Elasticsearch'],
    languages: ['English', 'German', 'Japanese'],
    locations: ['USA', 'Germany', 'Japan'],
    tags: ['Market Research', 'Analytics', 'Intelligence', 'Dashboard', 'Insights', 'Strategy', 'Visualization'],
  },
  'consumer-behavior-analytics-suite': {
    subcategories: ['Consumer Research', 'Data Analytics', 'Machine Learning', 'Behavioral Science', 'Research', 'Analytics'],
    programmingLanguages: ['Python', 'R', 'SQL'],
    developmentTech: ['Pandas', 'Scikit-learn', 'Tableau', 'BigQuery'],
    languages: ['English', 'Spanish', 'Portuguese'],
    locations: ['USA', 'Brazil', 'Argentina'],
    tags: ['Consumer Research', 'Analytics', 'Machine Learning', 'Behavior', 'Segmentation', 'Insights', 'Trends'],
  },
  'academic-literature-review-platform': {
    subcategories: ['Academic Research', 'AI Tools', 'NLP', 'Knowledge Management', 'Research', 'Automation'],
    programmingLanguages: ['Python', 'TypeScript', 'Rust'],
    developmentTech: ['Hugging Face', 'React', 'PostgreSQL', 'FastAPI'],
    languages: ['English', 'German', 'French'],
    locations: ['USA', 'UK', 'Germany'],
    tags: ['Academic', 'Literature Review', 'AI', 'Research Tools', 'NLP', 'Knowledge Graph', 'Citation'],
  },
  'competitive-intelligence-tracker': {
    subcategories: ['Competitive Intelligence', 'Data Monitoring', 'Web Scraping', 'Analytics', 'Research', 'Strategy'],
    programmingLanguages: ['Python', 'JavaScript', 'Go'],
    developmentTech: ['Scrapy', 'Next.js', 'Redis', 'Kafka'],
    languages: ['English', 'Mandarin'],
    locations: ['USA', 'Singapore', 'UK'],
    tags: ['Competitive Intelligence', 'Monitoring', 'Analytics', 'Web Scraping', 'Strategy', 'Alerts', 'Benchmarking'],
  },
  'clinical-trial-data-analyzer': {
    subcategories: ['Clinical Research', 'Pharma', 'Data Analysis', 'HIPAA Compliance', 'Research', 'Healthcare'],
    programmingLanguages: ['Python', 'R', 'SAS'],
    developmentTech: ['Pandas', 'SciPy', 'REDCap', 'Docker'],
    languages: ['English', 'German', 'French'],
    locations: ['USA', 'Switzerland', 'Germany'],
    tags: ['Clinical Research', 'Pharma', 'Data Analysis', 'HIPAA', 'FDA', 'Biostatistics', 'Trials'],
  },
  'survey-research-insights-platform': {
    subcategories: ['Survey Research', 'Insights', 'SaaS', 'Data Collection', 'Research', 'Analytics'],
    programmingLanguages: ['TypeScript', 'Python', 'SQL'],
    developmentTech: ['React', 'Express', 'PostgreSQL', 'Chart.js'],
    languages: ['English', 'Spanish', 'Hindi'],
    locations: ['USA', 'India', 'Mexico'],
    tags: ['Survey', 'Research', 'Insights', 'SaaS', 'Data Collection', 'Questionnaire', 'Analysis'],
  },
  'inventory-management-system': {
    subcategories: ['Retail Tech', 'Inventory Systems', 'Mobile Application', 'SaaS', 'Software Development', 'Supply Chain'],
    programmingLanguages: ['TypeScript', 'Python', 'Dart'],
    developmentTech: ['Flutter', 'NestJS', 'PostgreSQL', 'Redis'],
    languages: ['English', 'Spanish'],
    locations: ['USA', 'Mexico', 'Colombia'],
    tags: ['Inventory', 'Retail', 'Mobile', 'SaaS', 'Barcode', 'Warehouse', 'POS'],
  },
  'saas-analytics-dashboard-builder': {
    subcategories: ['SaaS', 'Embedded Analytics', 'Dashboard', 'Data Visualization', 'Software Development', 'White Label'],
    programmingLanguages: ['TypeScript', 'Python', 'Go'],
    developmentTech: ['React', 'D3.js', 'PostgreSQL', 'Kubernetes'],
    languages: ['English', 'French', 'German'],
    locations: ['USA', 'Canada', 'France'],
    tags: ['Analytics', 'Dashboard', 'SaaS', 'Embedded', 'White Label', 'Visualization', 'Self-Service'],
  },
  'fleet-management-platform': {
    subcategories: ['Fleet Management', 'Logistics', 'IoT', 'GPS Tracking', 'Software Development', 'Enterprise'],
    programmingLanguages: ['TypeScript', 'Python', 'C++'],
    developmentTech: ['React', 'FastAPI', 'TimescaleDB', 'MQTT'],
    languages: ['English', 'Spanish', 'Portuguese'],
    locations: ['USA', 'Brazil', 'Mexico'],
    tags: ['Fleet', 'Logistics', 'GPS', 'IoT', 'Tracking', 'Driver Management', 'Route Optimization'],
  },
};

const SERVICE_DETAILS = {
  'managed-cloud-infrastructure-service': {
    subcategories: ['DevOps', 'Cloud Infrastructure', 'AWS', 'Managed Services', 'Software Development', 'Automation'],
    programmingLanguages: ['Python', 'Go', 'Bash'],
    developmentTech: ['Terraform', 'Kubernetes', 'AWS', 'Ansible'],
    languages: ['English', 'Hindi'],
    locations: ['USA', 'India', 'UK'],
    tags: ['DevOps', 'Cloud', 'Managed Service', 'Infrastructure', 'AWS', 'CI/CD', 'Monitoring'],
  },
  'ux-research-user-testing-service': {
    subcategories: ['UX Research', 'User Testing', 'Design Research', 'Usability', 'Design', 'Product Design'],
    programmingLanguages: ['JavaScript', 'TypeScript'],
    developmentTech: ['Figma', 'Maze', 'Hotjar', 'UserTesting'],
    languages: ['English', 'Spanish', 'French'],
    locations: ['USA', 'UK', 'France'],
    tags: ['UX Research', 'User Testing', 'Design Research', 'Usability', 'Accessibility', 'Heuristic', 'Survey'],
  },
  'market-research-subscription-service': {
    subcategories: ['Market Research', 'Strategy', 'Reports', 'Competitive Analysis', 'Research', 'Consulting'],
    programmingLanguages: ['Python', 'R', 'SQL'],
    developmentTech: ['Tableau', 'Power BI', 'Google Analytics'],
    languages: ['English', 'Mandarin', 'Japanese'],
    locations: ['USA', 'Japan', 'Singapore'],
    tags: ['Market Research', 'Reports', 'Strategy', 'Subscription', 'Competitive Analysis', 'Industry', 'Forecast'],
  },
  'data-science-ml-consulting': {
    subcategories: ['Data Science', 'Machine Learning', 'Consulting', 'AI', 'Data & Analytics', 'Predictive Modeling'],
    programmingLanguages: ['Python', 'R', 'Julia'],
    developmentTech: ['TensorFlow', 'PyTorch', 'MLflow', 'Databricks'],
    languages: ['English', 'German'],
    locations: ['USA', 'Germany', 'Canada'],
    tags: ['Data Science', 'Machine Learning', 'Consulting', 'AI', 'Predictive', 'NLP', 'Deep Learning'],
  },
  'full-stack-development-retainer': {
    subcategories: ['Full-Stack', 'Startups', 'Web Development', 'MVP', 'Software Development', 'Agile'],
    programmingLanguages: ['TypeScript', 'Python', 'Go'],
    developmentTech: ['React', 'Next.js', 'NestJS', 'PostgreSQL'],
    languages: ['English', 'Spanish'],
    locations: ['USA', 'Argentina', 'Colombia'],
    tags: ['Development', 'Retainer', 'Full-Stack', 'Startup', 'MVP', 'Agile', 'Scaling'],
  },
  'devops-infrastructure-management': {
    subcategories: ['DevOps', 'Infrastructure', 'CI/CD', 'Cloud', 'Software Development', 'Automation'],
    programmingLanguages: ['Python', 'Go', 'Bash', 'HCL'],
    developmentTech: ['Terraform', 'Docker', 'Kubernetes', 'GitHub Actions'],
    languages: ['English', 'Portuguese'],
    locations: ['USA', 'Brazil', 'Portugal'],
    tags: ['DevOps', 'Infrastructure', 'Cloud', 'Managed Service', 'CI/CD', 'Containers', 'Monitoring'],
  },
  'qa-test-automation-service': {
    subcategories: ['Quality Assurance', 'Test Automation', 'CI/CD', 'Performance Testing', 'Software Development', 'Security Testing'],
    programmingLanguages: ['TypeScript', 'Python', 'Java'],
    developmentTech: ['Cypress', 'Playwright', 'Jest', 'Selenium'],
    languages: ['English', 'Ukrainian', 'Polish'],
    locations: ['USA', 'Ukraine', 'Poland'],
    tags: ['QA', 'Testing', 'Automation', 'Quality', 'Regression', 'Performance', 'Security'],
  },
};

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  // Add columns if they don't exist
  const newCols = ['subcategories', '"programmingLanguages"', '"developmentTech"', 'languages', 'locations'];
  for (const table of ['projects', 'services']) {
    for (const col of newCols) {
      const colName = col.replace(/"/g, '');
      await client.query(`
        ALTER TABLE ${SCHEMA}.${table}
        ADD COLUMN IF NOT EXISTS "${colName}" TEXT[] DEFAULT '{}'
      `);
    }
    console.log(`  Added new columns to ${table}`);
  }

  // Update projects
  console.log('\n=== Updating Projects ===');
  for (const [slug, data] of Object.entries(PROJECT_DETAILS)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.projects SET
        subcategories = $1,
        "programmingLanguages" = $2,
        "developmentTech" = $3,
        languages = $4,
        locations = $5,
        tags = $6
      WHERE slug = $7 RETURNING title`,
      [data.subcategories, data.programmingLanguages, data.developmentTech, data.languages, data.locations, data.tags, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title}`);
    } else {
      console.log(`  ⚠️  No project for slug: ${slug}`);
    }
  }

  // Update services
  console.log('\n=== Updating Services ===');
  for (const [slug, data] of Object.entries(SERVICE_DETAILS)) {
    const result = await client.query(
      `UPDATE ${SCHEMA}.services SET
        subcategories = $1,
        "programmingLanguages" = $2,
        "developmentTech" = $3,
        languages = $4,
        locations = $5,
        tags = $6
      WHERE slug = $7 RETURNING title`,
      [data.subcategories, data.programmingLanguages, data.developmentTech, data.languages, data.locations, data.tags, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title}`);
    } else {
      console.log(`  ⚠️  No service for slug: ${slug}`);
    }
  }

  console.log('\n✅ All project details populated!');
  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

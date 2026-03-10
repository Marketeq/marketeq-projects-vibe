const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:KrRZvLQbtItvyKMw9m3TJ2pLAjuJuAf3cKHQykgaEMw@127.0.0.1:5433/postgres';

const firstNames = [
  'Alex','Jordan','Taylor','Morgan','Casey','Riley','Quinn','Avery','Cameron','Dakota',
  'Skyler','Jamie','Reese','Finley','Rowan','Sage','Emery','Hayden','Parker','Drew',
  'Kai','Noel','Aria','Luna','Maya','Zara','Lena','Nia','Ivy','Jade',
  'Leo','Max','Eli','Noah','Liam','Ethan','Owen','Cole','Ryan','Sean',
  'Priya','Aisha','Yuki','Mei','Sofia','Elena','Clara','Mila','Vera','Nina',
  'Marcus','Andre','Jamal','Dante','Malik','Tyrone','Darius','Xavier','Isaiah','Elijah',
  'Hiroshi','Kenji','Ravi','Arjun','Vikram','Sanjay','Amit','Raj','Dev','Nikhil',
  'Fatima','Layla','Amira','Sara','Nadia','Leila','Hana','Rania','Dina','Yasmin',
  'Carlos','Diego','Rafael','Miguel','Pablo','Andres','Felipe','Mateo','Santiago','Lucas',
  'Anna','Maria','Eva','Olga','Natalia','Katya','Ines','Camille','Lotte','Freya',
];

const lastNames = [
  'Chen','Patel','Kim','Nguyen','Garcia','Rodriguez','Martinez','Lopez','Hernandez','Wilson',
  'Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Taylor','Lee',
  'Walker','Hall','Allen','Young','King','Wright','Scott','Green','Baker','Adams',
  'Nelson','Carter','Mitchell','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards',
  'Collins','Stewart','Morris','Murphy','Rivera','Cook','Rogers','Morgan','Peterson','Cooper',
  'Reed','Bailey','Bell','Gomez','Kelly','Howard','Ward','Cox','Diaz','Richardson',
  'Wood','Watson','Brooks','Bennett','Gray','James','Reyes','Cruz','Hughes','Price',
  'Myers','Long','Foster','Sanders','Ross','Morales','Powell','Sullivan','Russell','Ortiz',
  'Jenkins','Perry','Butler','Barnes','Fisher','Henderson','Coleman','Simmons','Patterson','Jordan',
  'Reynolds','Hamilton','Graham','Wallace','West','Cole','Hayes','Gibson','Ellis','Murray',
];

const cities = [
  'San Francisco, CA','New York, NY','Austin, TX','Seattle, WA','Los Angeles, CA',
  'Chicago, IL','Boston, MA','Denver, CO','Portland, OR','Miami, FL',
  'Atlanta, GA','Nashville, TN','Minneapolis, MN','Detroit, MI','Philadelphia, PA',
  'San Diego, CA','Dallas, TX','Houston, TX','Phoenix, AZ','Salt Lake City, UT',
  'Raleigh, NC','Charlotte, NC','Pittsburgh, PA','Columbus, OH','Indianapolis, IN',
  'London, UK','Berlin, Germany','Toronto, Canada','Sydney, Australia','Amsterdam, Netherlands',
  'Dublin, Ireland','Stockholm, Sweden','Singapore','Tokyo, Japan','Bangalore, India',
  'São Paulo, Brazil','Mexico City, Mexico','Buenos Aires, Argentina','Lagos, Nigeria','Nairobi, Kenya',
];

const timezones = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix',
  'Europe/London','Europe/Berlin','Europe/Amsterdam','Asia/Tokyo','Asia/Singapore',
  'Asia/Kolkata','Australia/Sydney','America/Toronto','America/Sao_Paulo','Africa/Lagos',
];

const availabilities = ['full-time','part-time','contract','freelance'];

const roles = [
  'Full-Stack Developer','Frontend Developer','Backend Developer','Mobile Developer',
  'DevOps Engineer','Data Scientist','Machine Learning Engineer','UI/UX Designer',
  'Product Designer','Graphic Designer','Motion Designer','Brand Designer',
  'Product Manager','Project Manager','Scrum Master','Business Analyst',
  'QA Engineer','Security Engineer','Cloud Architect','Solutions Architect',
  'Data Engineer','Blockchain Developer','Game Developer','iOS Developer',
  'Android Developer','React Developer','Node.js Developer','Python Developer',
  'Go Developer','Rust Developer','Technical Writer','Content Strategist',
  'SEO Specialist','Growth Marketer','Digital Marketer','Social Media Manager',
  'Video Editor','3D Artist','Illustrator','Copywriter',
];

const skillSets = {
  'Full-Stack Developer': ['React','Node.js','TypeScript','PostgreSQL','Docker','AWS','GraphQL','Redis'],
  'Frontend Developer': ['React','Vue.js','TypeScript','CSS','Tailwind CSS','Next.js','Figma','Jest'],
  'Backend Developer': ['Node.js','Python','PostgreSQL','MongoDB','Redis','Docker','Kubernetes','gRPC'],
  'Mobile Developer': ['React Native','Flutter','Swift','Kotlin','Firebase','REST APIs','GraphQL','CI/CD'],
  'DevOps Engineer': ['Docker','Kubernetes','Terraform','AWS','CI/CD','Linux','Ansible','Prometheus'],
  'Data Scientist': ['Python','R','TensorFlow','PyTorch','SQL','Pandas','Scikit-learn','Jupyter'],
  'Machine Learning Engineer': ['Python','TensorFlow','PyTorch','MLOps','Docker','AWS SageMaker','Spark','SQL'],
  'UI/UX Designer': ['Figma','Sketch','Adobe XD','Prototyping','User Research','Wireframing','Design Systems','Usability Testing'],
  'Product Designer': ['Figma','Design Systems','Prototyping','User Research','Interaction Design','Visual Design','Sketch','InVision'],
  'Graphic Designer': ['Photoshop','Illustrator','InDesign','Figma','Branding','Typography','Color Theory','Print Design'],
  'Motion Designer': ['After Effects','Cinema 4D','Premiere Pro','Lottie','Animation','Storyboarding','Blender','Motion Graphics'],
  'Brand Designer': ['Illustrator','Photoshop','Brand Strategy','Typography','Color Theory','Packaging Design','Figma','InDesign'],
  'Product Manager': ['Jira','Roadmapping','A/B Testing','Analytics','SQL','Figma','Agile','User Stories'],
  'Project Manager': ['Jira','Asana','Agile','Scrum','Risk Management','Stakeholder Management','Gantt Charts','Budgeting'],
  'Scrum Master': ['Scrum','Kanban','Jira','Facilitation','Coaching','Agile','SAFe','Retrospectives'],
  'Business Analyst': ['SQL','Excel','Tableau','Requirements Gathering','Process Mapping','BPMN','Jira','Power BI'],
  'QA Engineer': ['Selenium','Cypress','Jest','Postman','SQL','Performance Testing','API Testing','Test Planning'],
  'Security Engineer': ['Penetration Testing','OWASP','AWS Security','Network Security','SIEM','Vulnerability Assessment','Python','Compliance'],
  'Cloud Architect': ['AWS','Azure','GCP','Terraform','Kubernetes','Networking','Security','Cost Optimization'],
  'Solutions Architect': ['AWS','System Design','Microservices','API Design','Cloud Migration','Docker','Kubernetes','Enterprise Architecture'],
  'Data Engineer': ['Python','SQL','Spark','Airflow','Kafka','Snowflake','dbt','AWS Redshift'],
  'Blockchain Developer': ['Solidity','Ethereum','Web3.js','Smart Contracts','DeFi','NFTs','Hardhat','Rust'],
  'Game Developer': ['Unity','C#','Unreal Engine','C++','3D Modeling','Game Design','Shader Programming','Multiplayer'],
  'iOS Developer': ['Swift','SwiftUI','UIKit','Core Data','Combine','Xcode','TestFlight','App Store'],
  'Android Developer': ['Kotlin','Jetpack Compose','Android SDK','Room','Retrofit','MVVM','Firebase','Play Store'],
  'React Developer': ['React','TypeScript','Next.js','Redux','Tailwind CSS','GraphQL','Jest','Storybook'],
  'Node.js Developer': ['Node.js','Express','TypeScript','PostgreSQL','MongoDB','Redis','Docker','Jest'],
  'Python Developer': ['Python','Django','FastAPI','PostgreSQL','Celery','Docker','pytest','REST APIs'],
  'Go Developer': ['Go','gRPC','PostgreSQL','Docker','Kubernetes','Microservices','Redis','Prometheus'],
  'Rust Developer': ['Rust','WebAssembly','Systems Programming','Tokio','PostgreSQL','Docker','Linux','Performance Optimization'],
  'Technical Writer': ['Documentation','API Docs','Markdown','Git','Swagger','Content Strategy','Editing','Style Guides'],
  'Content Strategist': ['Content Planning','SEO','Analytics','CMS','Copywriting','Brand Voice','Social Media','Content Audit'],
  'SEO Specialist': ['Google Analytics','SEMrush','Ahrefs','Technical SEO','Content SEO','Link Building','Keyword Research','Schema Markup'],
  'Growth Marketer': ['Google Ads','Facebook Ads','Analytics','A/B Testing','Email Marketing','Funnel Optimization','SQL','HubSpot'],
  'Digital Marketer': ['Google Ads','Social Media','Email Marketing','Analytics','SEO','Content Marketing','HubSpot','Mailchimp'],
  'Social Media Manager': ['Instagram','TikTok','LinkedIn','Content Creation','Analytics','Community Management','Canva','Scheduling Tools'],
  'Video Editor': ['Premiere Pro','After Effects','DaVinci Resolve','Final Cut Pro','Color Grading','Sound Design','Motion Graphics','Storytelling'],
  '3D Artist': ['Blender','Maya','ZBrush','Substance Painter','3ds Max','Rendering','Texturing','Modeling'],
  'Illustrator': ['Procreate','Illustrator','Photoshop','Digital Illustration','Character Design','Concept Art','Branding','Editorial Illustration'],
  'Copywriter': ['Copywriting','Brand Voice','SEO Writing','Email Copy','Ad Copy','Content Strategy','Editing','Storytelling'],
};

const industries = [
  'Technology','Healthcare','Finance','Education','E-commerce','Marketing','Media','Entertainment',
  'Real Estate','Logistics','Manufacturing','Automotive','Energy','Telecommunications','Retail',
  'Travel','Food & Beverage','Sports','Fashion','Gaming','Cybersecurity','AI/ML','SaaS',
  'Fintech','Healthtech','Edtech','Proptech','Insurtech','Biotech','Cleantech',
];

const universities = [
  'MIT','Stanford University','UC Berkeley','Carnegie Mellon','Georgia Tech',
  'University of Michigan','UCLA','University of Washington','UT Austin','Caltech',
  'Harvard University','Yale University','Princeton University','Columbia University','Cornell University',
  'University of Toronto','University of Oxford','ETH Zurich','Imperial College London','NUS Singapore',
  'IIT Bombay','University of São Paulo','UNAM','University of Cape Town','University of Tokyo',
  'NYU','USC','University of Illinois','Purdue University','University of Wisconsin',
  'Duke University','Northwestern University','Brown University','Dartmouth College','Rice University',
  'University of Pennsylvania','Johns Hopkins University','University of Virginia','University of Maryland','Arizona State University',
];

const degrees = ['B.S.','B.A.','M.S.','M.A.','MBA','Ph.D.','B.Eng.','M.Eng.'];
const fields = [
  'Computer Science','Software Engineering','Data Science','Information Technology',
  'Electrical Engineering','Mathematics','Statistics','Physics',
  'Graphic Design','Visual Arts','Industrial Design','UX Design',
  'Business Administration','Marketing','Economics','Finance',
  'Communications','English','Psychology','Cognitive Science',
];

const companies = [
  'Google','Meta','Amazon','Apple','Microsoft','Netflix','Spotify','Stripe',
  'Shopify','Airbnb','Uber','Lyft','Twitter','Slack','Figma','Notion',
  'Datadog','Snowflake','Cloudflare','Vercel','MongoDB','Elastic','HashiCorp','Confluent',
  'Accenture','Deloitte','McKinsey','BCG','PwC','EY','KPMG','IBM',
  'Salesforce','Adobe','Oracle','SAP','VMware','Cisco','Intel','NVIDIA',
  'JPMorgan Chase','Goldman Sachs','Morgan Stanley','Citadel','Two Sigma','Jane Street','Bridgewater','BlackRock',
  'Freelance','Self-Employed','Startup (stealth)','Independent Contractor',
];

const languages = [
  { name: 'English', weight: 90 },
  { name: 'Spanish', weight: 30 },
  { name: 'French', weight: 15 },
  { name: 'German', weight: 12 },
  { name: 'Portuguese', weight: 10 },
  { name: 'Mandarin', weight: 15 },
  { name: 'Japanese', weight: 8 },
  { name: 'Korean', weight: 6 },
  { name: 'Hindi', weight: 12 },
  { name: 'Arabic', weight: 8 },
  { name: 'Russian', weight: 6 },
  { name: 'Italian', weight: 5 },
  { name: 'Dutch', weight: 4 },
  { name: 'Swedish', weight: 3 },
  { name: 'Turkish', weight: 4 },
];

const proficiencies = ['native','fluent','advanced','intermediate','beginner'];
const skillProficiencies = ['expert','advanced','intermediate','beginner'];

const certifications = [
  { name: 'AWS Certified Solutions Architect', org: 'Amazon Web Services' },
  { name: 'AWS Certified Developer', org: 'Amazon Web Services' },
  { name: 'Google Cloud Professional Cloud Architect', org: 'Google Cloud' },
  { name: 'Azure Solutions Architect Expert', org: 'Microsoft' },
  { name: 'Certified Kubernetes Administrator', org: 'CNCF' },
  { name: 'PMP', org: 'Project Management Institute' },
  { name: 'Certified Scrum Master', org: 'Scrum Alliance' },
  { name: 'Google Analytics Certified', org: 'Google' },
  { name: 'HubSpot Inbound Marketing', org: 'HubSpot' },
  { name: 'Meta Certified Digital Marketing Associate', org: 'Meta' },
  { name: 'Terraform Associate', org: 'HashiCorp' },
  { name: 'CompTIA Security+', org: 'CompTIA' },
  { name: 'Certified Ethical Hacker', org: 'EC-Council' },
  { name: 'Google UX Design Certificate', org: 'Google' },
  { name: 'Adobe Certified Expert', org: 'Adobe' },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randomDate(startYear, endYear) {
  const y = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const m = 1 + Math.floor(Math.random() * 12);
  return `${y}-${String(m).padStart(2,'0')}`;
}
function randomRate() {
  const bases = [25,35,45,50,65,75,85,100,125,150,175,200];
  const base = pick(bases);
  return { min: base, max: base + 15 + Math.floor(Math.random() * 40) };
}

// R2 public URL for profile images
const R2_PUBLIC_URL = process.env.CLOUDFLARE_PUBLIC_URL || 'https://pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev';

function generateUser(i) {
  const fn = firstNames[i];
  const ln = lastNames[i];
  const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
  const username = `${fn.toLowerCase()}${ln.toLowerCase()}${Math.floor(Math.random()*99)}`;
  const role = pick(roles);
  const rate = randomRate();
  const city = pick(cities);
  const tz = pick(timezones);
  const avail = pick(availabilities);
  const userIndustries = pickN(industries, 1, 3);
  const onboardingStatus = Math.random() > 0.1 ? 'completed' : 'pending';
  const onboardedAt = onboardingStatus === 'completed'
    ? new Date(2024, Math.floor(Math.random()*12), 1+Math.floor(Math.random()*28)).toISOString()
    : null;

  const bios = [
    `${role} with ${3+Math.floor(Math.random()*12)} years of experience in ${userIndustries[0]}.`,
    `Passionate ${role} specializing in ${userIndustries.join(' and ')}.`,
    `Experienced ${role} helping companies build great products.`,
    `Creative ${role} focused on delivering impactful solutions.`,
    `Results-driven ${role} with a track record of successful projects.`,
  ];

  const overviews = [
    `I'm a ${role} based in ${city}. I specialize in ${userIndustries.join(', ')} and love tackling challenging problems. Available for ${avail} engagements.`,
    `With over ${3+Math.floor(Math.random()*10)} years in the industry, I bring deep expertise in ${userIndustries.join(' and ')}. I'm passionate about clean code, great design, and shipping products that users love.`,
    `${role} with hands-on experience across ${userIndustries.join(', ')}. I enjoy collaborating with cross-functional teams to deliver high-quality work on time and within budget.`,
  ];

  return {
    email, username, fn, ln, role, city, tz, avail, rate,
    userType: 'talent',
    bio: pick(bios),
    overview: pick(overviews),
    onboardingStatus, onboardedAt,
    industries: userIndustries,
    skills: pickN(skillSets[role] || ['JavaScript','Python','SQL','Docker'], 3, 6),
    education: Math.random() > 0.15, // 85% have education
    experience: Math.random() > 0.05, // 95% have experience
  };
}

async function fetchAvatarKeys() {
  try {
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '020b9b97a526421028214dacadd810f3',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || 'a6de0a9c8438a1fcd3f4991ded970c4f9cf46068578f5e3319a056794d9a346d',
      },
    });
    let keys = [];
    let token;
    do {
      const res = await s3.send(new ListObjectsV2Command({
        Bucket: 'marketeq-profile-images',
        MaxKeys: 1000,
        ContinuationToken: token,
      }));
      keys = keys.concat((res.Contents || []).map(o => o.Key));
      token = res.NextContinuationToken;
    } while (token);
    console.log(`Found ${keys.length} avatar images in R2`);
    return keys;
  } catch (e) {
    console.log('Could not fetch R2 avatars:', e.message);
    return [];
  }
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // Fetch existing avatar images from R2
  const avatarKeys = await fetchAvatarKeys();

  // Clear existing seed data
  await client.query('DELETE FROM user_service.user_industries');
  await client.query('DELETE FROM user_service.certifications');
  await client.query('DELETE FROM user_service.languages');
  await client.query('DELETE FROM user_service.skills');
  await client.query('DELETE FROM user_service.experience');
  await client.query('DELETE FROM user_service.education');
  await client.query('DELETE FROM user_service.users');
  console.log('Cleared existing data');

  for (let i = 0; i < 100; i++) {
    const u = generateUser(i);
    // Assign an R2 avatar URL (cycle through available images)
    const avatarUrl = avatarKeys.length > 0
      ? R2_PUBLIC_URL + '/' + avatarKeys[i % avatarKeys.length]
      : null;

    // Insert user
    const res = await client.query(`
      INSERT INTO user_service.users
        (email, username, "firstName", "lastName", "userType", bio, overview, role, location, timezone,
         availability, "rateMin", "rateMax", "onboardingStatus", "onboardingDismissed", "isActive", "onboardedAt", "avatarUrl")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id
    `, [
      u.email, u.username, u.fn, u.ln, u.userType, u.bio, u.overview, u.role,
      u.city, u.tz, u.avail, u.rate.min, u.rate.max,
      u.onboardingStatus, u.onboardingStatus === 'completed', true, u.onboardedAt, avatarUrl,
    ]);
    const userId = res.rows[0].id;

    // Skills (3-6 per user)
    for (const skill of u.skills) {
      await client.query(
        'INSERT INTO user_service.skills ("userId", name, proficiency) VALUES ($1, $2, $3)',
        [userId, skill, pick(skillProficiencies)]
      );
    }

    // Industries (1-3 per user)
    for (const ind of u.industries) {
      await client.query(
        'INSERT INTO user_service.user_industries ("userId", name) VALUES ($1, $2)',
        [userId, ind]
      );
    }

    // Languages (1-3 per user)
    const userLangs = [];
    // Almost everyone speaks English
    if (Math.random() < 0.92) userLangs.push({ name: 'English', prof: Math.random() > 0.3 ? 'native' : 'fluent' });
    // Add 0-2 more
    const extraLangs = pickN(languages.filter(l => l.name !== 'English'), 0, 2);
    for (const l of extraLangs) {
      userLangs.push({ name: l.name, prof: pick(proficiencies.slice(1)) }); // not native for extra langs usually
    }
    if (userLangs.length === 0) userLangs.push({ name: 'English', prof: 'native' });
    for (const l of userLangs) {
      await client.query(
        'INSERT INTO user_service.languages ("userId", name, proficiency) VALUES ($1, $2, $3)',
        [userId, l.name, l.prof]
      );
    }

    // Education (85% have 1-2 entries)
    if (u.education) {
      const numEdu = Math.random() > 0.6 ? 2 : 1;
      for (let e = 0; e < numEdu; e++) {
        const startYear = 2005 + Math.floor(Math.random() * 12);
        const endYear = startYear + (pick(degrees).startsWith('B') ? 4 : 2);
        await client.query(
          `INSERT INTO user_service.education ("userId", institution, degree, field, "startDate", "endDate")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, pick(universities), pick(degrees), pick(fields), `${startYear}-09`, `${endYear}-05`]
        );
      }
    }

    // Experience (95% have 1-3 entries)
    if (u.experience) {
      const numExp = 1 + Math.floor(Math.random() * 3);
      let year = 2024;
      for (let e = 0; e < numExp; e++) {
        const duration = 1 + Math.floor(Math.random() * 4);
        const startYear = year - duration;
        const endDate = e === 0 ? null : `${year}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}`;
        const descriptions = [
          `Led development of key features and mentored junior team members.`,
          `Built and maintained scalable applications serving millions of users.`,
          `Collaborated with cross-functional teams to deliver projects on time.`,
          `Designed and implemented core platform components.`,
          `Drove technical initiatives resulting in significant performance improvements.`,
          `Managed end-to-end project lifecycle from requirements to deployment.`,
        ];
        await client.query(
          `INSERT INTO user_service.experience ("userId", company, role, "startDate", "endDate", description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, pick(companies), u.role, `${startYear}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}`, endDate, pick(descriptions)]
        );
        year = startYear;
      }
    }

    // Certifications (40% have 1-2)
    if (Math.random() < 0.4) {
      const numCerts = Math.random() > 0.6 ? 2 : 1;
      const userCerts = pickN(certifications, numCerts, numCerts);
      for (const cert of userCerts) {
        const issueYear = 2020 + Math.floor(Math.random() * 5);
        const expiryYear = issueYear + 3;
        await client.query(
          `INSERT INTO user_service.certifications ("userId", name, "issuingOrganization", "issueDate", "expiryDate")
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, cert.name, cert.org, `${issueYear}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}`, `${expiryYear}-${String(1+Math.floor(Math.random()*12)).padStart(2,'0')}`]
        );
      }
    }

    if ((i + 1) % 10 === 0) console.log(`Seeded ${i + 1}/100 users`);
  }

  // Final counts
  const counts = {};
  for (const table of ['users','education','experience','skills','languages','certifications','user_industries']) {
    const r = await client.query(`SELECT count(*) FROM user_service.${table}`);
    counts[table] = parseInt(r.rows[0].count);
  }
  console.log('\nFinal counts:', counts);

  await client.end();
  console.log('Done!');
}

seed().catch(e => { console.error(e); process.exit(1); });

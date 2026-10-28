/**
 * Additive seed script — adds 24 sample talent users + favorite groups
 * Does NOT delete any existing data.
 *
 * Usage: node seed-sample-favorites.js
 */
const { Client } = require('pg');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}

// Must match frontend/src/lib/data/sample-talents.ts
const talents = [
  { username: "amarachen", firstName: "Amara", lastName: "Chen", email: "amara.chen@example.com", role: "Visual Designer", location: "Toronto, Canada", timezone: "America/Toronto", rateMin: 75, rateMax: 110, skills: ["Figma", "Sketch", "Adobe XD", "Illustration", "Branding"] },
  { username: "mwebb_design", firstName: "Marcus", lastName: "Webb", email: "marcus.webb@example.com", role: "UX Researcher", location: "New York, NY", timezone: "America/New_York", rateMin: 90, rateMax: 130, skills: ["User Interviews", "A/B Testing", "Usability Testing", "Surveys", "Heuristic Evaluation"] },
  { username: "sofiareyes.ux", firstName: "Sofia", lastName: "Reyes", email: "sofia.reyes@example.com", role: "UX Designer", location: "Madrid, Spain", timezone: "Europe/Madrid", rateMin: 80, rateMax: 120, skills: ["Wireframing", "Prototyping", "Figma", "User Flows", "Design Systems"] },
  { username: "dan.okoro", firstName: "Daniel", lastName: "Okoro", email: "daniel.okoro@example.com", role: "Frontend Developer", location: "Lagos, Nigeria", timezone: "Africa/Lagos", rateMin: 95, rateMax: 140, skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"] },
  { username: "lena.codes", firstName: "Lena", lastName: "Müller", email: "lena.muller@example.com", role: "Frontend Developer", location: "Berlin, Germany", timezone: "Europe/Berlin", rateMin: 85, rateMax: 125, skills: ["Vue.js", "TypeScript", "CSS Animation", "Accessibility", "Storybook"] },
  { username: "rajpatel.dev", firstName: "Raj", lastName: "Patel", email: "raj.patel@example.com", role: "Backend Developer", location: "Bangalore, India", timezone: "Asia/Kolkata", rateMin: 100, rateMax: 150, skills: ["Node.js", "PostgreSQL", "AWS", "Docker", "NestJS"] },
  { username: "yuki.backend", firstName: "Yuki", lastName: "Tanaka", email: "yuki.tanaka@example.com", role: "Backend Developer", location: "Tokyo, Japan", timezone: "Asia/Tokyo", rateMin: 110, rateMax: 160, skills: ["Go", "Kubernetes", "Redis", "gRPC", "Terraform"] },
  { username: "olivia.pm", firstName: "Olivia", lastName: "Brooks", email: "olivia.brooks@example.com", role: "Product Manager", location: "London, UK", timezone: "Europe/London", rateMin: 120, rateMax: 170, skills: ["Roadmapping", "Agile", "Jira", "User Stories", "Stakeholder Management"] },
  { username: "jamesokafor", firstName: "James", lastName: "Okafor", email: "james.okafor@example.com", role: "Product Manager", location: "Accra, Ghana", timezone: "Africa/Accra", rateMin: 100, rateMax: 145, skills: ["Scrum", "Product Strategy", "Analytics", "A/B Testing", "PRDs"] },
  { username: "priya.data", firstName: "Priya", lastName: "Sharma", email: "priya.sharma@example.com", role: "Data Analyst", location: "Bangalore, India", timezone: "Asia/Kolkata", rateMin: 70, rateMax: 100, skills: ["SQL", "Python", "Tableau", "Power BI", "Statistics"] },
  { username: "erik.analytics", firstName: "Erik", lastName: "Svensson", email: "erik.svensson@example.com", role: "Data Analyst", location: "Stockholm, Sweden", timezone: "Europe/Stockholm", rateMin: 85, rateMax: 120, skills: ["R", "Machine Learning", "BigQuery", "Looker", "Data Modeling"] },
  { username: "ninacosta.words", firstName: "Nina", lastName: "Costa", email: "nina.costa@example.com", role: "Copywriter", location: "São Paulo, Brazil", timezone: "America/Sao_Paulo", rateMin: 60, rateMax: 90, skills: ["SEO Writing", "Brand Voice", "Email Copy", "Landing Pages", "Blog Content"] },
  { username: "tomwrites", firstName: "Tom", lastName: "Henderson", email: "tom.henderson@example.com", role: "Copywriter", location: "Sydney, Australia", timezone: "Australia/Sydney", rateMin: 70, rateMax: 110, skills: ["Technical Writing", "UX Writing", "Content Strategy", "Storytelling", "Ad Copy"] },
  { username: "chloe.design", firstName: "Chloe", lastName: "Nguyen", email: "chloe.nguyen@example.com", role: "Visual Designer", location: "Ho Chi Minh City, Vietnam", timezone: "Asia/Ho_Chi_Minh", rateMin: 80, rateMax: 115, skills: ["Photoshop", "Illustrator", "Typography", "Color Theory", "Motion Graphics"] },
  { username: "alexpetrov", firstName: "Alex", lastName: "Petrov", email: "alex.petrov@example.com", role: "Visual Designer", location: "Moscow, Russia", timezone: "Europe/Moscow", rateMin: 90, rateMax: 135, skills: ["UI Design", "Figma", "3D Design", "Branding", "Design Systems"] },
  { username: "bella.ux", firstName: "Isabella", lastName: "Rossi", email: "isabella.rossi@example.com", role: "UX Researcher", location: "Rome, Italy", timezone: "Europe/Rome", rateMin: 85, rateMax: 125, skills: ["Ethnography", "Card Sorting", "Persona Development", "Journey Mapping", "Accessibility Audits"] },
  { username: "kevinpark.fe", firstName: "Kevin", lastName: "Park", email: "kevin.park@example.com", role: "Frontend Developer", location: "Seoul, South Korea", timezone: "Asia/Seoul", rateMin: 100, rateMax: 150, skills: ["React", "Next.js", "Three.js", "WebGL", "Performance Optimization"] },
  { username: "mayaj.be", firstName: "Maya", lastName: "Johnson", email: "maya.johnson@example.com", role: "Backend Developer", location: "Austin, TX", timezone: "America/Chicago", rateMin: 95, rateMax: 140, skills: ["Python", "Django", "PostgreSQL", "Celery", "REST APIs"] },
  { username: "lucasf.pm", firstName: "Lucas", lastName: "Fernandez", email: "lucas.fernandez@example.com", role: "Product Manager", location: "Buenos Aires, Argentina", timezone: "America/Argentina/Buenos_Aires", rateMin: 110, rateMax: 155, skills: ["OKRs", "Growth Strategy", "Data-Driven PM", "Figma", "SQL"] },
  { username: "aisha.data", firstName: "Aisha", lastName: "Mohammed", email: "aisha.mohammed@example.com", role: "Data Analyst", location: "Nairobi, Kenya", timezone: "Africa/Nairobi", rateMin: 75, rateMax: 105, skills: ["Excel", "SQL", "Python", "Data Visualization", "Pandas"] },
  { username: "hannah.copy", firstName: "Hannah", lastName: "Fischer", email: "hannah.fischer@example.com", role: "Copywriter", location: "Munich, Germany", timezone: "Europe/Berlin", rateMin: 65, rateMax: 95, skills: ["Microcopy", "Localization", "Social Media", "Newsletter", "Tone of Voice"] },
  { username: "chriswilliams", firstName: "Chris", lastName: "Williams", email: "chris.williams@example.com", role: "Frontend Developer", location: "San Francisco, CA", timezone: "America/Los_Angeles", rateMin: 90, rateMax: 130, skills: ["Angular", "RxJS", "TypeScript", "SCSS", "Testing"] },
  { username: "fatima.uxr", firstName: "Fatima", lastName: "Al-Rashid", email: "fatima.alrashid@example.com", role: "UX Researcher", location: "Dubai, UAE", timezone: "Asia/Dubai", rateMin: 80, rateMax: 120, skills: ["Contextual Inquiry", "Diary Studies", "Tree Testing", "Competitor Analysis", "Survey Design"] },
  { username: "andresilva.be", firstName: "Andre", lastName: "Silva", email: "andre.silva@example.com", role: "Backend Developer", location: "Lisbon, Portugal", timezone: "Europe/Lisbon", rateMin: 105, rateMax: 155, skills: ["Java", "Spring Boot", "Kafka", "MongoDB", "Microservices"] },
];

// Favorite groups — must match frontend sample data
const groups = [
  { name: "Visual Designers", usernames: ["amarachen", "chloe.design", "alexpetrov"], createdAt: "2025-11-10" },
  { name: "UX Researchers", usernames: ["mwebb_design", "bella.ux", "fatima.uxr", "sofiareyes.ux"], createdAt: "2025-12-05" },
  { name: "Frontend Developers", usernames: ["dan.okoro", "lena.codes", "kevinpark.fe", "chriswilliams"], createdAt: "2026-01-14" },
  { name: "Backend Developers", usernames: ["rajpatel.dev", "yuki.backend", "mayaj.be", "andresilva.be"], createdAt: "2026-01-28" },
  { name: "Product Managers", usernames: ["olivia.pm", "jamesokafor", "lucasf.pm"], createdAt: "2026-02-11" },
  { name: "Data Analysts", usernames: ["priya.data", "erik.analytics", "aisha.data"], createdAt: "2026-02-25" },
  { name: "Copywriters", usernames: ["ninacosta.words", "tomwrites", "hannah.copy"], createdAt: "2026-03-08" },
];

const R2_PUBLIC_URL = process.env.CLOUDFLARE_PUBLIC_URL || 'https://pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // Ensure favorites schema exists
  await client.query('CREATE SCHEMA IF NOT EXISTS favorites');

  // Get the logged-in user's ID (to own the favorite groups)
  const ownerRes = await client.query(
    `SELECT id FROM user_service.users WHERE "userType" = 'talent' ORDER BY "createdAt" DESC LIMIT 1`
  );
  if (ownerRes.rows.length === 0) {
    console.error('No existing talent user found to own the favorite groups. Please log in first.');
    await client.end();
    process.exit(1);
  }
  const ownerId = ownerRes.rows[0].id;
  console.log(`Favorite groups will be owned by user: ${ownerId}`);

  // Fetch R2 avatar keys if available
  let avatarKeys = [];
  try {
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
      },
    });
    let token;
    do {
      const res = await s3.send(new ListObjectsV2Command({ Bucket: 'marketeq-profile-images', MaxKeys: 1000, ContinuationToken: token }));
      avatarKeys = avatarKeys.concat((res.Contents || []).map(o => o.Key));
      token = res.NextContinuationToken;
    } while (token);
    console.log(`Found ${avatarKeys.length} avatar images in R2`);
  } catch (e) {
    console.log('Could not fetch R2 avatars (will use null):', e.message);
  }

  // Track username → userId mapping
  const userIdMap = {};

  // Insert users (skip if username already exists)
  for (let i = 0; i < talents.length; i++) {
    const t = talents[i];

    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM user_service.users WHERE username = $1',
      [t.username]
    );
    if (existing.rows.length > 0) {
      console.log(`  [skip] ${t.username} already exists`);
      userIdMap[t.username] = existing.rows[0].id;
      continue;
    }

    const avatarUrl = avatarKeys.length > 0
      ? R2_PUBLIC_URL + '/' + avatarKeys[i % avatarKeys.length]
      : null;

    const bio = `${t.role} with expertise in ${t.skills.slice(0, 3).join(', ')}. Based in ${t.location}.`;
    const overview = `Experienced ${t.role} specializing in ${t.skills.join(', ')}. Available for freelance and contract work.`;

    const res = await client.query(`
      INSERT INTO user_service.users
        (email, username, "firstName", "lastName", "userType", bio, overview, role, location, timezone,
         availability, "rateMin", "rateMax", "onboardingStatus", "onboardingDismissed", "isActive",
         "onboardedAt", "avatarUrl")
      VALUES ($1,$2,$3,$4,'talent',$5,$6,$7,$8,$9,'freelance',$10,$11,'completed',true,true,$12,$13)
      RETURNING id
    `, [
      t.email, t.username, t.firstName, t.lastName,
      bio, overview, t.role, t.location, t.timezone,
      t.rateMin, t.rateMax,
      new Date('2025-09-01').toISOString(),
      avatarUrl,
    ]);
    const userId = res.rows[0].id;
    userIdMap[t.username] = userId;
    console.log(`  [added] ${t.username} (${t.firstName} ${t.lastName}) → ${userId}`);

    // Insert skills
    for (const skill of t.skills) {
      await client.query(
        'INSERT INTO user_service.skills ("userId", name, proficiency) VALUES ($1, $2, $3)',
        [userId, skill, 'advanced']
      );
    }

    // Insert language (English)
    await client.query(
      'INSERT INTO user_service.languages ("userId", name, proficiency) VALUES ($1, $2, $3)',
      [userId, 'English', 'fluent']
    );
  }

  console.log(`\nInserted/verified ${talents.length} talent users`);

  // Create favorite groups + favorites
  // First check if favorites tables exist in the right schema
  const tableCheck = await client.query(`
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_name IN ('favorite_groups', 'favorites')
    ORDER BY table_schema, table_name
  `);
  console.log('\nFavorites tables found:', tableCheck.rows.map(r => `${r.table_schema}.${r.table_name}`).join(', ') || 'NONE');

  if (tableCheck.rows.length === 0) {
    console.log('Creating favorites tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites.favorite_groups (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        "userId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites.favorites (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "userId" UUID NOT NULL,
        "groupId" UUID REFERENCES favorites.favorite_groups(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        "itemId" VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created favorites tables');
  }

  // Determine the schema for favorites tables
  const favSchema = tableCheck.rows.length > 0 ? tableCheck.rows[0].table_schema : 'favorites';

  // Clear existing groups owned by this user (to avoid duplicates on re-run)
  await client.query(`DELETE FROM ${favSchema}.favorite_groups WHERE "userId" = $1`, [ownerId]);
  console.log('Cleared existing favorite groups for owner');

  for (const group of groups) {
    const groupRes = await client.query(`
      INSERT INTO ${favSchema}.favorite_groups (name, "userId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $3)
      RETURNING id
    `, [group.name, ownerId, new Date(group.createdAt)]);
    const groupId = groupRes.rows[0].id;

    for (const username of group.usernames) {
      const talentId = userIdMap[username];
      if (!talentId) {
        console.log(`  [warn] No user ID for ${username}, skipping favorite`);
        continue;
      }
      await client.query(`
        INSERT INTO ${favSchema}.favorites ("userId", "groupId", type, "itemId")
        VALUES ($1, $2, 'talent', $3)
      `, [ownerId, groupId, talentId]);
    }

    console.log(`  [group] "${group.name}" → ${group.usernames.length} favorites`);
  }

  console.log('\nDone! Seeded 24 users + 7 favorite groups.');
  await client.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

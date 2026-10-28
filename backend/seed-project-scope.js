#!/usr/bin/env node
/**
 * Seed remaining no-dependency fields: shortDescription, deliverables, FAQs, scope, estimatedHours
 */

const { Client } = require('pg');

// The connection string comes from the environment (stored in Doppler); never commit it.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it, or run with: doppler run -- node <this script>');
  process.exit(1);
}
const SCHEMA = 'listings';

const PROJECT_DATA = {
  'ai-powered-customer-support-platform': {
    shortDescription: 'Build an AI-driven customer support platform with NLP-powered chatbots, automated ticket routing, and real-time analytics for enterprise clients.',
    deliverables: ['AI Chatbot Engine with NLP', 'Ticket Routing & Escalation System', 'Real-time Analytics Dashboard', 'Knowledge Base Integration', 'Multi-channel Support (Web, Mobile, Email)'],
    faqs: [
      { question: 'What AI models are used?', answer: 'We use GPT-4 for conversation and custom NER models for intent classification, with fallback to human agents when confidence is low.' },
      { question: 'How is training data managed?', answer: 'Training data is sourced from historical ticket data, anonymized and labeled by our ML ops team before fine-tuning.' },
      { question: 'What integrations are supported?', answer: 'Slack, Zendesk, Intercom, Salesforce, and custom REST APIs via webhook configuration.' },
    ],
    scope: [
      { phaseName: 'Discovery & Planning', order: 1, tasks: [
        { title: 'Requirements gathering & stakeholder interviews', roleName: 'Product Manager', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Technical architecture design', roleName: 'Solutions Architect', experienceLevel: 'Senior', estimatedHours: 32 },
      ]},
      { phaseName: 'AI Engine Development', order: 2, tasks: [
        { title: 'NLP model training & fine-tuning', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 120 },
        { title: 'Intent classification system', roleName: 'ML Engineer', experienceLevel: 'Medior', estimatedHours: 80 },
        { title: 'Conversation flow builder', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Frontend & Integration', order: 3, tasks: [
        { title: 'Chat widget & dashboard UI', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'API integrations (Slack, Zendesk)', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 60 },
        { title: 'Analytics dashboard', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Testing & Launch', order: 4, tasks: [
        { title: 'End-to-end testing & QA', roleName: 'QA Engineer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Performance optimization & deployment', roleName: 'DevOps Engineer', experienceLevel: 'Senior', estimatedHours: 40 },
      ]},
    ],
    estimatedHours: 612,
  },
  'e-commerce-marketplace-redesign': {
    shortDescription: 'Redesign and rebuild a multi-vendor e-commerce marketplace with modern UX, real-time inventory, and mobile-first experience.',
    deliverables: ['Redesigned Storefront UI/UX', 'Vendor Management Dashboard', 'Payment Processing Integration', 'Real-time Inventory System', 'Mobile App (iOS & Android)'],
    faqs: [
      { question: 'What payment gateways are supported?', answer: 'Stripe, PayPal, Apple Pay, and Google Pay with split payments for multi-vendor orders.' },
      { question: 'Is the mobile app native or cross-platform?', answer: 'Cross-platform using Flutter for consistent experience on both iOS and Android with near-native performance.' },
    ],
    scope: [
      { phaseName: 'UX Research & Design', order: 1, tasks: [
        { title: 'User research & competitive analysis', roleName: 'UX Researcher', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Wireframes & interactive prototypes', roleName: 'UI/UX Designer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Backend Development', order: 2, tasks: [
        { title: 'API architecture & microservices', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 100 },
        { title: 'Payment & checkout system', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Vendor onboarding & management', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 50 },
      ]},
      { phaseName: 'Frontend & Mobile', order: 3, tasks: [
        { title: 'Web storefront implementation', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Mobile app development (Flutter)', roleName: 'Mobile Developer', experienceLevel: 'Senior', estimatedHours: 120 },
      ]},
      { phaseName: 'QA & Launch', order: 4, tasks: [
        { title: 'Cross-browser & device testing', roleName: 'QA Engineer', experienceLevel: 'Medior', estimatedHours: 40 },
        { title: 'Performance optimization', roleName: 'DevOps Engineer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 580,
  },
  'healthcare-patient-portal': {
    shortDescription: 'HIPAA-compliant patient portal with telemedicine integration, appointment scheduling, and secure medical record access.',
    deliverables: ['Patient Dashboard', 'Telemedicine Video Integration', 'Appointment Scheduling System', 'Secure Medical Records Portal', 'Provider Admin Panel'],
    faqs: [
      { question: 'How is HIPAA compliance ensured?', answer: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). PHI is stored in dedicated HIPAA-compliant infrastructure with audit logging.' },
      { question: 'What telemedicine platform is used?', answer: 'Custom WebRTC implementation with Twilio fallback, supporting HD video, screen sharing, and in-session file transfer.' },
    ],
    scope: [
      { phaseName: 'Compliance & Architecture', order: 1, tasks: [
        { title: 'HIPAA compliance audit & planning', roleName: 'Security Consultant', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'System architecture & data flow design', roleName: 'Solutions Architect', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
      { phaseName: 'Core Platform', order: 2, tasks: [
        { title: 'Patient authentication & authorization', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Medical records API & storage', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Appointment scheduling engine', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 60 },
      ]},
      { phaseName: 'Frontend & Telemedicine', order: 3, tasks: [
        { title: 'Patient portal UI', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Video consultation module', roleName: 'Full-Stack Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Security & Testing', order: 4, tasks: [
        { title: 'Penetration testing & security audit', roleName: 'Security Engineer', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'HIPAA compliance testing', roleName: 'QA Engineer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 470,
  },
  'clinical-trial-data-analyzer': {
    shortDescription: 'Data analysis platform for clinical trial data with FDA-compliant reporting, statistical modeling, and real-time patient cohort tracking.',
    deliverables: ['Clinical Data Import Pipeline', 'Statistical Analysis Engine', 'FDA-Compliant Report Generator', 'Patient Cohort Dashboard', 'Adverse Event Monitoring System'],
    faqs: [
      { question: 'What data formats are supported?', answer: 'CDISC SDTM and ADaM datasets, CSV, SAS transport files (.xpt), and direct REDCap API integration.' },
      { question: 'How are FDA 21 CFR Part 11 requirements met?', answer: 'Electronic signatures, full audit trail, role-based access control, and validated computing environment with documented change control.' },
      { question: 'Can it handle multi-site trials?', answer: 'Yes, supports multi-site data aggregation with site-level dashboards, centralized monitoring, and automated data quality checks per site.' },
    ],
    scope: [
      { phaseName: 'Requirements & Compliance', order: 1, tasks: [
        { title: 'FDA compliance requirements analysis', roleName: 'Regulatory Consultant', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Data model & pipeline architecture', roleName: 'Data Architect', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
      { phaseName: 'Data Pipeline & Analytics', order: 2, tasks: [
        { title: 'CDISC data import pipeline', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Statistical analysis engine (R/Python)', roleName: 'Biostatistician', experienceLevel: 'Senior', estimatedHours: 100 },
        { title: 'Adverse event detection system', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Dashboard & Reporting', order: 3, tasks: [
        { title: 'Patient cohort tracking UI', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'FDA report generation module', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
      ]},
      { phaseName: 'Validation & Deployment', order: 4, tasks: [
        { title: 'IQ/OQ/PQ validation protocols', roleName: 'QA Engineer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Deployment & documentation', roleName: 'DevOps Engineer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 500,
  },
  'market-research-intelligence-dashboard': {
    shortDescription: 'Business intelligence dashboard for market research with automated data collection, trend analysis, and customizable reporting.',
    deliverables: ['Automated Data Collection System', 'Interactive Dashboard Builder', 'Trend Analysis & Forecasting Module', 'Custom Report Generator', 'API for Data Export'],
    faqs: [
      { question: 'What data sources are supported?', answer: 'Public market data APIs, web scraping pipelines, survey integrations, social media APIs, and manual CSV/Excel uploads.' },
      { question: 'Can dashboards be shared externally?', answer: 'Yes, via password-protected public links or embedded iframes with customizable branding.' },
    ],
    scope: [
      { phaseName: 'Data Architecture', order: 1, tasks: [
        { title: 'Data source mapping & pipeline design', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Database schema & API design', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
      { phaseName: 'Backend & Data Pipeline', order: 2, tasks: [
        { title: 'Data ingestion pipeline', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Analytics engine & forecasting', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Dashboard UI', order: 3, tasks: [
        { title: 'Dashboard builder & visualization', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Report generator', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
    ],
    estimatedHours: 330,
  },
  'real-estate-property-management-dashboard': {
    shortDescription: 'SaaS dashboard for property managers with tenant management, maintenance tracking, financial reporting, and lease automation.',
    deliverables: ['Property Portfolio Dashboard', 'Tenant Management System', 'Maintenance Request Tracker', 'Financial Reporting Module', 'Automated Lease Generation'],
    faqs: [
      { question: 'How many properties can it manage?', answer: 'No limit — the platform is built for scale with multi-property, multi-owner support and bulk operations.' },
    ],
    scope: [
      { phaseName: 'Core Platform', order: 1, tasks: [
        { title: 'Multi-tenant architecture', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Property & tenant CRUD APIs', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 50 },
      ]},
      { phaseName: 'Features', order: 2, tasks: [
        { title: 'Maintenance ticketing system', roleName: 'Full-Stack Developer', experienceLevel: 'Medior', estimatedHours: 40 },
        { title: 'Financial reporting & analytics', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Lease document automation', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
      ]},
      { phaseName: 'Dashboard UI', order: 3, tasks: [
        { title: 'Dashboard & portfolio views', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 70 },
        { title: 'Mobile responsive design', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 360,
  },
  'supply-chain-analytics-platform': {
    shortDescription: 'Enterprise analytics platform for supply chain optimization with ML-powered demand forecasting and real-time logistics tracking.',
    deliverables: ['Demand Forecasting Engine', 'Real-time Logistics Dashboard', 'Supplier Performance Analytics', 'Inventory Optimization Module', 'Custom Alert System'],
    faqs: [
      { question: 'What ML models are used for forecasting?', answer: 'Ensemble of ARIMA, Prophet, and LSTM models with automatic model selection based on data characteristics.' },
    ],
    scope: [
      { phaseName: 'Data Integration', order: 1, tasks: [
        { title: 'ERP/WMS data connectors', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Data warehouse design', roleName: 'Data Architect', experienceLevel: 'Senior', estimatedHours: 40 },
      ]},
      { phaseName: 'ML & Analytics', order: 2, tasks: [
        { title: 'Demand forecasting models', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 100 },
        { title: 'Optimization algorithms', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Platform UI', order: 3, tasks: [
        { title: 'Analytics dashboard', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 70 },
        { title: 'Alert & notification system', roleName: 'Full-Stack Developer', experienceLevel: 'Medior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 380,
  },
  'mobile-banking-application': {
    shortDescription: 'Secure mobile banking app with biometric authentication, real-time transactions, P2P payments, and personalized financial insights.',
    deliverables: ['Biometric Auth System', 'Transaction Processing Engine', 'P2P Payment Module', 'Financial Insights Dashboard', 'Push Notification System'],
    faqs: [
      { question: 'What security certifications does it meet?', answer: 'PCI-DSS Level 1, SOC 2 Type II, and all applicable banking regulations per jurisdiction.' },
    ],
    scope: [
      { phaseName: 'Security & Architecture', order: 1, tasks: [
        { title: 'Security architecture & threat modeling', roleName: 'Security Architect', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Banking API integration design', roleName: 'Solutions Architect', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
      { phaseName: 'Core Banking', order: 2, tasks: [
        { title: 'Transaction processing engine', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'P2P payment system', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Plaid/bank integration', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Mobile App', order: 3, tasks: [
        { title: 'React Native app development', roleName: 'Mobile Developer', experienceLevel: 'Senior', estimatedHours: 100 },
        { title: 'Biometric authentication', roleName: 'Mobile Developer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
      { phaseName: 'Compliance & Testing', order: 4, tasks: [
        { title: 'PCI-DSS compliance testing', roleName: 'Security Engineer', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Penetration testing', roleName: 'Security Engineer', experienceLevel: 'Senior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 440,
  },
  'edtech-learning-management-system': {
    shortDescription: 'Modern LMS with gamified learning paths, live video classrooms, AI-powered content recommendations, and certification tracking.',
    deliverables: ['Gamified Learning Engine', 'Live Video Classroom', 'AI Content Recommender', 'Certification & Badge System', 'Instructor Analytics Dashboard'],
    faqs: [
      { question: 'Does it support SCORM content?', answer: 'Yes, full SCORM 1.2 and 2004 support, plus xAPI (Tin Can) for advanced learning analytics.' },
    ],
    scope: [
      { phaseName: 'Platform Core', order: 1, tasks: [
        { title: 'Course management system', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'User & role management', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Learning Features', order: 2, tasks: [
        { title: 'Gamification engine', roleName: 'Full-Stack Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Live video classroom (WebRTC)', roleName: 'Full-Stack Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'AI content recommendation', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 50 },
      ]},
      { phaseName: 'Frontend', order: 3, tasks: [
        { title: 'Student & instructor dashboards', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Mobile responsive implementation', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 30 },
      ]},
    ],
    estimatedHours: 370,
  },
  'consumer-behavior-analytics-suite': {
    shortDescription: 'Advanced analytics suite for consumer behavior research with ML-powered segmentation, sentiment analysis, and predictive modeling.',
    deliverables: ['Customer Segmentation Engine', 'Sentiment Analysis Pipeline', 'Predictive Behavior Models', 'Interactive Research Dashboard', 'Data Export & API'],
    faqs: [],
    scope: [
      { phaseName: 'Data Pipeline', order: 1, tasks: [
        { title: 'Multi-source data ingestion', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Data cleaning & transformation', roleName: 'Data Engineer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Analytics Engine', order: 2, tasks: [
        { title: 'Segmentation ML models', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Sentiment analysis pipeline', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Dashboard', order: 3, tasks: [
        { title: 'Interactive research dashboard', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
    ],
    estimatedHours: 300,
  },
  'academic-literature-review-platform': {
    shortDescription: 'AI-powered platform for systematic literature reviews with automated paper discovery, citation analysis, and collaborative annotation.',
    deliverables: ['Paper Discovery Engine', 'Citation Graph Analyzer', 'Collaborative Annotation Tool', 'Systematic Review Workflow', 'Export to LaTeX/Word'],
    faqs: [],
    scope: [
      { phaseName: 'Core Engine', order: 1, tasks: [
        { title: 'Paper indexing & search', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'NLP paper summarization', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 80 },
      ]},
      { phaseName: 'Collaboration', order: 2, tasks: [
        { title: 'Annotation & review workflow', roleName: 'Full-Stack Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Citation graph visualization', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 40 },
      ]},
    ],
    estimatedHours: 230,
  },
  'competitive-intelligence-tracker': {
    shortDescription: 'Real-time competitive intelligence platform with automated web monitoring, pricing alerts, and market position tracking.',
    deliverables: ['Web Monitoring Crawler', 'Pricing Intelligence Module', 'Market Position Dashboard', 'Automated Alert System', 'Competitor Comparison Reports'],
    faqs: [],
    scope: [
      { phaseName: 'Data Collection', order: 1, tasks: [
        { title: 'Web scraping infrastructure', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 80 },
        { title: 'Data normalization pipeline', roleName: 'Data Engineer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Analytics & UI', order: 2, tasks: [
        { title: 'Competitive analysis engine', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Dashboard & alerts UI', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
    ],
    estimatedHours: 240,
  },
  'survey-research-insights-platform': {
    shortDescription: 'End-to-end survey research platform with advanced question logic, response analysis, and automated insight generation.',
    deliverables: ['Survey Builder with Logic Branching', 'Response Collection Engine', 'Statistical Analysis Module', 'Automated Insight Reports', 'Respondent Panel Management'],
    faqs: [],
    scope: [
      { phaseName: 'Survey Engine', order: 1, tasks: [
        { title: 'Survey builder with logic', roleName: 'Full-Stack Developer', experienceLevel: 'Senior', estimatedHours: 70 },
        { title: 'Response collection system', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
      { phaseName: 'Analytics', order: 2, tasks: [
        { title: 'Statistical analysis engine', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Report generation', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 40 },
      ]},
    ],
    estimatedHours: 200,
  },
  'inventory-management-system': {
    shortDescription: 'Multi-location inventory management system with barcode scanning, real-time stock tracking, and automated reorder alerts.',
    deliverables: ['Barcode/QR Scanning Module', 'Real-time Stock Dashboard', 'Automated Reorder System', 'Multi-location Management', 'POS Integration'],
    faqs: [],
    scope: [
      { phaseName: 'Core System', order: 1, tasks: [
        { title: 'Inventory CRUD & multi-location', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Barcode scanning integration', roleName: 'Mobile Developer', experienceLevel: 'Medior', estimatedHours: 30 },
      ]},
      { phaseName: 'Features & UI', order: 2, tasks: [
        { title: 'Reorder automation', roleName: 'Backend Developer', experienceLevel: 'Medior', estimatedHours: 30 },
        { title: 'Dashboard & reports', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Mobile app', roleName: 'Mobile Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
    ],
    estimatedHours: 230,
  },
  'saas-analytics-dashboard-builder': {
    shortDescription: 'White-label embedded analytics platform enabling SaaS companies to offer customizable dashboards and reports to their end users.',
    deliverables: ['Drag-and-Drop Dashboard Builder', 'Embeddable Widget Library', 'Data Connector Framework', 'White-label Theming System', 'Usage Analytics & Billing'],
    faqs: [],
    scope: [
      { phaseName: 'Core Platform', order: 1, tasks: [
        { title: 'Dashboard builder engine', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 100 },
        { title: 'Data connector framework', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
      { phaseName: 'Embedding & Theming', order: 2, tasks: [
        { title: 'Embeddable widget SDK', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'White-label theming engine', roleName: 'Frontend Developer', experienceLevel: 'Medior', estimatedHours: 30 },
        { title: 'Usage metering & billing API', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 40 },
      ]},
    ],
    estimatedHours: 280,
  },
  'fleet-management-platform': {
    shortDescription: 'IoT-powered fleet management platform with GPS tracking, driver behavior analytics, and predictive maintenance scheduling.',
    deliverables: ['GPS Tracking Dashboard', 'Driver Behavior Analytics', 'Predictive Maintenance Module', 'Route Optimization Engine', 'Fuel Consumption Reports'],
    faqs: [],
    scope: [
      { phaseName: 'IoT & Data', order: 1, tasks: [
        { title: 'IoT device integration (OBD-II, GPS)', roleName: 'IoT Engineer', experienceLevel: 'Senior', estimatedHours: 60 },
        { title: 'Real-time data pipeline', roleName: 'Data Engineer', experienceLevel: 'Senior', estimatedHours: 50 },
      ]},
      { phaseName: 'Analytics & Features', order: 2, tasks: [
        { title: 'Driver scoring algorithm', roleName: 'Data Scientist', experienceLevel: 'Senior', estimatedHours: 40 },
        { title: 'Route optimization engine', roleName: 'Backend Developer', experienceLevel: 'Senior', estimatedHours: 50 },
        { title: 'Predictive maintenance ML', roleName: 'ML Engineer', experienceLevel: 'Senior', estimatedHours: 50 },
      ]},
      { phaseName: 'Dashboard', order: 3, tasks: [
        { title: 'Fleet tracking dashboard', roleName: 'Frontend Developer', experienceLevel: 'Senior', estimatedHours: 60 },
      ]},
    ],
    estimatedHours: 310,
  },
};

const SERVICE_DATA = {
  'managed-cloud-infrastructure-service': {
    shortDescription: 'End-to-end managed cloud infrastructure with 24/7 monitoring, auto-scaling, CI/CD pipelines, and security hardening.',
    deliverables: ['Infrastructure Setup & Configuration', 'CI/CD Pipeline Implementation', '24/7 Monitoring & Alerting', 'Security Hardening & Compliance', 'Cost Optimization Report'],
    faqs: [
      { question: 'What cloud providers are supported?', answer: 'AWS, GCP, and Azure, with multi-cloud and hybrid setups available.' },
    ],
  },
  'ux-research-user-testing-service': {
    shortDescription: 'Comprehensive UX research service with usability testing, heuristic evaluation, and data-driven design recommendations.',
    deliverables: ['Usability Test Reports', 'Heuristic Evaluation', 'User Journey Maps', 'Accessibility Audit', 'Design Recommendations'],
    faqs: [
      { question: 'How many users per test round?', answer: 'Standard package includes 5-8 participants per round, which catches 85%+ of usability issues.' },
    ],
  },
  'market-research-subscription-service': {
    shortDescription: 'Monthly market research reports with industry analysis, competitive landscape mapping, and strategic recommendations.',
    deliverables: ['Monthly Industry Reports', 'Competitive Landscape Maps', 'Trend Analysis', 'Strategic Recommendations', 'Quarterly Deep-Dive Report'],
    faqs: [],
  },
  'data-science-ml-consulting': {
    shortDescription: 'Expert data science consulting for ML model development, data pipeline optimization, and AI strategy planning.',
    deliverables: ['ML Model Development', 'Data Pipeline Architecture', 'Model Performance Reports', 'AI Strategy Roadmap', 'Knowledge Transfer Sessions'],
    faqs: [],
  },
  'full-stack-development-retainer': {
    shortDescription: 'Dedicated full-stack development team on retainer for startups needing rapid iteration, MVP development, and scaling support.',
    deliverables: ['Sprint Deliverables (Bi-weekly)', 'Technical Architecture Reviews', 'Code Quality Reports', 'Deployment & DevOps Support', 'Technical Debt Reduction'],
    faqs: [],
  },
  'devops-infrastructure-management': {
    shortDescription: 'Ongoing DevOps management with infrastructure as code, container orchestration, and automated deployment pipelines.',
    deliverables: ['Infrastructure as Code Setup', 'Kubernetes Cluster Management', 'CI/CD Pipeline Maintenance', 'Incident Response & Recovery', 'Monthly Infrastructure Reports'],
    faqs: [],
  },
  'qa-test-automation-service': {
    shortDescription: 'Full QA service with automated test suite development, regression testing, performance testing, and security vulnerability scanning.',
    deliverables: ['Automated Test Suite', 'Regression Test Reports', 'Performance Test Analysis', 'Security Scan Results', 'Test Coverage Dashboard'],
    faqs: [],
  },
};

/**
 * Heuristic deliverable derivation — mirrors
 * listings-service/src/project-sync/deliverables/deliverables.adapter.heuristic.ts
 * Produces DeliverableGroup[] grouped per phase, 6 items each.
 */
const ARTIFACT_RULES = [
  { pattern: /\b(design|architect)\b/i, suffix: 'Blueprint' },
  { pattern: /\b(test|testing|qa|coverage)\b/i, suffix: 'Report' },
  { pattern: /\b(deploy|launch|release|provision)\b/i, suffix: 'Package' },
  { pattern: /\b(setup|config|install)\b/i, suffix: 'Configuration' },
  { pattern: /\b(document|handoff|write)\b/i, suffix: 'Documentation' },
  { pattern: /\b(develop|implement|build|creat)\b/i, suffix: 'Module' },
  { pattern: /\b(migrat)\b/i, suffix: 'Migration Script' },
  { pattern: /\b(monitor|log|observ)\b/i, suffix: 'Dashboard' },
  { pattern: /\b(review|audit|assess|evaluat)\b/i, suffix: 'Report' },
  { pattern: /\b(gather|research|analys|discover)\b/i, suffix: 'Analysis' },
  { pattern: /\b(integrat)\b/i, suffix: 'Integration Layer' },
  { pattern: /\b(secur|vulnerab|encrypt)\b/i, suffix: 'Audit Report' },
];
const FALLBACK_SUFFIXES = ['Deliverable', 'Package', 'Specifications', 'Report', 'Document', 'Artifacts'];
const STRIP_WORDS = /\b(implementation|execution|gathering|provisioning)\b/gi;

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAnd\b/g, '&');
}

function taskToArtifact(title) {
  let suffix = '';
  for (const rule of ARTIFACT_RULES) {
    if (rule.pattern.test(title)) { suffix = rule.suffix; break; }
  }
  const subject = title.replace(STRIP_WORDS, '').replace(/[^a-zA-Z0-9\s&]/g, '').replace(/\s+/g, ' ').trim();
  if (!subject) return null;
  const words = titleCase(subject).split(' ').filter(Boolean);
  const sliceByReal = (ws, max) => {
    const r = []; let c = 0;
    for (const w of ws) { if (w === '&') { r.push(w); continue; } if (c >= max) break; r.push(w); c++; }
    return r;
  };
  if (suffix) {
    const suffixWords = suffix.split(' ').filter(w => w !== '&').length;
    const subjectWords = sliceByReal(words, Math.max(1, 3 - suffixWords));
    const subjectPart = subjectWords.join(' ');
    if (suffix.split(' ').some(sw => subjectPart.toLowerCase().includes(sw.toLowerCase()))) {
      return sliceByReal(words, 3).join(' ');
    }
    return `${subjectPart} ${suffix}`;
  }
  return sliceByReal(words, 3).join(' ');
}

function deriveDeliverablesFromScope(scope) {
  return scope.map((phase, index) => {
    const items = [];
    for (const task of (phase.tasks || [])) {
      const rawTitle = typeof task.title === 'string' ? task.title.trim() : '';
      if (!rawTitle) continue;
      const artifact = taskToArtifact(rawTitle);
      if (artifact && !items.includes(artifact)) items.push(artifact);
    }
    if (items.length === 0) return null;
    // Pad to exactly 6
    const cleanPhase = titleCase((phase.phaseName || '').replace(/[^a-zA-Z0-9\s&]/g, '').replace(/\s+/g, ' ').trim());
    let idx = 0;
    while (items.length < 6) {
      const candidate = `${cleanPhase} ${FALLBACK_SUFFIXES[idx % FALLBACK_SUFFIXES.length]}`;
      if (!items.includes(candidate)) items.push(candidate);
      idx++;
      if (idx > 20) break;
    }
    return { phaseLabel: `Phase ${index + 1}`, phaseName: phase.phaseName, items: items.slice(0, 6) };
  }).filter(Boolean);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  // Add new columns to projects
  const projectCols = [
    '"shortDescription" TEXT',
    '"videoUrl" TEXT',
    'deliverables JSONB DEFAULT \'[]\'',
    'faqs JSONB DEFAULT \'[]\'',
    'scope JSONB DEFAULT \'[]\'',
    '"estimatedHours" INT',
  ];
  for (const col of projectCols) {
    const colName = col.split(' ')[0].replace(/"/g, '');
    await client.query(`ALTER TABLE ${SCHEMA}.projects ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }
  // Same for services (minus scope/estimatedHours)
  const serviceCols = [
    '"shortDescription" TEXT',
    '"videoUrl" TEXT',
    'deliverables JSONB DEFAULT \'[]\'',
    'faqs JSONB DEFAULT \'[]\'',
  ];
  for (const col of serviceCols) {
    await client.query(`ALTER TABLE ${SCHEMA}.services ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }
  console.log('Columns added\n');

  // Update projects — derive grouped deliverables from scope
  console.log('=== Updating Projects ===');
  for (const [slug, data] of Object.entries(PROJECT_DATA)) {
    const groupedDeliverables = deriveDeliverablesFromScope(data.scope);
    const totalItems = groupedDeliverables.reduce((sum, g) => sum + g.items.length, 0);
    const result = await client.query(
      `UPDATE ${SCHEMA}.projects SET
        "shortDescription" = $1,
        deliverables = $2,
        faqs = $3,
        scope = $4,
        "estimatedHours" = $5
      WHERE slug = $6 RETURNING title`,
      [data.shortDescription, JSON.stringify(groupedDeliverables), JSON.stringify(data.faqs), JSON.stringify(data.scope), data.estimatedHours, slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title} (${data.estimatedHours}h, ${data.scope.length} phases, ${groupedDeliverables.length} groups, ${totalItems} deliverables)`);
    } else {
      console.log(`  ⚠️  No project for slug: ${slug}`);
    }
  }

  // Update services (no scope, keep flat deliverables as single group)
  console.log('\n=== Updating Services ===');
  for (const [slug, data] of Object.entries(SERVICE_DATA)) {
    const groupedDeliverables = [{ phaseLabel: 'Phase 1', phaseName: 'Service Delivery', items: data.deliverables.slice(0, 6) }];
    const result = await client.query(
      `UPDATE ${SCHEMA}.services SET
        "shortDescription" = $1,
        deliverables = $2,
        faqs = $3
      WHERE slug = $4 RETURNING title`,
      [data.shortDescription, JSON.stringify(groupedDeliverables), JSON.stringify(data.faqs), slug]
    );
    if (result.rows.length > 0) {
      console.log(`  ✅ ${result.rows[0].title} (${groupedDeliverables[0].items.length} deliverables)`);
    } else {
      console.log(`  ⚠️  No service for slug: ${slug}`);
    }
  }

  console.log('\n✅ All scope & detail data populated!');
  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

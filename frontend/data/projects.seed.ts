export interface ProjectSeed {
  id: string
  slug: string
  categorySlugs: string[]
  title: string
  mediaUrl: string
  budget: string
  duration: string
  description: string
}

const softwareDevelopment = ["software-development"]
const mobileDevelopment = ["software-development", "mobile-development"]
const iosDevelopment = [
  "software-development",
  "mobile-development",
  "ios-development",
]

export const projectSeeds: ProjectSeed[] = [
  {
    id: "mock-project-ecommerce-experience-design",
    slug: "ecommerce-experience-design",
    categorySlugs: mobileDevelopment,
    title: "Ecommerce Experience Design",
    mediaUrl: "/coding.jpg",
    budget: "$50,000 budget",
    duration: "Starting from 12 weeks",
    description:
      "Design and launch a conversion-focused ecommerce experience with storefront, checkout, and analytics improvements.",
  },
  {
    id: "mock-project-big-data-security-lockdown",
    slug: "big-data-security-lockdown",
    categorySlugs: softwareDevelopment,
    title: "Big Data Security Lockdown",
    mediaUrl: "/software-development.jpeg",
    budget: "$75,000 budget",
    duration: "Starting from 10 weeks",
    description:
      "Secure large-scale data systems with access control, monitoring, compliance workflows, and remediation support.",
  },
  {
    id: "mock-project-cyber-security-review",
    slug: "cyber-security-review",
    categorySlugs: softwareDevelopment,
    title: "Cyber Security Review",
    mediaUrl: "/cyber-security.jpeg",
    budget: "$35,000 budget",
    duration: "Starting from 6 weeks",
    description:
      "Review application and infrastructure risk, identify vulnerabilities, and define a practical security roadmap.",
  },
  {
    id: "mock-project-mobile-app-experience",
    slug: "the-ultimate-mobile-app-experience",
    categorySlugs: iosDevelopment,
    title: "The Ultimate Mobile App Experience",
    mediaUrl: "/software-development-1.png",
    budget: "$60,000 budget",
    duration: "Starting from 14 weeks",
    description:
      "Build a polished mobile application experience from product definition through design and engineering.",
  },
  {
    id: "mock-project-analytics-dashboard",
    slug: "analytics-dashboard-buildout",
    categorySlugs: softwareDevelopment,
    title: "Analytics Dashboard Buildout",
    mediaUrl: "/software-development.jpeg",
    budget: "$42,000 budget",
    duration: "Starting from 8 weeks",
    description:
      "Create dashboards, metric definitions, and reporting workflows for operational and executive teams.",
  },
  {
    id: "mock-project-cloud-platform-modernization",
    slug: "cloud-platform-modernization",
    categorySlugs: softwareDevelopment,
    title: "Cloud Platform Modernization",
    mediaUrl: "/coding.jpg",
    budget: "$95,000 budget",
    duration: "Starting from 16 weeks",
    description:
      "Modernize cloud infrastructure, deployment pipelines, observability, and service reliability practices.",
  },
  {
    id: "mock-project-design-system-launch",
    slug: "design-system-launch",
    categorySlugs: mobileDevelopment,
    title: "Design System Launch",
    mediaUrl: "/software-development-1.png",
    budget: "$48,000 budget",
    duration: "Starting from 9 weeks",
    description:
      "Ship a scalable design system with reusable components, documentation, and frontend implementation patterns.",
  },
  {
    id: "mock-project-api-integration-hub",
    slug: "api-integration-hub",
    categorySlugs: mobileDevelopment,
    title: "API Integration Hub",
    mediaUrl: "/cyber-security.jpeg",
    budget: "$55,000 budget",
    duration: "Starting from 11 weeks",
    description:
      "Integrate internal systems and third-party APIs with stable authentication, data sync, and monitoring.",
  },
]

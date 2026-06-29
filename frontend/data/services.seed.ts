export interface ServiceSeed {
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

export const serviceSeeds: ServiceSeed[] = [
  {
    id: "mock-service-mobile-app-experience",
    slug: "the-ultimate-mobile-app-experience",
    categorySlugs: iosDevelopment,
    title: "The Ultimate Mobile App Experience",
    mediaUrl: "/software-development-1.png",
    budget: "$5,000/month",
    duration: "4 weeks",
    description:
      "Launch a polished mobile application experience with product strategy, UI design, and implementation support.",
  },
  {
    id: "mock-service-ecommerce-experience-design",
    slug: "ecommerce-experience-design",
    categorySlugs: mobileDevelopment,
    title: "Ecommerce Experience Design",
    mediaUrl: "/coding.jpg",
    budget: "$2,500/month",
    duration: "3 weeks",
    description:
      "Improve conversion, navigation, checkout flow, and storefront design for growing ecommerce brands.",
  },
  {
    id: "mock-service-big-data-security-lockdown",
    slug: "big-data-security-lockdown",
    categorySlugs: softwareDevelopment,
    title: "Big Data Security Lockdown",
    mediaUrl: "/software-development.jpeg",
    budget: "$3,200/month",
    duration: "5 weeks",
    description:
      "Harden data infrastructure with access controls, audit-ready workflows, and security best practices.",
  },
  {
    id: "mock-service-cybersecurity-review",
    slug: "cybersecurity-review",
    categorySlugs: softwareDevelopment,
    title: "Cybersecurity Review",
    mediaUrl: "/cyber-security.jpeg",
    budget: "$3,200/month",
    duration: "2 weeks",
    description:
      "Assess application security, cloud posture, and operational risk with a practical remediation roadmap.",
  },
  {
    id: "mock-service-product-analytics",
    slug: "product-analytics-setup",
    categorySlugs: softwareDevelopment,
    title: "Product Analytics Setup",
    mediaUrl: "/software-development.jpeg",
    budget: "$4,000/month",
    duration: "4 weeks",
    description:
      "Define events, dashboards, funnels, and reporting workflows for product-led growth teams.",
  },
  {
    id: "mock-service-cloud-migration",
    slug: "cloud-migration-planning",
    categorySlugs: softwareDevelopment,
    title: "Cloud Migration Planning",
    mediaUrl: "/software-development-1.png",
    budget: "$6,500/month",
    duration: "6 weeks",
    description:
      "Plan and execute a stable migration path for infrastructure, services, data, and observability.",
  },
  {
    id: "mock-service-design-system",
    slug: "design-system-buildout",
    categorySlugs: mobileDevelopment,
    title: "Design System Buildout",
    mediaUrl: "/coding.jpg",
    budget: "$4,800/month",
    duration: "5 weeks",
    description:
      "Create reusable UI foundations, component documentation, and production-ready frontend patterns.",
  },
  {
    id: "mock-service-api-integration",
    slug: "api-integration-sprint",
    categorySlugs: mobileDevelopment,
    title: "API Integration Sprint",
    mediaUrl: "/cyber-security.jpeg",
    budget: "$3,750/month",
    duration: "3 weeks",
    description:
      "Connect third-party systems, internal APIs, authentication flows, and data sync jobs.",
  },
]

export interface TeamSeed {
  id: string
  categorySlugs: string[]
  name: string
  handle: string
  tagline: string
  experience: string
  rate: string
  location: string
  rating: number
  completedProjects: number
  skills: string[]
  memberAvatars: string[]
  previousClientLogos: string[]
}

const softwareDevelopment = ["software-development"]
const mobileDevelopment = ["software-development", "mobile-development"]
const iosDevelopment = [
  "software-development",
  "mobile-development",
  "ios-development",
]

const defaultMemberAvatars = [
  "/woman.jpg",
  "/portrait.jpeg",
  "/man.jpg",
  "/woman.jpg",
  "/portrait.jpeg",
  "/man.jpg",
]

const defaultClientLogos = [
  "/google.png",
  "/microsoft.png",
  "/aws.png",
  "/instagram.png",
  "/spotify.png",
]

export const teamSeeds: TeamSeed[] = [
  {
    id: "team-tech-sential",
    categorySlugs: softwareDevelopment,
    name: "Team Name",
    handle: "@Tech_Sential",
    tagline: "Development Team",
    experience: "Average 10 years of experience",
    rate: "$85 - $120/hr",
    location: "UK, USA, Brazil, Philippines, more...",
    rating: 4.9,
    completedProjects: 16,
    skills: [
      "iOS",
      "E-commerce",
      "Mobile Application",
      "Small Business",
      "Software Development",
    ],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-product-forge",
    categorySlugs: softwareDevelopment,
    name: "Product Forge",
    handle: "@product_forge",
    tagline: "Full-Stack Product Team",
    experience: "Average 8 years of experience",
    rate: "$95 - $140/hr",
    location: "USA, Canada, Mexico, Remote",
    rating: 4.8,
    completedProjects: 22,
    skills: ["React", "Node.js", "UX Design", "SaaS", "API Development"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-cloud-north",
    categorySlugs: softwareDevelopment,
    name: "Cloud North",
    handle: "@cloud_north",
    tagline: "Cloud Engineering Team",
    experience: "Average 9 years of experience",
    rate: "$100 - $155/hr",
    location: "Canada, UK, Germany, Remote",
    rating: 4.9,
    completedProjects: 18,
    skills: ["AWS", "DevOps", "Kubernetes", "Security", "Infrastructure"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-mobile-works",
    categorySlugs: iosDevelopment,
    name: "Mobile Works",
    handle: "@mobile_works",
    tagline: "Mobile Application Team",
    experience: "Average 7 years of experience",
    rate: "$80 - $125/hr",
    location: "Brazil, Portugal, USA, Remote",
    rating: 4.7,
    completedProjects: 14,
    skills: ["iOS", "Android", "React Native", "Flutter", "QA"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-commerce-lab",
    categorySlugs: mobileDevelopment,
    name: "Commerce Lab",
    handle: "@commerce_lab",
    tagline: "E-commerce Development Team",
    experience: "Average 10 years of experience",
    rate: "$90 - $135/hr",
    location: "USA, India, Philippines, Remote",
    rating: 4.8,
    completedProjects: 31,
    skills: ["Shopify", "Payments", "E-commerce", "Analytics", "CRO"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-data-pulse",
    categorySlugs: softwareDevelopment,
    name: "Data Pulse",
    handle: "@data_pulse",
    tagline: "Data Platform Team",
    experience: "Average 9 years of experience",
    rate: "$105 - $160/hr",
    location: "USA, Ukraine, Poland, Remote",
    rating: 4.9,
    completedProjects: 19,
    skills: ["Data Engineering", "Python", "BI", "ML Ops", "Warehousing"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-security-grid",
    categorySlugs: softwareDevelopment,
    name: "Security Grid",
    handle: "@security_grid",
    tagline: "Cybersecurity Team",
    experience: "Average 11 years of experience",
    rate: "$120 - $180/hr",
    location: "USA, Israel, UK, Remote",
    rating: 5,
    completedProjects: 12,
    skills: ["Security", "Compliance", "Pen Testing", "Cloud", "SOC 2"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
  {
    id: "team-design-systems",
    categorySlugs: mobileDevelopment,
    name: "Design Systems Co.",
    handle: "@design_systems",
    tagline: "Design & Frontend Team",
    experience: "Average 8 years of experience",
    rate: "$90 - $145/hr",
    location: "USA, France, Spain, Remote",
    rating: 4.8,
    completedProjects: 25,
    skills: ["Design Systems", "Figma", "React", "Accessibility", "UI"],
    memberAvatars: defaultMemberAvatars,
    previousClientLogos: defaultClientLogos,
  },
]

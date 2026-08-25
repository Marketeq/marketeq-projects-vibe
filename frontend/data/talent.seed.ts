export interface TalentSeed {
  id: string
  categorySlugs: string[]
  username: string
  handle: string
  role: string
  rate: string
  experience: string
  location: string
  rating: string
  projects: string
  photo: string
  status: "available" | "away"
  skills: string[]
}

const softwareDevelopment = ["software-development"]
const mobileDevelopment = ["software-development", "mobile-development"]
const iosDevelopment = [
  "software-development",
  "mobile-development",
  "ios-development",
]

export const talentSeeds: TalentSeed[] = [
  {
    id: "software-talent-1",
    categorySlugs: softwareDevelopment,
    username: "Priya",
    handle: "@Tech Sentinel",
    role: "Data Scientist",
    rate: "$85 - $120/hr",
    experience: "7 years of experience",
    location: "Ukraine (8:03pm local time)",
    rating: "4.9",
    projects: "16 projects",
    photo: "/woman.jpg",
    status: "away",
    skills: [
      "Web Development",
      "Motion Design",
      "Data Visualization",
      "Information Architecture",
      "(CRO) Design",
      "3D Design",
      "More...",
    ],
  },
  {
    id: "software-talent-2",
    categorySlugs: softwareDevelopment,
    username: "Ngozi",
    handle: "@BlueberryBelle",
    role: "Marketing Technologist",
    rate: "$85 - $120/hr",
    experience: "5 years of experience",
    location: "Australia (7:13pm local time)",
    rating: "4.7",
    projects: "2 projects",
    photo: "/portrait.jpeg",
    status: "available",
    skills: [
      "AR/VR Design",
      "UX Design",
      "UX Research",
      "Web Development",
      "Data Visualization",
      "Content Design",
      "Marketing Design",
      "More...",
    ],
  },
  {
    id: "software-talent-3",
    categorySlugs: softwareDevelopment,
    username: "Octavio",
    handle: "@Broadcaster",
    role: "Social Media Manager",
    rate: "$85 - $120/hr",
    experience: "2 years of experience",
    location: "India (12:23pm local time)",
    rating: "4.8",
    projects: "4 projects",
    photo: "/man.jpg",
    status: "available",
    skills: [
      "Web Design",
      "Data Visualization",
      "Accessibility Design",
      "UX Design",
      "Typography Design",
      "Web Marketing",
      "AI-Generated Design",
      "More...",
    ],
  },
  {
    id: "software-talent-4",
    categorySlugs: mobileDevelopment,
    username: "Amara",
    handle: "@PixelOps",
    role: "Frontend Engineer",
    rate: "$90 - $130/hr",
    experience: "6 years of experience",
    location: "United States (10:15am local time)",
    rating: "4.9",
    projects: "11 projects",
    photo: "/woman.jpg",
    status: "available",
    skills: ["React", "TypeScript", "Design Systems", "Accessibility", "Next.js", "More..."],
  },
  {
    id: "software-talent-5",
    categorySlugs: softwareDevelopment,
    username: "Mateo",
    handle: "@CloudCraft",
    role: "Cloud Architect",
    rate: "$110 - $160/hr",
    experience: "9 years of experience",
    location: "Spain (4:25pm local time)",
    rating: "5.0",
    projects: "19 projects",
    photo: "/man.jpg",
    status: "away",
    skills: ["AWS", "DevOps", "Kubernetes", "Security", "Infrastructure", "More..."],
  },
  {
    id: "software-talent-6",
    categorySlugs: softwareDevelopment,
    username: "Leila",
    handle: "@DataNorth",
    role: "Analytics Engineer",
    rate: "$95 - $145/hr",
    experience: "8 years of experience",
    location: "Canada (1:40pm local time)",
    rating: "4.8",
    projects: "13 projects",
    photo: "/portrait.jpeg",
    status: "available",
    skills: ["SQL", "Python", "Dashboards", "Data Modeling", "dbt", "More..."],
  },
  {
    id: "software-talent-7",
    categorySlugs: softwareDevelopment,
    username: "Jonas",
    handle: "@SecureBuild",
    role: "Security Engineer",
    rate: "$120 - $175/hr",
    experience: "10 years of experience",
    location: "Germany (7:55pm local time)",
    rating: "4.9",
    projects: "9 projects",
    photo: "/man.jpg",
    status: "available",
    skills: ["Security", "Cloud", "Compliance", "Pen Testing", "SOC 2", "More..."],
  },
  {
    id: "software-talent-8",
    categorySlugs: iosDevelopment,
    username: "Sofia",
    handle: "@LaunchStudio",
    role: "Product Designer",
    rate: "$85 - $125/hr",
    experience: "7 years of experience",
    location: "Brazil (2:30pm local time)",
    rating: "4.7",
    projects: "15 projects",
    photo: "/woman.jpg",
    status: "available",
    skills: ["UX Design", "Research", "Figma", "Prototyping", "Mobile Design", "More..."],
  },
]

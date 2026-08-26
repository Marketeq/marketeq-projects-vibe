import type { PublicTopBarUser } from "@/components/case-study/public-top-bar"

/**
 * Fallback marketplace-chrome data for the public case-study page
 * (pricing, team, similar/recommended projects, etc.). Every field here is
 * illustrative content standing in for what would normally come from the
 * listings-service project record, the portfolio-service case study, and
 * recommendation endpoints — none of that is wired to a real API yet (see
 * components/case-study/case-study-public-resolver.tsx for why).
 */

export interface DemoBreadcrumbItem {
  label: string
  href: string
}

export interface DemoProject {
  title: string
  thumbnailUrl: string
  badge: string
  rating: number
  reviewCount: number
  categories: DemoBreadcrumbItem[]
  description: string
}

export interface DemoPricing {
  amount: string
  period: string
  initialPayment: string
  duration: string
  teamSize: string
}

export interface DemoTeamMember {
  id: string
  name: string
  avatarUrl?: string
}

export interface DemoListingCard {
  id: string
  slug: string
  title: string
  description: string
  mediaUrl: string
  budget: string
  duration: string
  rating: number
  reviewCount: number
}

export const DEMO_USER: PublicTopBarUser = {
  name: "Dheeraj",
  handle: "dheerajnagdali",
  online: true,
}

export const DEMO_BREADCRUMB: DemoBreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Development", href: "/c/development" },
  { label: "Game Development", href: "/c/development/game-development" },
  { label: "Emerging AI in Unity 3D", href: "#" },
]

export const DEMO_PROJECT: DemoProject = {
  title: "Emerging AI in Unity 3D",
  thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",
  badge: "Featured",
  rating: 4.9,
  reviewCount: 128,
  categories: [
    { label: "Game Development", href: "/c/development/game-development" },
    { label: "Unity", href: "/c/development/unity" },
    { label: "Machine Learning", href: "/c/development/machine-learning" },
  ],
  description:
    "A behavior-tree and reinforcement-learning driven NPC system built in Unity 3D, replacing scripted enemy patterns with agents that adapt to how each player actually plays. Shipped as a reusable package with an in-editor training loop, so designers can retrain agents without touching code.",
}

export const DEMO_PRICING: DemoPricing = {
  amount: "$2,450",
  period: "/month",
  initialPayment: "then $500 due at project start",
  duration: "8-10 weeks",
  teamSize: "2-3 team members",
}

export const DEMO_TEAM: DemoTeamMember[] = [
  { id: "t1", name: "Dheeraj Nagdali", avatarUrl: "/man.jpg" },
  { id: "t2", name: "Priya Shah" },
  { id: "t3", name: "Marcus Lee" },
]

export const DEMO_SIMILAR_PROJECTS: DemoListingCard[] = [
  {
    id: "sp-1",
    slug: "procedural-dungeon-generator",
    title: "Procedural Dungeon Generator for Unity",
    description: "Wave-function-collapse based level generation with designer-tunable constraints.",
    mediaUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600",
    budget: "$1,800/month",
    duration: "6 weeks",
    rating: 4.8,
    reviewCount: 64,
  },
  {
    id: "sp-2",
    slug: "multiplayer-netcode-migration",
    title: "Multiplayer Netcode Migration",
    description: "Migrated a 4-player co-op shooter from UNet to Netcode for GameObjects.",
    mediaUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600",
    budget: "$3,200/month",
    duration: "10 weeks",
    rating: 4.7,
    reviewCount: 41,
  },
  {
    id: "sp-3",
    slug: "vr-hand-tracking-toolkit",
    title: "VR Hand-Tracking Interaction Toolkit",
    description: "Reusable grab, throw, and gesture-recognition primitives for Quest and PCVR.",
    mediaUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600",
    budget: "$2,100/month",
    duration: "7 weeks",
    rating: 4.9,
    reviewCount: 89,
  },
  {
    id: "sp-4",
    slug: "mobile-shader-optimization",
    title: "Mobile Shader Optimization Pass",
    description: "Cut GPU frame time 34% across a stylized shader set for a mid-tier Android target.",
    mediaUrl: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?w=600",
    budget: "$1,400/month",
    duration: "4 weeks",
    rating: 4.6,
    reviewCount: 27,
  },
]

export const DEMO_RECOMMENDED_PROJECTS: DemoListingCard[] = [
  {
    id: "rp-1",
    slug: "npc-dialogue-llm-integration",
    title: "NPC Dialogue via Local LLM",
    description: "On-device small-model dialogue generation with a lore-consistency guardrail layer.",
    mediaUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
    budget: "$2,900/month",
    duration: "9 weeks",
    rating: 4.8,
    reviewCount: 33,
  },
  {
    id: "rp-2",
    slug: "unity-addressables-pipeline",
    title: "Unity Addressables Content Pipeline",
    description: "Restructured asset delivery to cut cold-start download size by half.",
    mediaUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
    budget: "$1,950/month",
    duration: "5 weeks",
    rating: 4.7,
    reviewCount: 52,
  },
  {
    id: "rp-3",
    slug: "physics-based-animation-rig",
    title: "Physics-Based Animation Rig",
    description: "Verlet-integration cloth and hair rig tuned for a 60fps console target.",
    mediaUrl: "https://images.unsplash.com/photo-1614854262340-ab1ca7d079c7?w=600",
    budget: "$2,600/month",
    duration: "8 weeks",
    rating: 4.9,
    reviewCount: 19,
  },
  {
    id: "rp-4",
    slug: "analytics-driven-balancing",
    title: "Analytics-Driven Difficulty Balancing",
    description: "Live-ops dashboard feeding difficulty curves back into encounter design.",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
    budget: "$2,200/month",
    duration: "6 weeks",
    rating: 4.6,
    reviewCount: 24,
  },
]

export const DEMO_RECENTLY_VIEWED: DemoListingCard[] = [
  DEMO_RECOMMENDED_PROJECTS[1],
  DEMO_SIMILAR_PROJECTS[0],
  DEMO_RECOMMENDED_PROJECTS[3],
]

export const DEMO_MORE_WAYS_TO_EXPLORE = {
  categories: [
    "Game Development",
    "Unity",
    "Unreal Engine",
    "Mobile Games",
    "VR / AR Development",
    "Multiplayer & Netcode",
    "Game AI",
    "Console Development",
  ],
  skills: [
    "C#",
    "ML-Agents",
    "Shader Graph",
    "Netcode for GameObjects",
    "Addressables",
    "Physics Simulation",
    "Procedural Generation",
    "Performance Profiling",
  ],
}

export const DEMO_RELATED_SEARCHES: string[] = [
  "Unity AI programmer",
  "Reinforcement learning game dev",
  "Unity ML-Agents developer",
  "Game AI consultant",
  "NPC behavior design",
  "Unity performance optimization",
  "Mobile game AI",
  "Unity C# developer for hire",
]

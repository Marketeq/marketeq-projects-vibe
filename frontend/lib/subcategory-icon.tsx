/**
 * Shared subcategory icon resolver used by /c/[category], /projects,
 * /services, /teams, and /talent. Maps a slug + name to a single-color
 * icon shown inside a soft tinted square (Stripe/Linear pattern).
 *
 * Uses keyword matching so a small rule list (~70 patterns) covers all
 * 100+ subcategories without an exhaustive lookup table. First match wins.
 */

import * as React from "react"
import type { SVGProps } from "react"
import {
  BarChart02,
  BookOpen01,
  Briefcase,
  Camera01,
  Check,
  Cloud01,
  Code01,
  Cpu,
  Cube01,
  Database01,
  DollarSign,
  Edit03,
  FileSearch02,
  FileText,
  Film02,
  Globe02,
  Headphones01,
  Heart,
  Image03,
  Layers2,
  Layout,
  Lightbulb05,
  Link04,
  Lock,
  Mail02,
  MarkerPin02,
  MessageSquare02,
  Monitor02,
  Palette,
  PieChart02,
  Search,
  Send02,
  Server04,
  Settings02,
  Shield02,
  Smartphone,
  Star01,
  Stars02,
  Target04,
  Tool01,
  TrendingUp,
  Type01,
  Users02,
  Zap,
} from "@blend-metrics/icons"

export type IconComponent = (
  props: SVGProps<SVGSVGElement>
) => React.JSX.Element

const ICON_RULES: Array<{ test: RegExp; icon: IconComponent }> = [
  // Design / creative
  { test: /(ui|ux|interaction|usability|wireframe|prototype|figma|design system|product design)/i, icon: Layout },
  { test: /(brand|logo|identity|naming|style guide|presentation|deck|pitch)/i, icon: Palette },
  { test: /(graphic|illustration|icon|print|poster|brochure|magazine|packag)/i, icon: Image03 },
  { test: /(motion|animation|3d|render|character|environment|ar|vr)/i, icon: Cube01 },
  { test: /(photo|photograph|retouch|headshot)/i, icon: Camera01 },
  { test: /(video|film|cinematograph|edit|color grad|sound design)/i, icon: Film02 },
  { test: /(web design|web-design|landing|webflow|wordpress theme|portfolio site)/i, icon: Monitor02 },

  // Development
  { test: /(mobile|ios|android|react native|flutter|smartphone|app store)/i, icon: Smartphone },
  { test: /(frontend|front-end|react|vue|angular|svelte|tailwind|css|accessibility)/i, icon: Code01 },
  { test: /(backend|back-end|api|graphql|rest|microservice|server|database design|node)/i, icon: Server04 },
  { test: /(devops|cloud|aws|gcp|azure|kubernetes|docker|terraform|ci\/cd|observ|infrastructure)/i, icon: Cloud01 },
  { test: /(blockchain|web3|smart contract|defi|nft|solidity|ethereum|solana|wallet)/i, icon: Link04 },
  { test: /(ai|ml|machine learning|llm|prompt|rag|computer vision|deep learning|fine-tun|recommendation|mlops)/i, icon: Cpu },
  { test: /(game|unity|unreal|godot|multiplayer)/i, icon: Zap },
  { test: /(iot|embedded|firmware|arduino|raspberry|esp32|edge ai|hardware)/i, icon: Cpu },
  { test: /(desktop|electron|tauri|\.net|qt|gtk|native)/i, icon: Monitor02 },
  { test: /(integration|webhook|oauth|ipaas|middleware|stripe|salesforce|zapier)/i, icon: Link04 },
  { test: /(e-?commerce|shopify|woocommerce|magento|storefront|checkout)/i, icon: Briefcase },

  // Data & analytics
  { test: /(data engineer|etl|airflow|dbt|warehouse|snowflake|bigquery|data lake|streaming)/i, icon: Database01 },
  { test: /(data science|predictive|forecasting|feature engineering|classification|clustering)/i, icon: Cpu },
  { test: /(business intelligence|dashboard|tableau|power bi|looker|kpi|reporting)/i, icon: BarChart02 },
  { test: /(visualization|chart|d3|infographic|geospatial)/i, icon: PieChart02 },
  { test: /(big data|spark|hadoop|kafka|distributed)/i, icon: Database01 },
  { test: /(analytics|attribution|cohort|funnel|mixpanel|amplitude|heap|ga4)/i, icon: BarChart02 },
  { test: /(strategy|roadmap|governance|architecture|maturity|catalog)/i, icon: Target04 },

  // Security / QA
  { test: /(security|pentest|penetration|vulnerab|owasp|threat|secur|appsec|devsecops|hardening|compliance|soc 2|iso 27|hipaa|pci|gdpr|fedramp|audit|incident|forensic|siem|soc operation|zero trust|firewall|identity|sso|mfa|rbac|saml|oidc)/i, icon: Shield02 },
  { test: /(qa|test|automation|cypress|playwright|selenium|appium|espresso|load|stress|performance test|regression|exploratory|mobile test|api test|accessibility test|usability test|ci\/cd quality)/i, icon: Check },

  // Maintenance / support
  { test: /(bug fix|hotfix|patch|dependency|upgrade|migration|refactor|tech debt|legacy|cleanup|breaking change|lockfile)/i, icon: Tool01 },
  { test: /(maintenance|support|on-call|monitoring|uptime|backup|disaster recovery|tuning|optimization|caching|cdn|core web vitals)/i, icon: Settings02 },
  { test: /(wordpress|plugin|theme update|liquid|cms update)/i, icon: Settings02 },

  // Marketing
  { test: /(seo|keyword|on-page|technical seo|link building|local seo)/i, icon: Search },
  { test: /(content marketing|content strategy|content audit|editorial|content gov|topic cluster)/i, icon: BookOpen01 },
  { test: /(email|newsletter|drip|transactional|deliverab|inbox)/i, icon: Mail02 },
  { test: /(social|instagram|tiktok|linkedin|community|influencer|creator|ugc|affiliate)/i, icon: Send02 },
  { test: /(paid|ads|advertising|programmatic|retargeting|display|meta ad|google ad|bing ad)/i, icon: TrendingUp },
  { test: /(growth|conversion|cro|funnel optim|landing page optim|a\/b test|experiment|activation|retention|referral|plg)/i, icon: TrendingUp },
  { test: /(brand market|positioning|storytelling|messaging|tone of voice|launch|gtm|product market)/i, icon: Lightbulb05 },
  { test: /(pr |communications|press|media relation|crisis|investor|speechwrit)/i, icon: MessageSquare02 },
  { test: /(event|conference|webinar|trade show|activation|sponsorship|field marketing)/i, icon: MarkerPin02 },
  { test: /(automation|hubspot|marketo|pardot|braze|customer\.io|lifecycle|lead scor)/i, icon: Zap },
  { test: /(video market|youtube|short|reel|thumbnail)/i, icon: Film02 },

  // Writing & content
  { test: /(copywriting|copy|website copy|ad copy|sales page|tagline|product description|brand voice)/i, icon: Edit03 },
  { test: /(technical writing|documentation|api doc|developer guide|knowledge base|tutorial|user manual|release note)/i, icon: FileText },
  { test: /(creative writing|screenwrit|fiction|ghostwrit|memoir|short story|children)/i, icon: BookOpen01 },
  { test: /(translation|localization|subtitling|transcription|multilingual)/i, icon: Globe02 },
  { test: /(editing|proofread|copyedit|line edit|fact check|style guide enforce)/i, icon: Edit03 },
  { test: /(seo writ|blog|pillar page|content brief|internal linking)/i, icon: Edit03 },
  { test: /(script|youtube script|podcast script|explainer|tv script|film script|ad script)/i, icon: Headphones01 },
  { test: /(academic|research paper|thesis|literature review|journal|grant|proposal|rfp|fundraising|case statement)/i, icon: BookOpen01 },
  { test: /(ux writ|microcopy|onboarding copy|error message|notification|empty state)/i, icon: Type01 },

  // Research
  { test: /(market research|consumer insight|competitive analysis|sizing|tam|positioning research|brand awareness|channel research)/i, icon: PieChart02 },
  { test: /(user research|persona|journey|card sort|tree test|diary|focus group|ethnograph)/i, icon: Users02 },
  { test: /(academic research|literature|systematic review|meta-analysis|white paper|peer review|citation)/i, icon: BookOpen01 },
  { test: /(clinical|trial|protocol|regulatory|biostatist|patient|pharmacovig|medical writ)/i, icon: Heart },
  { test: /(survey|questionnaire|sampling|nps|csat|response analysis)/i, icon: FileSearch02 },
  { test: /(qualitative|in-depth interview|grounded theory|content analysis|narrative|phenomenolog|thematic)/i, icon: MessageSquare02 },
  { test: /(sentiment|social listening|brand monitor|review mining|nlp|emotion|trend detection)/i, icon: Heart },
  { test: /(industry analysis|porter|pestle|value chain|benchmarking|trend forecast|vertical)/i, icon: BarChart02 },
  { test: /(competitive intelligence|swot|patent|win-loss|pricing intel|teardown|feature comparison)/i, icon: Target04 },
  { test: /(data analysis|statistical|regression|time series|exploratory|data clean)/i, icon: BarChart02 },

  // Business / consulting
  { test: /(strategy consult|growth strategy|business model|vision|strategic plan|okr)/i, icon: Target04 },
  { test: /(project management|agile|scrum|kanban|pmo|roadmap plan|risk manage)/i, icon: Layers2 },
  { test: /(financial|finance|valuation|cap table|fundraising|unit economic|forecast|budget|revenue forecast|cash flow|fp&a|fpa)/i, icon: DollarSign },
  { test: /(hr|recruit|talent acquisition|org design|compensation|onboarding program|performance management|policies)/i, icon: Users02 },
  { test: /(legal|compliance|contract|trademark|gdpr|terms of service|nda|regulatory filing|privacy)/i, icon: Lock },
  { test: /(operations|process optim|supply chain|six sigma|sop|workflow|vendor)/i, icon: Settings02 },
  { test: /(sales|crm|enablement|outbound|revenue operation|pipeline manag|playbook)/i, icon: TrendingUp },
  { test: /(customer success|retention strategy|qbr|health scoring|cs tooling)/i, icon: Heart },
  { test: /(business analysis|requirements|process map|gap analysis|stakeholder|use case|bpmn)/i, icon: FileSearch02 },
  { test: /(change management|transformation|culture|adoption|executive align|training program)/i, icon: Users02 },
  { test: /(accounting|bookkeeping|tax|payroll|quickbooks|month-end)/i, icon: DollarSign },
  { test: /(coaching|leadership|founder|career coach|360 review|mentor)/i, icon: Star01 },
]

const DEFAULT_ICON: IconComponent = Stars02

/**
 * Deterministic fallback pool used when the preferred icon for a
 * subcategory is already taken on the same page. Order is stable so
 * rendering is consistent across refreshes.
 */
const FALLBACK_POOL: IconComponent[] = [
  Layout, Palette, Image03, Cube01, Camera01, Film02, Monitor02,
  Smartphone, Code01, Server04, Cloud01, Link04, Cpu, Zap,
  Database01, BarChart02, PieChart02, Shield02, Check, Tool01,
  Settings02, Search, BookOpen01, Mail02, Send02, TrendingUp,
  Lightbulb05, MessageSquare02, MarkerPin02, Edit03, FileText,
  Globe02, Headphones01, Type01, Users02, Heart, FileSearch02,
  Target04, Layers2, DollarSign, Lock, Briefcase, Star01, Stars02,
]

export function resolveSubcategoryIcon(
  slug: string | undefined,
  name: string | undefined
): IconComponent {
  const haystack = `${slug ?? ""} ${name ?? ""}`.toLowerCase()
  for (const rule of ICON_RULES) {
    if (rule.test.test(haystack)) return rule.icon
  }
  return DEFAULT_ICON
}

/**
 * Resolve icons for a list of subcategories, guaranteeing each item
 * gets a unique icon on the page. First pass uses the keyword resolver;
 * collisions are resolved by walking the fallback pool in order.
 *
 * Returns a Map keyed by the item's slug (or name as fallback).
 */
export function resolveUniqueSubcategoryIcons(
  items: Array<{ slug?: string; name?: string }>
): Map<string, IconComponent> {
  const result = new Map<string, IconComponent>()
  const used = new Set<IconComponent>()

  // Pass 1: preferred icon from the resolver, skip collisions.
  const pending: Array<{ key: string; slug?: string; name?: string }> = []
  for (const item of items) {
    const key = item.slug || item.name || ""
    const preferred = resolveSubcategoryIcon(item.slug, item.name)
    if (!used.has(preferred)) {
      used.add(preferred)
      result.set(key, preferred)
    } else {
      pending.push({ key, slug: item.slug, name: item.name })
    }
  }

  // Pass 2: assign unused icons from the fallback pool to collisions.
  let cursor = 0
  for (const item of pending) {
    while (cursor < FALLBACK_POOL.length && used.has(FALLBACK_POOL[cursor])) {
      cursor++
    }
    if (cursor < FALLBACK_POOL.length) {
      const pick = FALLBACK_POOL[cursor]
      used.add(pick)
      result.set(item.key, pick)
      cursor++
    } else {
      // Out of fallback icons — accept a repeat of the preferred icon.
      result.set(item.key, resolveSubcategoryIcon(item.slug, item.name))
    }
  }

  return result
}

/**
 * Pre-rendered tile component used on every browse-by-category card.
 * Stripe/Linear pattern: 40px rounded-xl, soft tinted bg, single-color icon.
 *
 * Accepts an optional `icon` override so callers using
 * `resolveUniqueSubcategoryIcons` can guarantee uniqueness per page.
 */
export function SubcategoryIconTile({
  slug,
  name,
  icon,
  className,
}: {
  slug?: string
  name?: string
  icon?: IconComponent
  className?: string
}) {
  const Icon = icon ?? resolveSubcategoryIcon(slug, name)
  return (
    <div
      className={
        "size-[40px] rounded-xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center text-primary-600 " +
        (className ?? "")
      }
    >
      <Icon className="size-[20px]" />
    </div>
  )
}

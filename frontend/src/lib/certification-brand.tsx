import type { ComponentType, SVGProps } from "react"
import {
  AdobeBrand,
  AirbnbBrand,
  AmazonBrand,
  AmdBrand,
  AmericanExpressBrand,
  AndroidBrand,
  AngelListBrand,
  AngularBrand,
  AppleBrand,
  AsanaBrand,
  AtlassianBrand,
  AutodeskBrand,
  BasecampBrand,
  BehanceBrand,
  BluetoothBrand,
  CPlusPlusBrand,
  ChromeBrand,
  CodepenBrand,
  Css3Brand,
  DellBrand,
  DiscordBrand,
  DockerBrand,
  DribbbleBrand,
  DropboxBrand,
  DrupalBrand,
  EnvatoBrand,
  EvernoteBrand,
  FacebookBrand,
  FedoraBrand,
  FigmaBrand,
  FirefoxBrand,
  FlickrBrand,
  FoursquareBrand,
  FramerBrand,
  FreebsdBrand,
  GeneralElectricBrand,
  GitBrand,
  GithubBrand,
  GitlabBrand,
  GoBrand,
  GoogleBrand,
  Html5Brand,
  IbmBrand,
  InstagramBrand,
  IntelBrand,
  IntercomBrand,
  InvisionBrand,
  JavaBrand,
  JbIntelliJIdeaBrand,
  JbKotlinBrand,
  JoomlaBrand,
  JqueryBrand,
  JsBrand,
  KickstarterBrand,
  LineBrand,
  LinearBrand,
  LinkedinBrand,
  LinuxBrand,
  LoomBrand,
  MailchimpBrand,
  MastercardBrand,
  MediumBrand,
  MicrosoftBrand,
  NetflixBrand,
  NodeJsBrand,
  NotionBrand,
  NpmBrand,
  OperaBrand,
  PatreonBrand,
  PaypalBrand,
  PhpBrand,
  PinterestBrand,
  PlaystationBrand,
  ProcreateBrand,
  ProductHuntBrand,
  PythonBrand,
  QuoraBrand,
  RLangBrand,
  ReactBrand,
  RedditBrand,
  ReduxBrand,
  RubyBrand,
  ShopifyBrand,
  SketchBrand,
  SlackBrand,
  SnapchatBrand,
  SoundCloudBrand,
  SpotifyBrand,
  StackOverflowBrand,
  SteamBrand,
  StripeBrand,
  SublimeTextBrand,
  SwiftBrand,
  TechCrunchBrand,
  TelegramBrand,
  TiktokBrand,
  TinderBrand,
  TrelloBrand,
  TripadvisorBrand,
  TumblerBrand,
  TwitchBrand,
  TwitterBrand,
  UbuntuBrand,
  ViberBrand,
  VimeoBrand,
  VisaBrand,
  VsCodeBrand,
  VueBrand,
  WechatBrand,
  WhatsappBrand,
  WordpressBrand,
  YandexBrand,
  YoutubeBrand,
  ZapierBrand,
  ZendeskBrand,
  ZeplinBrand,
  ZoomBrand,
} from "@blend-metrics/icons/brands"

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>

export type CertificationBrand =
  | { type: "component"; name: string; Icon: BrandIcon }
  | { type: "remote-svg"; name: string; url: string; faviconUrl: string }

type LocalBrand = { name: string; Icon: BrandIcon }

const BRAND_HOSTS: ReadonlyArray<readonly [string[], LocalBrand]> = [
  [["adobe.com"], { name: "Adobe", Icon: AdobeBrand }],
  [["airbnb.com"], { name: "Airbnb", Icon: AirbnbBrand }],
  [["amazon.com", "aws.amazon.com", "aws.training"], { name: "Amazon Web Services", Icon: AmazonBrand }],
  [["amd.com"], { name: "AMD", Icon: AmdBrand }],
  [["americanexpress.com"], { name: "American Express", Icon: AmericanExpressBrand }],
  [["android.com"], { name: "Android", Icon: AndroidBrand }],
  [["angel.co", "wellfound.com"], { name: "AngelList", Icon: AngelListBrand }],
  [["angular.io", "angular.dev"], { name: "Angular", Icon: AngularBrand }],
  [["apple.com"], { name: "Apple", Icon: AppleBrand }],
  [["asana.com"], { name: "Asana", Icon: AsanaBrand }],
  [["atlassian.com", "jira.com", "trello.com", "bitbucket.org", "confluence.com", "statuspage.io", "opsgenie.com"], { name: "Atlassian", Icon: AtlassianBrand }],
  [["autodesk.com"], { name: "Autodesk", Icon: AutodeskBrand }],
  [["basecamp.com"], { name: "Basecamp", Icon: BasecampBrand }],
  [["behance.net"], { name: "Behance", Icon: BehanceBrand }],
  [["bluetooth.com"], { name: "Bluetooth SIG", Icon: BluetoothBrand }],
  [["isocpp.org", "cplusplus.com"], { name: "C++", Icon: CPlusPlusBrand }],
  [["chrome.google.com", "chromium.org"], { name: "Chrome", Icon: ChromeBrand }],
  [["codepen.io"], { name: "CodePen", Icon: CodepenBrand }],
  [["w3.org"], { name: "W3C", Icon: Css3Brand }],
  [["dell.com"], { name: "Dell", Icon: DellBrand }],
  [["discord.com", "discord.gg"], { name: "Discord", Icon: DiscordBrand }],
  [["docker.com"], { name: "Docker", Icon: DockerBrand }],
  [["dribbble.com"], { name: "Dribbble", Icon: DribbbleBrand }],
  [["dropbox.com"], { name: "Dropbox", Icon: DropboxBrand }],
  [["drupal.org"], { name: "Drupal", Icon: DrupalBrand }],
  [["envato.com", "tutsplus.com"], { name: "Envato", Icon: EnvatoBrand }],
  [["evernote.com"], { name: "Evernote", Icon: EvernoteBrand }],
  [["facebook.com", "meta.com", "fb.com", "messenger.com", "instagram.com"], { name: "Meta", Icon: FacebookBrand }],
  [["fedoraproject.org"], { name: "Fedora", Icon: FedoraBrand }],
  [["figma.com"], { name: "Figma", Icon: FigmaBrand }],
  [["firefox.com", "mozilla.org"], { name: "Mozilla", Icon: FirefoxBrand }],
  [["flickr.com"], { name: "Flickr", Icon: FlickrBrand }],
  [["foursquare.com"], { name: "Foursquare", Icon: FoursquareBrand }],
  [["framer.com"], { name: "Framer", Icon: FramerBrand }],
  [["freebsd.org"], { name: "FreeBSD", Icon: FreebsdBrand }],
  [["ge.com", "generalelectric.com"], { name: "General Electric", Icon: GeneralElectricBrand }],
  [["git-scm.com"], { name: "Git", Icon: GitBrand }],
  [["github.com"], { name: "GitHub", Icon: GithubBrand }],
  [["gitlab.com"], { name: "GitLab", Icon: GitlabBrand }],
  [["go.dev", "golang.org"], { name: "Go", Icon: GoBrand }],
  [["google.com", "cloud.google.com", "developers.google.com", "skillshop.exceedlms.com", "grow.google", "edu.google.com"], { name: "Google", Icon: GoogleBrand }],
  [["html5.org"], { name: "HTML5", Icon: Html5Brand }],
  [["ibm.com", "skillsbuild.org"], { name: "IBM", Icon: IbmBrand }],
  [["instagram.com"], { name: "Instagram", Icon: InstagramBrand }],
  [["intel.com"], { name: "Intel", Icon: IntelBrand }],
  [["intercom.com"], { name: "Intercom", Icon: IntercomBrand }],
  [["invisionapp.com"], { name: "InVision", Icon: InvisionBrand }],
  [["java.com", "oracle.com"], { name: "Oracle", Icon: JavaBrand }],
  [["jetbrains.com"], { name: "JetBrains", Icon: JbIntelliJIdeaBrand }],
  [["kotlinlang.org"], { name: "Kotlin", Icon: JbKotlinBrand }],
  [["joomla.org"], { name: "Joomla", Icon: JoomlaBrand }],
  [["jquery.com"], { name: "jQuery", Icon: JqueryBrand }],
  [["javascript.com", "ecma-international.org"], { name: "JavaScript", Icon: JsBrand }],
  [["kickstarter.com"], { name: "Kickstarter", Icon: KickstarterBrand }],
  [["line.me"], { name: "LINE", Icon: LineBrand }],
  [["linear.app"], { name: "Linear", Icon: LinearBrand }],
  [["linkedin.com", "learning.linkedin.com"], { name: "LinkedIn", Icon: LinkedinBrand }],
  [["linux.org", "kernel.org"], { name: "Linux", Icon: LinuxBrand }],
  [["loom.com"], { name: "Loom", Icon: LoomBrand }],
  [["mailchimp.com"], { name: "Mailchimp", Icon: MailchimpBrand }],
  [["mastercard.com"], { name: "Mastercard", Icon: MastercardBrand }],
  [["medium.com"], { name: "Medium", Icon: MediumBrand }],
  [["microsoft.com", "learn.microsoft.com", "docs.microsoft.com", "azure.microsoft.com", "office.com", "outlook.com", "sharepoint.com", "skype.com", "teams.microsoft.com", "xbox.com"], { name: "Microsoft", Icon: MicrosoftBrand }],
  [["netflix.com"], { name: "Netflix", Icon: NetflixBrand }],
  [["nodejs.org"], { name: "Node.js", Icon: NodeJsBrand }],
  [["notion.so", "notion.com"], { name: "Notion", Icon: NotionBrand }],
  [["npmjs.com"], { name: "npm", Icon: NpmBrand }],
  [["opera.com"], { name: "Opera", Icon: OperaBrand }],
  [["patreon.com"], { name: "Patreon", Icon: PatreonBrand }],
  [["paypal.com"], { name: "PayPal", Icon: PaypalBrand }],
  [["php.net"], { name: "PHP", Icon: PhpBrand }],
  [["pinterest.com"], { name: "Pinterest", Icon: PinterestBrand }],
  [["playstation.com"], { name: "PlayStation", Icon: PlaystationBrand }],
  [["procreate.com"], { name: "Procreate", Icon: ProcreateBrand }],
  [["producthunt.com"], { name: "Product Hunt", Icon: ProductHuntBrand }],
  [["python.org"], { name: "Python", Icon: PythonBrand }],
  [["quora.com"], { name: "Quora", Icon: QuoraBrand }],
  [["r-project.org"], { name: "R", Icon: RLangBrand }],
  [["reactjs.org", "react.dev"], { name: "React", Icon: ReactBrand }],
  [["reddit.com"], { name: "Reddit", Icon: RedditBrand }],
  [["redux.js.org"], { name: "Redux", Icon: ReduxBrand }],
  [["ruby-lang.org"], { name: "Ruby", Icon: RubyBrand }],
  [["shopify.com"], { name: "Shopify", Icon: ShopifyBrand }],
  [["sketch.com"], { name: "Sketch", Icon: SketchBrand }],
  [["slack.com"], { name: "Slack", Icon: SlackBrand }],
  [["snapchat.com"], { name: "Snapchat", Icon: SnapchatBrand }],
  [["soundcloud.com"], { name: "SoundCloud", Icon: SoundCloudBrand }],
  [["spotify.com"], { name: "Spotify", Icon: SpotifyBrand }],
  [["stackoverflow.com"], { name: "Stack Overflow", Icon: StackOverflowBrand }],
  [["steampowered.com"], { name: "Steam", Icon: SteamBrand }],
  [["stripe.com"], { name: "Stripe", Icon: StripeBrand }],
  [["sublimetext.com"], { name: "Sublime Text", Icon: SublimeTextBrand }],
  [["swift.org"], { name: "Swift", Icon: SwiftBrand }],
  [["techcrunch.com"], { name: "TechCrunch", Icon: TechCrunchBrand }],
  [["telegram.org"], { name: "Telegram", Icon: TelegramBrand }],
  [["tiktok.com"], { name: "TikTok", Icon: TiktokBrand }],
  [["tinder.com"], { name: "Tinder", Icon: TinderBrand }],
  [["trello.com"], { name: "Trello", Icon: TrelloBrand }],
  [["tripadvisor.com"], { name: "Tripadvisor", Icon: TripadvisorBrand }],
  [["tumblr.com"], { name: "Tumblr", Icon: TumblerBrand }],
  [["twitch.tv"], { name: "Twitch", Icon: TwitchBrand }],
  [["twitter.com", "x.com"], { name: "X", Icon: TwitterBrand }],
  [["ubuntu.com"], { name: "Ubuntu", Icon: UbuntuBrand }],
  [["viber.com"], { name: "Viber", Icon: ViberBrand }],
  [["vimeo.com"], { name: "Vimeo", Icon: VimeoBrand }],
  [["visa.com"], { name: "Visa", Icon: VisaBrand }],
  [["code.visualstudio.com"], { name: "Visual Studio Code", Icon: VsCodeBrand }],
  [["vuejs.org"], { name: "Vue", Icon: VueBrand }],
  [["wechat.com", "weixin.qq.com"], { name: "WeChat", Icon: WechatBrand }],
  [["whatsapp.com"], { name: "WhatsApp", Icon: WhatsappBrand }],
  [["wordpress.com", "wordpress.org"], { name: "WordPress", Icon: WordpressBrand }],
  [["yandex.com", "yandex.ru"], { name: "Yandex", Icon: YandexBrand }],
  [["youtube.com"], { name: "YouTube", Icon: YoutubeBrand }],
  [["zapier.com"], { name: "Zapier", Icon: ZapierBrand }],
  [["zendesk.com"], { name: "Zendesk", Icon: ZendeskBrand }],
  [["zeplin.io"], { name: "Zeplin", Icon: ZeplinBrand }],
  [["zoom.us"], { name: "Zoom", Icon: ZoomBrand }],
]

const HOST_TO_BRAND: Map<string, LocalBrand> = (() => {
  const map = new Map<string, LocalBrand>()
  for (const [hosts, brand] of BRAND_HOSTS) {
    for (const host of hosts) map.set(host, brand)
  }
  return map
})()

// Hostname-base -> Simple Icons slug overrides for cases where the slug
// doesn't match the second-level domain (e.g. multi-word brand names).
const SIMPLE_ICONS_SLUG_ALIAS: Record<string, string> = {
  servicenow: "servicenow",
  scrumalliance: "scrumalliance",
  khanacademy: "khanacademy",
  freecodecamp: "freecodecamp",
  amazonwebservices: "amazonwebservices",
}

// Domains that host other brands' credentials (badge aggregators). Skip them
// instead of rendering the aggregator's own logo on every cert.
const AGGREGATOR_HOSTS = new Set([
  "credly",
  "youracclaim",
  "accredible",
  "credential",
  "credentials",
  "badgr",
  "certifyme",
  "diplomasafe",
])

// Friendly display names for hostnames not in our local registry.
const REMOTE_DISPLAY_NAMES: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  oracle: "Oracle",
  cisco: "Cisco",
  coursera: "Coursera",
  udemy: "Udemy",
  edx: "edX",
  khanacademy: "Khan Academy",
  pluralsight: "Pluralsight",
  tableau: "Tableau",
  snowflake: "Snowflake",
  servicenow: "ServiceNow",
  databricks: "Databricks",
  scrumalliance: "Scrum Alliance",
  pmi: "PMI",
  freecodecamp: "freeCodeCamp",
}

const titleCase = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

export const getCertificationBrandFromUrl = (
  url: string | null | undefined
): CertificationBrand | null => {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  let hostname: string
  try {
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed.replace(/^\/+/, "")}`
    hostname = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }

  if (HOST_TO_BRAND.has(hostname)) {
    const b = HOST_TO_BRAND.get(hostname)!
    return { type: "component", name: b.name, Icon: b.Icon }
  }
  for (const host of HOST_TO_BRAND.keys()) {
    if (hostname.endsWith(`.${host}`)) {
      const b = HOST_TO_BRAND.get(host)!
      return { type: "component", name: b.name, Icon: b.Icon }
    }
  }

  const parts = hostname.split(".")
  if (parts.length < 2) return null
  const sld = parts[parts.length - 2]
  if (!sld || !/^[a-z0-9-]+$/.test(sld)) return null
  if (AGGREGATOR_HOSTS.has(sld)) return null

  const slug = SIMPLE_ICONS_SLUG_ALIAS[sld] ?? sld
  const name = REMOTE_DISPLAY_NAMES[sld] ?? titleCase(sld)
  return {
    type: "remote-svg",
    name,
    url: `https://cdn.simpleicons.org/${slug}`,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
  }
}

export const getBrandIconFromUrl = (
  url: string | null | undefined
): BrandIcon | null => {
  const brand = getCertificationBrandFromUrl(url)
  return brand?.type === "component" ? brand.Icon : null
}

export const getIssuerNameFromUrl = (url: string | null | undefined): string | null =>
  getCertificationBrandFromUrl(url)?.name ?? null

// Override the favicon domain for well-known schools where the normalized
// name doesn't map to the actual domain (e.g. "University of California,
// Irvine" -> "uci.edu", not "universityofcaliforniairvine.edu").
const KNOWN_SCHOOL_DOMAINS: Record<string, string> = {
  // University of California system
  universityofcaliforniaberkeley: "berkeley.edu",
  ucberkeley: "berkeley.edu",
  universityofcalifornialosangeles: "ucla.edu",
  ucla: "ucla.edu",
  universityofcaliforniasandiego: "ucsd.edu",
  ucsd: "ucsd.edu",
  universityofcaliforniairvine: "uci.edu",
  uci: "uci.edu",
  universityofcaliforniasanfrancisco: "ucsf.edu",
  ucsf: "ucsf.edu",
  universityofcaliforniasantabarbara: "ucsb.edu",
  ucsb: "ucsb.edu",
  universityofcaliforniasantacruz: "ucsc.edu",
  ucsc: "ucsc.edu",
  universityofcaliforniadavis: "ucdavis.edu",
  ucdavis: "ucdavis.edu",
  universityofcaliforniariverside: "ucr.edu",
  ucr: "ucr.edu",
  universityofcaliforniamerced: "ucmerced.edu",
  ucmerced: "ucmerced.edu",
  // Ivies + Stanford + MIT
  harvarduniversity: "harvard.edu",
  harvard: "harvard.edu",
  yaleuniversity: "yale.edu",
  yale: "yale.edu",
  princetonuniversity: "princeton.edu",
  princeton: "princeton.edu",
  columbiauniversity: "columbia.edu",
  columbia: "columbia.edu",
  brownuniversity: "brown.edu",
  brown: "brown.edu",
  dartmouthcollege: "dartmouth.edu",
  dartmouth: "dartmouth.edu",
  cornelluniversity: "cornell.edu",
  cornell: "cornell.edu",
  universityofpennsylvania: "upenn.edu",
  upenn: "upenn.edu",
  massachusettsinstituteoftechnology: "mit.edu",
  mit: "mit.edu",
  stanforduniversity: "stanford.edu",
  stanford: "stanford.edu",
  // Other commonly-listed
  carnegiemellon: "cmu.edu",
  carnegiemellonuniversity: "cmu.edu",
  cmu: "cmu.edu",
  newyorkuniversity: "nyu.edu",
  nyu: "nyu.edu",
  universityofmichigan: "umich.edu",
  umich: "umich.edu",
  universityoftexasataustin: "utexas.edu",
  utexas: "utexas.edu",
  universityofwashington: "washington.edu",
  georgiatech: "gatech.edu",
  georgiainstituteoftechnology: "gatech.edu",
  gatech: "gatech.edu",
  // UK universities (ac.uk)
  oxforduniversity: "ox.ac.uk",
  universityofoxford: "ox.ac.uk",
  oxford: "ox.ac.uk",
  cambridgeuniversity: "cam.ac.uk",
  universityofcambridge: "cam.ac.uk",
  cambridge: "cam.ac.uk",
}

const companyNameToSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(
      /\s+(inc\.?|corp\.?|corporation|llc|ltd\.?|limited|gmbh|s\.?a\.?|plc|co\.?|company|the|university|college|institute|school)$/gi,
      ""
    )
    .replace(/^the\s+/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
}

export const getCompanyBrandFromName = (
  name: string | null | undefined,
  options?: { faviconTld?: "com" | "edu" | "org" }
): CertificationBrand | null => {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  const slug = companyNameToSlug(trimmed)
  if (!slug || slug.length < 2) return null

  for (const [host, brand] of HOST_TO_BRAND) {
    const parts = host.split(".")
    // Only match the apex domain (e.g. "google.com"), not subdomains
    // (e.g. "chrome.google.com" must NOT match slug "google").
    if (parts.length === 2 && parts[0] === slug) {
      return { type: "component", name: brand.name, Icon: brand.Icon }
    }
  }

  if (AGGREGATOR_HOSTS.has(slug)) return null

  const remoteSlug = SIMPLE_ICONS_SLUG_ALIAS[slug] ?? slug
  const tld = options?.faviconTld ?? "com"
  const favDomain =
    options?.faviconTld === "edu"
      ? (KNOWN_SCHOOL_DOMAINS[slug] ?? `${slug}.${tld}`)
      : `${slug}.${tld}`
  return {
    type: "remote-svg",
    name: REMOTE_DISPLAY_NAMES[slug] ?? trimmed,
    url: `https://cdn.simpleicons.org/${remoteSlug}`,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(favDomain)}&sz=64`,
  }
}

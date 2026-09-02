export const MARKETPLACE_SECONDARY_NAV_PATHS = [
  "/",
  "/talent-profile",
  "/my-team",
  "/favorite-projects",
  "/favorite-talent",
  "/browser-history",
  "/search",
  "/talent-search",
  "/projects",
  "/services",
  "/teams",
  "/talent",
  "/find-jobs",
]

export const hasMarketplaceSecondaryNav = (pathname: string) =>
  MARKETPLACE_SECONDARY_NAV_PATHS.includes(pathname) ||
  pathname === "/favorites" ||
  pathname.startsWith("/favorites/") ||
  pathname.startsWith("/c/") ||
  pathname.startsWith("/project-details/") ||
  pathname.startsWith("/job-details/")

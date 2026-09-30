// frontend/src/lib/api/favorites.ts
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { getCsrfToken } from "../csrf"

const favoritesApiBase = () => {
  const explicit = process.env.NEXT_PUBLIC_FAVORITES_API_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const apiBase = getPublicApiUrl() || "http://localhost:4000"
  return `${apiBase.replace(/\/$/, "")}/favorites`
}

function authHeaders(method?: string): HeadersInit {
  const token = getCsrfToken()
  return {
    "Content-Type": "application/json",
    ...(token && method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)
      ? { "X-CSRF-Token": token }
      : {}),
  }
}

// ── Types ──────────────────────────────────────────────

export type FavoriteType = "project" | "talent" | "job" | "service" | "team"

export interface Favorite {
  id: string
  type: FavoriteType
  itemId: string
  groupId: string
  userId: string
  createdAt: string
}

export interface FavoriteGroup {
  id: string
  name: string
  userId: string
  defaultType?: FavoriteType | null
  favorites: Favorite[]
  createdAt: string
  updatedAt: string
}

export interface CreateFavoriteDto {
  type: FavoriteType
  itemId: string
  groupId?: string
}

export interface CreateGroupDto {
  name: string
  defaultType?: FavoriteType
}

export interface UpdateFavoriteDto {
  groupId: string
}

export interface RenameGroupDto {
  name: string
}

// ── Group Endpoints ────────────────────────────────────

/** Create a new favorites group */
export async function createGroup(
  dto: CreateGroupDto
): Promise<FavoriteGroup | null> {
  try {
    const res = await fetch(`${favoritesApiBase()}/groups`, {
      method: "POST",
      headers: authHeaders("POST"),
      credentials: "include",
      body: JSON.stringify(dto),
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error creating group:", error)
    return null
  }
}

/** Get all groups for the current user (includes favorites in each group) */
export async function getGroups(): Promise<FavoriteGroup[]> {
  try {
    const res = await fetch(`${favoritesApiBase()}/groups`, {
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching groups:", error)
    return []
  }
}

/** Rename a favorites group */
export async function renameGroup(
  groupId: string,
  dto: RenameGroupDto
): Promise<FavoriteGroup | null> {
  try {
    const res = await fetch(`${favoritesApiBase()}/groups/${groupId}`, {
      method: "PATCH",
      headers: authHeaders("PATCH"),
      credentials: "include",
      body: JSON.stringify(dto),
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error renaming group:", error)
    return null
  }
}

/** Delete a favorites group (cascades to all favorites in it) */
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const res = await fetch(`${favoritesApiBase()}/groups/${groupId}`, {
      method: "DELETE",
      headers: authHeaders("DELETE"),
      credentials: "include",
    })
    return res.ok
  } catch (error) {
    console.error("Error deleting group:", error)
    return false
  }
}

// ── Favorite Endpoints ─────────────────────────────────

/**
 * GET /favorites — returns groups with nested favorites (per docs).
 * Optional type filter narrows which favorites appear.
 */
export async function getAllFavoritesGrouped(
  type?: FavoriteType
): Promise<FavoriteGroup[]> {
  try {
    const base = favoritesApiBase()
    const url = type ? `${base}?type=${type}` : base
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return []
  }
}

/**
 * Flatten groups into a flat array of favorites.
 * Used by helpers that need to search across all favorites.
 */
export async function getAllFavorites(
  type?: FavoriteType
): Promise<Favorite[]> {
  const groups = await getAllFavoritesGrouped(type)
  return groups.flatMap((g) => g.favorites)
}

/** Add a favorite */
export async function addFavorite(
  dto: CreateFavoriteDto
): Promise<Favorite | null> {
  try {
    const res = await fetch(favoritesApiBase(), {
      method: "POST",
      headers: authHeaders("POST"),
      credentials: "include",
      body: JSON.stringify(dto),
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error adding favorite:", error)
    return null
  }
}

/** Move a favorite to a different group */
export async function moveFavorite(
  favoriteId: string,
  dto: UpdateFavoriteDto
): Promise<Favorite | null> {
  try {
    const res = await fetch(`${favoritesApiBase()}/${favoriteId}`, {
      method: "PATCH",
      headers: authHeaders("PATCH"),
      credentials: "include",
      body: JSON.stringify(dto),
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error moving favorite:", error)
    return null
  }
}

/** Remove a favorite */
export async function removeFavorite(favoriteId: string): Promise<boolean> {
  try {
    const res = await fetch(`${favoritesApiBase()}/${favoriteId}`, {
      method: "DELETE",
      headers: authHeaders("DELETE"),
      credentials: "include",
    })
    return res.ok
  } catch (error) {
    console.error("Error removing favorite:", error)
    return false
  }
}

// ── Convenience Helpers ────────────────────────────────

/** Find favorite by itemId (searches all user favorites) */
export async function findFavoriteByItemId(
  itemId: string
): Promise<Favorite | null> {
  try {
    const favorites = await getAllFavorites()
    return favorites.find((fav) => fav.itemId === itemId) || null
  } catch (error) {
    console.error("Error finding favorite:", error)
    return null
  }
}

/** Find favorite by type and itemId. */
export async function findFavoriteByTypeAndItemId(
  type: FavoriteType,
  itemId: string
): Promise<Favorite | null> {
  try {
    const favorites = await getAllFavorites(type)
    return favorites.find((fav) => fav.itemId === itemId) || null
  } catch (error) {
    console.error("Error finding favorite:", error)
    return null
  }
}

/** Check if an item is favorited */
export async function isFavorited(itemId: string): Promise<boolean> {
  const favorite = await findFavoriteByItemId(itemId)
  return favorite !== null
}

/** Get favorites by group ID (from groups endpoint for efficiency) */
export async function getFavoritesByGroup(
  groupId: string
): Promise<Favorite[]> {
  try {
    const groups = await getGroups()
    const group = groups.find((g) => g.id === groupId)
    return group?.favorites ?? []
  } catch (error) {
    console.error("Error getting group favorites:", error)
    return []
  }
}

/** Get favorites count */
export async function getFavoritesCount(): Promise<number> {
  const favorites = await getAllFavorites()
  return favorites.length
}

/** Get project favorites using server-side type filter */
export async function getProjectFavorites(): Promise<Favorite[]> {
  return getAllFavorites("project")
}

/** Get service favorites using server-side type filter */
export async function getServiceFavorites(): Promise<Favorite[]> {
  return getAllFavorites("service")
}

/** Get team favorites using server-side type filter */
export async function getTeamFavorites(): Promise<Favorite[]> {
  return getAllFavorites("team")
}

/** Get talent favorites using server-side type filter */
export async function getTalentFavorites(): Promise<Favorite[]> {
  return getAllFavorites("talent")
}

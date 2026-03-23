// frontend/src/lib/api/favorites.ts

import Cookies from "js-cookie"

const FAVORITES_API_URL =
  process.env.NEXT_PUBLIC_FAVORITES_API_URL || "http://localhost:3012/favorites"

function authHeaders(): HeadersInit {
  const token = Cookies.get("access_token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
}

export interface UpdateFavoriteDto {
  groupId: string
}

// ── Group Endpoints ────────────────────────────────────

/** Create a new favorites group */
export async function createGroup(dto: CreateGroupDto): Promise<FavoriteGroup | null> {
  try {
    const res = await fetch(`${FAVORITES_API_URL}/groups`, {
      method: "POST",
      headers: authHeaders(),
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
    const res = await fetch(`${FAVORITES_API_URL}/groups`, {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching groups:", error)
    return []
  }
}

/** Delete a favorites group (cascades to all favorites in it) */
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const res = await fetch(`${FAVORITES_API_URL}/groups/${groupId}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    return res.ok
  } catch (error) {
    console.error("Error deleting group:", error)
    return false
  }
}

// ── Favorite Endpoints ─────────────────────────────────

/** Get all favorites, optionally filtered by type */
export async function getAllFavorites(type?: FavoriteType): Promise<Favorite[]> {
  try {
    const url = type
      ? `${FAVORITES_API_URL}?type=${type}`
      : FAVORITES_API_URL
    const res = await fetch(url, {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return []
  }
}

/** Add a favorite */
export async function addFavorite(dto: CreateFavoriteDto): Promise<Favorite | null> {
  try {
    const res = await fetch(FAVORITES_API_URL, {
      method: "POST",
      headers: authHeaders(),
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
    const res = await fetch(`${FAVORITES_API_URL}/${favoriteId}`, {
      method: "PATCH",
      headers: authHeaders(),
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
    const res = await fetch(`${FAVORITES_API_URL}/${favoriteId}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    return res.ok
  } catch (error) {
    console.error("Error removing favorite:", error)
    return false
  }
}

// ── Convenience Helpers ────────────────────────────────

/** Find favorite by itemId (searches all user favorites) */
export async function findFavoriteByItemId(itemId: string): Promise<Favorite | null> {
  try {
    const favorites = await getAllFavorites()
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
export async function getFavoritesByGroup(groupId: string): Promise<Favorite[]> {
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

import AxiosRequest from ".."

export type FavoriteType = "talent" | "project" | "service" | "job" | "team"

export interface Favorite {
  id: string
  userId: string
  groupId: string
  type: FavoriteType
  itemId: string
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

export const FavoritesAPI = {
  getGroups: () =>
    AxiosRequest.get("/favorites/groups"),

  createGroup: (name: string) =>
    AxiosRequest.post("/favorites/groups", { name }),

  deleteGroup: (groupId: string) =>
    AxiosRequest.del(`/favorites/groups/${groupId}`),

  getFavorites: (type?: FavoriteType) =>
    AxiosRequest.get("/favorites", type ? { params: { type } } : {}),

  addFavorite: (data: { type: FavoriteType; itemId: string; groupId?: string }) =>
    AxiosRequest.post("/favorites", data),

  moveFavorite: (id: string, groupId: string) =>
    AxiosRequest.patch(`/favorites/${id}`, { groupId }),

  removeFavorite: (id: string) =>
    AxiosRequest.del(`/favorites/${id}`),
}

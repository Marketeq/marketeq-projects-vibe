import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FavoritesAPI, FavoriteType } from "@/service/http/favorites"

const KEYS = {
  groups: ["favorites", "groups"] as const,
  list: (type?: FavoriteType) => ["favorites", "list", type] as const,
}

export function useFavoriteGroups() {
  return useQuery({
    queryKey: KEYS.groups,
    queryFn: async () => {
      const res = await FavoritesAPI.getGroups()
      return res.data
    },
  })
}

export function useFavorites(type?: FavoriteType) {
  return useQuery({
    queryKey: KEYS.list(type),
    queryFn: async () => {
      const res = await FavoritesAPI.getFavorites(type)
      return res.data
    },
  })
}

export function useAddFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: FavoriteType; itemId: string; groupId?: string }) =>
      FavoritesAPI.addFavorite(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useMoveFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, groupId }: { id: string; groupId: string }) =>
      FavoritesAPI.moveFavorite(id, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useRemoveFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => FavoritesAPI.removeFavorite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => FavoritesAPI.createGroup(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.groups })
    },
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => FavoritesAPI.deleteGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

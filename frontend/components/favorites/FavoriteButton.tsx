"use client"

import type { FavoriteType } from "@/service/http/favorites"
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from "@/src/hooks/useFavorites"
import { cn } from "@/utils/functions"
import { Favorite, FavoriteRoot } from "@/components/ui"

interface FavoriteButtonProps {
  type: FavoriteType
  itemId: string
  className?: string
}

export function FavoriteButton({
  type,
  itemId,
  className,
}: FavoriteButtonProps) {
  const { data: favorites = [] } = useFavorites(type)
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  const existing = favorites.find((f: any) => f.itemId === itemId)
  const isFavorited = !!existing

  const handleToggle = (pressed: boolean) => {
    if (pressed) {
      addFavorite.mutate({ type, itemId })
    } else if (existing) {
      removeFavorite.mutate(existing.id)
    }
  }

  return (
    <FavoriteRoot value={isFavorited} onValueChange={handleToggle}>
      {({ pressed }) => (
        <Favorite
          className={cn(className)}
          aria-label={pressed ? "Remove from favorites" : "Add to favorites"}
          disabled={addFavorite.isPending || removeFavorite.isPending}
        />
      )}
    </FavoriteRoot>
  )
}

"use client"

import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { FavoriteGroupList } from "@/components/favorites/FavoriteGroupList"

function FavoritesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <FavoriteGroupList />
    </div>
  )
}

export default AuthenticatedRoute(FavoritesPage)

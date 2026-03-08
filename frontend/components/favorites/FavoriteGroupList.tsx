"use client"

import { useState } from "react"
import { useFavoriteGroups, useRemoveFavorite, useMoveFavorite, useCreateGroup, useDeleteGroup } from "@/src/hooks/useFavorites"
import { FavoriteGroup, Favorite } from "@/service/http/favorites"
import { Button, IconButton, Input } from "@/components/ui"
import { Plus, Trash01, X } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"

const TYPE_LABELS: Record<string, string> = {
  talent: "Talent",
  project: "Project",
  service: "Service",
  job: "Job",
  team: "Team",
}

function FavoriteItem({
  fav,
  groups,
}: {
  fav: Favorite
  groups: FavoriteGroup[]
}) {
  const remove = useRemoveFavorite()
  const move = useMoveFavorite()

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
          {TYPE_LABELS[fav.type] ?? fav.type}
        </span>
        <span className="truncate text-sm text-gray-700 font-medium">{fav.itemId}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          defaultValue={fav.groupId}
          onChange={(e) => move.mutate({ id: fav.id, groupId: e.target.value })}
          disabled={move.isPending}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <IconButton
          aria-label="Remove favorite"
          className="h-7 w-7 text-gray-400 hover:text-red-500"
          onClick={() => remove.mutate(fav.id)}
          disabled={remove.isPending}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}

function NewGroupForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const create = useCreateGroup()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(name.trim(), { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        autoFocus
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm"
      />
      <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
        {create.isPending ? "Creating..." : "Create"}
      </Button>
      <Button type="button" size="sm" variant="outlined" onClick={onDone}>
        Cancel
      </Button>
    </form>
  )
}

export function FavoriteGroupList() {
  const { data: groups = [], isLoading } = useFavoriteGroups()
  const deleteGroup = useDeleteGroup()
  const [showNewGroup, setShowNewGroup] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-sm text-gray-400">
        Loading favorites...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">My Favorites</h1>
        <Button
          size="sm"
          variant="outlined"
          onClick={() => setShowNewGroup(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          New Group
        </Button>
      </div>

      {showNewGroup && <NewGroupForm onDone={() => setShowNewGroup(false)} />}

      {groups.length === 0 && !showNewGroup && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No favorites yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Click the star on any listing to save it here.
          </p>
        </div>
      )}

      {(groups as FavoriteGroup[]).map((group) => (
        <div key={group.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">{group.name}</h2>
            <IconButton
              aria-label="Delete group"
              className="h-7 w-7 text-gray-400 hover:text-red-500"
              onClick={() => deleteGroup.mutate(group.id)}
              disabled={deleteGroup.isPending}
            >
              <Trash01 className="h-4 w-4" />
            </IconButton>
          </div>

          {group.favorites.length === 0 ? (
            <p className="text-xs text-gray-400 pl-1">No items in this group.</p>
          ) : (
            <div className="space-y-2">
              {group.favorites.map((fav) => (
                <FavoriteItem key={fav.id} fav={fav} groups={groups as FavoriteGroup[]} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

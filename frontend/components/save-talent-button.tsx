"use client"

import { useCallback, useEffect, useState } from "react"
import {
  type Favorite,
  type FavoriteGroup,
  addFavorite,
  createGroup,
  getGroups,
  getTalentFavorites,
  moveFavorite,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { ChevronDown, Plus, Star } from "@blend-metrics/icons"
import { useToggle } from "react-use"
import { toast } from "@/components/ui/toast/use-toast"
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Toggle,
  buttonVariants,
} from "@/components/ui"

interface SaveTalentButtonProps {
  userId: string | null | undefined
}

export function SaveTalentButton({ userId }: SaveTalentButtonProps) {
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [loading, setLoading] = useState(false)
  const [createOpen, toggleCreateOpen] = useToggle(false)
  const [newGroupName, setNewGroupName] = useState("")

  const refresh = useCallback(async () => {
    if (!userId) {
      setFavorite(null)
      return
    }
    const [g, talentFavs] = await Promise.all([
      getGroups(),
      getTalentFavorites(),
    ])
    setGroups(
      g.filter((x) => x.defaultType == null || x.defaultType === "talent")
    )
    setFavorite(talentFavs.find((f) => f.itemId === userId) ?? null)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isSaved = !!favorite
  const disabled = !userId

  const handleToggle = async () => {
    if (!userId || loading) return
    setLoading(true)
    try {
      if (isSaved && favorite) {
        const ok = await removeFavorite(favorite.id)
        if (ok) setFavorite(null)
        else toast({ title: "Could not remove from favorites" })
      } else {
        const fav = await addFavorite({ type: "talent", itemId: userId })
        if (fav) {
          setFavorite(fav)
          await refresh()
        } else {
          toast({ title: "Could not save to favorites" })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGroup = async (groupId: string) => {
    if (!userId || loading || !groupId) return
    setLoading(true)
    try {
      if (favorite) {
        if (favorite.groupId === groupId) return
        const moved = await moveFavorite(favorite.id, { groupId })
        if (moved) setFavorite(moved)
      } else {
        const fav = await addFavorite({
          type: "talent",
          itemId: userId,
          groupId,
        })
        if (fav) setFavorite(fav)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name) return
    const newG = await createGroup({ name, defaultType: "talent" })
    if (!newG) {
      toast({ title: "Could not create list" })
      return
    }
    setGroups((prev) => [...prev, newG])
    setNewGroupName("")
    toggleCreateOpen(false)
    if (userId) {
      const fav = await addFavorite({
        type: "talent",
        itemId: userId,
        groupId: newG.id,
      })
      if (fav) setFavorite(fav)
    }
  }

  return (
    <div className="flex items-center">
      <Toggle
        pressed={isSaved}
        onPressedChange={handleToggle}
        disabled={disabled || loading}
        className={buttonVariants({
          className:
            "group border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-[12.75px] lg:size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-hover:group-data-[state=on]:text-primary-500 group-data-[state=on]:text-primary-500 group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
            disabled={disabled}
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          {groups.length === 0 ? (
            <DropdownMenuItem disabled className="text-gray-400">
              No lists yet
            </DropdownMenuItem>
          ) : (
            <DropdownMenuRadioGroup
              value={favorite?.groupId ?? ""}
              onValueChange={handleSelectGroup}
            >
              {groups.map((g) => (
                <DropdownMenuRadioTrigger key={g.id} value={g.id}>
                  {g.name}
                </DropdownMenuRadioTrigger>
              ))}
            </DropdownMenuRadioGroup>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toggleCreateOpen()}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={toggleCreateOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Create New List</DialogTitle>
          <form
            onSubmit={handleCreateGroup}
            className="flex items-center gap-x-3"
          >
            <Input
              autoFocus
              placeholder="Enter List Name"
              className="flex-auto"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Button size="lg" type="submit" disabled={!newGroupName.trim()}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

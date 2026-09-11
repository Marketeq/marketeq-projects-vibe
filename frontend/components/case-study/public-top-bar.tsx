"use client"

import { MessageSquare, Plus, Share06, X } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"
import { Button, Favorite, FavoriteRoot, IconButton } from "@/components/ui"

export interface PublicTopBarUser {
  name: string
  handle: string
  avatarUrl?: string
  online?: boolean
}

/**
 * The public case-study page's project bar (Figma "Component 1000001832"):
 * project title on the left; favorite/share/message/hire actions + the
 * creator's identity + close on the right.
 *
 * `user` is optional — omit it to drop the identity block (avatar + name +
 * handle) entirely, e.g. for the in-editor preview popup, where the person
 * looking at it is the creator themselves and doesn't need to be shown
 * their own identity.
 */
export function PublicTopBar({
  projectTitle,
  user,
  isFavorited,
  onFavoriteChange,
  onShare,
  onMessage,
  onHire,
  onClose,
  className,
}: {
  projectTitle: string
  user?: PublicTopBarUser
  isFavorited?: boolean
  onFavoriteChange?: (favorited: boolean) => void
  onShare?: () => void
  onMessage?: () => void
  onHire?: () => void
  onClose?: () => void
  className?: string
}) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between bg-white border-b border-gray-200 drop-shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)] pl-6 pr-3 py-3 rounded-tl-[10px] rounded-tr-[10px]",
        className
      )}
    >
      <h1 className="text-lg font-bold leading-6 text-dark-blue-400 truncate">
        {projectTitle}
      </h1>

      <div className="flex items-center gap-x-6">
        <div className="inline-flex items-center gap-x-3">
          <FavoriteRoot value={isFavorited} onValueChange={onFavoriteChange}>
            {({ pressed }) => (
              <Favorite
                className="size-9 rounded-full border-2 border-gray-300 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
                aria-label={pressed ? "Remove from favorites" : "Save project"}
              />
            )}
          </FavoriteRoot>

          <IconButton
            className="size-9 rounded-full border-2 border-gray-300 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)] text-gray-500"
            variant="outlined"
            visual="gray"
            onClick={onShare}
            aria-label="Share"
          >
            <Share06 className="size-4" />
          </IconButton>

          <Button
            type="button"
            onClick={onMessage}
            variant="outlined"
            className="h-auto px-[14px] py-2 border-2 border-primary-500 text-primary-500 text-xs font-semibold hover:bg-primary-25"
          >
            <MessageSquare className="size-[15px]" /> Message Me
          </Button>

          <Button
            type="button"
            onClick={onHire}
            className="h-auto px-[14px] py-2 text-xs font-semibold"
          >
            <Plus className="size-[15px]" /> Hire Me
          </Button>
        </div>

        {user ? (
          <div className="inline-flex items-center gap-x-3">
            <div className="relative shrink-0 size-11">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <div className="size-11 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center font-semibold">
                  {user.name.slice(0, 1)}
                </div>
              )}
              {user.online ? (
                <span className="absolute bottom-0 left-0 size-[17px] rounded-full bg-success-500 border-2 border-white" />
              ) : null}
            </div>

            <div className="leading-tight">
              <p className="text-lg font-bold text-dark-blue-400">{user.name}</p>
              <p className="text-base font-light text-dark-blue-400">
                @{user.handle}
              </p>
            </div>
          </div>
        ) : null}

        <IconButton
          className="p-[10px] rounded-[10px] size-11 text-gray-500"
          variant="ghost"
          visual="gray"
          type="button"
          onClick={onClose}
        >
          <X className="size-6" />
        </IconButton>
      </div>
    </nav>
  )
}

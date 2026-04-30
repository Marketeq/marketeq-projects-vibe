"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useInviteWindowStore } from "@/components/invite-window"
import { useToast } from "@/components/ui/toast/use-toast"
import { useRouter } from "next/navigation"
import { type Favorite, type FavoriteGroup as FavGroup, getGroups, getAllFavoritesGrouped, getProjectFavorites, getServiceFavorites, getTalentFavorites, removeFavorite as removeFavoriteApi, renameGroup as renameGroupApi, deleteGroup as deleteGroupApi, createGroup as createGroupApi } from "@/src/lib/api/favorites"
import { ensureDevAuth } from "@/src/lib/api/dev-login"
import { type TalentCardData, sampleGroups, getUsernamesForGroup, userProfileToCardData } from "@/src/lib/data/sample-talents"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { UserAPI } from "@/service/http/user"
import { motion } from "framer-motion"
import { cn, getFirstItem } from "@/utils/functions"
import {
  Briefcase,
  ChevronDown,
  Edit03,
  Link01,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Plus,
  SearchMd,
  Share07,
  Star,
  Trash2,
  Users,
} from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { TalentCardLandscape } from "@/components/talent-card-landscape"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/* ─── Project Group Cards ─── */

interface ProjectGroupCardProps {
  group: FavGroup
  itemMeta: Record<string, { title?: string; slug?: string; mediaUrl?: string }>
  onRename: (groupId: string, newName: string) => void
  onDelete: (groupId: string) => void
  existingNames: string[]
  itemType?: "project" | "service"
}

const imageVariants = {
  hidden: { opacity: 0, scale: 0.3, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.35, ease: "easeOut" },
  }),
}

const ProjectGroupCard = ({ group, itemMeta, onRename, onDelete, existingNames, itemType = "project" }: ProjectGroupCardProps) => {
  const router = useRouter()
  const available = group.favorites
    .map((f) => itemMeta[f.itemId]?.mediaUrl)
    .filter(Boolean) as string[]
  const href = `/favorites/${group.id}?name=${encodeURIComponent(group.name)}&type=${itemType}`

  return (
    <article
      className="bg-white border rounded-lg border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-dropdown-zone]")) return
        if (wasDialogRecentlyClosed()) return
        router.push(href)
      }}
    >
      <div className="h-[163px] lg:h-[222px] grid grid-cols-2 grid-rows-3 bg-gray-50 rounded-t-lg overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="relative bg-gray-100"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={available[i] ? imageVariants : undefined}
          >
            {available[i] && (
              <NextImage className="object-cover" src={available[i]} alt="" sizes="25vw" fill />
            )}
          </motion.div>
        ))}
      </div>

      <div className="relative pt-[30px] lg:pt-[47px] p-5 lg:p-[25px]">
        <div className="size-11 lg:size-[61px] bg-white absolute rounded-full -top-[22px] lg:-top-[30.5px] left-1/2 border border-gray-300 inline-flex flex-col shrink-0 justify-center items-center -translate-x-1/2">
          <span className="text-xs leading-[14.52px] lg:text-base font-semibold lg:leading-[19.36px] text-dark-blue-400">
            {group.favorites.length}
          </span>
          <span className="text-[9px] leading-[10.89px] lg:text-xs font-light lg:leading-[14.52px] text-dark-blue-400">
            Saved
          </span>
        </div>

        <div data-dropdown-zone>
          <CardDropdown className="absolute top-1.5 right-1.5 lg:top-[9px] lg:right-[9px] lg:py-1" groupId={group.id} groupName={group.name} onRename={onRename} onDelete={onDelete} existingNames={existingNames} />
        </div>

        <h1 className="text-[11px] leading-[13.31px] lg:text-base text-center lg:leading-[21.79px] font-bold text-dark-blue-400 line-clamp-2">
          {group.name}
        </h1>
        <p className="text-[9px] leading-[10.89px] lg:text-sm text-center lg:leading-[19.07px] font-light text-[#585C65] xs:max-lg:mt-0.5">
          {formatGroupDate(group.createdAt)}
        </p>
      </div>
    </article>
  )
}

const ProjectGroupListCard = ({ group, itemMeta, onRename, onDelete, existingNames, itemType = "project" }: ProjectGroupCardProps) => {
  const router = useRouter()
  const available = group.favorites
    .map((f) => itemMeta[f.itemId]?.mediaUrl)
    .filter(Boolean) as string[]
  const href = `/favorites/${group.id}?name=${encodeURIComponent(group.name)}&type=${itemType}`

  return (
    <div
      className="flex md:flex-row flex-col md:gap-x-10 border overflow-hidden bg-white border-gray-200 shadow-[0px_2px_5px_0px_theme(colors.black/[.04])] rounded-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-dropdown-zone]")) return
        if (wasDialogRecentlyClosed()) return
        router.push(href)
      }}
    >
      <div className="py-3.5 lg:py-[16.5px] space-y-0.5 pl-5">
        <h1 className="text-[11px] leading-[13.31px] lg:text-base lg:leading-[19.36px] font-bold text-dark-blue-400 line-clamp-2">
          {group.name}
        </h1>
        <p className="text-[9px] leading-[10.89px] lg:text-sm lg:leading-[16.94px] font-light text-[#585C65]">
          {formatGroupDate(group.createdAt)}
        </p>
      </div>

      <div className="flex relative xs:max-md:border-t xs:max-md:bg-gray-50 border-gray-200 h-[35px] md:h-[55px] lg:h-[72px] items-center flex-auto md:pl-5 isolate">
        <div className="md:py-[4.53px] lg:py-[10.59px]">
          <div className="inline-flex absolute xs:max-md:-top-[22.5px] xs:max-md:right-3.5 md:relative z-10 flex-col shrink-0 size-[45px] lg:size-[50px] rounded-full justify-center items-center bg-white border-[.74px] lg:border-[.82px] border-gray-200 shadow-[0px_1.64px_4.1px_0px_theme(colors.black/.04)]">
            <span className="text-[12.01px] leading-[14.54px] lg:text-sm lg:leading-[16.94px] font-semibold text-dark-blue-400">
              {group.favorites.length}
            </span>
            <span className="text-[9.01px] leading-[10.9px] lg:text-[10px] font-light lg:leading-[12.1px] text-dark-blue-400">
              saved
            </span>
          </div>
        </div>
        <div className="relative flex flex-auto self-stretch md:-left-[25px] overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            available[i] ? (
              <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={imageVariants} style={{ height: "100%" }}>
                <NextImage src={available[i]} alt="" sizes="25vw" width={214.03} height={72} style={{ width: "auto", height: "100%" }} />
              </motion.div>
            ) : (
              <div key={i} className="bg-gray-100" style={{ width: 214.03, height: "100%" }} />
            )
          ))}
        </div>
      </div>

      <div className="justify-end py-2.5 space-y-1 pl-5 pr-2.5 lg:flex hidden" data-dropdown-zone>
        <CardDropdown groupId={group.id} groupName={group.name} onRename={onRename} onDelete={onDelete} existingNames={existingNames} />
      </div>
    </div>
  )
}

/* ─── Talent Cards ─── */

const formatGroupDate = (isoDate: string) => {
  const d = new Date(isoDate)
  return `Created ${d.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
}

const formatGroupDateLong = (isoDate: string) => {
  const d = new Date(isoDate)
  const month = d.toLocaleDateString("en-US", { month: "long" })
  const year = d.getFullYear()
  return { month, year }
}

const TalentCard = ({ groupId, groupName, talents, createdAt, onRename, onDelete }: { groupId: string; groupName: string; talents: TalentCardData[]; createdAt: string; onRename: (groupId: string, newName: string) => void; onDelete: (groupId: string) => void }) => {
  const router = useRouter()
  // Show the most recently added talents (last in array = most recent)
  const recentTalents = [...talents].reverse().slice(0, 4)
  // Rotation angles for circular layout: positions around the circle
  const avatarRotationAngles = [-135, -90, -45, 0]
  const savedRotationAngle = -180
  const href = `/favorites/${groupId}?name=${encodeURIComponent(groupName)}&type=talent`

  // Staggered entrance: same motion as before, but delay order is reversed so
  // the cascade starts from the lower slot and rises upward.
  const avatarVariants = {
    hidden: { opacity: 0, scale: 0.3, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.35, ease: "easeOut" },
    }),
  }

  return (
    <article
      className="relative bg-white py-[25px] px-5 lg:p-[35px] lg:pb-[25px] rounded-lg border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] cursor-pointer hover:shadow-md transition-shadow"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-dropdown-zone]")) return
        if (wasDialogRecentlyClosed()) return
        router.push(href)
      }}
    >
      <div className="flex justify-center items-center">
        <div className="relative size-[127.5px] lg:size-[176px] flex-none rounded-full isolate">
          {/* Add button slot */}
          <motion.div
            className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto rotate-[--tw-rotate-root] [--tw-rotate-root:45deg]"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: recentTalents.length * 0.1 + 0.05, duration: 0.3 }}
          >
            <button className="inline-flex items-center justify-center shrink-0 size-[44.96px] lg:size-[61px] rounded-full border-dashed border-[1.5px] border-gray-300 text-gray-300 focus-visible:outline-none rotate-[--tw-rotate] [--tw-rotate:calc(-1*var(--tw-rotate-root))] pointer-events-none">
              <Plus className="size-5" />
            </button>
          </motion.div>

          {/* Dynamic avatar slots — staggered entrance, no hover */}
          {recentTalents.map((talent, i) => (
            <motion.div
              key={talent.id}
              className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto"
              style={{ rotate: `${avatarRotationAngles[i]}deg` } as React.CSSProperties}
              custom={i + 1}
              initial="hidden"
              animate="visible"
              variants={avatarVariants}
            >
              <Avatar
                className="border-2 border-white size-[44.96px] lg:size-[61px] pointer-events-none !ring-0 hover:!ring-0"
                style={{ rotate: `${-avatarRotationAngles[i]}deg` } as React.CSSProperties}
                size="2xl"
              >
                <AvatarImage src={talent.avatarUrl} alt={`${talent.firstName} ${talent.lastName}`} />
                <AvatarFallback>{talent.firstName[0]}{talent.lastName[0]}</AvatarFallback>
              </Avatar>
            </motion.div>
          ))}

          {/* Saved count stays on the original bottom-center slot inside the ring. */}
          {recentTalents.length < 5 && (
            <motion.div
              className="absolute w-[44.96px] lg:w-[61px] inset-0 m-auto z-10"
              style={{ rotate: `${savedRotationAngle}deg` } as React.CSSProperties}
              custom={0}
              initial="hidden"
              animate="visible"
              variants={avatarVariants}
            >
              <div
                className="size-[44.96px] lg:size-[61px] bg-white border border-gray-300 flex rounded-full flex-col shrink-0 justify-center items-center"
                style={{ rotate: `${-savedRotationAngle}deg` } as React.CSSProperties}
              >
                <span className="inline-block text-[11.79px] leading-[14.27px] lg:text-base lg:leading-[19.36px] font-semibold text-dark-blue-400">
                  {talents.length}
                </span>
                <span className="inline-block text-[8.84px] leading-[10.7px] lg:text-xs lg:leading-[14.52px] font-light text-dark-blue-400">
                  saved
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div data-dropdown-zone>
        <CardDropdown className="absolute top-[10px] right-[9.8px]" groupId={groupId} groupName={groupName} onRename={onRename} onDelete={onDelete} />
      </div>

      <div className="mt-[13.24px] lg:mt-[17px]">
        <h1 className="text-[13px] leading-[15.73px] lg:text-base text-center lg:leading-[19.36px] font-bold text-dark-blue-400 line-clamp-2">
          {groupName}
        </h1>
        <h1 className="text-[11px] lg:text-sm mt-[2px] text-center lg:leading-[16.94px] text-[#585C65]">
          {formatGroupDate(createdAt)}
        </h1>
      </div>
    </article>
  )
}

const TalentCardLandscapeRow = ({ value, groupId, groupName, talents, createdAt, onRename, onDelete }: { value: string; groupId: string; groupName: string; talents: TalentCardData[]; createdAt: string; onRename: (groupId: string, newName: string) => void; onDelete: (groupId: string) => void }) => {
  // Most recently added first for avatar display
  const recentTalents = [...talents].reverse().slice(0, 6)

  return (
    <AccordionItem
      className="border border-gray-200 bg-white shadow-[0px_2px_5px_0px_theme(colors.black/.04)] rounded-lg"
      value={value}
    >
      <div className="flex xs:max-md:p-3 xs:max-md:flex-col xs:max-md:gap-y-[17px]">
        <div className="md:contents flex items-center justify-between">
          <div className="xs:max-md:flex xs:max-md:flex-col xs:max-md:gap-y-1 md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <NextLink href={`/favorites/${groupId}?name=${encodeURIComponent(groupName)}&type=talent`} className="text-sm leading-[15.73px] lg:text-base font-bold inline-block lg:leading-[19.07px] text-dark-blue-400 hover:underline line-clamp-2">
              {groupName}
            </NextLink>
            <div className="xs:max-md:flex hidden items-center gap-x-2">
              <span className="text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
                Created on
              </span>
              <span className="inline-flex gap-x-2 items-center text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light text-dark-blue-400">
                <span className="font-bold">{formatGroupDateLong(createdAt).month}</span>
                {formatGroupDateLong(createdAt).year}
              </span>
            </div>
          </div>
          <InlineDropdown className="xs:max-md:inline-flex md:hidden" groupId={groupId} groupName={groupName} onRename={onRename} onDelete={onDelete} />
        </div>

        <div className="md:contents flex items-center justify-between">
          <div className="md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <div className="flex items-center gap-x-3">
              <div className="flex flex-col">
                <span className="text-xs leading-[14.52px] lg:text-base font-semibold inline-block lg:leading-[19.07px] text-dark-blue-400">
                  {talents.length}
                </span>
                <span className="text-[9px] leading-[10.89px] lg:text-xs lg:leading-[14.52px] inline-block font-light text-dark-blue-400">
                  saved
                </span>
              </div>
              <div className="flex items-center -space-x-2 lg:-space-x-1.5">
                {recentTalents.map((talent) => (
                  <Avatar key={talent.id} className="border-2 border-white xs:max-lg:size-6" size="sm">
                    <AvatarImage src={talent.avatarUrl} alt={`${talent.firstName} ${talent.lastName}`} />
                    <AvatarFallback>{talent.firstName[0]}{talent.lastName[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>

          <div className="xs:max-md:hidden flex-auto pl-6 lg:pl-[25px] py-3 lg:py-[25px] last:pr-3 lg:last:pr-[25px]">
            <div className="flex items-center gap-x-2">
              <span className="text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light inline-block text-dark-blue-400">
                Created on
              </span>
              <span className="inline-flex gap-x-2 items-center text-[10px] leading-[12.1px] lg:text-sm lg:leading-[16.94px] font-light text-dark-blue-400">
                <span className="font-bold">{formatGroupDateLong(createdAt).month}</span>
                {formatGroupDateLong(createdAt).year}
              </span>
            </div>
          </div>

          <div className="md:flex-auto md:pl-6 lg:pl-[25px] md:py-3 lg:py-[25px] md:last:pr-3 lg:last:pr-[25px]">
            <div className="contents md:flex justify-end items-center gap-x-3 lg:gap-x-6">
              <AccordionTrigger asChild>
                <Button className="xs:max-lg:text-[10px] xs:max-lg:leading-6 xs:max-lg:gap-x-1" variant="link" visual="primary">
                  Expand <ChevronDown className="size-3 lg:size-[15px]" />
                </Button>
              </AccordionTrigger>
              <InlineDropdown groupId={groupId} groupName={groupName} onRename={onRename} onDelete={onDelete} />
            </div>
          </div>
        </div>
      </div>

      <DisclosureContent>
        <div className="px-3 pb-3 lg:px-[25px] flex flex-col gap-y-3 lg:pb-[25px]">
          <TalentCardLandscape />
          <TalentCardLandscape />
          <TalentCardLandscape />
        </div>
      </DisclosureContent>
    </AccordionItem>
  )
}

/* ─── Shared Components ─── */

/** Tracks when a dialog/dropdown was last dismissed so card clicks can be suppressed */
let lastDialogCloseTime = 0
function markDialogClosed() {
  lastDialogCloseTime = Date.now()
}
function wasDialogRecentlyClosed() {
  return Date.now() - lastDialogCloseTime < 300
}

interface GroupDropdownActions {
  groupId: string
  groupName: string
  onRename: (groupId: string, newName: string) => void
  onDelete: (groupId: string) => void
  existingNames?: string[]
}

const CardDropdown = ({ className, ...actions }: { className?: string } & GroupDropdownActions) => {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toggle: openInviteWindow } = useInviteWindowStore()
  const { toast } = useToast()

  const groupUrl = typeof window !== "undefined"
    ? `${window.location.origin}/favorites/${actions.groupId}?name=${encodeURIComponent(actions.groupName)}`
    : ""

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("h-auto py-[2px] px-1.5 py-1 text-gray-500", className)}
            visual="gray"
            variant="ghost"
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[165px]" onCloseAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Edit03 className="h-4 w-4" /> Rename Group
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openInviteWindow(true, `Share "${actions.groupName}"`)}>
            <Share07 className="h-4 w-4" /> Share Group
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { navigator.clipboard.writeText(groupUrl); toast({ title: "Link copied to clipboard", variant: "success" }) }}>
            <Link01 className="h-4 w-4" /> Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameGroupDialog
        open={renameOpen}
        onOpenChange={(v) => { setRenameOpen(v); if (!v) markDialogClosed() }}
        groupName={actions.groupName}
        onConfirm={(newName) => actions.onRename(actions.groupId, newName)}
        existingNames={actions.existingNames}
      />
      <DeleteGroupDialog
        open={deleteOpen}
        onOpenChange={(v) => { setDeleteOpen(v); if (!v) markDialogClosed() }}
        groupName={actions.groupName}
        onConfirm={() => actions.onDelete(actions.groupId)}
      />
    </>
  )
}

const InlineDropdown = ({ className, ...actions }: { className?: string } & GroupDropdownActions) => {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toggle: openInviteWindow } = useInviteWindowStore()
  const { toast } = useToast()

  const groupUrl = typeof window !== "undefined"
    ? `${window.location.origin}/favorites/${actions.groupId}?name=${encodeURIComponent(actions.groupName)}`
    : ""

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <IconButton
            className={cn("text-gray-400 xs:max-md:hidden xs:max-lg:h-5 xs:max-lg:w-auto xs:max-lg:px-1.5", className)}
            variant="ghost"
            visual="gray"
          >
            <MoreHorizontal className="size-4 lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[165px]" onCloseAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Edit03 className="h-4 w-4" /> Rename Group
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openInviteWindow(true, `Share "${actions.groupName}"`)}>
            <Share07 className="h-4 w-4" /> Share Group
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { navigator.clipboard.writeText(groupUrl); toast({ title: "Link copied to clipboard", variant: "success" }) }}>
            <Link01 className="h-4 w-4" /> Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem visual="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameGroupDialog
        open={renameOpen}
        onOpenChange={(v) => { setRenameOpen(v); if (!v) markDialogClosed() }}
        groupName={actions.groupName}
        onConfirm={(newName) => actions.onRename(actions.groupId, newName)}
        existingNames={actions.existingNames}
      />
      <DeleteGroupDialog
        open={deleteOpen}
        onOpenChange={(v) => { setDeleteOpen(v); if (!v) markDialogClosed() }}
        groupName={actions.groupName}
        onConfirm={() => actions.onDelete(actions.groupId)}
      />
    </>
  )
}

/* ─── Rename Dialog ─── */

const RenameGroupDialog = ({
  open,
  onOpenChange,
  groupName,
  onConfirm,
  existingNames = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  onConfirm: (newName: string) => void
  existingNames?: string[]
}) => {
  const [name, setName] = useState(groupName)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(groupName)
      setError("")
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, groupName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const capitalized = titleCase(name.trim())
    if (!capitalized || capitalized === groupName) return
    if (existingNames.some((n) => n.toLowerCase() === capitalized.toLowerCase() && n.toLowerCase() !== groupName.toLowerCase())) {
      setError("A group with this name already exists")
      return
    }
    onConfirm(capitalized)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()} onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle>Rename Group</DialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div className="flex items-center gap-x-3">
            <Input
              ref={inputRef}
              placeholder="Enter Group Name"
              className="flex-auto"
              value={name}
              onChange={(e) => { setName(titleCase(e.target.value)); setError("") }}
            />
            <Button type="submit" size="lg" disabled={!name.trim() || name.trim() === groupName}>
              Save
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Delete Confirmation Dialog ─── */

const DeleteGroupDialog = ({
  open,
  onOpenChange,
  groupName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  onConfirm: () => void
}) => {
  const [confirmation, setConfirmation] = useState("")
  const expected = groupName.toUpperCase()

  useEffect(() => {
    if (open) setConfirmation("")
  }, [open])

  const handleDelete = () => {
    if (confirmation === expected) {
      onConfirm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()} onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="text-lg font-bold text-dark-blue-400">Delete Group</DialogTitle>
        <p className="mt-2 text-sm text-gray-600">
          This will permanently delete the group <span className="font-bold">&ldquo;{groupName}&rdquo;</span> and remove all saved items from it. This action cannot be undone.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Type <span className="font-mono font-bold text-red-600">{expected}</span> to confirm:
        </p>
        <Input
          className="mt-2"
          placeholder={expected}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-x-3">
          <Button variant="outlined" visual="gray" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button visual="error" disabled={confirmation !== expected} onClick={handleDelete}>
            Delete Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── New Group Modal ─── */

/** Capitalize first letter of each word */
function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

const NewGroupModal = ({ onCreated, existingNames, activeTab }: { onCreated: (group: FavGroup) => void; existingNames: string[]; activeTab: string }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const capitalized = titleCase(name.trim())
    if (!capitalized) return
    if (existingNames.some((n) => n.toLowerCase() === capitalized.toLowerCase())) {
      setError("A group with this name already exists")
      return
    }
    setIsCreating(true)
    setError("")
    await ensureDevAuth()
    const defaultType = activeTab === "Projects" ? "project" : activeTab === "Services" ? "service" : activeTab === "Talent" ? "talent" : undefined
    const group = await createGroupApi({ name: capitalized, defaultType: defaultType as any })
    setIsCreating(false)
    if (group) {
      onCreated(group)
      setName("")
      setOpen(false)
    } else {
      setError("Failed to create group. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(""); setName("") } }}>
      <DialogTrigger asChild>
        <Button
          className="!border-2 !border-primary-500 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px] xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 text-primary-500 hover:text-white hover:bg-primary-500"
          variant="outlined"
          visual="gray"
          size="md"
        >
          <Plus className="size-[11.64px] lg:size-[15px]" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create New Group</DialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div className="flex items-center gap-x-3">
            <Input
              placeholder="Enter Group Name"
              className="flex-auto"
              value={name}
              onChange={(e) => { setName(titleCase(e.target.value)); setError("") }}
              autoFocus
            />
            <Button type="submit" size="lg" disabled={!name.trim() || isCreating}>
              {isCreating ? "Saving..." : "Save"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}

type GroupSortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "most-items"

const GROUP_SORT_LABELS: Record<GroupSortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  "most-items": "Most Items",
}

function sortGroups(groups: FavGroup[], sortBy: GroupSortOption): FavGroup[] {
  const sorted = [...groups]
  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case "oldest":
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case "most-items":
      return sorted.sort((a, b) => (b.favorites?.length ?? 0) - (a.favorites?.length ?? 0))
    default:
      return sorted
  }
}

const SortDropdown = ({ value, onChange }: { value: GroupSortOption; onChange: (v: GroupSortOption) => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:outline-none shrink-0">
          <SortAs className="size-4 lg:size-6 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ScrollArea viewportClassName="max-h-[250px]" scrollBar={<ScrollBar className="w-4 p-1" />}>
          {(Object.entries(GROUP_SORT_LABELS) as [GroupSortOption, string][]).map(([key, label]) => (
            <DropdownMenuCheckItem key={key} checked={value === key} onSelect={() => onChange(key)}>
              {label}
            </DropdownMenuCheckItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─── Empty State ─── */

function EmptyState({
  icon: Icon = Star,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="size-6 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-dark-blue-400">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ─── Main Page ─── */

export default function FavoritesPage() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [activeTab, setActiveTab] = useState("Projects")
  const [projectGroups, setProjectGroups] = useState<FavGroup[]>([])
  const [serviceGroups, setServiceGroups] = useState<FavGroup[]>([])
  const [talentFavorites, setTalentFavorites] = useState<Favorite[]>([])
  const [apiGroups, setApiGroups] = useState<FavGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<GroupSortOption>("newest")
  // Map of groupId → TalentCardData[] fetched from the API
  const [groupTalents, setGroupTalents] = useState<Record<string, TalentCardData[]>>({})
  // Map of itemId → { title, slug, mediaUrl } for projects/services
  const [itemMeta, setItemMeta] = useState<Record<string, { title?: string; slug?: string; mediaUrl?: string }>>({})

  const apiBase = getPublicApiUrl() || "http://localhost:4000"

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true)
        await ensureDevAuth()
        const [projGroups, svcGroups, talent, groups] = await Promise.all([
          getAllFavoritesGrouped("project"),
          getAllFavoritesGrouped("service"),
          getTalentFavorites(),
          getGroups(),
        ])
        setProjectGroups(projGroups)
        setServiceGroups(svcGroups)
        setTalentFavorites(talent)
        setApiGroups(groups)

        // Fetch metadata for favorited projects/services
        const allItemFavs = [...projGroups.flatMap((g) => g.favorites), ...svcGroups.flatMap((g) => g.favorites)]
        if (allItemFavs.length > 0) {
          const [projRes, svcRes] = await Promise.all([
            fetch(`${apiBase}/v1/projects`).catch(() => null),
            fetch(`${apiBase}/v1/services`).catch(() => null),
          ])
          const metas: Record<string, any> = {}
          if (projRes?.ok) {
            const items: any[] = await projRes.json()
            for (const item of items) {
              metas[String(item.id)] = { title: item.title, slug: item.slug, mediaUrl: item.mediaUrls?.[0] }
            }
          }
          if (svcRes?.ok) {
            const items: any[] = await svcRes.json()
            for (const item of items) {
              metas[String(item.id)] = { title: item.title, slug: item.slug, mediaUrl: item.mediaUrls?.[0] }
            }
          }
          setItemMeta(metas)
        }
      } catch (error) {
        console.error("Failed to load favorites:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFavorites()

    // Fetch user profiles for all groups in parallel
    async function loadGroupTalents() {
      const allUsernames = new Set<string>()
      for (const group of sampleGroups) {
        for (const u of getUsernamesForGroup(group.id)) allUsernames.add(u)
      }
      // Fetch all unique users
      const profileMap: Record<string, TalentCardData> = {}
      await Promise.all(
        Array.from(allUsernames).map(async (username) => {
          try {
            const res = await UserAPI.getByUsername(username)
            if (res?.data) profileMap[username] = userProfileToCardData(res.data)
          } catch { /* skip unavailable users */ }
        })
      )
      // Build group → talents mapping
      const result: Record<string, TalentCardData[]> = {}
      for (const group of sampleGroups) {
        result[group.id] = getUsernamesForGroup(group.id)
          .map((u) => profileMap[u])
          .filter((t): t is TalentCardData => t != null)
      }
      setGroupTalents(result)
    }
    loadGroupTalents()
  }, [])

  const handleRenameGroup = useCallback(async (groupId: string, newName: string) => {
    await ensureDevAuth()
    const updated = await renameGroupApi(groupId, { name: newName })
    if (updated) {
      const updateGroups = (groups: FavGroup[]) =>
        groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
      setProjectGroups(updateGroups)
      setServiceGroups(updateGroups)
      setApiGroups(updateGroups)
    }
  }, [])

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    await ensureDevAuth()
    const success = await deleteGroupApi(groupId)
    if (success) {
      const removeGroup = (groups: FavGroup[]) => groups.filter((g) => g.id !== groupId)
      setProjectGroups(removeGroup)
      setServiceGroups(removeGroup)
      setApiGroups(removeGroup)
    }
  }, [])

  const handleGroupCreated = useCallback((group: FavGroup) => {
    const newGroup = { ...group, favorites: group.favorites ?? [] }
    if (activeTab === "Projects") setProjectGroups((prev) => [...prev, newGroup])
    else if (activeTab === "Services") setServiceGroups((prev) => [...prev, newGroup])
    setApiGroups((prev) => [...prev, newGroup])
  }, [activeTab])

  const allGroupNames = [...new Set([...projectGroups, ...serviceGroups, ...apiGroups].map((g) => g.name))]

  const sortedProjectGroups = sortGroups(projectGroups, sortBy)
  const sortedServiceGroups = sortGroups(serviceGroups, sortBy)
  const sortedSampleGroups = [...sampleGroups].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "name-asc": return a.name.localeCompare(b.name)
      case "name-desc": return b.name.localeCompare(a.name)
      case "most-items": return (groupTalents[b.id]?.length ?? 0) - (groupTalents[a.id]?.length ?? 0)
      default: return 0
    }
  })

  return (
    <div className="p-3.5 md:p-10 lg:py-[100px] lg:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-3 lg:gap-x-3.5">
          <SortDropdown value={sortBy} onChange={setSortBy} />

          <ToggleGroupRoot value={value} onValueChange={(details) => setValue(details.value)}>
            <ToggleGroupItem value={GRID_LAYOUT}>
              <Grid className="size-4 lg:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value={LIST_LAYOUT}>
              <List className="size-4 lg:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>

        <NewGroupModal onCreated={handleGroupCreated} existingNames={allGroupNames} activeTab={activeTab} />
      </div>

      <h1 className="text-lg leading-[21.78px] lg:text-[28px] lg:leading-[33.89px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        My Favorites
      </h1>

      <Tabs className="mt-7 lg:mt-[19px]" value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3">
            <Button className="text-gray-500" variant="ghost" visual="gray" size="md">
              <SearchMd className="size-[18px]" />
            </Button>

            <TabsList className="flex justify-start border-b-0 px-0">
              <TabsTrigger className="xs:max-lg:text-xs xs:max-lg:leading-5" value="Projects">
                Projects {projectGroups.flatMap((g) => g.favorites).length > 0 && `(${projectGroups.flatMap((g) => g.favorites).length})`}
              </TabsTrigger>
              <TabsTrigger className="xs:max-lg:text-xs xs:max-lg:leading-5" value="Services">
                Services {serviceGroups.flatMap((g) => g.favorites).length > 0 && `(${serviceGroups.flatMap((g) => g.favorites).length})`}
              </TabsTrigger>
              <TabsTrigger className="xs:max-lg:text-xs xs:max-lg:leading-5" value="Talent Network">
                Talent Network
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="hidden items-center gap-x-3 lg:gap-x-6 self-start md:flex">
            <div className="flex items-center gap-x-3 lg:gap-x-3.5">
              <SortDropdown value={sortBy} onChange={setSortBy} />

              <ToggleGroupRoot value={value} onValueChange={(details) => setValue(details.value)}>
                <ToggleGroupItem value={GRID_LAYOUT}>
                  <Grid className="size-4 lg:size-6" />
                </ToggleGroupItem>
                <ToggleGroupItem value={LIST_LAYOUT}>
                  <List className="size-4 lg:size-6" />
                </ToggleGroupItem>
              </ToggleGroupRoot>
            </div>

            <NewGroupModal onCreated={handleGroupCreated} existingNames={allGroupNames} activeTab={activeTab} />
          </div>
        </div>

        {/* Talent Network Tab */}
        <TabsContent value="Talent Network">
          <div className="pt-[14px] lg:pt-6">
            {sortedSampleGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No favorite talent yet"
                description="Build your talent network by saving professionals you&rsquo;d love to work with. Group them by project, specialty, or team for quick access."
                action={
                  <NextLink href="/talent">
                    <Button>Browse Talent</Button>
                  </NextLink>
                }
              />
            ) : getFirstItem(value) === GRID_LAYOUT ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
                {sortedSampleGroups.map((group) => (
                  <TalentCard
                    key={group.id}
                    groupId={group.id}
                    groupName={group.name}
                    talents={groupTalents[group.id] ?? []}
                    createdAt={group.createdAt}
                    onRename={handleRenameGroup}
                    onDelete={handleDeleteGroup}
                  />
                ))}
              </div>
            ) : (
              <Accordion type="multiple" className="flex flex-col gap-y-3">
                {sortedSampleGroups.map((group) => (
                  <TalentCardLandscapeRow
                    key={group.id}
                    value={group.id}
                    groupId={group.id}
                    groupName={group.name}
                    talents={groupTalents[group.id] ?? []}
                    createdAt={group.createdAt}
                    onRename={handleRenameGroup}
                    onDelete={handleDeleteGroup}
                  />
                ))}
              </Accordion>
            )}
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="Projects">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg h-[300px] animate-pulse" />
              ))}
            </div>
          ) : projectGroups.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No saved projects yet"
              description="Browse projects and tap the star icon to save them here. Organize what you love into groups for easy access later."
              action={
                <NextLink href="/c/research">
                  <Button>Browse Projects</Button>
                </NextLink>
              }
            />
          ) : getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {sortedProjectGroups.map((group) => (
                <ProjectGroupCard key={group.id} group={group} itemMeta={itemMeta} onRename={handleRenameGroup} onDelete={handleDeleteGroup} existingNames={allGroupNames} />
              ))}
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              {sortedProjectGroups.map((group) => (
                <ProjectGroupListCard key={group.id} group={group} itemMeta={itemMeta} onRename={handleRenameGroup} onDelete={handleDeleteGroup} existingNames={allGroupNames} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="Services">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg h-[300px] animate-pulse" />
              ))}
            </div>
          ) : serviceGroups.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title="No saved services yet"
              description="Discover services from top talent and save the ones you&rsquo;re interested in. You can organize them into groups for easy comparison."
              action={
                <NextLink href="/c/research">
                  <Button>Browse Services</Button>
                </NextLink>
              }
            />
          ) : getFirstItem(value) === GRID_LAYOUT ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5 lg:gap-6 pt-3.5 lg:pt-6">
              {sortedServiceGroups.map((group) => (
                <ProjectGroupCard key={group.id} group={group} itemMeta={itemMeta} onRename={handleRenameGroup} onDelete={handleDeleteGroup} existingNames={allGroupNames} itemType="service" />
              ))}
            </div>
          ) : (
            <div className="grid gap-y-3 pt-3.5 lg:pt-6">
              {sortedServiceGroups.map((group) => (
                <ProjectGroupListCard key={group.id} group={group} itemMeta={itemMeta} onRename={handleRenameGroup} onDelete={handleDeleteGroup} existingNames={allGroupNames} itemType="service" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

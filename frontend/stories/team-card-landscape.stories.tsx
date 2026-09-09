import { Meta, StoryObj } from "@storybook/react"
import { TeamCardLandscape } from "@/components/team-card-landscape"

/**
 * Master team card — list view (Figma Component 1035).
 *
 * Grid view is `ListingCard kind="team"`. This is its landscape counterpart:
 * `ListingCard` has no `layout="list"` for teams, only for projects and
 * services, so team rows come from here.
 *
 * The avatar cluster is its own master component with one variant per member
 * count. It always sits in a 140×140 frame, anchored bottom-left, and the "+N"
 * bubble appears only once all six seats are filled. The member-count stories
 * below exist so those variants stay visible and cannot silently regress.
 */
const meta: Meta<typeof TeamCardLandscape> = {
  title: "Cards/Team Card Landscape",
  component: TeamCardLandscape,
  parameters: { layout: "padded" },
  argTypes: {
    isOwner: { control: "boolean" },
    isSaved: { control: "boolean" },
    rating: { control: { type: "number", min: 0, max: 5, step: 0.1 } },
  },
}

export default meta

type Story = StoryObj<typeof TeamCardLandscape>

const AVATARS = [
  "/woman.jpg",
  "/man.jpg",
  "/woman.jpg",
  "/man.jpg",
  "/woman.jpg",
  "/man.jpg",
]

const base = {
  id: "team-1",
  name: "Team Name",
  handle: "@Tech_Sential",
  tagline: "Development Team",
  experience: "Average 10 years of experience",
  locations: "UK, USA, Brazil, Philippines, more...",
  rate: "$85 - $120/hr",
  rating: 4.8,
  projectCount: 16,
  skills: [
    "Web Design",
    "Data Visualization",
    "Accessibility Design",
    "UX Design",
    "Typography Design",
    "Web Marketing",
  ],
  memberAvatars: AVATARS,
  memberCount: 34,
  previousClientLogos: ["/Adobe-1.png", "/google.png", "/aws.png"],
  href: "#",
}

/** Every slot populated: six avatars plus the overflow bubble. */
export const Default: Story = {
  args: { ...base, isOwner: true, onSaveClick: () => {} },
}

/** Members see view/leave actions instead of edit/manage. */
export const AsMember: Story = {
  args: {
    ...base,
    isOwner: false,
    onSaveClick: () => {},
    onLeaveClick: () => {},
  },
}

export const Saved: Story = {
  args: { ...base, isSaved: true, isOwner: true, onSaveClick: () => {} },
}

/**
 * Location, rate and previous clients are each optional and the row closes up
 * around whichever are absent — a team record that has not filled them in must
 * not leave empty boxes.
 */
export const MinimalData: Story = {
  args: {
    id: "team-2",
    name: "Untitled Team",
    memberAvatars: ["/woman.jpg", "/man.jpg"],
    memberCount: 2,
    skills: ["Web Design"],
    href: "#",
  },
}

const cluster = (count: number, total?: number): Story => ({
  args: {
    ...base,
    memberAvatars: AVATARS.slice(0, count),
    memberCount: total ?? count,
    href: "#",
  },
})

// One story per avatar-cluster variant. Frame stays 140×140 throughout; only
// the cluster's own bounds change, and it stays pinned to the bottom-left.
export const OneMember: Story = cluster(1)
export const TwoMembers: Story = cluster(2)
export const ThreeMembers: Story = cluster(3)
export const FourMembers: Story = cluster(4)
export const FiveMembers: Story = cluster(5)
export const SixMembers: Story = cluster(6)
export const SixPlusOverflow: Story = cluster(6, 34)

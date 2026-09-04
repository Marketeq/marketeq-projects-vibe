import {
  CategoryPref,
  GlobalChannelPrefs,
  NotificationItemPref,
  ScopedChannelState,
} from '../entities/user-preference.entity';

export interface NotificationCatalogItem {
  id: string;
  title: string;
  description: string;
  defaultEnabled: boolean;
  defaultChannels: ScopedChannelState;
}

export interface NotificationCatalogCategory {
  id: string;
  title: string;
  icon: string;
  defaultEnabled: boolean;
  defaultChannels: ScopedChannelState;
  notifications: NotificationCatalogItem[];
}

// Every collapsed category row in the design reads "In App only". Text is
// marked COMING SOON in the channels card, so it is not a default anywhere.
const IN_APP_ONLY: ScopedChannelState = {
  inApp: true,
  email: false,
  sms: false,
};

// The five categories the Notifications design specifies. Replaces the earlier
// Projects / Messages / Contracts & Payments / Marketing & Promotions set,
// which predates this design.
//
// `notifications` is empty on each: the design gives the category rows and
// their channel summary, not the individual notification types inside them.
// Inventing that list would be guesswork, so the drill-down starts empty until
// the item-level design lands. Preferences already stored against the old
// category ids are ignored on read — `getAllCategoryIds()` drives that — so no
// stale row leaks into the UI.
export const NOTIFICATION_CATALOG: NotificationCatalogCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: 'layout-alt-01',
    defaultEnabled: true,
    defaultChannels: IN_APP_ONLY,
    notifications: [],
  },
  {
    id: 'inbox',
    title: 'Inbox',
    icon: 'mail-02',
    defaultEnabled: true,
    defaultChannels: IN_APP_ONLY,
    notifications: [],
  },
  {
    id: 'listings',
    title: 'Listings',
    icon: 'presentation-chart-01',
    defaultEnabled: true,
    defaultChannels: IN_APP_ONLY,
    notifications: [],
  },
  {
    id: 'offers',
    title: 'Offers',
    icon: 'package-search',
    defaultEnabled: true,
    defaultChannels: IN_APP_ONLY,
    notifications: [],
  },
  {
    id: 'contacts',
    title: 'Contacts',
    icon: 'user-square',
    defaultEnabled: true,
    defaultChannels: IN_APP_ONLY,
    notifications: [],
  },
];

/**
 * Maps the category names publishers actually send onto the catalog ids the
 * preference screen stores against.
 *
 * These had drifted completely apart. Publishers emit `teams`, `team` and
 * `account`; the catalog holds `general`, `inbox`, `listings`, `offers` and
 * `contacts` — no overlap at all. An unmatched category falls through to the
 * permissive defaults in `dispatch`, so every switch on the notification
 * settings screen was being bypassed for every notification the platform
 * sends. A user could turn everything off and still receive all of it.
 *
 * Doing it here rather than by editing the publishers keeps each service's
 * emitted vocabulary its own business, and means a service can be renamed or
 * re-pointed without a coordinated deploy. It also covers the four ids the
 * catalog itself used before the redesign, so preferences and history stored
 * under those names still resolve.
 *
 * `team` maps to `offers` rather than `contacts` because the only event that
 * uses it is the invitation the recipient sees, which is titled "New Offer".
 * The two `teams` events both go to the inviter and are about who has joined,
 * which is what Contacts covers.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  // Emitted today by invitations-service and the magic-link handler.
  teams: 'contacts',
  team: 'offers',
  account: 'general',
  // Catalog ids retired by the 2026-09 redesign.
  projects: 'listings',
  messages: 'inbox',
  contracts: 'offers',
  marketing: 'general',
};

/**
 * Returns the catalog id a category resolves to, or null when nothing claims
 * it. Null rather than a default: guessing a category silently applies the
 * wrong user preference, and the caller can say so in the log instead.
 */
export function resolveCategoryId(category: string): string | null {
  if (getAllCategoryIds().has(category)) return category;
  const alias = CATEGORY_ALIASES[category];
  return alias && getAllCategoryIds().has(alias) ? alias : null;
}

export const DEFAULT_GLOBAL_CHANNELS: GlobalChannelPrefs = {
  inApp: { enabled: true, bell: true, popup: true, browser: false },
  email: { enabled: true, address: null },
  sms: { enabled: false, phone: null },
};

export function buildDefaultCategoryMap(): Record<string, CategoryPref> {
  return NOTIFICATION_CATALOG.reduce<Record<string, CategoryPref>>(
    (acc, category) => {
      acc[category.id] = {
        enabled: category.defaultEnabled,
        channels: { ...category.defaultChannels },
      };
      return acc;
    },
    {},
  );
}

export function buildDefaultNotificationMap(): Record<
  string,
  NotificationItemPref
> {
  return NOTIFICATION_CATALOG.reduce<Record<string, NotificationItemPref>>(
    (acc, category) => {
      for (const item of category.notifications) {
        acc[item.id] = {
          enabled: item.defaultEnabled,
          channels: { ...item.defaultChannels },
        };
      }
      return acc;
    },
    {},
  );
}

export function getAllCategoryIds(): Set<string> {
  return new Set(NOTIFICATION_CATALOG.map((c) => c.id));
}

export function getAllNotificationIds(): Set<string> {
  return new Set(
    NOTIFICATION_CATALOG.flatMap((c) => c.notifications.map((n) => n.id)),
  );
}

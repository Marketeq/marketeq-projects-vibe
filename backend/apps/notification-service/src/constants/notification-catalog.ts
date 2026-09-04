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

// Every category row in the design reads "In App, Text" — in-app and SMS on,
// email off.
const IN_APP_AND_TEXT: ScopedChannelState = {
  inApp: true,
  email: false,
  sms: true,
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
    defaultChannels: IN_APP_AND_TEXT,
    notifications: [],
  },
  {
    id: 'inbox',
    title: 'Inbox',
    icon: 'mail-02',
    defaultEnabled: true,
    defaultChannels: IN_APP_AND_TEXT,
    notifications: [],
  },
  {
    id: 'listings',
    title: 'Listings',
    icon: 'presentation-chart-01',
    defaultEnabled: true,
    defaultChannels: IN_APP_AND_TEXT,
    notifications: [],
  },
  {
    id: 'offers',
    title: 'Offers',
    icon: 'package-search',
    defaultEnabled: true,
    defaultChannels: IN_APP_AND_TEXT,
    notifications: [],
  },
  {
    id: 'contacts',
    title: 'Contacts',
    icon: 'user-square',
    defaultEnabled: true,
    defaultChannels: IN_APP_AND_TEXT,
    notifications: [],
  },
];

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

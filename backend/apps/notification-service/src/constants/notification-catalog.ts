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

const ALL_ON: ScopedChannelState = { inApp: true, email: true, sms: false };
const ALL_OFF: ScopedChannelState = { inApp: false, email: false, sms: false };

export const NOTIFICATION_CATALOG: NotificationCatalogCategory[] = [
  {
    id: 'projects',
    title: 'Projects',
    icon: 'briefcase',
    defaultEnabled: true,
    defaultChannels: ALL_ON,
    notifications: [
      {
        id: 'new-proposal',
        title: 'New Proposal Received',
        description:
          'Get notified when a freelancer submits a proposal on your project',
        defaultEnabled: true,
        defaultChannels: ALL_ON,
      },
      {
        id: 'milestone-complete',
        title: 'Milestone Completed',
        description:
          'Receive a notification when a project milestone is marked as complete',
        defaultEnabled: true,
        defaultChannels: ALL_ON,
      },
      {
        id: 'project-update',
        title: 'Project Status Update',
        description:
          'Get notified about changes to project status or timeline',
        defaultEnabled: false,
        defaultChannels: ALL_OFF,
      },
      {
        id: 'project-invitation',
        title: 'Project Invitation',
        description:
          'Receive a notification when you are invited to collaborate on a project',
        defaultEnabled: true,
        defaultChannels: { inApp: true, email: true, sms: true },
      },
    ],
  },
  {
    id: 'messages',
    title: 'Messages',
    icon: 'message-chat-square',
    defaultEnabled: true,
    defaultChannels: { inApp: true, email: true, sms: true },
    notifications: [
      {
        id: 'new-message',
        title: 'New Message',
        description: 'Get notified when you receive a new direct message',
        defaultEnabled: true,
        defaultChannels: { inApp: true, email: true, sms: true },
      },
      {
        id: 'message-request',
        title: 'Message Request',
        description:
          'Receive a notification when someone sends you a message request',
        defaultEnabled: true,
        defaultChannels: { inApp: true, email: false, sms: false },
      },
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts & Payments',
    icon: 'file-search-02',
    defaultEnabled: true,
    defaultChannels: ALL_ON,
    notifications: [
      {
        id: 'contract-started',
        title: 'Contract Started',
        description: 'Get notified when a new contract is activated',
        defaultEnabled: true,
        defaultChannels: ALL_ON,
      },
      {
        id: 'payment-received',
        title: 'Payment Received',
        description: 'Receive a notification when a payment is processed',
        defaultEnabled: true,
        defaultChannels: ALL_ON,
      },
      {
        id: 'contract-deadline',
        title: 'Contract Deadline Reminder',
        description: 'Get reminded about upcoming contract deadlines',
        defaultEnabled: true,
        defaultChannels: ALL_ON,
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Promotions',
    icon: 'star',
    defaultEnabled: false,
    defaultChannels: ALL_OFF,
    notifications: [
      {
        id: 'product-updates',
        title: 'Product Updates',
        description: 'Learn about new features and improvements to the platform',
        defaultEnabled: false,
        defaultChannels: ALL_OFF,
      },
      {
        id: 'tips-newsletter',
        title: 'Tips & Newsletter',
        description:
          'Receive tips to improve your freelancing or hiring experience',
        defaultEnabled: false,
        defaultChannels: ALL_OFF,
      },
    ],
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

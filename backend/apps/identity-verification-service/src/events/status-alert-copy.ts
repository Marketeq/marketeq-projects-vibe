// PROVISIONAL user-facing copy for the four persistent status alerts, kept in one place
// so it can be replaced when the Figma Alerts frame (PMCM-651, node 11105-18845) is
// provided. The wording mirrors the toasts and modals the dashboard already shows.
// The home-country text is the Figma-sourced notification copy from PMCM-650.
import {
  HOME_COUNTRY_UPDATED_NOTIFICATION_BODY,
  HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE,
} from './home-country-updated-notification.publisher';

export type StatusAlertType =
  | 'travel_mode'
  | 'submitted_for_review'
  | 'verified'
  | 'home_country_updated';

export interface StatusAlertCopy {
  title: string;
  body: string;
}

// The talent dashboard hosts the account's verification entry points.
export const STATUS_ALERT_LINK = '/talent-dashboard';

export const STATUS_ALERT_COPY: Record<StatusAlertType, StatusAlertCopy> = {
  travel_mode: {
    // Figma node 13101-46846.
    title: 'Travel Mode is on',
    body: 'You can continue using the platform while away from your home country.',
  },
  submitted_for_review: {
    title: 'Your location verification was submitted.',
    body: 'We will notify you once it is reviewed.',
  },
  verified: {
    // Figma node 13101-47566.
    title: 'All set! Your identity and location are verified.',
    body: 'You now have full access to all features.',
  },
  home_country_updated: {
    title: HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE,
    body: HOME_COUNTRY_UPDATED_NOTIFICATION_BODY,
  },
};

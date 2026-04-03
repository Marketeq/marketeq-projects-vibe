
const fromEnv = (key: string, fallback: string) =>
  (process.env[key] || fallback) as string;

export const servicesConfig = {
  get USER_SERVICE_URL() {
    return fromEnv(
      'USER_SERVICE_URL',
      'https://marketeq-user-service-2a80768ec1b3.herokuapp.com/',
    );
  },
  get LISTINGS_SERVICE_URL() {
    return fromEnv('LISTINGS_SERVICE_URL', 'http://localhost:3004');
  },
  
  get ADMIN_SERVICE_URL() {
    return fromEnv(
      'ADMIN_SERVICE_URL',
      'https://marketeq-admin-service-96f4aed850b9.herokuapp.com/',
    );
  },
  get AFFILIATE_REFERRAL_SERVICE_URL() {
    return fromEnv(
      'AFFILIATE_REFERRAL_SERVICE_URL',
      'https://marketeq-affiliate-ref-service-4fef876841d7.herokuapp.com/',
    );
  },
  get AI_RECOMM_SERVICE_URL() {
    return fromEnv(
      'AI_RECOMM_SERVICE_URL',
      'https://marketeq-ai-recomm-service-aae51e83b863.herokuapp.com/',
    );
  },
  get ALGOLIA_SEARCH_SERVICE_URL() {
    return fromEnv(
      'ALGOLIA_SEARCH_SERVICE_URL',
      'https://marketeq-algolia-service-97920545f1dc.herokuapp.com/',
    );
  },
  get AUTH_SERVICE_URL() {
    return fromEnv(
      'AUTH_SERVICE_URL',
      'https://marketeq-auth-service-a8da855b9602.herokuapp.com/',
    );
  },
  get BILLING_PAYMENTS_SERVICE_URL() {
    return fromEnv(
      'BILLING_PAYMENTS_SERVICE_URL',
      'https://marketeq-billing-service-7d60c0b50211.herokuapp.com/',
    );
  },
  get CONTRACTS_SERVICE_URL() {
    return fromEnv(
      'CONTRACTS_SERVICE_URL',
      'https://marketeq-contracts-service-556987552ba4.herokuapp.com/',
    );
  },
  get CLIENT_RATING_SERVICE_URL() {
    return fromEnv(
      'CLIENT_RATING_SERVICE_URL',
      'https://marketeq-client-rating-service-7599f05f930f.herokuapp.com/',
    );
  },
  get CONTENT_MODERATION_SERVICE_URL() {
    return fromEnv(
      'CONTENT_MODERATION_SERVICE_URL',
      'https://marketeq-content-mod-service-7e5cf467c6da.herokuapp.com/',
    );
  },
  get ESCROW_DISPUTE_SERVICE_URL() {
    return fromEnv(
      'ESCROW_DISPUTE_SERVICE_URL',
      'https://marketeq-escrow-service-c19c501ac111.herokuapp.com/',
    );
  },
  get MESSAGING_NOTIFICATION_SERVICE_URL() {
    return fromEnv(
      'MESSAGING_NOTIFICATION_SERVICE_URL',
      'https://marketeq-notification-service-db5626f26c36.herokuapp.com/',
    );
  },
  get OFFERS_SERVICE_URL() {
    return fromEnv(
      'OFFERS_SERVICE_URL',
      'https://marketeq-offers-service-c985ce20016c.herokuapp.com/',
    );
  },
  get ORDER_SERVICE_URL() {
    return fromEnv(
      'ORDER_SERVICE_URL',
      'https://marketeq-order-service-565957d2db77.herokuapp.com/',
    );
  },
  get TALENT_RATING_SERVICE_URL() {
    return fromEnv(
      'TALENT_RATING_SERVICE_URL',
      'https://marketeq-talent-rating-service-0843083e7114.herokuapp.com/',
    );
  },
  get TEAMS_SERVICE_URL() {
    return fromEnv(
      'TEAMS_SERVICE_URL',
      'https://marketeq-teams-service-639c708c7d86.herokuapp.com/',
    );
  },
  get WORK_TRACKING_SERVICE_URL() {
    return fromEnv(
      'WORK_TRACKING_SERVICE_URL',
      'https://marketeq-work-tracking-service-ca3aa2fb7447.herokuapp.com/',
    );
  },
  get WIRE_REVIEW_SERVICE_URL() {
    return fromEnv('WIRE_REVIEW_SERVICE_URL', 'http://localhost:3004');
  },
  get CHECKOUT_SERVICE_URL() {
    return fromEnv('CHECKOUT_SERVICE_URL', 'http://localhost:3003');
  },
  get BANKING_SERVICE_URL() {
    return fromEnv('BANKING_SERVICE_URL', 'http://localhost:3005');
  },
  get INVITATIONS_SERVICE_URL() {
    return fromEnv('INVITATIONS_SERVICE_URL', 'http://localhost:3011');
  },
};

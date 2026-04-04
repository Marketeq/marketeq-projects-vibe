export interface RequestUser {
  id: string;
  email: string;
}

export interface GatewayHeaders {
  userIdHeader: string;     // e.g. x-user-id
  userEmailHeader: string;  // e.g. x-user-email
}

/**
 * Auth can be provided via:
 * 1. Headers: x-user-id and x-user-email (recommended for internal services)
 * 2. Request body: userId and email (for external API requests)
 * 
 * Example body auth:
 * {
 *   "userId": "uuid-here",
 *   "email": "user@example.com",
 *   ... other fields
 * }
 */
export interface AuthContext {
  userId: string;
  email: string;
}

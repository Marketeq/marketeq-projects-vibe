export type TeamRole = 'admin' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<TeamRole,string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer'
};

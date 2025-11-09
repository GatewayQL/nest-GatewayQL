export interface App {
  id?: string;
  name?: string;
  description?: string;
  redirectUri?: string;
  isActive?: boolean;
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export enum AppStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

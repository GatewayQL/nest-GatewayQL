import { registerEnumType } from '@nestjs/graphql';

export interface User {
  id?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  redirectUri?: string;
  role?: UserRole;
  createdAt?: number;
  updatedAt?: number;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Register the enum with GraphQL
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role enum',
});

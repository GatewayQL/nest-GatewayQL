import { AppEntity } from '../../apps/models/app.entity';

export interface Credential {
  id?: string;
  consumerId?: string;
  appId?: string;
  app?: AppEntity;
  consumerType?: ConsumerType;
  scope?: string;
  keyId?: string;
  isActive?: boolean;
  keySecret?: string;
  password?: string;
  passwordHash?: string;
  secret?: string;
  type?: CredentialType;
  createdAt?: number;
  updatedAt?: number;
  updatedBy?: string;
}

export enum CredentialType {
  BASIC = 'basic-auth',
  KEY = 'key-auth',
  JWT = 'jwt',
  OAUTH2 = 'oauth2',
}

export enum ConsumerType {
  USER = 'user',
  APP = 'app',
}

export interface Scope {
  id?: string;
  name?: string;
  createdAt?: number;
  updatedAt?: number;
}
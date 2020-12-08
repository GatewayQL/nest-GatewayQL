export interface Credential {
  id?: string;
  consumerId?: string;
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

export interface Scope {
  id?: string;
  name?: string;
  createdAt?: number;
  updatedAt?: number;
}

import { CredentialEntity } from './credential.entity';
import { CredentialType, ConsumerType } from './credential.interface';
import { AppEntity } from '../../apps/models/app.entity';

describe('CredentialEntity', () => {
  let credential: CredentialEntity;
  let mockApp: AppEntity;

  beforeEach(() => {
    credential = new CredentialEntity();
    mockApp = new AppEntity();
    mockApp.id = 'app-123';
    mockApp.name = 'Test App';
  });

  it('should be defined', () => {
    expect(credential).toBeDefined();
  });

  it('should create entity with default values', () => {
    expect(credential.consumerType).toBeUndefined();
    expect(credential.isActive).toBeUndefined();
    expect(credential.scope).toBeUndefined();
    expect(credential.type).toBeUndefined();
  });

  it('should allow setting basic properties', () => {
    credential.id = 'cred-123';
    credential.consumerId = 'user-456';
    credential.scope = 'admin';
    credential.isActive = true;
    credential.keyId = 'key-789';

    expect(credential.id).toBe('cred-123');
    expect(credential.consumerId).toBe('user-456');
    expect(credential.scope).toBe('admin');
    expect(credential.isActive).toBe(true);
    expect(credential.keyId).toBe('key-789');
  });

  it('should handle ConsumerType enum values', () => {
    credential.consumerType = ConsumerType.USER;
    expect(credential.consumerType).toBe(ConsumerType.USER);

    credential.consumerType = ConsumerType.APP;
    expect(credential.consumerType).toBe(ConsumerType.APP);
  });

  it('should handle CredentialType enum values', () => {
    credential.type = CredentialType.BASIC;
    expect(credential.type).toBe(CredentialType.BASIC);

    credential.type = CredentialType.KEY;
    expect(credential.type).toBe(CredentialType.KEY);

    credential.type = CredentialType.JWT;
    expect(credential.type).toBe(CredentialType.JWT);

    credential.type = CredentialType.OAUTH2;
    expect(credential.type).toBe(CredentialType.OAUTH2);
  });

  it('should handle app relationship', () => {
    credential.app = mockApp;
    expect(credential.app).toBe(mockApp);
    expect(credential.app?.id).toBe('app-123');
    expect(credential.app?.name).toBe('Test App');
  });

  it('should handle secret fields', () => {
    credential.keySecret = 'secret-key';
    credential.password = 'plain-password';
    credential.passwordHash = 'hashed-password';
    credential.secret = 'oauth-secret';

    expect(credential.keySecret).toBe('secret-key');
    expect(credential.password).toBe('plain-password');
    expect(credential.passwordHash).toBe('hashed-password');
    expect(credential.secret).toBe('oauth-secret');
  });

  it('should handle timestamp fields', () => {
    const now = Date.now();
    credential.createdAt = now;
    credential.updatedAt = now;
    credential.updatedBy = 'admin-user';

    expect(credential.createdAt).toBe(now);
    expect(credential.updatedAt).toBe(now);
    expect(credential.updatedBy).toBe('admin-user');
  });

  it('should allow nullable fields to be null', () => {
    credential.consumerId = null as any;
    credential.app = null as any;
    credential.keySecret = null as any;
    credential.password = null as any;
    credential.passwordHash = null as any;
    credential.secret = null as any;
    credential.updatedBy = null as any;

    expect(credential.consumerId).toBeNull();
    expect(credential.app).toBeNull();
    expect(credential.keySecret).toBeNull();
    expect(credential.password).toBeNull();
    expect(credential.passwordHash).toBeNull();
    expect(credential.secret).toBeNull();
    expect(credential.updatedBy).toBeNull();
  });

  it('should create a complete credential entity', () => {
    const completeCredential = new CredentialEntity();
    completeCredential.id = 'cred-123';
    completeCredential.consumerId = 'user-456';
    completeCredential.consumerType = ConsumerType.USER;
    completeCredential.app = mockApp;
    completeCredential.scope = 'admin';
    completeCredential.isActive = true;
    completeCredential.keyId = 'key-789';
    completeCredential.keySecret = 'secret-key';
    completeCredential.type = CredentialType.KEY;
    completeCredential.createdAt = Date.now();
    completeCredential.updatedAt = Date.now();
    completeCredential.updatedBy = 'admin';

    expect(completeCredential.id).toBeDefined();
    expect(completeCredential.consumerId).toBeDefined();
    expect(completeCredential.consumerType).toBe(ConsumerType.USER);
    expect(completeCredential.app).toBe(mockApp);
    expect(completeCredential.scope).toBe('admin');
    expect(completeCredential.isActive).toBe(true);
    expect(completeCredential.keyId).toBeDefined();
    expect(completeCredential.keySecret).toBeDefined();
    expect(completeCredential.type).toBe(CredentialType.KEY);
    expect(completeCredential.createdAt).toBeDefined();
    expect(completeCredential.updatedAt).toBeDefined();
    expect(completeCredential.updatedBy).toBe('admin');
  });
});
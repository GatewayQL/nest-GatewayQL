import { CredentialType, ConsumerType, Credential, Scope } from './credential.interface';
import { AppEntity } from '../../apps/models/app.entity';

describe('Credential Interfaces and Enums', () => {
  describe('CredentialType enum', () => {
    it('should have correct values', () => {
      expect(CredentialType.BASIC).toBe('basic-auth');
      expect(CredentialType.KEY).toBe('key-auth');
      expect(CredentialType.JWT).toBe('jwt');
      expect(CredentialType.OAUTH2).toBe('oauth2');
    });

    it('should contain all expected credential types', () => {
      const values = Object.values(CredentialType);
      expect(values).toHaveLength(4);
      expect(values).toContain('basic-auth');
      expect(values).toContain('key-auth');
      expect(values).toContain('jwt');
      expect(values).toContain('oauth2');
    });
  });

  describe('ConsumerType enum', () => {
    it('should have correct values', () => {
      expect(ConsumerType.USER).toBe('user');
      expect(ConsumerType.APP).toBe('app');
    });

    it('should contain all expected consumer types', () => {
      const values = Object.values(ConsumerType);
      expect(values).toHaveLength(2);
      expect(values).toContain('user');
      expect(values).toContain('app');
    });
  });

  describe('Credential interface', () => {
    it('should allow creating credential objects', () => {
      const mockApp = new AppEntity();
      mockApp.id = 'app-123';

      const credential: Credential = {
        id: 'cred-123',
        consumerId: 'user-456',
        appId: 'app-123',
        app: mockApp,
        consumerType: ConsumerType.USER,
        scope: 'admin',
        keyId: 'key-789',
        isActive: true,
        keySecret: 'secret-key',
        password: 'plain-password',
        passwordHash: 'hashed-password',
        secret: 'oauth-secret',
        type: CredentialType.KEY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: 'admin',
      };

      expect(credential.id).toBe('cred-123');
      expect(credential.consumerId).toBe('user-456');
      expect(credential.appId).toBe('app-123');
      expect(credential.app).toBe(mockApp);
      expect(credential.consumerType).toBe(ConsumerType.USER);
      expect(credential.scope).toBe('admin');
      expect(credential.keyId).toBe('key-789');
      expect(credential.isActive).toBe(true);
      expect(credential.type).toBe(CredentialType.KEY);
    });

    it('should allow partial credential objects', () => {
      const partialCredential: Credential = {
        id: 'cred-123',
        consumerType: ConsumerType.APP,
        type: CredentialType.JWT,
      };

      expect(partialCredential.id).toBe('cred-123');
      expect(partialCredential.consumerType).toBe(ConsumerType.APP);
      expect(partialCredential.type).toBe(CredentialType.JWT);
      expect(partialCredential.consumerId).toBeUndefined();
      expect(partialCredential.scope).toBeUndefined();
    });

    it('should allow empty credential object', () => {
      const emptyCredential: Credential = {};
      expect(emptyCredential).toBeDefined();
      expect(Object.keys(emptyCredential)).toHaveLength(0);
    });
  });

  describe('Scope interface', () => {
    it('should allow creating scope objects', () => {
      const scope: Scope = {
        id: 'scope-123',
        name: 'admin-scope',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(scope.id).toBe('scope-123');
      expect(scope.name).toBe('admin-scope');
      expect(scope.createdAt).toBeDefined();
      expect(scope.updatedAt).toBeDefined();
    });

    it('should allow partial scope objects', () => {
      const partialScope: Scope = {
        name: 'user-scope',
      };

      expect(partialScope.name).toBe('user-scope');
      expect(partialScope.id).toBeUndefined();
      expect(partialScope.createdAt).toBeUndefined();
      expect(partialScope.updatedAt).toBeUndefined();
    });

    it('should allow empty scope object', () => {
      const emptyScope: Scope = {};
      expect(emptyScope).toBeDefined();
      expect(Object.keys(emptyScope)).toHaveLength(0);
    });
  });

  describe('Type compatibility', () => {
    it('should allow credential with all credential types', () => {
      const basicCredential: Credential = { type: CredentialType.BASIC };
      const keyCredential: Credential = { type: CredentialType.KEY };
      const jwtCredential: Credential = { type: CredentialType.JWT };
      const oauth2Credential: Credential = { type: CredentialType.OAUTH2 };

      expect(basicCredential.type).toBe(CredentialType.BASIC);
      expect(keyCredential.type).toBe(CredentialType.KEY);
      expect(jwtCredential.type).toBe(CredentialType.JWT);
      expect(oauth2Credential.type).toBe(CredentialType.OAUTH2);
    });

    it('should allow credential with all consumer types', () => {
      const userCredential: Credential = { consumerType: ConsumerType.USER };
      const appCredential: Credential = { consumerType: ConsumerType.APP };

      expect(userCredential.consumerType).toBe(ConsumerType.USER);
      expect(appCredential.consumerType).toBe(ConsumerType.APP);
    });
  });
});
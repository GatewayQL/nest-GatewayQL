import { Command } from 'commander';
import inquirer from 'inquirer';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { PasswordUtil } from '../utils/password.util';
import { CredentialEntity } from '../../credentials/models/credential.entity';
import { CredentialType } from '../../credentials/models/credential.interface';
import { UserEntity } from '../../users/models/user.entity';
import { v4 as uuidv4 } from 'uuid';

export function createCredentialsCommand(): Command {
  const credentials = new Command('credentials')
    .alias('credential')
    .description('Manage credentials');

  // credentials create
  credentials
    .command('create')
    .description('Create a new credential for a user')
    .option('-c, --consumer-id <consumerId>', 'Consumer ID (username)')
    .option('-t, --type <type>', 'Credential type (basic-auth, key-auth, oauth2, jwt)', 'basic-auth')
    .option('-s, --secret <secret>', 'Secret/password')
    .option('--scope <scope>', 'Scope (comma-separated)', 'admin')
    .action(async (options) => {
      try {
        let { consumerId, type, secret, scope } = options;

        // Interactive prompts for missing required fields
        if (!consumerId || !secret) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'consumerId',
              message: 'Consumer ID (username):',
              when: !consumerId,
              validate: (input) => input.length > 0 || 'Consumer ID is required',
            },
            {
              type: 'list',
              name: 'type',
              message: 'Credential type:',
              choices: ['basic-auth', 'key-auth', 'oauth2', 'jwt'],
              default: type,
              when: !type,
            },
            {
              type: 'password',
              name: 'secret',
              message: 'Secret:',
              when: !secret,
              validate: (input) => input.length >= 6 || 'Secret must be at least 6 characters',
            },
            {
              type: 'input',
              name: 'scope',
              message: 'Scope (comma-separated):',
              default: 'admin',
              when: !scope,
            },
          ]);

          consumerId = consumerId || answers.consumerId;
          type = type || answers.type;
          secret = secret || answers.secret;
          scope = scope || answers.scope;
        }

        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);
        const userRepository = dataSource.getRepository(UserEntity);

        // Check if user exists
        const user = await userRepository.findOne({ where: { username: consumerId } });
        if (!user) {
          OutputUtil.error(`User '${consumerId}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        // Check if active credential already exists for this consumer
        const existingCredential = await credentialRepository.findOne({
          where: { consumerId, isActive: true },
        });

        if (existingCredential) {
          OutputUtil.error(`Active credential already exists for user '${consumerId}'`);
          await closeDataSource();
          process.exit(1);
        }

        const credential = new CredentialEntity();
        credential.consumerId = consumerId;
        credential.scope = scope;
        credential.isActive = true;
        credential.type = type as CredentialType;

        const secretHash = await PasswordUtil.hash(secret);

        switch (type) {
          case 'key-auth':
            credential.keyId = uuidv4();
            credential.keySecret = secretHash;
            break;
          case 'basic-auth':
            credential.password = secret;
            credential.passwordHash = secretHash;
            break;
          case 'oauth2':
          case 'jwt':
            credential.secret = secretHash;
            break;
        }

        const savedCredential = await credentialRepository.save(credential);

        OutputUtil.success('Credential created successfully');

        // Show the actual secret/key for the user to save
        console.log('');
        if (type === 'key-auth') {
          OutputUtil.warning('IMPORTANT: Save these credentials securely!');
          console.log(`Key ID: ${savedCredential.keyId}`);
          console.log(`Secret: ${secret}`);
        } else {
          OutputUtil.warning('IMPORTANT: Save this secret securely!');
          console.log(`Secret: ${secret}`);
        }
        console.log('');

        // Remove sensitive fields before printing
        delete savedCredential.password;
        delete savedCredential.keySecret;
        delete savedCredential.secret;
        delete savedCredential.passwordHash;

        OutputUtil.printCredential(savedCredential);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to create credential: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials list
  credentials
    .command('list')
    .description('List all credentials')
    .option('-c, --consumer-id <consumerId>', 'Filter by consumer ID')
    .option('--active-only', 'Show only active credentials')
    .action(async (options) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        let query = credentialRepository.createQueryBuilder('credential');

        if (options.consumerId) {
          query = query.where('credential.consumerId = :consumerId', {
            consumerId: options.consumerId,
          });
        }

        if (options.activeOnly) {
          query = query.andWhere('credential.isActive = :isActive', { isActive: true });
        }

        const credentials = await query.getMany();

        if (credentials.length === 0) {
          OutputUtil.info('No credentials found');
        } else {
          const formattedCredentials = credentials.map((c) => ({
            id: c.id,
            consumerId: c.consumerId,
            type: c.type,
            scope: c.scope || 'N/A',
            isActive: c.isActive ? 'Yes' : 'No',
            keyId: c.keyId || 'N/A',
            createdAt: new Date(c.createdAt).toLocaleString(),
          }));
          OutputUtil.table(formattedCredentials);
        }

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to list credentials: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials info
  credentials
    .command('info <id>')
    .description('Get detailed information about a credential')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        const credential = await credentialRepository.findOne({ where: { id } });

        if (!credential) {
          OutputUtil.error(`Credential '${id}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        // Remove sensitive fields
        delete credential.password;
        delete credential.keySecret;
        delete credential.secret;
        delete credential.passwordHash;

        OutputUtil.printCredential(credential);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to get credential info: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials update
  credentials
    .command('update <id>')
    .description('Update a credential')
    .option('-s, --secret <secret>', 'New secret')
    .option('--scope <scope>', 'New scope')
    .option('--activate', 'Activate the credential')
    .option('--deactivate', 'Deactivate the credential')
    .action(async (id, options) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        const credential = await credentialRepository
          .createQueryBuilder('credential')
          .addSelect('credential.password')
          .addSelect('credential.keySecret')
          .addSelect('credential.secret')
          .where('credential.id = :id', { id })
          .getOne();

        if (!credential) {
          OutputUtil.error(`Credential '${id}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (options.scope) {
          credential.scope = options.scope;
        }

        if (options.activate) {
          credential.isActive = true;
        }

        if (options.deactivate) {
          credential.isActive = false;
        }

        if (options.secret) {
          const secretHash = await PasswordUtil.hash(options.secret);

          switch (credential.type) {
            case CredentialType.KEY:
              credential.keySecret = secretHash;
              break;
            case CredentialType.BASIC:
              credential.password = options.secret;
              credential.passwordHash = secretHash;
              break;
            case CredentialType.OAUTH2:
            case CredentialType.JWT:
              credential.secret = secretHash;
              break;
          }
        }

        credential.updatedBy = 'cli';

        const updatedCredential = await credentialRepository.save(credential);

        // Remove sensitive fields
        delete updatedCredential.password;
        delete updatedCredential.keySecret;
        delete updatedCredential.secret;
        delete updatedCredential.passwordHash;

        OutputUtil.success('Credential updated successfully');
        OutputUtil.printCredential(updatedCredential);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to update credential: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials activate
  credentials
    .command('activate <id>')
    .description('Activate a credential')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        const credential = await credentialRepository.findOne({ where: { id } });

        if (!credential) {
          OutputUtil.error(`Credential '${id}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        credential.isActive = true;
        credential.updatedBy = 'cli';

        await credentialRepository.save(credential);

        OutputUtil.success(`Credential '${id}' activated successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to activate credential: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials deactivate
  credentials
    .command('deactivate <id>')
    .description('Deactivate a credential')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        const credential = await credentialRepository.findOne({ where: { id } });

        if (!credential) {
          OutputUtil.error(`Credential '${id}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        credential.isActive = false;
        credential.updatedBy = 'cli';

        await credentialRepository.save(credential);

        OutputUtil.success(`Credential '${id}' deactivated successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to deactivate credential: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // credentials remove
  credentials
    .command('remove <id>')
    .description('Remove a credential')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        const dataSource = await getDataSource();
        const credentialRepository = dataSource.getRepository(CredentialEntity);

        const credential = await credentialRepository.findOne({ where: { id } });

        if (!credential) {
          OutputUtil.error(`Credential '${id}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to remove credential '${id}'?`,
              default: false,
            },
          ]);

          if (!confirm) {
            OutputUtil.info('Operation cancelled');
            await closeDataSource();
            return;
          }
        }

        await credentialRepository.remove(credential);

        OutputUtil.success(`Credential '${id}' removed successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to remove credential: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  return credentials;
}

import { Command } from 'commander';
import inquirer from 'inquirer';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { AppEntity } from '../../apps/models/app.entity';
import { UserEntity } from '../../users/models/user.entity';

export function createAppsCommand(): Command {
  const apps = new Command('apps')
    .alias('app')
    .description('Manage applications');

  // apps create
  apps
    .command('create')
    .description('Create a new application')
    .option('-n, --name <name>', 'Application name')
    .option('-d, --description <description>', 'Application description')
    .option('-u, --user-id <userId>', 'User ID (owner of the app)')
    .option('--username <username>', 'Username (alternative to user-id)')
    .option('--redirect-uri <uri>', 'Redirect URI')
    .option('--active', 'Create as active application', true)
    .option('--inactive', 'Create as inactive application')
    .action(async (options) => {
      try {
        let { name, description, userId, username, redirectUri } = options;
        const isActive = !options.inactive;

        // Interactive prompts for missing required fields
        if (!name || (!userId && !username)) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Application name:',
              when: !name,
              validate: (input) =>
                input.length > 0 || 'Application name is required',
            },
            {
              type: 'input',
              name: 'username',
              message: 'Username (app owner):',
              when: !userId && !username,
              validate: (input) => input.length > 0 || 'Username is required',
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description (optional):',
              when: !description,
            },
            {
              type: 'input',
              name: 'redirectUri',
              message: 'Redirect URI (optional):',
              when: !redirectUri,
            },
          ]);

          name = name || answers.name;
          username = username || answers.username;
          description = description || answers.description;
          redirectUri = redirectUri || answers.redirectUri;
        }

        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);
        const userRepository = dataSource.getRepository(UserEntity);

        // Find user by ID or username
        let user: UserEntity;
        if (userId) {
          user = await userRepository.findOne({ where: { id: userId } });
        } else if (username) {
          user = await userRepository.findOne({ where: { username } });
          userId = user?.id;
        }

        if (!user) {
          OutputUtil.error(`User not found: ${userId || username}`);
          await closeDataSource();
          process.exit(1);
        }

        // Check if app name already exists for this user
        const existingApp = await appRepository.findOne({
          where: { name, user: { id: user.id } },
        });

        if (existingApp) {
          OutputUtil.error(
            `Application '${name}' already exists for user '${user.username}'`,
          );
          await closeDataSource();
          process.exit(1);
        }

        const app = new AppEntity();
        app.name = name;
        app.description = description;
        app.redirectUri = redirectUri;
        app.isActive = isActive;
        app.user = user;

        const savedApp = await appRepository.save(app);

        OutputUtil.success('Application created successfully');
        OutputUtil.info('Application Details:');
        console.table([
          {
            ID: savedApp.id,
            Name: savedApp.name,
            Description: savedApp.description || 'N/A',
            'Redirect URI': savedApp.redirectUri || 'N/A',
            'Is Active': savedApp.isActive ? 'Yes' : 'No',
            Owner: user.username,
            'Created At': new Date(savedApp.createdAt).toISOString(),
          },
        ]);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to create application: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps list
  apps
    .command('list')
    .description('List all applications')
    .option('-u, --user-id <userId>', 'Filter by user ID')
    .option('--username <username>', 'Filter by username')
    .option('--active-only', 'Show only active applications')
    .option('--inactive-only', 'Show only inactive applications')
    .action(async (options) => {
      try {
        const { userId, username, activeOnly, inactiveOnly } = options;

        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);
        const userRepository = dataSource.getRepository(UserEntity);

        let queryBuilder = appRepository
          .createQueryBuilder('app')
          .leftJoinAndSelect('app.user', 'user');

        // Filter by user if specified
        if (userId) {
          queryBuilder = queryBuilder.where('user.id = :userId', { userId });
        } else if (username) {
          queryBuilder = queryBuilder.where('user.username = :username', {
            username,
          });
        }

        // Filter by status if specified
        if (activeOnly) {
          queryBuilder = queryBuilder.andWhere('app.isActive = true');
        } else if (inactiveOnly) {
          queryBuilder = queryBuilder.andWhere('app.isActive = false');
        }

        const apps = await queryBuilder
          .orderBy('app.createdAt', 'DESC')
          .getMany();

        if (apps.length === 0) {
          OutputUtil.info('No applications found');
          await closeDataSource();
          return;
        }

        OutputUtil.success(`Found ${apps.length} application(s)`);
        const tableData = apps.map((app) => ({
          ID: app.id.substring(0, 8) + '...',
          Name: app.name,
          Description: (app.description || 'N/A').substring(0, 30),
          Owner: app.user.username,
          'Is Active': app.isActive ? 'Yes' : 'No',
          'Created At': new Date(app.createdAt).toLocaleDateString(),
        }));

        console.table(tableData);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to list applications: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps info
  apps
    .command('info <id>')
    .description('Get detailed information about an application')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);

        const app = await appRepository.findOne({
          where: { id },
          relations: ['user'],
        });

        if (!app) {
          OutputUtil.error(`Application not found: ${id}`);
          await closeDataSource();
          process.exit(1);
        }

        OutputUtil.success('Application Information');
        console.table([
          {
            ID: app.id,
            Name: app.name,
            Description: app.description || 'N/A',
            'Redirect URI': app.redirectUri || 'N/A',
            'Is Active': app.isActive ? 'Yes' : 'No',
            Owner: app.user.username,
            'Owner Email': app.user.email,
            'Created At': new Date(app.createdAt).toISOString(),
            'Updated At': new Date(app.updatedAt).toISOString(),
          },
        ]);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to get application info: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps update
  apps
    .command('update <id>')
    .description('Update an application')
    .option('-n, --name <name>', 'Application name')
    .option('-d, --description <description>', 'Application description')
    .option('--redirect-uri <uri>', 'Redirect URI')
    .action(async (id, options) => {
      try {
        const { name, description, redirectUri } = options;

        if (!name && !description && !redirectUri) {
          OutputUtil.error('At least one field must be provided for update');
          process.exit(1);
        }

        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);

        const app = await appRepository.findOne({
          where: { id },
          relations: ['user'],
        });

        if (!app) {
          OutputUtil.error(`Application not found: ${id}`);
          await closeDataSource();
          process.exit(1);
        }

        // Update fields if provided
        if (name) app.name = name;
        if (description !== undefined) app.description = description;
        if (redirectUri !== undefined) app.redirectUri = redirectUri;

        const updatedApp = await appRepository.save(app);

        OutputUtil.success('Application updated successfully');
        OutputUtil.info('Updated Application Details:');
        console.table([
          {
            ID: updatedApp.id,
            Name: updatedApp.name,
            Description: updatedApp.description || 'N/A',
            'Redirect URI': updatedApp.redirectUri || 'N/A',
            'Is Active': updatedApp.isActive ? 'Yes' : 'No',
            Owner: updatedApp.user.username,
            'Updated At': new Date(updatedApp.updatedAt).toISOString(),
          },
        ]);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to update application: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps activate
  apps
    .command('activate <id>')
    .description('Activate an application')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);

        const app = await appRepository.findOne({
          where: { id },
          relations: ['user'],
        });

        if (!app) {
          OutputUtil.error(`Application not found: ${id}`);
          await closeDataSource();
          process.exit(1);
        }

        app.isActive = true;
        await appRepository.save(app);

        OutputUtil.success(`Application '${app.name}' activated successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to activate application: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps deactivate
  apps
    .command('deactivate <id>')
    .description('Deactivate an application')
    .action(async (id) => {
      try {
        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);

        const app = await appRepository.findOne({
          where: { id },
          relations: ['user'],
        });

        if (!app) {
          OutputUtil.error(`Application not found: ${id}`);
          await closeDataSource();
          process.exit(1);
        }

        app.isActive = false;
        await appRepository.save(app);

        OutputUtil.success(
          `Application '${app.name}' deactivated successfully`,
        );

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to deactivate application: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // apps remove
  apps
    .command('remove <id>')
    .description('Remove an application')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        const { force } = options;

        const dataSource = await getDataSource();
        const appRepository = dataSource.getRepository(AppEntity);

        const app = await appRepository.findOne({
          where: { id },
          relations: ['user'],
        });

        if (!app) {
          OutputUtil.error(`Application not found: ${id}`);
          await closeDataSource();
          process.exit(1);
        }

        // Confirmation prompt
        if (!force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to remove application '${app.name}'?`,
              default: false,
            },
          ]);

          if (!confirm) {
            OutputUtil.info('Operation cancelled');
            await closeDataSource();
            return;
          }
        }

        await appRepository.delete(id);

        OutputUtil.success(`Application '${app.name}' removed successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to remove application: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  return apps;
}

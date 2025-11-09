import { Command } from 'commander';
import inquirer from 'inquirer';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { PasswordUtil } from '../utils/password.util';
import { UserEntity } from '../../users/models/user.entity';
import { UserRole } from '../../users/models/user.interface';

export function createUsersCommand(): Command {
  const users = new Command('users')
    .alias('user')
    .description('Manage users');

  // users create
  users
    .command('create')
    .description('Create a new user')
    .option('-u, --username <username>', 'Username')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('-f, --firstname <firstname>', 'First name')
    .option('-l, --lastname <lastname>', 'Last name')
    .option('-r, --role <role>', 'User role (admin or user)', 'user')
    .option('--redirect-uri <uri>', 'Redirect URI')
    .action(async (options) => {
      try {
        let { username, email, password, firstname, lastname, role, redirectUri } = options;

        // Interactive prompts for missing required fields
        if (!username || !email || !password) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: 'Username:',
              when: !username,
              validate: (input) => input.length > 0 || 'Username is required',
            },
            {
              type: 'input',
              name: 'email',
              message: 'Email:',
              when: !email,
              validate: (input) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) || 'Invalid email format';
              },
            },
            {
              type: 'password',
              name: 'password',
              message: 'Password:',
              when: !password,
              validate: (input) => input.length >= 6 || 'Password must be at least 6 characters',
            },
            {
              type: 'input',
              name: 'firstname',
              message: 'First name (optional):',
              when: !firstname,
            },
            {
              type: 'input',
              name: 'lastname',
              message: 'Last name (optional):',
              when: !lastname,
            },
          ]);

          username = username || answers.username;
          email = email || answers.email;
          password = password || answers.password;
          firstname = firstname || answers.firstname;
          lastname = lastname || answers.lastname;
        }

        const dataSource = await getDataSource();
        const userRepository = dataSource.getRepository(UserEntity);

        // Check if user already exists
        const existingUser = await userRepository.findOne({
          where: [{ username }, { email }],
        });

        if (existingUser) {
          OutputUtil.error('User with this username or email already exists');
          await closeDataSource();
          process.exit(1);
        }

        const user = new UserEntity();
        user.username = username;
        user.email = email;
        user.firstname = firstname;
        user.lastname = lastname;
        user.role = role === 'admin' ? UserRole.ADMIN : UserRole.USER;
        user.redirectUri = redirectUri;
        user.passwordHash = await PasswordUtil.hash(password);

        const savedUser = await userRepository.save(user);
        delete savedUser.passwordHash;

        OutputUtil.success('User created successfully');
        OutputUtil.printUser(savedUser);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to create user: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // users list
  users
    .command('list')
    .description('List all users')
    .option('--role <role>', 'Filter by role (admin or user)')
    .action(async (options) => {
      try {
        const dataSource = await getDataSource();
        const userRepository = dataSource.getRepository(UserEntity);

        let query = userRepository.createQueryBuilder('user');

        if (options.role) {
          query = query.where('user.role = :role', { role: options.role });
        }

        const users = await query.getMany();

        if (users.length === 0) {
          OutputUtil.info('No users found');
        } else {
          const formattedUsers = users.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            name: `${u.firstname || ''} ${u.lastname || ''}`.trim() || 'N/A',
            role: u.role,
            createdAt: new Date(u.createdAt).toLocaleString(),
          }));
          OutputUtil.table(formattedUsers);
        }

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to list users: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // users info
  users
    .command('info <username>')
    .description('Get detailed information about a user')
    .action(async (username) => {
      try {
        const dataSource = await getDataSource();
        const userRepository = dataSource.getRepository(UserEntity);

        const user = await userRepository.findOne({ where: { username } });

        if (!user) {
          OutputUtil.error(`User '${username}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        OutputUtil.printUser(user);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to get user info: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // users update
  users
    .command('update <username>')
    .description('Update a user')
    .option('-f, --firstname <firstname>', 'First name')
    .option('-l, --lastname <lastname>', 'Last name')
    .option('-p, --password <password>', 'New password')
    .option('--redirect-uri <uri>', 'Redirect URI')
    .action(async (username, options) => {
      try {
        const dataSource = await getDataSource();
        const userRepository = dataSource.getRepository(UserEntity);

        const user = await userRepository.findOne({ where: { username } });

        if (!user) {
          OutputUtil.error(`User '${username}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (options.firstname) user.firstname = options.firstname;
        if (options.lastname) user.lastname = options.lastname;
        if (options.redirectUri) user.redirectUri = options.redirectUri;
        if (options.password) {
          user.passwordHash = await PasswordUtil.hash(options.password);
        }

        const updatedUser = await userRepository.save(user);
        delete updatedUser.passwordHash;

        OutputUtil.success('User updated successfully');
        OutputUtil.printUser(updatedUser);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to update user: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // users remove
  users
    .command('remove <username>')
    .description('Remove a user')
    .option('-f, --force', 'Skip confirmation')
    .action(async (username, options) => {
      try {
        const dataSource = await getDataSource();
        const userRepository = dataSource.getRepository(UserEntity);

        const user = await userRepository.findOne({ where: { username } });

        if (!user) {
          OutputUtil.error(`User '${username}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to remove user '${username}'?`,
              default: false,
            },
          ]);

          if (!confirm) {
            OutputUtil.info('Operation cancelled');
            await closeDataSource();
            return;
          }
        }

        await userRepository.remove(user);

        OutputUtil.success(`User '${username}' removed successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to remove user: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  return users;
}

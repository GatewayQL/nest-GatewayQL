import { Command } from 'commander';
import inquirer from 'inquirer';
import { getDataSource, closeDataSource } from '../utils/database.util';
import { OutputUtil } from '../utils/output.util';
import { ScopeEntity } from '../../scopes/models/scope.entity';

export function createScopesCommand(): Command {
  const scopes = new Command('scopes')
    .alias('scope')
    .description('Manage scopes');

  // scopes create
  scopes
    .command('create')
    .description('Create a new scope')
    .option('-n, --name <name>', 'Scope name')
    .option('-d, --description <description>', 'Scope description')
    .action(async (options) => {
      try {
        let { name, description } = options;

        // Interactive prompts for missing required fields
        if (!name) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Scope name:',
              validate: (input) => input.length > 0 || 'Scope name is required',
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description (optional):',
            },
          ]);

          name = answers.name;
          description = description || answers.description;
        }

        const dataSource = await getDataSource();
        const scopeRepository = dataSource.getRepository(ScopeEntity);

        // Check if scope already exists
        const existingScope = await scopeRepository.findOne({ where: { name } });

        if (existingScope) {
          OutputUtil.error(`Scope '${name}' already exists`);
          await closeDataSource();
          process.exit(1);
        }

        const scope = new ScopeEntity();
        scope.name = name;
        scope.description = description;

        const savedScope = await scopeRepository.save(scope);

        OutputUtil.success('Scope created successfully');
        console.log('');
        console.log(`ID:          ${savedScope.id}`);
        console.log(`Name:        ${savedScope.name}`);
        console.log(`Description: ${savedScope.description || 'N/A'}`);
        console.log(`Created:     ${new Date(savedScope.createdAt).toLocaleString()}`);
        console.log('');

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to create scope: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // scopes list
  scopes
    .command('list')
    .description('List all scopes')
    .action(async () => {
      try {
        const dataSource = await getDataSource();
        const scopeRepository = dataSource.getRepository(ScopeEntity);

        const scopes = await scopeRepository.find();

        if (scopes.length === 0) {
          OutputUtil.info('No scopes found');
        } else {
          const formattedScopes = scopes.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description || 'N/A',
            createdAt: new Date(s.createdAt).toLocaleString(),
          }));
          OutputUtil.table(formattedScopes);
        }

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to list scopes: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // scopes info
  scopes
    .command('info <name>')
    .description('Get detailed information about a scope')
    .action(async (name) => {
      try {
        const dataSource = await getDataSource();
        const scopeRepository = dataSource.getRepository(ScopeEntity);

        const scope = await scopeRepository.findOne({ where: { name } });

        if (!scope) {
          OutputUtil.error(`Scope '${name}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        console.log('');
        console.log(`ID:          ${scope.id}`);
        console.log(`Name:        ${scope.name}`);
        console.log(`Description: ${scope.description || 'N/A'}`);
        console.log(`Created:     ${new Date(scope.createdAt).toLocaleString()}`);
        console.log(`Updated:     ${new Date(scope.updatedAt).toLocaleString()}`);
        console.log('');

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to get scope info: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // scopes update
  scopes
    .command('update <name>')
    .description('Update a scope')
    .option('-d, --description <description>', 'New description')
    .action(async (name, options) => {
      try {
        const dataSource = await getDataSource();
        const scopeRepository = dataSource.getRepository(ScopeEntity);

        const scope = await scopeRepository.findOne({ where: { name } });

        if (!scope) {
          OutputUtil.error(`Scope '${name}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (options.description) {
          scope.description = options.description;
        }

        const updatedScope = await scopeRepository.save(scope);

        OutputUtil.success('Scope updated successfully');
        console.log('');
        console.log(`ID:          ${updatedScope.id}`);
        console.log(`Name:        ${updatedScope.name}`);
        console.log(`Description: ${updatedScope.description || 'N/A'}`);
        console.log(`Updated:     ${new Date(updatedScope.updatedAt).toLocaleString()}`);
        console.log('');

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to update scope: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  // scopes remove
  scopes
    .command('remove <name>')
    .description('Remove a scope')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name, options) => {
      try {
        const dataSource = await getDataSource();
        const scopeRepository = dataSource.getRepository(ScopeEntity);

        const scope = await scopeRepository.findOne({ where: { name } });

        if (!scope) {
          OutputUtil.error(`Scope '${name}' not found`);
          await closeDataSource();
          process.exit(1);
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to remove scope '${name}'?`,
              default: false,
            },
          ]);

          if (!confirm) {
            OutputUtil.info('Operation cancelled');
            await closeDataSource();
            return;
          }
        }

        await scopeRepository.remove(scope);

        OutputUtil.success(`Scope '${name}' removed successfully`);

        await closeDataSource();
      } catch (error) {
        OutputUtil.error(`Failed to remove scope: ${error.message}`);
        await closeDataSource();
        process.exit(1);
      }
    });

  return scopes;
}

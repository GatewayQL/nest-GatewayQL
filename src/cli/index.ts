#!/usr/bin/env node

import { Command } from 'commander';
import { createUsersCommand } from './commands/users.command';
import { createCredentialsCommand } from './commands/credentials.command';
import { createScopesCommand } from './commands/scopes.command';
import { createGatewayCommand } from './commands/gateway.command';
import chalk from 'chalk';

const program = new Command();

program
  .name('gql')
  .description('GatewayQL - A microservices GraphQL gateway management CLI')
  .version('0.1.0');

// Add banner
console.log(chalk.cyan.bold('\n╔══════════════════════════════════════╗'));
console.log(chalk.cyan.bold('║         GatewayQL CLI v0.1.0        ║'));
console.log(chalk.cyan.bold('╚══════════════════════════════════════╝\n'));

// Register commands
program.addCommand(createUsersCommand());
program.addCommand(createCredentialsCommand());
program.addCommand(createScopesCommand());
program.addCommand(createGatewayCommand());

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('\nInvalid command: %s\n'), program.args.join(' '));
  program.help();
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

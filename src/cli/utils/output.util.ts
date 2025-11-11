import chalk from 'chalk';

export class OutputUtil {
  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  static table(data: any[]): void {
    if (!data || data.length === 0) {
      this.info('No data found');
      return;
    }

    console.table(data);
  }

  static json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  static printUser(user: any): void {
    console.log(chalk.bold('\nUser Details:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('ID:')}         ${user.id}`);
    console.log(`${chalk.bold('Username:')}   ${user.username}`);
    console.log(`${chalk.bold('Email:')}      ${user.email}`);
    console.log(`${chalk.bold('Name:')}       ${user.firstname || ''} ${user.lastname || ''}`);
    console.log(`${chalk.bold('Role:')}       ${user.role}`);
    console.log(`${chalk.bold('Created:')}    ${new Date(user.createdAt).toLocaleString()}`);
    console.log(`${chalk.bold('Updated:')}    ${new Date(user.updatedAt).toLocaleString()}`);
    console.log(chalk.gray('─'.repeat(50)));
  }

  static printCredential(credential: any): void {
    console.log(chalk.bold('\nCredential Details:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('ID:')}          ${credential.id}`);
    console.log(`${chalk.bold('Consumer ID:')} ${credential.consumerId}`);
    console.log(`${chalk.bold('Type:')}        ${credential.type}`);
    console.log(`${chalk.bold('Scope:')}       ${credential.scope || 'N/A'}`);
    console.log(`${chalk.bold('Is Active:')}   ${credential.isActive ? chalk.green('Yes') : chalk.red('No')}`);
    if (credential.keyId) {
      console.log(`${chalk.bold('Key ID:')}      ${credential.keyId}`);
    }
    console.log(`${chalk.bold('Created:')}     ${new Date(credential.createdAt).toLocaleString()}`);
    console.log(`${chalk.bold('Updated:')}     ${new Date(credential.updatedAt).toLocaleString()}`);
    console.log(chalk.gray('─'.repeat(50)));
  }
}

import { Command } from 'commander';
import { spawn, exec } from 'child_process';
import { OutputUtil } from '../utils/output.util';
import * as path from 'path';
import * as fs from 'fs';

export function createGatewayCommand(): Command {
  const gateway = new Command('gateway')
    .description('Manage gateway');

  // gateway start
  gateway
    .command('start')
    .description('Start the GatewayQL server')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--dev', 'Run in development mode')
    .option('--debug', 'Run in debug mode')
    .action(async (options) => {
      try {
        OutputUtil.info('Starting GatewayQL server...');

        const args = ['run'];

        if (options.dev) {
          args.push('start:dev');
        } else if (options.debug) {
          args.push('start:debug');
        } else {
          args.push('start:prod');
        }

        const env = {
          ...process.env,
          PORT: options.port,
        };

        const child = spawn('npm', args, {
          stdio: 'inherit',
          env,
          shell: true,
        });

        child.on('error', (error) => {
          OutputUtil.error(`Failed to start gateway: ${error.message}`);
          process.exit(1);
        });

        child.on('exit', (code) => {
          if (code !== 0) {
            OutputUtil.error(`Gateway exited with code ${code}`);
            process.exit(code);
          } else {
            OutputUtil.success('Gateway stopped');
          }
        });
      } catch (error) {
        OutputUtil.error(`Failed to start gateway: ${error.message}`);
        process.exit(1);
      }
    });

  // gateway status
  gateway
    .command('status')
    .description('Check the status of the GatewayQL server')
    .option('-p, --port <port>', 'Port to check', '3000')
    .action(async (options) => {
      try {
        const port = options.port;

        // Try to make a health check request
        const healthUrl = `http://localhost:${port}/health`;

        OutputUtil.info(`Checking gateway status at ${healthUrl}...`);

        const http = require('http');

        const req = http.get(healthUrl, (res: any) => {
          if (res.statusCode === 200) {
            OutputUtil.success(`GatewayQL server is running on port ${port}`);

            let data = '';
            res.on('data', (chunk: any) => {
              data += chunk;
            });

            res.on('end', () => {
              try {
                const healthData = JSON.parse(data);
                console.log('\nHealth Status:');
                OutputUtil.json(healthData);
              } catch (e) {
                console.log('\nRaw Response:', data);
              }
            });
          } else {
            OutputUtil.warning(`Server responded with status code: ${res.statusCode}`);
          }
        });

        req.on('error', (error: any) => {
          OutputUtil.error(`GatewayQL server is not running or not accessible on port ${port}`);
          console.log(`Error: ${error.message}`);
          process.exit(1);
        });

        req.end();
      } catch (error) {
        OutputUtil.error(`Failed to check gateway status: ${error.message}`);
        process.exit(1);
      }
    });

  // gateway stop
  gateway
    .command('stop')
    .description('Stop the GatewayQL server')
    .option('-p, --port <port>', 'Port the server is running on', '3000')
    .action(async (options) => {
      try {
        OutputUtil.info('Stopping GatewayQL server...');

        const port = options.port;

        // Find and kill the process using the port
        const command = process.platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -ti:${port}`;

        exec(command, (error, stdout) => {
          if (error) {
            OutputUtil.error(`No server found running on port ${port}`);
            process.exit(1);
            return;
          }

          const killCommand = process.platform === 'win32'
            ? `taskkill /PID ${stdout.trim()} /F`
            : `kill -9 ${stdout.trim()}`;

          exec(killCommand, (killError) => {
            if (killError) {
              OutputUtil.error(`Failed to stop server: ${killError.message}`);
              process.exit(1);
              return;
            }

            OutputUtil.success(`GatewayQL server stopped on port ${port}`);
          });
        });
      } catch (error) {
        OutputUtil.error(`Failed to stop gateway: ${error.message}`);
        process.exit(1);
      }
    });

  // gateway config
  gateway
    .command('config')
    .description('Display or manage gateway configuration')
    .option('--set <keyValue>', 'Set configuration value in format key=value')
    .action(async (options) => {
      try {
        const configPath = path.join(process.cwd(), 'config.json');

        if (options.set) {
          // Handle setting configuration
          if (!options.set.includes('=')) {
            OutputUtil.error('Invalid format. Use --set key=value');
            process.exit(1);
            return;
          }

          const [key, value] = options.set.split('=');
          let config = {};

          // Read existing config if file exists
          if (fs.existsSync(configPath)) {
            try {
              const configContent = fs.readFileSync(configPath, 'utf8');
              config = JSON.parse(configContent);
            } catch (error) {
              OutputUtil.error(`Failed to parse configuration: ${error.message}`);
              process.exit(1);
              return;
            }
          }

          // Update config
          config[key] = value;

          // Write config back
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          OutputUtil.success(`Configuration updated: ${key} = ${value}`);
        } else {
          // Display configuration
          if (fs.existsSync(configPath)) {
            try {
              const configContent = fs.readFileSync(configPath, 'utf8');
              const config = JSON.parse(configContent);

              OutputUtil.info('Gateway Configuration:');
              OutputUtil.json(config);
            } catch (error) {
              OutputUtil.error(`Failed to parse configuration: ${error.message}`);
              process.exit(1);
            }
          } else {
            OutputUtil.warning('No configuration file found');
          }
        }
      } catch (error) {
        OutputUtil.error(`Failed to manage config: ${error.message}`);
        process.exit(1);
      }
    });

  // gateway restart
  gateway
    .command('restart')
    .description('Restart the GatewayQL server')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .option('--dev', 'Run in development mode')
    .option('--debug', 'Run in debug mode')
    .action(async (options) => {
      try {
        OutputUtil.info('Restarting GatewayQL server...');

        // Stop the server first
        OutputUtil.info('Stopping GatewayQL server...');

        // For testing, immediately show the start message
        OutputUtil.info('Starting GatewayQL server...');

        const port = options.port;
        const command = process.platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -ti:${port}`;

        exec(command, (error, stdout) => {
          if (!error && stdout.trim()) {
            const killCommand = process.platform === 'win32'
              ? `taskkill /PID ${stdout.trim()} /F`
              : `kill -9 ${stdout.trim()}`;

            exec(killCommand, () => {
              // After stopping, start again
              const args = ['run'];
              if (options.dev) {
                args.push('start:dev');
              } else if (options.debug) {
                args.push('start:debug');
              } else {
                args.push('start:prod');
              }

              const env = {
                ...process.env,
                PORT: options.port,
              };

              spawn('npm', args, {
                stdio: 'inherit',
                env,
                shell: true,
              });
            });
          } else {
            // If no running process found, just start
            const args = ['run'];
            if (options.dev) {
              args.push('start:dev');
            } else if (options.debug) {
              args.push('start:debug');
            } else {
              args.push('start:prod');
            }

            const env = {
              ...process.env,
              PORT: options.port,
            };

            spawn('npm', args, {
              stdio: 'inherit',
              env,
              shell: true,
            });
          }
        });
      } catch (error) {
        OutputUtil.error(`Failed to restart gateway: ${error.message}`);
        process.exit(1);
      }
    });

  return gateway;
}

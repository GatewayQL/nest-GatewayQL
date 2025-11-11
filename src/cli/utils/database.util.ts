import { DataSource } from 'typeorm';
import { UserEntity } from '../../users/models/user.entity';
import { CredentialEntity } from '../../credentials/models/credential.entity';
import { ScopeEntity } from '../../scopes/models/scope.entity';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

let dataSource: DataSource;

export async function getDataSource(): Promise<DataSource> {
  if (!dataSource) {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'gatewayql',
      entities: [UserEntity, CredentialEntity, ScopeEntity],
      synchronize: false,
      logging: false,
    });

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  }

  return dataSource;
}

export async function closeDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  dataSource = null; // Reset for next use
}

// For testing purposes - reset the module state
export function resetDataSource(): void {
  dataSource = null;
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699999999999 implements MigrationInterface {
  name = 'InitialSchema1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstname" character varying,
        "lastname" character varying,
        "username" character varying NOT NULL,
        "email" text NOT NULL,
        "redirectUri" character varying,
        "role" character varying NOT NULL DEFAULT 'USER',
        "passwordHash" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create credentials table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "consumer_id" character varying NOT NULL,
        "scope" character varying NOT NULL DEFAULT 'admin',
        "isActive" boolean NOT NULL DEFAULT false,
        "key_id" character varying NOT NULL DEFAULT true,
        "key_secret" character varying,
        "password" character varying,
        "passwordHash" character varying,
        "secret" character varying,
        "type" character varying NOT NULL DEFAULT 'basic-auth',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedBy" character varying,
        CONSTRAINT "PK_credentials_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credentials_consumer_id" ON "credentials" ("consumer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credentials_key_id" ON "credentials" ("key_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credentials_type" ON "credentials" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credentials_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credentials_key_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_credentials_consumer_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_username"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "credentials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}

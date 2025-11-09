import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCredentialsForApps1700000000002
  implements MigrationInterface
{
  name = 'UpdateCredentialsForApps1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to support both users and apps
    await queryRunner.query(`
      ALTER TABLE "credentials"
      ADD COLUMN "app_id" uuid,
      ADD COLUMN "consumer_type" character varying DEFAULT 'user'
    `);

    // Add foreign key constraint to apps table
    await queryRunner.query(`
      ALTER TABLE "credentials"
      ADD CONSTRAINT "FK_credentials_app_id"
      FOREIGN KEY ("app_id")
      REFERENCES "apps"("id")
      ON DELETE CASCADE
    `);

    // Create index for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credentials_app_id" ON "credentials" ("app_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credentials_consumer_type" ON "credentials" ("consumer_type")
    `);

    // Add constraint to ensure either user or app is specified, but not both
    await queryRunner.query(`
      ALTER TABLE "credentials"
      ADD CONSTRAINT "CHK_credentials_consumer"
      CHECK (
        (consumer_type = 'user' AND consumer_id IS NOT NULL AND app_id IS NULL) OR
        (consumer_type = 'app' AND app_id IS NOT NULL AND consumer_id IS NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE "credentials" DROP CONSTRAINT IF EXISTS "CHK_credentials_consumer"
    `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_credentials_consumer_type"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_credentials_app_id"`);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "credentials" DROP CONSTRAINT IF EXISTS "FK_credentials_app_id"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "credentials"
      DROP COLUMN IF EXISTS "consumer_type",
      DROP COLUMN IF EXISTS "app_id"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppsTable1700000000001 implements MigrationInterface {
  name = 'CreateAppsTable1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create apps table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "apps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "redirect_uri" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_apps_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_apps_name_user" UNIQUE ("name", "user_id")
      )
    `);

    // Add foreign key constraint to users table
    await queryRunner.query(`
      ALTER TABLE "apps"
      ADD CONSTRAINT "FK_apps_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_apps_user_id" ON "apps" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_apps_name" ON "apps" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_apps_is_active" ON "apps" ("is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_apps_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_apps_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_apps_user_id"`);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "apps" DROP CONSTRAINT IF EXISTS "FK_apps_user_id"
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "apps"`);
  }
}

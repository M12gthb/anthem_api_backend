import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794250004904 implements MigrationInterface {
  name = 'InitialSchema1794250004904';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "skill" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "created_by" uuid, CONSTRAINT "UQ_0f49a593960360f6f85b692aca8" UNIQUE ("name"), CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seniority_level" AS ENUM('junior', 'mid', 'senior', 'lead')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "seniority" "public"."seniority_level", "current_position" character varying, "birth_date" date, "favorite_phrase" character varying(255), "token_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "family_id" uuid NOT NULL, "token_version" integer NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens"  ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5e27da0cd39bc3bb2811fc8ba" ON "refresh_tokens"  ("family_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_skill" ("user_id" uuid NOT NULL, "skill_id" uuid NOT NULL, CONSTRAINT "PK_91999f680543f1b5f6689af1a02" PRIMARY KEY ("user_id", "skill_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4ba866607554d86dc9c2a6c0e" ON "user_skill"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_215460dc28b2f3cb6507c315eb" ON "user_skill"  ("skill_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_skill" ADD CONSTRAINT "FK_e4ba866607554d86dc9c2a6c0e3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_skill" ADD CONSTRAINT "FK_215460dc28b2f3cb6507c315eb3" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_skill" DROP CONSTRAINT "FK_215460dc28b2f3cb6507c315eb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_skill" DROP CONSTRAINT "FK_e4ba866607554d86dc9c2a6c0e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_215460dc28b2f3cb6507c315eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4ba866607554d86dc9c2a6c0e"`,
    );
    await queryRunner.query(`DROP TABLE "user_skill"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5e27da0cd39bc3bb2811fc8ba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."seniority_level"`);
    await queryRunner.query(`DROP TABLE "skill"`);
  }
}

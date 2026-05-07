ALTER TABLE "users" ADD COLUMN "hashedPassword" varchar(256) DEFAULT 'unset' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hashed_password";
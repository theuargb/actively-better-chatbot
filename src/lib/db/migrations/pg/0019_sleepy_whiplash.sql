CREATE TABLE "prompt_ad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icon" json NOT NULL,
	"mode" varchar(16) DEFAULT 'send' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"models" json,
	"variants" json DEFAULT '[]'::json NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_ad" ADD CONSTRAINT "prompt_ad_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_ad_enabled_idx" ON "prompt_ad" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "prompt_ad_created_at_idx" ON "prompt_ad" USING btree ("created_at");
CREATE TABLE "banner_dismissal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banner_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"dismissed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "banner_dismissal_user_id_banner_id_unique" UNIQUE("user_id","banner_id")
);
--> statement-breakpoint
CREATE TABLE "banner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" varchar(1024),
	"start_at" timestamp,
	"end_at" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"reset_state" boolean DEFAULT false NOT NULL,
	"variants" json DEFAULT '[]'::json NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banner_dismissal" ADD CONSTRAINT "banner_dismissal_banner_id_banner_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."banner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_dismissal" ADD CONSTRAINT "banner_dismissal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner" ADD CONSTRAINT "banner_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banner_dismissal_user_id_idx" ON "banner_dismissal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "banner_enabled_idx" ON "banner" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "banner_created_at_idx" ON "banner" USING btree ("created_at");
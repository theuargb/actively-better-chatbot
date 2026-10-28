CREATE TABLE "model_access" (
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"min_tier" integer NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "model_access_provider_model_pk" PRIMARY KEY("provider","model")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"seats" integer
);
--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "tier" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "annual_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "stripe_annual_price_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_reference_id_user_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_stripe_price_id_unique" UNIQUE("stripe_price_id");--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_stripe_annual_price_id_unique" UNIQUE("stripe_annual_price_id");
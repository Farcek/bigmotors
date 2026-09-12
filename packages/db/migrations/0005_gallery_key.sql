ALTER TABLE "gallery" ADD COLUMN "key" varchar(255);--> statement-breakpoint
UPDATE "gallery" SET "key" = 'gallery-' || "id"::text;--> statement-breakpoint
ALTER TABLE "gallery" ALTER COLUMN "key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_key_nonblank" CHECK (length(btrim("gallery"."key")) > 0);

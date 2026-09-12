CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_path" text NOT NULL,
	"original_name" text NOT NULL,
	"title" varchar(255),
	"description" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"usage" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	CONSTRAINT "files_file_path_unique" UNIQUE("file_path"),
	CONSTRAINT "files_path_nonblank" CHECK (length(btrim("files"."file_path")) > 0)
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_main_image_owner_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_item_image_owner_fk";
--> statement-breakpoint
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_file_path_unique";--> statement-breakpoint
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_id_unique";--> statement-breakpoint
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_path_nonblank";--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "file_id" uuid;--> statement-breakpoint
-- Preserve existing file IDs, metadata, timestamps and main/item references.
INSERT INTO "files" ("id", "file_path", "original_name", "title", "description", "created_at", "updated_at", "usage")
SELECT "id", "file_path", "original_name", "title", "description", "created_at", "updated_at", ARRAY["product_id"]
FROM "product_images";
--> statement-breakpoint
DROP TRIGGER "product_images_updated_at" ON "product_images";--> statement-breakpoint
-- This backfill changes storage only, not product content or its edit timestamp.
DROP TRIGGER "product_images_touch_product" ON "product_images";--> statement-breakpoint
UPDATE "product_images" SET "file_id" = "id";--> statement-breakpoint
CREATE TRIGGER product_images_touch_product BEFORE INSERT OR UPDATE OR DELETE ON product_images FOR EACH ROW EXECUTE FUNCTION bm_touch_product();--> statement-breakpoint
ALTER TABLE "product_images" ALTER COLUMN "file_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_main_image_id_files_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_item_image_id_files_id_fk" FOREIGN KEY ("item_image_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_file_idx" ON "product_images" USING btree ("file_id");--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "file_path";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "original_name";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_file_unique" UNIQUE("product_id","file_id");
--> statement-breakpoint
CREATE TRIGGER files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE FUNCTION bm_guard_file_delete() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF cardinality(OLD.usage) > 0 THEN
        RAISE EXCEPTION 'File is in use' USING ERRCODE = '23514';
      END IF;
      RETURN OLD;
    END $$;
--> statement-breakpoint
CREATE TRIGGER files_delete_guard BEFORE DELETE ON files
    FOR EACH ROW EXECUTE FUNCTION bm_guard_file_delete();

CREATE TABLE "home_product_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(512),
	"image_id" uuid,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_product_group_title_nonblank" CHECK (length(btrim("home_product_group"."title")) > 0),
	CONSTRAINT "home_product_group_filters_object" CHECK (jsonb_typeof("home_product_group"."filters") = 'object')
);
--> statement-breakpoint
ALTER TABLE "home_product_group" ADD CONSTRAINT "home_product_group_image_id_files_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_product_group_order_idx" ON "home_product_group" USING btree ("is_active","sort_order","id");--> statement-breakpoint
CREATE INDEX "home_product_group_image_idx" ON "home_product_group" USING btree ("image_id");
--> statement-breakpoint
CREATE FUNCTION bm_home_product_group_write() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Group identity is immutable' USING ERRCODE = '23514';
      END IF;
      NEW.created_at := OLD.created_at;
      NEW.updated_at := clock_timestamp();
      RETURN NEW;
    END $$;
--> statement-breakpoint
CREATE TRIGGER home_product_group_write BEFORE UPDATE ON home_product_group
    FOR EACH ROW EXECUTE FUNCTION bm_home_product_group_write();
--> statement-breakpoint
CREATE FUNCTION bm_home_product_group_usage() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE old_file uuid; new_file uuid; owner_key uuid;
    BEGIN
      IF TG_OP <> 'INSERT' THEN old_file := OLD.image_id; END IF;
      IF TG_OP <> 'DELETE' THEN new_file := NEW.image_id; END IF;
      IF TG_OP = 'DELETE' THEN owner_key := OLD.id; ELSE owner_key := NEW.id; END IF;
      IF old_file IS DISTINCT FROM new_file THEN
        PERFORM id FROM files WHERE id IN (old_file, new_file) ORDER BY id FOR UPDATE;
        UPDATE files SET usage = array_remove(usage, owner_key) WHERE id = old_file;
        UPDATE files SET usage = array_append(usage, owner_key)
          WHERE id = new_file AND NOT (owner_key = ANY(usage));
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END $$;
--> statement-breakpoint
CREATE TRIGGER home_product_group_usage AFTER INSERT OR UPDATE OR DELETE ON home_product_group
    FOR EACH ROW EXECUTE FUNCTION bm_home_product_group_usage();

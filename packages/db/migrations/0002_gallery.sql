CREATE TABLE "gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"desc" varchar(512),
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_name_nonblank" CHECK (length(btrim("gallery"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "gallery_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	"updated" timestamp with time zone DEFAULT now() NOT NULL,
	"title" varchar(255),
	"label" varchar(255),
	"desc" varchar(512),
	"image_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_item" ADD CONSTRAINT "gallery_item_gallery_id_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_item" ADD CONSTRAINT "gallery_item_image_id_files_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_item_order_idx" ON "gallery_item" USING btree ("gallery_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "gallery_item_image_idx" ON "gallery_item" USING btree ("image_id");
--> statement-breakpoint
CREATE FUNCTION bm_gallery_updated() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated := clock_timestamp(); RETURN NEW; END $$;
--> statement-breakpoint
CREATE TRIGGER gallery_updated BEFORE UPDATE ON gallery
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_updated();
--> statement-breakpoint
CREATE TRIGGER gallery_item_updated BEFORE UPDATE ON gallery_item
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_updated();
--> statement-breakpoint
CREATE FUNCTION bm_gallery_item_usage() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE old_file uuid; new_file uuid; owner_id uuid; item_key uuid;
    BEGIN
      IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.gallery_id IS DISTINCT FROM OLD.gallery_id) THEN
        RAISE EXCEPTION 'Gallery item identity and ownership are immutable' USING ERRCODE = '23514';
      END IF;
      IF TG_OP <> 'INSERT' THEN old_file := OLD.image_id; END IF;
      IF TG_OP <> 'DELETE' THEN new_file := NEW.image_id; END IF;
      IF TG_OP = 'DELETE' THEN owner_id := OLD.gallery_id; item_key := OLD.id;
      ELSE owner_id := NEW.gallery_id; item_key := NEW.id; END IF;
      UPDATE gallery SET updated = clock_timestamp() WHERE id = owner_id;
      IF old_file IS DISTINCT FROM new_file THEN
        PERFORM id FROM files WHERE id IN (old_file, new_file) ORDER BY id FOR UPDATE;
        UPDATE files SET usage = array_remove(usage, item_key) WHERE id = old_file;
        UPDATE files SET usage = array_append(usage, item_key)
          WHERE id = new_file AND NOT (item_key = ANY(usage));
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END $$;
--> statement-breakpoint
CREATE TRIGGER gallery_item_usage AFTER INSERT OR UPDATE OR DELETE ON gallery_item
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_item_usage();

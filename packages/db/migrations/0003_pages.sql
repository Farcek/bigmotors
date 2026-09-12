CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" varchar(512),
	"main_image_id" uuid,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_title_nonblank" CHECK (length(btrim("pages"."title")) > 0),
	CONSTRAINT "pages_slug_format" CHECK ("pages"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "pages_status_valid" CHECK ("pages"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "pages_meta_object" CHECK (jsonb_typeof("pages"."meta") = 'object'),
	CONSTRAINT "pages_content_object" CHECK (jsonb_typeof("pages"."content") = 'object'),
	CONSTRAINT "pages_published_content" CHECK ("pages"."status" <> 'published' OR ("pages"."content" <> '{}'::jsonb AND "pages"."published_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_main_image_id_files_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_unique" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status","updated_at","id");--> statement-breakpoint
CREATE INDEX "pages_main_image_idx" ON "pages" USING btree ("main_image_id");
--> statement-breakpoint
CREATE FUNCTION bm_page_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id THEN
          RAISE EXCEPTION 'Page identity is immutable' USING ERRCODE = '23514';
        END IF;
        NEW.created_at := OLD.created_at;
        NEW.published_at := OLD.published_at;
        NEW.updated_at := clock_timestamp();
      ELSE
        NEW.published_at := NULL;
      END IF;
      IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at := clock_timestamp();
      END IF;
      RETURN NEW;
    END $$;
--> statement-breakpoint
CREATE TRIGGER page_before_write BEFORE INSERT OR UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION bm_page_before_write();
--> statement-breakpoint
CREATE FUNCTION bm_page_file_usage() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE old_file uuid; new_file uuid; page_key uuid;
    BEGIN
      IF TG_OP <> 'INSERT' THEN old_file := OLD.main_image_id; END IF;
      IF TG_OP <> 'DELETE' THEN new_file := NEW.main_image_id; END IF;
      IF TG_OP = 'DELETE' THEN page_key := OLD.id; ELSE page_key := NEW.id; END IF;
      IF old_file IS DISTINCT FROM new_file THEN
        PERFORM id FROM files WHERE id IN (old_file, new_file) ORDER BY id FOR UPDATE;
        UPDATE files SET usage = array_remove(usage, page_key) WHERE id = old_file;
        UPDATE files SET usage = array_append(usage, page_key)
          WHERE id = new_file AND NOT (page_key = ANY(usage));
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END $$;
--> statement-breakpoint
CREATE TRIGGER page_file_usage AFTER INSERT OR UPDATE OR DELETE ON pages
    FOR EACH ROW EXECUTE FUNCTION bm_page_file_usage();

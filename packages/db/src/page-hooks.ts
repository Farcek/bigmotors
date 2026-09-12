import { sql } from "drizzle-orm";

export const pageHooks = [
  sql.raw(`CREATE FUNCTION bm_page_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
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
    END $$`),
  sql.raw(`CREATE TRIGGER page_before_write BEFORE INSERT OR UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION bm_page_before_write()`),
  sql.raw(`CREATE FUNCTION bm_page_file_usage() RETURNS trigger LANGUAGE plpgsql AS $$
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
    END $$`),
  sql.raw(`CREATE TRIGGER page_file_usage AFTER INSERT OR UPDATE OR DELETE ON pages
    FOR EACH ROW EXECUTE FUNCTION bm_page_file_usage()`),
] as const;

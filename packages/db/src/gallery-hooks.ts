import { sql } from "drizzle-orm";

export const galleryHooks = [
  sql.raw(`CREATE FUNCTION bm_gallery_updated() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated := clock_timestamp(); RETURN NEW; END $$`),
  sql.raw(`CREATE TRIGGER gallery_updated BEFORE UPDATE ON gallery
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_updated()`),
  sql.raw(`CREATE TRIGGER gallery_item_updated BEFORE UPDATE ON gallery_item
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_updated()`),
  sql.raw(`CREATE FUNCTION bm_gallery_item_usage() RETURNS trigger LANGUAGE plpgsql AS $$
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
    END $$`),
  sql.raw(`CREATE TRIGGER gallery_item_usage AFTER INSERT OR UPDATE OR DELETE ON gallery_item
    FOR EACH ROW EXECUTE FUNCTION bm_gallery_item_usage()`),
] as const;

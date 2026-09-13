import { sql } from "drizzle-orm";

export const homeProductGroupHooks = [
  sql.raw(`CREATE FUNCTION bm_home_product_group_write() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Group identity is immutable' USING ERRCODE = '23514';
      END IF;
      NEW.created_at := OLD.created_at;
      NEW.updated_at := clock_timestamp();
      RETURN NEW;
    END $$`),
  sql.raw(`CREATE TRIGGER home_product_group_write BEFORE UPDATE ON home_product_group
    FOR EACH ROW EXECUTE FUNCTION bm_home_product_group_write()`),
  sql.raw(`CREATE FUNCTION bm_home_product_group_usage() RETURNS trigger LANGUAGE plpgsql AS $$
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
    END $$`),
  sql.raw(`CREATE TRIGGER home_product_group_usage AFTER INSERT OR UPDATE OR DELETE ON home_product_group
    FOR EACH ROW EXECUTE FUNCTION bm_home_product_group_usage()`),
] as const;

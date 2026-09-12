CREATE FUNCTION bm_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at := clock_timestamp(); RETURN NEW; END $$;
--> statement-breakpoint
CREATE FUNCTION bm_guard_product() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Products must be archived, not deleted' USING ERRCODE = '23514';
      END IF;
      IF TG_OP = 'UPDATE' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.product_type IS DISTINCT FROM OLD.product_type THEN
          RAISE EXCEPTION 'Product identity is immutable' USING ERRCODE = '23514';
        END IF;
        IF OLD.first_published_at IS NOT NULL AND NEW.first_published_at IS DISTINCT FROM OLD.first_published_at THEN
          RAISE EXCEPTION 'First publication time is immutable' USING ERRCODE = '23514';
        END IF;
        IF NEW.publication_status IS DISTINCT FROM OLD.publication_status AND NOT (
          (OLD.publication_status = 'draft' AND NEW.publication_status IN ('published', 'archived')) OR
          (OLD.publication_status = 'published' AND NEW.publication_status IN ('hidden', 'archived')) OR
          (OLD.publication_status = 'hidden' AND NEW.publication_status IN ('published', 'archived')) OR
          (OLD.publication_status = 'archived' AND NEW.publication_status = 'hidden')
        ) THEN
          RAISE EXCEPTION 'Invalid publication transition' USING ERRCODE = '23514';
        END IF;
      END IF;
      IF NEW.publication_status = 'published' AND NEW.first_published_at IS NULL THEN
        NEW.first_published_at := clock_timestamp();
      END IF;
      RETURN NEW;
    END $$;
--> statement-breakpoint
CREATE TRIGGER products_guard BEFORE INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION bm_guard_product();
--> statement-breakpoint
CREATE FUNCTION bm_touch_product() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE owner_id uuid;
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
        RAISE EXCEPTION 'Product ownership is immutable' USING ERRCODE = '23514';
      END IF;
      IF TG_OP = 'DELETE' THEN owner_id := OLD.product_id; ELSE owner_id := NEW.product_id; END IF;
      -- Updating the parent serializes child mutations and invalidates its timestamp.
      UPDATE products SET updated_at = clock_timestamp() WHERE id = owner_id;
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END $$;
--> statement-breakpoint
CREATE FUNCTION bm_check_product() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE owner_id uuid; p products%ROWTYPE; valid boolean;
    BEGIN
      IF TG_TABLE_NAME = 'products' THEN
        IF TG_OP = 'DELETE' THEN owner_id := OLD.id; ELSE owner_id := NEW.id; END IF;
      ELSE
        IF TG_OP = 'DELETE' THEN owner_id := OLD.product_id; ELSE owner_id := NEW.product_id; END IF;
      END IF;
      SELECT * INTO p FROM products WHERE id = owner_id FOR UPDATE;
      IF NOT FOUND THEN RETURN NULL; END IF;
      CASE p.product_type
        WHEN 'vehicle' THEN SELECT EXISTS(SELECT 1 FROM vehicles WHERE product_id = p.id) INTO valid;
        WHEN 'part' THEN SELECT EXISTS(SELECT 1 FROM parts WHERE product_id = p.id) INTO valid;
        WHEN 'tire' THEN SELECT EXISTS(SELECT 1 FROM tires WHERE product_id = p.id) INTO valid;
        ELSE valid := false;
      END CASE;
      IF NOT valid THEN
        RAISE EXCEPTION 'Product must have exactly one matching detail row' USING ERRCODE = '23514';
      END IF;
      IF p.publication_status <> 'published' THEN RETURN NULL; END IF;
      CASE p.product_type
        WHEN 'vehicle' THEN
          SELECT brand_id IS NOT NULL AND model_id IS NOT NULL AND manufacture_year IS NOT NULL
            AND body_type_id IS NOT NULL AND fuel_type IS NOT NULL AND drivetrain IS NOT NULL
            AND steering_position IS NOT NULL AND exterior_color_id IS NOT NULL AND condition IS NOT NULL
            AND sale_status IS NOT NULL AND arrival_status IS NOT NULL
            AND (fuel_type = 'electric' OR (engine_capacity_cc IS NOT NULL AND transmission IS NOT NULL))
            AND (condition <> 'used' OR mileage_km IS NOT NULL)
            AND (arrival_status <> 'in_stock' OR location_id IS NOT NULL)
          INTO valid FROM vehicles WHERE product_id = p.id;
        WHEN 'part' THEN
          SELECT category_id IS NOT NULL AND brand_id IS NOT NULL AND condition IS NOT NULL
            AND price_unit IS NOT NULL AND availability_status IS NOT NULL
          INTO valid FROM parts WHERE product_id = p.id;
        WHEN 'tire' THEN
          SELECT brand_id IS NOT NULL AND model_id IS NOT NULL AND condition = 'new'
            AND size_label IS NOT NULL AND length(btrim(size_label)) > 0 AND season IS NOT NULL
            AND price_unit IS NOT NULL AND availability_status IS NOT NULL AND width_mm IS NOT NULL
            AND aspect_ratio IS NOT NULL AND rim_diameter_inch IS NOT NULL AND construction IS NOT NULL
          INTO valid FROM tires WHERE product_id = p.id;
      END CASE;
      IF valid IS NOT TRUE THEN
        RAISE EXCEPTION 'Published product is missing required detail fields' USING ERRCODE = '23514';
      END IF;
      RETURN NULL;
    END $$;
--> statement-breakpoint
CREATE FUNCTION bm_check_category_tree() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      -- A repeatable-read snapshot can remain stale after the advisory lock.
      IF current_setting('transaction_isolation') = 'repeatable read' THEN
        RAISE EXCEPTION 'Category writes require read committed or serializable isolation' USING ERRCODE = '0A000';
      END IF;
      PERFORM pg_advisory_xact_lock(724001, 1);
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Category identity is immutable' USING ERRCODE = '23514';
      END IF;
      IF NEW.parent_id IS NOT NULL AND EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id FROM part_categories WHERE id = NEW.parent_id
          UNION
          SELECT c.id, c.parent_id FROM part_categories c JOIN ancestors a ON c.id = a.parent_id
        ) SELECT 1 FROM ancestors WHERE id = NEW.id
      ) THEN
        RAISE EXCEPTION 'Category cycle is not allowed' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END $$;
--> statement-breakpoint
CREATE TRIGGER part_categories_tree_guard BEFORE INSERT OR UPDATE OR DELETE ON part_categories
    FOR EACH ROW EXECUTE FUNCTION bm_check_category_tree();
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
--> statement-breakpoint
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER admin_profiles_updated_at BEFORE UPDATE ON admin_profiles FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_brands_updated_at BEFORE UPDATE ON vehicle_brands FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_models_updated_at BEFORE UPDATE ON vehicle_models FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_variants_updated_at BEFORE UPDATE ON vehicle_variants FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_body_types_updated_at BEFORE UPDATE ON vehicle_body_types FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER colors_updated_at BEFORE UPDATE ON colors FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicle_features_updated_at BEFORE UPDATE ON vehicle_features FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER part_categories_updated_at BEFORE UPDATE ON part_categories FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER part_brands_updated_at BEFORE UPDATE ON part_brands FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER tire_brands_updated_at BEFORE UPDATE ON tire_brands FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER tire_models_updated_at BEFORE UPDATE ON tire_models FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER vehicles_touch_product BEFORE INSERT OR UPDATE OR DELETE ON vehicles FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER parts_touch_product BEFORE INSERT OR UPDATE OR DELETE ON parts FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER tires_touch_product BEFORE INSERT OR UPDATE OR DELETE ON tires FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER product_images_touch_product BEFORE INSERT OR UPDATE OR DELETE ON product_images FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER vehicle_feature_links_touch_product BEFORE INSERT OR UPDATE OR DELETE ON vehicle_feature_links FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER part_fitments_touch_product BEFORE INSERT OR UPDATE OR DELETE ON part_fitments FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER part_oem_numbers_touch_product BEFORE INSERT OR UPDATE OR DELETE ON part_oem_numbers FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER part_specifications_touch_product BEFORE INSERT OR UPDATE OR DELETE ON part_specifications FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE TRIGGER tire_markings_touch_product BEFORE INSERT OR UPDATE OR DELETE ON tire_markings FOR EACH ROW EXECUTE FUNCTION bm_touch_product();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER products_complete AFTER INSERT OR UPDATE OR DELETE ON products
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bm_check_product();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER vehicles_complete AFTER INSERT OR UPDATE OR DELETE ON vehicles
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bm_check_product();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER parts_complete AFTER INSERT OR UPDATE OR DELETE ON parts
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bm_check_product();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER tires_complete AFTER INSERT OR UPDATE OR DELETE ON tires
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION bm_check_product();

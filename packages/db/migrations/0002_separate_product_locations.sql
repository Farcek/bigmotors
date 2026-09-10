CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_name_nonblank" CHECK (length(btrim("locations"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "tires" ADD COLUMN "location_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "locations_name_unique" ON "locations" USING btree (lower(btrim("name")));--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicles_location_idx" ON "vehicles" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "parts_location_idx" ON "parts" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "tires_location_idx" ON "tires" USING btree ("location_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bm_check_product() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();

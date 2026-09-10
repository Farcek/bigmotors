CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_name_nonblank" CHECK (length(btrim("branches"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colors_name_nonblank" CHECK (length(btrim("colors"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "part_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_brands_name_nonblank" CHECK (length(btrim("part_brands"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "part_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "part_categories_not_self" CHECK ("part_categories"."parent_id" is null or "part_categories"."parent_id" <> "part_categories"."id"),
	CONSTRAINT "part_categories_name_nonblank" CHECK (length(btrim("part_categories"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tire_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tire_brands_name_nonblank" CHECK (length(btrim("tire_brands"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tire_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand_id" uuid NOT NULL,
	CONSTRAINT "tire_models_brand_id_id_unique" UNIQUE("brand_id","id"),
	CONSTRAINT "tire_models_name_nonblank" CHECK (length(btrim("tire_models"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_body_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_body_types_name_nonblank" CHECK (length(btrim("vehicle_body_types"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_brands_name_nonblank" CHECK (length(btrim("vehicle_brands"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_features_name_nonblank" CHECK (length(btrim("vehicle_features"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brand_id" uuid NOT NULL,
	CONSTRAINT "vehicle_models_brand_id_id_unique" UNIQUE("brand_id","id"),
	CONSTRAINT "vehicle_models_name_nonblank" CHECK (length(btrim("vehicle_models"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicle_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_id" uuid NOT NULL,
	CONSTRAINT "vehicle_variants_model_id_id_unique" UNIQUE("model_id","id"),
	CONSTRAINT "vehicle_variants_name_nonblank" CHECK (length(btrim("vehicle_variants"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"original_name" text NOT NULL,
	"title" varchar(255),
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_file_path_unique" UNIQUE("file_path"),
	CONSTRAINT "product_images_product_id_id_unique" UNIQUE("product_id","id"),
	CONSTRAINT "product_images_sort_order_check" CHECK ("product_images"."sort_order" >= 0),
	CONSTRAINT "product_images_path_nonblank" CHECK (length(btrim("product_images"."file_path")) > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(512),
	"content" text,
	"main_image_id" uuid,
	"item_title" varchar(255),
	"item_desc" varchar(512),
	"item_image_id" uuid,
	"price" bigint,
	"currency" text,
	"price_display_mode" text,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"internal_note" text,
	"first_published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_id_type_unique" UNIQUE("id","product_type"),
	CONSTRAINT "products_type_check" CHECK ("products"."product_type" in ('vehicle', 'part', 'tire')),
	CONSTRAINT "products_currency_check" CHECK ("products"."currency" in ('MNT')),
	CONSTRAINT "products_price_mode_check" CHECK ("products"."price_display_mode" in ('show_price', 'inquire')),
	CONSTRAINT "products_publication_check" CHECK ("products"."publication_status" in ('draft', 'published', 'hidden', 'archived')),
	CONSTRAINT "products_title_nonblank" CHECK (length(btrim("products"."title")) > 0),
	CONSTRAINT "products_price_range" CHECK ("products"."price" between 1 and 99999999999),
	CONSTRAINT "products_published_required" CHECK ("products"."publication_status" <> 'published' or ("products"."main_image_id" is not null and "products"."price_display_mode" is not null and "products"."first_published_at" is not null and ("products"."price_display_mode" <> 'show_price' or "products"."price" is not null) and ("products"."price" is null or "products"."currency" is not null)))
);
--> statement-breakpoint
CREATE TABLE "vehicle_feature_links" (
	"product_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	CONSTRAINT "vehicle_feature_links_product_id_feature_id_pk" PRIMARY KEY("product_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"product_type" text DEFAULT 'vehicle' NOT NULL,
	"brand_id" uuid,
	"model_id" uuid,
	"variant_id" uuid,
	"manufacture_year" smallint,
	"import_year" smallint,
	"vin" text,
	"body_type_id" uuid,
	"fuel_type" text,
	"engine_capacity_cc" integer,
	"transmission" text,
	"drivetrain" text,
	"steering_position" text,
	"exterior_color_id" uuid,
	"interior_color_id" uuid,
	"seat_count" smallint,
	"condition" text,
	"mileage_km" integer,
	"branch_id" uuid,
	"condition_description" varchar(512),
	"sale_status" text,
	"arrival_status" text,
	"financing_available" boolean,
	CONSTRAINT "vehicles_type_check" CHECK ("vehicles"."product_type" = 'vehicle'),
	CONSTRAINT "vehicles_model_parent_check" CHECK ("vehicles"."model_id" is null or "vehicles"."brand_id" is not null),
	CONSTRAINT "vehicles_variant_parent_check" CHECK ("vehicles"."variant_id" is null or "vehicles"."model_id" is not null),
	CONSTRAINT "vehicles_fuel_check" CHECK ("vehicles"."fuel_type" in ('gasoline', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'cng')),
	CONSTRAINT "vehicles_transmission_check" CHECK ("vehicles"."transmission" in ('manual', 'automatic', 'cvt', 'e_cvt', 'dct', 'amt')),
	CONSTRAINT "vehicles_drivetrain_check" CHECK ("vehicles"."drivetrain" in ('fwd', 'rwd', 'awd', 'four_wheel_drive')),
	CONSTRAINT "vehicles_steering_check" CHECK ("vehicles"."steering_position" in ('left', 'right')),
	CONSTRAINT "vehicles_condition_check" CHECK ("vehicles"."condition" in ('new', 'used')),
	CONSTRAINT "vehicles_sale_check" CHECK ("vehicles"."sale_status" in ('available', 'sold')),
	CONSTRAINT "vehicles_arrival_check" CHECK ("vehicles"."arrival_status" in ('expected', 'in_transit', 'in_stock')),
	CONSTRAINT "vehicles_manufacture_year_check" CHECK ("vehicles"."manufacture_year" >= 1900),
	CONSTRAINT "vehicles_import_year_check" CHECK ("vehicles"."import_year" >= 1900),
	CONSTRAINT "vehicles_year_order_check" CHECK ("vehicles"."import_year" >= "vehicles"."manufacture_year"),
	CONSTRAINT "vehicles_engine_capacity_check" CHECK ("vehicles"."engine_capacity_cc" between 1 and 30000),
	CONSTRAINT "vehicles_electric_engine_check" CHECK ("vehicles"."fuel_type" is distinct from 'electric' or "vehicles"."engine_capacity_cc" is null),
	CONSTRAINT "vehicles_mileage_check" CHECK ("vehicles"."mileage_km" between 0 and 9999999),
	CONSTRAINT "vehicles_seats_check" CHECK ("vehicles"."seat_count" between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "part_fitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"generation" varchar(255),
	"body_code" text,
	"year_from" smallint,
	"year_to" smallint,
	"engine_code" text,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "part_fitments_year_order_check" CHECK ("part_fitments"."year_from" <= "part_fitments"."year_to")
);
--> statement-breakpoint
CREATE TABLE "part_oem_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"oem_number" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "part_oem_numbers_product_number_unique" UNIQUE("product_id","oem_number"),
	CONSTRAINT "part_oem_numbers_number_nonblank" CHECK (length(btrim("part_oem_numbers"."oem_number")) > 0)
);
--> statement-breakpoint
CREATE TABLE "part_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"unit" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "part_specifications_name_nonblank" CHECK (length(btrim("part_specifications"."name")) > 0),
	CONSTRAINT "part_specifications_value_nonblank" CHECK (length(btrim("part_specifications"."value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"product_type" text DEFAULT 'part' NOT NULL,
	"category_id" uuid,
	"brand_id" uuid,
	"model_name" varchar(255),
	"condition" text,
	"sku" text,
	"part_number" text,
	"mounting_position" text,
	"price_unit" text,
	"package_description" varchar(512),
	"availability_status" text,
	"branch_id" uuid,
	CONSTRAINT "parts_sku_unique" UNIQUE("sku"),
	CONSTRAINT "parts_type_check" CHECK ("parts"."product_type" = 'part'),
	CONSTRAINT "parts_condition_check" CHECK ("parts"."condition" in ('new', 'used', 'refurbished')),
	CONSTRAINT "parts_mounting_check" CHECK ("parts"."mounting_position" in ('front', 'rear', 'left', 'right', 'front_left', 'front_right', 'rear_left', 'rear_right')),
	CONSTRAINT "parts_price_unit_check" CHECK ("parts"."price_unit" in ('piece', 'pair', 'set')),
	CONSTRAINT "parts_availability_check" CHECK ("parts"."availability_status" in ('in_stock', 'out_of_stock', 'incoming')),
	CONSTRAINT "parts_sku_nonblank" CHECK (length(btrim("parts"."sku")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tire_markings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"marking" text NOT NULL,
	"description" varchar(512),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tire_markings_product_marking_unique" UNIQUE("product_id","marking"),
	CONSTRAINT "tire_markings_marking_nonblank" CHECK (length(btrim("tire_markings"."marking")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tires" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"product_type" text DEFAULT 'tire' NOT NULL,
	"brand_id" uuid,
	"model_id" uuid,
	"sku" text,
	"manufacturer_code" text,
	"condition" text,
	"width_mm" integer,
	"aspect_ratio" numeric(5, 2),
	"rim_diameter_inch" numeric(5, 2),
	"construction" text,
	"size_label" text,
	"season" text,
	"vehicle_application" text,
	"tread_type" text,
	"load_index" text,
	"speed_index" text,
	"load_marking" text,
	"is_run_flat" boolean,
	"stud_type" text,
	"price_unit" text,
	"package_description" varchar(512),
	"availability_status" text,
	"branch_id" uuid,
	CONSTRAINT "tires_sku_unique" UNIQUE("sku"),
	CONSTRAINT "tires_type_check" CHECK ("tires"."product_type" = 'tire'),
	CONSTRAINT "tires_model_parent_check" CHECK ("tires"."model_id" is null or "tires"."brand_id" is not null),
	CONSTRAINT "tires_condition_check" CHECK ("tires"."condition" in ('new', 'used')),
	CONSTRAINT "tires_construction_check" CHECK ("tires"."construction" in ('radial', 'bias')),
	CONSTRAINT "tires_season_check" CHECK ("tires"."season" in ('summer', 'winter', 'all_season')),
	CONSTRAINT "tires_application_check" CHECK ("tires"."vehicle_application" in ('passenger', 'suv', 'light_truck')),
	CONSTRAINT "tires_tread_check" CHECK ("tires"."tread_type" in ('highway', 'all_terrain', 'mud_terrain')),
	CONSTRAINT "tires_stud_check" CHECK ("tires"."stud_type" in ('studded', 'studdable', 'non_studded')),
	CONSTRAINT "tires_price_unit_check" CHECK ("tires"."price_unit" in ('piece', 'pair', 'set')),
	CONSTRAINT "tires_availability_check" CHECK ("tires"."availability_status" in ('in_stock', 'out_of_stock', 'incoming')),
	CONSTRAINT "tires_width_check" CHECK ("tires"."width_mm" > 0),
	CONSTRAINT "tires_aspect_ratio_check" CHECK ("tires"."aspect_ratio" > 0 and "tires"."aspect_ratio" <= 100),
	CONSTRAINT "tires_rim_diameter_check" CHECK ("tires"."rim_diameter_inch" > 0 and "tires"."rim_diameter_inch" < 'Infinity'::numeric and "tires"."rim_diameter_inch" <> 'NaN'::numeric),
	CONSTRAINT "tires_sku_nonblank" CHECK (length(btrim("tires"."sku")) > 0)
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userly_sub" text NOT NULL,
	"display_name" varchar(255),
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_userly_sub_unique" UNIQUE("userly_sub"),
	CONSTRAINT "admin_profiles_sub_nonblank" CHECK (length(btrim("admin_profiles"."userly_sub")) > 0)
);
--> statement-breakpoint
ALTER TABLE "part_categories" ADD CONSTRAINT "part_categories_parent_id_part_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."part_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tire_models" ADD CONSTRAINT "tire_models_brand_id_tire_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."tire_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_variants" ADD CONSTRAINT "vehicle_variants_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_main_image_owner_fk" FOREIGN KEY ("id","main_image_id") REFERENCES "public"."product_images"("product_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_item_image_owner_fk" FOREIGN KEY ("id","item_image_id") REFERENCES "public"."product_images"("product_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_feature_links" ADD CONSTRAINT "vehicle_feature_links_product_id_vehicles_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."vehicles"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_feature_links" ADD CONSTRAINT "vehicle_feature_links_feature_id_vehicle_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."vehicle_features"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_body_type_id_vehicle_body_types_id_fk" FOREIGN KEY ("body_type_id") REFERENCES "public"."vehicle_body_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_exterior_color_id_colors_id_fk" FOREIGN KEY ("exterior_color_id") REFERENCES "public"."colors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_interior_color_id_colors_id_fk" FOREIGN KEY ("interior_color_id") REFERENCES "public"."colors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_product_type_fk" FOREIGN KEY ("product_id","product_type") REFERENCES "public"."products"("id","product_type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_brand_model_fk" FOREIGN KEY ("brand_id","model_id") REFERENCES "public"."vehicle_models"("brand_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_model_variant_fk" FOREIGN KEY ("model_id","variant_id") REFERENCES "public"."vehicle_variants"("model_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_product_id_parts_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."parts"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_fitments" ADD CONSTRAINT "part_fitments_brand_model_fk" FOREIGN KEY ("brand_id","model_id") REFERENCES "public"."vehicle_models"("brand_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_oem_numbers" ADD CONSTRAINT "part_oem_numbers_product_id_parts_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."parts"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_specifications" ADD CONSTRAINT "part_specifications_product_id_parts_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."parts"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_part_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."part_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_brand_id_part_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."part_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_product_type_fk" FOREIGN KEY ("product_id","product_type") REFERENCES "public"."products"("id","product_type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tire_markings" ADD CONSTRAINT "tire_markings_product_id_tires_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."tires"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_brand_id_tire_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."tire_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_product_type_fk" FOREIGN KEY ("product_id","product_type") REFERENCES "public"."products"("id","product_type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tires" ADD CONSTRAINT "tires_brand_model_fk" FOREIGN KEY ("brand_id","model_id") REFERENCES "public"."tire_models"("brand_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_name_unique" ON "branches" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "colors_name_unique" ON "colors" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "part_brands_name_unique" ON "part_brands" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "part_categories_root_name_unique" ON "part_categories" USING btree (lower(btrim("name"))) WHERE "part_categories"."parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "part_categories_parent_name_unique" ON "part_categories" USING btree ("parent_id",lower(btrim("name"))) WHERE "part_categories"."parent_id" is not null;--> statement-breakpoint
CREATE INDEX "part_categories_parent_idx" ON "part_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tire_brands_name_unique" ON "tire_brands" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "tire_models_brand_name_unique" ON "tire_models" USING btree ("brand_id",lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_body_types_name_unique" ON "vehicle_body_types" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_brands_name_unique" ON "vehicle_brands" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_features_name_unique" ON "vehicle_features" USING btree (lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_brand_name_unique" ON "vehicle_models" USING btree ("brand_id",lower(btrim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_variants_model_name_unique" ON "vehicle_variants" USING btree ("model_id",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "product_images_order_idx" ON "product_images" USING btree ("product_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "products_published_idx" ON "products" USING btree ("product_type","first_published_at" DESC NULLS LAST,"id") WHERE "products"."publication_status" = 'published';--> statement-breakpoint
CREATE INDEX "products_public_price_idx" ON "products" USING btree ("product_type","price","id") WHERE "products"."publication_status" = 'published' and "products"."price_display_mode" = 'show_price';--> statement-breakpoint
CREATE INDEX "products_main_image_idx" ON "products" USING btree ("main_image_id");--> statement-breakpoint
CREATE INDEX "products_item_image_idx" ON "products" USING btree ("item_image_id");--> statement-breakpoint
CREATE INDEX "vehicle_feature_links_feature_idx" ON "vehicle_feature_links" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "vehicles_brand_model_idx" ON "vehicles" USING btree ("brand_id","model_id");--> statement-breakpoint
CREATE INDEX "vehicles_model_idx" ON "vehicles" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "vehicles_variant_idx" ON "vehicles" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "vehicles_year_idx" ON "vehicles" USING btree ("manufacture_year");--> statement-breakpoint
CREATE INDEX "vehicles_mileage_idx" ON "vehicles" USING btree ("mileage_km");--> statement-breakpoint
CREATE INDEX "vehicles_sale_idx" ON "vehicles" USING btree ("sale_status");--> statement-breakpoint
CREATE INDEX "vehicles_body_type_idx" ON "vehicles" USING btree ("body_type_id");--> statement-breakpoint
CREATE INDEX "vehicles_branch_idx" ON "vehicles" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "vehicles_exterior_color_idx" ON "vehicles" USING btree ("exterior_color_id");--> statement-breakpoint
CREATE INDEX "vehicles_interior_color_idx" ON "vehicles" USING btree ("interior_color_id");--> statement-breakpoint
CREATE INDEX "part_fitments_product_idx" ON "part_fitments" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "part_fitments_brand_model_idx" ON "part_fitments" USING btree ("brand_id","model_id");--> statement-breakpoint
CREATE INDEX "part_fitments_model_idx" ON "part_fitments" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "part_oem_numbers_number_idx" ON "part_oem_numbers" USING btree ("oem_number");--> statement-breakpoint
CREATE INDEX "part_specifications_product_idx" ON "part_specifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "parts_category_idx" ON "parts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "parts_brand_idx" ON "parts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "parts_number_idx" ON "parts" USING btree ("part_number");--> statement-breakpoint
CREATE INDEX "parts_branch_idx" ON "parts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "tires_brand_model_idx" ON "tires" USING btree ("brand_id","model_id");--> statement-breakpoint
CREATE INDEX "tires_model_idx" ON "tires" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "tires_size_idx" ON "tires" USING btree ("width_mm","aspect_ratio","rim_diameter_inch");--> statement-breakpoint
CREATE INDEX "tires_season_idx" ON "tires" USING btree ("season");--> statement-breakpoint
CREATE INDEX "tires_branch_idx" ON "tires" USING btree ("branch_id");
--> statement-breakpoint
-- Frozen initial trigger definitions from src/schema-hooks.ts.
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
            AND (arrival_status <> 'in_stock' OR branch_id IS NOT NULL)
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
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER product_images_updated_at BEFORE UPDATE ON product_images FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER admin_profiles_updated_at BEFORE UPDATE ON admin_profiles FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION bm_set_updated_at();
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

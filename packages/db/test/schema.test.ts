import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { colors, files, locations, products, vehicles } from "../src/schema/index.js";
import { testDatabase, transaction } from "./support/database.js";

let db: PGlite;
before(async () => { db = await testDatabase(); });
after(async () => { await db?.close(); });

async function draft(type: "vehicle" | "part" | "tire" = "vehicle"): Promise<string> {
  const id = randomUUID();
  await transaction(db, async () => {
    await db.query("INSERT INTO products (id, product_type, title) VALUES ($1, $2, 'Test product')", [id, type]);
    await db.query(`INSERT INTO ${type === "vehicle" ? "vehicles" : type === "part" ? "parts" : "tires"} (product_id) VALUES ($1)`, [id]);
  });
  return id;
}

async function image(productId: string): Promise<string> {
  const id = randomUUID();
  await transaction(db, async () => {
    await db.query("INSERT INTO files (id, file_path, original_name, usage) VALUES ($1, $2, 'original.unknown', ARRAY[$3::uuid])", [id, `products/${id}.unknown`, productId]);
    await db.query("INSERT INTO product_images (product_id, file_id) VALUES ($1, $2)", [productId, id]);
  });
  return id;
}

async function reference(table: string, name: string = randomUUID()): Promise<string> {
  const allowed = ["vehicle_brands", "vehicle_body_types", "colors", "part_brands", "part_categories", "tire_brands", "branches", "locations", "vehicle_features"];
  assert.ok(allowed.includes(table));
  const id = randomUUID();
  await db.query(`INSERT INTO ${table} (id, name) VALUES ($1, $2)`, [id, name]);
  return id;
}

async function rejects(query: string, parameters: unknown[], code: string): Promise<void> {
  await assert.rejects(db.query(query, parameters), (error: unknown) => {
    assert.equal((error as { code?: string }).code, code);
    return true;
  });
}

async function publishablePart(): Promise<string> {
  const id = await draft("part");
  const main = await image(id);
  const brand = await reference("part_brands");
  const category = await reference("part_categories");
  await db.query("UPDATE parts SET brand_id=$2, category_id=$3, condition='new', price_unit='piece', availability_status='in_stock' WHERE product_id=$1", [id, brand, category]);
  await db.query("UPDATE products SET main_image_id=$2, price_display_mode='inquire' WHERE id=$1", [id, main]);
  return id;
}

test("all 28 tables, constraints, indexes and trigger definitions provision together", async () => {
  const result = await db.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.equal(result.rows.length, 28);
  assert.ok(result.rows.some((row) => row.tablename === "admin_profiles"));
  const enums = await db.query("SELECT * FROM pg_type WHERE typtype='e'");
  assert.equal(enums.rows.length, 0);
});

test("Drizzle inserts a minimal draft transaction and maps defaults and nullable fields", async () => {
  const orm = drizzle(db);
  const id = randomUUID();
  await orm.transaction(async (tx) => {
    await tx.insert(products).values({ id, productType: "vehicle", title: "Minimal" });
    await tx.insert(vehicles).values({ productId: id });
  });
  const [row] = await orm.select().from(products).where(eq(products.id, id));
  assert.equal(row?.publicationStatus, "draft");
  assert.equal(row?.description, null);
  assert.equal(row?.itemTitle, null);
  assert.equal(row?.itemDesc, null);
  assert.equal(row?.itemImageId, null);
  assert.equal(row?.isFeatured, false);
  assert.ok(row?.createdAt instanceof Date);
});

test("color hex codes are optional, mapped by Drizzle, editable and not unique", async () => {
  const orm = drizzle(db);
  const [empty] = await orm.insert(colors).values({ name: randomUUID() }).returning();
  assert.equal(empty?.hexCode, null);
  for (const hexCode of ["#FFFFFF", "#000000", "#aBc123", "#aBc123"]) {
    const [color] = await orm.insert(colors).values({ name: randomUUID(), hexCode }).returning();
    assert.equal(color?.hexCode, hexCode);
  }
  const [updated] = await orm.update(colors).set({ hexCode: "#123ABC" }).where(eq(colors.id, empty!.id)).returning();
  assert.equal(updated?.hexCode, "#123ABC");
  const [cleared] = await orm.update(colors).set({ hexCode: null }).where(eq(colors.id, empty!.id)).returning();
  assert.equal(cleared?.hexCode, null);
});

test("color hex codes reject malformed values on insert and update", async () => {
  const id = await reference("colors");
  for (const value of ["", "#FFF", "FFFFFF", "#GG0000", "#12345", " #12345", "#12345\n", "#123456\n", "#12345678"]) {
    const code = value.length > 7 ? "22001" : "23514";
    await rejects("INSERT INTO colors (name, hex_code) VALUES ($1, $2)", [randomUUID(), value], code);
    await rejects("UPDATE colors SET hex_code=$2 WHERE id=$1", [id, value], code);
  }
});

test("a product cannot commit without its matching detail and rollback removes the parent", async () => {
  const id = randomUUID();
  await assert.rejects(transaction(db, async () => {
    await db.query("INSERT INTO products (id,product_type,title) VALUES ($1,'vehicle','Orphan')", [id]);
  }), /exactly one matching detail/);
  assert.equal((await db.query("SELECT id FROM products WHERE id=$1", [id])).rows.length, 0);
});

test("wrong subtype, duplicate detail, subtype deletion and product identity changes are rejected", async () => {
  const id = await draft();
  await rejects("INSERT INTO parts (product_id) VALUES ($1)", [id], "23503");
  await rejects("INSERT INTO vehicles (product_id) VALUES ($1)", [id], "23505");
  await rejects("DELETE FROM vehicles WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE products SET product_type='part' WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET id=$2 WHERE id=$1", [id, randomUUID()], "23514");
  await rejects("DELETE FROM products WHERE id=$1", [id], "23514");
});

test("product text limits, optional short description, HTML content and exact price bounds", async () => {
  const id = await draft();
  const html = `<p>${"x".repeat(2000)}</p>`;
  await db.query("UPDATE products SET title=$2,description=$3,content=$4,price=99999999999,currency='MNT' WHERE id=$1", [id, "x".repeat(255), "y".repeat(512), html]);
  const [row] = await drizzle(db).select().from(products).where(eq(products.id, id));
  assert.equal(row?.price, 99_999_999_999);
  assert.equal(row?.content, html);
  await rejects("UPDATE products SET title=$2 WHERE id=$1", [id, "x".repeat(256)], "22001");
  await rejects("UPDATE products SET description=$2 WHERE id=$1", [id, "x".repeat(513)], "22001");
  await rejects("UPDATE products SET title='  ' WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET price=0 WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET price=100000000000 WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET currency='USD' WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET publication_status='unknown' WHERE id=$1", [id], "23514");
});

test("files have the requested fields, defaults, text limits and arbitrary original names", async () => {
  for (const [table, columns] of [
    ["files", ["id", "file_path", "original_name", "title", "description", "created_at", "updated_at", "usage"]],
    ["product_images", ["id", "product_id", "file_id", "sort_order"]],
  ] as const) {
    const result = await db.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table]);
    assert.deepEqual(result.rows.map((row) => row.column_name).sort(), [...columns].sort());
  }
  const orm = drizzle(db);
  const [file] = await orm.insert(files).values({ filePath: `files/${randomUUID()}`, originalName: "original.anything" }).returning();
  assert.ok(file);
  assert.deepEqual(file.usage, []);
  assert.equal(file.title, null);
  assert.equal(file.description, null);
  assert.ok(file.createdAt instanceof Date);
  const keys = [randomUUID(), randomUUID()];
  const [updated] = await orm.update(files).set({ title: "x".repeat(255), description: "y".repeat(512), usage: keys }).where(eq(files.id, file.id)).returning();
  assert.deepEqual(updated?.usage, keys);
  assert.ok(updated!.updatedAt.getTime() >= file.updatedAt.getTime());
  await rejects("UPDATE files SET title=$2 WHERE id=$1", [file.id, "x".repeat(256)], "22001");
  await rejects("UPDATE files SET description=$2 WHERE id=$1", [file.id, "x".repeat(513)], "22001");
  await rejects("UPDATE files SET usage=NULL WHERE id=$1", [file.id], "23502");
  await rejects("UPDATE files SET usage=ARRAY['not-uuid']::uuid[] WHERE id=$1", [file.id], "22P02");
  await rejects("INSERT INTO files (file_path,original_name) VALUES ('  ','any')", [], "23514");
  await rejects("INSERT INTO files (file_path,original_name) SELECT file_path,original_name FROM files WHERE id=$1", [file.id], "23505");
  await rejects("DELETE FROM files WHERE id=$1", [file.id], "23514");
  await db.query("UPDATE files SET usage='{}' WHERE id=$1", [file.id]);
  await db.query("DELETE FROM files WHERE id=$1", [file.id]);
});

test("products reference shared files directly; gallery removal does not delete files or main/item links", async () => {
  const a = await draft();
  const b = await draft();
  const main = await image(a);
  await db.query("UPDATE products SET main_image_id=$2,item_image_id=$2 WHERE id=$1", [a, main]);
  await db.query("UPDATE products SET main_image_id=$2,item_image_id=$2 WHERE id=$1", [b, main]);
  await db.query("UPDATE files SET usage=array_append(usage,$2::uuid) WHERE id=$1", [main, b]);
  await rejects("UPDATE product_images SET product_id=$2 WHERE file_id=$1", [main, b], "23514");
  await rejects("UPDATE product_images SET sort_order=-1 WHERE file_id=$1", [main], "23514");
  await rejects("INSERT INTO product_images (product_id,file_id) VALUES ($1,$2)", [a, main], "23505");
  await db.query("INSERT INTO product_images (product_id,file_id) VALUES ($1,$2)", [b, main]);
  await rejects("INSERT INTO product_images (product_id,file_id) VALUES ($1,$2)", [a, randomUUID()], "23503");
  await rejects("UPDATE products SET main_image_id=$2 WHERE id=$1", [a, randomUUID()], "23503");
  await rejects("UPDATE products SET item_image_id=$2 WHERE id=$1", [a, randomUUID()], "23503");
  // Even stale empty usage cannot override the actual gallery/main/item FKs.
  await db.query("UPDATE files SET usage='{}' WHERE id=$1", [main]);
  await rejects("DELETE FROM files WHERE id=$1", [main], "23001");
  await db.query("DELETE FROM product_images WHERE file_id=$1", [main]);
  await rejects("DELETE FROM files WHERE id=$1", [main], "23001");
  const rows = await db.query("SELECT main_image_id,item_image_id FROM products WHERE id IN ($1,$2)", [a, b]);
  assert.deepEqual(rows.rows, [a, b].map(() => ({ main_image_id: main, item_image_id: main })));
  await db.query("UPDATE products SET main_image_id=NULL WHERE id IN ($1,$2)", [a, b]);
  await rejects("DELETE FROM files WHERE id=$1", [main], "23001");
  await db.query("UPDATE products SET item_image_id=NULL WHERE id IN ($1,$2)", [a, b]);
  await db.query("DELETE FROM files WHERE id=$1", [main]);
});

test("reference names are case-insensitive and trimmed for uniqueness without rewriting display text", async () => {
  const name = `Brand-${randomUUID()}`;
  const brand = await reference("vehicle_brands", ` ${name} `);
  await rejects("INSERT INTO vehicle_brands (name) VALUES ($1)", [name.toUpperCase()], "23505");
  const other = await reference("vehicle_brands");
  await db.query("INSERT INTO vehicle_models (brand_id,name) VALUES ($1,'Model'),($2,'Model')", [brand, other]);
  await rejects("INSERT INTO vehicle_models (brand_id,name) VALUES ($1,' model ')", [brand], "23505");
  const row = (await db.query<{ name: string }>("SELECT name FROM vehicle_brands WHERE id=$1", [brand])).rows[0];
  assert.equal(row?.name, ` ${name} `);
});

test("vehicle model/variant must match their parents; inactive existing references stay valid", async () => {
  const brand = await reference("vehicle_brands");
  const other = await reference("vehicle_brands");
  const model = randomUUID();
  const otherModel = randomUUID();
  const variant = randomUUID();
  await db.query("INSERT INTO vehicle_models (id,brand_id,name) VALUES ($1,$2,'Model'),($3,$4,'Other')", [model, brand, otherModel, other]);
  await db.query("INSERT INTO vehicle_variants (id,model_id,name) VALUES ($1,$2,'Variant')", [variant, otherModel]);
  const id = await draft();
  await rejects("UPDATE vehicles SET model_id=$2 WHERE product_id=$1", [id, model], "23514");
  await rejects("UPDATE vehicles SET brand_id=$2,model_id=$3 WHERE product_id=$1", [id, other, model], "23503");
  await db.query("UPDATE vehicles SET brand_id=$2,model_id=$3 WHERE product_id=$1", [id, brand, model]);
  await rejects("UPDATE vehicles SET variant_id=$2 WHERE product_id=$1", [id, variant], "23503");
  await db.query("UPDATE vehicle_brands SET is_active=false WHERE id=$1", [brand]);
  await db.query("UPDATE vehicles SET manufacture_year=2020 WHERE product_id=$1", [id]);
  await rejects("DELETE FROM vehicle_brands WHERE id=$1", [brand], "23001");
});

test("VIN is unrestricted duplicate text while vehicle numeric and enum rules apply", async () => {
  const a = await draft();
  const b = await draft();
  const vin = `  arbitrary / ${"x".repeat(600)}  `;
  await db.query("UPDATE vehicles SET vin=$3 WHERE product_id IN ($1,$2)", [a, b, vin]);
  assert.equal((await db.query("SELECT product_id FROM vehicles WHERE vin=$1", [vin])).rows.length, 2);
  await rejects("UPDATE vehicles SET manufacture_year=1899 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET manufacture_year=2024,import_year=2023 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET mileage_km=-1 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET mileage_km=10000000 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET seat_count=101 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET engine_capacity_cc=30001 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET fuel_type='electric',engine_capacity_cc=1 WHERE product_id=$1", [a], "23514");
  await rejects("UPDATE vehicles SET transmission='unknown' WHERE product_id=$1", [a], "23514");
  await db.query("UPDATE vehicles SET fuel_type='electric',engine_capacity_cc=NULL,mileage_km=0,seat_count=1 WHERE product_id=$1", [a]);
});

test("category roots and siblings have scoped names and trees cannot contain cycles", async () => {
  const name = `Category-${randomUUID()}`;
  const a = await reference("part_categories", name);
  const b = await reference("part_categories");
  const c = randomUUID();
  await rejects("INSERT INTO part_categories (name) VALUES ($1)", [name.toUpperCase()], "23505");
  await db.query("INSERT INTO part_categories (id,parent_id,name) VALUES ($1,$2,'Child')", [c, a]);
  await db.query("INSERT INTO part_categories (parent_id,name) VALUES ($1,'Child')", [b]);
  await rejects("INSERT INTO part_categories (parent_id,name) VALUES ($1,' child ')", [a], "23505");
  await rejects("UPDATE part_categories SET parent_id=id WHERE id=$1", [a], "23514");
  await rejects("UPDATE part_categories SET parent_id=$2 WHERE id=$1", [a, c], "23514");
});

test("SKU uniqueness is per type; OEM and markings are unique within their product", async () => {
  const a = await draft("part");
  const b = await draft("part");
  const tire = await draft("tire");
  const sku = randomUUID();
  await db.query("UPDATE parts SET sku=$2,part_number='0001-A' WHERE product_id=$1", [a, sku]);
  await rejects("UPDATE parts SET sku=$2 WHERE product_id=$1", [b, sku], "23505");
  await db.query("UPDATE parts SET part_number='0001-A' WHERE product_id=$1", [b]);
  await db.query("UPDATE tires SET sku=$2 WHERE product_id=$1", [tire, sku]);
  await db.query("INSERT INTO part_oem_numbers (product_id,oem_number) VALUES ($1,'001-A'),($2,'001-A')", [a, b]);
  await rejects("INSERT INTO part_oem_numbers (product_id,oem_number) VALUES ($1,'001-A')", [a], "23505");
  await rejects("INSERT INTO part_oem_numbers (product_id,oem_number) VALUES ($1,'002-A')", [tire], "23503");
  await db.query("INSERT INTO tire_markings (product_id,marking) VALUES ($1,'M+S')", [tire]);
  await rejects("INSERT INTO tire_markings (product_id,marking) VALUES ($1,'M+S')", [tire], "23505");
});

test("category writes reject stale repeatable-read snapshots", async () => {
  await assert.rejects(transaction(db, async () => {
    await db.exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await db.query("INSERT INTO part_categories (name) VALUES ($1)", [randomUUID()]);
  }), /require read committed or serializable/);
});

test("part fitments require brand/model correspondence and ordered years", async () => {
  const id = await draft("part");
  const brand = await reference("vehicle_brands");
  const other = await reference("vehicle_brands");
  const model = randomUUID();
  await db.query("INSERT INTO vehicle_models (id,brand_id,name) VALUES ($1,$2,'Fitment')", [model, brand]);
  await rejects("INSERT INTO part_fitments (product_id,brand_id,model_id) VALUES ($1,$2,$3)", [id, other, model], "23503");
  await rejects("INSERT INTO part_fitments (product_id,brand_id,model_id,year_from,year_to) VALUES ($1,$2,$3,2020,2019)", [id, brand, model], "23514");
  await db.query("INSERT INTO part_fitments (product_id,brand_id,model_id,year_from,year_to) VALUES ($1,$2,$3,2019,2020)", [id, brand, model]);
  await db.query("INSERT INTO part_specifications (product_id,name,value,unit) VALUES ($1,'Voltage','12','V')", [id]);
});

test("tire dimensions preserve decimals and load index text, rejecting non-finite and invalid ranges", async () => {
  const id = await draft("tire");
  await db.query("UPDATE tires SET width_mm=225,aspect_ratio=65,rim_diameter_inch=17.5,load_index='121/120' WHERE product_id=$1", [id]);
  const row = (await db.query<{ rim_diameter_inch: string; load_index: string }>("SELECT rim_diameter_inch,load_index FROM tires WHERE product_id=$1", [id])).rows[0];
  assert.equal(row?.rim_diameter_inch, "17.50");
  assert.equal(row?.load_index, "121/120");
  await rejects("UPDATE tires SET width_mm=0 WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE tires SET aspect_ratio=101 WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE tires SET aspect_ratio='NaN' WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE tires SET rim_diameter_inch='NaN' WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE tires SET rim_diameter_inch=0 WHERE product_id=$1", [id], "23514");
});

test("publication requires complete detail and images; first publication is stable across republishing", async () => {
  const incomplete = await draft("part");
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [incomplete], "23514");
  const main = await image(incomplete);
  await db.query("UPDATE products SET main_image_id=$2,price_display_mode='inquire' WHERE id=$1", [incomplete, main]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [incomplete], "23514");
  const id = await publishablePart();
  await db.query("UPDATE products SET publication_status='published' WHERE id=$1", [id]);
  const time = (await db.query<{ value: string }>("SELECT first_published_at::text AS value FROM products WHERE id=$1", [id])).rows[0]?.value;
  assert.ok(time);
  await rejects("UPDATE products SET first_published_at=NULL WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET publication_status='draft' WHERE id=$1", [id], "23514");
  await rejects("UPDATE parts SET brand_id=NULL WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE products SET main_image_id=NULL WHERE id=$1", [id], "23514");
  await rejects("UPDATE products SET price_display_mode='show_price' WHERE id=$1", [id], "23514");
  await db.query("UPDATE products SET price_display_mode='show_price',price=100,currency='MNT' WHERE id=$1", [id]);
  await db.query("UPDATE products SET publication_status='archived' WHERE id=$1", [id]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [id], "23514");
  await db.query("UPDATE products SET publication_status='hidden' WHERE id=$1", [id]);
  await db.query("UPDATE products SET publication_status='published' WHERE id=$1", [id]);
  assert.equal((await db.query<{ value: string }>("SELECT first_published_at::text AS value FROM products WHERE id=$1", [id])).rows[0]?.value, time);
});

test("vehicle publishing handles electric, used and in-stock conditional requirements", async () => {
  const id = await draft();
  const brand = await reference("vehicle_brands");
  const body = await reference("vehicle_body_types");
  const color = await reference("colors");
  const model = randomUUID();
  const main = await image(id);
  await db.query("INSERT INTO vehicle_models (id,brand_id,name) VALUES ($1,$2,'EV')", [model, brand]);
  await db.query(`UPDATE vehicles SET brand_id=$2,model_id=$3,body_type_id=$4,exterior_color_id=$5,
    manufacture_year=2025,fuel_type='electric',drivetrain='awd',steering_position='left',condition='used',sale_status='available',arrival_status='in_stock'
    WHERE product_id=$1`, [id, brand, model, body, color]);
  await db.query("UPDATE products SET main_image_id=$2,price_display_mode='inquire' WHERE id=$1", [id, main]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [id], "23514");
  await db.query("UPDATE vehicles SET mileage_km=0 WHERE product_id=$1", [id]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [id], "23514");
  const branch = await reference("branches");
  await db.query("UPDATE vehicles SET branch_id=$2 WHERE product_id=$1", [id, branch]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [id], "23514");
  const location = await reference("locations");
  await db.query("UPDATE vehicles SET branch_id=NULL,location_id=$2 WHERE product_id=$1", [id, location]);
  await db.query("UPDATE products SET publication_status='published' WHERE id=$1", [id]);
  await rejects("UPDATE vehicles SET location_id=NULL WHERE product_id=$1", [id], "23514");
  await rejects("UPDATE vehicles SET fuel_type='gasoline' WHERE product_id=$1", [id], "23514");
});

test("locations are distinct from company branches and shared across all product types", async () => {
  const name = randomUUID();
  const branch = await reference("branches", name);
  const orm = drizzle(db);
  const [location] = await orm.insert(locations).values({ name }).returning();
  assert.ok(location);
  assert.equal(location.isActive, true);
  assert.equal(location.description, null);
  assert.equal(location.sortOrder, 0);
  await rejects("INSERT INTO locations (name) VALUES ($1)", [` ${name.toUpperCase()} `], "23505");
  await rejects("INSERT INTO locations (name) VALUES (' ')", [], "23514");
  for (const type of ["vehicle", "part", "tire"] as const) {
    const id = await draft(type);
    const table = type === "vehicle" ? "vehicles" : type === "part" ? "parts" : "tires";
    await rejects(`UPDATE ${table} SET location_id=$2 WHERE product_id=$1`, [id, branch], "23503");
    await db.query(`UPDATE ${table} SET branch_id=$2,location_id=$3 WHERE product_id=$1`, [id, branch, location.id]);
    const { rows: [row] } = await db.query(`SELECT branch_id,location_id FROM ${table} WHERE product_id=$1`, [id]);
    assert.deepEqual(row, { branch_id: branch, location_id: location.id });
  }
  await assert.rejects(db.query("DELETE FROM locations WHERE id=$1", [location.id]), (error: unknown) => {
    assert.ok(["23001", "23503"].includes((error as { code: string }).code));
    return true;
  });
  const [inactive] = await orm.update(locations).set({ isActive: false }).where(eq(locations.id, location.id)).returning();
  assert.equal(inactive?.isActive, false);
  assert.ok(inactive!.updatedAt.getTime() >= location.updatedAt.getTime());
});

test("metric new tires can publish while used tires and mismatched model parents cannot", async () => {
  const id = await draft("tire");
  const brand = await reference("tire_brands");
  const other = await reference("tire_brands");
  const model = randomUUID();
  const main = await image(id);
  await db.query("INSERT INTO tire_models (id,brand_id,name) VALUES ($1,$2,'Metric')", [model, brand]);
  await rejects("UPDATE tires SET brand_id=$2,model_id=$3 WHERE product_id=$1", [id, other, model], "23503");
  await db.query(`UPDATE tires SET brand_id=$2,model_id=$3,condition='used',width_mm=225,aspect_ratio=65,rim_diameter_inch=17,
    construction='radial',size_label='225/65 R17',season='winter',price_unit='pair',availability_status='in_stock' WHERE product_id=$1`, [id, brand, model]);
  await db.query("UPDATE products SET main_image_id=$2,price_display_mode='inquire' WHERE id=$1", [id, main]);
  await rejects("UPDATE products SET publication_status='published' WHERE id=$1", [id], "23514");
  await db.query("UPDATE tires SET condition='new' WHERE product_id=$1", [id]);
  await db.query("UPDATE products SET publication_status='published' WHERE id=$1", [id]);
});

test("child edits advance the product timestamp and feature links are vehicle-only", async () => {
  const id = await draft();
  const beforeTime = (await db.query<{ value: string }>("SELECT updated_at::text AS value FROM products WHERE id=$1", [id])).rows[0]?.value;
  const feature = await reference("vehicle_features");
  await db.query("INSERT INTO vehicle_feature_links (product_id,feature_id) VALUES ($1,$2)", [id, feature]);
  const afterTime = (await db.query<{ value: string }>("SELECT updated_at::text AS value FROM products WHERE id=$1", [id])).rows[0]?.value;
  assert.notEqual(afterTime, beforeTime);
  await rejects("INSERT INTO vehicle_feature_links (product_id,feature_id) VALUES ($1,$2)", [id, feature], "23505");
  const part = await draft("part");
  await rejects("INSERT INTO vehicle_feature_links (product_id,feature_id) VALUES ($1,$2)", [part, feature], "23503");
});

test("admin identity uses unique sub, not email, and has no credential or ACL columns", async () => {
  const sub = randomUUID();
  await db.query("INSERT INTO admin_profiles (userly_sub,email) VALUES ($1,'same@example.test'),($2,'same@example.test')", [sub, randomUUID()]);
  await rejects("INSERT INTO admin_profiles (userly_sub) VALUES ($1)", [sub], "23505");
  const result = await db.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_name='admin_profiles' ORDER BY ordinal_position");
  assert.deepEqual(result.rows.map((row) => row.column_name), ["id", "userly_sub", "display_name", "email", "created_at", "updated_at"]);
});

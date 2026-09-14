import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Colors, Files, HomeProductGroups, VehicleBodyTypes, VehicleBrands, VehicleModels, Vehicles } from "@bigmotors/sysop-dti";
import { z } from "zod";
import { readDemoImportConfig } from "./import-config.js";
import { demoMarker, demoVehicleBody, demoVehicles } from "./vehicle-data.js";
import { importDemoProductGroups, indexDemoProductGroups, planDemoProductGroups } from "./product-group-data.js";

async function main() {
  const { origin, maxBytes } = readDemoImportConfig(process.env);
  console.log(`Demo import API: ${origin}`);
  const summary = { created: 0, resumed: 0, skipped: 0, failed: 0 };
  const groupSummary = { created: 0, skipped: 0 };
  try {
    const envelope = z.object({ success: z.literal(true), data: z.unknown() });
    async function api(path: string, body?: unknown, method = "POST") {
      const response = await fetch(`${origin}/api${path}`, {
        method: body === undefined ? "GET" : method,
        ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return envelope.parse(await response.json()).data;
    }
    async function references<T extends z.ZodType>(path: string, schema: T): Promise<z.output<T>[]> {
      const result: z.output<T>[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = z.array(schema).parse(await api(`${path}?limit=100&offset=${offset}`));
        result.push(...page);
        if (page.length < 100) return result;
      }
    }
    const brands = await references("/vehicle-brands", VehicleBrands.entity);
    const models = await references("/vehicle-models", VehicleModels.entity);
    const bodies = await references("/vehicle-body-types", VehicleBodyTypes.entity);
    const colors = await references("/colors", Colors.entity);
    function named<T extends { name: string; isActive: boolean }>(rows: T[], name: string): T {
      const row = rows.find((row) => row.isActive && row.name.trim().toLowerCase() === name.toLowerCase());
      if (!row) throw new Error(`Missing active reference: ${name}. Run db:seed first.`);
      return row;
    }
    // Бүх лавлахыг бичлэг үүсгэхээс өмнө шалгана.
    const planned = demoVehicles.map((car) => {
      const brand = named(brands, car.brand);
      const model = named(models.filter((row) => row.brandId === brand.id), car.model);
      return { car, body: Vehicles.createBody.parse(demoVehicleBody(car, {
        brandId: brand.id, modelId: model.id, bodyTypeId: named(bodies, car.bodyType).id,
        exteriorColorId: named(colors, car.key % 2 ? "Мөнгөлөг" : "Цагаан").id,
      })) };
    });
    const plannedGroups = planDemoProductGroups(planned);
    const existingGroups = indexDemoProductGroups(await references("/home-product-groups", HomeProductGroups.entity));
    const imageIds = new Map<number, string>();
    const existing = new Map<string, Vehicles.Entity>();
    for (let offset = 0; ; offset += 100) {
      const page = Vehicles.listResult.parse(await api(`/vehicles?limit=100&offset=${offset}`));
      for (const item of page.items) {
        const row = Vehicles.entity.parse(await api(`/vehicles/${item.id}`));
        const marker = row.internalNote?.split("\n")[0];
        if (marker?.startsWith("bigmotors-demo-vehicles-v1:")) {
          if (existing.has(marker)) throw new Error(`Duplicate demo marker: ${marker}`);
          existing.set(marker, row);
        }
      }
      if (offset + page.items.length >= page.total) break;
    }
    for (const { car, body } of planned) {
      let row = existing.get(demoMarker(car.key));
      if (row?.mainImageId) {
        imageIds.set(car.key, row.mainImageId);
        summary.skipped++;
        console.log(`EXISTS ${row.id} ${row.title}`);
        continue;
      }
      if (row && row.publicationStatus !== "draft") throw new Error(`Demo ${car.key} is no longer a draft; refusing to modify.`);
      // Incomplete drafts can be resumed without creating another vehicle.
      const resumed = row !== undefined;
      row ??= Vehicles.entity.parse(await api("/vehicles", body));
      const imageUrl = new URL(car.image.url);
      if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "upload.wikimedia.org") throw new Error("Unapproved image host.");
      await delay(15_000);
      let response: Response;
      for (let attempt = 0; ; attempt++) {
        response = await fetch(imageUrl, {
          headers: { "User-Agent": "BigMotorsDevSeeder/1.0 (development fixture images)" },
          signal: AbortSignal.timeout(120_000),
        });
        if (![429, 503].includes(response.status) || attempt === 4) break;
        const retryAfter = response.headers.get("retry-after");
        const wait = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000
          : retryAfter ? Date.parse(retryAfter) - Date.now() : 30_000 * (attempt + 1);
        if (!Number.isFinite(wait) || wait > 900_000) throw new Error(`Image ${car.key}: retry later (${retryAfter}).`);
        await response.body?.cancel();
        console.log(`Image ${car.key}: waiting ${Math.max(wait, 30_000) / 1000}s for source rate limit.`);
        await delay(Math.max(wait, 30_000));
      }
      if (!response.ok || !response.body) throw new Error(`Image ${car.key}: HTTP ${response.status}`);
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > maxBytes) throw new Error(`Image ${car.key} exceeds configured upload limit.`);
        chunks.push(chunk);
      }
      if (size !== car.image.bytes) throw new Error(`Image ${car.key} changed; review source metadata before importing.`);
      const bytes = Buffer.concat(chunks);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const form = new FormData();
      form.append(Files.uploadRoute.field, new Blob([bytes], { type: "image/jpeg" }), car.image.filename);
      form.append("title", `DEMO-${String(car.key).padStart(2, "0")} ${car.brand} ${car.model}`);
      form.append("description", `${car.image.author} | ${car.image.license} | ${car.image.source} | ${car.image.licenseUrl} | Original, unchanged.`);
      const upload = await fetch(`${origin}/api${Files.uploadRoute.path}`, { method: "POST", body: form, signal: AbortSignal.timeout(120_000) });
      if (!upload.ok) throw new Error(`Upload ${car.key}: HTTP ${upload.status}`);
      const file = Files.uploadResult.parse(await upload.json());
      row = Vehicles.entity.parse(await api(`/vehicles/${row.id}`, {
        mainImageId: file.id, images: [{ fileId: file.id, sortOrder: 0 }],
        internalNote: `${row.internalNote}\nOriginal image SHA-256: ${hash}`,
      }, "PATCH"));
      const stored = await fetch(`${origin}/files/${file.id}/${encodeURIComponent(file.originalName)}`, { signal: AbortSignal.timeout(120_000) });
      if (!stored.ok || createHash("sha256").update(Buffer.from(await stored.arrayBuffer())).digest("hex") !== hash) {
        throw new Error(`Image ${car.key} failed original-byte verification.`);
      }
      console.log(`CREATED ${row.id} ${row.title} (${size} bytes, original verified)`);
      imageIds.set(car.key, file.id);
      if (resumed) summary.resumed++;
      else summary.created++;
    }
    console.log(`${demoVehicles.length} demo vehicles ready. No records were published; existing vehicles were not overwritten.`);
    await importDemoProductGroups({
      planned: plannedGroups, existing: existingGroups, imageIds, summary: groupSummary,
      create: (body) => api("/home-product-groups", body),
    });
    console.log(`${plannedGroups.length} demo product groups ready. Existing groups were not overwritten.`);
  } catch (error) {
    summary.failed++;
    throw error;
  } finally {
    console.table(summary);
    console.log("Product groups:");
    console.table(groupSummary);
  }
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : "Demo vehicle import failed.");
  process.exitCode = 1;
}

import type { VehicleSearchParams } from "@bigmotors/core";
import { HomeProductGroups, type Vehicles } from "@bigmotors/sysop-dti";

type GroupFixture = { key: number; title: string; vehicleKey: number; filters: "brand" | "model" | "category" | VehicleSearchParams };
const fixtures: readonly GroupFixture[] = [
  { key: 1, title: "Toyota", vehicleKey: 1, filters: "brand" },
  { key: 2, title: "Lexus", vehicleKey: 11, filters: "brand" },
  { key: 3, title: "Toyota Prius", vehicleKey: 1, filters: "model" },
  { key: 4, title: "Жийп / SUV", vehicleKey: 6, filters: "category" },
  { key: 5, title: "Седан", vehicleKey: 2, filters: "category" },
  { key: 6, title: "Хайбрид", vehicleKey: 3, filters: { fuel: "hybrid" } },
  { key: 7, title: "Дизель", vehicleKey: 7, filters: { fuel: "diesel" } },
  { key: 8, title: "2,000 cc хүртэл", vehicleKey: 20, filters: { engine_max: "2000" } },
  { key: 9, title: "Бүх дугуйн хөтлөгч", vehicleKey: 4, filters: { drivetrain: "awd" } },
  { key: 10, title: "Шинэ автомашин", vehicleKey: 10, filters: { condition: "new" } },
];

export const demoGroupMarker = (key: number) => `bigmotors-demo-home-groups-v1:${String(key).padStart(2, "0")}`;

export function planDemoProductGroups(vehicles: readonly { car: { key: number }; body: Vehicles.CreateBody }[]) {
  return fixtures.map((fixture) => {
    const vehicle = vehicles.find((item) => item.car.key === fixture.vehicleKey)?.body;
    if (!vehicle) throw new Error(`Missing demo vehicle for group ${fixture.key}.`);
    let filters: VehicleSearchParams;
    if (typeof fixture.filters === "string") {
      if (fixture.filters === "category") {
        if (!vehicle.bodyTypeId) throw new Error(`Missing body type for group ${fixture.key}.`);
        filters = { category: vehicle.bodyTypeId };
      } else {
        if (!vehicle.brandId || (fixture.filters === "model" && !vehicle.modelId)) throw new Error(`Missing brand/model for group ${fixture.key}.`);
        filters = { brand: vehicle.brandId, ...(fixture.filters === "model" ? { model: vehicle.modelId! } : {}) };
      }
    } else filters = fixture.filters;
    return {
      key: fixture.key, vehicleKey: fixture.vehicleKey,
      body: HomeProductGroups.createBody.parse({
        title: fixture.title,
        description: `${demoGroupMarker(fixture.key)}\nТуршилтын бүтээгдэхүүний бүлэг. Зураг нь demo автомашины жишээ зураг; бодит нөөцийн баталгаа биш.`,
        filters, sortOrder: fixture.key, isActive: fixture.key <= 8,
      }),
    };
  });
}

export function indexDemoProductGroups(rows: readonly HomeProductGroups.Entity[]) {
  const result = new Map<string, HomeProductGroups.Entity>();
  for (const row of rows) {
    const marker = row.description?.split("\n")[0];
    if (!marker?.startsWith("bigmotors-demo-home-groups-v1:")) continue;
    if (result.has(marker)) throw new Error(`Duplicate demo group marker: ${marker}`);
    result.set(marker, row);
  }
  return result;
}

export async function importDemoProductGroups(options: {
  planned: ReturnType<typeof planDemoProductGroups>;
  existing: ReturnType<typeof indexDemoProductGroups>;
  imageIds: ReadonlyMap<number, string>;
  create: (body: HomeProductGroups.CreateBody) => Promise<unknown>;
  summary: { created: number; skipped: number };
}) {
  // Validate every missing group's image before the first group write.
  const missing = options.planned.filter((item) => !options.existing.has(demoGroupMarker(item.key))).map((item) => {
    const imageId = options.imageIds.get(item.vehicleKey);
    if (!imageId) throw new Error(`Missing demo image for group ${item.key}.`);
    return { ...item, body: HomeProductGroups.createBody.parse({ ...item.body, imageId }) };
  });
  options.summary.skipped += options.planned.length - missing.length;
  for (const item of missing) {
    const row = HomeProductGroups.entity.parse(await options.create(item.body));
    options.existing.set(demoGroupMarker(item.key), row);
    options.summary.created++;
    console.log(`GROUP CREATED ${row.id} ${row.title}`);
  }
}

import "server-only";
import { PublicVehicleService } from "@bigmotors/db";
import { connection } from "next/server";
import { getWebsiteContainer } from "./db";
import { readPublicVehicles } from "./public-vehicle-response";

export async function getHomeVehicleData() {
  await connection();
  const service = getWebsiteContainer().resolve(PublicVehicleService);
  const initialResult = await readPublicVehicles(service, {});
  const lookups = await service.lookups();
  return { initialResult, lookups };
}

export function getPublicVehicleService() {
  return getWebsiteContainer().resolve(PublicVehicleService);
}

import "server-only";
import { HomeProductGroupService, PublicVehicleService } from "@bigmotors/db";
import { connection } from "next/server";
import { getWebsiteContainer } from "./db";
import { readHomeProductGroups } from "./home-product-group-queries";

export async function getHomeProductGroups() {
  await connection();
  const di = getWebsiteContainer();
  return readHomeProductGroups(di.resolve(HomeProductGroupService), di.resolve(PublicVehicleService));
}

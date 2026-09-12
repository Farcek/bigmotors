import { asClass, asFactory, type Container, type Module } from "@napp/di";
import { DBConfig } from "./config.js";
import { TKN_DB, TKN_PG_POOL } from "./db.js";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { ColorService } from "./service/color.js";
import { GalleryService } from "./service/gallery.js";
import { PageService } from "./service/page.js";
import { FileService } from "./service/file.js";
import { VehicleService } from "./service/vehicle.js";
import { BranchService } from "./service/branch.js";
import { VehicleBrandService } from "./service/vehicle-brand.js";
import { VehicleBodyTypeService } from "./service/vehicle-body-type.js";
import { VehicleFeatureService } from "./service/vehicle-feature.js";
import { PartBrandService } from "./service/part-brand.js";
import { TireBrandService } from "./service/tire-brand.js";
import { LocationService } from "./service/location.js";
import { VehicleModelService } from "./service/vehicle-model.js";
import { VehicleVariantService } from "./service/vehicle-variant.js";
import { TireModelService } from "./service/tire-model.js";
import { PartCategoryService } from "./service/part-category.js";



export function diDBCoreProviders() {
    const dbCore: Module = {
        name: "db-core",
        providers: [
            asClass(DBConfig),
            asFactory(TKN_PG_POOL, (di) => {
                const config = di.resolve(DBConfig);
                return new Pool({
                    connectionString: config.DATABASE_URL,
                    min: config.DATABASE_POOL_MIN,
                    max: config.DATABASE_POOL_MAX
                })
            }),
            asFactory(TKN_DB, (di) => {
                const pool = di.resolve(TKN_PG_POOL);
                return drizzle(pool, { schema })
            })
        ]
    };
    return dbCore;
}
export function diDBServiceProviders() {
    const dbService: Module = {
        name: "db-service",
        providers: [
            asClass(ColorService),
            asClass(GalleryService),
            asClass(PageService),
            asClass(FileService),
            asClass(VehicleService),
            asClass(BranchService),
            asClass(VehicleBrandService),
            asClass(VehicleBodyTypeService),
            asClass(VehicleFeatureService),
            asClass(PartBrandService),
            asClass(TireBrandService),
            asClass(LocationService),
            asClass(VehicleModelService),
            asClass(VehicleVariantService),
            asClass(TireModelService),
            asClass(PartCategoryService),

        ]
    };
    return dbService;
}

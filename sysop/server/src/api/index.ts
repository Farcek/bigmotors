import type { Container } from "@napp/di";
import { buildDTI } from "./dti.js";
import { buildColorsApi } from "./colors.js";
import { buildGalleriesApi } from "./galleries.js";
import { buildPagesApi } from "./pages.js";
import { buildBranchesApi } from "./branches.js";
import { buildVehicleBrandsApi } from "./vehicle-brands.js";
import { buildVehicleBodyTypesApi } from "./vehicle-body-types.js";
import { buildVehicleFeaturesApi } from "./vehicle-features.js";
import { buildPartBrandsApi } from "./part-brands.js";
import { buildTireBrandsApi } from "./tire-brands.js";
import { buildLocationsApi } from "./locations.js";
import { buildVehicleModelsApi } from "./vehicle-models.js";
import { buildVehicleVariantsApi } from "./vehicle-variants.js";
import { buildTireModelsApi } from "./tire-models.js";
import { buildPartCategoriesApi } from "./part-categories.js";
import { Router } from "express";
import { buildFilesApi } from "./files.js";
import { buildVehiclesApi } from "./vehicles.js";

export function buildAPI(di:Container) {
    const dti = buildDTI(di);
    buildColorsApi(dti);
    buildGalleriesApi(dti);
    buildPagesApi(dti);
    buildBranchesApi(dti);
    buildVehicleBrandsApi(dti);
    buildVehicleBodyTypesApi(dti);
    buildVehicleFeaturesApi(dti);
    buildPartBrandsApi(dti);
    buildTireBrandsApi(dti);
    buildLocationsApi(dti);
    buildVehicleModelsApi(dti);
    buildVehicleVariantsApi(dti);
    buildTireModelsApi(dti);
    buildPartCategoriesApi(dti);
    buildVehiclesApi(dti);



    return Router().use(buildFilesApi(di)).use(dti.router());
}

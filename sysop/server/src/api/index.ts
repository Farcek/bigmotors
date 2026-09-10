import type { Container } from "@napp/di";
import { buildDTI } from "./dti.js";
import { buildColorsApi } from "./colors.js";

export function buildAPI(di:Container) {
    const dti = buildDTI(di);
    buildColorsApi(dti);



    return dti.router();
}

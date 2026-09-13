import type { HomeSearchLookups } from "../../src/components/home.searcher/model";

// Static subset of reference seeds. No database code enters the client bundle.
const id = (key: number) => `b1600000-0000-4000-8000-${String(key).padStart(12, "0")}`;
const rows = (items: [number, string][]) => items.map(([key, name]) => ({ id: id(key), name }));
const models = (brand: number, items: [number, string][]) => rows(items).map((row) => ({ ...row, brandId: id(brand) }));

export const DEMO_LOOKUPS: HomeSearchLookups = {
  brands: rows([[1001, "Toyota"], [1002, "Lexus"], [1003, "Nissan"], [1004, "Honda"], [1005, "Mazda"], [1006, "Subaru"], [1007, "Mitsubishi"], [1008, "Suzuki"], [1009, "Hyundai"], [1010, "Kia"], [1011, "Ford"], [1012, "BMW"], [1013, "Mercedes-Benz"], [1014, "Audi"]]),
  models: [
    ...models(1001, [[1101, "Land Cruiser 250"], [1102, "Land Cruiser 300"], [1103, "Land Cruiser 200"], [1104, "Land Cruiser Prado"], [1105, "Prius"], [1106, "Camry"], [1107, "Corolla"], [1108, "RAV4"], [1109, "Highlander"], [1110, "4Runner"], [1111, "Hilux"], [1112, "Tacoma"], [1113, "Tundra"], [1114, "Harrier"], [1115, "Crown"], [1116, "Alphard"], [1117, "Vellfire"], [1118, "Hiace"]]),
    ...models(1002, [[1201, "LX"], [1202, "GX"], [1203, "RX"], [1204, "NX"], [1205, "ES"], [1206, "IS"], [1207, "LS"], [1208, "UX"]]),
    ...models(1003, [[1301, "Patrol"], [1302, "X-Trail"], [1303, "Qashqai"], [1304, "Navara"], [1305, "Note"], [1306, "Leaf"]]),
    ...models(1004, [[1401, "CR-V"], [1402, "HR-V"], [1403, "Fit"], [1404, "Civic"], [1405, "Accord"]]),
    ...models(1005, [[1501, "CX-5"], [1502, "CX-9"], [1503, "Mazda3"], [1504, "Mazda6"]]),
    ...models(1006, [[1601, "Forester"], [1602, "Outback"], [1603, "Impreza"]]),
    ...models(1007, [[1701, "Pajero"], [1702, "Pajero Sport"], [1703, "Outlander"], [1704, "Delica"]]),
    ...models(1008, [[1801, "Jimny"], [1802, "Vitara"], [1803, "Swift"]]),
    ...models(1009, [[1901, "Tucson"], [1902, "Santa Fe"], [1903, "Palisade"], [1904, "Sonata"], [1905, "Elantra"]]),
    ...models(1010, [[2001, "Sportage"], [2002, "Sorento"], [2003, "Carnival"], [2004, "K5"]]),
    ...models(1011, [[2101, "Ranger"], [2102, "F-150"], [2103, "Explorer"], [2104, "Bronco"]]),
    ...models(1012, [[2201, "X3"], [2202, "X5"], [2203, "X7"], [2204, "3 Series"], [2205, "5 Series"]]),
    ...models(1013, [[2301, "C-Class"], [2302, "E-Class"], [2303, "S-Class"], [2304, "GLC"], [2305, "GLE"], [2306, "G-Class"]]),
    ...models(1014, [[2401, "A4"], [2402, "A6"], [2403, "Q5"], [2404, "Q7"]]),
  ],
  variants: rows([[3001, "GX"], [3002, "VX"], [3003, "ZX"]]).map((row) => ({ ...row, modelId: id(1101) })),
  categories: rows([[101, "Седан"], [102, "Хэтчбек"], [103, "Универсал"], [104, "SUV"], [105, "Кроссовер"], [106, "Купе"], [107, "Кабриолет"], [108, "Пикап"], [109, "Минивэн"], [110, "Фургон"], [111, "Микроавтобус"], [112, "Ачааны машин"]]),
  colors: [],
};

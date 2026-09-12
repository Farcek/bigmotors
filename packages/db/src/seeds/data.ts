export const seedTables = [
  "colors", "vehicle_body_types", "vehicle_features", "vehicle_brands",
  "vehicle_models", "vehicle_variants", "part_categories", "part_brands",
  "tire_brands", "tire_models", "branches", "locations",
] as const;

export type SeedTable = typeof seedTables[number];
export interface ReferenceSeed {
  key: number;
  table: SeedTable;
  name: string;
  parentKey?: number;
  hexCode?: string;
  description?: string;
}

// Key нь тогтмол ID-ийн хэсэг: нэр/дараалал өөрчилсөн ч дахин дугаарлахгүй.
export const seedId = (key: number): string => `b1600000-0000-4000-8000-${String(key).padStart(12, "0")}`;

function names(table: SeedTable, rows: readonly (readonly [number, string])[], parentKey?: number): ReferenceSeed[] {
  return rows.map(([key, name]) => ({ key, table, name, ...(parentKey === undefined ? {} : { parentKey }) }));
}

export const referenceSeeds: readonly ReferenceSeed[] = [
  ...([
    [1, "Цагаан", "#FFFFFF"], [2, "Хар", "#000000"], [3, "Саарал", "#808080"],
    [4, "Мөнгөлөг", "#C0C0C0"], [5, "Улаан", "#C62828"], [6, "Цэнхэр", "#1565C0"],
    [7, "Ногоон", "#2E7D32"], [8, "Шар", "#FDD835"], [9, "Улбар шар", "#EF6C00"],
    [10, "Хүрэн", "#795548"], [11, "Шаргал", "#D8C3A5"], [12, "Алтлаг", "#D4AF37"],
    [13, "Нил ягаан", "#7B1FA2"], [14, "Ягаан", "#EC407A"],
  ] as const).map(([key, name, hexCode]) => ({ key, table: "colors" as const, name, hexCode })),
  ...names("vehicle_body_types", [
    [101, "Седан"], [102, "Хэтчбек"], [103, "Универсал"], [104, "SUV"],
    [105, "Кроссовер"], [106, "Купе"], [107, "Кабриолет"], [108, "Пикап"],
    [109, "Минивэн"], [110, "Фургон"], [111, "Микроавтобус"], [112, "Ачааны машин"],
  ]),
  ...names("vehicle_features", [
    [201, "ABS"], [202, "Тогтворжилтын хяналт"], [203, "Зүтгэх хүчний хяналт"],
    [204, "Аюулгүйн дэр"], [205, "ISOFIX"], [206, "Сохор бүсийн хяналт"],
    [207, "Эгнээ барих туслах"], [208, "Мөргөлдөхөөс сэргийлэх автомат тоормос"],
    [209, "Круиз контрол"], [210, "Адаптив круиз контрол"], [211, "Ухрах камер"],
    [212, "360 градус камер"], [213, "Зогсоолын мэдрэгч"], [214, "Түлхүүргүй нэвтрэх"],
    [215, "Товчлуурт асаалт"], [216, "Суудал халаагч"], [217, "Суудал хөргөгч"],
    [218, "Цахилгаан тохируулгатай суудал"], [219, "Суудлын санах ой"],
    [220, "Жолооны хүрд халаагч"], [221, "Арьсан суудал"], [222, "Люк"],
    [223, "Панорама дээвэр"], [224, "Автомат агааржуулалт"], [225, "Арын агааржуулалт"],
    [226, "Apple CarPlay"], [227, "Android Auto"], [228, "Bluetooth"],
    [229, "Утасгүй цэнэглэгч"], [230, "Head-up display"], [231, "LED их гэрэл"],
    [232, "Автомат холын гэрэл"], [233, "Борооны мэдрэгч"], [234, "Цахилгаан тээшний хаалга"],
  ]),
  ...names("vehicle_brands", [
    [1001, "Toyota"], [1002, "Lexus"], [1003, "Nissan"], [1004, "Honda"],
    [1005, "Mazda"], [1006, "Subaru"], [1007, "Mitsubishi"], [1008, "Suzuki"],
    [1009, "Hyundai"], [1010, "Kia"], [1011, "Ford"], [1012, "BMW"],
    [1013, "Mercedes-Benz"], [1014, "Audi"],
  ]),
  ...names("vehicle_models", [
    [1101, "Land Cruiser 250"], [1102, "Land Cruiser 300"], [1103, "Land Cruiser 200"],
    [1104, "Land Cruiser Prado"], [1105, "Prius"], [1106, "Camry"], [1107, "Corolla"],
    [1108, "RAV4"], [1109, "Highlander"], [1110, "4Runner"], [1111, "Hilux"],
    [1112, "Tacoma"], [1113, "Tundra"], [1114, "Harrier"], [1115, "Crown"],
    [1116, "Alphard"], [1117, "Vellfire"], [1118, "Hiace"],
  ], 1001),
  ...names("vehicle_models", [[1201, "LX"], [1202, "GX"], [1203, "RX"], [1204, "NX"], [1205, "ES"], [1206, "IS"], [1207, "LS"], [1208, "UX"]], 1002),
  ...names("vehicle_models", [[1301, "Patrol"], [1302, "X-Trail"], [1303, "Qashqai"], [1304, "Navara"], [1305, "Note"], [1306, "Leaf"]], 1003),
  ...names("vehicle_models", [[1401, "CR-V"], [1402, "HR-V"], [1403, "Fit"], [1404, "Civic"], [1405, "Accord"]], 1004),
  ...names("vehicle_models", [[1501, "CX-5"], [1502, "CX-9"], [1503, "Mazda3"], [1504, "Mazda6"]], 1005),
  ...names("vehicle_models", [[1601, "Forester"], [1602, "Outback"], [1603, "Impreza"]], 1006),
  ...names("vehicle_models", [[1701, "Pajero"], [1702, "Pajero Sport"], [1703, "Outlander"], [1704, "Delica"]], 1007),
  ...names("vehicle_models", [[1801, "Jimny"], [1802, "Vitara"], [1803, "Swift"]], 1008),
  ...names("vehicle_models", [[1901, "Tucson"], [1902, "Santa Fe"], [1903, "Palisade"], [1904, "Sonata"], [1905, "Elantra"]], 1009),
  ...names("vehicle_models", [[2001, "Sportage"], [2002, "Sorento"], [2003, "Carnival"], [2004, "K5"]], 1010),
  ...names("vehicle_models", [[2101, "Ranger"], [2102, "F-150"], [2103, "Explorer"], [2104, "Bronco"]], 1011),
  ...names("vehicle_models", [[2201, "X3"], [2202, "X5"], [2203, "X7"], [2204, "3 Series"], [2205, "5 Series"]], 1012),
  ...names("vehicle_models", [[2301, "C-Class"], [2302, "E-Class"], [2303, "S-Class"], [2304, "GLC"], [2305, "GLE"], [2306, "G-Class"]], 1013),
  ...names("vehicle_models", [[2401, "A4"], [2402, "A6"], [2403, "Q5"], [2404, "Q7"]], 1014),
  ...names("vehicle_variants", [[3001, "GX"], [3002, "VX"], [3003, "ZX"]], 1101)
    .map((row) => ({ ...row, description: "Land Cruiser 250, Япон зах зээл, 2024 оны хувилбарын нэр. Тоноглолыг тусад нь бүртгэнэ." })),
  ...names("part_categories", [
    [4001, "Хөдөлгүүр"], [4002, "Шүүлтүүр"], [4003, "Тоормос"], [4004, "Явах эд анги"],
    [4005, "Жолооны систем"], [4006, "Хүч дамжуулах анги"], [4007, "Цахилгаан тоноглол"],
    [4008, "Гэрэлтүүлэг"], [4009, "Кузов"], [4010, "Салон"],
    [4011, "Хөргөлт, агааржуулалт"], [4012, "Тос, тосолгоо, шингэн"], [4013, "Нэмэлт хэрэгсэл"],
  ]),
  ...names("part_categories", [[4101, "Жийргэвч"], [4102, "Ремень, гинж"], [4103, "Хөдөлгүүрийн дэр"], [4104, "Түлшний систем"]], 4001),
  ...names("part_categories", [[4201, "Тосны шүүлтүүр"], [4202, "Агаар шүүгч"], [4203, "Түлшний шүүлтүүр"], [4204, "Салоны шүүлтүүр"]], 4002),
  ...names("part_categories", [[4301, "Тоормосны наклад"], [4302, "Тоормосны диск"], [4303, "Тоормосны суппорт"], [4304, "Тоормосны шланг"]], 4003),
  ...names("part_categories", [[4401, "Амортизатор"], [4402, "Пүрш"], [4403, "Гар, шарнир"], [4404, "Втулка"], [4405, "Дугуйн холхивч"]], 4004),
  ...names("part_categories", [[4501, "Рулын аппарат"], [4502, "Рулын тяг, наконечник"]], 4005),
  ...names("part_categories", [[4601, "Хурдны хайрцгийн эд анги"], [4602, "Авцуулах холбоо"], [4603, "Хагас гол"], [4604, "Кардан, дифференциал"]], 4006),
  ...names("part_categories", [[4701, "Аккумулятор"], [4702, "Стартер"], [4703, "Генератор"], [4704, "Мэдрэгч"], [4705, "Очлуур, катушка"]], 4007),
  ...names("part_categories", [[4801, "Их гэрэл"], [4802, "Арын гэрэл"], [4803, "Манангийн гэрэл"], [4804, "Гэрлийн чийдэн"]], 4008),
  ...names("part_categories", [[4901, "Гупер"], [4902, "Крыло"], [4903, "Капот"], [4904, "Толь"], [4905, "Шил"], [4906, "Хаалга"]], 4009),
  ...names("part_categories", [[5001, "Суудлын эд анги"], [5002, "Салоны доторлогоо"], [5003, "Товчлуур, унтраалга"]], 4010),
  ...names("part_categories", [[5101, "Радиатор"], [5102, "Усны насос"], [5103, "Термостат"], [5104, "Сэнс"], [5105, "Агааржуулагчийн компрессор"]], 4011),
  ...names("part_categories", [[5201, "Хөдөлгүүрийн тос"], [5202, "Хурдны хайрцгийн тос"], [5203, "Тоормосны шингэн"], [5204, "Хөргөлтийн шингэн"]], 4012),
  ...names("part_categories", [[5301, "Шалавч"], [5302, "Шил арчигч"], [5303, "Дээврийн ачаа"], [5304, "Чиргүүлийн дэгээ"], [5305, "Утас тогтоогч, цэнэглэгч"]], 4013),
  ...names("part_brands", [[6001, "DENSO"], [6002, "AISIN"], [6003, "Bosch"], [6004, "KYB"]]),
  ...names("tire_brands", [[7001, "Bridgestone"], [7002, "Michelin"], [7003, "Yokohama"]]),
  ...names("tire_models", [[7101, "DUELER"], [7102, "BLIZZAK"], [7103, "ALENZA"], [7104, "POTENZA"], [7105, "TURANZA"], [7106, "ECOPIA"]], 7001),
  ...names("tire_models", [[7201, "Pilot Sport 4 SUV"], [7202, "Defender LTX M/S 2"]], 7002),
  ...names("tire_models", [[7301, "GEOLANDAR A/T G015"], [7302, "iceGUARD G075"]], 7003),
];

// Компанийн бодит мэдээлэл ирээгүй: хуурамч салбар/байршил үүсгэхгүй.
// branches: 8001-8999, locations: 9001-9999 гэсэн тогтмол key ашиглана.
export const companySeeds: readonly ReferenceSeed[] = [];

export const allReferenceSeeds: readonly ReferenceSeed[] = [...referenceSeeds, ...companySeeds];

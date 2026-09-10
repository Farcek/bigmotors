export const PRODUCT_TYPES = ["vehicle", "part", "tire"] as const;
export const CURRENCIES = ["MNT"] as const;
export const PRICE_DISPLAY_MODES = ["show_price", "inquire"] as const;
export const PUBLICATION_STATUSES = ["draft", "published", "hidden", "archived"] as const;
export const FUEL_TYPES = ["gasoline", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg", "cng"] as const;
export const TRANSMISSIONS = ["manual", "automatic", "cvt", "e_cvt", "dct", "amt"] as const;
export const DRIVETRAINS = ["fwd", "rwd", "awd", "four_wheel_drive"] as const;
export const STEERING_POSITIONS = ["left", "right"] as const;
export const VEHICLE_CONDITIONS = ["new", "used"] as const;
export const VEHICLE_SALE_STATUSES = ["available", "sold"] as const;
export const VEHICLE_ARRIVAL_STATUSES = ["expected", "in_transit", "in_stock"] as const;
export const PART_CONDITIONS = ["new", "used", "refurbished"] as const;
export const PART_MOUNTING_POSITIONS = ["front", "rear", "left", "right", "front_left", "front_right", "rear_left", "rear_right"] as const;
export const PRICE_UNITS = ["piece", "pair", "set"] as const;
export const AVAILABILITY_STATUSES = ["in_stock", "out_of_stock", "incoming"] as const;
export const TIRE_CONDITIONS = ["new", "used"] as const;
export const TIRE_CONSTRUCTIONS = ["radial", "bias"] as const;
export const TIRE_SEASONS = ["summer", "winter", "all_season"] as const;
export const TIRE_APPLICATIONS = ["passenger", "suv", "light_truck"] as const;
export const TIRE_TREAD_TYPES = ["highway", "all_terrain", "mud_terrain"] as const;
export const TIRE_STUD_TYPES = ["studded", "studdable", "non_studded"] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];
export const CATALOG_LIMITS = {
  title: 255, description: 512, priceMin: 1, priceMax: 99_999_999_999,
  yearMin: 1900, engineCapacityMin: 1, engineCapacityMax: 30_000,
  mileageMin: 0, mileageMax: 9_999_999, seatsMin: 1, seatsMax: 100,
} as const;

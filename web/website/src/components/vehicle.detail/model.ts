import type { DRIVETRAINS, STEERING_POSITIONS, VEHICLE_CONDITIONS, VEHICLE_ARRIVAL_STATUSES } from "@bigmotors/core";
import { fuelLabels, transmissionLabels, type CarCardData } from "../car.card/model";

export type VehicleDetailData = CarCardData & {
  brandName?: string | null;
  modelName?: string | null;
  variantName?: string | null;
  bodyTypeName?: string | null;
  importYear?: number | null;
  drivetrain?: (typeof DRIVETRAINS)[number] | null;
  steeringPosition?: (typeof STEERING_POSITIONS)[number] | null;
  condition?: (typeof VEHICLE_CONDITIONS)[number] | null;
  arrivalStatus?: (typeof VEHICLE_ARRIVAL_STATUSES)[number] | null;
  exteriorColorName?: string | null;
  interiorColorName?: string | null;
  seatCount?: number | null;
  conditionDescription?: string | null;
  contentHtml?: string | null;
  branchName?: string | null;
  locationName?: string | null;
  photos: { src: string; alt: string }[];
  features: string[];
};

export const drivetrainLabels = { fwd: "Урд (FWD)", rwd: "Хойд (RWD)", awd: "Бүх дугуй (AWD)", four_wheel_drive: "4WD" };
export const arrivalLabels = { expected: "Ирэхээр хүлээгдэж буй", in_transit: "Тээвэрлэгдэж буй", in_stock: "Бэлэн байгаа" };
const number = new Intl.NumberFormat("en-US");

export function vehicleSpecifications(item: VehicleDetailData) {
  const rows: [string, string | number | null | undefined][] = [
    ["Марк", item.brandName], ["Загвар", item.modelName], ["Хувилбар", item.variantName], ["Машины төрөл", item.bodyTypeName],
    ["Үйлдвэрлэсэн он", item.manufactureYear], ["Орж ирсэн он", item.importYear],
    ["Гүйлт", item.mileageKm != null ? `${number.format(item.mileageKm)} км` : null],
    ["Түлш", item.fuelType ? fuelLabels[item.fuelType] : null],
    ["Хөдөлгүүр", item.fuelType !== "electric" && item.engineCapacityCc != null ? `${number.format(item.engineCapacityCc)} cc` : null],
    ["Хурдны хайрцаг", item.transmission ? transmissionLabels[item.transmission] : null],
    ["Хөтлөгч", item.drivetrain ? drivetrainLabels[item.drivetrain] : null],
    ["Жолооны байрлал", item.steeringPosition ? (item.steeringPosition === "left" ? "Зүүн" : "Баруун") : null],
    ["Суудлын тоо", item.seatCount], ["Гадна өнгө", item.exteriorColorName], ["Салоны өнгө", item.interiorColorName],
  ];
  return rows.filter((row): row is [string, string | number] => row[1] != null && row[1] !== "");
}

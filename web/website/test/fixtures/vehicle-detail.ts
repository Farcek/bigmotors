import type { VehicleDetailData } from "../../src/components/vehicle.detail/model";

// UI preview fixtures only; these are not inventory or sale offers.
export const demoVehicles: VehicleDetailData[] = [
  { modelName: "4Runner", variantName: "TRD Off Road", manufactureYear: 2021, price: 145_000_000, mileageKm: 36_000, engineCapacityCc: 4_000, fuelType: "gasoline", transmission: "automatic", drivetrain: "four_wheel_drive", bodyTypeName: "Жийп / SUV", photo: 6 },
  { modelName: "RAV4", manufactureYear: 2020, price: 98_000_000, mileageKm: 52_000, engineCapacityCc: 2_500, fuelType: "hybrid", transmission: "e_cvt", drivetrain: "awd", bodyTypeName: "Жийп / SUV", photo: 4 },
  { modelName: "Highlander", manufactureYear: 2021, price: 165_000_000, mileageKm: 41_000, engineCapacityCc: 2_500, fuelType: "hybrid", transmission: "e_cvt", drivetrain: "awd", bodyTypeName: "Жийп / SUV", photo: 5 },
  { modelName: "Camry", manufactureYear: 2019, price: 68_000_000, mileageKm: 62_000, engineCapacityCc: 2_500, fuelType: "gasoline", transmission: "automatic", drivetrain: "fwd", bodyTypeName: "Седан", photo: 2 },
  { modelName: "Corolla", manufactureYear: 2020, price: 58_000_000, mileageKm: 48_000, engineCapacityCc: 1_800, fuelType: "hybrid", transmission: "e_cvt", drivetrain: "fwd", bodyTypeName: "Седан", photo: 3 },
].map(({ photo, ...vehicle }) => ({
  ...vehicle,
  id: `demo-${vehicle.modelName.toLowerCase()}`,
  title: `Toyota ${vehicle.modelName}`,
  brandName: "Toyota",
  fuelType: vehicle.fuelType as VehicleDetailData["fuelType"],
  transmission: vehicle.transmission as VehicleDetailData["transmission"],
  drivetrain: vehicle.drivetrain as VehicleDetailData["drivetrain"],
  imageUrl: `/demo/vehicles/vehicle-${photo}.jpg`,
  photos: [{ src: `/demo/vehicles/vehicle-${photo}.jpg`, alt: `Toyota ${vehicle.modelName}, гадна харагдах байдал` }],
  imageCount: 1,
  priceDisplayMode: "show_price",
  currency: "MNT",
  importYear: 2026,
  condition: "used",
  arrivalStatus: "in_stock",
  financingAvailable: true,
  steeringPosition: "left",
  exteriorColorName: "Цагаан",
  interiorColorName: "Хар",
  seatCount: vehicle.modelName === "Highlander" ? 7 : 5,
  description: "Өдөр тутмын хэрэглээ болон гэр бүлийн аялалд зориулсан автомашин. Өргөн салон, автомат хурдны хайрцагтай.",
  conditionDescription: "Хуучин автомашин",
  features: ["Автомат агааржуулалт", "Ухрах камер", "Суудлын халаалт", "Хурд баригч", "Түлхүүргүй асаалт", "Bluetooth холболт", "Олон үйлдэлт жолоо", "Цахилгаан толь"],
}));

export function getDemoVehicle(id: string) {
  return demoVehicles.find((item) => item.id === id) ?? demoVehicles[0]!;
}

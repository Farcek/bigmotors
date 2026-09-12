import type { Vehicles } from "@bigmotors/sysop-dti";

// Зөвхөн development жишээ. Үнэ, үзүүлэлт, нөөц нь бодит худалдааны мэдээлэл биш.
export const demoVehicles = [
  {
    "key": 1,
    "brand": "Toyota",
    "model": "Prius",
    "year": 2023,
    "fuelType": "hybrid",
    "engineCapacityCc": 2000,
    "transmission": "e_cvt",
    "drivetrain": "fwd",
    "bodyType": "Хэтчбек",
    "price": 72000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Toyota_Prius_2.0_HEV_Limited_%28V%29_%E2%80%93_f_18112022.jpg",
      "filename": "Toyota Prius 2.0 HEV Limited (V) – f 18112022.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=126755722",
      "author": "M 93",
      "license": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "bytes": 5140854
    }
  },
  {
    "key": 2,
    "brand": "Toyota",
    "model": "Camry",
    "year": 2018,
    "fuelType": "gasoline",
    "engineCapacityCc": 2500,
    "transmission": "automatic",
    "drivetrain": "fwd",
    "bodyType": "Седан",
    "price": 58000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/a/ac/2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg",
      "filename": "2018 Toyota Camry (ASV70R) Ascent sedan (2018-08-27) 01.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=72089491",
      "author": "EurovisionNim",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 4552794
    }
  },
  {
    "key": 3,
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "fuelType": "hybrid",
    "engineCapacityCc": 1800,
    "transmission": "e_cvt",
    "drivetrain": "fwd",
    "bodyType": "Седан",
    "price": 52000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Toyota_Corolla_Hybrid_%28E210%29_IMG_4338.jpg",
      "filename": "Toyota Corolla Hybrid (E210) IMG 4338.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=105844511",
      "author": "Alexander Migl",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 6614438
    }
  },
  {
    "key": 4,
    "brand": "Toyota",
    "model": "RAV4",
    "year": 2024,
    "fuelType": "plug_in_hybrid",
    "engineCapacityCc": 2500,
    "transmission": "e_cvt",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 138000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/2/2d/2024_Toyota_RAV4_Prime_XSE_Premium_in_Silver_Sky_with_Midnight_Black_roof%2C_front_left.jpg",
      "filename": "2024 Toyota RAV4 Prime XSE Premium in Silver Sky with Midnight Black roof, front left.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=193543200",
      "author": "Mr.choppers",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 8671485
    }
  },
  {
    "key": 5,
    "brand": "Toyota",
    "model": "Highlander",
    "year": 2022,
    "fuelType": "hybrid",
    "engineCapacityCc": 2500,
    "transmission": "e_cvt",
    "drivetrain": "awd",
    "bodyType": "SUV",
    "price": 145000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Toyota_Highlander_Hybrid_%28XU70%29_1X7A6356.jpg",
      "filename": "Toyota Highlander Hybrid (XU70) 1X7A6356.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=127555271",
      "author": "Alexander Migl",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 9893158
    }
  },
  {
    "key": 6,
    "brand": "Toyota",
    "model": "4Runner",
    "year": 2025,
    "fuelType": "gasoline",
    "engineCapacityCc": 2400,
    "transmission": "automatic",
    "drivetrain": "four_wheel_drive",
    "bodyType": "SUV",
    "price": 210000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/0/0a/2025_Toyota_4Runner_TRD_Sport_in_Wind_Chill_Pearl%2C_front_right%2C_2025-05-18.jpg",
      "filename": "2025 Toyota 4Runner TRD Sport in Wind Chill Pearl, front right, 2025-05-18.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=165654140",
      "author": "Elise240SX",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 6973932
    }
  },
  {
    "key": 7,
    "brand": "Toyota",
    "model": "Hilux",
    "year": 2016,
    "fuelType": "diesel",
    "engineCapacityCc": 2400,
    "transmission": "manual",
    "drivetrain": "four_wheel_drive",
    "bodyType": "Пикап",
    "price": 88000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/1/1b/2016_Toyota_HiLux_Invincible_D-4D_4WD_2.4_Front.jpg",
      "filename": "2016 Toyota HiLux Invincible D-4D 4WD 2.4 Front.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=72065253",
      "author": "Vauxford",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 5464341
    }
  },
  {
    "key": 8,
    "brand": "Toyota",
    "model": "Harrier",
    "year": 2021,
    "fuelType": "gasoline",
    "engineCapacityCc": 2000,
    "transmission": "cvt",
    "drivetrain": "fwd",
    "bodyType": "Кроссовер",
    "price": 98000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/d/dc/TOYOTA_HARRIER_%28XU80%29_China_%283%29_%28cropped%29.jpg",
      "filename": "TOYOTA HARRIER (XU80) China (3) (cropped).jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=127527958",
      "author": "Dinkun Chen",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 5654956
    }
  },
  {
    "key": 9,
    "brand": "Toyota",
    "model": "Alphard",
    "year": 2020,
    "fuelType": "gasoline",
    "engineCapacityCc": 2500,
    "transmission": "cvt",
    "drivetrain": "fwd",
    "bodyType": "Минивэн",
    "price": 120000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/2/2b/2018-2023_Toyota_Alphard_X.jpg",
      "filename": "2018-2023 Toyota Alphard X.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=152976050",
      "author": "TTTNIS",
      "license": "CC0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
      "bytes": 4598175
    }
  },
  {
    "key": 10,
    "brand": "Toyota",
    "model": "Land Cruiser 250",
    "year": 2024,
    "fuelType": "diesel",
    "engineCapacityCc": 2800,
    "transmission": "automatic",
    "drivetrain": "four_wheel_drive",
    "bodyType": "SUV",
    "price": 285000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/e/e8/2024_Toyota_Land_Cruiser_250_VX_in_Platinum_White_Pearl_Mica%2C_front_left.jpg",
      "filename": "2024 Toyota Land Cruiser 250 VX in Platinum White Pearl Mica, front left.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=165181775",
      "author": "Mr.choppers",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 8591674
    }
  },
  {
    "key": 11,
    "brand": "Lexus",
    "model": "RX",
    "year": 2024,
    "fuelType": "hybrid",
    "engineCapacityCc": 2400,
    "transmission": "automatic",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 265000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/a/af/Lexus_RX_500h_F_SPORT%2B_%28V%29_%E2%80%93_f_14072024.jpg",
      "filename": "Lexus RX 500h F SPORT+ (V) – f 14072024.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=153333957",
      "author": "M 93",
      "license": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "bytes": 10749640
    }
  },
  {
    "key": 12,
    "brand": "Lexus",
    "model": "GX",
    "year": 2024,
    "fuelType": "gasoline",
    "engineCapacityCc": 3500,
    "transmission": "automatic",
    "drivetrain": "four_wheel_drive",
    "bodyType": "SUV",
    "price": 350000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/6/61/2024_Lexus_GX_550_Luxury%2B%2C_front_12.8.24.jpg",
      "filename": "2024 Lexus GX 550 Luxury+, front 12.8.24.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=156829082",
      "author": "Kevauto",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 1964378
    }
  },
  {
    "key": 13,
    "brand": "Lexus",
    "model": "NX",
    "year": 2023,
    "fuelType": "plug_in_hybrid",
    "engineCapacityCc": 2500,
    "transmission": "e_cvt",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 185000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/a/ac/2023_Lexus_NX_450h%2C_front_4.5.23.jpg",
      "filename": "2023 Lexus NX 450h, front 4.5.23.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=135057365",
      "author": "Kevauto",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 1319008
    }
  },
  {
    "key": 14,
    "brand": "Lexus",
    "model": "LX",
    "year": 2018,
    "fuelType": "gasoline",
    "engineCapacityCc": 5700,
    "transmission": "automatic",
    "drivetrain": "four_wheel_drive",
    "bodyType": "SUV",
    "price": 245000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/3/34/2018_Lexus_LX_570_%28facelift%29%2C_front_3.24.23.jpg",
      "filename": "2018 Lexus LX 570 (facelift), front 3.24.23.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=135057384",
      "author": "Kevauto",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 1796376
    }
  },
  {
    "key": 15,
    "brand": "Nissan",
    "model": "X-Trail",
    "year": 2023,
    "fuelType": "gasoline",
    "engineCapacityCc": 2500,
    "transmission": "cvt",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 98000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/3/35/Nissan_X-Trail_%28T33%29_1X7A7179.jpg",
      "filename": "Nissan X-Trail (T33) 1X7A7179.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=130630343",
      "author": "Alexander-93",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 12826042
    }
  },
  {
    "key": 16,
    "brand": "Honda",
    "model": "CR-V",
    "year": 2024,
    "fuelType": "hybrid",
    "engineCapacityCc": 2000,
    "transmission": "e_cvt",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 135000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Honda_CR-V_e-HEV_Elegance_AWD_%28VI%29_%E2%80%93_f_14072024.jpg",
      "filename": "Honda CR-V e-HEV Elegance AWD (VI) – f 14072024.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=153332150",
      "author": "M 93",
      "license": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "bytes": 12178282
    }
  },
  {
    "key": 17,
    "brand": "Mazda",
    "model": "CX-5",
    "year": 2024,
    "fuelType": "gasoline",
    "engineCapacityCc": 2500,
    "transmission": "automatic",
    "drivetrain": "awd",
    "bodyType": "Кроссовер",
    "price": 110000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/a/a5/2024_Mazda_CX-5_2.5_S_Select_in_Platinum_Quartz_Metallic%2C_front_right.jpg",
      "filename": "2024 Mazda CX-5 2.5 S Select in Platinum Quartz Metallic, front right.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=157796264",
      "author": "Mr.choppers",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "bytes": 10385144
    }
  },
  {
    "key": 18,
    "brand": "Subaru",
    "model": "Forester",
    "year": 2025,
    "fuelType": "hybrid",
    "engineCapacityCc": 2000,
    "transmission": "cvt",
    "drivetrain": "awd",
    "bodyType": "SUV",
    "price": 128000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/4/48/Subaru_Forester_%28SL%29_e-BOXER_DSC_8811.jpg",
      "filename": "Subaru Forester (SL) e-BOXER DSC 8811.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=165682173",
      "author": "Alexander Migl",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 9220948
    }
  },
  {
    "key": 19,
    "brand": "Mitsubishi",
    "model": "Outlander",
    "year": 2025,
    "fuelType": "plug_in_hybrid",
    "engineCapacityCc": 2400,
    "transmission": "automatic",
    "drivetrain": "awd",
    "bodyType": "SUV",
    "price": 155000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/3/35/2025_Mitsubishi_Outlander_PHEV_%28fourth_generation%29_IMG_3129.jpg",
      "filename": "2025 Mitsubishi Outlander PHEV (fourth generation) IMG 3129.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=168377589",
      "author": "Alexander Migl",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 11250526
    }
  },
  {
    "key": 20,
    "brand": "Suzuki",
    "model": "Jimny",
    "year": 2019,
    "fuelType": "gasoline",
    "engineCapacityCc": 1500,
    "transmission": "automatic",
    "drivetrain": "four_wheel_drive",
    "bodyType": "SUV",
    "price": 72000000,
    "image": {
      "url": "https://upload.wikimedia.org/wikipedia/commons/1/13/2019_Suzuki_Jimny_SZ5_4X4_Automatic_1.5.jpg",
      "filename": "2019 Suzuki Jimny SZ5 4X4 Automatic 1.5.jpg",
      "source": "https://commons.wikimedia.org/w/index.php?curid=87478573",
      "author": "Vauxford",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "bytes": 2404753
    }
  }
] as const;

export type DemoVehicle = typeof demoVehicles[number];
export const demoMarker = (key: number) => `bigmotors-demo-vehicles-v1:${String(key).padStart(2, "0")}`;
export const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function demoVehicleBody(car: DemoVehicle, refs: { brandId: string; modelId: string; bodyTypeId: string; exteriorColorId: string }): Vehicles.CreateBody {
  const image = car.image;
  return {
    ...refs,
    title: `[DEMO-${String(car.key).padStart(2, "0")}] ${car.brand} ${car.model}`,
    description: "Хөгжүүлэлт, туршилтын жишээ бүртгэл. Бодит худалдаанд байгаа автомашин биш. Үнэ, үзүүлэлтүүд нь туршилтын утга.",
    content: `<h2>${escapeHtml(car.brand + " " + car.model)}</h2><p>Энэ нь зөвхөн development орчны жишээ бүртгэл. Үнэ, гүйлт, үзүүлэлт нь туршилтын утга бөгөөд зураг дээрх машины яг тохиргоог батлахгүй.</p><h3>Зургийн эх сурвалж</h3><p>${escapeHtml(image.filename)}. Зохиогч: ${escapeHtml(image.author)}. <a href="${escapeHtml(image.source)}">Wikimedia Commons</a>. <a href="${escapeHtml(image.licenseUrl)}">${escapeHtml(image.license)}</a>. Эх файлыг өөрчлөлтгүй хадгалсан.</p>`,
    internalNote: `${demoMarker(car.key)}\nDevelopment only. Synthetic specifications and price; illustrative photo, not inventory.\n${image.author} | ${image.license}\n${image.source}\n${image.licenseUrl}`,
    manufactureYear: car.year, importYear: Math.max(car.year, 2025),
    fuelType: car.fuelType, engineCapacityCc: car.engineCapacityCc, transmission: car.transmission, drivetrain: car.drivetrain,
    steeringPosition: car.key % 2 ? "right" : "left", seatCount: [5,9,12,14,19].includes(car.key) ? 7 : 5,
    condition: car.key % 5 === 0 ? "new" : "used", mileageKm: car.key % 5 === 0 ? 0 : 15000 + car.key * 3500,
    saleStatus: "available", arrivalStatus: car.key % 2 ? "expected" : "in_transit",
    priceDisplayMode: car.key % 4 === 0 ? "inquire" : "show_price", price: car.price, currency: "MNT",
    financingAvailable: car.key % 2 === 0, isFeatured: car.key <= 4,
    conditionDescription: "Жишээ өгөгдөл. Бодит техникийн үзлэг, үнэлгээ биш.",
  };
}

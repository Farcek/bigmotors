import { BodyContainer, SectionDark } from "../components/helper";
import HomeCarousel from "../components/home.carousel";
import HomeSearch from "../components/home.search";
import { HomeFinancingCalculator } from "../components/home.financing.calculator";
import { getGalleryByKey } from "../server/galleries";
import { toHomeSlides } from "../server/home-slides";
import { getHomeVehicleData } from "../server/public-vehicles";
import HomeProductGroups from "../components/home.product.groups";
import { getHomeProductGroups } from "../server/home-product-groups";

export default async function HomePage() {
  const gallery = await getGalleryByKey("home");
  if (gallery === null) {
    throw new Error("Gallery not found. gallery key: home");
  }
  if (gallery.items.length === 0) {
    throw new Error("Gallery is empty. gallery key: home");
  }

  const vehicleData = await getHomeVehicleData();
  const productGroups = await getHomeProductGroups();

  return (
    <div>
      <h1 className="sr-only">BigMotors LLC</h1>
      <SectionDark>
        <BodyContainer>
          <HomeCarousel slides={toHomeSlides(gallery.items)} />
          <HomeSearch {...vehicleData} />
        </BodyContainer>
      </SectionDark>
      <HomeFinancingCalculator imageUrl={vehicleData.initialResult.items.find((item) => item.imageUrl)?.imageUrl} />
      <HomeProductGroups items={productGroups} />
    </div>
  );
}

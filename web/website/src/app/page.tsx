import { BodyContainer, SectionDark } from "../components/helper";
import HomeCarousel from "../components/home.carousel";
import HomeSearch from "../components/home.search";
import { getGalleryByKey } from "../server/galleries";
import { toHomeSlides } from "../server/home-slides";

export default async function HomePage() {
  const gallery = await getGalleryByKey("home");
  if (gallery === null) {
    throw new Error("Gallery not found. gallery key: home");
  }
  if (gallery.items.length === 0) {
    throw new Error("Gallery is empty. gallery key: home");
  }

  

  return (
    <div>
      <h1 className="sr-only">BigMotors LLC</h1>
      <SectionDark>
        <BodyContainer>
          <HomeCarousel slides={toHomeSlides(gallery.items)} />
          <HomeSearch />
        </BodyContainer>
      </SectionDark>
    </div>
  );
}

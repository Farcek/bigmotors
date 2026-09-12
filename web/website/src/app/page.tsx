import HomeCarousel from "../components/home.carousel";
import { getGalleryByKey } from "../server/galleries";

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
      <HomeCarousel />

      <pre className="max-w-full whitespace-pre-wrap break-all font-mono text-sm">{JSON.stringify(gallery, null, 2)}</pre>
    </div>
    
  );
}

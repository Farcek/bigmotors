import { PageContent } from "../components/page-content";
import { getHomepage } from "../server/pages";

export default async function HomePage() {
  const page = await getHomepage();
  if (page) return <PageContent content={page.content} />;
  return (
    <section aria-labelledby="catalog-title">
      <h1 id="catalog-title" className="text-2xl font-semibold">Бүтээгдэхүүний каталог</h1>
      <p className="mt-3 text-base text-zinc-600">Автомашин, сэлбэг хэрэгсэл, дугуй</p>
    </section>
  );
}

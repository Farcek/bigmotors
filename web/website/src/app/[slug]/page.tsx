import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContent } from "../../components/page-content";
import { getContentPage } from "../../server/pages";

export const metadata: Metadata = {
  title: "Хуудас",
  robots: { index: false, follow: false },
};

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) notFound();
  return <PageContent content={page.content} />;
}

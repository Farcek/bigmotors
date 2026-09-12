import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Хуудас",
  robots: { index: false, follow: false },
};

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (["files", "api", "_next"].includes(slug)) notFound();
  return null;
}

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="text-2xl font-semibold">Хуудас олдсонгүй</h1>
      <Link href="/" className="mt-4 inline-block text-emerald-800 underline">
        Нүүр хуудас руу буцах
      </Link>
    </section>
  );
}

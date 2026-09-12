"use client";

import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { useTransition } from "react";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <section aria-labelledby="error-title" className="mx-auto flex max-w-xl flex-col items-start gap-4 py-12 sm:py-20">
      <IconAlertCircle size={36} stroke={1.5} aria-hidden="true" className="text-zinc-500" />
      <h1 id="error-title" className="text-2xl font-semibold">Хуудас ачаалахад алдаа гарлаа</h1>
      <p className="text-base text-zinc-600">Түр хүлээгээд дахин оролдоно уу.</p>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => startTransition(() => retry())}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 disabled:cursor-wait disabled:opacity-60"
      >
        <IconRefresh size={18} aria-hidden="true" className={pending ? "animate-spin motion-reduce:animate-none" : undefined} />
        Дахин оролдох
      </button>
    </section>
  );
}

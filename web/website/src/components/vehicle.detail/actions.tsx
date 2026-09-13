"use client";

import { useState } from "react";
import { IconCheck, IconCirclePlus, IconShare } from "@tabler/icons-react";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-accent";
const button = `inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium ${focus}`;

export function VehicleActions({ title }: { title: string }) {
  const [compared, setCompared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");

  async function share() {
    setSharing(true);
    setMessage("");
    setFallbackUrl("");
    const url = new URL(window.location.href);
    url.hash = "";
    try {
      if (navigator.share) {
        await navigator.share({ title, url: url.href });
      } else {
        await navigator.clipboard.writeText(url.href);
        setMessage("Холбоос хууллаа.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage("Холбоосыг автоматаар хуулж чадсангүй.");
        setFallbackUrl(url.href);
      }
    } finally {
      setSharing(false);
    }
  }

  return <div className="min-w-0 print:hidden">
    <div role="group" aria-label="Автомашины үйлдлүүд" className="grid max-w-80 grid-cols-2 gap-2">
      <button type="button" aria-pressed={compared} title="Харьцуулах" onClick={() => setCompared(!compared)}
        className={`${button} ${compared ? "border-card-accent bg-primary/15 text-card-accent" : "border-search-border hover:bg-card-subtle"}`}>
        {compared ? <IconCheck size={17} aria-hidden="true" /> : <IconCirclePlus size={17} aria-hidden="true" />}Харьцуулах
      </button>
      <button type="button" title="Хуваалцах" disabled={sharing} onClick={share} className={`${button} border-search-border hover:bg-card-subtle disabled:opacity-50`}><IconShare size={17} aria-hidden="true" />Хуваалцах</button>
    </div>
    <p role="status" aria-live="polite" className={message ? "mt-2 text-xs text-catalog-muted" : "sr-only"}>{message}</p>
    {fallbackUrl && <input aria-label="Хуваалцах холбоос" readOnly value={fallbackUrl} onFocus={(event) => event.currentTarget.select()} className={`mt-2 min-h-11 w-full min-w-0 rounded border border-search-border px-3 text-sm ${focus}`} />}
  </div>;
}

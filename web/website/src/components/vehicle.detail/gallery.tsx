"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconArrowsMaximize, IconPhoto, IconPhotoOff, IconX } from "@tabler/icons-react";
import type { VehicleDetailData } from "./model";
import { getFileImageUrl, type FileImageWidth } from "@bigmotors/core";

const control = "flex size-11 shrink-0 items-center justify-center rounded-full border border-search-border bg-search-surface text-search-text hover:bg-card-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-accent";

function Photo({ src, alt, enlarged = false, width = 1280 }: { src: string; alt: string; enlarged?: boolean; width?: FileImageWidth }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { if (ref.current?.complete && !ref.current.naturalWidth) setFailed(true); }, []);
  return failed
    ? <span role="img" aria-label="Зураг ачаалсангүй" className="flex h-full w-full items-center justify-center bg-card-subtle text-search-muted"><IconPhotoOff size={36} /></span>
    : <img ref={ref} src={getFileImageUrl(src, enlarged ? 1920 : width)} alt={alt} loading={width === 240 ? "lazy" : "eager"} decoding="async" onError={() => setFailed(true)} className={`h-full w-full ${enlarged ? "object-contain" : "object-cover"}`} />;
}

export function VehicleGallery({ photos, title }: { photos: VehicleDetailData["photos"]; title: string }) {
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const selected = Math.min(index, Math.max(0, photos.length - 1));
  const photo = photos[selected];
  const move = (step: number) => setIndex((current) => (current + step + photos.length) % photos.length);

  useEffect(() => {
    const list = thumbnails.current;
    const active = list?.children[selected] as HTMLElement | undefined;
    if (!list || !active) return;
    // Scroll only the thumbnail strip, never the page behind the lightbox.
    const reveal = () => {
      if (active.offsetTop < list.scrollTop) list.scrollTop = active.offsetTop;
      else if (active.offsetTop + active.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = active.offsetTop + active.offsetHeight - list.clientHeight;
      if (active.offsetLeft < list.scrollLeft) list.scrollLeft = active.offsetLeft;
      else if (active.offsetLeft + active.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = active.offsetLeft + active.offsetWidth - list.clientWidth;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [selected]);

  useEffect(() => {
    if (!opened) return;
    const root = document.documentElement;
    const body = document.body;
    const previous = { overflow: root.style.overflow, padding: body.style.paddingRight };
    body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + window.innerWidth - root.clientWidth}px`;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = previous.overflow; body.style.paddingRight = previous.padding; };
  }, [opened]);

  if (!photo) return <div role="img" aria-label={`${title}: зураг байхгүй`} className="flex aspect-[4/3] items-center justify-center rounded-lg bg-card-subtle text-search-muted"><IconPhotoOff size={48} /></div>;

  return <section aria-label="Автомашины зургууд" className="min-w-0">
    <div className={`grid gap-3 ${photos.length > 1 ? "lg:grid-cols-[minmax(0,1fr)_88px] xl:grid-cols-[minmax(0,1fr)_104px]" : ""}`}>
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-card-subtle">
      <button ref={trigger} type="button" aria-label="Зураг томруулах" title="Зураг томруулах" onClick={() => { dialog.current?.showModal(); setOpened(true); }} className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-card-accent">
        <Photo key={photo.src} {...photo} />
        <span aria-hidden="true" className="absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-full bg-search-surface text-search-text"><IconArrowsMaximize size={20} /></span>
      </button>
      <span aria-live="polite" className="pointer-events-none absolute bottom-4 left-4 flex min-h-9 items-center gap-2 rounded bg-card-overlay px-3 text-xs text-section-dark-text"><IconPhoto size={16} aria-hidden="true" />{selected + 1} / {photos.length}</span>
    </div>
    {photos.length > 1 && <div className="min-w-0 lg:relative">
      <div className="flex items-center gap-2 lg:absolute lg:inset-0 lg:flex-col">
      <button type="button" className={control} aria-label="Өмнөх зураг" title="Өмнөх зураг" onClick={() => move(-1)}><IconArrowLeft size={20} className="lg:rotate-90" /></button>
      <div ref={thumbnails} className="relative flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:thin] lg:min-h-0 lg:w-full lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:px-1 lg:py-0">
        {photos.map((item, i) => <button key={`${item.src}-${i}`} type="button" aria-label={`Зураг ${i + 1}`} aria-pressed={i === selected} onClick={() => setIndex(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded border-2 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-card-accent lg:aspect-[4/3] lg:h-auto lg:w-full ${i === selected ? "border-card-accent" : "border-transparent opacity-60 hover:opacity-100"}`}><Photo {...item} width={240} /></button>)}
      </div>
      <button type="button" className={control} aria-label="Дараах зураг" title="Дараах зураг" onClick={() => move(1)}><IconArrowRight size={20} className="lg:rotate-90" /></button>
      </div>
    </div>}
    </div>
    <dialog ref={dialog} aria-label={`${title}: зураг үзэх`} aria-modal="true" onClose={() => { setOpened(false); trigger.current?.focus({ preventScroll: true }); }}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      onKeyDown={(event) => { if (photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}
      className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%-32px)] max-w-[1200px] overflow-auto rounded-lg border-0 bg-section-dark-bg p-4 text-section-dark-text backdrop:bg-menu-overlay sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="min-w-0 text-sm [overflow-wrap:anywhere]">{title} <span className="ml-2 opacity-60">{selected + 1} / {photos.length}</span></p>
        <button type="button" autoFocus className={control} aria-label="Зураг хаах" title="Зураг хаах" onClick={() => dialog.current?.close()}><IconX size={22} /></button>
      </div>
      <div className="h-[65dvh] min-h-40">{opened && <Photo key={`large-${photo.src}`} {...photo} enlarged />}</div>
      {photos.length > 1 && <div className="mt-4 flex justify-center gap-4">
        <button type="button" className={control} aria-label="Өмнөх зураг" title="Өмнөх зураг" onClick={() => move(-1)}><IconArrowLeft size={20} /></button>
        <button type="button" className={control} aria-label="Дараах зураг" title="Дараах зураг" onClick={() => move(1)}><IconArrowRight size={20} /></button>
      </div>}
    </dialog>
  </section>;
}

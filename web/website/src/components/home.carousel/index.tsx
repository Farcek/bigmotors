"use client";

import { IconArrowLeft, IconArrowRight, IconPhotoOff } from "@tabler/icons-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useId, useState } from "react";
import type { HomeSlide } from "./types";

const richText = "[overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-primary [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3";
const arrowClass = "flex size-11 shrink-0 items-center justify-center rounded-full border border-section-dark-text/40 text-section-dark-text transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-40 motion-reduce:transition-none";

function SlideImage({ src, alt, first }: { src: string; alt: string; first: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className="absolute inset-0 flex items-center justify-center bg-section-dark-text/5 text-section-dark-text/50" role="img" aria-label={`${alt}: зураг ачаалсангүй`}><IconPhotoOff size={64} stroke={1} aria-hidden="true" /></div>
    : <img src={src} alt={alt} loading={first ? "eager" : "lazy"} fetchPriority={first ? "high" : "auto"} decoding="async" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover object-center" />;
}

export default function HomeCarousel({ slides }: { slides: readonly HomeSlide[] }) {
  const [viewportRef, api] = useEmblaCarousel({
    loop: slides.length > 1,
    align: "start",
    duration: 30,
    breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
  });
  const [selected, setSelected] = useState(0);
  const viewportId = useId();

  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync).on("reInit", sync);
    return () => { api.off("select", sync).off("reInit", sync); };
  }, [api]);

  if (!slides.length) return null;

  return <section
    aria-label="Онцлох танилцуулга"
    aria-roledescription="carousel"
    tabIndex={0}
    className="relative isolate overflow-hidden bg-section-dark-bg pb-8 text-section-dark-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary lg:min-h-[600px] lg:pb-20 xl:min-h-[640px]"
    onKeyDown={(event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); api?.scrollPrev(); }
      if (event.key === "ArrowRight") { event.preventDefault(); api?.scrollNext(); }
      if (event.key === "Home") { event.preventDefault(); api?.scrollTo(0); }
      if (event.key === "End") { event.preventDefault(); api?.scrollTo(slides.length - 1); }
    }}
  >
    <div className="relative z-30 grid lg:w-[36%] lg:px-0 lg:pt-24">
      {slides.map((slide, index) => <div
        key={slide.id}
        aria-hidden={index !== selected}
        inert={index !== selected}
        className={`min-w-0 [grid-area:1/1] transition-[opacity,transform] duration-500 motion-reduce:transition-none ${index === selected ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      >
        {slide.labelHtml && <div className={`${richText} mb-5 text-sm leading-6 font-medium text-section-dark-text`} dangerouslySetInnerHTML={{ __html: slide.labelHtml }} />}
        {slide.titleHtml && <div role="heading" aria-level={2} className={`${richText} text-[32px] leading-tight font-semibold sm:text-[44px] lg:text-[56px]`} dangerouslySetInnerHTML={{ __html: slide.titleHtml }} />}
        {slide.descriptionHtml && <div className={`${richText} mt-6 max-w-[370px] text-base leading-7 text-section-dark-text/70 lg:mt-8`} dangerouslySetInnerHTML={{ __html: slide.descriptionHtml }} />}
      </div>)}
    </div>
    <div className="relative mt-8 w-[72%] sm:w-[60%] lg:absolute lg:top-12 lg:left-[34%] lg:mt-0 lg:ml-0 lg:w-[38%]">
    {slides.length > 1 && <div aria-hidden="true" data-carousel-preview className="pointer-events-none absolute top-0 left-[78%] aspect-[0.95] w-[125%] lg:top-[-12.5%] lg:aspect-[0.86]">
      {slides.map((slide, index) => <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none [mask-image:linear-gradient(to_right,transparent,black_24%)] ${index === (selected + 1) % slides.length ? "opacity-40" : "opacity-0"}`}>
        <SlideImage src={slide.imageUrl} alt="" first={false} />
      </div>)}
    </div>}
    <div id={viewportId} ref={viewportRef} className="relative z-10 overflow-hidden rounded-lg">
      <div className="flex touch-pan-y touch-pinch-zoom items-stretch">
        {slides.map((slide, index) => <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${slides.length}`}
          aria-hidden={index !== selected}
          inert={index !== selected}
          className={`relative min-w-0 flex-[0_0_100%] ${index === selected ? "z-20" : "z-0"}`}
        >
          <div className={`relative aspect-[0.95] origin-center rounded-lg bg-section-dark-bg transition-[transform,opacity] duration-500 motion-reduce:transition-none lg:aspect-[0.86] ${index === selected ? "scale-100 opacity-100" : "pointer-events-none scale-110 opacity-0"}`}>
            <div className="absolute inset-0 overflow-hidden rounded-lg lg:[mask-image:linear-gradient(to_right,transparent,black_24%)]">
              <SlideImage src={slide.imageUrl} alt={`BigMotors танилцуулга ${index + 1}`} first={index === 0} />
            </div>
            {slide.linkUrl && <a href={slide.linkUrl} className="absolute inset-x-0 bottom-0 flex min-h-16 items-center gap-4 rounded-b-lg bg-section-dark-text/20 px-5 py-4 text-sm font-medium text-section-dark-text backdrop-blur-xl hover:bg-section-dark-text/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-base">
              <span className="min-w-0 [overflow-wrap:anywhere]">{slide.linkLabel}</span><IconArrowRight size={22} className="shrink-0" aria-hidden="true" />
            </a>}
          </div>
        </div>)}
      </div>
    </div>
    {slides.length > 1 && <div className="relative z-20 mt-5 flex min-w-0 items-center justify-center lg:absolute lg:bottom-4 lg:left-[calc(100%+24px)] lg:mt-0">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" className={arrowClass} aria-label="Өмнөх зураг" title="Өмнөх зураг" aria-controls={viewportId} disabled={!api} onClick={() => api?.scrollPrev()}><IconArrowLeft size={20} aria-hidden="true" /></button>
        {slides.length <= 5 ? <div className="flex min-w-0" role="group" aria-label="Зураг сонгох">
          {slides.map((slide, index) => <button key={slide.id} type="button" className="group flex h-11 w-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${index + 1}-р зураг`} aria-current={index === selected ? "true" : undefined} aria-controls={viewportId} disabled={!api} onClick={() => api?.scrollTo(index)}>
            <span aria-hidden="true" className={`h-0.5 w-5 transition-colors group-hover:bg-primary motion-reduce:transition-none ${index === selected ? "bg-primary" : "bg-section-dark-text/35"}`} />
          </button>)}
        </div> : <select aria-label="Зураг сонгох" value={selected} onChange={(event) => api?.scrollTo(Number(event.currentTarget.value))} disabled={!api} className="h-11 min-w-0 rounded border border-section-dark-text/40 bg-section-dark-bg px-2 text-sm focus-visible:outline-2 focus-visible:outline-primary">
          {slides.map((slide, index) => <option key={slide.id} value={index}>{index + 1} / {slides.length}</option>)}
        </select>}
        <button type="button" className={arrowClass} aria-label="Дараах зураг" title="Дараах зураг" aria-controls={viewportId} disabled={!api} onClick={() => api?.scrollNext()}><IconArrowRight size={20} aria-hidden="true" /></button>
      </div>
    </div>}
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{selected + 1} / {slides.length}</p>
  </section>;
}

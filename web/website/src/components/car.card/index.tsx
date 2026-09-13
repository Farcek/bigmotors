"use client";

import { useEffect, useRef, useState } from "react";
import { IconAutomaticGearbox, IconBrandYoutube, IconCalendar, IconEngine, IconGauge, IconHeart, IconHeartFilled, IconPhoto, IconPhotoOff } from "@tabler/icons-react";
import { getYouTubeVideoUrl } from "@bigmotors/core";
import { formatCarPrice, fuelLabels, resolveCarCard, transmissionLabels, type CarCardData } from "./model";

export type { CarCardData } from "./model";
export type CarCardItemProps = {
  item: CarCardData;
  compactPrice?: boolean;
  favorite?: { selected: boolean; onToggle: () => void; disabled?: boolean };
};

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const number = new Intl.NumberFormat("en-US");

function CardImage({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An SSR image can fail before React attaches its error handler.
    if (image.current?.complete && image.current.naturalWidth === 0) setFailed(true);
  }, [src]);
  return src && !failed
    ? <img ref={image} src={src} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />
    : <div role="img" aria-label={`${title}: зураг байхгүй`} className="flex h-full w-full items-center justify-center bg-card-subtle text-search-muted"><IconPhotoOff size={40} stroke={1.5} aria-hidden="true" /></div>;
}

export default function CarCardItem({ item, compactPrice = false, favorite }: CarCardItemProps) {
  const { title, description, imageUrl, href } = resolveCarCard(item);
  const youtubeUrl = getYouTubeVideoUrl(item.youtubeUrl);
  const fuel = item.fuelType ? fuelLabels[item.fuelType] : null;
  const price = item.priceDisplayMode === "show_price" && item.price != null && Number.isFinite(item.price) && item.price > 0
    ? formatCarPrice(item.price, compactPrice) : null;
  const specs = [
    { label: "Үйлдвэрлэсэн он", value: item.manufactureYear != null ? String(item.manufactureYear) : null, Icon: IconCalendar },
    { label: "Гүйлт", value: item.mileageKm != null ? `${number.format(item.mileageKm)} км` : null, Icon: IconGauge },
    { label: "Хурдны хайрцаг", value: item.transmission ? transmissionLabels[item.transmission] : null, Icon: IconAutomaticGearbox },
    { label: "Хөдөлгүүр", value: item.fuelType !== "electric" && item.engineCapacityCc != null ? `${number.format(item.engineCapacityCc)} cc` : null, Icon: IconEngine },
  ].filter((spec) => spec.value !== null);

  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg bg-search-surface text-search-text">
    <div className="relative aspect-[4/3] shrink-0">
      <a href={href} aria-label={`${title}: дэлгэрэнгүй`} className={`absolute inset-0 block ${focusClass}`}>
        <CardImage key={imageUrl} src={imageUrl} title={title} />
      </a>
      {(!!item.imageCount && item.imageCount > 0 || youtubeUrl) && <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
        {item.imageCount != null && item.imageCount > 0 && <span title={`${item.imageCount} зураг`} aria-label={`${item.imageCount} зураг`} className="flex min-h-8 items-center gap-1 rounded bg-card-overlay px-2 text-xs text-section-dark-text"><IconPhoto size={14} aria-hidden="true" />{number.format(item.imageCount)}</span>}
        {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label={`${title}: YouTube видео (шинэ tab)`} title="YouTube видео" className={`flex size-11 items-center justify-center rounded bg-card-overlay text-section-dark-text hover:text-primary ${focusClass}`}><IconBrandYoutube size={18} aria-hidden="true" /></a>}
      </div>}
    </div>

    <div className="relative -mt-1 flex flex-1 flex-col rounded-t-lg bg-search-surface p-4">
      <h3 className="min-h-12 text-base leading-6 font-bold [overflow-wrap:anywhere]"><a href={href} title={title} className={`line-clamp-2 rounded ${focusClass}`}>{title}</a></h3>
      {description && <p title={description} className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-search-muted [overflow-wrap:anywhere]">{description}</p>}
      {specs.length > 0 && <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,95px),1fr))] gap-x-2 gap-y-1.5 text-xs leading-5 text-search-muted">
        {specs.map(({ label, value, Icon }) => <div key={label} className="flex min-w-0 items-start gap-1" title={`${label}: ${value}`}>
          <dt><span className="sr-only">{label}</span><Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" /></dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
        </div>)}
      </dl>}
      {(price || item.priceDisplayMode === "inquire") && <div className="mt-auto pt-4">
        {price ? <p title={`${number.format(item.price!)} ₮`} className="flex items-baseline gap-1 text-xl leading-7 font-bold"><span className="shrink-0 text-sm text-card-accent">₮</span><span className="min-w-0 [overflow-wrap:anywhere]">{price}</span></p> : <p className="text-base font-semibold">Үнэ асуух</p>}
      </div>}
    </div>

    {(item.financingAvailable === true || fuel || favorite) && <div className="flex flex-wrap items-center gap-1.5 bg-card-subtle px-4 py-3">
      {item.financingAvailable === true && <span className="max-w-full rounded bg-search-text px-2 py-2 text-[11px] leading-4 text-search-surface [overflow-wrap:anywhere]">Лизингтэй</span>}
      {fuel && <span title="Хөдөлгүүрийн төрөл" className="max-w-full rounded bg-search-text px-2 py-2 text-[11px] leading-4 text-search-surface [overflow-wrap:anywhere]">{fuel}</span>}
      {favorite && <button type="button" aria-pressed={favorite.selected} aria-label={favorite.selected ? `${title}: хадгалснаас хасах` : `${title}: хадгалах`} title={favorite.selected ? "Хадгалснаас хасах" : "Хадгалах"} disabled={favorite.disabled} onClick={favorite.onToggle} className={`ml-auto flex size-11 shrink-0 items-center justify-center rounded bg-search-surface disabled:cursor-not-allowed disabled:opacity-50 ${focusClass} ${favorite.selected ? "text-card-accent" : "text-search-muted"}`}>
        {favorite.selected ? <IconHeartFilled size={18} aria-hidden="true" /> : <IconHeart size={18} aria-hidden="true" />}
      </button>}
    </div>}
  </article>;
}

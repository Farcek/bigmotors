import { IconArrowUpRight, IconBrandYoutube, IconCalendar, IconCheck, IconEngine, IconGauge, IconMapPin } from "@tabler/icons-react";
import { getYouTubeVideoUrl } from "@bigmotors/core";
import CarCardItem from "../car.card";
import { formatCarPrice, fuelLabels, type CarCardData } from "../car.card/model";
import { COMPANY_ADDRESS, COMPANY_DESCRIPTION } from "../company-info";
import { VehicleGallery } from "./gallery";
import { VehicleActions } from "./actions";
import { arrivalLabels, vehicleSpecifications, type VehicleDetailData } from "./model";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-card-accent";

export function VehicleDetail({ item, related = [] }: { item: VehicleDetailData; related?: CarCardData[] }) {
  const specs = vehicleSpecifications(item);
  const video = getYouTubeVideoUrl(item.youtubeUrl);
  const price = item.priceDisplayMode === "show_price" && item.price != null && Number.isFinite(item.price) && item.price > 0 ? formatCarPrice(item.price) : null;
  const highlights = [
    { label: "Үйлдвэрлэсэн он", value: item.manufactureYear, Icon: IconCalendar },
    { label: "Гүйлт", value: item.mileageKm != null ? `${new Intl.NumberFormat("en-US").format(item.mileageKm)} км` : null, Icon: IconGauge },
    { label: "Түлш", value: item.fuelType ? fuelLabels[item.fuelType] : null, Icon: IconEngine },
  ].filter(({ value }) => value != null);

  return <div className="bg-search-surface text-search-text">
    <div className="mx-auto max-w-[1264px] px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-10">
        <VehicleGallery key={item.id} photos={item.photos} title={item.title} />
        <div className="min-w-0 py-1 lg:py-3">
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {item.condition && <span className="rounded bg-card-subtle px-2.5 py-1.5">{item.condition === "new" ? "Шинэ" : "Хуучин"}</span>}
            {item.arrivalStatus && <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2.5 py-1.5 text-card-accent"><IconCheck size={14} aria-hidden="true" />{arrivalLabels[item.arrivalStatus]}</span>}
          </div>
          <h1 className="text-3xl leading-tight font-semibold [overflow-wrap:anywhere] sm:text-4xl">{item.title}</h1>
          {item.variantName && <p className="mt-2 text-sm text-catalog-muted [overflow-wrap:anywhere]">{item.variantName}</p>}
          {(price || item.priceDisplayMode === "inquire") && <div className="mt-6">
            <p className="mb-1 text-xs text-catalog-muted">Үнэ</p>
            <p className="text-3xl leading-tight font-semibold [overflow-wrap:anywhere]">{price ? <>{price} <span className="text-card-accent">₮</span></> : "Үнэ асуух"}</p>
            {item.financingAvailable && <p className="mt-2 flex items-center gap-1.5 text-sm text-card-accent"><IconCheck size={16} aria-hidden="true" />Лизингээр авах боломжтой</p>}
          </div>}
          <div className="mt-5 border-b border-search-border pb-5">
            <VehicleActions key={item.id} title={item.title} />
          </div>
          <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-4">
            {highlights.map(({ label, value, Icon }) => <div key={label} className="min-w-0">
              <dt className="mb-2 flex items-center gap-1.5 text-xs text-catalog-muted"><Icon size={17} aria-hidden="true" />{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>)}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#vehicle-specifications" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded bg-primary px-5 text-sm font-semibold hover:brightness-95 ${focus}`}>Үзүүлэлт харах<IconArrowUpRight size={18} aria-hidden="true" /></a>
            {video && <a href={video} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-2 rounded border border-search-border px-4 text-sm ${focus}`}><IconBrandYoutube size={18} aria-hidden="true" />Видео<span className="sr-only"> (шинэ tab)</span></a>}
          </div>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <section id="vehicle-specifications" aria-labelledby="vehicle-specifications-heading" className="scroll-mt-6">
            <h2 id="vehicle-specifications-heading" className="text-xl font-semibold">Техникийн үзүүлэлт</h2>
            {specs.length ? <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">{specs.map(([label, value]) => <div key={label} className="flex min-w-0 items-start justify-between gap-4 border-b border-search-border py-3.5 text-sm">
              <dt className="text-catalog-muted">{label}</dt><dd className="max-w-[55%] text-right font-medium [overflow-wrap:anywhere]">{value}</dd>
            </div>)}</dl> : <p className="mt-4 text-sm text-catalog-muted">Үзүүлэлт оруулаагүй байна.</p>}
          </section>
          {(item.description || item.contentHtml || item.conditionDescription) && <section aria-labelledby="vehicle-description-heading" className="mt-9">
            <h2 id="vehicle-description-heading" className="text-xl font-semibold">Тайлбар</h2>
            {item.description && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-catalog-muted [overflow-wrap:anywhere]">{item.description}</p>}
            {item.conditionDescription && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-catalog-muted [overflow-wrap:anywhere]">{item.conditionDescription}</p>}
            {item.contentHtml && <div className="mt-4 text-sm leading-7 text-catalog-muted [overflow-wrap:anywhere] [&_p]:my-3 [&_h2]:my-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-card-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4" dangerouslySetInnerHTML={{ __html: item.contentHtml }} />}
          </section>}
          {!!item.features.length && <section aria-labelledby="vehicle-features-heading" className="mt-9">
            <h2 id="vehicle-features-heading" className="text-xl font-semibold">Тоноглол</h2>
            <ul className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{item.features.map((feature) => <li key={feature} className="flex min-w-0 items-start gap-2.5 text-sm leading-6"><IconCheck size={19} className="mt-0.5 shrink-0 text-card-accent" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{feature}</span></li>)}</ul>
          </section>}
        </div>
        <aside aria-label="Борлуулагчийн мэдээлэл" className="border-t-2 border-card-accent pt-6 lg:mt-1">
          <p className="text-xs text-catalog-muted">Авто showroom</p>
          <h2 className="mt-2 text-2xl font-semibold">BIG Motors</h2>
          {item.branchName && <p className="mt-3 text-sm font-medium [overflow-wrap:anywhere]">{item.branchName}</p>}
          {item.locationName && <p className="mt-2 text-sm text-catalog-muted [overflow-wrap:anywhere]">Байршил: {item.locationName}</p>}
          <p className="mt-4 text-sm leading-7 text-catalog-muted">{COMPANY_DESCRIPTION}</p>
          <div className="mt-6 flex items-start gap-3 border-t border-search-border pt-5">
            <IconMapPin size={22} className="mt-1 shrink-0 text-card-accent" aria-hidden="true" /><address className="text-sm leading-7 not-italic text-catalog-muted">{COMPANY_ADDRESS}</address>
          </div>
        </aside>
      </div>
    </div>
    {!!related.length && <section aria-labelledby="vehicle-related-heading" className="border-t border-search-border bg-catalog-surface py-10 sm:py-12">
      <div className="mx-auto max-w-[1264px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 id="vehicle-related-heading" className="text-xl font-semibold">Танд санал болгох</h2><a href="/vehicles" className={`inline-flex min-h-11 items-center gap-2 text-sm font-medium ${focus}`}>Бүгдийг харах<IconArrowUpRight size={18} aria-hidden="true" /></a></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((vehicle) => <CarCardItem key={vehicle.id} item={vehicle} compactPrice maxSpecCount={2} className="border border-search-border" />)}</div>
      </div>
    </section>}
  </div>;
}

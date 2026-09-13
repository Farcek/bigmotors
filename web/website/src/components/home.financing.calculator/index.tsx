"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { IconCalculator } from "@tabler/icons-react";
import { BodyContainer } from "../helper";
import { calculateFinancing, parseFinancingValue, type FinancingErrors, type FinancingInput, type FinancingResult } from "./model";

const fields = [
  { key: "price", label: "Автомашины үнэ (₮)", initial: "90,000,000", money: true },
  { key: "annualRate", label: "Жилийн хүү (%)", initial: "10", money: false },
  { key: "months", label: "Хугацаа (сар)", initial: "60", money: false },
  { key: "downPayment", label: "Урьдчилгаа (₮)", initial: "30,000,000", money: true },
] as const;
const moneyFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const inputFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function HomeFinancingCalculator({ imageUrl }: { imageUrl?: string | null }) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<keyof FinancingInput, string>>({ price: "90,000,000", annualRate: "10", months: "60", downPayment: "30,000,000" });
  const [errors, setErrors] = useState<FinancingErrors>({});
  const [result, setResult] = useState<FinancingResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const calculation = calculateFinancing({ price: parseFinancingValue(values.price), annualRate: parseFinancingValue(values.annualRate), months: parseFinancingValue(values.months), downPayment: parseFinancingValue(values.downPayment) });
    setErrors(calculation.errors ?? {});
    setResult(calculation.result ?? null);
    if (calculation.errors) {
      const first = fields.find(({ key }) => calculation.errors[key]);
      if (first) (form.current?.elements.namedItem(first.key) as HTMLInputElement | null)?.focus();
    }
  }

  return <section aria-labelledby={`${id}-heading`} className="relative isolate overflow-hidden bg-section-dark-bg py-10 text-section-dark-text sm:py-14 lg:py-20">
    {imageUrl && <div aria-hidden="true" className="absolute inset-0 -z-10 lg:right-[40%]">
      <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-section-dark-bg/60 lg:bg-linear-to-r lg:from-section-dark-bg/20 lg:to-section-dark-bg" />
    </div>}
    <BodyContainer>
      <div className="grid items-center gap-8 lg:min-h-96 lg:grid-cols-2 lg:gap-16">
        <h2 id={`${id}-heading`} className="self-start text-xl font-medium lg:pt-2">Автомашины зээл</h2>
        <form ref={form} onSubmit={submit} noValidate className="w-full min-w-0 rounded-lg bg-search-surface p-5 text-search-text sm:p-7">
          <h3 className="mb-5 text-2xl font-semibold">Зээлийн тооцоолуур</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, initial, money }) => <div key={key} className="min-w-0">
              <label htmlFor={`${id}-${key}`} className="mb-1.5 block text-xs font-medium">{label}</label>
              <input id={`${id}-${key}`} name={key} type="text" inputMode={key === "months" ? "numeric" : "decimal"} required maxLength={24} value={values[key]} placeholder={initial} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
                onChange={(event) => { setValues({ ...values, [key]: event.target.value }); setResult(null); setErrors({}); }}
                onBlur={() => { const value = parseFinancingValue(values[key]); if (money && Number.isFinite(value)) setValues((current) => ({ ...current, [key]: inputFormat.format(value) })); }}
                className="min-h-11 w-full min-w-0 rounded border border-search-border bg-search-surface px-3 text-sm outline-none focus:border-card-accent focus:ring-1 focus:ring-card-accent aria-invalid:border-red-600" />
              {errors[key] && <p id={`${id}-${key}-error`} className="mt-1 text-xs text-red-700">{errors[key]}</p>}
            </div>)}
          </div>
          <button type="submit" className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-search-text hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-accent"><IconCalculator size={18} aria-hidden="true" />Тооцоолох</button>
          <div role="status" aria-live="polite" aria-atomic="true">
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              {([
                ["Сарын төлбөр", result?.monthlyPayment],
                ["Нийт хүү", result?.totalInterest],
                ["Нийт төлөх дүн", result?.totalPayment],
              ] as const).map(([label, value]) => <div key={label} className="min-w-0">
                <dt className="text-xs text-search-muted">{label}</dt>
                <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">{value == null ? "—" : `${moneyFormat.format(value)} ₮`}</dd>
              </div>)}
            </dl>
          </div>
          <p className="mt-4 text-xs leading-5 text-search-muted">Жишиг тооцоо, банкны санал биш. Сарын тэнцүү төлбөрөөр тооцов. Нийт дүнд урьдчилгаа багтана; шимтгэл, даатгал ороогүй.</p>
        </form>
      </div>
    </BodyContainer>
  </section>;
}

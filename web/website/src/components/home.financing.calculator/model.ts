export type FinancingInput = { price: number; annualRate: number; months: number; downPayment: number };
export type FinancingResult = { monthlyPayment: number; totalInterest: number; totalPayment: number };
export type FinancingErrors = Partial<Record<keyof FinancingInput, string>>;

export function calculateFinancing(input: FinancingInput): { result: FinancingResult; errors?: never } | { errors: FinancingErrors; result?: never } {
  const { price, annualRate, months, downPayment } = input;
  const errors: FinancingErrors = {};
  if (!Number.isFinite(price) || price <= 0 || price > Number.MAX_SAFE_INTEGER) errors.price = "Автомашины үнийг зөв оруулна уу.";
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) errors.annualRate = "Жилийн хүү 0–100% байна.";
  if (!Number.isInteger(months) || months < 1 || months > 600) errors.months = "Хугацаа 1–600 бүтэн сар байна.";
  if (!Number.isFinite(downPayment) || downPayment < 0 || downPayment > price) errors.downPayment = "Урьдчилгаа 0-ээс автомашины үнэ хүртэл байна.";
  if (Object.keys(errors).length) return { errors };

  const principal = price - downPayment;
  const rate = annualRate / 1200;
  // log1p/expm1 preserve precision for very small interest rates.
  const monthlyPayment = rate === 0 ? principal / months : principal * rate / -Math.expm1(-months * Math.log1p(rate));
  const totalInterest = Math.max(0, monthlyPayment * months - principal);
  return { result: { monthlyPayment, totalInterest, totalPayment: price + totalInterest } };
}

export function parseFinancingValue(value: string): number {
  const normalized = value.trim().replaceAll(",", "");
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

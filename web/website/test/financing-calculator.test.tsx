import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateFinancing, parseFinancingValue } from "../src/components/home.financing.calculator/model";
import { HomeFinancingCalculator } from "../src/components/home.financing.calculator";

const input = { price: 90_000_000, annualRate: 10, months: 60, downPayment: 30_000_000 };

test("financing amortizes the remaining principal and includes the down payment in total", () => {
  const { result } = calculateFinancing(input);
  assert.ok(result);
  assert.ok(Math.abs(result.monthlyPayment - 1_274_822.68) < 0.01);
  let balance = input.price - input.downPayment;
  for (let month = 0; month < input.months; month++) balance = balance * (1 + input.annualRate / 1200) - result.monthlyPayment;
  assert.ok(Math.abs(balance) < 0.001);
  assert.ok(Math.abs(result.totalPayment - (result.monthlyPayment * 60 + input.downPayment)) < 0.001);
  assert.equal(result.totalPayment, input.price + result.totalInterest);
});

test("zero interest, full down payment and tiny rates remain finite", () => {
  assert.deepEqual(calculateFinancing({ ...input, annualRate: 0 }).result, { monthlyPayment: 1_000_000, totalInterest: 0, totalPayment: 90_000_000 });
  assert.deepEqual(calculateFinancing({ ...input, downPayment: input.price }).result, { monthlyPayment: 0, totalInterest: 0, totalPayment: input.price });
  const tiny = calculateFinancing({ ...input, annualRate: 0.000000001 }).result!;
  assert.ok(Number.isFinite(tiny.monthlyPayment));
  assert.ok(Math.abs(tiny.monthlyPayment - 1_000_000) < 0.01);
});

test("invalid values return field errors instead of a payment", () => {
  for (const [key, values] of Object.entries({ price: [0, -1, Infinity, NaN], annualRate: [-1, 101, NaN], months: [0, 1.5, 601, Infinity], downPayment: [-1, 90_000_001, NaN] })) {
    for (const value of values) {
      const calculation = calculateFinancing({ ...input, [key]: value });
      assert.equal(calculation.result, undefined);
      assert.ok(calculation.errors?.[key as keyof typeof input]);
    }
  }
  assert.equal(parseFinancingValue("90,000,000"), 90_000_000);
  assert.equal(parseFinancingValue("10.5"), 10.5);
  for (const value of ["", " ", "1e5", "abc", "-1"]) assert.ok(Number.isNaN(parseFinancingValue(value)));
});

test("calculator renders accessible fields and no uncalculated payment", () => {
  const html = renderToStaticMarkup(<HomeFinancingCalculator imageUrl="/files/car/car.jpg" />);
  assert.equal((html.match(/<input /g) ?? []).length, 4);
  assert.match(html, /Жилийн хүү/);
  assert.match(html, /role="status"/);
  assert.match(html, /банкны санал биш/);
  assert.match(html, /src="\/files\/car\/car.jpg"/);
  assert.doesNotMatch(html, /1,274,823|NaN|Infinity/);
});

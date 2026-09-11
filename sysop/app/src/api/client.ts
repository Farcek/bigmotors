import { DTIClient } from "@napp/dti-client";

export const apiClient = new DTIClient(import.meta.env?.VITE_API_BASE_URL ?? "/api", {
  // Browser fetch must not receive the DTIClient instance as its receiver.
  fetcher: (input, init) => fetch(input, init),
  cache: "no-store",
});

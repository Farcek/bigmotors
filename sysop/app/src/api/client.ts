import { DTIClient } from "@napp/dti-client";

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "/api";
export const apiClient = new DTIClient(API_BASE_URL, {
  // Browser fetch must not receive the DTIClient instance as its receiver.
  fetcher: (input, init) => fetch(input, init),
  cache: "no-store",
});

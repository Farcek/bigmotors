export const demoCategories = [
  { value: "vehicle", label: "Автомашин" },
  { value: "part", label: "Сэлбэг" },
  { value: "tire", label: "Дугуй" },
] as const;

export type DemoCategory = (typeof demoCategories)[number]["value"];

export type DemoProduct = {
  id: string;
  title: string;
  category: DemoCategory;
  price: number;
  description: string;
  isActive: boolean;
  featured: boolean;
};

export type DemoProductInput = Omit<DemoProduct, "id">;

export const emptyDemoProduct: DemoProductInput = {
  title: "", category: "vehicle", price: 0, description: "", isActive: true, featured: false,
};

// Isolated fixtures, not BigMotors stock or pricing.
export const initialDemoProducts: DemoProduct[] = [
  { id: "demo-001", title: "Toyota Land Cruiser 300", category: "vehicle", price: 285000000, description: "Жишээ автомашин", isActive: true, featured: true },
  { id: "demo-002", title: "Lexus RX 350", category: "vehicle", price: 168000000, description: "Жишээ автомашин", isActive: true, featured: false },
  { id: "demo-003", title: "Toyota Prius 50", category: "vehicle", price: 48000000, description: "Жишээ автомашин", isActive: false, featured: false },
  { id: "demo-004", title: "Subaru Forester", category: "vehicle", price: 72000000, description: "Жишээ автомашин", isActive: true, featured: false },
  { id: "demo-005", title: "Тоормосны наклад", category: "part", price: 180000, description: "Жишээ сэлбэг", isActive: true, featured: true },
  { id: "demo-006", title: "Агаар шүүгч", category: "part", price: 45000, description: "Жишээ сэлбэг", isActive: true, featured: false },
  { id: "demo-007", title: "Тосны шүүр", category: "part", price: 32000, description: "Жишээ сэлбэг", isActive: false, featured: false },
  { id: "demo-008", title: "Урд амортизатор", category: "part", price: 420000, description: "Жишээ сэлбэг", isActive: true, featured: false },
  { id: "demo-009", title: "Michelin 265/65 R17", category: "tire", price: 680000, description: "Жишээ дугуй", isActive: true, featured: true },
  { id: "demo-010", title: "Bridgestone 225/60 R18", category: "tire", price: 540000, description: "Жишээ дугуй", isActive: true, featured: false },
  { id: "demo-011", title: "Yokohama 215/55 R17", category: "tire", price: 390000, description: "Жишээ дугуй", isActive: false, featured: false },
  { id: "demo-012", title: "Dunlop 195/65 R15", category: "tire", price: 280000, description: "Жишээ дугуй", isActive: true, featured: false },
];

export const demoSortOptions = [
  { value: "default", label: "Бүртгэлийн дараалал" },
  { value: "title", label: "Нэрээр" },
  { value: "price-asc", label: "Үнэ: багаас их" },
  { value: "price-desc", label: "Үнэ: ихээс бага" },
];

export function getDemoList(products: DemoProduct[], params: URLSearchParams) {
  const search = (params.get("q") ?? "").trim().toLocaleLowerCase();
  const category = demoCategories.some((item) => item.value === params.get("category"))
    ? params.get("category")! : "";
  const status = ["active", "inactive"].includes(params.get("status") ?? "")
    ? params.get("status")! : "";
  const sort = demoSortOptions.some((item) => item.value === params.get("sort"))
    ? params.get("sort")! : "default";
  const filtered = products.filter((item) =>
    (!search || `${item.title} ${item.id}`.toLocaleLowerCase().includes(search)) &&
    (!category || item.category === category) &&
    (!status || item.isActive === (status === "active")),
  );
  if (sort === "title") filtered.sort((a, b) => a.title.localeCompare(b.title, "mn") || a.id.localeCompare(b.id));
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = Number(params.get("page") ?? 1);
  const page = Math.min(pages, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, pages, page, pageSize, category, status, sort };
}

export const formatDemoPrice = (value: number) => `${new Intl.NumberFormat("mn-MN").format(value)} ₮`;

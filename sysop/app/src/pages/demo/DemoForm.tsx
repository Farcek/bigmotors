import { Alert, Button, Checkbox, Divider, Group, NativeSelect, SimpleGrid, Stack, Switch, Text, Textarea, TextInput, Title } from "@mantine/core";
import { IconArrowLeft, IconDeviceFloppy, IconRefresh } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useDemo } from "./DemoLayout";
import { demoCategories, emptyDemoProduct, type DemoProduct } from "./data";

export function DemoFormPage() {
  const { products } = useDemo();
  const [params] = useSearchParams();
  const id = params.get("id");
  const product = products.find((item) => item.id === id);
  if (id !== null && !product) {
    return <Stack align="flex-start"><Alert color="red" role="alert">Жишээ бүртгэл олдсонгүй.</Alert><Button component={Link} to="/demo/list" variant="default" leftSection={<IconArrowLeft size={18} />}>Жагсаалт руу буцах</Button></Stack>;
  }
  return <DemoProductForm key={id ?? "new"} product={product} />;
}

function DemoProductForm({ product }: { product?: DemoProduct }) {
  const { saveProduct } = useDemo();
  const navigate = useNavigate();
  const initial = product ?? emptyDemoProduct;
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [price, setPrice] = useState(String(initial.price));
  const [description, setDescription] = useState(initial.description);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [featured, setFeatured] = useState(initial.featured);
  const [titleError, setTitleError] = useState("");

  function reset() {
    setTitle(initial.title); setCategory(initial.category); setPrice(String(initial.price));
    setDescription(initial.description); setIsActive(initial.isActive); setFeatured(initial.featured); setTitleError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { setTitleError("Нэр оруулна уу."); event.currentTarget.querySelector<HTMLInputElement>('input[name="title"]')?.focus(); return; }
    saveProduct({ title: title.trim(), category, price: Number(price), description: description.trim(), isActive, featured }, product?.id);
    navigate("/demo/list");
  }

  return (
    <form onSubmit={submit} onReset={reset} className="demo-form">
      <Stack gap="lg">
        <Group justify="space-between" gap="sm">
          <Title order={2} size="h4">{product ? "Бүртгэл засах" : "Бүртгэл нэмэх"}</Title>
          <Button component={Link} to="/demo/list" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Жагсаалт</Button>
        </Group>
        <Stack gap="md">
          <Text fw={600}>Үндсэн мэдээлэл</Text>
          <TextInput label="Бүтээгдэхүүний нэр" name="title" placeholder="Бүтээгдэхүүний нэр" required maxLength={255} value={title} error={titleError || undefined} onChange={(event) => { setTitle(event.currentTarget.value); setTitleError(""); }} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NativeSelect label="Төрөл" name="category" required data={[...demoCategories]} value={category} onChange={(event) => setCategory(event.currentTarget.value as typeof category)} />
            <TextInput label="Үнэ (₮)" name="price" type="number" required min={0} max={999999999999} step={1} value={price} onChange={(event) => setPrice(event.currentTarget.value)} />
          </SimpleGrid>
          <Textarea label="Богино тайлбар" name="description" rows={4} maxLength={512} value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
          <Text size="xs" c="dimmed" ta="right" mt={-10}>{description.length} / 512</Text>
        </Stack>
        <Divider />
        <Stack gap="md">
          <Text fw={600}>Харагдах төлөв</Text>
          <Switch label="Идэвхтэй" checked={isActive} onChange={(event) => setIsActive(event.currentTarget.checked)} />
          <Checkbox label="Онцлох бүтээгдэхүүн" checked={featured} onChange={(event) => setFeatured(event.currentTarget.checked)} />
        </Stack>
        <Divider />
        <Group justify="space-between" gap="sm" className="demo-form-actions">
          <Button type="reset" variant="subtle" color="gray" leftSection={<IconRefresh size={17} />}>Анхны утга</Button>
          <Group gap="sm"><Button component={Link} to="/demo/list" variant="default">Болих</Button><Button type="submit" leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
        </Group>
      </Stack>
    </form>
  );
}

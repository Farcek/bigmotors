import { Badge, Button, Divider, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconForms, IconList } from "@tabler/icons-react";
import { Link } from "react-router";
import { useDemo } from "./DemoLayout";

export function DemoIndexPage() {
  const { products } = useDemo();
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" className="demo-metrics">
        {[
          { label: "Нийт бүртгэл", count: products.length, color: "blue" },
          { label: "Идэвхтэй", count: products.filter((item) => item.isActive).length, color: "teal" },
          { label: "Онцолсон", count: products.filter((item) => item.featured).length, color: "grape" },
        ].map((item) => (
          <Stack key={item.label} gap={6}>
            <Text size="sm" c="dimmed">{item.label}</Text>
            <Text size="xl" fw={700} c={item.color}>{item.count}</Text>
          </Stack>
        ))}
      </SimpleGrid>
      <Divider />
      <Stack gap="lg">
        <Title order={2} size="h4">Дэлгэцүүд</Title>
        {[
          { title: "Жагсаалт", path: "/demo/list", icon: IconList, label: "Table" },
          { title: "Форм", path: "/demo/form", icon: IconForms, label: "Form" },
        ].map((item) => (
          <Group key={item.path} justify="space-between" className="demo-page-row">
            <Group gap="sm"><item.icon size={22} /><Text fw={600}>{item.title}</Text><Badge color="gray" variant="light">{item.label}</Badge></Group>
            <Button component={Link} to={item.path} variant="subtle" rightSection={<IconArrowRight size={17} />} aria-label={`${item.title} нээх`}>Нээх</Button>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}

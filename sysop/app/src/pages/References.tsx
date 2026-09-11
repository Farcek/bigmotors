import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCar,
  IconCategory,
  IconDatabase,
  IconListDetails,
  IconMapPin,
  IconPackage,
  IconPalette,
  IconSparkles,
  IconWheel,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";
import { Link } from "react-router";

type ReferenceItem = {
  label: string;
  icon: TablerIcon;
  note?: string;
  href?: string;
};

type ReferenceGroup = {
  title: string;
  items: ReferenceItem[];
};

const referenceGroups = [
  {
    title: "Автомашин",
    items: [
      { label: "Марк / Загвар / Хувилбар", icon: IconCar, href: "/references/vehicle-hierarchy" },
      { label: "Кузовын төрөл", icon: IconDatabase, href: "/references/vehicle-body-types" },
      { label: "Өнгө", icon: IconPalette, href: "/references/colors" },
      { label: "Салбар", icon: IconMapPin, note: "Дундын", href: "/references/branches" },
      { label: "Бүтээгдэхүүний байршил", icon: IconMapPin, note: "Дундын", href: "/references/locations" },
      { label: "Тоноглол", icon: IconSparkles, href: "/references/vehicle-features" },
    ],
  },
  {
    title: "Сэлбэг",
    items: [
      { label: "Сэлбэгийн ангилал", icon: IconCategory, href: "/references/part-categories" },
      { label: "Сэлбэгийн брэнд", icon: IconPackage, href: "/references/part-brands" },
    ],
  },
  {
    title: "Дугуй",
    items: [
      { label: "Дугуйн брэнд", icon: IconWheel, href: "/references/tire-brands" },
      { label: "Дугуйн загвар", icon: IconListDetails, href: "/references/tire-models" },
    ],
  },
] as const satisfies readonly ReferenceGroup[];

export function ReferencesPage() {
  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
      {referenceGroups.map((group) => (
        <Paper key={group.title} withBorder p="md" radius="sm">
          <Stack gap="md">
            <Text fw={700}>{group.title}</Text>
            <Stack gap={4}>
              {group.items.map((item) => (
                <ReferenceRow key={item.label} item={item} />
              ))}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

function ReferenceRow({ item }: { item: ReferenceItem }) {
  const content = (
    <Group className="reference-row" gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" size="sm" color="gray">
        <item.icon size={16} stroke={1.8} />
      </ThemeIcon>
      <Text size="sm" fw={500} truncate>
        {item.label}
      </Text>
      {item.note ? (
        <Badge size="xs" variant="light" color="gray" ml="auto">
          {item.note}
        </Badge>
      ) : null}
    </Group>
  );
  return item.href
    ? <UnstyledButton component={Link} to={item.href} className="reference-link">{content}</UnstyledButton>
    : content;
}

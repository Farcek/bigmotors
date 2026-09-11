import { Button, Stack, Text } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <Stack align="flex-start" gap="md">
      <Text size="xl" fw={700} c="dimmed">404</Text>
      <Text>Таны нээсэн хаягт хуудас байхгүй байна.</Text>
      <Button component={Link} to="/" leftSection={<IconHome size={18} />}>
        Нүүр рүү очих
      </Button>
    </Stack>
  );
}

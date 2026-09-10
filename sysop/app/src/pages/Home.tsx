import { Paper, Stack, Text } from "@mantine/core";

export function HomePage() {
  return (
    <Paper withBorder p="lg" radius="sm">
      <Stack gap="xs">
        <Text fw={600}>Home</Text>
        <Text c="dimmed" size="sm">
          Sysop app-ийн эхлэл хуудас.
        </Text>
      </Stack>
    </Paper>
  );
}

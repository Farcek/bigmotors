import { AppShell, Group, Text } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { HomePage } from "./pages/Home";

export default function App() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" gap="xs">
          <IconHome size={20} aria-hidden="true" />
          <Text fw={600}>BigMotors Sysop</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <HomePage />
      </AppShell.Main>
    </AppShell>
  );
}

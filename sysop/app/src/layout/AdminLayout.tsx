import {
  AppShell,
  Burger,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { navigationSections } from "../navigation";

type AdminLayoutProps = {
  activePath: string;
  title: string;
  children: ReactNode;
};

export function AdminLayout({ activePath, title, children }: AdminLayoutProps) {
  const [opened, { close, toggle }] = useDisclosure();

  const navigation = navigationSections.map((section) => (
    <Stack key={section.label} gap={6}>
      <Text className="app-nav-section-label" size="xs" fw={700} c="dimmed">
        {section.label}
      </Text>
      <Stack gap={2}>
        {section.items.map((item) => {
          const disabled = "disabled" in item ? item.disabled : false;

          return disabled ? (
            <NavLink
              key={item.href}
              component="button"
              type="button"
              label={item.label}
              disabled
              aria-disabled="true"
              tabIndex={-1}
              leftSection={<item.icon size={18} stroke={1.8} />}
              noWrap
            />
          ) : (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.href === activePath}
              leftSection={<item.icon size={18} stroke={1.8} />}
              noWrap
              onClick={close}
            />
          );
        })}
      </Stack>
    </Stack>
  ));

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 264,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding={{ base: "md", sm: "lg" }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Цэс"
            />
            <Text fw={700} size="lg" lh={1}>
              BigMotors Sysop
            </Text>
          </Group>
          <Text size="sm" c="dimmed" visibleFrom="sm">
            Admin panel
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Stack gap="lg">{navigation}</Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Divider mb="sm" />
          <Text size="xs" c="dimmed">
            v0.0.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="app-main">
        <Stack gap="lg">
          <Title order={1} size="h2">
            {title}
          </Title>
          {children}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

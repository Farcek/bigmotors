import {
  AppShell,
  Burger,
  Divider,
  Group,
  Loader,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import { NavLink as RouterNavLink, Outlet, useMatches, useNavigation } from "react-router";
import { navigationSections } from "../navigation";
import type { PageHandle } from "../router";

export function AdminLayout() {
  const [opened, { close, toggle }] = useDisclosure();
  const matches = useMatches();
  const navigationState = useNavigation();
  const handle = matches.at(-1)?.handle as PageHandle | undefined;
  const title = handle?.title ?? "BigMotors Sysop";

  useEffect(() => {
    document.title = `${title} | BigMotors Sysop`;
  }, [title]);

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
              component={RouterNavLink}
              to={item.href}
              end={item.href === "/"}
              label={item.label}
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
              aria-expanded={opened}
              aria-controls="admin-navigation"
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

      <AppShell.Navbar id="admin-navigation" p="md" aria-label="Үндсэн цэс">
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
          <Group gap="sm">
            <Title order={1} size="h2">{title}</Title>
            {navigationState.state !== "idle" && <Loader size="sm" role="status" aria-label="Хуудас ачаалж байна" />}
          </Group>
          <Outlet />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

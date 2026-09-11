import { ActionIcon, Alert, Badge, Box, Button, Divider, Flex, Group, Loader, Menu, NavLink, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconDotsVertical, IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import type { ReferenceRow } from "../model";

type Props = {
  selectionPrompt: string;
  title: string;
  context: string;
  rows: ReferenceRow[];
  selectedId?: string;
  loading: boolean;
  error: string;
  disabled: boolean;
  addDisabled: boolean;
  onRefresh: () => void;
  onAdd: () => void;
  onSelect?: (row: ReferenceRow) => void;
  onEdit: (row: ReferenceRow) => void;
  onDelete: (row: ReferenceRow) => void;
};

export function HierarchyColumn({ selectionPrompt, title, context, rows, selectedId, loading, error, disabled, addDisabled, onRefresh, onAdd, onSelect, onEdit, onDelete }: Props) {
  return (
    <Stack component="section" gap={0} flex={1} miw={0} h={{ base: 340, sm: "clamp(380px, calc(100dvh - 260px), 760px)" }} aria-label={`${title} багана`}>
      <Box component="header" flex="0 0 auto" bg={{ base: "gray.1", sm: "white" }}>
        <Divider size={3} color="gray.5" hiddenFrom="sm" />
        <Box px={12} pt={{ base: 12, sm: 4 }} pb={12}>
        <Group justify="space-between" wrap="nowrap">
          <Text component="h2" fz={{ base: "lg", sm: "md" }} fw={700} m={0}>{title}</Text>
          <Group gap={6} wrap="nowrap">
            <Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={32} aria-label={`${title} шинэчлэх`} disabled={disabled || loading} onClick={onRefresh}><IconRefresh size={17} /></ActionIcon></Tooltip>
            <Tooltip label="Нэмэх"><ActionIcon variant="filled" size={32} aria-label={`${title} нэмэх`} disabled={addDisabled || loading} onClick={onAdd}><IconPlus size={18} /></ActionIcon></Tooltip>
          </Group>
        </Group>
        <Text size="xs" c={{ base: "gray.7", sm: "dimmed" }} mih={32} mt={8} lineClamp={2} title={context}>{context}</Text>
        </Box>
        <Divider />
      </Box>
      <ScrollArea flex={1} mih={0} miw={0} scrollbars="y" type="auto" offsetScrollbars="present" aria-busy={loading}
        viewportProps={{ tabIndex: 0, role: "region", "aria-label": `${title} жагсаалт` }}>
        {loading ? <Group justify="center" mih={180} role="status" aria-label={`${title} ачаалж байна`}><Loader size="sm" /></Group>
          : error ? <Alert color="red" role="alert" m="sm"><Stack gap="sm"><Text size="sm">{error}</Text><Button variant="light" color="red" onClick={onRefresh}>Дахин оролдох</Button></Stack></Alert>
            : disabled ? <Text size="sm" c="dimmed" ta="center" py={64}>{selectionPrompt}</Text>
              : !rows.length ? <Text size="sm" c="dimmed" ta="center" py={64}>Бүртгэл олдсонгүй</Text>
                : <Stack gap={0} role="list">{rows.map((row) => <Box key={row.id} role="listitem" data-selected={row.id === selectedId || undefined}>
                  <Flex align="stretch" mih={64} bg={row.id === selectedId ? "blue.0" : undefined}>
                  <Divider orientation="vertical" size={3} color={row.id === selectedId ? "blue.6" : "transparent"} />
                  {onSelect
                    ? <NavLink component="button" type="button" flex={1} miw={0} px={8} py={12} active={row.id === selectedId}
                      aria-label={`${row.name} сонгох`} aria-pressed={row.id === selectedId} onClick={() => onSelect(row)} label={<RowLabel row={row} />} />
                    : <Box flex={1} miw={0} px={8} py={12}><RowLabel row={row} /></Box>
                  }
                  <Group gap={0} pr={6}>
                  <Menu position="bottom-end" width={160} withinPortal>
                    <Menu.Target>
                      <ActionIcon size={36} variant="subtle" color="gray" aria-label={`${row.name} үйлдэл`} title="Үйлдэл"><IconDotsVertical size={18} /></ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit(row)}>Засах</Menu.Item>
                      <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => onDelete(row)}>Устгах</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  </Group>
                  </Flex>
                  <Divider color="gray.2" />
                </Box>)}</Stack>}
      </ScrollArea>
      <Box component="footer" flex="0 0 auto" mih={36}><Divider /><Text size="xs" c="dimmed" px={12} pt={10}>{!loading && !error && !disabled ? `${rows.length} бүртгэл` : " "}</Text></Box>
    </Stack>
  );
}

function RowLabel({ row }: { row: ReferenceRow }) {
  return <Stack gap={4} miw={0} flex={1}>
    <Text size="sm" fw={500} truncate title={row.name}>{row.name}</Text>
    <Group gap={6}><Text size="xs" c="dimmed">#{row.sortOrder}</Text>{!row.isActive && <Badge size="xs" color="gray" variant="light">Идэвхгүй</Badge>}</Group>
  </Stack>;
}

import { Alert, Button, Divider, Flex, Group, Modal, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PageBody } from "../../../ui/PageBody";
import { ReferenceForm } from "../ReferenceForm";
import { HierarchyColumn } from "../hierarchy/HierarchyColumn";
import { useHierarchyColumn } from "../hierarchy/useHierarchyColumn";
import { referenceError, type ReferenceOption, type ReferenceRow } from "../model";
import { canCreate, levels, selectBrand, selectedBrandId, type Level } from "./model";

type EditTarget = { level: Level; row?: ReferenceRow; brand?: ReferenceRow };
type DeleteTarget = { level: Level; row: ReferenceRow };

export function TireHierarchyPage() {
  const [params, setParams] = useSearchParams();
  const brandId = selectedBrandId(params);
  const brands = useHierarchyColumn(levels.brand.definition, null);
  const brand = brands.rows.find((row) => row.id === brandId);
  const models = useHierarchyColumn(levels.model.definition, brand?.id ?? null);
  const columns = { brand: brands, model: models };
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const deleteLock = useRef(false);

  function openForm(level: Level, row?: ReferenceRow) {
    if (!row && !canCreate(level, brand)) return;
    setNotice("");
    setTarget({ level, row, brand });
  }
  function closeForm() { if (!saving) setTarget(null); }
  function chooseBrand(row: ReferenceRow) { setParams((previous) => selectBrand(previous, row.id)); }

  const parent = target?.level === "model" ? target.brand : undefined;
  const fixedParent: ReferenceOption | undefined = parent ? {
    value: parent.id, label: parent.name, disabled: !parent.isActive,
  } : undefined;

  return (
    <Stack gap="md">
      <Group><Button component={Link} to="/references" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Лавлах</Button></Group>
      {notice && <Alert color="teal" role="status" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
      <PageBody>
        <ScrollArea miw={0} scrollbars="x" type="auto" viewportProps={{ tabIndex: 0, role: "region", "aria-label": "Дугуйн лавлахын хоёр багана" }}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={0} verticalSpacing={24} miw={{ base: 0, sm: 520 }}>
            {(["brand", "model"] as const).map((level) => <Flex key={level} miw={0}>
              {level === "model" && <Divider orientation="vertical" visibleFrom="sm" />}
              <HierarchyColumn
                title={levels[level].title} selectionPrompt="Брэнд сонгоно уу"
                context={level === "brand" ? "Бүх брэнд" : brand?.name ?? "Брэнд сонгогдоогүй"}
                rows={columns[level].rows} selectedId={level === "brand" ? brand?.id : undefined}
                loading={columns[level].loading} error={columns[level].error} disabled={level === "model" && !brand}
                addDisabled={!canCreate(level, brand) || (level === "model" && brands.loading)}
                onRefresh={columns[level].refresh} onAdd={() => openForm(level)}
                onSelect={level === "brand" ? chooseBrand : undefined}
                onEdit={(row) => openForm(level, row)}
                onDelete={(row) => { setDeleteError(""); setNotice(""); setDeleting({ level, row }); }}
              />
            </Flex>)}
          </SimpleGrid>
        </ScrollArea>
      </PageBody>
      <Modal opened={target !== null} onClose={closeForm} title={target ? `${levels[target.level].title} ${target.row ? "засах" : "нэмэх"}` : ""}
        size="lg" centered closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        {target && <ReferenceForm key={`${target.level}:${target.row?.id ?? "new"}`} definition={levels[target.level].definition} row={target.row}
          options={fixedParent ? [fixedParent] : []} fixedParent={fixedParent}
          optionsLoading={false} optionsError="" reloadOptions={() => {}} saving={saving} onSavingChange={setSaving} onCancel={closeForm}
          onSave={async (payload) => {
            const definition = levels[target.level].definition;
            const saved = target.row ? await definition.update(target.row.id, payload) : await definition.create(payload);
            if (!target.row) setParams((previous) => selectBrand(previous, target.level === "brand" ? saved.id : target.brand!.id));
            columns[target.level].refresh();
            setTarget(null);
            setNotice("Бүртгэлийг хадгаллаа.");
          }} />}
      </Modal>
      <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title={deleting ? `${levels[deleting.level].title} устгах` : ""}
        centered closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy} withCloseButton={!deleteBusy}>
        <Stack gap="lg">
          {deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}
          {/* Mantine Text-д үг таслах prop байхгүй тул зайгүй урт нэрийг бүтнээр нь багтаана. */}
          <Text style={{ overflowWrap: "anywhere" }}>“{deleting?.row.name}” бүртгэлийг устгах уу?</Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button>
            <Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
              if (!deleting || deleteLock.current) return;
              deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
              try {
                await levels[deleting.level].definition.remove(deleting.row.id);
                if (deleting.level === "brand") setParams((previous) => selectedBrandId(previous) === deleting.row.id ? selectBrand(previous, null) : previous);
                columns[deleting.level].refresh();
                setDeleting(null); setNotice("Бүртгэлийг устгалаа.");
              } catch (cause) { setDeleteError(referenceError(cause)); }
              finally { deleteLock.current = false; setDeleteBusy(false); }
            }}>Устгах</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

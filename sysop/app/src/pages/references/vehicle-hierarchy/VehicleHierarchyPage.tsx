import { Alert, Button, Divider, Flex, Group, Modal, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PageBody } from "../../../ui/PageBody";
import { ReferenceForm } from "../ReferenceForm";
import { referenceError, type ReferenceOption, type ReferenceRow } from "../model";
import { HierarchyColumn } from "./HierarchyColumn";
import { canCreate, levels, selectBrand, selectModel, selection, type Level } from "./model";
import { useColumn } from "./useColumn";

type EditTarget = { level: Level; row?: ReferenceRow; brand?: ReferenceRow; model?: ReferenceRow };
type DeleteTarget = { level: Level; row: ReferenceRow };

export function VehicleHierarchyPage() {
  const [params, setParams] = useSearchParams();
  const { brandId, modelId } = selection(params);
  const brands = useColumn("brand", null);
  const brand = brands.rows.find((row) => row.id === brandId);
  const models = useColumn("model", brand?.id ?? null);
  const model = models.rows.find((row) => row.id === modelId && row.brandId === brand?.id);
  const variants = useColumn("variant", model?.id ?? null);
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const deleteLock = useRef(false);
  const columns = { brand: brands, model: models, variant: variants };

  function openForm(level: Level, row?: ReferenceRow) {
    if (!row && !canCreate(level, brand, model)) return;
    setNotice("");
    setTarget({ level, row, brand, model });
  }
  function closeForm() { if (!saving) setTarget(null); }
  function chooseBrand(row: ReferenceRow) { setParams((previous) => selectBrand(previous, row.id)); }
  function chooseModel(row: ReferenceRow) { setParams((previous) => selectModel(previous, row.id)); }

  const parent = target?.level === "model" ? target.brand : target?.level === "variant" ? target.model : undefined;
  const fixedParent: ReferenceOption | undefined = parent && target ? {
    value: parent.id, label: parent.name, disabled: !canCreate(target.level, target.brand, target.model),
  } : undefined;

  return (
    <Stack gap="md">
      <Group><Button component={Link} to="/references" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Лавлах</Button></Group>
      {notice && <Alert color="teal" role="status" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
      <PageBody>
        <ScrollArea miw={0} scrollbars="x" type="auto" viewportProps={{ tabIndex: 0, role: "region", "aria-label": "Автомашины лавлахын гурван багана" }}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={0} verticalSpacing={24} miw={{ base: 0, sm: 780 }}>
            {(["brand", "model", "variant"] as const).map((level) => <Flex key={level} miw={0}>
              {level !== "brand" && <Divider orientation="vertical" visibleFrom="sm" />}
              <HierarchyColumn
              level={level} title={levels[level].title} context={level === "brand" ? "Бүх марк" : level === "model" ? brand?.name ?? "Марк сонгогдоогүй" : model ? `${brand?.name} / ${model.name}` : "Загвар сонгогдоогүй"}
              rows={columns[level].rows} selectedId={level === "brand" ? brand?.id : level === "model" ? model?.id : undefined}
              loading={columns[level].loading} error={columns[level].error}
              disabled={level === "model" ? !brand : level === "variant" ? !model : false}
              addDisabled={!canCreate(level, brand, model) || (level !== "brand" && brands.loading) || (level === "variant" && models.loading)}
              onRefresh={columns[level].refresh} onAdd={() => openForm(level)}
              onSelect={level === "brand" ? chooseBrand : level === "model" ? chooseModel : undefined}
              onEdit={(row) => openForm(level, row)} onDelete={(row) => { setDeleteError(""); setNotice(""); setDeleting({ level, row }); }}
            /></Flex>)}
          </SimpleGrid>
        </ScrollArea>
      </PageBody>
      <Modal opened={target !== null} onClose={closeForm} title={target ? `${levels[target.level].title} ${target.row ? "засах" : "нэмэх"}` : ""}
        size="lg" centered closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        {target && <ReferenceForm key={`${target.level}:${target.row?.id ?? "new"}`} definition={levels[target.level].definition} row={target.row}
          options={fixedParent ? [fixedParent] : []} fixedParent={fixedParent}
          contextFields={target.level === "variant" && target.brand ? [{ label: "Автомашины марк", value: target.brand.name }] : undefined}
          optionsLoading={false} optionsError="" reloadOptions={() => {}} saving={saving} onSavingChange={setSaving} onCancel={closeForm}
          onSave={async (payload) => {
            const definition = levels[target.level].definition;
            const saved = target.row ? await definition.update(target.row.id, payload) : await definition.create(payload);
            if (!target.row) {
              if (target.level === "brand") setParams((previous) => selectBrand(previous, saved.id));
              else if (target.level === "model") setParams((previous) => selectModel(selectBrand(previous, target.brand!.id), saved.id));
              else setParams((previous) => selectModel(selectBrand(previous, target.brand!.id), target.model!.id));
            }
            columns[target.level].refresh();
            setTarget(null);
            setNotice("Бүртгэлийг хадгаллаа.");
          }} />}
      </Modal>
      <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title={deleting ? `${levels[deleting.level].title} устгах` : ""}
        centered closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy} withCloseButton={!deleteBusy}>
        <Stack gap="lg">
          {deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}
          {/* Mantine Text has no word-break prop; keep long unbroken names fully readable. */}
          <Text style={{ overflowWrap: "anywhere" }}>“{deleting?.row.name}” бүртгэлийг устгах уу?</Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button>
            <Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
              if (!deleting || deleteLock.current) return;
              deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
              try {
                await levels[deleting.level].definition.remove(deleting.row.id);
                setParams((previous) => {
                  const current = selection(previous);
                  if (deleting.level === "brand" && current.brandId === deleting.row.id) return selectBrand(previous, null);
                  if (deleting.level === "model" && current.modelId === deleting.row.id) return selectModel(previous, null);
                  return previous;
                });
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

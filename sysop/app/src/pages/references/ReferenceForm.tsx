import { CATALOG_LIMITS } from "@bigmotors/core";
import { Alert, Button, Group, NumberInput, Select, Stack, Switch, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { DTIError } from "@napp/dti-core";
import { IconDeviceFloppy, IconRefresh } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { formPayload, initialValues, referenceError, validateForm, type ReferenceDefinition, type ReferenceOption, type ReferenceRow } from "./model";

type Props = {
  definition: ReferenceDefinition;
  row?: ReferenceRow;
  options: ReferenceOption[];
  optionsLoading: boolean;
  optionsError: string;
  reloadOptions: () => void;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSave: (payload: unknown) => Promise<void>;
  onCancel: () => void;
};

export function ReferenceForm({ definition: def, row, options, optionsLoading, optionsError, reloadOptions, saving, onSavingChange, onSave, onCancel }: Props) {
  const [error, setError] = useState("");
  const lock = useRef(false);
  const form = useForm({
    mode: "controlled",
    initialValues: initialValues(def, row),
    validateInputOnBlur: true,
    validate: (values) => {
      const errors = validateForm(def, values, Boolean(row));
      if (!row && values.parent && !options.some((option) => option.value === values.parent && !option.disabled)) {
        errors.parent = "Идэвхтэй лавлах сонгоно уу.";
      }
      return errors;
    },
  });
  const selected = form.values.parent;
  const choices = selected && !options.some((option) => option.value === selected)
    ? [...options, { value: selected, label: `Лавлах: ${selected}`, disabled: true }] : options;
  const blocked = Boolean(!row && def.parent && (optionsLoading || optionsError));

  return (
    <form noValidate onSubmit={form.onSubmit(async (values) => {
      if (lock.current || blocked) return;
      lock.current = true;
      onSavingChange(true);
      setError("");
      try {
        const schema = row ? def.updateSchema : def.createSchema;
        await onSave(schema.parse(formPayload(def, values, Boolean(row))));
      } catch (cause) {
        if (cause instanceof DTIError && cause.code?.endsWith("_NAME_CONFLICT")) {
          form.setFieldError("name", referenceError(cause));
          form.getInputNode("name")?.focus();
        } else setError(referenceError(cause));
      } finally { lock.current = false; onSavingChange(false); }
    }, (errors) => form.getInputNode(Object.keys(errors)[0])?.focus())}>
      <Stack gap="lg">
        {error && <Alert color="red" role="alert">{error}</Alert>}
        {def.parent && <>
          {optionsError && <Alert color="red" role="alert">{optionsError}</Alert>}
          <Group align="flex-end" wrap="nowrap" gap="xs">
            <Select label={def.parent.label} required={!def.parent.optional} searchable clearable={Boolean(def.parent.optional)}
              placeholder={optionsLoading ? "Ачаалж байна" : def.parent.optional ? "Үндсэн ангилал" : "Сонгох"}
              nothingFoundMessage="Лавлах олдсонгүй" data={choices} disabled={saving || Boolean(row) || optionsLoading}
              style={{ flex: 1, minWidth: 0 }} comboboxProps={{ withinPortal: false }} {...form.getInputProps("parent")} />
            {!row && <Button variant="default" px="xs" title="Сонголт шинэчлэх" aria-label="Сонголт шинэчлэх" disabled={saving || optionsLoading} onClick={reloadOptions}><IconRefresh size={18} /></Button>}
          </Group>
        </>}
        <TextInput label="Нэр" required maxLength={CATALOG_LIMITS.title} disabled={saving} {...form.getInputProps("name")} />
        <NumberInput label="Дараалал" required min={-2147483648} max={2147483647} allowDecimal={false} clampBehavior="none" disabled={saving} {...form.getInputProps("sortOrder")} />
        <Textarea label="Тайлбар" rows={3} maxLength={CATALOG_LIMITS.description} disabled={saving} {...form.getInputProps("description")} />
        <Switch label="Идэвхтэй" disabled={saving} {...form.getInputProps("isActive", { type: "checkbox" })} />
        <Group justify="space-between" gap="sm" className="color-form-actions">
          <Button variant="subtle" color="gray" type="button" disabled={saving} leftSection={<IconRefresh size={17} />} onClick={() => { form.reset(); setError(""); }}>Анхны утга</Button>
          <Group gap="sm"><Button variant="default" disabled={saving} onClick={onCancel}>Болих</Button><Button type="submit" loading={saving} disabled={blocked} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
        </Group>
      </Stack>
    </form>
  );
}

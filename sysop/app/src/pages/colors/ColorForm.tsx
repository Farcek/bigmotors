import { CATALOG_LIMITS } from "@bigmotors/core";
import { Colors } from "@bigmotors/sysop-dti";
import { Alert, Button, ColorInput, Group, NumberInput, SimpleGrid, Stack, Switch, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { DTIError } from "@napp/dti-core";
import { IconDeviceFloppy, IconRefresh } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { colorErrorMessage, colorInitialValues, validateColorForm } from "./model";

type ColorFormProps = {
  color?: Colors.Entity;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSave: (body: Colors.CreateBody) => Promise<void>;
  onCancel: () => void;
};

export function ColorForm({ color, saving, onSavingChange, onSave, onCancel }: ColorFormProps) {
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const form = useForm({
    mode: "controlled",
    initialValues: colorInitialValues(color),
    validate: validateColorForm,
    validateInputOnBlur: true,
  });

  return (
    <form noValidate onSubmit={form.onSubmit(async (values) => {
      if (submitting.current) return;
      submitting.current = true;
      onSavingChange(true);
      setError("");
      try {
        await onSave(Colors.createBody.parse(values));
      } catch (cause) {
        if (cause instanceof DTIError && cause.code === "COLOR_NAME_CONFLICT") {
          form.setFieldError("name", colorErrorMessage(cause));
          form.getInputNode("name")?.focus();
        } else {
          setError(colorErrorMessage(cause));
        }
      } finally {
        submitting.current = false;
        onSavingChange(false);
      }
    }, (errors) => form.getInputNode(Object.keys(errors)[0])?.focus())}>
      <Stack gap="lg">
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <TextInput label="Өнгөний нэр" required maxLength={CATALOG_LIMITS.title} disabled={saving} {...form.getInputProps("name")} />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <ColorInput label="HEX код" placeholder="#RRGGBB" format="hex" fixOnBlur={false} disabled={saving}
            swatches={["#FFFFFF", "#111827", "#64748B", "#DC2626", "#2563EB", "#16A34A", "#FACC15"]}
            {...form.getInputProps("hexCode")} />
          <NumberInput label="Дараалал" required min={-2147483648} max={2147483647} allowDecimal={false} clampBehavior="none" disabled={saving} {...form.getInputProps("sortOrder")} />
        </SimpleGrid>
        <Textarea label="Тайлбар" rows={3} maxLength={CATALOG_LIMITS.description} disabled={saving} {...form.getInputProps("description")} />
        <Switch label="Идэвхтэй" disabled={saving} {...form.getInputProps("isActive", { type: "checkbox" })} />
        <Group justify="space-between" gap="sm" className="color-form-actions">
          <Button variant="subtle" color="gray" type="button" disabled={saving} leftSection={<IconRefresh size={17} />} onClick={() => { form.reset(); setError(""); }}>Анхны утга</Button>
          <Group gap="sm"><Button variant="default" type="button" disabled={saving} onClick={onCancel}>Болих</Button><Button type="submit" loading={saving} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
        </Group>
      </Stack>
    </form>
  );
}

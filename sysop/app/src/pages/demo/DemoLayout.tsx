import { Alert, Badge, Box, Group, Stack } from "@mantine/core";
import { IconCheck, IconForms, IconLayoutDashboard, IconList } from "@tabler/icons-react";
import { useState } from "react";
import { NavLink, Outlet, useMatch, useOutletContext } from "react-router";
import { initialDemoProducts, type DemoProduct, type DemoProductInput } from "./data";

type DemoContext = {
  products: DemoProduct[];
  saveProduct: (input: DemoProductInput, id?: string) => void;
  removeProduct: (id: string) => void;
};

export function useDemo() {
  return useOutletContext<DemoContext>();
}

export function DemoLayout() {
  const [products, setProducts] = useState(initialDemoProducts);
  const [notice, setNotice] = useState("");
  const isForm = useMatch("/demo/form") !== null;

  const context: DemoContext = {
    products,
    saveProduct(input, id) {
      setProducts((current) => id
        ? current.map((item) => item.id === id ? { ...input, id } : item)
        : [{ ...input, id: `demo-${crypto.randomUUID()}` }, ...current]);
      setNotice("Жишээ бүртгэлийг хадгаллаа.");
    },
    removeProduct(id) {
      setProducts((current) => current.filter((item) => item.id !== id));
      setNotice("Жишээ бүртгэлийг устгалаа.");
    },
  };

  return (
    <Stack gap="lg" className="demo-content">
      <Group justify="space-between" gap="sm">
        <nav className="demo-tabs" aria-label="UI demo">
          <NavLink to="/demo" end><IconLayoutDashboard size={17} />Тойм</NavLink>
          <NavLink to="/demo/list"><IconList size={17} />Жагсаалт</NavLink>
          <NavLink to="/demo/form"><IconForms size={17} />Форм</NavLink>
        </nav>
        <Badge variant="light" color="grape">Жишээ өгөгдөл</Badge>
      </Group>
      {notice && (
        <Alert color="teal" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")} role="status">
          {notice}
        </Alert>
      )}
      <Box className={isForm ? "demo-body demo-body-form" : "demo-body"}>
        <Outlet context={context} />
      </Box>
    </Stack>
  );
}

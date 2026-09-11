import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useEffect } from "react";

export function RouteErrorPage() {
  useEffect(() => {
    document.title = "Алдаа | BigMotors Sysop";
  }, []);

  return (
    <Container size="sm" py="xl">
      <Stack align="flex-start" gap="md" role="alert">
        <Title order={1} size="h2">Хуудас ачаалж чадсангүй</Title>
        <Text>Дахин оролдоно уу.</Text>
        <Button component="a" href="/" leftSection={<IconHome size={18} />}>
          Нүүр рүү очих
        </Button>
      </Stack>
    </Container>
  );
}

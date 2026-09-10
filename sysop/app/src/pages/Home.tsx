import { Container, Stack, Text, Title } from "@mantine/core";

export function HomePage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xs">
        <Title order={1}>Home</Title>
        <Text c="dimmed">Sysop app-ийн эхлэл хуудас.</Text>
      </Stack>
    </Container>
  );
}

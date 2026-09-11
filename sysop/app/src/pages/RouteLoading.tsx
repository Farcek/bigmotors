import { Center, Loader } from "@mantine/core";

export function RouteLoading() {
  return <Center mih="100vh" role="status" aria-label="Хуудас ачаалж байна"><Loader size="sm" /></Center>;
}

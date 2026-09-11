import { Box } from "@mantine/core";
import type { ReactNode } from "react";

export function PageBody({ children }: { children: ReactNode }) {
  return <Box className="page-body">{children}</Box>;
}

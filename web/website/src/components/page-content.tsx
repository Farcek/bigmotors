import type { JsonObject } from "@bigmotors/core";

export function PageContent({ content }: { content: JsonObject }) {
  return <pre className="max-w-full whitespace-pre-wrap break-all font-mono text-sm">{JSON.stringify(content, null, 2)}</pre>;
}

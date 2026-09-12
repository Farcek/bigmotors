import { Pages } from "@bigmotors/sysop-dti";
import { Alert, Button, Loader, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { apiClient } from "../../api/client";
import { PageForm } from "./PageForm";
import { pageError } from "./model";

export function PageEditPage() {
  const { id } = useParams();
  return <PageEditor key={id ?? "new"} id={id} />;
}
function PageEditor({ id }: { id?: string }) {
  const location = useLocation();
  const navigate = useNavigate(); const [row, setRow] = useState<Pages.Entity>();
  const [loading, setLoading] = useState(Boolean(id)); const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void apiClient.call(Pages.get, { params: { id } }, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setRow(value); })
      .catch(cause => { if (!controller.signal.aborted) setError(pageError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  return <Stack>
    <Button component={Link} to="/pages" variant="subtle" w="fit-content" leftSection={<IconArrowLeft size={17} />}>Хуудаснууд</Button>
    {notice && <Alert color="teal" role="status" withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
    {error ? <Alert color="red" role="alert">{error}</Alert> : loading ? <Loader size="sm" /> : <PageForm row={row} initialTab={location.state?.pageTab} onCancel={() => navigate("/pages")} onSave={async (body, pageTab) => {
      setNotice("");
      if (id) { await apiClient.call(Pages.update, { params: { id }, body }); setNotice("Хадгаллаа."); }
      else { const created = await apiClient.call(Pages.create, { body }); navigate(`/pages/${created.id}/edit`, { replace: true, state: { pageTab } }); }
    }} />}
  </Stack>;
}

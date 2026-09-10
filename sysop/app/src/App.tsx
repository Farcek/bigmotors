import { AdminLayout } from "./layout/AdminLayout";
import { HomePage } from "./pages/Home";
import { ReferencesPage } from "./pages/References";

export default function App() {
  const currentPath = window.location.pathname;
  const isReferencesPath = currentPath.startsWith("/references");
  const activePath = isReferencesPath ? "/references" : "/";
  const title = isReferencesPath ? "Лавлах" : "Home";

  return (
    <AdminLayout activePath={activePath} title={title}>
      {isReferencesPath ? <ReferencesPage /> : <HomePage />}
    </AdminLayout>
  );
}

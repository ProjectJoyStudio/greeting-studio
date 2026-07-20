import { Outlet, createFileRoute } from "@tanstack/react-router";

import { CatalogMgmtProvider } from "@/lib/admin/catalog-mgmt/store";
import { CatalogShell } from "@/components/admin/catalog-mgmt/CatalogShell";

export const Route = createFileRoute("/admin/catalog")({
  component: CatalogLayout,
});

function CatalogLayout() {
  return (
    <CatalogMgmtProvider>
      <CatalogShell>
        <Outlet />
      </CatalogShell>
    </CatalogMgmtProvider>
  );
}

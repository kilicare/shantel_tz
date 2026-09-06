import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function SuppliersPage() { return <ResourceWorkspace eyebrow="Supplier desk" title="Suppliers" description="Supplier contacts and procurement relationships." endpoint="/suppliers?page=1&limit=100" emptyLabel="No suppliers found." createPermission="suppliers.create" createLabel="New supplier" />; }

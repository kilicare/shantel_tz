import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function ProductsPage() { return <ResourceWorkspace eyebrow="Product master" title="Products" description="Catalog, pricing, and stock-tracked items used across operations." endpoint="/products?page=1&limit=100" emptyLabel="No products found." createPermission="products.create" createLabel="New product" />; }

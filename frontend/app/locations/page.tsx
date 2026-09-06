import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function LocationsPage() { return <ResourceWorkspace eyebrow="Store network" title="Locations" description="Main stores, branches, and project locations for stock control." endpoint="/locations?page=1&limit=100" emptyLabel="No locations found." createPermission="locations.create" createLabel="New location" />; }

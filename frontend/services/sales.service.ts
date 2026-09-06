import { apiClient } from "@/lib/api-client";

function unwrapEnvelope<T>(response: { data: { data?: T } | T }) {
  return (response.data as any)?.data as T;
}

function unwrapEntity<T>(response: { data: { data?: T } | T }) {
  const body: any = unwrapEnvelope(response);
  return (body && typeof body === "object" && !Array.isArray(body) && "data" in body ? body.data : body) as T;
}

export const salesService = {
  async getInvoices() {
    const response = await apiClient.get("/sales/invoices", { params: { page: 1, limit: 50 } });
    return unwrapEnvelope<{ data: Invoice[]; pagination: { total: number } }>(response);
  },
  async getCustomers() {
    const response = await apiClient.get("/customers", { params: { page: 1, limit: 100 } });
    return unwrapEnvelope<{ data: Customer[] }>(response);
  },
  async getProducts() {
    const response = await apiClient.get("/products", { params: { page: 1, limit: 100, status: "ACTIVE" } });
    return unwrapEnvelope<{ data: Product[] }>(response);
  },
  async getLocations() {
    const response = await apiClient.get("/locations", { params: { page: 1, limit: 100 } });
    return unwrapEnvelope<{ data: Location[] }>(response);
  },
  async createInvoice(payload: CreateInvoicePayload) {
    const response = await apiClient.post("/sales/invoices", payload);
    return unwrapEntity<Invoice>(response);
  },
  async postInvoice(invoiceId: string, locationId: string) {
    const response = await apiClient.patch(`/sales/invoices/${invoiceId}/post`, { locationId });
    return unwrapEntity<Invoice>(response);
  },
};

export type Customer = { id: string; name: string; email?: string | null };
export type Location = { id: string; name: string; code: string; status?: string };
export type Product = { id: string; name: string; sku: string; sellingPrice: number | string; costPrice?: number | string };
export type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number | string;
  amountPaid: number | string;
  balance: number | string;
  invoiceDate: string;
  customer: Customer;
};
export type CreateInvoicePayload = {
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  notes?: string;
};

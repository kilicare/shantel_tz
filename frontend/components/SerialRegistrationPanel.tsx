"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, ScanLine } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Product = { id: string; name: string; sku: string };
function unwrap(response: any) { const payload = response?.data?.data ?? response?.data ?? response; return payload?.data ?? payload ?? []; }

export function SerialRegistrationPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void apiClient.get("/products?page=1&limit=100").then((response) => setProducts(unwrap(response))).catch(() => setError("Products could not be loaded.")); }, []);
  async function register(event: FormEvent) { event.preventDefault(); try { setError(""); const response = await apiClient.post("/projects/serial-numbers/register", { productId, serialNumber }); setMessage(`${unwrap(response).serialNumber} registered successfully.`); setSerialNumber(""); } catch (requestError: any) { const value = requestError?.response?.data?.message; setError(Array.isArray(value) ? value[0] : value || "Serial number could not be registered."); } }
  return <section className="mt-8 bg-[#172B4D] p-6 text-[#F6F8FB]"><div className="flex items-center gap-3"><ScanLine size={18} className="text-[#D4A72C]" /><div><p className="text-xs uppercase tracking-[0.2em] text-[#D4A72C]">Serial tracking</p><h2 className="mt-1 text-xl font-semibold">Register serial number</h2></div></div>{error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-[#f3a080]"><AlertCircle size={16} /> {error}</p>}{message && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#b9ddc8]"><Check size={16} /> {message}</p>}<form onSubmit={register} className="mt-5 grid gap-3 sm:grid-cols-2"><select required aria-label="Serial product" value={productId} onChange={(event) => setProductId(event.target.value)} className="h-11 bg-[#F6F8FB] px-2 text-sm text-[#172B4D]"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select><input required aria-label="Serial number" placeholder="Serial number" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} className="h-11 border-b border-white/25 bg-transparent text-sm outline-none" /><button type="submit" className="bg-[#D4A72C] px-4 py-2.5 text-xs font-semibold text-[#172B4D] sm:col-span-2">Register serial</button></form></section>;
}

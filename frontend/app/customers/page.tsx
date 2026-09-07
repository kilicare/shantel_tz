import { EditableMasterWorkspace } from "@/components/EditableMasterWorkspace";
export default function CustomersPage() {
  return <EditableMasterWorkspace kind="customers" />;
  /*
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try { setLoading(true); setError(""); setCustomers(unwrap(await apiClient.get("/customers?page=1&limit=100"))); }
    catch (requestError: any) { const message = requestError?.response?.data?.message; setError(Array.isArray(message) ? message[0] : message || "Customers could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { try { setPermissions(JSON.parse(localStorage.getItem("shantel_user") ?? "null")?.permissions ?? []); } catch { setPermissions([]); } void loadCustomers(); }, []);
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const canCreate = permissions.includes("customers.create");

  return <><WorkspaceNavigation /><main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#172B4D] sm:px-6 sm:py-8 lg:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-5 border-b border-[#172B4D]/12 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Customer desk</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Keep every relationship visible.</h1><p className="mt-2 text-sm text-[#172B4D]/55">Customer contacts, balances, and sales context for the team.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadCustomers()} className="flex items-center gap-2 border border-[#172B4D]/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:bg-white"><RefreshCw size={15} /> Refresh</button>{canCreate && <button type="button" className="flex items-center gap-2 bg-[#172B4D] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"><Plus size={15} /> New customer</button>}</div></header>{error && <div role="alert" className="mt-6 flex items-center gap-3 border border-[#2563EB]/30 bg-[#2563EB]/8 px-4 py-3 text-sm text-[#5B3A0F]"><AlertCircle size={18} /> {error}</div>}<section className="mt-8 bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2563EB]">Directory</p><h2 className="mt-2 text-2xl font-semibold">Customers</h2></div><span className="text-xs text-[#172B4D]/45">{filtered.length} records</span></div><div className="relative mt-5"><Search size={17} className="absolute left-0 top-3 text-[#172B4D]/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or email" className="h-11 w-full border-b border-[#172B4D]/15 bg-transparent pl-7 text-sm outline-none focus:border-[#2563EB]" /></div>{loading ? <p className="py-10 text-sm text-[#172B4D]/50">Loading customers...</p> : <div className="mt-4 divide-y divide-[#172B4D]/10">{filtered.length ? filtered.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><UserRound size={19} className="text-[#2563EB]" /><div><p className="text-sm font-semibold">{customer.name}</p><p className="mt-1 text-xs text-[#172B4D]/45">{customer.phone ?? "No phone"} · {customer.email ?? "No email"}</p></div></div><div className="text-right"><p className="text-sm font-semibold">TSh {Number(customer.balance ?? 0).toLocaleString()}</p><p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#172B4D]/40">{customer.status ?? "ACTIVE"}</p></div></div>) : <p className="py-10 text-center text-sm text-[#172B4D]/50">No customers found.</p>}</div>}</section></div></main></>;
  */
}

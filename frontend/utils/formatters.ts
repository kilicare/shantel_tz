export const formatCurrency = (amount: number | string, currency = "TZS") =>
  new Intl.NumberFormat("en-TZ", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);

export const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat("en-TZ", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));

export const formatDateTime = (date: Date | string) =>
  new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));

export const formatNumber = (value: number | string) => new Intl.NumberFormat("en-TZ").format(Number(value) || 0);
export const truncateText = (text: string, length: number) => text.length <= length ? text : `${text.slice(0, length)}...`;
export const getInitials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
export const toCamelCase = (value: string) => value.toLowerCase().replace(/[-_\s]+(.)/g, (_, char: string) => char.toUpperCase());

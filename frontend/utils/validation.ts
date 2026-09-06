export const validationRules = {
  required: (value: unknown) => Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value != null,
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^[+]?[(]?[0-9]{3,4}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(value),
  minLength: (min: number) => (value: string) => value?.length >= min,
  maxLength: (max: number) => (value: string) => value?.length <= max,
  minValue: (min: number) => (value: number) => value >= min,
  maxValue: (max: number) => (value: number) => value <= max,
  numeric: (value: unknown) => value !== "" && Number.isFinite(Number(value)),
  url: (value: string) => { try { new URL(value); return true; } catch { return false; } },
  dateFormat: (value: string) => !Number.isNaN(new Date(value).getTime()),
};

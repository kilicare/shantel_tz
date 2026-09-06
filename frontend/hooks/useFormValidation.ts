"use client";

import { useCallback, useState } from "react";

type Rule = { validate: (value: unknown) => boolean; message: string };
export function useFormValidation(rules: Record<string, Rule[]>) {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const validateField = useCallback((name: string, value: unknown) => {
    const failure = rules[name]?.find((rule) => !rule.validate(value));
    setErrors((current) => ({ ...current, [name]: failure?.message ?? null }));
    return !failure;
  }, [rules]);
  const validateForm = useCallback((values: Record<string, unknown>) => {
    const next: Record<string, string | null> = {};
    let valid = true;
    for (const [name, fieldRules] of Object.entries(rules)) { const failure = fieldRules.find((rule) => !rule.validate(values[name])); next[name] = failure?.message ?? null; if (failure) valid = false; }
    setErrors(next);
    return valid;
  }, [rules]);
  return { errors, validateField, validateForm, clearErrors: () => setErrors({}) };
}

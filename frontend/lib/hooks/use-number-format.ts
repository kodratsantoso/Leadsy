"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

export type CurrencyFormatSetting = {
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  thousands_separator: string;
  decimal_separator: string;
  decimal_digits: number;
  symbol_position: "before" | "after";
  space_between_symbol: boolean;
};

function normalizeNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function applySeparators(value: number, decimals: number, thousandsSeparator: string, decimalSeparator: string) {
  const fixed = value.toFixed(Math.max(0, decimals));
  const [integerPart, decimalPart] = fixed.split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsigned = sign ? integerPart.slice(1) : integerPart;
  const grouped = unsigned.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  return decimalPart ? `${sign}${grouped}${decimalSeparator}${decimalPart}` : `${sign}${grouped}`;
}

export function useNumberFormat() {
  const { data } = useQuery({
    queryKey: ["currency-format"],
    queryFn: async () => {
      const response = await apiFetch("/settings/currency-format");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const setting: CurrencyFormatSetting | undefined = data?.data;

  const formatNumber = (
    value: string | number | null | undefined,
    options: { decimals?: number } = {}
  ) => {
    const amount = normalizeNumber(value);
    if (amount === null) return "—";
    if (!setting) return String(value);

    return applySeparators(
      amount,
      options.decimals ?? setting.decimal_digits,
      setting.thousands_separator,
      setting.decimal_separator
    );
  };

  const formatCurrency = (
    value: string | number | null | undefined,
    options: { decimals?: number } = {}
  ) => {
    const amount = normalizeNumber(value);
    if (amount === null) return "—";
    if (!setting) return String(value);

    const formatted = applySeparators(
      amount,
      options.decimals ?? setting.decimal_digits,
      setting.thousands_separator,
      setting.decimal_separator
    );
    const symbol = setting.currency_symbol || setting.currency_code;
    const spacer = setting.space_between_symbol ? " " : "";

    return setting.symbol_position === "after"
      ? `${formatted}${spacer}${symbol}`
      : `${symbol}${spacer}${formatted}`;
  };

  return { setting, formatNumber, formatCurrency };
}

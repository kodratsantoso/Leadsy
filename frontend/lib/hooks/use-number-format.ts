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

  /** Strip thousand separators and normalise decimal separator so the stored
   *  value is always a plain numeric string (e.g. "15000000" or "15000000.5").
   *  This is safe to feed straight into `Number()` when submitting to the API. */
  const normalizeAmountInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    let normalized = trimmed;
    const tSep = setting?.thousands_separator ?? ",";
    const dSep = setting?.decimal_separator ?? ".";

    if (tSep) {
      normalized = normalized.replace(new RegExp(escapeRegExp(tSep), "g"), "");
    }
    if (dSep && dSep !== ".") {
      normalized = normalized.replace(new RegExp(escapeRegExp(dSep), "g"), ".");
    }

    const sanitized = normalized.replace(/[^\d.]/g, "");
    const [integerPart, ...fractionParts] = sanitized.split(".");
    const integer = integerPart.replace(/^0+(?=\d)/, "");

    if (fractionParts.length === 0) return integer;

    const maxDecimalDigits = Math.max(0, setting?.decimal_digits ?? 2);
    const fraction = fractionParts.join("").slice(0, maxDecimalDigits);
    return maxDecimalDigits === 0 ? integer : `${integer || "0"}.${fraction}`;
  };

  /** Format a plain numeric string with thousand separators while the user is
   *  typing, keeping the decimal part intact so the cursor doesn't jump. */
  const formatAmountInput = (value: string) => {
    if (!value) return "";

    const [integerPart, fractionPart] = value.split(".");
    const formattedInteger = formatNumber(integerPart || "0", { decimals: 0 });
    const dSep = setting?.decimal_separator ?? ".";

    if (fractionPart === undefined) {
      return formattedInteger === "—" ? "" : formattedInteger;
    }
    return `${formattedInteger === "—" ? "0" : formattedInteger}${dSep}${fractionPart}`;
  };

  return { setting, formatNumber, formatCurrency, normalizeAmountInput, formatAmountInput };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

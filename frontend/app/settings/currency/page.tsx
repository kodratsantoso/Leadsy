"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  minor_unit: number;
  exchange_rate: string | null;
  base_currency: string | null;
  exchange_rate_updated_at: string | null;
};

type CurrencySetting = {
  currency_id: number;
  thousands_separator: string;
  decimal_separator: string;
  decimal_digits: number;
  symbol_position: "before" | "after";
  space_between_symbol: boolean;
};

const emptySetting: CurrencySetting = {
  currency_id: 0,
  thousands_separator: ".",
  decimal_separator: ",",
  decimal_digits: 0,
  symbol_position: "before",
  space_between_symbol: true,
};

export default function CurrencySettingsPage() {
  const queryClient = useQueryClient();
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CurrencySetting>(emptySetting);
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const response = await apiFetch("/settings/currency");
      return response.json();
    },
  });

  const currencies: Currency[] = data?.data?.currencies ?? [];
  const setting = data?.data?.setting;

  useEffect(() => {
    if (!setting) return;
    setForm({
      currency_id: setting.currency_id,
      thousands_separator: setting.thousands_separator,
      decimal_separator: setting.decimal_separator,
      decimal_digits: setting.decimal_digits,
      symbol_position: setting.symbol_position,
      space_between_symbol: setting.space_between_symbol,
    });
  }, [setting]);

  const filteredCurrencies = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return currencies;

    return currencies.filter((currency) =>
      `${currency.code} ${currency.name} ${currency.symbol ?? ""}`.toLowerCase().includes(needle)
    );
  }, [currencies, search]);

  const selectedCurrency = currencies.find((currency) => currency.id === Number(form.currency_id));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/settings/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save currency settings.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currency-settings"] });
      queryClient.invalidateQueries({ queryKey: ["currency-format"] });
      setFeedback("Currency format saved.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const syncRatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/settings/currency/sync-rates", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to sync exchange rates.");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["currency-settings"] });
      setFeedback(data.message || "Exchange rates synchronized successfully.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const useCurrencyDefaults = () => {
    if (!selectedCurrency) return;
    setForm((current) => ({
      ...current,
      decimal_digits: selectedCurrency.minor_unit,
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <BackToSettings />
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Currency</CardTitle>
            </div>
            <CardDescription>Database-backed currency, thousand separator, decimal separator, and decimal precision.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncRatesMutation.mutate()}
            disabled={syncRatesMutation.isPending || !setting}
          >
            {syncRatesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
            Sync {setting?.currency_code || "Exchange"} Rates
          </Button>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Format Settings</CardTitle>
            <CardDescription>Controls how numeric and currency values are rendered in the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading currency settings...
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Select
                    value={form.currency_id ? String(form.currency_id) : ""}
                    onChange={(event) => setForm((current) => ({ ...current, currency_id: Number(event.target.value) }))}
                  >
                    {currencies.map((currency) => (
                      <option key={currency.id} value={String(currency.id)}>
                        {currency.code} — {currency.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Thousands Separator</label>
                    <Select
                      value={form.thousands_separator}
                      onChange={(event) => setForm((current) => ({ ...current, thousands_separator: event.target.value }))}
                    >
                      <option value=".">Dot (.)</option>
                      <option value=",">Comma (,)</option>
                      <option value=" ">Space</option>
                      <option value="'">Apostrophe (&apos;)</option>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Decimal Separator</label>
                    <Select
                      value={form.decimal_separator}
                      onChange={(event) => setForm((current) => ({ ...current, decimal_separator: event.target.value }))}
                    >
                      <option value=",">Comma (,)</option>
                      <option value=".">Dot (.)</option>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Decimal Digits</label>
                    <Input
                      type="number"
                      min="0"
                      max="6"
                      value={String(form.decimal_digits)}
                      onChange={(event) => setForm((current) => ({ ...current, decimal_digits: Number(event.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Symbol Position</label>
                    <Select
                      value={form.symbol_position}
                      onChange={(event) => setForm((current) => ({ ...current, symbol_position: event.target.value as CurrencySetting["symbol_position"] }))}
                    >
                      <option value="before">Before amount</option>
                      <option value="after">After amount</option>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Symbol Spacing</label>
                    <Select
                      value={form.space_between_symbol ? "true" : "false"}
                      onChange={(event) => setForm((current) => ({ ...current, space_between_symbol: event.target.value === "true" }))}
                    >
                      <option value="true">With space</option>
                      <option value="false">Without space</option>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.currency_id}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Currency Settings
                  </Button>
                  <Button variant="outline" onClick={useCurrencyDefaults} disabled={!selectedCurrency}>
                    Use Currency Decimal Default
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Preview uses the same formatter consumed by operational pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-[color:var(--surface-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Number</p>
              <p className="mt-2 text-2xl font-bold">{formatNumber(1234567.89)}</p>
            </div>
            <div className="rounded-lg border border-border bg-[color:var(--surface-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(1234567.89)}</p>
            </div>
            {selectedCurrency ? (
              <div className="text-sm text-muted-foreground">
                Active selection: <span className="font-medium text-foreground">{selectedCurrency.code}</span> {selectedCurrency.name}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Currency Master Data</CardTitle>
            <CardDescription>World currency reference loaded from the database.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <FilterBarSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search currency code, name, or symbol" />
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredCurrencies.map((currency) => (
              <button
                key={currency.id}
                type="button"
                onClick={() => setForm((current) => ({ ...current, currency_id: currency.id, decimal_digits: currency.minor_unit }))}
                className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-[var(--brand)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{currency.code}</p>
                    <p className="text-xs text-muted-foreground">{currency.name}</p>
                    {currency.exchange_rate && currency.base_currency && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        1 {currency.code} = {Number(currency.exchange_rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency.base_currency}
                        <br />
                        <span className="opacity-70">
                          {new Date(currency.exchange_rate_updated_at!).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                  <Badge variant={currency.id === Number(form.currency_id) ? "brand" : "neutral"}>
                    {currency.symbol ?? currency.code}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

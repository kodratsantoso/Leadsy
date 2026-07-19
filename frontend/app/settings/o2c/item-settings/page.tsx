"use client";
 
import { useEffect, useState } from "react";
import { Loader2, Settings } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
 
type ItemSettingItem = {
  id?: number;
  setting_key: string;
  setting_value_json: any;
};
 
export default function ItemSettingsPage() {
  const queryClient = useQueryClient();
  const [requireTier, setRequireTier] = useState(false);
  const [allowOverride, setAllowOverride] = useState(true);
  const [allowDiscount, setAllowDiscount] = useState(true);
  const [feedback, setFeedback] = useState("");
 
  const { data, isLoading } = useQuery({
    queryKey: ["o2c-item-settings"],
    queryFn: async () => {
      const response = await apiFetch("/settings/o2c/item-settings");
      return response.json();
    },
  });
 
  const settingsList: ItemSettingItem[] = data?.data ?? [];
 
  useEffect(() => {
    if (!settingsList.length) return;
 
    const requireTierSetting = settingsList.find((s) => s.setting_key === "require_product_tier_for_saas_product");
    if (requireTierSetting) {
      setRequireTier(!!requireTierSetting.setting_value_json?.enabled);
    }
 
    const allowOverrideSetting = settingsList.find((s) => s.setting_key === "allow_price_override");
    if (allowOverrideSetting) {
      setAllowOverride(!!allowOverrideSetting.setting_value_json?.enabled);
    }
 
    const allowDiscountSetting = settingsList.find((s) => s.setting_key === "allow_discount");
    if (allowDiscountSetting) {
      setAllowDiscount(!!allowDiscountSetting.setting_value_json?.enabled);
    }
  }, [settingsList]);
 
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        settings: [
          {
            setting_key: "require_product_tier_for_saas_product",
            setting_value_json: { enabled: requireTier },
          },
          {
            setting_key: "allow_price_override",
            setting_value_json: { enabled: allowOverride },
          },
          {
            setting_key: "allow_discount",
            setting_value_json: { enabled: allowDiscount },
          },
        ],
      };
 
      const response = await apiFetch("/settings/o2c/item-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
 
      if (!response.ok) {
        throw new Error("Unable to save item settings.");
      }
 
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["o2c-item-settings"] });
      setFeedback("Item settings updated successfully.");
    },
    onError: () => setFeedback("Error updating item settings."),
  });
 
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <BackToSettings />
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Item Settings</CardTitle>
            </div>
            <CardDescription>Configure commercial rules and controls for items added to quotations.</CardDescription>
          </div>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>
 
      <Card>
        <CardContent className="pt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading item settings...
            </div>
          ) : (
            <div className="space-y-6 max-w-xl">
              {/* Require Product Tier checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requireTier"
                  checked={requireTier}
                  onChange={(e) => setRequireTier(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1">
                  <label htmlFor="requireTier" className="text-sm font-semibold select-none cursor-pointer">
                    Require Product Tier for SaaS Products
                  </label>
                  <p className="text-xs text-muted-foreground">
                    If checked, users must select an active pricing tier/package when adding any product classified under SaaS.
                  </p>
                </div>
              </div>
 
              {/* Allow Price Override checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="allowOverride"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1">
                  <label htmlFor="allowOverride" className="text-sm font-semibold select-none cursor-pointer">
                    Allow Price Override
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Allow users to manually modify the unit price of items. If disabled, prices are strictly locked to the configured tier/package price.
                  </p>
                </div>
              </div>
 
              {/* Allow Discount checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="allowDiscount"
                  checked={allowDiscount}
                  onChange={(e) => setAllowDiscount(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1">
                  <label htmlFor="allowDiscount" className="text-sm font-semibold select-none cursor-pointer">
                    Allow Line-Level Discounts
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Enables discount percentage or value columns inside the quotation items table.
                  </p>
                </div>
              </div>
 
              <div className="pt-4 flex justify-start">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Item Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

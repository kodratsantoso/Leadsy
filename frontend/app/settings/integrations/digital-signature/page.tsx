"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { 
  getDigitalSignatureSettings, 
  createDigitalSignatureSetting, 
  updateDigitalSignatureSetting,
  DigitalSignatureConnection 
} from "@/lib/api/professional-services";

export default function DigitalSignatureSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<DigitalSignatureConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activeProvider, setActiveProvider] = useState<Partial<DigitalSignatureConnection>>({
    provider_name: "documenso",
    base_url: "",
    is_active: true
  });
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getDigitalSignatureSettings();
      setSettings(data);
      const active = data.find(s => s.is_active) || data[0];
      if (active) {
        setActiveProvider(active);
        setApiKey(""); // Don't load the API key from backend
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...activeProvider,
        api_key: apiKey || undefined,
      };

      if (activeProvider.id) {
        await updateDigitalSignatureSetting(activeProvider.id, payload);
      } else {
        await createDigitalSignatureSetting(payload);
      }
      
      alert("Settings saved successfully.");
      setApiKey("");
      loadSettings();
    } catch (e: any) {
      alert(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <h1 className="text-2xl font-bold tracking-tight">Digital Signature Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>
            Configure your open-source digital signature provider to enable sending documents directly from the Professional Services Estimator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Provider</label>
              <Select 
                value={activeProvider.provider_name} 
                onChange={(e) => setActiveProvider({...activeProvider, provider_name: e.target.value})}
              >
                <option value="documenso">Documenso (Open Source)</option>
                <option value="libresign" disabled>LibreSign (Coming Soon)</option>
                <option value="opensign" disabled>OpenSign (Coming Soon)</option>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex items-center justify-between border rounded-md px-4 py-2 h-10">
                <label className="cursor-pointer text-sm font-medium">Active</label>
                <input 
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={!!activeProvider.is_active} 
                  onChange={(e) => setActiveProvider({...activeProvider, is_active: e.target.checked})} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Base URL</label>
            <Input 
              value={activeProvider.base_url || ""} 
              onChange={e => setActiveProvider({...activeProvider, base_url: e.target.value})} 
              placeholder="https://app.documenso.com" 
            />
            <p className="text-xs text-muted-foreground">The root URL for your provider instance (e.g. self-hosted Documenso URL).</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">API Key</label>
            <Input 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              type="password"
              placeholder={activeProvider.id ? "•••••••••••••••• (Leave blank to keep current)" : "Enter API key"} 
            />
          </div>
          
        </CardContent>
        <div className="border-t bg-muted/20 px-6 py-4 flex justify-between rounded-b-2xl">
          <p className="text-xs text-muted-foreground">Digital signature events are logged to the Audit Log.</p>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Configuration</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}

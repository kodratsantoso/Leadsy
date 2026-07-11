"use client";

import { useState } from "react";
import { Key, Copy, Check, FileText, Code2, AlertTriangle, RefreshCw } from "lucide-react";
import { BackToSettings } from "../_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";

export default function ApiDocumentationPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = async () => {
    setIsGenerating(true);
    setError(null);
    setToken(null);
    
    if (!confirm("Are you sure you want to generate a new Integration Token? Any previous integration tokens will be revoked immediately.")) {
      setIsGenerating(false);
      return;
    }

    try {
      const response = await apiFetch("/auth/token/generate", {
        method: "POST"
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate token");
      }
      
      setToken(data.token);
      setCopied(false);
    } catch (err: any) {
      setError(err.message || "Failed to generate token.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <BackToSettings />
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--brand)]" />
            API Integration
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate your integration token and read the API documentation to automate Leadsy.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--status-danger)] shrink-0" />
          <p className="text-sm font-medium text-[var(--status-danger)]">{error}</p>
        </div>
      )}

      {/* Token Generator Section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-5 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[var(--brand)]/10 rounded-lg">
                <Key className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Integration Token</h3>
                <p className="text-xs text-muted-foreground">Generate a long-lived Bearer token for third-party platforms (e.g., Lark Base).</p>
              </div>
            </div>
            <button
              onClick={generateToken}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Generate New Token
            </button>
          </div>
        </div>

        {token && (
          <div className="p-5 space-y-3 bg-[color-mix(in_oklch,var(--status-success)_5%,transparent)]">
            <div className="flex items-center gap-2 text-[var(--status-success)]">
              <Check className="w-5 h-5" />
              <p className="text-sm font-semibold">Token Generated Successfully!</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Please copy this token now. For your security, <strong className="text-foreground">it will never be shown again</strong>.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 bg-background border px-3 py-2 rounded-lg text-sm break-all font-mono">
                {token}
              </code>
              <button
                onClick={copyToken}
                className="p-2 hover:bg-muted rounded-lg border bg-background transition-colors flex shrink-0"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* API Documentation */}
      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b bg-muted/20 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">API Reference</h3>
        </div>
        
        <div className="p-6 space-y-8 text-sm">
          {/* Authentication */}
          <section className="space-y-3">
            <h4 className="text-base font-semibold border-b pb-2">Authentication</h4>
            <p className="text-muted-foreground leading-relaxed">
              The Leadsy API uses Bearer token authentication. You must include the token generated above in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization</code> header of every request.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              Authorization: Bearer &lt;YOUR_INTEGRATION_TOKEN&gt;
            </div>
          </section>

          {/* Endpoint: Create Lead */}
          <section className="space-y-4">
            <h4 className="text-base font-semibold border-b pb-2">Create a New Lead</h4>
            <div className="flex items-center gap-3">
              <span className="bg-[var(--status-success)] text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">POST</span>
              <code className="font-mono text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded text-sm">/api/leads</code>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Push a new lead into the Leadsy system. This endpoint accepts `application/json` and automatically triggers AI enrichment if fields like company name, address, or website are provided.
            </p>
            
            <div className="space-y-2">
              <h5 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Payload Schema</h5>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 font-medium">Field</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-muted-foreground">
                    <tr>
                      <td className="p-3 font-mono text-xs font-semibold text-foreground">company_name</td>
                      <td className="p-3">String</td>
                      <td className="p-3"><span className="text-[var(--status-danger)] font-medium">Required</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">website</td>
                      <td className="p-3">String (URL)</td>
                      <td className="p-3">Optional</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">email</td>
                      <td className="p-3">String (Email)</td>
                      <td className="p-3">Optional</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">phone</td>
                      <td className="p-3">String</td>
                      <td className="p-3">Optional</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">address</td>
                      <td className="p-3">String</td>
                      <td className="p-3">Optional</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">source_type</td>
                      <td className="p-3">String</td>
                      <td className="p-3">Optional (Default: `manual`)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Sample Codes */}
          <section className="space-y-4 pt-4 border-t">
            <h4 className="text-base font-semibold">Sample Integration Scripts</h4>
            
            <div className="space-y-2">
              <p className="font-medium text-sm">Lark Base / Node.js (Fetch)</p>
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl text-xs overflow-x-auto leading-relaxed font-mono">
{`const LEADSY_API_URL = "https://api.yourdomain.com/api/leads";
const API_TOKEN = "YOUR_INTEGRATION_TOKEN_HERE";

async function pushToLeadsy(larkRecord) {
    const payload = {
        company_name: larkRecord.companyName,
        email: larkRecord.email,
        source_type: "lark_base"
    };

    const response = await fetch(LEADSY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': \`Bearer \${API_TOKEN}\`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Response:", data);
}`}
              </pre>
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-medium text-sm">cURL Example</p>
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl text-xs overflow-x-auto leading-relaxed font-mono">
{`curl -X POST https://api.yourdomain.com/api/leads \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer YOUR_INTEGRATION_TOKEN_HERE" \\
  -d '{
    "company_name": "Acme Corp",
    "email": "contact@acme.com",
    "source_type": "api"
  }'`}
              </pre>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

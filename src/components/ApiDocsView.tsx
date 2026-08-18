import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Code,
  Key,
  Copy,
  Check,
  Zap,
  FileCode,
  ShieldCheck,
  Send,
  Trash2,
  Plus,
  Terminal
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const {
    t,
    apiKeys,
    createApiKey,
    revokeApiKey
  } = useApp();

  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [testApiResult, setTestApiResult] = useState<string | null>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    await createApiKey(newKeyName.trim());
    setNewKeyName('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const activeKey = apiKeys.find(k => k.status === 'ACTIVE');

  const [testEndpoint, setTestEndpoint] = useState<string>('/api/v1/billable-summary');

  const executeTestApiCall = async (endpointToCall?: string) => {
    if (!activeKey) {
      alert('Bitte erstellen Sie zuerst einen aktiven API-Schlüssel.');
      return;
    }
    const ep = endpointToCall || testEndpoint;
    try {
      setIsCallingApi(true);
      const res = await fetch(ep, {
        headers: { 'x-api-key': activeKey.key }
      });
      const data = await res.json();
      setTestApiResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestApiResult('Error: ' + err.message);
    } finally {
      setIsCallingApi(false);
    }
  };

  const samplePowerAutomateJson = `{
  "type": "object",
  "properties": {
    "organization": { "type": "string" },
    "pagination": {
      "type": "object",
      "properties": {
        "page": { "type": "number" },
        "totalRecords": { "type": "number" }
      }
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "userName": { "type": "string" },
          "date": { "type": "string" },
          "durationHoursDecimal": { "type": "number" },
          "projectName": { "type": "string" },
          "clientName": { "type": "string" },
          "description": { "type": "string" },
          "calculatedAmount": { "type": "number" },
          "approvalStatus": { "type": "string" }
        }
      }
    }
  }
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Code className="w-5 h-5 text-emerald-600" />
          {t.apiDocsTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t.apiDocsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: API Keys Management */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              {t.apiKeys}
            </h3>
            <p className="text-xs text-slate-500">
              {t.apiKeysDesc}
            </p>

            <form onSubmit={handleCreateKey} className="flex gap-2">
              <input
                id="input-api-key-name"
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g. Power Automate Sync"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <button
                id="btn-create-api-key"
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> {t.save}
              </button>
            </form>

            {/* List of Keys */}
            <div className="space-y-2 pt-2">
              {apiKeys.map(key => (
                <div key={key.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{key.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {key.status === 'ACTIVE' ? t.active : t.inactive}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg font-mono text-[11px]">
                    <span className="text-slate-600 truncate max-w-[200px]">{key.key}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(key.key, key.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                        title={t.copy}
                      >
                        {copiedKeyId === key.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {key.status === 'ACTIVE' && (
                        <button
                          onClick={() => revokeApiKey(key.id)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                          title={t.revokeKey}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live Query Tester */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Terminal className="w-4 h-4 text-emerald-400" />
                {t.testApiCall}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-test-billable-summary"
                  onClick={() => executeTestApiCall('/api/v1/billable-summary')}
                  disabled={isCallingApi}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                >
                  {isCallingApi ? t.loading : 'GET billable-summary'}
                </button>
                <button
                  id="btn-test-api"
                  onClick={() => executeTestApiCall('/api/v1/time-entries?limit=5')}
                  disabled={isCallingApi}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                >
                  {isCallingApi ? t.loading : 'GET time-entries'}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Headers: <code>x-api-key: {activeKey ? activeKey.key.substring(0, 14) + '...' : 'NONE'}</code>
            </div>

            {testApiResult && (
              <pre className="bg-slate-950 p-3 rounded-xl text-[10px] font-mono text-emerald-400 max-h-52 overflow-y-auto border border-slate-800">
                {testApiResult}
              </pre>
            )}
          </div>
        </div>

        {/* Right Column: Documentation & Power Automate Guide */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          {/* Endpoints */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              {t.endpointDetails}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                  <span className="font-bold text-slate-900">/api/v1/time-entries</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Returns time entries for any custom timeframe. Filter: <code>from</code>, <code>to</code>, <code>projectId</code>, <code>clientId</code>, <code>approvalStatus</code>, <code>updatedAfter</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                  <span className="font-bold text-slate-900">/api/v1/working-time</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Returns daily attendance hours (clock-in, clock-out, break minutes, net time).
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                  <span className="font-bold text-slate-900">/api/v1/forecasts</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Returns plan and actual values including live extrapolation based on passed workdays.
                </p>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-purple-700 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                    <span className="font-bold text-purple-950">/api/v1/billable-summary</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="/api/export/billable-summary?format=csv"
                      download="billable_summary.csv"
                      className="px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 rounded font-semibold text-[10px] transition-colors"
                    >
                      CSV Export
                    </a>
                    <a
                      href="/api/export/billable-summary"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-semibold text-[10px] transition-colors"
                    >
                      JSON API
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  <strong>Reiner Datenexport & REST-API</strong>: Aggregierte & granulare Auswertung von Billable vs. Non-Billable Stunden, effektiven Stundensätzen, internen Kostensätzen, Abrechnungssummen und Bruttomargen nach Projekten & Mitarbeitern.
                </p>
                <div className="text-[10px] text-purple-800 space-y-0.5 font-mono">
                  <div>• Filter: <code>from</code>, <code>to</code>, <code>projectId</code>, <code>userId</code>, <code>clientId</code>, <code>projectType</code> (<code>CUSTOMER_PROJECT</code> | <code>INTERNAL_PROJECT</code>)</div>
                  <div>• Kostensätze: Werden unabhängig vom Billable-Status für <strong>alle</strong> Stunden erfasst.</div>
                  <div>• Kundenabrechnungssatz: Greift ausschließlich bei <strong>billable</strong> Buchungen.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Power Automate Flow Step-by-Step Guide (Section 12.5) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              {t.powerAutomateGuide}
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Step 1: Create HTTP Action in Power Automate</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>Method: <code>GET</code></li>
                  <li>URI: <code>https://[your-app-url]/api/v1/time-entries?from=@{'{'}triggerOutputs()...{'}'}</code></li>
                  <li>Header: <code>x-api-key: [your-api-key]</code></li>
                </ul>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Step 2: Parse JSON Action</strong>
                <p className="text-[11px] mt-1">
                  Use the following JSON schema for automatic deduplicated record insertion into Excel / Power BI:
                </p>
                <pre className="mt-1 bg-white p-2 rounded border border-slate-200 text-[10px] font-mono text-slate-800 max-h-36 overflow-y-auto">
                  {samplePowerAutomateJson}
                </pre>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Step 3: Excel Online (Business) - Insert / Update Row</strong>
                <p className="text-[11px] mt-1">
                  Key column: <code>id</code> (prevents duplicates during repeated synchronization intervals).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

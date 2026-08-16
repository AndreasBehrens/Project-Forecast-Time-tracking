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

  const executeTestApiCall = async () => {
    if (!activeKey) {
      alert('Bitte erstellen Sie zuerst einen aktiven API-Schlüssel.');
      return;
    }
    try {
      setIsCallingApi(true);
      const res = await fetch('/api/v1/time-entries?limit=5', {
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
          {t.apiDocsSubtitle} (Beliebiger Zeitraum, Delta-Abrufe über <code>updatedAt</code>, EU-DSGVO konform).
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
              Mandantengebundene API-Schlüssel für Power Automate, Excel und externe Analyse-Tools.
            </p>

            <form onSubmit={handleCreateKey} className="flex gap-2">
              <input
                id="input-api-key-name"
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="z.B. Power Automate Sync"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <button
                id="btn-create-api-key"
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> Erzeugen
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
                      {key.status}
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
                          title="Widerrufen"
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
                Live API-Abfrage testen
              </div>
              <button
                id="btn-test-api"
                onClick={executeTestApiCall}
                disabled={isCallingApi}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors"
              >
                {isCallingApi ? 'Lade...' : 'GET /api/v1/time-entries'}
              </button>
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
                  Liefert Zeiteinträge für jeden beliebigen Zeitraum. Filter: <code>from</code>, <code>to</code>, <code>projectId</code>, <code>clientId</code>, <code>approvalStatus</code>, <code>updatedAfter</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                  <span className="font-bold text-slate-900">/api/v1/working-time</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Liefert allgemeine Tagesarbeitszeiten (Anwesenheit) mit Beginn, Ende, Pausen und Netto-Arbeitszeit.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">GET</span>
                  <span className="font-bold text-slate-900">/api/v1/forecasts</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Liefert Plan- und Ist-Werte inklusive Hochrechnung auf Basis der verstrichenen Arbeitstage.
                </p>
              </div>
            </div>
          </div>

          {/* Power Automate Flow Step-by-Step Guide (Section 12.5) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              {t.powerAutomateGuide} (Excel-Synchronisation)
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Schritt 1: HTTP-Aktion in Power Automate anlegen</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>Methode: <code>GET</code></li>
                  <li>URI: <code>https://[Ihre-App-URL]/api/v1/time-entries?from=@{'{'}triggerOutputs()...{'}'}</code></li>
                  <li>Header: <code>x-api-key: [Ihr-API-Schlüssel]</code></li>
                </ul>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Schritt 2: Aktion "JSON analysieren" (Parse JSON)</strong>
                <p className="text-[11px] mt-1">
                  Verwenden Sie das folgende Schema für die automatische Excel-Zeilen-Generierung ohne Duplikate:
                </p>
                <pre className="mt-1 bg-white p-2 rounded border border-slate-200 text-[10px] font-mono text-slate-800 max-h-36 overflow-y-auto">
                  {samplePowerAutomateJson}
                </pre>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong>Schritt 3: Excel Online (Business) - Zeile aktualisieren oder einfügen</strong>
                <p className="text-[11px] mt-1">
                  Schlüsselfeld: <code>id</code> (verhindert doppelte Zeileneinträge bei wiederholten Sync-Durchläufen).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

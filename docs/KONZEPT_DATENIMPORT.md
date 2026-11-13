# Konzept: Allgemeiner Datenimport aus unterschiedlichen Quellen

Stand: 13.11.2026 · Status: abgestimmt (Entscheidungen siehe 12), Phase 1 umgesetzt · Bereich: Menüpunkt „Import & Export“

---

### 1. Ziel

Der Import ist heute fest auf Clockify zugeschnitten. Künftig sollen Zeit- und Stammdaten aus **beliebigen Quellen** (Clockify, andere Zeiterfassungstools, Excel/CSV aus Altsystemen, HR-Systeme) über **einen einheitlichen Ablauf** importiert werden:

> Quelle wählen → Datei hochladen → Spalten zuordnen → Mitarbeitende/Projekte zuordnen → Vorschau prüfen → Import ausführen → Bericht (und ggf. rückgängig machen)

Neue Quellen sollen sich durch einen kleinen **Adapter** ergänzen lassen, ohne die Import-Logik, die Validierung oder die Oberfläche anzufassen.

---

### 2. Ist-Stand (Analyse des Codes, Branch `test`)

Es gibt zwei getrennte Importwege mit eigener Logik:

| | CSV-Import | PDF-Import |
|---|---|---|
| Oberfläche | `ClockifyMigrationView.tsx`, Tab „CSV-Import“ | gleiche Datei, Tab „PDF-Import“ (3 Schritte) |
| Parsing | im Browser (`parseCsvToObjects`, Trennzeichen `,`/`;`) | auf dem Server (`server/clockifyPdfParser.ts`, nur Clockify „Detailed Report“) |
| Endpunkt | `POST /api/clockify/import` | `POST /api/import/clockify-pdf/parse` und `/execute` |
| Logik | `storage.importClockifyData()` | direkt in `server/app.ts` |
| Spaltenerkennung | fest einprogrammierte Namen (`Project`/`Projekt`, `Client`/`Kunde`, `User`/`Benutzer`, …) | Regex auf den PDF-Text |
| Stammdaten | Kunden, Projekte, Aufgaben und **Benutzer werden automatisch angelegt** | manuelle Zuordnung von Benutzern und Projekten |
| Ziel | nur Projektzeiten | Projektzeiten **oder** allgemeine Arbeitszeit |
| Duplikate | Nutzer + Projekt + Datum + Start + Dauer + Beschreibung | Nutzer + Datum + Startzeit |
| Vorschau | nur Statistik (Zeilen, Kunden, Stunden) | Liste mit Zuordnung |

**Schwachstellen, die das neue Konzept beheben soll:**

1. **Stille Ersatzwerte im CSV-Import.** Ein ungültiges Datum wird zum **heutigen Datum**, eine fehlende oder ungültige Dauer zu **60 Minuten**. Ein fehlender Kunde wird „Standard Kunde“. Ein fehlender Benutzer wird „Importierter Mitarbeiter“ mit einer `@example.com`-Adresse. So entstehen falsche Buchungen, ohne dass es jemand merkt.
2. **Benutzer werden ungefragt angelegt.** Schon ein Tippfehler im Namen erzeugt einen neuen Mitarbeitenden.
3. **Importierte Einträge sind sofort freigegeben** (`approvalStatus: 'APPROVED'`), und es gibt keine Kennzeichnung, aus welchem Import sie stammen.
4. **Kein Probelauf und kein Rückgängig.** Ein fehlerhafter Import lässt sich nur Eintrag für Eintrag korrigieren.
5. **Zwei verschiedene Duplikatregeln.** Wird dieselbe Woche einmal als CSV und einmal als PDF importiert, entstehen doppelte Einträge.
6. **Spaltennamen sind fest einprogrammiert.** Jede neue Quelle erfordert eine Codeänderung in `storage.ts`.

---

### 3. Zielarchitektur

```
 ┌──────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────┐
 │  Datei   │──▶│  Adapter   │──▶│ Spalten-     │──▶│ Stammdaten-  │──▶│ Validierung │──▶│ Commit   │
 │ CSV/XLSX │   │ (Parser je │   │ Mapping      │   │ Mapping      │   │ + Vorschau  │   │ als      │
 │ PDF/JSON │   │  Quelle)   │   │ → kanonisch  │   │ User/Projekt │   │ (Probelauf) │   │ Batch    │
 └──────────┘   └────────────┘   └──────────────┘   └──────────────┘   └─────────────┘   └──────────┘
                                                                                             │
                                                                         Audit-Log ◀─────────┤
                                                                         Import-Historie ◀───┘ (Rückgängig)
```

Kernidee: **Jede Quelle wird zuerst in ein einheitliches Zwischenformat übersetzt.** Alles danach (Zuordnung, Prüfung, Duplikate, Speichern, Audit) existiert **nur einmal** und gilt für alle Quellen.

#### 3.1 Kanonisches Zwischenformat

```ts
// src/types.ts (neu)
export type ImportTarget = 'TIME_ENTRY' | 'WORKING_TIME' | 'ABSENCE' | 'MASTER_DATA';

export interface ImportRecord {
  rowNumber: number;            // Zeile/Position in der Quelldatei (für Fehlermeldungen)
  externalId?: string;          // ID im Quellsystem, falls vorhanden (stärkster Duplikatschutz)
  target: ImportTarget;         // Projektzeit, Arbeitszeit, Abwesenheit oder Stammdaten
  userRef: string;              // Name oder E-Mail aus der Quelle
  userEmail?: string;
  userGroup?: string;
  clientRef?: string;
  projectRef?: string;
  taskRef?: string;
  date: string;                 // ISO YYYY-MM-DD, Pflichtfeld
  startTime?: string;           // HH:mm
  endTime?: string;             // HH:mm
  durationMinutes: number;      // aus Dauer-Spalte oder Start/Ende berechnet; nie ein Ersatzwert
  breakMinutes?: number;
  description?: string;
  isBillable?: boolean;
  dayType?: DayType;            // für Arbeitszeit/Abwesenheiten
  hourlyBillingRate?: number;
  hourlyCostRate?: number;
  raw: Record<string, unknown>; // Originalzeile, unverändert (Nachvollziehbarkeit)
}
```

#### 3.2 Adapter-Schnittstelle

```ts
// server/import/adapters/types.ts (neu)
export interface ImportAdapter {
  id: string;                         // z. B. 'clockify-csv'
  label: { de: string; en: string };  // Anzeigename in der Quellenauswahl
  fileTypes: ('csv' | 'xlsx' | 'pdf' | 'json')[];
  supportedTargets: ImportTarget[];
  /** Liest die Datei und liefert Rohzeilen sowie erkannte Spalten. */
  parse(file: Buffer, options: ParseOptions): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
  /** Vorschlag für die Spaltenzuordnung; bei bekannten Quellen vollständig. */
  suggestMapping(columns: string[]): ColumnMapping;
  /** Optional: quellspezifische Nachbearbeitung, z. B. Projektname → Abwesenheitsart. */
  postProcess?(record: ImportRecord): ImportRecord;
}
```

Eine `ColumnMapping` ordnet jedem kanonischen Feld eine Quellspalte zu und legt dazu Format-Hinweise fest: Datumsformat `DD.MM.YYYY`/`MM/DD/YYYY`, Dezimaltrennzeichen, Dauer als `HH:MM` oder dezimal, Werte für „abrechenbar“ wie `Yes`/`Ja`/`WAHR`.

#### 3.3 Geplante Adapter

| Priorität | Adapter | Format | Ziele | Hinweis |
|---|---|---|---|---|
| 1 | **Clockify CSV** | CSV | Projektzeit | Ersetzt die heutige Logik, feste Zuordnung |
| 1 | **Clockify PDF** | PDF | Projektzeit, Arbeitszeit | Bestehender Parser wird zum Adapter |
| 1 | **Allgemein CSV / Excel** | CSV, XLSX | alle | Freie Spaltenzuordnung in der Oberfläche, speicherbar als **Profil** |
| 2 | Eigener App-Export (Rückimport) | CSV, JSON | Projektzeit | Für Umzüge zwischen Mandanten oder Umgebungen |
| 2 | Toggl Track | CSV | Projektzeit | Feste Zuordnung |
| 2 | Harvest | CSV | Projektzeit | Feste Zuordnung |
| 3 | Jira / Tempo Worklogs | CSV oder API | Projektzeit | `externalId` = Worklog-ID |
| 3 | HR-System (z. B. Personio) | CSV oder API | Abwesenheiten | Urlaub/Krankheit → `dayType` |

**Zuordnungsprofile:** Technisch ist ein Zuordnungsprofil eine **Import-Schema-Datei** (siehe 3.4). Für den allgemeinen CSV/Excel-Import wird eine einmal erstellte Spaltenzuordnung pro Mandant unter einem Namen gespeichert, z. B. „DATEV-Export Kunde X“. Beim nächsten Import wird das Profil automatisch erkannt, sobald die Spaltenköpfe übereinstimmen. Neue Quellen lassen sich so ganz **ohne Code** anbinden.

#### 3.4 Import-Schema / Musterdatei des Quellsystems

Für jede Quelle – und bei Bedarf pro Mandant – wird beschrieben, **wie die Exportdatei des Quellsystems aufgebaut ist**. Diese Beschreibung ist eine **Schema-Datei im JSON-Format** (optional später auch YAML). Sie ersetzt fest einprogrammierte Spaltennamen: Eine neue Quelle wird angebunden, indem man ein Schema anlegt, nicht indem man Code ändert.

**Inhalt einer Schema-Datei:**

| Bereich | Inhalt |
|---|---|
| Kopf | `schemaVersion` (Format der Schema-Datei, aktuell `1`), `name`, `source` (Quellsystem, z. B. `clockify-csv`), `version` (Version dieses Schemas), Beschreibung |
| Datei | Dateityp (`csv`), Trennzeichen (`,`, `;`, Tab oder `auto`), Zeichensatz, Zeile der Spaltenköpfe |
| Ziel | `TIME_ENTRY` (Projektzeiten), `WORKING_TIME` (Arbeitszeit), `ABSENCE` (Abwesenheiten) oder `MASTER_DATA` (nur Stammdaten) |
| Spaltenzuordnung | Quellspalte → kanonisches Feld (`userRef`, `userEmail`, `clientRef`, `projectRef`, `taskRef`, `date`, `startTime`, `endTime`, `duration`, `breakMinutes`, `description`, `isBillable`, `dayType`, Sätze, optional `externalId`). Mehrere Alternativen und `*` als Platzhalter sind erlaubt, z. B. `"Billable Rate*"` |
| Formate | Datumsformat (`DD.MM.YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY` oder `auto`), Dauer (`HH:MM`, dezimal, Minuten), Dezimaltrennzeichen |
| Abrechenbar | Wertelisten für „ja“ und „nein“ (z. B. `Yes`, `Ja`, `WAHR`), Standardwert |
| Wertzuordnungen | Regeln wie „Projekt = Urlaub → Tagesart `VACATION`“ oder „Aufgabe enthält ‚intern‘ → nicht abrechenbar“ |
| Duplikatschlüssel | `fingerprint` (Standard, siehe 6) oder `externalId` (dann ist die ID-Spalte Pflicht) |
| Prüfregeln | z. B. maximale Dauer pro Eintrag (Warnung), Warnung bei Wochenendbuchungen |
| Erkennung | `headerFingerprint`: Hash der Spaltenköpfe, um das passende Schema beim Hochladen automatisch zu erkennen |

**Drei Wege, ein Schema zu erstellen:**

1. **Musterdatei hochladen (empfohlen):** Ein Beispiel-Export des Quellsystems wird hochgeladen. Das System leitet aus Spaltenköpfen und Beispielwerten einen **Entwurf** ab: Trennzeichen, Spaltenzuordnung über Synonyme (DE/EN), Datums-, Dauer- und Dezimalformat, unbekannte Ja/Nein-Werte. Erkennt es ein eingebautes Schema (z. B. Clockify), wird das angezeigt. Die Benutzerin korrigiert den Entwurf anschließend in der Zuordnungsoberfläche.
2. **Schema-Datei hochladen:** Eine von Hand geschriebene oder aus einer anderen Umgebung exportierte Schema-Datei wird hochgeladen und geprüft.
3. **Vorlage herunterladen:** Eine Vorlage (auf Basis des eingebauten Schemas „Clockify CSV“) wird heruntergeladen, angepasst und wieder hochgeladen.

**Versionierung, Erkennung und Prüfung:**

- Jede Änderung erhöht `version`; ältere Versionen bleiben für die Nachvollziehbarkeit erhalten, der Import-Batch speichert die verwendete Schema-ID.
- Beim Hochladen einer Datei wird über `headerFingerprint` das passende Schema vorgeschlagen.
- Die Schema-Datei selbst wird gegen ein **JSON Schema** geprüft (herunterladbar unter `GET /api/import/schemas/template?format=jsonschema`). Fehler werden mit Pfad gemeldet, z. B. `columns.date: Pflichtfeld fehlt`. Zusätzlich gelten fachliche Regeln: Mitarbeitende und Datum sind Pflicht, außerdem Dauer oder Start + Ende; für Projektzeiten ist das Projekt Pflicht.

**Beispiel (gekürzt):**

```json
{
  "schemaVersion": 1,
  "name": "HR-Export Abwesenheiten",
  "source": "hr-csv",
  "version": 1,
  "fileType": "csv",
  "delimiter": ";",
  "encoding": "utf-8",
  "headerRow": 1,
  "target": "ABSENCE",
  "columns": {
    "externalId": "Antrags-ID",
    "userEmail": "E-Mail",
    "userRef": "Mitarbeiter",
    "date": "Datum",
    "duration": "Stunden",
    "dayType": "Art"
  },
  "formats": { "date": "DD.MM.YYYY", "duration": "decimal", "decimalSeparator": "," },
  "valueMappings": [
    { "when": { "field": "dayType", "equals": "Urlaub" }, "set": { "dayType": "VACATION" } },
    { "when": { "field": "dayType", "equals": "Krank" }, "set": { "dayType": "SICK" } }
  ],
  "duplicateKey": "externalId",
  "validation": { "maxDurationHours": 10 }
}
```

**Endpunkte (siehe auch 9):** `POST /api/import/schemas` (hochladen und prüfen, mandantenbezogen speichern), `POST /api/import/schemas/validate` (nur prüfen), `POST /api/import/schemas/derive` (Entwurf aus Musterdatei), `GET /api/import/schemas` (Liste je Mandant inkl. eingebauter Schemas), `GET /api/import/schemas/:id/download`, `GET /api/import/schemas/template`.

---

### 4. Stammdaten-Zuordnung (Mitarbeitende, Kunden, Projekte, Aufgaben)

- **Mitarbeitende werden nur von Superadmins angelegt** (Entscheidung, siehe 12). Jeder Name aus der Quelle wird einem vorhandenen Benutzer zugeordnet: zuerst über die E-Mail, dann über den exakten Namen.
  - **Admins** dürfen nur zuordnen. Nicht zuordenbare Personen erscheinen im Probelauf als **Fehler** („nicht zugeordnet“) und werden nicht importiert.
  - **Superadmins** dürfen fehlende Mitarbeitende beim Import anlegen – immer mit Status `INVITED` (eingeladen) und **ohne Platzhalter-Adresse**: Liefert die Quelle keine E-Mail, bleibt das Feld leer. Personen aus einem anderen Mandanten werden dem aktuellen Mandanten zugeordnet.
- **Kunden, Projekte, Aufgaben:** Pro Eintrag lässt sich „vorhandenem zuordnen“, „neu anlegen“ oder „überspringen“ wählen. Ob neue Kunden und Projekte erlaubt sind, wird je Import festgelegt.
- **Zuordnungen werden gemerkt.** Pro Mandant und Quelle wird eine Alias-Tabelle gespeichert, z. B. „A. Bilgin“ → Benutzer `u-1787309185924`. Beim nächsten Import ist die Zuordnung dann schon vorausgefüllt.

---

### 5. Validierung und Vorschau (Probelauf)

Vor dem Speichern läuft immer ein **Probelauf**, der nichts schreibt. Jede Zeile bekommt einen Status:

| Status | Bedeutung | Beispiele |
|---|---|---|
| ✅ OK | wird importiert | — |
| ⚠️ Warnung | wird importiert, sollte aber geprüft werden | Dauer > 12 h, Wochenende/Feiertag, Stundensatz weicht vom hinterlegten Satz ab |
| ⏭️ Duplikat | wird übersprungen | Fingerabdruck existiert bereits (siehe 6) |
| ⛔ Fehler | wird **nicht** importiert | Datum ungültig, Dauer fehlt, Benutzer nicht zugeordnet, **Zeitraum gesperrt** (Periodensperre), Ende vor Start |

Grundregel: **Keine stillen Ersatzwerte.** Was nicht eindeutig lesbar ist, wird als Fehler mit Zeilennummer und Originalwert angezeigt. Die Vorschau zeigt Summen pro Mitarbeitendem und Monat, damit sie sich mit der Quelle abgleichen lassen (z. B. „Alp Bilgin, 09/2026: 136 h“).

---

### 6. Duplikaterkennung (einheitlich für alle Quellen)

Jeder importierte Eintrag erhält einen **Fingerabdruck**:

1. Liefert die Quelle eine `externalId`, gilt: `Quelle + externalId`.
2. Sonst: Hash aus `Mitarbeitende + Datum + Startzeit + Dauer + Projekt` (ohne Beschreibung, weil sich Beschreibungen zwischen CSV und PDF unterscheiden).

Der Fingerabdruck wird am Eintrag gespeichert. Ein Abgleich erfolgt auch mit **manuell erfassten** Einträgen (gleicher Tag, gleiche Person, überlappende Zeit). Diese Fälle erscheinen als Warnung, nicht als Fehler.

---

### 7. Import als Batch, Rückgängig und GoBD

- Jeder ausgeführte Import ist ein **Import-Batch**: ID, Quelle/Adapter, Dateiname, SHA-256 der Datei, Mandant, ausführende Person, Zeitpunkt sowie Anzahl importierter, übersprungener und fehlerhafter Zeilen.
- Jeder Eintrag erhält `importBatchId` und `sourceRef` (Datei + Zeilennummer). So bleibt jederzeit nachvollziehbar, woher eine Buchung stammt.
- **Audit-Log:** ein Eintrag „IMPORT“ pro Batch mit Zusammenfassung, eingehängt in die bestehende Hash-Kette.
- **Freigabestatus:** Importierte Projektzeiten erhalten immer den Status **„zur Freigabe“** (`SUBMITTED`, in der Oberfläche „Eingereicht“) und durchlaufen den bestehenden Freigabe-Workflow (Entscheidung, siehe 12).
- **Rückgängig machen:** Ein Batch lässt sich **nur innerhalb von 5 Tagen nach dem Import** und **nur, solange kein betroffener Zeitraum gesperrt ist**, rückgängig machen (`DELETE /api/import/batches/:id`). Die Einträge werden über die normalen Löschfunktionen entfernt, damit das Audit-Log vollständig bleibt. Beim Import angelegte Stammdaten (Kunden, Projekte, Mitarbeitende) bleiben erhalten. Gesperrte Zeiträume werden nie verändert.
- **Periodensperren** werden schon im Probelauf geprüft (siehe 5).

---

### 8. Oberfläche

Der Menüpunkt heißt **„Import & Export“** (umgesetzt, siehe 11). Im Import-Bereich gibt es einen einheitlichen **Assistenten** statt der Tabs „CSV-Import“ und „PDF-Import“:

1. **Quelle wählen:** Kacheln „Clockify (CSV)“, „Clockify (PDF-Report)“, „Allgemeine CSV/Excel-Datei“, gespeicherte Profile, später weitere Tools. Dazu das Importziel: Projektzeiten, Arbeitszeit, Abwesenheiten oder nur Stammdaten.
2. **Datei hochladen**, per Drag & Drop. Die Dateitypen richten sich nach der Quelle.
3. **Spalten zuordnen.** Bei bekannten Quellen ist alles vorausgefüllt, und der Schritt kann eingeklappt bleiben. Beim allgemeinen Import werden die kanonischen Felder links und eine Spaltenauswahl mit Beispielwerten rechts angezeigt. Dazu kommt die Option „als Profil speichern“.
4. **Stammdaten zuordnen:** Mitarbeitende, Kunden und Projekte, vorausgefüllt aus Aliasen und der automatischen Zuordnung.
5. **Vorschau und Prüfung:** Tabelle mit Status-Filter (OK / Warnung / Duplikat / Fehler), Summen pro Person und Monat, Option „Duplikate überspringen“. Der Freigabestatus ist fest „zur Freigabe“ (siehe 7).
6. **Import ausführen und Bericht anzeigen**, mit Download des Fehlerprotokolls als CSV.

Ergänzend gibt es eine **Import-Historie**: Liste aller Batches mit Details und der Schaltfläche „Rückgängig machen“. Der Export-Bereich (rechte Spalte) bleibt unverändert. Alle Texte laufen über `translations.ts` (DE/EN).

---

### 9. API (neu, Server)

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/import/sources` | Verfügbare Adapter und gespeicherte Profile |
| POST | `/api/import/preview` | Multipart: Datei + `sourceId` + `target` + optional Zuordnungen → Probelauf-Ergebnis mit `previewId` (befristet zwischengespeichert, z. B. 30 Min.) |
| PUT | `/api/import/preview/:previewId` | Zuordnungen ändern → neu prüfen |
| POST | `/api/import/preview/:previewId/commit` | Import ausführen → Batch |
| GET | `/api/import/batches` | Import-Historie |
| DELETE | `/api/import/batches/:id` | Batch rückgängig machen (nur ≤ 5 Tage, kein gesperrter Zeitraum; sonst 409 mit Grund) |
| POST | `/api/import/dry-run` | Probelauf mit Status je Zeile (`NEW`/`DUPLICATE`/`ERROR`/`WARNING`), schreibt nichts. Body: `{ rows }` oder `{ csv, schema }` |
| POST | `/api/import/execute` | Import mit beliebigem (geprüftem) Schema ausführen → Batch |
| POST | `/api/import/schemas` | Schema-Datei hochladen, prüfen und mandantenbezogen speichern |
| POST | `/api/import/schemas/validate` | Schema-Datei nur prüfen (JSON Schema + fachliche Regeln) |
| POST | `/api/import/schemas/derive` | Schema-Entwurf aus Musterdatei (CSV) ableiten |
| GET | `/api/import/schemas` | Schemas des Mandanten und eingebaute Schemas |
| GET | `/api/import/schemas/:id/download` | Schema-Datei herunterladen |
| GET | `/api/import/schemas/template` | Vorlage herunterladen; `?format=jsonschema` liefert das JSON Schema |

- Das Parsen läuft immer **auf dem Server**, auch für CSV. So gibt es nur eine Wahrheit, und große Dateien werden nicht durch den Browser geschleust.
- Berechtigung: Admin/Superadmin, Ziel ist der gewählte Mandant (wie heute).
- Die bisherigen Endpunkte `/api/clockify/import` und `/api/import/clockify-pdf/*` bleiben während der Umstellung erhalten und werden intern auf die neuen Adapter umgeleitet. Danach werden sie entfernt.

**Code-Struktur:**

```
server/import/
  adapters/
    types.ts
    clockifyCsv.ts
    clockifyPdf.ts        (aus server/clockifyPdfParser.ts)
    genericTabular.ts     (CSV + XLSX mit freier Zuordnung)
  schema.ts               (Schema-Datei: Typ, Prüfung, CSV-Parser, Schema anwenden, Entwurf ableiten, eingebautes Schema „Clockify CSV“)
  fingerprint.ts          (einheitlicher Duplikat-Fingerabdruck, Rückgängig-Regel)
  pipeline.ts             (Mapping → Validierung → Duplikate → Commit; in Phase 1 noch in storage.ts)
  normalizers.ts          (Datum, Zeit, Dauer, Dezimal, Ja/Nein – aus storage.ts herausgelöst)
  registry.ts             (Liste der Adapter)
src/components/import/
  ImportWizard.tsx, SourceStep.tsx, ColumnMappingStep.tsx,
  MasterDataMappingStep.tsx, PreviewStep.tsx, ImportHistory.tsx
```

**Datenbank:** neue Tabellen `import_schemas`, `import_aliases` (und später ggf. `import_batches`), im gleichen Muster wie bisher (`seq` + `data JSONB`). In Phase 1 werden Import-Batches ohne Migration im JSONB-Datensatz der Organisation gespeichert (`importBatches`). An `TimeEntry`/`WorkingTimeEntry` kommen die optionalen Felder `importBatchId`, `sourceRef` und `fingerprint` hinzu. Eine Migration ist nur für die neuen Tabellen nötig, bestehende Einträge bleiben unverändert.

---

### 10. Umsetzung in Phasen

Aufwand als grobe Größenordnung: S = bis 1 Tag, M = 2–4 Tage, L = 1–2 Wochen.

| Phase | Inhalt | Aufwand |
|---|---|---|
| **0 – Sofort** (erledigt) | Menüpunkt „Import & Export“, allgemeine Texte im CSV-Bereich (DE/EN) | S |
| **1 – Fundament** (umgesetzt) | Kanonisches Format, Normalisierer, **stille Ersatzwerte entfernt**, Schema-Dateien (Prüfung, Anwenden, Entwurf aus Musterdatei, Vorlage, eingebautes Schema „Clockify CSV“), Probelauf, einheitlicher Fingerabdruck für CSV und PDF, Freigabestatus „zur Freigabe“, Anlegen von Mitarbeitenden nur durch Superadmins, **Batch und Rückgängig (5 Tage) teilweise** inkl. Import-Historie; Tests | M |
| **2 – Assistent + Abwesenheiten** | Neue Oberfläche Schritte 1–6, Stammdaten-Zuordnung mit Aliasen, Schema-Verwaltung pro Mandant (`import_schemas`), **Abwesenheiten aus HR-Systemen** (Ziel `ABSENCE`, technisch in der Pipeline bereits vorhanden) | M–L |
| **3 – Allgemeiner Import** | CSV/Excel (XLSX) mit freier Spaltenzuordnung, Schemas als Profile mit automatischer Erkennung | M |
| **4 – Nachvollziehbarkeit** | Audit-Eintrag „IMPORT“ pro Batch in der Hash-Kette, SHA-256 der Datei, Fehlerprotokoll als CSV | S–M |
| **5 – Weitere Quellen** | Toggl, Harvest, Tempo, je nach Bedarf | je S–M |

Jede Phase wird gemäß Arbeitsweise auf dem Branch `test` entwickelt, nach GitHub gepusht und automatisch auf die Testumgebung deployt.

---

### 11. Bereits umgesetzt

#### Phase 0

- Menüpunkt **„Clockify-Import & Export“ → „Import & Export“** (DE und EN, Desktop-Sidebar und mobile Navigation).
- Seitentitel „Datenimport & Export“ / „Data Import & Export“, Untertitel nicht mehr nur Clockify.
- CSV-Bereich: „CSV-Datei importieren“, „Beispieldaten laden“, Hinweis auf erkannte deutsche und englische Spalten („kompatibel mit Clockify-Exporten“).
- Der PDF-Import bleibt ausdrücklich als „Clockify Detailed Report“ beschriftet, weil der Parser nur dieses Format versteht.

#### Phase 1 (Fundament)

- **Kanonisches Format** `ImportRecord` und Typen für Probelauf und Batches in `src/types.ts`.
- **Normalisierer** `server/import/normalizers.ts`: Datum, Uhrzeit, Dauer, Dezimalzahl, Ja/Nein. Ungültiges Datum oder ungültige Dauer ergeben einen **Zeilenfehler** statt „heute“ bzw. „60 Minuten“.
- **Schema-Dateien** `server/import/schema.ts`: Prüfung (Zod + JSON Schema), Anwenden auf CSV-Zeilen, Entwurf aus Musterdatei, eingebautes Schema „Clockify CSV“. Endpunkte `POST /api/import/schemas/derive`, `POST /api/import/schemas/validate`, `GET /api/import/schemas/template`.
- **Probelauf** `POST /api/import/dry-run` mit Status je Zeile; die CSV-Oberfläche hat eine Schaltfläche „Probelauf starten“ mit Zählern, neu anzulegenden Stammdaten und den Zeilen mit Hinweisen.
- **Einheitlicher Fingerabdruck** `server/import/fingerprint.ts` für CSV und PDF (ohne Beschreibung), Abgleich auch mit manuell erfassten Einträgen.
- **Freigabestatus „zur Freigabe“** (`SUBMITTED`) für importierte Projektzeiten (CSV und PDF).
- **Mitarbeitende anlegen nur durch Superadmins** (Status `INVITED`, keine `@example.com`-Adresse); bei anderen Rollen Zuordnungsfehler.
- **Import-Batches**: `importBatchId`, `fingerprint` und `sourceRef` an jedem Eintrag; Historie `GET /api/import/batches`, Rückgängig `DELETE /api/import/batches/:id` (≤ 5 Tage, kein gesperrter Zeitraum); Tabelle „Import-Historie“ mit „Rückgängig machen“.
- Importendpunkte sind auf Admins und Superadmins beschränkt.

**Noch offen aus Phase 1** (bewusst verschoben): mandantenbezogenes Speichern von Schemas (`POST /api/import/schemas`, `GET /api/import/schemas`, `GET /api/import/schemas/:id/download`) – benötigt eine neue Tabelle mit Migration und wird zusammen mit der Schema-Verwaltung in Phase 2 umgesetzt; Audit-Eintrag „IMPORT“ pro Batch und SHA-256 der Datei (Phase 4); serverseitiges Parsen auch der CSV-Datei in der bestehenden Oberfläche (die Oberfläche schickt weiterhin Zeilen, der Server prüft sie über das Clockify-Schema).

---

### 12. Entscheidungen

Die offenen Fragen wurden am 13.11.2026 wie folgt entschieden:

1. **Import-Schema / Musterdatei:** Ja. Pro Quelle und bei Bedarf pro Mandant gibt es eine Schema-Datei, die per Musterdatei abgeleitet, als Datei hochgeladen oder aus einer Vorlage erstellt wird (siehe 3.4).
2. **Mitarbeitende beim Import anlegen:** Nur **Superadmins** dürfen Mitarbeitende importieren bzw. anlegen – mit Status `INVITED` und ohne Platzhalter-E-Mail. **Admins** dürfen Mitarbeitende nur zuordnen (siehe 4).
3. **Freigabestatus:** Importierte Projektzeiten erhalten den Status **„zur Freigabe“** (siehe 7).
4. **Abwesenheiten aus dem HR-System:** gehören zum Umfang und werden **in eine frühere Phase vorgezogen** (Phase 2, siehe 10).
5. **Rückgängig machen:** nur **innerhalb von 5 Tagen** nach dem Import und nur, wenn der Zeitraum **nicht gesperrt** ist (siehe 7).

Weiterhin offen: welche weiteren Quellen außer Clockify konkret gebraucht werden und in welcher Reihenfolge (Phase 5).

# Konzept: Allgemeiner Datenimport aus unterschiedlichen Quellen

Stand: 13.11.2026 · Status: Entwurf zur Abstimmung · Bereich: Menüpunkt „Import & Export“

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
  userRef: string;              // Name oder E-Mail aus der Quelle
  clientRef?: string;
  projectRef?: string;
  taskRef?: string;
  date: string;                 // ISO YYYY-MM-DD, Pflichtfeld
  startTime?: string;           // HH:mm
  endTime?: string;             // HH:mm
  durationMinutes?: number;     // Pflichtfeld, wenn keine Start-/Endzeit vorhanden ist
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

**Zuordnungsprofile:** Für den allgemeinen CSV/Excel-Import wird eine einmal erstellte Spaltenzuordnung pro Mandant unter einem Namen gespeichert, z. B. „DATEV-Export Kunde X“. Beim nächsten Import wird das Profil automatisch erkannt, sobald die Spaltenköpfe übereinstimmen. Neue Quellen lassen sich so ganz **ohne Code** anbinden.

---

### 4. Stammdaten-Zuordnung (Mitarbeitende, Kunden, Projekte, Aufgaben)

- **Mitarbeitende werden standardmäßig nie automatisch angelegt.** Jeder Name aus der Quelle wird einem vorhandenen Benutzer zugeordnet. Die Zuordnung wird zuerst über die E-Mail versucht, dann über den exakten Namen; unklare Fälle bleiben leer und müssen von Hand zugeordnet werden. Optional „überspringen“ oder (nur Superadmin) „neu anlegen“, dann mit Status `INVITED` und ohne Platzhalter-Adresse.
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
- **Freigabestatus wählbar:** importierte Projektzeiten gehen entweder als „freigegeben“ (Altdaten-Migration) oder „zur Freigabe“ in den bestehenden Freigabe-Workflow. Standard: zur Freigabe.
- **Rückgängig machen:** Ein Batch lässt sich stornieren, solange der Zeitraum nicht gesperrt ist. Die Einträge werden dann über die normalen Lösch-/Storno-Funktionen entfernt, damit Audit-Log und Hash-Kette vollständig bleiben. Gesperrte Zeiträume werden nie verändert.
- **Periodensperren** werden schon im Probelauf geprüft (siehe 5).

---

### 8. Oberfläche

Der Menüpunkt heißt **„Import & Export“** (umgesetzt, siehe 11). Im Import-Bereich gibt es einen einheitlichen **Assistenten** statt der Tabs „CSV-Import“ und „PDF-Import“:

1. **Quelle wählen:** Kacheln „Clockify (CSV)“, „Clockify (PDF-Report)“, „Allgemeine CSV/Excel-Datei“, gespeicherte Profile, später weitere Tools. Dazu das Importziel: Projektzeiten, Arbeitszeit, Abwesenheiten oder nur Stammdaten.
2. **Datei hochladen**, per Drag & Drop. Die Dateitypen richten sich nach der Quelle.
3. **Spalten zuordnen.** Bei bekannten Quellen ist alles vorausgefüllt, und der Schritt kann eingeklappt bleiben. Beim allgemeinen Import werden die kanonischen Felder links und eine Spaltenauswahl mit Beispielwerten rechts angezeigt. Dazu kommt die Option „als Profil speichern“.
4. **Stammdaten zuordnen:** Mitarbeitende, Kunden und Projekte, vorausgefüllt aus Aliasen und der automatischen Zuordnung.
5. **Vorschau und Prüfung:** Tabelle mit Status-Filter (OK / Warnung / Duplikat / Fehler), Summen pro Person und Monat, Optionen (Freigabestatus, Duplikate überspringen).
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
| POST | `/api/import/batches/:id/revert` | Batch rückgängig machen |
| GET/POST/DELETE | `/api/import/profiles` | Zuordnungsprofile verwalten |

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
  pipeline.ts             (Mapping → Validierung → Duplikate → Commit)
  normalizers.ts          (Datum, Zeit, Dauer, Ja/Nein – aus storage.ts herausgelöst)
  registry.ts             (Liste der Adapter)
src/components/import/
  ImportWizard.tsx, SourceStep.tsx, ColumnMappingStep.tsx,
  MasterDataMappingStep.tsx, PreviewStep.tsx, ImportHistory.tsx
```

**Datenbank:** neue Tabellen `import_batches`, `import_profiles`, `import_aliases`, im gleichen Muster wie bisher (`seq` + `data JSONB`). An `TimeEntry`/`WorkingTimeEntry` kommen die optionalen Felder `importBatchId`, `sourceRef` und `fingerprint` hinzu. Eine Migration ist nur für die neuen Tabellen nötig, bestehende Einträge bleiben unverändert.

---

### 10. Umsetzung in Phasen

Aufwand als grobe Größenordnung: S = bis 1 Tag, M = 2–4 Tage, L = 1–2 Wochen.

| Phase | Inhalt | Aufwand |
|---|---|---|
| **0 – Sofort** (erledigt) | Menüpunkt „Import & Export“, allgemeine Texte im CSV-Bereich (DE/EN) | S |
| **1 – Fundament** | Kanonisches Format, Normalisierer, Pipeline mit Probelauf, einheitliche Duplikatlogik, **stille Ersatzwerte entfernen**; Clockify-CSV und -PDF als Adapter; alte Endpunkte umleiten; Tests | M |
| **2 – Assistent** | Neue Oberfläche Schritte 1–6, Stammdaten-Zuordnung mit Aliasen, Freigabestatus wählbar | M–L |
| **3 – Allgemeiner Import** | Adapter für CSV/Excel mit freier Spaltenzuordnung und Profilen | M |
| **4 – Nachvollziehbarkeit** | Import-Batches, Historie, Rückgängig, Audit-Eintrag | M |
| **5 – Weitere Quellen** | Toggl, Harvest, Tempo, HR-Abwesenheiten, je nach Bedarf | je S–M |

Jede Phase wird gemäß Arbeitsweise auf dem Branch `test` entwickelt, nach GitHub gepusht und automatisch auf die Testumgebung deployt.

---

### 11. Bereits umgesetzt (Phase 0)

- Menüpunkt **„Clockify-Import & Export“ → „Import & Export“** (DE und EN, Desktop-Sidebar und mobile Navigation).
- Seitentitel „Datenimport & Export“ / „Data Import & Export“, Untertitel nicht mehr nur Clockify.
- CSV-Bereich: „CSV-Datei importieren“, „Beispieldaten laden“, Hinweis auf erkannte deutsche und englische Spalten („kompatibel mit Clockify-Exporten“).
- Der PDF-Import bleibt ausdrücklich als „Clockify Detailed Report“ beschriftet, weil der Parser nur dieses Format versteht.

---

### 12. Offene Fragen zur Entscheidung

1. **Welche Quellen** außer Clockify werden konkret gebraucht, und in welcher Reihenfolge? Davon hängt Phase 5 ab.
2. Sollen **Mitarbeitende beim Import angelegt** werden dürfen (nur Superadmin), oder ist das immer ein separater Schritt vorab?
3. **Standard-Freigabestatus** importierter Projektzeiten: „zur Freigabe“ (empfohlen) oder „freigegeben“ wie heute?
4. Sollen auch **Abwesenheiten aus einem HR-System** importiert werden? Dann bekommt das Ziel „Abwesenheiten“ eine eigene Zuordnung.
5. **Rückgängig machen:** zeitlich begrenzen (z. B. 7 Tage nach Import) oder unbegrenzt, solange der Zeitraum nicht gesperrt ist?

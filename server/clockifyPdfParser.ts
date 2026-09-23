// Clockify "Detailed Report" PDF Parser
// Parst den von pdf-parse extrahierten Rohtext eines Clockify Detailed Report PDFs.
//
// pdf-parse gibt die Tabellenzellen zeilenweise (ohne Spaltenausrichtung) aus.
// Ein Eintrag besteht typischerweise aus dieser Zeilenfolge:
//   DD.MM.YYYY<Beschreibung>        (Datum direkt gefolgt von der Beschreibung)
//   Projekt - Task
//   HH:MM:SS                        (Gesamtdauer)
//   HH:MM:SS - HH:MM:SS             (Start - Ende)
//   Vorname Nachname                (User)
//   [0,00 EURO]                     (optional, nur bei abrechenbaren Einträgen)

export interface ClockifyPdfEntry {
  date: string;        // YYYY-MM-DD
  description: string; // z.B. "Admin", "Report adjustments"
  duration: string;    // HH:MM:SS
  userName: string;    // z.B. "Danielle Jeffery"
  projectTask: string; // z.B. "Internal - Administrative Work"
  startTime: string;   // HH:MM (aus Detailzeile)
  endTime: string;     // HH:MM (aus Detailzeile)
  isBillable: boolean;
}

// Datum am Zeilenanfang, Rest = Beschreibung (kann leer sein)
const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})(.*)$/;
// Zeitraum: HH:MM:SS - HH:MM:SS
const RANGE_RE = /^(\d{2}):(\d{2}):\d{2}\s*-\s*(\d{2}):(\d{2}):\d{2}$/;
// Reine Dauer: HH:MM:SS (Stunden auch >99 möglich)
const DURATION_RE = /^\d{1,4}:\d{2}:\d{2}$/;
// Kopf-/Fußzeilen bzw. Zeitraum-Kopf einer Seite
const RANGE_HEADER_RE = /^\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}$/;

function isSkippableLine(line: string): boolean {
  if (!line) return true;
  if (line.includes('Created with Clockify')) return true;
  if (line.includes('Detailed report')) return true;
  if (line.startsWith('Total:')) return true;
  if (line.startsWith('Billable:')) return true;
  if (line.startsWith('Amount:')) return true;
  if (/^\d+$/.test(line)) return true;                 // reine Seitenzahl
  if (RANGE_HEADER_RE.test(line)) return true;         // Zeitraum-Kopf (01.01.2026 - 31.12.2026)
  if (/^Date\s*Description/i.test(line)) return true;  // Tabellenkopf (auch "DateDescriptionDurationUser")
  if (line.replace(/[\s.]/g, '') === '') return true;
  return false;
}

export function parseClockifyPdfText(text: string): ClockifyPdfEntry[] {
  const rawLines = text.split('\n');
  const entries: ClockifyPdfEntry[] = [];

  let cur: ClockifyPdfEntry | null = null;

  const flush = () => {
    if (cur && cur.date && cur.userName) {
      entries.push(cur);
    }
  };

  for (const raw of rawLines) {
    // Soft-Hyphen (U+00AD) und geschützte Leerzeichen entfernen, dann trimmen
    const line = raw.replace(/[\u00AD\u00A0]/g, '').trim();
    if (isSkippableLine(line)) continue;

    const dm = line.match(DATE_RE);
    if (dm && !RANGE_HEADER_RE.test(line)) {
      // Neuer Eintrag beginnt
      flush();
      const [, day, month, year, rest] = dm;
      cur = {
        date: `${year}-${month}-${day}`,
        description: (rest || '').trim(),
        duration: '',
        userName: '',
        projectTask: '',
        startTime: '',
        endTime: '',
        isBillable: false
      };
      continue;
    }

    if (!cur) continue;

    const rng = line.match(RANGE_RE);
    if (rng) {
      cur.startTime = `${rng[1]}:${rng[2]}`;
      cur.endTime = `${rng[3]}:${rng[4]}`;
      continue;
    }

    if (DURATION_RE.test(line)) {
      cur.duration = line;
      continue;
    }

    if (/EURO/.test(line)) {
      // Abrechenbar, wenn ein Betrag > 0,00 vorhanden ist
      cur.isBillable = !/(^|\D)0[.,]00(\D|$)/.test(line);
      continue;
    }

    // Verbleibende Textzeile: Projekt-Task (vor dem Zeitraum) oder User-Name (nach dem Zeitraum)
    if (!cur.projectTask && !cur.startTime) {
      cur.projectTask = line;
    } else if (cur.startTime && !cur.userName) {
      cur.userName = line;
    } else if (!cur.projectTask) {
      cur.projectTask = line;
    } else if (!cur.userName) {
      cur.userName = line;
    }
  }

  flush();

  return entries.filter(e => e.date && e.userName);
}

// Mappt eine Clockify Projekt-/Task-Bezeichnung auf einen App-DayType.
export function mapDayType(projectTask: string): string {
  const pt = (projectTask || '').toLowerCase();
  if (pt.includes('parental') || pt.includes('elternzeit')) return 'PARENTAL_LEAVE';
  if (pt.includes('bank holiday') || pt.includes('feiertag')) return 'SPECIAL_LEAVE';
  if (pt.includes('holiday') || pt.includes('urlaub') || pt.includes('vacation')) return 'VACATION';
  if (pt.includes('sick') || pt.includes('krank')) return 'SICK';
  return 'REGULAR';
}

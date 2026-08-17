export interface GermanState {
  code: string;
  name: string;
  shortName: string;
  extraHolidaysDescription: string;
}

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  name: string;
  isNationwide: boolean;
  applicableStates: string[]; // ['DE-BE', 'DE-BY', ...]
}

export const GERMAN_STATES: GermanState[] = [
  { code: 'DE-BE', name: 'Berlin', shortName: 'Berlin', extraHolidaysDescription: 'Internationaler Frauentag (8. März)' },
  { code: 'DE-BY', name: 'Bayern', shortName: 'Bayern', extraHolidaysDescription: 'Hl. Drei Könige (6. Jan), Fronleichnam, Mariä Himmelfahrt (15. Aug), Allerheiligen (1. Nov)' },
  { code: 'DE-BW', name: 'Baden-Württemberg', shortName: 'Baden-Württ.', extraHolidaysDescription: 'Hl. Drei Könige (6. Jan), Fronleichnam, Allerheiligen (1. Nov)' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen', shortName: 'NRW', extraHolidaysDescription: 'Fronleichnam, Allerheiligen (1. Nov)' },
  { code: 'DE-HE', name: 'Hessen', shortName: 'Hessen', extraHolidaysDescription: 'Fronleichnam' },
  { code: 'DE-HH', name: 'Hamburg', shortName: 'Hamburg', extraHolidaysDescription: 'Reformationstag (31. Okt)' },
  { code: 'DE-HB', name: 'Bremen', shortName: 'Bremen', extraHolidaysDescription: 'Reformationstag (31. Okt)' },
  { code: 'DE-NI', name: 'Niedersachsen', shortName: 'Niedersachsen', extraHolidaysDescription: 'Reformationstag (31. Okt)' },
  { code: 'DE-SH', name: 'Schleswig-Holstein', shortName: 'Schleswig-Holst.', extraHolidaysDescription: 'Reformationstag (31. Okt)' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz', shortName: 'Rheinland-Pfalz', extraHolidaysDescription: 'Fronleichnam, Allerheiligen (1. Nov)' },
  { code: 'DE-SL', name: 'Saarland', shortName: 'Saarland', extraHolidaysDescription: 'Fronleichnam, Mariä Himmelfahrt (15. Aug), Allerheiligen (1. Nov)' },
  { code: 'DE-SN', name: 'Sachsen', shortName: 'Sachsen', extraHolidaysDescription: 'Reformationstag (31. Okt), Buß- und Bettag' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt', shortName: 'Sachsen-Anhalt', extraHolidaysDescription: 'Hl. Drei Könige (6. Jan), Reformationstag (31. Okt)' },
  { code: 'DE-TH', name: 'Thüringen', shortName: 'Thüringen', extraHolidaysDescription: 'Weltkindertag (20. Sep), Reformationstag (31. Okt)' },
  { code: 'DE-BB', name: 'Brandenburg', shortName: 'Brandenburg', extraHolidaysDescription: 'Ostersonntag, Pfingstsonntag, Reformationstag (31. Okt)' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern', shortName: 'Meckl.-Vorpomm.', extraHolidaysDescription: 'Internationaler Frauentag (8. März), Reformationstag (31. Okt)' }
];

export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getGermanHolidays(year: number, stateCode: string = 'DE-BE'): HolidayInfo[] {
  const easter = getEasterSunday(year);
  const allStates = GERMAN_STATES.map(s => s.code);

  const holidays: HolidayInfo[] = [
    { date: `${year}-01-01`, name: 'Neujahr', isNationwide: true, applicableStates: allStates },
    { date: formatDate(addDays(easter, -2)), name: 'Karfreitag', isNationwide: true, applicableStates: allStates },
    { date: formatDate(addDays(easter, 1)), name: 'Ostermontag', isNationwide: true, applicableStates: allStates },
    { date: `${year}-05-01`, name: 'Tag der Arbeit', isNationwide: true, applicableStates: allStates },
    { date: formatDate(addDays(easter, 39)), name: 'Christi Himmelfahrt', isNationwide: true, applicableStates: allStates },
    { date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag', isNationwide: true, applicableStates: allStates },
    { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit', isNationwide: true, applicableStates: allStates },
    { date: `${year}-12-25`, name: '1. Weihnachtstag', isNationwide: true, applicableStates: allStates },
    { date: `${year}-12-26`, name: '2. Weihnachtstag', isNationwide: true, applicableStates: allStates },

    // Länderspezifische Feiertage
    { date: `${year}-01-06`, name: 'Heilige Drei Könige', isNationwide: false, applicableStates: ['DE-BW', 'DE-BY', 'DE-ST'] },
    // Berlin + MV: Internationaler Frauentag
    { date: `${year}-03-08`, name: 'Internationaler Frauentag', isNationwide: false, applicableStates: ['DE-BE', 'DE-MV'] },
    { date: formatDate(addDays(easter, 60)), name: 'Fronleichnam', isNationwide: false, applicableStates: ['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'] },
    { date: `${year}-08-15`, name: 'Mariä Himmelfahrt', isNationwide: false, applicableStates: ['DE-SL', 'DE-BY'] },
    { date: `${year}-09-20`, name: 'Weltkindertag', isNationwide: false, applicableStates: ['DE-TH'] },
    { date: `${year}-10-31`, name: 'Reformationstag', isNationwide: false, applicableStates: ['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'] },
    { date: `${year}-11-01`, name: 'Allerheiligen', isNationwide: false, applicableStates: ['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'] },
  ];

  const nov23 = new Date(Date.UTC(year, 10, 23));
  const dayOfWeek = nov23.getUTCDay();
  const diffDays = (dayOfWeek + 4) % 7 || 7;
  const bussUndBettag = addDays(nov23, -diffDays);
  holidays.push({
    date: formatDate(bussUndBettag),
    name: 'Buß- und Bettag',
    isNationwide: false,
    applicableStates: ['DE-SN']
  });

  return holidays
    .filter(h => h.applicableStates.includes(stateCode))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getWorkingDaysInRange(
  startDate: string,
  endDate: string,
  stateCode: string = 'DE-BE',
  workDays: number[] = [1, 2, 3, 4, 5]
): {
  totalWorkdays: number;
  holidaysInRange: HolidayInfo[];
  workdayDates: string[];
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = new Set<number>();
  
  let curr = new Date(start.getTime());
  while (curr <= end) {
    years.add(curr.getUTCFullYear());
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  const allHolidays: HolidayInfo[] = [];
  years.forEach(y => {
    allHolidays.push(...getGermanHolidays(y, stateCode));
  });

  const holidayMap = new Map<string, HolidayInfo>();
  allHolidays.forEach(h => {
    if (h.date >= startDate && h.date <= endDate) {
      holidayMap.set(h.date, h);
    }
  });

  let totalWorkdays = 0;
  const workdayDates: string[] = [];
  curr = new Date(start.getTime());

  while (curr <= end) {
    const dateStr = formatDate(curr);
    const dayOfWeek = curr.getUTCDay() === 0 ? 7 : curr.getUTCDay();
    const isWorkingDayPattern = workDays.includes(dayOfWeek);
    const isHoliday = holidayMap.has(dateStr);

    if (isWorkingDayPattern && !isHoliday) {
      totalWorkdays++;
      workdayDates.push(dateStr);
    }

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return {
    totalWorkdays,
    holidaysInRange: Array.from(holidayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    workdayDates
  };
}

/**
 * Resolves the applicable Bundesland code for holiday calculations according to tenant rules:
 * - Free/External workers (`employmentType: 'EXTERNAL'`): ALWAYS uses the tenant's primary location.
 * - Fixed/Internal employees (`employmentType: 'INTERNAL'`):
 *   - If tenant offers mobile workplaces (`allowMobileWorkplaces === true`) and employee has an individual state configured, uses employee's state.
 *   - Otherwise uses the tenant's primary location.
 */
export function resolveUserHolidayState(
  user?: { employmentType?: string; stateLocation?: string; holidayCalendar?: string } | null,
  organization?: { stateLocation?: string; allowMobileWorkplaces?: boolean } | null
): string {
  const defaultOrgState = organization?.stateLocation || 'DE-BE';
  if (!user) return defaultOrgState;

  // External / Freelance workers ALWAYS adhere strictly to the tenant's primary location
  if (user.employmentType === 'EXTERNAL') {
    return defaultOrgState;
  }

  // Internal employees: only if tenant has mobile workplaces activated and user has a configured state
  if (organization?.allowMobileWorkplaces) {
    const userState = user.stateLocation || user.holidayCalendar;
    if (userState && GERMAN_STATES.some(s => s.code === userState)) {
      return userState;
    }
  }

  return defaultOrgState;
}


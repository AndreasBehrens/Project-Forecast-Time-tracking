# User Guide – Time Tracking

> 🇩🇪 Deutsche Version: [ANLEITUNG.md](./ANLEITUNG.md)

**Access link:** 👉 **https://timetracking.insightarcs.com**

This guide explains the **"Time Tracking"** page. It is the single place where you record **all** your time:

- **Project time:** what you worked on, for which client and project
- **Working time without a project:** e.g. internal tasks, meetings, administration
- **Absences:** vacation, sick leave, special leave and parental leave

Earlier versions had two separate tabs ("Project Time" and "Working Hours"). Both are now combined into **one form and one list**.

> ℹ️ What you see depends on your role. The differences are explained in the section [Who sees what?](#who-sees-what).

---

## What is the solution designed for?

Insight Arcs Time Tracking is a web-based solution that lets teams record their working hours in a way that is **legally compliant and project-accurate**:

- **Project-based time tracking:** How much time was spent on which project and task. This is the basis for reporting, invoicing (billable / non-billable) and project forecasts.
- **Working time recording under the German Working Hours Act (ArbZG):** documents your daily working time, including absences, even when you are not booking on a project.

All data is stored **GDPR-compliant in Germany** and archived in an **audit-proof, GoBD-compliant** manner (10-year retention, tamper-evident verification chain). The interface is bilingual (German / English), and the language you choose is saved per user.

---

## Login & Navigation

1. Open **https://timetracking.insightarcs.com** in your browser.
2. Log in with your credentials.
3. Click **"Time Tracking"** in the sidebar (desktop) or the bottom navigation bar (mobile).
4. Switch the **language** (German/English) at the top right of the header. The setting is saved, and every label on the page, including the period picker, switches with it.

The page has three areas, from top to bottom:

1. **Summary cards**: target hours, actual hours, difference
2. **Entry form**: "New entry" or "Edit entry"
3. **Filter bar and entry list**

---

## 1. Summary cards (Target / Actual / Difference)

> Visible to **internal employees**, **project managers**, **admins** and **superadmins**. External users do not see these cards.

| Card | Meaning |
|---|---|
| **Target hours** | Contracted hours for the selected period (working days × daily hours, without weekends and public holidays) |
| **Actual hours** | Project time + working time without a project + credited absences |
| **Difference** | Actual − Target. Green = surplus, red = shortfall |

- The cards always refer to the **period chosen in the filter bar** (e.g. "This month", "Last week" or a custom range). The period is shown below the target value.
- With **"All entries"**, the period runs from your first entry until today (or until your last future entry).
- Project managers and admins who select an employee in the filter bar see that **employee's** figures.
- **Parental leave** reduces the target hours (the day counts as neither target nor actual).
- **Vacation, sick leave and special leave** on a working day are credited with your contracted daily hours. Absences entered on weekends or public holidays are **not** credited.
- **Older data:** some days from before the merge contain both a working-time "frame" (e.g. 09:00–17:00) and project times within that frame. The overlapping hours are **counted only once**.

---

## 2. Recording time – the entry form

### Fields at a glance

| Field | Description | Who sees it |
|---|---|---|
| **Date** | Booking date | Everyone |
| **Type** | Regular working day, Vacation, Sick, Special leave, Parental leave | Internal employees only |
| **Project** | Project (client shown in brackets). 🔒 = only for assigned team members | Everyone. **Required for externals**, optional for internals ("— No project —") |
| **Entry mode** | **Stopwatch** or **Time range** | For regular working days |
| **Task** | What you worked on. Suggestions come from your own earlier entries in the same project | Everyone. For absences this field becomes **"Note (optional)"** |
| **Billable** | Whether the time is billed to the client. The default comes from the project | Only when a project is selected |

### a) Stopwatch ⏱️ (for ongoing work)

1. Choose the **date** (normally today), the **project** (optional for internal employees) and enter the **task**.
2. Select the entry mode **"Stopwatch"**.
3. Click **"Start"**. The running time is shown next to the buttons.
4. Use **"Pause"** and **"Resume"** for interruptions. Paused time is not counted.
5. Click **"Stop & save"**. The entry is booked with its start and end time.

> - The stopwatch keeps running if you reload the page or switch to another menu item.
> - A stopwatch that runs past midnight is booked on the **day it was started**.
> - While the stopwatch runs, project, task and date are locked.

### b) Time range 🕘 (for adding or correcting times)

1. Choose the **date**, the **project** (optional for internal employees) and enter the **task**.
2. Select the entry mode **"Time range"**.
3. Enter **From**, **To** and, if needed, **Break (min)**.
4. The field **"Total"** shows the live result: **(End − Start) − Break**. It must be greater than 0.
5. Click **"Save entry"**.

> If **To** is earlier than **From** (e.g. 22:00–02:00), the entry is treated as running past midnight.

### c) Absences 🌴 (internal employees only)

1. Choose the **date**.
2. Choose the **type**: **Vacation**, **Sick**, **Special leave** or **Parental leave**.
3. **Full day** is ticked by default. The day is credited with your **contracted daily hours** (shown below the checkbox).
4. For a partial absence (e.g. a doctor's appointment), untick **"Full day"** and enter **From** and **To**. Only the absence itself is entered here. Record the hours you worked that day as a separate regular entry.
5. Optional: add a **note**.
6. Click **"Save entry"**.

### Favorites ⭐

If you have marked project entries as favorites, they appear above the form as buttons. One click fills in project, task and billable status.

### How far into the future can I book?

| Type | Future limit |
|---|---|
| **Vacation**, **Parental leave** | No limit (can be planned any time in advance) |
| Everything else (project time, regular working day, sick, special leave) | Up to the **end of next month** |

The date picker already blocks later dates, and the server rejects them as well. Past dates can be entered at any time, unless the month has been **closed and locked** (GoBD month-end closing).

---

## 3. The entry list

### Filter bar

| Filter | Description | Who sees it |
|---|---|---|
| **Period** | Presets (Today, Yesterday, This week, Last week, Last two weeks, This month, Last month, This quarter, This year, Last year, All entries) or a custom range via the calendar. Default: **This month** | Everyone |
| **Employee** | All employees or one specific employee | Project managers, admins, superadmins |
| **Type** | All types, Regular working day or one absence type | Internal employees and privileged roles |
| **Client** / **Project** | Restrict to a client or project | Everyone |
| **Search** | Free text across task, project and client | Everyone |

The summary cards follow the period (and, for privileged roles, the employee) chosen here.

### List

- Entries are **grouped by date** (newest day first) with a **daily total**. Within a day they are **sorted by start time**.
- Each row shows the project and client (or **"No project"**), the task or note, the time span (or **"full day"**), the duration, **Billable / Not billable**, and the approval status where relevant.
- Absence badges: **Vacation** (yellow), **Sick** (red), **Special leave** (blue), **Parental leave** (purple). A regular working day without a project shows a grey **"Regular working day"** badge.
- **✏️ Edit** loads the entry into the form at the top. Change it and click **"Save changes"**, or click **"Cancel"**. You can switch between project time, working time without a project and absence while editing.
- **🗑 Delete** asks for confirmation first.
- **Export CSV** downloads exactly the entries currently shown (respecting all filters).

> Entries in a **locked month** cannot be changed or deleted. An error message explains why. All corrections are recorded in the GoBD audit log.

### Approval workflow (if enabled for a project)

If a project requires approval, your entries first receive the status **Draft** or **Submitted** and become **Approved** once reviewed. Admins can approve directly in the list using the ✔ button. Without an approval requirement, entries are booked as approved straight away.

---

## Who sees what?

| | **Employee (internal)** | **Employee (external)** | **Project manager** | **Admin / Superadmin** |
|---|---|---|---|---|
| Summary cards | ✅ own | ❌ | ✅ own / selected employee | ✅ own / selected employee |
| Field "Type" (absences) | ✅ | ❌ | ✅ | ✅ |
| Project | optional | **required** | optional | optional |
| "Log for colleague" | ❌ | ❌ | ✅ | ✅ |
| "Employee" filter | ❌ (own entries only) | ❌ (own entries only) | ✅ | ✅ |
| Edit / delete | own entries | own entries | all visible entries | all visible entries |
| Approve in the list | ❌ | ❌ | ❌ | ✅ |

### Logging time for a colleague (project managers, admins, superadmins)

1. In the form header, choose the colleague under **"Log for colleague"**. Your own name is marked **"(Me)"**.
2. The form adapts to the colleague's employment type. For an **external** colleague, the **project is required** and absences are not available (a notice is shown).
3. Fill in the entry as usual and save. The entry belongs to the colleague, not to you.

> The server checks this as well. Employees without one of these roles cannot book time for others.

---

## Frequently Asked Questions

- **Do I have to set the language at every login?** No. Your last choice is saved in your profile.
- **I forgot to start the stopwatch. What now?** Use **"Time range"** and enter From/To afterwards.
- **Are breaks deducted?** Yes. In time-range mode, the break is deducted from the total, both when you create and when you edit an entry.
- **Do I still need to record a separate working day in addition to my project times?** No. Project times already count as actual hours. Only record time **without a project** for work that is not linked to a project.
- **Why is a sick day on a Saturday not credited?** Absences are credited only on your contracted working days.
- **Why can't I enter a regular working day in two months' time?** Apart from vacation and parental leave, bookings are possible up to the end of next month.

---

*Insight Arcs – Time Tracking & Project Forecast · GDPR-compliant (hosting in Germany) · GoBD & ArbZG compliant*

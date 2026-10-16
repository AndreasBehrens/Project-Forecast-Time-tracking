**User Guide – Time Tracking**

*Employee Quick Guide*

**Access link: https://timetracking.insightarcs.com**

*Deutsche Version: ANLEITUNG.md · Full reference: USER_GUIDE.md*

This quick guide explains the "Time Tracking" page. It is the single place where you record all your time:

**• Project time** – what you worked on, for which client and project

**• Working time without a project** – e.g. internal tasks, meetings, administration

**• Absences** – vacation, sick leave, special leave, parental leave

|  |
| --- |
| **Note:** The former tabs "Project Time" and "Working Hours" are now combined into one form and one list. What you see depends on your role (see "Who sees what?"). |

# **What is the solution designed for?**

Insight Arcs Time Tracking lets teams record their working hours in a way that is legally compliant and project-accurate:

**• Project-based time tracking:** time per project and task – the basis for reporting, invoicing (billable / non-billable) and forecasts.

**• Working time under the German Working Hours Act (ArbZG):** your daily working time incl. absences, even without a project.

All data is stored GDPR-compliant in Germany and archived GoBD-compliant (10-year retention, tamper-evident verification chain). The interface is bilingual (German / English); your language is saved per user.

# **Login & Navigation**

**1.** Open https://timetracking.insightarcs.com in your browser and log in.

**2.** Click "Time Tracking" in the sidebar (desktop) or the bottom navigation bar (mobile).

**3.** Switch the language (German/English) at the top right of the header. The setting is saved.

**4.** Check your time zone once: click your name at the top right → "Time zone" (see section 4).

The page has three areas: **summary cards** (target / actual / difference), the **entry form**, and the **filter bar with the entry list**.

# **1. Summary cards**

*Visible to internal employees, project managers, admins and superadmins – not to external users.*

|  |  |
| --- | --- |
| **Card** | **Meaning** |
| **Target hours** | Working days × daily hours in the selected period (no weekends / public holidays) |
| **Actual hours** | Project time + working time without a project + credited absences |
| **Difference** | Actual − Target (green = surplus, red = shortfall) |

**•** The cards follow the period chosen in the filter bar (default: "This month").

**•** Vacation, sick leave and special leave on a working day are credited with your daily hours. Parental leave reduces the target.

**•** Older data with a working-time "frame" plus project times inside it is counted only once.

# **2. Recording time**

## **a) Stopwatch (for ongoing work)**

**1.** Choose the date, the project (optional for internal employees) and enter the task.

**2.** Select the entry mode "Stopwatch" and click "Start".

**3.** Use "Pause" / "Resume" for interruptions – paused time is not counted.

**4.** Click "Stop & save" – the entry is booked with start and end time.

|  |
| --- |
| **Note:** The stopwatch keeps running after a reload. If it runs past midnight, the entry is booked on the day it was started. |

## **b) Time range (for adding or correcting times)**

**1.** Choose the date, the project (optional for internal employees) and enter the task.

**2.** Select the entry mode "Time range".

**3.** Enter From, To and, if needed, Break (min). "Total" shows (End − Start) − Break live.

**4.** Click "Save entry".

|  |
| --- |
| **Note:** If To is earlier than From (e.g. 22:00–02:00), the entry runs past midnight. |

## **c) Absences (internal employees only)**

**1.** Choose the date and the type: Vacation, Sick, Special leave or Parental leave.

**2.** "Full day" is ticked by default and credits your daily hours. For a partial absence, untick it and enter From / To.

**3.** Optionally add a note and click "Save entry".

## **Billable and favorites**

**•** "Billable" appears when a project is selected; the default comes from the project.

**•** Favorites appear as buttons above the form – one click fills in project, task and billable status.

## **How far into the future can I book?**

**•** Vacation and parental leave: no limit.

**•** Everything else: up to the end of next month. Past dates are always possible unless the month is locked (GoBD month-end closing).

# **3. The entry list**

**•** Filter by period, employee (privileged roles), type, client, project or free text.

**•** Entries are grouped by day (newest first) with a daily total and sorted by start time.

**•** ✏️ Edit loads the entry into the form; 🗑 Delete asks for confirmation.

**•** "Export CSV" downloads exactly the entries currently shown.

**•** Approval (if enabled for a project): Draft → Submitted → Approved. Without approval, entries are approved straight away.

|  |
| --- |
| **Note:** Entries in a locked month cannot be changed or deleted. All corrections are logged in the GoBD audit log. |

# **4. Time zone (for colleagues abroad)**

"Today" is determined by your local time zone, not German time.

**1.** Click your name at the top right of the header.

**2.** Under "Time zone", keep "Automatic (device: …)" or choose a zone, e.g. America/Sao\_Paulo. It is saved immediately.

**•** It sets the default date, the period presets, the stopwatch times and the future limit.

**•** Times are saved as entered (local clock time) and are not converted.

|  |
| --- |
| **Note:** When a project manager or admin books for a colleague, the colleague's time zone applies. Without a setting, the device time zone is used (fallback: Europe/Berlin). |

# **Who sees what?**

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
|  | **Internal** | **External** | **Project manager** | **Admin / Superadmin** |
| **Summary cards** | own | – | own / selected | own / selected |
| **Absences** | yes | – | yes | yes |
| **Project** | optional | required | optional | optional |
| **Log for colleague** | – | – | yes | yes |
| **Edit / delete** | own | own | all visible | all visible |
| **Approve in list** | – | – | – | yes |

**Logging for a colleague:** choose the person under "Log for colleague" in the form header. For external colleagues the project is required and absences are not available. The entry belongs to the colleague.

# **Frequently Asked Questions (brief)**

**Q: Do I have to set the language at every login?**

A: No. Your last choice is saved in your profile.

**Q: I forgot to start the stopwatch.**

A: Use "Time range" and enter From/To afterwards.

**Q: Are breaks deducted?**

A: Yes, in time-range mode, when creating and when editing.

**Q: Do I need a separate working day in addition to project times?**

A: No. Project times already count as actual hours.

**Q: I work outside Germany. Could my entries land on the wrong date?**

A: No. "Today" comes from your time zone (profile or device). Check it under "Time zone" in the profile menu.

*Insight Arcs – Time Tracking & Project Forecast · GDPR-compliant (hosting in Germany) · GoBD & ArbZG compliant*

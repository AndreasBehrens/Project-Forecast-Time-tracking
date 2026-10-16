# Anleitung – Zeiterfassung

> 🇬🇧 English version: [USER_GUIDE.md](./USER_GUIDE.md)

**Aufruflink:** 👉 **https://timetracking.insightarcs.com**

Diese Anleitung erklärt die Seite **„Zeiterfassung"** – den einen Ort, an dem du **alle** Zeiten erfasst:

- **Projektzeiten** – woran du für welchen Kunden und welches Projekt gearbeitet hast
- **Arbeitszeit ohne Projekt** – z. B. interne Aufgaben, Besprechungen, Verwaltung
- **Abwesenheiten** – Urlaub, Krankheit, Sonderurlaub, Elternzeit

Die früheren getrennten Tabs „Projektzeiterfassung" und „Allg. Arbeitszeit" sind jetzt in **einem Formular und einer Liste** zusammengeführt.

> ℹ️ Was du siehst, hängt von deiner Rolle ab – siehe Abschnitt [Wer sieht was?](#wer-sieht-was).

---

## Wofür ist die Lösung gedacht?

Insight Arcs Zeiterfassung ist eine webbasierte Lösung, mit der Teams ihre Arbeitszeiten **rechtssicher und projektgenau** erfassen:

- **Projektbezogene Zeiterfassung:** Wie viel Zeit wurde für welches Projekt und welche Aufgabe aufgewendet – die Basis für Auswertung, Abrechnung (abrechenbar / nicht abrechenbar) und Projekt-Forecasts.
- **Arbeitszeiterfassung nach dem Arbeitszeitgesetz (ArbZG):** Dokumentation der täglichen Arbeitszeit inklusive Abwesenheiten – auch wenn du gerade nicht auf einem Projekt buchst.

Alle Daten werden **DSGVO-konform in Deutschland** gespeichert und **GoBD-konform revisionssicher** archiviert (10 Jahre Aufbewahrung, unveränderbare Prüfkette). Die Oberfläche ist zweisprachig (Deutsch / Englisch) – die gewählte Sprache wird pro Nutzer gespeichert.

---

## Anmeldung & Navigation

1. Öffne **https://timetracking.insightarcs.com** im Browser.
2. Melde dich mit deinen Zugangsdaten an.
3. Klicke in der Seitenleiste (Desktop) bzw. der unteren Navigationsleiste (Smartphone) auf **„Zeiterfassung"**.
4. Die **Sprache** (Deutsch/Englisch) stellst du oben rechts im Kopfbereich um – die Einstellung bleibt gespeichert, alle Beschriftungen der Seite (auch der Zeitraum-Auswahl) wechseln mit.

Die Seite besteht von oben nach unten aus:

1. **Kennzahlen** (Soll-Stunden · Ist-Stunden · Differenz)
2. **Eingabeformular** („Neuer Eintrag" bzw. „Eintrag bearbeiten")
3. **Filterleiste und Eintragsliste**

---

## 1. Kennzahlen (Soll / Ist / Differenz)

> Sichtbar für **interne Mitarbeitende**, **Projektleiter**, **Admins** und **Superadmins** – nicht für externe Nutzer.

| Karte | Bedeutung |
|---|---|
| **Soll-Stunden** | Vertragliche Sollzeit im gewählten Zeitraum (Arbeitstage × Tagesarbeitszeit, ohne Wochenenden und Feiertage) |
| **Ist-Stunden** | Projektzeiten + Arbeitszeit ohne Projekt + angerechnete Abwesenheiten |
| **Differenz** | Ist − Soll (grün = Plus, rot = Minus) |

- Die Kennzahlen beziehen sich immer auf den **Zeitraum aus der Filterleiste** (z. B. „Dieser Monat", „Letzte Woche" oder ein eigener Zeitraum). Der Zeitraum steht unter dem Soll-Wert.
- Bei **„Alle Einträge"** gilt der Zeitraum vom ersten Eintrag bis heute (bzw. bis zum letzten Zukunftseintrag).
- Projektleiter und Admins sehen die Werte des **in der Filterleiste gewählten Mitarbeiters**.
- **Elternzeit** reduziert die Sollzeit (der Tag zählt weder als Soll noch als Ist).
- **Urlaub, Krankheit, Sonderurlaub** werden an Arbeitstagen mit der vertraglichen Tagesarbeitszeit angerechnet. An Wochenenden oder Feiertagen eingetragene Abwesenheiten werden **nicht** angerechnet.
- **Altdaten:** An manchen Tagen aus der Zeit vor der Zusammenführung gibt es sowohl eine Arbeitszeit als „Rahmen" (z. B. 09–17 Uhr) als auch Projektzeiten innerhalb dieses Rahmens. Die überlappenden Stunden werden **nur einmal** gezählt.

---

## 2. Zeit erfassen – das Eingabeformular

### Felder im Überblick

| Feld | Beschreibung | Sichtbar für |
|---|---|---|
| **Datum** | Buchungstag | alle |
| **Typ** | Regulärer Arbeitstag, Urlaub, Krank, Sonderurlaub, Elternzeit | nur interne Mitarbeitende |
| **Projekt** | Projekt (Kunde in Klammern); 🔒 = nur für zugewiesene Teammitglieder | alle – **Pflicht für Externe**, optional für Interne („— Ohne Projekt —") |
| **Erfassungsmodus** | **Stoppuhr** oder **Zeitraum** | bei regulärem Arbeitstag |
| **Aufgabe** | Woran du gearbeitet hast. Vorschläge kommen aus deinen eigenen früheren Einträgen im selben Projekt | alle; bei Abwesenheiten wird daraus **„Notiz (optional)"** |
| **Abrechenbar** | Wird dem Kunden berechnet; Vorgabe kommt aus dem Projekt | nur wenn ein Projekt gewählt ist |

### a) Stoppuhr ⏱️ (für laufende Tätigkeiten)

1. **Datum** (i. d. R. heute) wählen, **Projekt** (für Interne optional) wählen und **Aufgabe** eintragen.
2. Erfassungsmodus **„Stoppuhr"** wählen.
3. **„Start"** klicken – die laufende Zeit wird neben den Schaltflächen angezeigt.
4. Bei Unterbrechungen **„Pausieren"** / **„Fortsetzen"** – pausierte Zeit wird nicht gezählt.
5. **„Stopp & speichern"** – der Eintrag wird mit Start- und Endzeit gebucht.

> - Die Stoppuhr läuft weiter, auch wenn du die Seite neu lädst oder einen anderen Menüpunkt öffnest.
> - Läuft die Stoppuhr über Mitternacht, wird der Eintrag dem **Starttag** zugeordnet.
> - Solange die Stoppuhr läuft, sind Projekt, Aufgabe und Datum gesperrt.

### b) Zeitraum 🕘 (zum Nachtragen oder Korrigieren)

1. **Datum**, **Projekt** (für Interne optional) und **Aufgabe** eintragen.
2. Erfassungsmodus **„Zeitraum"** wählen.
3. **Von**, **Bis** und bei Bedarf **Pause (Min.)** eintragen.
4. Das Feld **„Gesamt"** zeigt live **(Ende − Start) − Pause**. Der Wert muss größer als 0 sein.
5. **„Eintrag speichern"** klicken.

> Ist **Bis** früher als **Von** (z. B. 22:00–02:00), wird der Eintrag als über Mitternacht laufend gewertet.

### c) Abwesenheiten 🌴 (nur interne Mitarbeitende)

1. **Datum** wählen.
2. **Typ** wählen: **Urlaub**, **Krank**, **Sonderurlaub** oder **Elternzeit**.
3. **Ganztägig** ist vorausgewählt – der Tag wird mit deiner **vertraglichen Tagesarbeitszeit** angerechnet (Hinweis unter der Checkbox).
4. Für eine teilweise Abwesenheit (z. B. Arzttermin) **„Ganztägig"** abwählen und **Von** / **Bis** der Abwesenheit eintragen. Hier wird nur die Abwesenheit selbst erfasst – die an dem Tag gearbeiteten Stunden trägst du als eigenen regulären Eintrag ein.
5. Optional eine **Notiz** eintragen.
6. **„Eintrag speichern"** klicken.

### Favoriten ⭐

Als Favorit markierte Projektzeiten erscheinen über dem Formular als Schaltflächen. Ein Klick übernimmt Projekt, Aufgabe und Abrechenbarkeit.

### Wie weit in die Zukunft kann ich buchen?

| Typ | Zukunftsgrenze |
|---|---|
| **Urlaub**, **Elternzeit** | unbegrenzt (beliebig weit im Voraus planbar) |
| alles andere (Projektzeit, regulärer Arbeitstag, Krank, Sonderurlaub) | bis zum **Ende des nächsten Monats** |

Die Datumsauswahl sperrt spätere Tage bereits, und der Server lehnt sie zusätzlich ab. Vergangene Tage können jederzeit nachgetragen werden – außer der Monat wurde **abgeschlossen und gesperrt** (GoBD-Monatsabschluss).

---

## 3. Die Eintragsliste

### Filterleiste

| Filter | Beschreibung | Sichtbar für |
|---|---|---|
| **Zeitraum** | Vorgaben (Heute, Gestern, Diese Woche, Letzte Woche, Letzte zwei Wochen, Dieser Monat, Letzter Monat, Dieses Quartal, Dieses Jahr, Letztes Jahr, Alle Einträge) oder eigener Zeitraum über den Kalender. Standard: **Dieser Monat** | alle |
| **Mitarbeiter** | Alle Mitarbeiter oder eine bestimmte Person | Projektleiter, Admins, Superadmins |
| **Typ** | Alle Typen, Regulärer Arbeitstag oder eine Abwesenheitsart | interne Mitarbeitende und berechtigte Rollen |
| **Kunde** / **Projekt** | Auf einen Kunden bzw. ein Projekt einschränken | alle |
| **Suche** | Freitext über Aufgabe, Projekt und Kunde | alle |

Die Kennzahlen oben folgen dem hier gewählten Zeitraum (und bei berechtigten Rollen dem gewählten Mitarbeiter).

### Liste

- Einträge sind **nach Datum gruppiert** (neuester Tag oben) mit **Tagessumme**; innerhalb eines Tages **nach Startzeit sortiert**.
- Jede Zeile zeigt Projekt und Kunde (bzw. **„Ohne Projekt"**), Aufgabe/Notiz, Zeitspanne (oder **„ganztägig"**), Dauer, **Abrechenbar / Nicht abrechenbar** und ggf. den Freigabestatus.
- Kennzeichnung der Abwesenheiten: **Urlaub** (gelb), **Krank** (rot), **Sonderurlaub** (blau), **Elternzeit** (lila); ein regulärer Arbeitstag ohne Projekt trägt ein graues Etikett **„Regulärer Arbeitstag"**.
- **✏️ Bearbeiten** lädt den Eintrag oben ins Formular. Ändern und **„Änderung speichern"** klicken – oder **„Abbrechen"**. Beim Bearbeiten kannst du auch zwischen Projektzeit, Arbeitszeit ohne Projekt und Abwesenheit wechseln.
- **🗑 Löschen** fragt vorher nach.
- **CSV exportieren** lädt genau die aktuell angezeigten Einträge herunter (inkl. aller Filter).

> Einträge in einem **gesperrten Monat** können weder geändert noch gelöscht werden – du erhältst eine Fehlermeldung. Alle Korrekturen werden GoBD-konform im Audit-Log protokolliert.

### Freigabe-Workflow (falls für ein Projekt aktiviert)

Ist für ein Projekt die Freigabepflicht aktiv, erhalten deine Einträge zunächst den Status **Entwurf** bzw. **Eingereicht** und nach Prüfung **Freigegeben**. Admins können direkt in der Liste über das ✔-Symbol freigeben. Ohne Freigabepflicht werden Einträge sofort als freigegeben verbucht.

---

## Wer sieht was?

| | **Mitarbeitende (intern)** | **Mitarbeitende (extern)** | **Projektleiter** | **Admin / Superadmin** |
|---|---|---|---|---|
| Kennzahlen | ✅ eigene | ❌ | ✅ eigene / gewählter Mitarbeiter | ✅ eigene / gewählter Mitarbeiter |
| Feld „Typ" (Abwesenheiten) | ✅ | ❌ | ✅ | ✅ |
| Projekt | optional | **Pflicht** | optional | optional |
| „Für Mitarbeiter erfassen" | ❌ | ❌ | ✅ | ✅ |
| Filter „Mitarbeiter" | ❌ (nur eigene Einträge) | ❌ (nur eigene Einträge) | ✅ | ✅ |
| Bearbeiten / Löschen | eigene Einträge | eigene Einträge | alle sichtbaren Einträge | alle sichtbaren Einträge |
| Freigeben in der Liste | ❌ | ❌ | ❌ | ✅ |

### Für Mitarbeiter erfassen (Projektleiter, Admins, Superadmins)

1. Im Formularkopf unter **„Für Mitarbeiter erfassen"** die Person auswählen (du selbst bist mit **„(Ich)"** markiert).
2. Das Formular passt sich der Beschäftigungsart an: Bei **externen** Mitarbeitenden ist das **Projekt Pflicht** und Abwesenheiten stehen nicht zur Verfügung (ein Hinweis wird angezeigt).
3. Eintrag wie gewohnt ausfüllen und speichern – er wird der gewählten Person zugeordnet, nicht dir.

> Der Server prüft das ebenfalls: Mitarbeitende ohne diese Rollen können keine Zeiten für andere buchen.

---

## Häufige Fragen

- **Muss ich die Sprache bei jedem Login neu einstellen?** Nein, die letzte Auswahl wird in deinem Profil gespeichert.
- **Ich habe vergessen, die Stoppuhr zu starten.** Nutze **„Zeitraum"** und trage Von/Bis nachträglich ein.
- **Werden Pausen abgezogen?** Ja – im Modus Zeitraum wird die Pause von der Gesamtzeit abgezogen, beim Anlegen wie beim Bearbeiten.
- **Muss ich zusätzlich zu Projektzeiten noch einen Arbeitstag erfassen?** Nein. Projektzeiten zählen bereits als Ist-Stunden. Erfasse Zeit **ohne Projekt** nur für Tätigkeiten, die keinem Projekt zugeordnet sind.
- **Warum wird ein Krankheitstag am Samstag nicht angerechnet?** Abwesenheiten werden nur an deinen vertraglichen Arbeitstagen angerechnet.
- **Warum kann ich keinen regulären Arbeitstag in zwei Monaten eintragen?** Außer Urlaub und Elternzeit sind Buchungen nur bis zum Ende des nächsten Monats möglich.

---

*Insight Arcs – Zeiterfassung & Projekt-Forecast · DSGVO-konform (Hosting in Deutschland) · GoBD- & ArbZG-konform*

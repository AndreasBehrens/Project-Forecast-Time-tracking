# Anleitung – Zeiterfassung & Allgemeine Arbeitszeit

> 🇬🇧 English version: [USER_GUIDE.md](./USER_GUIDE.md)

**Aufruflink:** 👉 **https://timetracking.insightarcs.com**

Diese Kurzanleitung richtet sich an **Mitarbeiterinnen und Mitarbeiter**. Sie erklärt die beiden zentralen Funktionen für die tägliche Nutzung:

1. **Zeiterfassung** – projektbezogene Buchung von Arbeitsleistung
2. **Allgemeine Arbeitszeit** – gesetzliche Anwesenheitserfassung (Kommen/Gehen)

> ℹ️ Weitere Funktionen für **Projektleiter** und **Administratoren** folgen in kommenden Releases und werden dann hier ergänzt.

---

## Wofür ist die Lösung gedacht?

Insight Arcs Zeiterfassung ist eine webbasierte Lösung, mit der Teams ihre Arbeitszeiten **rechtssicher und projektgenau** erfassen. Sie verbindet zwei Ebenen:

- **Projektbezogene Zeiterfassung:** Wie viel Zeit wurde für welches Projekt und welche Aufgabe aufgewendet – die Basis für Auswertung, Abrechnung (abrechenbar / nicht abrechenbar) und Projekt-Forecasts.
- **Allgemeine Arbeitszeit (Anwesenheit):** Die gesetzlich vorgeschriebene Dokumentation der täglichen Arbeitszeit nach dem **Arbeitszeitgesetz (ArbZG)** – unabhängig davon, ob man gerade auf einem Projekt bucht.

Alle Daten werden **DSGVO-konform in Deutschland** gespeichert und **GoBD-konform revisionssicher** archiviert (10 Jahre Aufbewahrung, unveränderbare Prüfkette). Die Oberfläche ist zweisprachig (Deutsch / Englisch) – die gewählte Sprache wird pro Nutzer dauerhaft gespeichert.

---

## Anmeldung & Navigation

1. Öffne **https://timetracking.insightarcs.com** im Browser.
2. Melde dich mit deinen Zugangsdaten an.
3. Über das Hauptmenü (Seitenleiste am Desktop, Navigationsleiste unten am Smartphone) erreichst du:
   - **„Zeiterfassung"** → projektbezogene Buchung
   - **„Allgemeine Arbeitszeit"** → Anwesenheit / Kommen–Gehen
4. Die **Sprache** (Deutsch/Englisch) lässt sich oben rechts im Kopfbereich umstellen – die Einstellung bleibt gespeichert.

---

## 1. Zeiterfassung (projektbezogen)

Menüpunkt: **„Zeiterfassung"**

Es gibt **zwei Erfassungsmethoden**. Oben in der Ansicht wechselst du zwischen ihnen:

### a) Live-Timer ⏱️ (für laufende Tätigkeiten)

Ideal, wenn du **jetzt** mit einer Aufgabe beginnst und die Zeit live mitläuft.

1. Wähle den Reiter **„Live-Timer"**.
2. Wähle das **Projekt** und optional die **Aufgabe** aus.
3. Trage eine kurze **Beschreibung** der Tätigkeit ein.
4. Klicke auf **„Timer starten"** ▶️ – die Uhr läuft.
5. Bei Unterbrechungen: **„Pause"** ⏸️ (später fortsetzen) – die Pausenzeit wird nicht mitgezählt.
6. Zum Abschluss: **„Stopp & Speichern"** ⏹️ – der Eintrag wird gebucht.

> Der Timer läuft im Hintergrund weiter, auch wenn du die Seite neu lädst.

### b) Manuelle Zeiterfassung ✍️ (für vergessene / zurückliegende Tage)

Ideal, um Zeiten **nachzutragen**, die nicht live gestoppt wurden.

1. Wähle den Reiter **„Manuelle Zeiterfassung"** (Kennzeichnung „Vergessene Tage").
2. Wähle das **Datum**.
3. Wähle **Projekt** und optional **Aufgabe**.
4. Trage eine **Beschreibung** ein.
5. Erfasse **Startzeit** und **Endzeit**.
6. Trage bei Bedarf die **Pause (Min)** ein – sie wird von der Arbeitszeit abgezogen.
7. Klicke auf **„Eintrag speichern"**.

### Abrechenbar / Nicht abrechenbar 💶

Bei jeder Buchung legst du über das **€-Symbol** fest, ob die Zeit abrechenbar ist:

- **€ (grün)** = **abrechenbar** (wird dem Kunden in Rechnung gestellt)
- **€ durchgestrichen (grau)** = **nicht abrechenbar** (z. B. interne Tätigkeit)

Der Standardwert ergibt sich aus dem Projekt (Kundenprojekt = abrechenbar, internes Projekt = nicht abrechenbar), kann aber pro Eintrag angepasst werden. Fahre mit der Maus über das Symbol, um den aktuellen Status in deiner Sprache zu sehen.

### Freigabe-Workflow (falls für ein Projekt aktiviert)

Ist für ein Projekt die **Freigabepflicht** aktiv, erhalten deine Einträge zunächst den Status:

- **Entwurf** → noch nicht eingereicht
- **Eingereicht** → wartet auf Freigabe durch die Projektleitung
- **Freigegeben** → geprüft und verbucht

Ist keine Freigabepflicht hinterlegt, werden Einträge direkt als freigegeben verbucht.

---

## 2. Allgemeine Arbeitszeit (Anwesenheit)

Menüpunkt: **„Allgemeine Arbeitszeit"**

Diese Ansicht dient der **gesetzlich vorgeschriebenen Arbeitszeiterfassung (ArbZG)**. Sie ist **unabhängig von Projektbuchungen** und immer dann relevant, wenn du

- **nicht auf einem Projekt** arbeitest (z. B. allgemeine Aufgaben, Besprechungen, Verwaltung), oder
- **nicht in Vollzeit einem Projekt zugeordnet** bist und deine tägliche Anwesenheit dokumentieren musst.

### Tagesarten und Abwesenheiten

Jeder Tag kann jetzt einer von **fünf Arten** zugeordnet werden:

| Art | Symbol | Beschreibung | Zeitfelder |
|---|---|---|---|
| **Reguläre Arbeitszeit** | grau | Normaler Arbeitstag | Kommen, Gehen, Pause erforderlich |
| **Urlaub** | 🌴 blau | Urlaubstag | Optional: nur bei Halbtag |
| **Krankheit** | 🩺 orange | Krankheitstag | Optional: nur bei Halbtag |
| **Sonderurlaub** | 💼 lila | Sonderurlaub (z. B. Umzug, Hochzeit) | Optional: nur bei Halbtag |
| **Elternzeit** | 👶 grün | Elternzeit | Keine Zeitfelder |

#### Ganztags-Abwesenheit vs. Halbtag

- **Ganztags-Abwesenheit:** Wähle die entsprechende Tagesart (z. B. „Urlaub") – die Zeitfelder (Kommen/Gehen/Pause) werden automatisch ausgeblendet. Der Tag gilt als vollständig abwesend.
- **Halber Tag:** Aktiviere die Checkbox **„Halber Tag"** – die Zeitfelder bleiben sichtbar, sodass du den gearbeiteten halben Tag erfassen kannst (z. B. Vormittag Urlaub, Nachmittag gearbeitet).

#### Sollzeit-Berechnung: Anrechnung vs. Neutralisierung

Die Tagesart beeinflusst, wie der Tag in die **monatliche Sollzeit** einfließt:

- **Reguläre Arbeitszeit:** Zählt zur Sollzeit, die gearbeiteten Stunden werden erfasst.
- **Urlaub / Krankheit / Sonderurlaub:** Der Tag wird **angerechnet** – er zählt zur Sollzeit UND gilt als erfüllt (wird dem Zeitkonto gutgeschrieben). Dein Saldo bleibt neutral.
  - **Ganztag:** volle Tagessollzeit (z. B. 8 Stunden) wird gutgeschrieben
  - **Halbtag:** halbe Tagessollzeit (z. B. 4 Stunden) wird gutgeschrieben, die gearbeiteten Stunden werden zusätzlich erfasst
- **Elternzeit:** Der Tag wird **neutralisiert** – er fällt komplett aus der Sollzeit heraus (weder Soll noch Ist). Die monatliche Sollzeit reduziert sich entsprechend.

**Beispiel:** 20 Sollarbeitstage im Monat, davon 3 Tage Urlaub und 2 Tage Elternzeit:
- Sollzeit bleibt bei 20 Tagen (Urlaub zählt)
- Urlaub wird mit 3 × 8h = 24h gutgeschrieben
- Effektive Sollzeit reduziert sich auf 18 Tage (−2 Tage Elternzeit)

Die **Metrikkarten** oben zeigen dir:
- **Sollstunden Monat** – inkl. Anzahl angerechneter Tage und Elternzeit-Tage
- **Ist-Stunden Monat** – inkl. gutgeschriebene Stunden
- **Überstunden-Saldo**

### Arbeitstag erfassen

So erfasst du einen Arbeitstag:

1. Wähle das **Datum**.
2. Wähle die **Art** des Tages (Standard: „Reguläre Arbeitszeit").
3. Bei Abwesenheiten: optional **„Halber Tag"** aktivieren.
4. Bei regulärer Arbeit oder Halbtag: **Kommen** (Startzeit), **Gehen** (Endzeit), **Pause (Min)** eintragen.
5. Optional: eine **Notiz** hinzufügen (z. B. „Home Office" oder Ort).
6. Klicke auf **➕ Speichern**, um den Tag zu speichern.

### Tageseinträge bearbeiten

Jeder gespeicherte Tag kann nachträglich **bearbeitet** werden (außer in gesperrten Monaten):

1. Klicke in der Tabelle auf **„Bearbeiten"** ✏️ bei dem Tag, den du ändern möchtest.
2. Der Eintrag wird ins Formular geladen – **alles** lässt sich korrigieren (Datum, Art, Zeiten, Notiz).
3. Nimm die gewünschten Änderungen vor.
4. Klicke auf **„Speichern"** oder **„Abbrechen"**, um die Bearbeitung zu verwerfen.

Alle Korrekturen werden **GoBD-konform im Audit-Log** protokolliert.

### Tabelle der Arbeitstage

In der Tabelle darunter siehst du je Tag:

- **Datum**
- **Art** (farbiges Etikett mit Symbol; „· ½" bei Halbtagen)
- **Kommen – Gehen** (bei Ganztags-Abwesenheiten: „—")
- **Pausenzeit**
- **Bruttozeit** (Anwesenheit gesamt)
- **Nettoarbeitszeit** (Bruttozeit abzüglich Pause)
- **Notiz**
- **Aktionen** (Bearbeiten-Button)

---

## Zeiterfassung vs. Allgemeine Arbeitszeit – der Unterschied

| | **Zeiterfassung** | **Allgemeine Arbeitszeit** |
|---|---|---|
| **Zweck** | Was habe ich woran gearbeitet? | Wann war ich anwesend? |
| **Bezug** | Projekt + Aufgabe | Kein Projektbezug |
| **Grundlage** | Auswertung, Abrechnung, Forecast | Gesetzliche Pflicht (ArbZG) |
| **Abrechenbar?** | Ja (€ abrechenbar / nicht abrechenbar) | Nicht relevant |
| **Wann nutzen?** | Bei Projektarbeit | Wenn nicht (voll) im Projekt |

> 💡 **Tipp:** Beide Ebenen ergänzen sich. Projektzeiten zeigen den *Inhalt* deiner Arbeit, die allgemeine Arbeitszeit dokumentiert deine *Anwesenheit* – gemeinsam ergeben sie eine vollständige, rechtssichere Erfassung.

---

## Häufige Fragen (Kurz)

- **Muss ich die Sprache bei jedem Login neu einstellen?** Nein. Die zuletzt gewählte Sprache wird in deinem Nutzerprofil gespeichert und beim nächsten Login automatisch geladen.
- **Was, wenn ich den Timer vergessen habe?** Nutze die **Manuelle Zeiterfassung**, um den Tag nachzutragen.
- **Werden Pausen abgezogen?** Ja – sowohl bei der projektbezogenen Zeiterfassung als auch bei der allgemeinen Arbeitszeit wird die Pause von der Netto-Arbeitszeit abgezogen.

---

*Insight Arcs – Zeiterfassung & Projekt-Forecast · DSGVO-konform (Hosting in Deutschland) · GoBD- & ArbZG-konform*

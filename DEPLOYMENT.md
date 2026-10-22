# Deployment-Dokumentation: netcup VPS Produktionsumgebung

**Projekt:** Insight Arcs Zeiterfassung & Arbeitszeit  
**Live-URL:** https://timetracking.insightarcs.com  
**Server:** netcup VPS (185.163.119.64) - Ubuntu 24.04.4 LTS  
**Deployment-Datum:** 21.08.2026

---

## 🚀 Produktionsumgebung

### Server-Spezifikationen
- **Betriebssystem:** Ubuntu 24.04.4 LTS (Minimal, UEFI)
- **IP-Adresse:** 185.163.119.64
- **Domain:** timetracking.insightarcs.com (DNS via Cloudflare)
- **SSL/HTTPS:** Let's Encrypt (Auto-Renewal aktiv, läuft ab: 19.11.2026)
- **Webserver:** nginx 1.24.0
- **Runtime:** Node.js 20.20.2
- **Rechenzentrum:** netcup Nürnberg, Deutschland (DSGVO-konform)

### Architektur
```
Internet → Cloudflare DNS → nginx (Port 443/HTTPS) 
  → Reverse Proxy → Node.js App (Port 3000)
  → Lokaler JSON Storage (/opt/timetracking/data/app_storage.json)
```

---

## 📂 Verzeichnisstruktur auf dem Server

```
/opt/timetracking/
├── dist/                    # Build-Artefakte (gebaut via npm run build)
│   ├── server.cjs           # Gebündelter Server (Node.js)
│   ├── assets/              # Frontend-Assets (React, CSS, JS)
│   └── index.html           # SPA Entry Point
├── data/
│   └── app_storage.json     # Persistente Datenbank (JSON, nicht in Git)
├── server.ts                # Server-Quellcode (TypeScript)
├── src/                     # Frontend-Quellcode (React)
├── .env                     # Umgebungsvariablen (nicht in Git)
├── package.json
└── node_modules/
```

**Wichtig:** `data/app_storage.json` ist persistent und enthält alle Produktionsdaten (Zeit-Einträge, Nutzer, Projekte, GoBD-Audit-Logs, Periodensperren). **Niemals löschen ohne Backup!**

---

## 🔧 Systemdienste

### Node.js App (systemd)
- **Service-Name:** `timetracking.service`
- **Status prüfen:** `systemctl status timetracking`
- **Logs ansehen:** `journalctl -u timetracking -f`
- **Neustarten:** `systemctl restart timetracking`
- **Auto-Start:** Aktiviert (startet nach Server-Reboot automatisch)

Die Server-Konsolenausgabe bleibt im systemd-Journal und wird zusätzlich nach `/opt/timetracking/logs/app.log` geschrieben. Das Verzeichnis wird beim Start angelegt. Der Dienstbenutzer braucht Schreibrechte; alternativ kann `LOG_FILE` in `/opt/timetracking/.env` auf einen anderen absoluten Pfad gesetzt werden. Für den Testdienst lautet der Standardpfad bei `WorkingDirectory=/opt/timetracking-test`: `/opt/timetracking-test/logs/app.log`.

Logdatei ansehen:

```bash
tail -f /opt/timetracking/logs/app.log
```

Für automatische Rotation kann `/etc/logrotate.d/timetracking` beispielsweise so konfiguriert werden; `create` muss den tatsächlichen systemd-Dienstbenutzer und dessen Gruppe verwenden:

```text
/opt/timetracking/logs/app.log {
  daily
  rotate 14
  compress
  missingok
  notifempty
  create 0600 root root
}
```

### nginx (Reverse Proxy)
- **Config:** `/etc/nginx/sites-available/timetracking`
- **Status:** `systemctl status nginx`
- **Reload (nach Config-Änderungen):** `systemctl reload nginx`
- **Test:** `nginx -t`

---

## 🔐 Sicherheit & CORS

### CORS-Whitelist
Die App erlaubt nur Requests von der Produktions-Domain:
```bash
ALLOWED_ORIGINS=https://timetracking.insightarcs.com
```

**Ändern:** In `/opt/timetracking/.env` die Zeile `ALLOWED_ORIGINS` bearbeiten, dann Service neustarten:
```bash
systemctl restart timetracking
```

### Admin-Routenschutz
Alle `/admin`- und `/api/admin`-Endpunkte sind durch JWT-Bearer-Token geschützt (Middleware: `requireAdminAuth`).

### Let's Encrypt SSL
- **Zertifikate:** `/etc/letsencrypt/live/timetracking.insightarcs.com/`
- **Auto-Renewal:** certbot hat einen Cron-Job/Timer eingerichtet
- **Manuell erneuern:** `certbot renew`

---

## 🗄️ Datenbank & Backup

### Aktueller Stand: Lokaler JSON-Storage
- **Datei:** `/opt/timetracking/data/app_storage.json`
- **Typ:** Einzelne JSON-Datei, alle Daten in-memory geladen
- **Persistence:** Ja (überlebt Neustarts)

### Backup-Empfehlung
**Täglich via Cron:**
```bash
# /etc/cron.daily/timetracking-backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /opt/timetracking/data/app_storage.json /root/backups/app_storage_$DATE.json
# Alte Backups löschen (älter als 30 Tage)
find /root/backups -name "app_storage_*.json" -mtime +30 -delete
```

### Wiederherstellung
```bash
systemctl stop timetracking
cp /root/backups/app_storage_YYYYMMDD_HHMMSS.json /opt/timetracking/data/app_storage.json
systemctl start timetracking
```

---

## 🔄 Updates & Deployment

### Code-Updates deployen
```bash
# 1. Zum Server verbinden
ssh root@185.163.119.64

# 2. Code pullen
cd /opt/timetracking
git pull origin main

# 3. Dependencies aktualisieren (falls package.json geändert)
npm install --production=false

# 4. Neu bauen
npm run build

# 5. Service neustarten
systemctl restart timetracking

# 6. Status prüfen
systemctl status timetracking
journalctl -u timetracking -f
```

### Deployment via GitHub Actions

Der manuelle Workflow `.github/workflows/deploy-production.yml` läuft nur für `main`; er pullt den aktuellen Stand, installiert Dependencies, baut die App und startet `timetracking` neu. Unter **Settings → Secrets and variables → Actions** müssen diese Repository-Secrets gesetzt sein:

- `DEPLOY_HOST`: SSH-Hostname oder IP des Servers
- `DEPLOY_PORT`: SSH-Port
- `DEPLOY_USER`: SSH-Benutzer
- `DEPLOY_SSH_KEY`: privater OpenSSH-Schlüssel für den Deploy-Benutzer (vollständiger Inhalt einschließlich PEM/OpenSSH-Markierungen)
- `DEPLOY_SSH_KEY_PASSPHRASE`: Passphrase des privaten Schlüssels; leer lassen, falls der Schlüssel keine Passphrase hat
- `DEPLOY_FINGERPRINT`: SSH-Host-Key-Fingerprint zur Serveridentitätsprüfung

Für GitHub Actions einen dedizierten Schlüssel erzeugen, nicht den persönlichen SSH-Schlüssel verwenden. Den öffentlichen Schlüssel in `~/.ssh/authorized_keys` des Deploy-Benutzers eintragen und ausschließlich den privaten Schlüssel als `DEPLOY_SSH_KEY` in GitHub speichern. Den privaten Schlüssel niemals ins Repository committen oder in Logs ausgeben. SSH-Passwort-Authentifizierung muss für diesen Workflow nicht aktiviert sein.

Der GitHub-hosted Runner muss Netzwerkzugriff auf `DEPLOY_HOST` haben. Wenn der Server nur über ein privates VPN erreichbar ist, muss der Workflow-Runner vorher diesem VPN beitreten oder als self-hosted Runner im VPN laufen. Die SSH-Benutzerrechte müssen `git pull`, `npm install`, `npm run build` sowie `systemctl restart/is-active timetracking` erlauben; für systemd kann eine eng begrenzte `sudoers`-Regel erforderlich sein. Workflow manuell über **Actions → Deploy production → Run workflow** starten.

### Node.js-Version aktualisieren
```bash
# NodeSource-Repository nutzt immer die neueste 20.x
apt-get update && apt-get upgrade -y nodejs
systemctl restart timetracking
```

---

## 🌐 DNS-Konfiguration (Cloudflare)

**Domain:** insightarcs.com  
**Subdomain:** timetracking

### Aktueller A-Record
```
Type: A
Name: timetracking
IPv4: 185.163.119.64
Proxy: DNS only (kein Cloudflare-Proxy – wichtig für Let's Encrypt!)
```

**Hinweis:** Cloudflare-Proxy (orange Cloud) ist DEAKTIVIERT, damit Let's Encrypt die Domain direkt erreichen kann. Kann nach Zertifikatserstellung aktiviert werden, falls gewünscht.

---

## 📊 Monitoring & Troubleshooting

### Health-Check
```bash
curl https://timetracking.insightarcs.com/api/health
# Erwartete Antwort: {"status":"ok", ...}
```

### Häufige Probleme

**1. App startet nicht:**
```bash
journalctl -u timetracking -n 50
# Prüfe Fehler, oft: fehlende .env, Port-Konflikt, Syntax-Fehler
```

**2. 502 Bad Gateway (nginx):**
```bash
systemctl status timetracking
# App läuft nicht → siehe oben
# nginx-Config testen: nginx -t
```

**3. CORS-Fehler im Browser:**
```bash
# .env prüfen:
cat /opt/timetracking/.env | grep ALLOWED_ORIGINS
# Muss exakte URL enthalten (ohne Trailing-Slash)
```

**4. Let's Encrypt Renewal schlägt fehl:**
```bash
certbot renew --dry-run
# Cloudflare-Proxy evtl. deaktivieren (DNS only)
```

---

## 🔑 Umgebungsvariablen (.env)

**Datei:** `/opt/timetracking/.env` (chmod 600, nur root lesbar)

Vor dem ersten Start ein starkes Secret erzeugen:

```bash
openssl rand -base64 48
```

Den ausgegebenen Wert als `JWT_SECRET` in `/opt/timetracking/.env` eintragen. Nicht den Platzhalter übernehmen und das Secret niemals ins Repository committen.

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://timetracking.insightarcs.com
APP_URL=https://timetracking.insightarcs.com
JWT_SECRET=<hier den generierten Wert eintragen>
GEMINI_API_KEY=          # Optional: für KI-Features
SMTP_HOST=<SMTP-Server des Mailproviders>
SMTP_PORT=587
SMTP_USER=<SMTP-Benutzer>
SMTP_PASSWORD=<SMTP-Passwort oder App-Passwort>
SMTP_FROM=<Absenderadresse>
```

`JWT_SECRET` ist für den Serverstart erforderlich (mindestens 32 Bytes) und muss bei Neustarts sowie auf allen App-Instanzen unverändert identisch bleiben. Die Datei enthält Zugangsdaten und muss mit `chmod 600 /opt/timetracking/.env` geschützt sein. Secret-Verlust oder -Änderung macht alle bereits ausgestellten Login-Tokens ungültig; Nutzer müssen sich dann erneut anmelden. Beim ersten Aktivieren der JWT-Middleware werden bestehende Tokens aus dem bisherigen fest eingebauten Fallback ebenfalls ungültig.

Für den Passwort-Reset müssen `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` und `SMTP_FROM` mit den SMTP-Zugangsdaten des Mailproviders gesetzt sein. Ohne diese Werte antwortet die Reset-Anfrage mit einem Dienstfehler und versendet keine E-Mail. Reset-Tokens sind einmalig verwendbar, liegen nur im Arbeitsspeicher und laufen nach 30 Minuten ab; bei einem Serverneustart werden noch offene Tokens ungültig.

Nach dem Eintragen die App neu starten und den Dienststatus prüfen:

```bash
systemctl restart timetracking
systemctl status timetracking
```

**GEMINI_API_KEY hinzufügen:**
```bash
nano /opt/timetracking/.env
# Key eintragen, speichern (Ctrl+O, Ctrl+X)
systemctl restart timetracking
```

---

## 🚨 Notfall-Kontakte & Zugänge

**Server-Zugang:**
- SSH: `root@185.163.119.64`
- Passwort: `ABBerlin2025` (nach Deployment ändern!)

**DNS-Verwaltung:**
- Cloudflare: https://dash.cloudflare.com/
- Domain: insightarcs.com

**Repository:**
- GitHub: https://github.com/AndreasBehrens/Project-Forecast-Time-tracking

---

## ✅ Post-Deployment Checklist

- [x] Server neu aufgesetzt (Ubuntu 24.04)
- [x] Node.js 20, nginx, certbot installiert
- [x] Repository geklont nach /opt/timetracking
- [x] Firestore-Sync vollständig entfernt
- [x] Dependencies installiert, Projekt gebaut
- [x] systemd-Service eingerichtet & Auto-Start aktiv
- [x] nginx Reverse-Proxy konfiguriert
- [x] Let's Encrypt HTTPS-Zertifikat eingerichtet (gültig bis 19.11.2026)
- [x] CORS-Whitelist auf Produktions-Domain gesetzt
- [x] Service läuft stabil (Health-Check: OK)
- [x] Code ins GitHub-Repo gepusht

### Noch zu erledigen (optional):

- [ ] **Root-Passwort ändern** (aktuell: `ABBerlin2025`)
- [ ] **SSH-Key-Auth einrichten** (Passwort-Login deaktivieren)
- [ ] **Firewall konfigurieren** (ufw: nur 22, 80, 443 erlauben)
- [ ] **Automatisches Backup einrichten** (siehe Backup-Empfehlung oben)
- [ ] **Monitoring** (z.B. Uptime Kuma, Netdata)
- [ ] **GEMINI_API_KEY setzen** (falls KI-Features benötigt)

---

**Deployment erfolgreich! 🎉**  
Die App läuft unter: https://timetracking.insightarcs.com

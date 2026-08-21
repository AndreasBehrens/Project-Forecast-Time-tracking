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

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://timetracking.insightarcs.com
APP_URL=https://timetracking.insightarcs.com
GEMINI_API_KEY=          # Optional: für KI-Features
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

#!/bin/bash

# Verzeichnis erstellen und wechseln
cd /home/saad/htdocs/dialog-ai-web.de

# Node.js und npm installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose installieren
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Projekt-Abhängigkeiten installieren
npm install

# Umgebungsvariablen einrichten
cp .env.example .env

# Docker Container starten
docker-compose up -d

# Datenbank initialisieren
npx prisma generate
npx prisma db push

# Build erstellen
npm run build

# PM2 installieren und Anwendung starten
sudo npm install -g pm2
pm2 start npm --name "dialog-engine" -- start

# Nginx konfigurieren
sudo tee /etc/nginx/sites-available/dialog-ai-web.de << EOF
server {
    listen 80;
    server_name dialog-ai-web.de www.dialog-ai-web.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Nginx Site aktivieren
sudo ln -s /etc/nginx/sites-available/dialog-ai-web.de /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "Installation abgeschlossen!" 
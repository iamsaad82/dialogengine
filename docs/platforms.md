## 4. **platforms.md**

```markdown
# Plattformen & Integrationen

## 1. Aktuell unterstützte Plattformen

### 1.1 Web-Plattform
- **Framework**: Next.js 14 (TypeScript)
- **Styling**: Tailwind CSS (responsive)
- **PWA-Fähigkeit**: Kann als Progressive Web App betrieben werden
- **Geräteabdeckung**:
  - Desktop-Browser
  - Mobile-Browser
  - Tablet-Browser

### 1.2 Subdomain-basierte Integration
- Eigene Subdomain für jeden Kunden (Multi-Tenant)
- Nahtlose Einbettung in bestehende Websites
- Anpassbares Branding & Layout

### 1.3 Technische Grundlage für Erweiterungen
1. **API-First Ansatz**
   - REST API Endpoints
   - Authentifizierung & API-Key Management
   - Versionierte API-Endpunkte

2. **Modulare Service-Struktur**
   - Getrennte Services für Chat, Smart Search, Template-Management, Authentifizierung

---

## 2. Empfohlene Erweiterungen

### 2.1 Chat-Plattform Integrationen
- Microsoft Teams
- Slack
- WhatsApp Business API
- Telegram Bot API

> **Response Types** (Auszug):
> ```ts
> export type ResponseType =
>   | 'info'
>   | 'service'
>   | 'product'
>   | 'event'
>   | 'location'
>   | 'video'
>   | 'link'
>   | 'contact'
>   | 'faq'
>   | 'download';
> ```

### 2.2 Widget-Integration
- Einbettbarer Chat-Widget für Drittanbieter-Seiten
- iFrame-Lösung
- JavaScript SDK für einfache Integration

### 2.3 Mobile Apps
- **React Native** möglich
  - Wiederverwendung der TypeScript-Typen
  - Gemeinsame API-Struktur
  - Shared Components

---

## 3. Nicht empfohlene / aktuell nicht fokussierte Plattformen

### 3.1 Native Desktop Apps
- Kein unmittelbarer Mehrwert
- Web-App ausreichend für Admin-Interface
- PWA bietet ähnliche Funktionalitäten

### 3.2 IoT oder Voice Assistants
- Aktuell nicht im Fokus
- Große Architektur-Anpassungen nötig
- Kein unmittelbarer Use Case

---

## 4. Prioritäten für die Plattform-Entwicklung

| Zeitraum       | Fokus                                            |
|----------------|--------------------------------------------------|
| **Kurzfristig**  | - Web-Plattform-Optimierung<br>- Chat-Widget<br>- Mobile Responsive Verbesserungen |
| **Mittelfristig**| - Teams / Slack Integration<br>- WhatsApp Business<br>- API SDK für Entwickler      |
| **Langfristig**  | - Mobile Apps (bei Bedarf)<br>- Weitere Chat-Plattformen<br>- Custom Integration     |

**Hinweis**  
Dank modularer Architektur und TypeScript-Typisierung können Integrationen relativ einfach umgesetzt werden, ohne das Kernsystem zu überarbeiten.
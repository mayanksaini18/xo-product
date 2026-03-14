# PulseTrack - AI-Powered Product Metrics Assistant

PulseTrack is a professional, production-ready AI analytics platform that helps product teams monitor metrics, analyze database schemas, and detect anomalies using natural language queries powered by **Anthropic Claude**.

![PulseTrack Dashboard](file:///Users/mayanksaini/.gemini/antigravity/brain/fce23b49-a836-469d-b7c5-7e94652ef236/.system_generated/click_feedback/click_feedback_1773485476308.png)

---

## ✨ Key Features

### 1. **Natural Language Analytics (Chat)**
- Query your product metrics using plain English.
- Receive streaming AI responses with SQL context.
- Interactive follow-up suggestions for deeper exploration.

### 2. **Professional Metric Monitoring**
- Automated tracking of key product performance indicators (KPIs).
- **Real-time Anomaly Detection**: Alerts you when metrics cross specific thresholds.
- **Visual Trends**: Beautiful sparkline and area charts for historical data.

### 3. **Smart Schema Management**
- Instant parsing of SQL schemas (`CREATE TABLE` statements).
- Visual table relationship explorer.
- Automatic context feeding to the AI for accurate SQL generation.

### 4. **Enterprise-Grade Alerts**
- **Slack & Email Integration**: Get notified where you work.
- Configurable severity levels and threshold conditions.
- Consolidated alert history.

---

## 🚀 Getting Started

PulseTrack offers flexible ways to run, from a simple demo to a full-stack deployment.

### Option 1: Standalone HTML (Zero Setup)
Perfect for a quick demo. Just open the included HTML file in your browser:
```bash
open pulsetrack.html
```

### Option 2: Full-Stack Application (Recommended for Development)

#### Backend Setup (Python/FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   python server.py
   ```

#### Frontend Setup (React)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the development server:
   ```bash
   npm start
   ```

---

## 🏗️ Technical Architecture

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Python (FastAPI), Uvicorn, APScheduler |
| **AI Engine** | Anthropic Claude (Sonnet 3.5 / 4) |
| **State/Storage** | MongoDB (Production), React Local State (Mock Mode) |
| **Integrations** | Slack Webhooks, PostgreSQL & MySQL support |

---

## 🎨 Professional Design System
PulseTrack features a premium **Developer Dark Mode** designed for high visibility and aesthetic excellence:
- **Surface**: Glassmorphic panels with subtle border glows.
- **Palette**: Deep charcoal (#0f1117) with Indigo (#6366f1) and custom semantic colors.
- **Motion**: Fluid transitions, slide-in panels, and streaming text animations.

---

## 🧪 Demo Mode
Don't have a database ready? Click **"Try with sample schema"** in the standalone demo or rely on the frontend's built-in **Mock Persistence** layer to explore all features instantly without any infrastructure.

---

## 📄 License
Internal Product Development License.

---
*Built with ❤️ for modern product teams.*

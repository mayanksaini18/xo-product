# PulseTrack - Quick Start Guide

## 🎯 Opening the Application

### Method 1: Direct File Open (Easiest)
Simply double-click `pulsetrack.html` or open it in your browser:
- Chrome: `Cmd + O` → select `pulsetrack.html`
- Firefox: `Cmd + O` → select `pulsetrack.html`
- Safari: `Cmd + O` → select `pulsetrack.html`

### Method 2: Local Server (Recommended)
For full functionality including Claude API calls:

```bash
# Navigate to the app directory
cd /app

# Start a local server (choose one):
python3 -m http.server 8080
# OR
npx http-server -p 8080

# Open in browser:
# http://localhost:8080/pulsetrack.html
```

## 🚀 First Steps

### 1. Try Demo Mode
Click **"Try with sample schema"** on the welcome screen to instantly load:
- Sample database schema (users, events, orders, products)
- 3 pre-configured metrics
- Ready-to-use dashboard

### 2. Load Your Own Schema
1. Click **"Load SQL Schema"** (or use sidebar → Schema Manager)
2. Paste your CREATE TABLE statements
3. Click **"Load Schema"**
4. AI will analyze your schema and suggest starter queries

### 3. Ask Questions
Navigate to **Chat** and ask natural language questions like:
- "How many users signed up today?"
- "What's our total revenue this week?"
- "Did error rate spike after the deploy?"

### 4. Track Metrics
1. Go to **Tracked Metrics**
2. Click **"+ Add Metric"**
3. Describe the metric you want to track in Chat
4. View automated monitoring with anomaly detection

### 5. Configure Alerts
1. Navigate to **Alerts & Notifications**
2. Set up Slack webhook or email notifications
3. Configure severity thresholds
4. Test your connections

## 🔑 API Key Configuration

The app uses Emergent LLM Key by default. To use your own Anthropic API key:

1. Open `pulsetrack.html` in a text editor
2. Find line ~83:
   ```javascript
   const API_KEY = 'sk-emergent-cEd44295e39AeF6A2F';
   ```
3. Replace with your key:
   ```javascript
   const API_KEY = 'sk-ant-your-anthropic-key';
   ```
4. Save and reload the page

## ⌨️ Keyboard Shortcuts

- `⌘/Ctrl + Enter` - Send chat message
- `⌘/Ctrl + K` - Focus chat input

## 📱 Mobile View

On screens below 768px, the sidebar converts to a bottom tab bar for easy mobile navigation.

## 🎨 Features Overview

### Chat Interface
- Natural language queries
- Streaming AI responses
- SQL syntax highlighting
- Clickable follow-up suggestions
- Rich message formatting

### Schema Manager
- Paste SQL CREATE TABLE statements
- Automatic parsing of tables and relationships
- Visual explorer with PK/FK highlighting
- Collapsible raw SQL view

### Tracked Metrics
- Automated monitoring
- Real-time anomaly detection
- Status indicators (OK/Warning/Critical)
- Historical trend visualization
- Detailed metric drill-down

### Alerts & Notifications
- Slack webhook integration
- Email notification setup
- Configurable severity thresholds
- Alert history tracking

## 🐛 Troubleshooting

### Charts Not Showing
Charts may show "Chart unavailable" when opened as `file://`. This is due to browser CORS restrictions. Use a local HTTP server to see charts.

### API Calls Failing
If you see "Error: Failed to fetch":
1. Ensure you're using HTTP (not file://)
2. Check your API key is valid
3. Verify internet connection
4. Check browser console for details

### Schema Not Loading
1. Verify SQL syntax is valid CREATE TABLE statements
2. Ensure proper formatting with semicolons
3. Check browser console for parsing errors

## 💡 Tips

1. **Demo Mode First**: Always try demo mode to understand features before loading your own data
2. **Start Simple**: Begin with basic queries and gradually explore more complex analytics
3. **Use Follow-ups**: Click suggested follow-up questions to learn query patterns
4. **Track Key Metrics**: Set up 3-5 critical metrics for automated monitoring
5. **Configure Alerts**: Set up notifications early to catch anomalies

## 🎯 Example Queries

After loading demo schema:

**Basic Metrics:**
- "Show me today's active users"
- "What's the total revenue from completed orders?"
- "How many events were logged this week?"

**Trend Analysis:**
- "Compare this week's signups to last week"
- "Are we seeing growth in premium subscriptions?"
- "Show me the error rate trend over the last 7 days"

**Anomaly Detection:**
- "Did error rate spike after the deploy?"
- "Alert me if daily active users drop by more than 20%"
- "Track checkout completion rate hourly"

## 🏗️ Architecture Notes

- **Client-side only**: No backend required
- **CDN imports**: React, Tailwind, Recharts loaded via CDN
- **State management**: React hooks (useState, useEffect)
- **AI Integration**: Direct Anthropic API calls with streaming
- **Responsive**: Desktop-first with mobile adaptation

## 📊 Tech Stack

- React 18 (hooks)
- Tailwind CSS
- Recharts (charts)
- Claude Sonnet 4 (AI)
- Babel Standalone (JSX transpilation)

---

**Need Help?** Check the full README.md or view the source code for detailed implementation.
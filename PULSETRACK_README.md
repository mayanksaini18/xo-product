# PulseTrack - AI Product Metrics Tracker

A production-quality AI-powered product analytics assistant that helps product managers ask questions about metrics in natural language and receive insights powered by Anthropic Claude.

## 🚀 Quick Start

### Option 1: Standalone HTML (Recommended for Demo)

Simply open `pulsetrack.html` in any modern browser:

```bash
open pulsetrack.html
# or
google-chrome pulsetrack.html
# or
firefox pulsetrack.html
```

**No installation required!** The app runs entirely in the browser with CDN imports.

### Option 2: Serve via HTTP

For better performance and to avoid CORS issues:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx http-server -p 8080

# Then open http://localhost:8080/pulsetrack.html
```

## ✨ Features

### 1. **Chat Interface**
- Natural language queries about product metrics
- Streaming AI responses powered by Claude Sonnet 4
- Rich message formatting with SQL syntax highlighting
- Clickable follow-up suggestions
- Token-by-token streaming with blinking cursor

### 2. **Schema Manager**
- Paste SQL CREATE TABLE statements
- Automatic parsing of tables, columns, relationships
- Visual table explorer with primary/foreign key highlighting
- Sample schema loader for quick demos

### 3. **Tracked Metrics**
- Configure automated metric monitoring
- Real-time anomaly detection
- Beautiful sparkline charts (24-hour history)
- Status indicators (OK, Warning, Critical)
- Detailed metric drill-down panel

### 4. **Alerts & Notifications**
- Slack webhook integration
- Email notification setup
- Configurable severity thresholds
- Alert history tracking

## 🎨 Design

- **Dark developer-style UI** inspired by Linear, Vercel, and Retool
- **Modern color palette**: Deep grays (#0f1117, #1a1d27) with indigo accents (#6366f1)
- **Typography**: Inter for UI, JetBrains Mono for code
- **Responsive**: Desktop-first with mobile bottom tab navigation
- **Smooth animations**: Message fade-in, streaming cursor, hover states

## 🔑 API Configuration

The app uses the **Emergent LLM Key** by default:
```javascript
const API_KEY = 'sk-emergent-cEd44295e39AeF6A2F';
```

### To use your own Anthropic API key:

1. Open `pulsetrack.html` in a text editor
2. Find line ~83: `const API_KEY = 'sk-emergent-cEd44295e39AeF6A2F';`
3. Replace with your key: `const API_KEY = 'sk-ant-your-key-here';`
4. Save and reload

**Security Note**: Since this is a client-side app, the API key is exposed in the browser. For production use, consider:
- Setting up a backend proxy to protect the key
- Using environment-specific keys
- Implementing usage limits and monitoring

## 📊 Demo Mode

Click **"Try with sample schema"** to instantly load:
- Sample SQL schema (users, events, orders, products tables)
- 3 pre-configured tracked metrics:
  - Daily Active Users
  - Error Rate
  - Revenue Today
- Synthetic sparkline data

Perfect for demos and testing without setting up a database!

## 🎯 Usage Examples

### Example Queries (after loading schema):

1. **Basic Metrics**
   - "How many users signed up today?"
   - "What's our total revenue this week?"
   - "Show me the top 5 products by sales"

2. **Trend Analysis**
   - "Did error rate spike after the deploy?"
   - "Compare this week's signups to last week"
   - "Are we seeing growth in premium subscriptions?"

3. **Anomaly Detection**
   - "Alert me if daily active users drop by more than 20%"
   - "Track checkout completion rate hourly"
   - "Monitor API error rate every 5 minutes"

## 🛠️ Technical Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18 |
| Styling | Tailwind CSS | Latest (CDN) |
| Charts | Recharts | 2.5.0 |
| Syntax Highlighting | React Syntax Highlighter | 15.5.0 |
| AI Model | Claude Sonnet 4 | claude-sonnet-4-20250514 |
| Transpiler | Babel Standalone | Latest |

## 📱 Mobile Support

Below 768px width:
- Sidebar converts to bottom tab bar
- Single-column layouts
- Touch-optimized interactions
- Full-screen schema editor

## ⌨️ Keyboard Shortcuts

- `⌘ + Enter` / `Ctrl + Enter` - Send message
- `⌘ + K` / `Ctrl + K` - Focus chat input

## 🏗️ Architecture

### State Management
```javascript
{
  activeView: 'chat' | 'schema' | 'metrics' | 'alerts',
  schema: { raw, tables, relationships },
  messages: [{ id, role, content, timestamp }],
  trackedMetrics: [{ id, name, query, status, history }],
  notifications: { slack, email },
  alerts: [{ timestamp, metric, severity }],
  isStreaming: boolean
}
```

### API Integration
- Direct fetch calls to `https://api.anthropic.com/v1/messages`
- Server-Sent Events (SSE) streaming with `ReadableStream`
- Parse `content_block_delta` events for token-by-token rendering

## 🎨 Color System

```css
Background:  #0f1117
Surface:     #1a1d27
Card:        #21253a
Border:      #2d3148
Accent:      #6366f1 (Indigo)
Success:     #10b981 (Green)
Warning:     #f59e0b (Amber)
Error:       #ef4444 (Red)
```

## 🚧 Limitations

1. **Client-side only**: No backend, all logic in browser
2. **No persistence**: State resets on page reload
3. **API key exposure**: Visible in browser (use backend proxy for production)
4. **No real SQL execution**: Queries are for Claude context only

## 🔄 Future Enhancements

- [ ] Backend API for secure key management
- [ ] PostgreSQL connection for real query execution
- [ ] LocalStorage persistence for metrics and schema
- [ ] Real-time metric monitoring with WebSocket
- [ ] Export metrics to CSV/JSON
- [ ] Dashboard templates for common use cases
- [ ] User authentication and multi-workspace support

## 📄 License

Built for demonstration and educational purposes.

## 🤝 Support

For issues or questions about the Emergent LLM Key:
- Check your key balance in Profile → Universal Key
- Enable auto top-up to avoid interruptions
- Contact support if you encounter API errors

---

**Built with ❤️ using Claude Sonnet 4 and React**

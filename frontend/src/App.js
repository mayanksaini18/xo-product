import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Activity, 
  Bell, 
  Database, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Copy,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X
} from 'lucide-react';
import "@/App.css";

// Constants
const API_KEY = 'sk-emergent-cEd44295e39AeF6A2F';
const MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = "You are an AI-powered Product Metrics Tracking Assistant embedded in a product analytics tool. Your job is to translate natural language product questions into SQL queries, detect anomalies in metrics, suggest insights, and help configure automated metric tracking. When you provide SQL queries, wrap them in ```sql code blocks. When suggesting follow-up questions, prefix them with numbers like 1️⃣, 2️⃣, 3️⃣.";

const SAMPLE_SCHEMA = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  subscription_tier TEXT
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_name TEXT NOT NULL,
  event_timestamp TIMESTAMP DEFAULT NOW(),
  properties JSONB
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2),
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2),
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);`;

// Utility Functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const copyToClipboard = (text) => navigator.clipboard.writeText(text);
const formatTimestamp = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Premium Line Chart Component
function PremiumLineChart({ data }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // Draw gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data]);
  
  return <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />;
}

// Toast Notification Component
function Toast({ message, type = 'success', onClose }) {
  const icons = {
    success: <CheckCircle2 size={16} />,
    warning: <AlertTriangle size={16} />,
    error: <XCircle size={16} />
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 scale-in">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg glass border border-white/10 shadow-xl">
        <span className="text-white">{icons[type]}</span>
        <span className="text-sm text-white">{message}</span>
        <button onClick={onClose} className="ml-2 text-white/60 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [activeView, setActiveView] = useState('chat');
  const [schema, setSchema] = useState({ raw: '', tables: [], relationships: [] });
  const [messages, setMessages] = useState([]);
  const [trackedMetrics, setTrackedMetrics] = useState([]);
  const [notifications, setNotifications] = useState({
    slack: { webhookUrl: '', channel: '', active: false },
    email: { addresses: '', filter: 'all', active: false }
  });
  const [alerts, setAlerts] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [schemaInput, setSchemaInput] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [toast, setToast] = useState(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const placeholders = [
    "Ask about product metrics...",
    "Check user growth trends",
    "Detect anomalies after deploy",
    "Analyze conversion funnel"
  ];
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const generateSparklineData = (baseValue, points) => {
    return Array.from({ length: points }, (_, i) => ({
      value: baseValue * (0.85 + Math.random() * 0.3)
    }));
  };
  
  const loadDemoMode = () => {
    setSchemaInput(SAMPLE_SCHEMA);
    analyzeSchema(SAMPLE_SCHEMA);
    
    const sampleMetrics = [
      {
        id: generateId(),
        name: 'Daily Active Users',
        description: 'Users who logged in today',
        query: 'SELECT COUNT(DISTINCT user_id) FROM events WHERE event_timestamp >= CURRENT_DATE',
        interval: 'Daily',
        status: 'ok',
        currentValue: 1247,
        trend: 'up',
        change: '+12%',
        lastChecked: new Date(),
        history: generateSparklineData(1247, 24)
      },
      {
        id: generateId(),
        name: 'Error Rate',
        description: 'Percentage of failed events',
        query: 'SELECT (COUNT(*) FILTER (WHERE event_name = \'error\') * 100.0 / COUNT(*)) FROM events',
        interval: 'Hourly',
        status: 'warning',
        currentValue: 2.4,
        trend: 'up',
        change: '+0.3%',
        lastChecked: new Date(),
        history: generateSparklineData(2.4, 24)
      },
      {
        id: generateId(),
        name: 'Revenue Today',
        description: 'Total revenue from completed orders',
        query: 'SELECT SUM(amount) FROM orders WHERE status = \'completed\' AND created_at >= CURRENT_DATE',
        interval: 'Hourly',
        status: 'ok',
        currentValue: 12450,
        trend: 'up',
        change: '+8.2%',
        lastChecked: new Date(),
        history: generateSparklineData(12450, 24)
      }
    ];
    
    setTrackedMetrics(sampleMetrics);
    showToast('Demo mode loaded with sample data', 'success');
  };
  
  const analyzeSchema = async (schemaText) => {
    setSchema({ raw: schemaText, tables: [], relationships: [] });
    
    const tableMatches = schemaText.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\);/g);
    const tables = [];
    const relationships = [];
    
    for (const match of tableMatches) {
      const tableName = match[1];
      const columns = match[2].split('\n').map(line => line.trim()).filter(Boolean);
      
      const parsedColumns = columns.map(col => {
        const parts = col.split(/\s+/);
        const name = parts[0];
        const type = parts[1];
        const isPrimary = col.includes('PRIMARY KEY');
        const isForeign = col.includes('REFERENCES');
        
        if (isForeign) {
          const refMatch = col.match(/REFERENCES (\w+)\((\w+)\)/);
          if (refMatch) {
            relationships.push({
              from: tableName,
              to: refMatch[1],
              column: name
            });
          }
        }
        
        return { name, type, isPrimary, isForeign };
      });
      
      tables.push({ name: tableName, columns: parsedColumns });
    }
    
    setSchema({ raw: schemaText, tables, relationships });
    
    const analysisMessage = `Here is my SQL schema:\n\n${schemaText}\n\nPlease confirm you understand it and suggest 3 useful starter queries I can ask.`;
    await sendMessage(analysisMessage, true);
  };
  
  const sendMessage = async (text, isAutomatic = false) => {
    if (!text.trim() && !isAutomatic) return;
    
    const userMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!isAutomatic) setInputValue('');
    setIsStreaming(true);
    
    const assistantMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    try {
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: conversationHistory,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const event = JSON.parse(data);
              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullContent += event.delta.text;
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: fullContent }
                    : msg
                ));
              }
            } catch (e) {
              // Skip malformed events
            }
          }
        }
      }
      
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? { ...msg, isStreaming: false }
          : msg
      ));
      
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? { ...msg, content: `Error: ${error.message}`, isStreaming: false }
          : msg
      ));
      showToast('Failed to connect to Claude', 'error');
    } finally {
      setIsStreaming(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };
  
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      {!isMobile && (
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          schema={schema}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <ChatView
            messages={messages}
            isStreaming={isStreaming}
            inputValue={inputValue}
            setInputValue={setInputValue}
            sendMessage={sendMessage}
            handleKeyDown={handleKeyDown}
            schema={schema}
            setActiveView={setActiveView}
            loadDemoMode={loadDemoMode}
            placeholder={placeholders[placeholderIndex]}
          />
        )}
        
        {activeView === 'schema' && (
          <SchemaView
            schema={schema}
            schemaInput={schemaInput}
            setSchemaInput={setSchemaInput}
            analyzeSchema={analyzeSchema}
            loadDemoMode={loadDemoMode}
          />
        )}
        
        {activeView === 'metrics' && (
          <MetricsView
            trackedMetrics={trackedMetrics}
            setTrackedMetrics={setTrackedMetrics}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
            setActiveView={setActiveView}
            setInputValue={setInputValue}
          />
        )}
        
        {activeView === 'alerts' && (
          <AlertsView
            notifications={notifications}
            setNotifications={setNotifications}
            alerts={alerts}
          />
        )}
      </div>
      
      {/* Mobile Bottom Nav */}
      {isMobile && (
        <MobileTabBar activeView={activeView} setActiveView={setActiveView} />
      )}
      
      {/* Toast Notifications */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

// Premium Sidebar Component
function Sidebar({ activeView, setActiveView, schema }) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'metrics', label: 'Tracked Metrics', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'schema', label: 'Schema', icon: Database },
  ];
  
  return (
    <div className="w-60 h-full flex flex-col glass border-r border-white/10">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PulseTrack</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 slide-in
                ${isActive 
                  ? 'bg-white text-black shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Connected to Claude</span>
        </div>
        
        <div className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs font-medium text-gray-400 mb-1">Schema Status</div>
          <div className="text-sm font-semibold">
            {schema.tables.length > 0 ? (
              <span className="text-white">{schema.tables.length} tables loaded</span>
            ) : (
              <span className="text-gray-500">No schema</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat View Component
function ChatView({ messages, isStreaming, inputValue, setInputValue, sendMessage, handleKeyDown, schema, setActiveView, loadDemoMode, placeholder }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Ask anything about your product</h1>
            <p className="text-sm text-gray-400">Natural language → SQL → Insights</p>
          </div>
          <div>
            {schema.tables.length > 0 ? (
              <span className="px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-full text-xs font-medium">
                ✓ {schema.tables.length} tables
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-white/5 text-gray-500 border border-white/10 rounded-full text-xs font-medium">
                No schema
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <WelcomeCard setActiveView={setActiveView} loadDemoMode={loadDemoMode} />
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <Message key={msg.id} message={msg} sendMessage={sendMessage} index={idx} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Premium Input Area */}
      <div className="px-8 py-6 border-t border-white/10 backdrop-blur-sm bg-black/50">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3 glass rounded-xl p-3 border border-white/10 glow-on-hover">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm max-h-32 min-h-[40px] resize-none"
              rows={1}
              disabled={isStreaming}
              style={{ transition: 'all 0.3s' }}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              className="btn-hover px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>Send</span>
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400">⌘ + Enter</kbd> to send
          </div>
        </div>
      </div>
    </div>
  );
}

// Welcome Card Component
function WelcomeCard({ setActiveView, loadDemoMode }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md fade-in">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">Track your feature's impact</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Paste your SQL schema to start analyzing your product metrics with AI.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveView('schema')}
            className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium flex items-center justify-center gap-2 shadow-xl"
          >
            <Database size={18} />
            Load SQL Schema
          </button>
          <button
            onClick={loadDemoMode}
            className="btn-hover px-6 py-3 bg-white/5 text-white border border-white/10 rounded-lg font-medium hover:bg-white/10"
          >
            Try with sample schema
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Component  
function Message({ message, sendMessage, index }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end fade-in" style={{ animationDelay: `${index * 50}ms` }}>
        <div className="max-w-[70%] bg-white text-black px-5 py-3 rounded-2xl rounded-tr-md shadow-xl">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div className="text-xs opacity-50 mt-2">{formatTimestamp(message.timestamp)}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-start fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="max-w-[80%] glass border border-white/10 px-6 py-4 rounded-2xl rounded-tl-md shadow-xl">
        <RichMessageContent content={message.content} sendMessage={sendMessage} />
        {message.isStreaming && <span className="inline-block w-0.5 h-4 bg-white ml-1 cursor-blink">|</span>}
        <div className="text-xs text-gray-500 mt-3">{formatTimestamp(message.timestamp)}</div>
      </div>
    </div>
  );
}

// Rich Message Content Component
function RichMessageContent({ content, sendMessage }) {
  const parts = [];
  let currentIndex = 0;
  
  const sqlRegex = /```sql\n([\s\S]*?)```/g;
  const jsonRegex = /```json\n([\s\S]*?)```/g;
  
  let match;
  const sqlBlocks = [];
  while ((match = sqlRegex.exec(content)) !== null) {
    sqlBlocks.push({ start: match.index, end: match.index + match[0].length, sql: match[1] });
  }
  
  const jsonBlocks = [];
  while ((match = jsonRegex.exec(content)) !== null) {
    jsonBlocks.push({ start: match.index, end: match.index + match[0].length, json: match[1] });
  }
  
  const allBlocks = [...sqlBlocks.map(b => ({ ...b, type: 'sql' })), ...jsonBlocks.map(b => ({ ...b, type: 'json' }))].sort((a, b) => a.start - b.start);
  
  allBlocks.forEach((block) => {
    if (block.start > currentIndex) {
      parts.push({ type: 'text', content: content.slice(currentIndex, block.start) });
    }
    parts.push(block);
    currentIndex = block.end;
  });
  
  if (currentIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(currentIndex) });
  }
  
  return (
    <div className="space-y-4">
      {parts.map((part, idx) => {
        if (part.type === 'sql') {
          return <SQLBlock key={idx} sql={part.sql} />;
        } else if (part.type === 'json') {
          return <JSONBlock key={idx} json={part.json} />;
        } else {
          return <TextContent key={idx} content={part.content} sendMessage={sendMessage} />;
        }
      })}
    </div>
  );
}

// SQL Block Component
function SQLBlock({ sql }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    copyToClipboard(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative my-4">
      <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">SQL Query</span>
          <button
            onClick={handleCopy}
            className="btn-hover text-xs px-3 py-1 bg-white/10 text-white border border-white/10 rounded hover:bg-white/20 transition-all flex items-center gap-1.5"
          >
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 text-xs overflow-x-auto font-mono leading-relaxed">
          <code className="text-white">{sql}</code>
        </pre>
      </div>
    </div>
  );
}

// JSON Block Component
function JSONBlock({ json }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/10 transition-all flex items-center gap-2"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        JSON Data
      </button>
      {isExpanded && (
        <pre className="mt-2 p-4 bg-black/50 border border-white/10 rounded-lg text-xs overflow-x-auto font-mono">
          <code className="text-white">{json}</code>
        </pre>
      )}
    </div>
  );
}

// Text Content Component
function TextContent({ content, sendMessage }) {
  const suggestionRegex = /([1-3]️⃣[^\n]+)/g;
  const parts = content.split(suggestionRegex);
  
  return (
    <div className="text-sm text-white space-y-3 leading-relaxed">
      {parts.map((part, idx) => {
        if (/^[1-3]️⃣/.test(part)) {
          return (
            <button
              key={idx}
              onClick={() => sendMessage(part.replace(/^[1-3]️⃣\s*/, ''))}
              className="block w-full text-left px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 hover:border-white/20 transition-all"
            >
              {part}
            </button>
          );
        }
        return <p key={idx} className="whitespace-pre-wrap">{part}</p>;
      })}
    </div>
  );
}

// Schema View Component (continued in next message due to size)
function SchemaView({ schema, schemaInput, setSchemaInput, analyzeSchema, loadDemoMode }) {
  const handleLoadSchema = () => {
    if (schemaInput.trim()) {
      analyzeSchema(schemaInput);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">SQL Schema</h1>
            <p className="text-sm text-gray-400">Paste CREATE TABLE statements</p>
          </div>
          <div>
            {schema.tables.length > 0 ? (
              <span className="px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-full text-xs font-medium">
                Loaded
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-white/5 text-gray-500 border border-white/10 rounded-full text-xs font-medium">
                Not loaded
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {schema.tables.length === 0 ? (
            <div className="fade-in">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Schema SQL</label>
                  <span className={`text-xs ${schemaInput.length > 10000 ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {schemaInput.length} characters
                  </span>
                </div>
                <textarea
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                  placeholder="CREATE TABLE users (&#10;  id SERIAL PRIMARY KEY,&#10;  email TEXT,&#10;  created_at TIMESTAMP&#10;);"
                  className="w-full h-96 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-gray-600 outline-none focus:border-white/30 transition-all"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleLoadSchema}
                  disabled={!schemaInput.trim()}
                  className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Database size={18} />
                  Load Schema
                </button>
                <button
                  onClick={loadDemoMode}
                  className="btn-hover px-6 py-3 bg-white/5 text-white border border-white/10 rounded-lg font-medium hover:bg-white/10"
                >
                  Load Sample Schema
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Loaded Schema</h2>
                <button
                  onClick={() => {
                    setSchemaInput('');
                    analyzeSchema('');
                  }}
                  className="btn-hover px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10"
                >
                  Change Schema
                </button>
              </div>
              
              <details className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer font-medium text-sm hover:bg-white/10 transition-all flex items-center gap-2">
                  <ChevronRight size={16} className="transition-transform" />
                  Raw Schema SQL
                </summary>
                <pre className="px-4 py-3 border-t border-white/10 text-xs font-mono text-gray-400 overflow-x-auto">
                  {schema.raw}
                </pre>
              </details>
              
              <div>
                <h3 className="text-base font-semibold mb-4">Tables</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schema.tables.map((table, idx) => (
                    <div key={table.name} className="card-hover bg-white/5 border border-white/10 rounded-lg p-5 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Database size={16} />
                        {table.name}
                      </h4>
                      <div className="space-y-2">
                        {table.columns.map(col => (
                          <div key={col.name} className="flex items-center justify-between text-xs py-1.5">
                            <span className="text-white flex items-center gap-2">
                              {col.name}
                              {col.isPrimary && <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-medium">PK</span>}
                              {col.isForeign && <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-medium">FK</span>}
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {schema.relationships.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold mb-4">Relationships</h3>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-2">
                    {schema.relationships.map((rel, idx) => (
                      <div key={idx} className="text-sm text-white flex items-center gap-2">
                        <code className="text-white bg-white/10 px-2 py-0.5 rounded">{rel.from}</code>
                        <span className="text-gray-400">.</span>
                        <code className="text-gray-400">{rel.column}</code>
                        <span className="text-gray-500">→</span>
                        <code className="text-white bg-white/10 px-2 py-0.5 rounded">{rel.to}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metrics View Component
function MetricsView({ trackedMetrics, setTrackedMetrics, selectedMetric, setSelectedMetric, setActiveView, setInputValue }) {
  const handleAddMetric = () => {
    setInputValue('I want to track...');
    setActiveView('chat');
  };
  
  const handleDeleteMetric = (id) => {
    setTrackedMetrics(prev => prev.filter(m => m.id !== id));
    if (selectedMetric?.id === id) {
      setSelectedMetric(null);
    }
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Tracked Metrics</h1>
              <p className="text-sm text-gray-400">Real-time monitoring with anomaly detection</p>
            </div>
            <button
              onClick={handleAddMetric}
              className="btn-hover px-4 py-2 bg-white text-black rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Activity size={16} />
              Add Metric
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {trackedMetrics.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md fade-in">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">No tracked metrics yet</h3>
                <p className="text-gray-400 mb-6">Start tracking metrics to monitor your product's health automatically.</p>
                <button
                  onClick={handleAddMetric}
                  className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium"
                >
                  Add Your First Metric
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-6xl mx-auto">
              {trackedMetrics.map((metric, idx) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onSelect={() => setSelectedMetric(metric)}
                  onDelete={() => handleDeleteMetric(metric.id)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {selectedMetric && (
        <MetricDetailPanel
          metric={selectedMetric}
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </div>
  );
}

// Premium Metric Card Component
function MetricCard({ metric, onSelect, onDelete, index }) {
  const statusColors = {
    ok: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };
  
  const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <div 
      className="card-hover glass border border-white/10 rounded-xl p-6 cursor-pointer fade-in"
      onClick={onSelect}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-2xl ${statusColors[metric.status]}`}>●</span>
          <div>
            <h3 className="font-semibold text-lg">{metric.name}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{metric.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
            {metric.interval}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-3xl font-bold mb-1">
            {typeof metric.currentValue === 'number' 
              ? metric.currentValue.toLocaleString() 
              : metric.currentValue}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon size={14} className={metric.trend === 'up' ? 'text-green-500' : 'text-red-500'} />
            <span className={metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
              {metric.change}
            </span>
            <span className="text-gray-500">vs last period</span>
          </div>
        </div>
      </div>
      
      <div className="h-16 relative">
        <PremiumLineChart data={metric.history} />
      </div>
      
      <div className="text-xs text-gray-500 mt-3">
        Last checked {formatTimestamp(metric.lastChecked)}
      </div>
    </div>
  );
}

// Metric Detail Panel Component
function MetricDetailPanel({ metric, onClose }) {
  return (
    <div className="w-96 h-full glass border-l border-white/10 overflow-y-auto slide-in">
      <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 glass">
        <h2 className="text-lg font-semibold">Metric Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-2 text-lg">{metric.name}</h3>
          <p className="text-sm text-gray-400">{metric.description}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">SQL Query</h4>
          <pre className="bg-black/50 border border-white/10 rounded-lg p-4 text-xs overflow-x-auto font-mono">
            <code className="text-white">{metric.query}</code>
          </pre>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">Current Value</h4>
          <div className="text-4xl font-bold">{metric.currentValue.toLocaleString()}</div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">7-Day History</h4>
          <div className="h-48 bg-black/50 border border-white/10 rounded-lg p-4">
            <PremiumLineChart data={metric.history} />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">Anomaly Rules</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-3 bg-white/5 border border-white/10 rounded-lg">
              <span>Critical</span>
              <span className="text-red-500">&gt; 20% deviation</span>
            </div>
            <div className="flex items-center justify-between text-sm p-3 bg-white/5 border border-white/10 rounded-lg">
              <span>Warning</span>
              <span className="text-yellow-500">10-20% deviation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alerts View Component (Simplified for space)
function AlertsView({ notifications, setNotifications, alerts }) {
  const updateNotification = (channel, field, value) => {
    setNotifications(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value }
    }));
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <h1 className="text-2xl font-semibold mb-1">Alerts & Notifications</h1>
        <p className="text-sm text-gray-400">Configure where anomaly alerts are sent</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6 fade-in">
          <div className="glass border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold">Slack</h3>
                  <p className="text-xs text-gray-400">Send alerts to Slack channel</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.slack.active}
                  onChange={(e) => updateNotification('slack', 'active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-white transition-all"></div>
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full peer-checked:translate-x-5 transition-transform"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Webhook URL</label>
                <input
                  type="text"
                  value={notifications.slack.webhookUrl}
                  onChange={(e) => updateNotification('slack', 'webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                />
              </div>
            </div>
          </div>
          
          <div className="glass border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Alert History</h3>
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No alerts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>{alert.metric}</span>
                    <span className="text-xs text-gray-400">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Tab Bar Component
function MobileTabBar({ activeView, setActiveView }) {
  const tabs = [
    { id: 'chat', icon: MessageSquare },
    { id: 'metrics', icon: Activity },
    { id: 'alerts', icon: Bell },
    { id: 'schema', icon: Database },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 px-2 py-2 flex justify-around z-50">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
              activeView === tab.id
                ? 'bg-white text-black'
                : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
          </button>
        );
      })}
    </div>
  );
}

export default App;
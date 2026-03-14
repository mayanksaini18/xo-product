import { useState, useEffect, useRef } from "react";

// Constants
const API_KEY = 'sk-emergent-cEd44295e39AeF6A2F';
const MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = "You are an AI-powered Product Metrics Tracking Assistant embedded in a product analytics tool. Your job is to translate natural language product questions into SQL queries, detect anomalies in metrics, suggest insights, and help configure automated metric tracking. When you provide SQL queries, wrap them in ```sql code blocks. When suggesting follow-up questions, prefix them with emoji numbers like 1️⃣, 2️⃣, 3️⃣. When you identify a trackable metric, include a JSON block with a tracking_id field.";

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

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
};

const formatTimestamp = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Simple Line Chart Component (fallback without Recharts)
function SimpleLineChart({ data }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get values
    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // Draw line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }, [data]);
  
  return <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />;
}

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
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const generateSparklineData = (baseValue, points) => {
    return Array.from({ length: points }, (_, i) => ({
      value: baseValue * (0.85 + Math.random() * 0.3)
    }));
  };
  
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#21253a;color:#e5e7eb;padding:12px 20px;border-radius:8px;border:1px solid #2d3148;z-index:9999;animation:fadeIn 0.3s;';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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
        lastChecked: new Date(),
        history: generateSparklineData(12450, 24)
      }
    ];
    
    setTrackedMetrics(sampleMetrics);
    showToast('Demo mode loaded with sample schema and metrics');
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
    } finally {
      setIsStreaming(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(inputValue);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.querySelector('textarea')?.focus();
    }
  };
  
  return (
    <div className="flex h-screen bg-[#0f1117] text-[#e5e7eb] overflow-hidden">
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
      
      {/* Mobile Bottom Tabs */}
      {isMobile && (
        <MobileTabBar activeView={activeView} setActiveView={setActiveView} />
      )}
    </div>
  );
}

// Sidebar Component
function Sidebar({ activeView, setActiveView, schema }) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'metrics', label: 'Tracked Metrics', icon: '📊' },
    { id: 'alerts', label: 'Alerts & Notifications', icon: '🔔' },
    { id: 'schema', label: 'Schema Manager', icon: '🗄️' },
  ];
  
  return (
    <div className="w-60 bg-[#1a1d27] border-r border-[#2d3148] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#2d3148]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-lg flex items-center justify-center text-lg">
            📈
          </div>
          <span className="text-lg font-semibold">PulseTrack</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeView === item.id
                ? 'bg-[#6366f1] text-white'
                : 'text-[#9ca3af] hover:bg-[#21253a] hover:text-[#e5e7eb]'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      {/* Bottom Section */}
      <div className="p-4 border-t border-[#2d3148] space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
          <span className="text-[#9ca3af]">Connected to Claude</span>
        </div>
        
        <div className="px-3 py-2 bg-[#21253a] border border-[#2d3148] rounded-lg">
          <div className="text-xs font-medium text-[#9ca3af]">Schema Status</div>
          <div className="text-sm font-semibold mt-0.5">
            {schema.tables.length > 0 ? (
              <span className="text-[#10b981]">✓ {schema.tables.length} tables loaded</span>
            ) : (
              <span className="text-[#6b7280]">No schema loaded</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat View Component
function ChatView({ messages, isStreaming, inputValue, setInputValue, sendMessage, handleKeyDown, schema, setActiveView, loadDemoMode }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#2d3148]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Ask anything about your product</h1>
            <p className="text-sm text-[#9ca3af]">Natural language → SQL → Insights</p>
          </div>
          <div>
            {schema.tables.length > 0 ? (
              <span className="px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full text-xs font-medium">
                ✓ Schema loaded — {schema.tables.length} tables
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20 rounded-full text-xs font-medium">
                No schema loaded
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
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} sendMessage={sendMessage} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="px-8 py-6 border-t border-[#2d3148]">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3 bg-[#1a1d27] border border-[#2d3148] rounded-xl p-3 focus-within:border-[#6366f1] transition-colors">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your metrics… e.g. 'Did error rate spike after the deploy?'"
              className="flex-1 bg-transparent text-[#e5e7eb] placeholder-[#6b7280] outline-none text-sm max-h-24 min-h-[40px] resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? '...' : 'Send'}
            </button>
          </div>
          <div className="text-xs text-[#6b7280] mt-2 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-[#21253a] border border-[#2d3148] rounded">⌘ + Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-[#21253a] border border-[#2d3148] rounded">⌘ + K</kbd> to focus
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
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">
          📊
        </div>
        <h2 className="text-2xl font-semibold mb-2">Track your feature's impact</h2>
        <p className="text-[#9ca3af] mb-6">
          Paste your SQL schema to start analyzing your product metrics with AI.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveView('schema')}
            className="px-6 py-3 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#5558e3] transition-colors"
          >
            Load SQL Schema →
          </button>
          <button
            onClick={loadDemoMode}
            className="px-6 py-3 bg-[#21253a] text-[#e5e7eb] border border-[#2d3148] rounded-lg font-medium hover:bg-[#2a2f42] transition-colors"
          >
            Try with sample schema
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Component
function Message({ message, sendMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[#6366f1] text-white px-4 py-3 rounded-2xl rounded-tr-sm">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div className="text-xs opacity-70 mt-1">{formatTimestamp(message.timestamp)}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-[#21253a] border border-[#2d3148] px-5 py-4 rounded-2xl rounded-tl-sm">
        <RichMessageContent content={message.content} sendMessage={sendMessage} />
        {message.isStreaming && <span className="inline-block w-2 h-4 bg-[#6366f1] animate-pulse ml-1">▊</span>}
        <div className="text-xs text-[#6b7280] mt-2">{formatTimestamp(message.timestamp)}</div>
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
    <div className="space-y-3">
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
    <div className="relative my-3">
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-[#0f1117] border-b border-[#2d3148]">
          <span className="text-xs font-medium text-[#9ca3af]">SQL</span>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 bg-[#21253a] text-[#e5e7eb] border border-[#2d3148] rounded hover:bg-[#2a2f42] transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy SQL'}
          </button>
        </div>
        <pre className="p-4 text-xs overflow-x-auto">
          <code className="text-[#e5e7eb] font-mono">{sql}</code>
        </pre>
      </div>
    </div>
  );
}

// JSON Block Component
function JSONBlock({ json }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-3 py-2 bg-[#1a1d27] border border-[#2d3148] rounded-lg text-xs font-medium text-[#9ca3af] hover:bg-[#21253a] transition-colors"
      >
        {isExpanded ? '▼' : '▶'} JSON Data
      </button>
      {isExpanded && (
        <pre className="mt-2 p-4 bg-[#1a1d27] border border-[#2d3148] rounded-lg text-xs overflow-x-auto">
          <code className="text-[#e5e7eb]">{json}</code>
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
    <div className="text-sm text-[#e5e7eb] space-y-2">
      {parts.map((part, idx) => {
        if (/^[1-3]️⃣/.test(part)) {
          return (
            <button
              key={idx}
              onClick={() => sendMessage(part.replace(/^[1-3]️⃣\s*/, ''))}
              className="block w-full text-left px-3 py-2 bg-[#1a1d27] border border-[#2d3148] rounded-lg text-xs hover:bg-[#21253a] hover:border-[#6366f1] transition-colors"
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

// Schema View Component (continued in next part due to length)
function SchemaView({ schema, schemaInput, setSchemaInput, analyzeSchema, loadDemoMode }) {
  const handleLoadSchema = () => {
    if (schemaInput.trim()) {
      analyzeSchema(schemaInput);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-[#2d3148]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">SQL Schema</h1>
            <p className="text-sm text-[#9ca3af]">Paste CREATE TABLE statements</p>
          </div>
          <div>
            {schema.tables.length > 0 ? (
              <span className="px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full text-xs font-medium">
                Loaded
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20 rounded-full text-xs font-medium">
                Not loaded
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {schema.tables.length === 0 ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Schema SQL</label>
                  <span className={`text-xs ${schemaInput.length > 10000 ? 'text-[#f59e0b]' : 'text-[#6b7280]'}`}>
                    {schemaInput.length} characters {schemaInput.length > 10000 && '(⚠️ Large schema)'}
                  </span>
                </div>
                <textarea
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                  placeholder={`CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email TEXT,\n  created_at TIMESTAMP\n);`}
                  className="w-full h-96 bg-[#1a1d27] border border-[#2d3148] rounded-lg px-4 py-3 text-sm font-mono text-[#e5e7eb] placeholder-[#6b7280] outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleLoadSchema}
                  disabled={!schemaInput.trim()}
                  className="px-6 py-3 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#5558e3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Load Schema
                </button>
                <button
                  onClick={loadDemoMode}
                  className="px-6 py-3 bg-[#21253a] text-[#e5e7eb] border border-[#2d3148] rounded-lg font-medium hover:bg-[#2a2f42] transition-colors"
                >
                  Load Sample Schema
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Loaded Schema</h2>
                <button
                  onClick={() => {
                    setSchemaInput('');
                    analyzeSchema('');
                  }}
                  className="px-4 py-2 bg-[#21253a] text-[#e5e7eb] border border-[#2d3148] rounded-lg text-sm font-medium hover:bg-[#2a2f42] transition-colors"
                >
                  Change Schema
                </button>
              </div>
              
              <details className="bg-[#1a1d27] border border-[#2d3148] rounded-lg">
                <summary className="px-4 py-3 cursor-pointer font-medium text-sm hover:bg-[#21253a] transition-colors">
                  Raw Schema SQL
                </summary>
                <pre className="px-4 py-3 border-t border-[#2d3148] text-xs font-mono text-[#9ca3af] overflow-x-auto">
                  {schema.raw}
                </pre>
              </details>
              
              <div>
                <h3 className="text-base font-semibold mb-3">Tables</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schema.tables.map(table => (
                    <div key={table.name} className="bg-[#21253a] border border-[#2d3148] rounded-lg p-4">
                      <h4 className="font-semibold mb-3">{table.name}</h4>
                      <div className="space-y-2">
                        {table.columns.map(col => (
                          <div key={col.name} className="flex items-center justify-between text-xs">
                            <span className="text-[#e5e7eb]">
                              {col.name}
                              {col.isPrimary && <span className="ml-2 px-1.5 py-0.5 bg-[#6366f1]/20 text-[#6366f1] rounded text-[10px]">PK</span>}
                              {col.isForeign && <span className="ml-2 px-1.5 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded text-[10px]">FK</span>}
                            </span>
                            <span className="text-[#9ca3af] font-mono">{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {schema.relationships.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold mb-3">Relationships</h3>
                  <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-4 space-y-2">
                    {schema.relationships.map((rel, idx) => (
                      <div key={idx} className="text-sm text-[#e5e7eb]">
                        <code className="text-[#6366f1]">{rel.from}</code>.<code>{rel.column}</code> → <code className="text-[#10b981]">{rel.to}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
        <div className="px-8 py-6 border-b border-[#2d3148]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Tracked Metrics</h1>
              <p className="text-sm text-[#9ca3af]">Metrics running on scheduled checks with anomaly detection</p>
            </div>
            <button
              onClick={handleAddMetric}
              className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e3] transition-colors"
            >
              + Add Metric
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {trackedMetrics.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No tracked metrics yet</h3>
                <p className="text-[#9ca3af] mb-4">Start tracking metrics to monitor your product's health automatically.</p>
                <button
                  onClick={handleAddMetric}
                  className="px-6 py-3 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#5558e3] transition-colors"
                >
                  Add Your First Metric
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
              {trackedMetrics.map(metric => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onSelect={() => setSelectedMetric(metric)}
                  onDelete={() => handleDeleteMetric(metric.id)}
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

// Metric Card Component
function MetricCard({ metric, onSelect, onDelete }) {
  const statusColors = {
    ok: 'bg-[#10b981]',
    warning: 'bg-[#f59e0b]',
    critical: 'bg-[#ef4444]'
  };
  
  return (
    <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-5 hover:border-[#6366f1] transition-colors cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[metric.status]}`}></span>
          <h3 className="font-semibold">{metric.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-[#1a1d27] border border-[#2d3148] rounded text-xs text-[#9ca3af]">
            {metric.interval}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-2 py-1 text-xs text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      
      <p className="text-sm text-[#9ca3af] mb-4">{metric.description}</p>
      
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-2xl font-bold">
            {typeof metric.currentValue === 'number' 
              ? metric.currentValue.toLocaleString() 
              : metric.currentValue}
          </div>
          <div className="text-xs text-[#9ca3af] mt-1">
            Last checked {formatTimestamp(metric.lastChecked)}
          </div>
        </div>
        <div className={`text-lg ${metric.trend === 'up' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {metric.trend === 'up' ? '↗' : '↘'}
        </div>
      </div>
      
      <div className="h-16">
        <SimpleLineChart data={metric.history} />
      </div>
    </div>
  );
}

// Metric Detail Panel Component
function MetricDetailPanel({ metric, onClose }) {
  return (
    <div className="w-96 bg-[#1a1d27] border-l border-[#2d3148] overflow-y-auto">
      <div className="p-6 border-b border-[#2d3148] flex items-center justify-between">
        <h2 className="text-lg font-semibold">Metric Details</h2>
        <button
          onClick={onClose}
          className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-2">{metric.name}</h3>
          <p className="text-sm text-[#9ca3af]">{metric.description}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2 text-[#9ca3af]">SQL Query</h4>
          <pre className="bg-[#0f1117] border border-[#2d3148] rounded-lg p-3 text-xs overflow-x-auto">
            <code>{metric.query}</code>
          </pre>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2 text-[#9ca3af]">Current Value</h4>
          <div className="text-3xl font-bold">{metric.currentValue.toLocaleString()}</div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-3 text-[#9ca3af]">7-Day History</h4>
          <div className="h-48 bg-[#0f1117] border border-[#2d3148] rounded-lg p-3">
            <SimpleLineChart data={metric.history} />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2 text-[#9ca3af]">Anomaly Rules</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-2 bg-[#0f1117] border border-[#2d3148] rounded">
              <span>Critical</span>
              <span className="text-[#ef4444]">&gt; 20% deviation</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 bg-[#0f1117] border border-[#2d3148] rounded">
              <span>Warning</span>
              <span className="text-[#f59e0b]">10-20% deviation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alerts View Component
function AlertsView({ notifications, setNotifications, alerts }) {
  const updateNotification = (channel, field, value) => {
    setNotifications(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value }
    }));
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-[#2d3148]">
        <h1 className="text-2xl font-semibold mb-1">Notifications</h1>
        <p className="text-sm text-[#9ca3af]">Configure where anomaly alerts are sent</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4a154b] rounded-lg flex items-center justify-center text-xl">
                  📢
                </div>
                <div>
                  <h3 className="font-semibold">Slack</h3>
                  <p className="text-xs text-[#9ca3af]">Send alerts to Slack channel</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.slack.active}
                  onChange={(e) => updateNotification('slack', 'active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1a1d27] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6366f1]"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Webhook URL</label>
                <input
                  type="text"
                  value={notifications.slack.webhookUrl}
                  onChange={(e) => updateNotification('slack', 'webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-[#1a1d27] border border-[#2d3148] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Default Channel</label>
                <input
                  type="text"
                  value={notifications.slack.channel}
                  onChange={(e) => updateNotification('slack', 'channel', e.target.value)}
                  placeholder="#product-alerts"
                  className="w-full bg-[#1a1d27] border border-[#2d3148] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
              <button className="px-4 py-2 bg-[#1a1d27] border border-[#2d3148] rounded-lg text-sm hover:bg-[#21253a] transition-colors">
                Test Connection
              </button>
            </div>
          </div>
          
          <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0066cc] rounded-lg flex items-center justify-center text-xl">
                  ✉️
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-xs text-[#9ca3af]">Send alerts via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email.active}
                  onChange={(e) => updateNotification('email', 'active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1a1d27] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6366f1]"></div>
              </label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Email Addresses</label>
                <input
                  type="text"
                  value={notifications.email.addresses}
                  onChange={(e) => updateNotification('email', 'addresses', e.target.value)}
                  placeholder="alerts@company.com, pm@company.com"
                  className="w-full bg-[#1a1d27] border border-[#2d3148] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Severity Filter</label>
                <select
                  value={notifications.email.filter}
                  onChange={(e) => updateNotification('email', 'filter', e.target.value)}
                  className="w-full bg-[#1a1d27] border border-[#2d3148] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#6366f1] transition-colors"
                >
                  <option value="all">All alerts</option>
                  <option value="critical">Critical only</option>
                  <option value="warning">Warning and above</option>
                </select>
              </div>
              <button className="px-4 py-2 bg-[#1a1d27] border border-[#2d3148] rounded-lg text-sm hover:bg-[#21253a] transition-colors">
                Send Test Email
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Alert Rules</h3>
            <div className="space-y-3">
              <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                      Critical
                    </div>
                    <p className="text-sm text-[#9ca3af] mt-1">Deviation &gt; 20%</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-20 bg-[#1a1d27] border border-[#2d3148] rounded px-2 py-1 text-sm text-center"
                  />
                </div>
              </div>
              
              <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                      Warning
                    </div>
                    <p className="text-sm text-[#9ca3af] mt-1">Deviation 10-20%</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-20 bg-[#1a1d27] border border-[#2d3148] rounded px-2 py-1 text-sm text-center"
                  />
                </div>
              </div>
              
              <div className="bg-[#21253a] border border-[#2d3148] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                      Info
                    </div>
                    <p className="text-sm text-[#9ca3af] mt-1">Any change detected</p>
                  </div>
                  <span className="text-sm text-[#9ca3af]">Always on</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Alert History</h3>
            <div className="bg-[#21253a] border border-[#2d3148] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1a1d27] border-b border-[#2d3148]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[#9ca3af]">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-[#9ca3af]">Metric</th>
                    <th className="text-left px-4 py-3 font-medium text-[#9ca3af]">Severity</th>
                    <th className="text-left px-4 py-3 font-medium text-[#9ca3af]">Channel</th>
                    <th className="text-left px-4 py-3 font-medium text-[#9ca3af]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#6b7280]">
                        No alerts yet
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert, idx) => (
                      <tr key={idx} className="border-b border-[#2d3148] last:border-0">
                        <td className="px-4 py-3">{formatTimestamp(alert.timestamp)}</td>
                        <td className="px-4 py-3">{alert.metric}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            alert.severity === 'critical' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                            alert.severity === 'warning' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                            'bg-[#10b981]/20 text-[#10b981]'
                          }`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">{alert.channel}</td>
                        <td className="px-4 py-3">{alert.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Tab Bar Component
function MobileTabBar({ activeView, setActiveView }) {
  const tabs = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'metrics', icon: '📊', label: 'Metrics' },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'schema', icon: '🗄️', label: 'Schema' },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1d27] border-t border-[#2d3148] px-2 py-1 flex justify-around z-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            activeView === tab.id
              ? 'bg-[#6366f1] text-white'
              : 'text-[#9ca3af]'
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default App;

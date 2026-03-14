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
  X,
  Play,
  Pause,
  Trash2,
  Plus,
  BarChart3,
  Settings,
  Check,
  AlertCircle
} from 'lucide-react';
import "@/App.css";
import { mockDbConnections, mockMonitors, mockAlerts, generateDetailedMonitorResults } from './mockData';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Enable mock mode for demo/testing
const USE_MOCK_DATA = true;

// Utility Functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const copyToClipboard = (text) => navigator.clipboard.writeText(text);
const formatTimestamp = (date) => {
  if (!date) return 'Never';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
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
    
    const values = data.map(d => typeof d === 'object' ? d.value : d);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    
    // Draw gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    
    ctx.beginPath();
    values.forEach((value, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
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
    values.forEach((value, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
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
  const [activeView, setActiveView] = useState('connections');
  const [dbConnections, setDbConnections] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  useEffect(() => {
    loadDbConnections();
    loadMonitors();
    loadAlerts();
  }, []);
  
  const loadDbConnections = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Load mock data for demo
        setDbConnections(mockDbConnections);
        return;
      }
      
      const res = await fetch(`${API}/db-connections`);
      const data = await res.json();
      setDbConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
      // Fallback to mock data if API fails
      if (USE_MOCK_DATA) {
        setDbConnections(mockDbConnections);
      }
    }
  };
  
  const loadMonitors = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Load mock data for demo
        setMonitors(mockMonitors);
        return;
      }
      
      const res = await fetch(`${API}/monitors`);
      const data = await res.json();
      setMonitors(data);
    } catch (error) {
      console.error('Failed to load monitors:', error);
      // Fallback to mock data if API fails
      if (USE_MOCK_DATA) {
        setMonitors(mockMonitors);
      }
    }
  };
  
  const loadAlerts = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Load mock data for demo
        setAlerts(mockAlerts);
        return;
      }
      
      const res = await fetch(`${API}/alerts`);
      const data = await res.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      // Fallback to mock data if API fails
      if (USE_MOCK_DATA) {
        setAlerts(mockAlerts);
      }
    }
  };
  
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        dbConnections={dbConnections}
        monitors={monitors}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'connections' && (
          <ConnectionsView
            dbConnections={dbConnections}
            loadDbConnections={loadDbConnections}
            showToast={showToast}
            setSelectedConnection={setSelectedConnection}
          />
        )}
        
        {activeView === 'create-monitor' && (
          <CreateMonitorView
            dbConnections={dbConnections}
            loadMonitors={loadMonitors}
            showToast={showToast}
            setActiveView={setActiveView}
          />
        )}
        
        {activeView === 'monitors' && (
          <MonitorsView
            monitors={monitors}
            loadMonitors={loadMonitors}
            showToast={showToast}
            setSelectedMonitor={setSelectedMonitor}
          />
        )}
        
        {activeView === 'alerts' && (
          <AlertsView
            alerts={alerts}
            loadAlerts={loadAlerts}
          />
        )}
        
        {activeView === 'reports' && (
          <ReportsView
            monitors={monitors}
          />
        )}
      </div>
      
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
function Sidebar({ activeView, setActiveView, dbConnections, monitors }) {
  const navItems = [
    { id: 'connections', label: 'Database', icon: Database },
    { id: 'create-monitor', label: 'Create Monitor', icon: Plus },
    { id: 'monitors', label: 'Active Monitors', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];
  
  return (
    <div className="w-60 h-full flex flex-col glass border-r border-white/10">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">PulseTrack</div>
            <div className="text-xs text-gray-500">Feature Monitor</div>
          </div>
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
        <div className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs font-medium text-gray-400 mb-1">Status</div>
          <div className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-white">{dbConnections.length} databases</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green-500">{monitors.filter(m => m.status === 'active').length} active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Database Connections View
function ConnectionsView({ dbConnections, loadDbConnections, showToast, setSelectedConnection }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'postgres',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/db-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Connection failed');
      }
      
      const data = await res.json();
      showToast(`Connected to ${data.name}! Found ${data.tables.length} tables`, 'success');
      setShowForm(false);
      loadDbConnections();
      
      // Reset form
      setFormData({
        name: '',
        db_type: 'postgres',
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: ''
      });
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Database Connections</h1>
            <p className="text-sm text-gray-400">Connect to your product database to start monitoring</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-hover px-4 py-2 bg-white text-black rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            Add Database
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {showForm && (
            <div className="glass border border-white/10 rounded-xl p-6 fade-in">
              <h3 className="text-lg font-semibold mb-4">Add Database Connection</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Connection Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Production Database"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Database Type</label>
                  <select
                    value={formData.db_type}
                    onChange={(e) => setFormData({
                      ...formData, 
                      db_type: e.target.value,
                      port: e.target.value === 'postgres' ? 5432 : 3306
                    })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                  >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Host</label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({...formData, host: e.target.value})}
                      placeholder="localhost"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Port</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Database Name</label>
                  <input
                    type="text"
                    value={formData.database}
                    onChange={(e) => setFormData({...formData, database: e.target.value})}
                    placeholder="myapp_production"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-hover px-6 py-2.5 bg-white text-black rounded-lg font-medium disabled:opacity-30 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Connect Database
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-hover px-6 py-2.5 bg-white/5 text-white border border-white/10 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {dbConnections.length === 0 && !showForm ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md fade-in">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">No databases connected</h3>
                <p className="text-gray-400 mb-6">Connect your first database to start monitoring product metrics.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium"
                >
                  Add Database Connection
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {dbConnections.map((conn, idx) => (
                <div key={conn.id} className="card-hover glass border border-white/10 rounded-xl p-6 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <Database size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{conn.name}</h3>
                        <p className="text-sm text-gray-400">{conn.db_type.toUpperCase()} • {conn.host}:{conn.database}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                        Connected
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    Added {formatTimestamp(conn.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Monitor View - CONTINUED IN NEXT MESSAGE
function CreateMonitorView({ dbConnections, loadMonitors, showToast, setActiveView }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    db_connection_id: '',
    natural_language: '',
    sql_query: '',
    interval: 'hourly',
    alert_condition: '',
    alert_threshold: '',
    slack_webhook: ''
  });
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleGenerateSQL = async () => {
    if (!formData.natural_language || !formData.db_connection_id) {
      showToast('Please select a database and enter a monitoring request', 'warning');
      return;
    }
    
    setGenerating(true);
    try {
      // The backend will generate SQL automatically when creating monitor
      setGeneratedSQL('SQL will be generated automatically...');
      setStep(2);
    } catch (error) {
      showToast('Failed to proceed', 'error');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        alert_threshold: formData.alert_threshold ? parseFloat(formData.alert_threshold) : null
      };
      
      const res = await fetch(`${API}/monitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create monitor');
      }
      
      const data = await res.json();
      showToast(`Monitor "${data.name}" created successfully!`, 'success');
      loadMonitors();
      setActiveView('monitors');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        db_connection_id: '',
        natural_language: '',
        sql_query: '',
        interval: 'hourly',
        alert_condition: '',
        alert_threshold: '',
        slack_webhook: ''
      });
      setStep(1);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <h1 className="text-2xl font-semibold mb-1">Create Monitor</h1>
        <p className="text-sm text-gray-400">Describe what you want to monitor in natural language</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Step 1: Basic Info & Natural Language */}
          <div className="glass border border-white/10 rounded-xl p-6 fade-in">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold">Monitor Details</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Monitor Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Daily Signups"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Track daily user signups"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Select Database</label>
                <select
                  value={formData.db_connection_id}
                  onChange={(e) => setFormData({...formData, db_connection_id: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                >
                  <option value="">Choose a database...</option>
                  {dbConnections.map(conn => (
                    <option key={conn.id} value={conn.id}>{conn.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">What do you want to monitor?</label>
                <textarea
                  value={formData.natural_language}
                  onChange={(e) => setFormData({...formData, natural_language: e.target.value})}
                  placeholder="Track daily signups&#10;Monitor checkout conversion rate&#10;Check if payment failures increased&#10;Alert me if churn increases by more than 5%"
                  className="w-full h-32 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-white/30 transition-all resize-none"
                />
                <div className="text-xs text-gray-500 mt-2">
                  Describe in plain English what metric you want to track
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 2: Schedule & Alerts */}
          {step >= 2 && (
            <div className="glass border border-white/10 rounded-xl p-6 fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Schedule & Alerts</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Check Interval</label>
                  <select
                    value={formData.interval}
                    onChange={(e) => setFormData({...formData, interval: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                  >
                    <option value="10min">Every 10 minutes</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Alert Condition (optional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={formData.alert_condition}
                      onChange={(e) => setFormData({...formData, alert_condition: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                    >
                      <option value="">No alerts</option>
                      <option value="above">Above threshold</option>
                      <option value="below">Below threshold</option>
                    </select>
                    <input
                      type="number"
                      value={formData.alert_threshold}
                      onChange={(e) => setFormData({...formData, alert_threshold: e.target.value})}
                      placeholder="Threshold value"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                      disabled={!formData.alert_condition}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Slack Webhook (optional)</label>
                  <input
                    type="text"
                    value={formData.slack_webhook}
                    onChange={(e) => setFormData({...formData, slack_webhook: e.target.value})}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {step === 1 ? (
              <button
                onClick={handleGenerateSQL}
                disabled={!formData.natural_language || !formData.db_connection_id || generating}
                className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium disabled:opacity-30 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-hover px-6 py-3 bg-white text-black rounded-lg font-medium disabled:opacity-30 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating Monitor...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Create Monitor
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="btn-hover px-6 py-3 bg-white/5 text-white border border-white/10 rounded-lg font-medium"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Active Monitors View
function MonitorsView({ monitors, loadMonitors, showToast }) {
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [monitorDetails, setMonitorDetails] = useState(null);
  
  const handlePause = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await fetch(`${API}/monitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Monitor ${newStatus}`, 'success');
      loadMonitors();
    } catch (error) {
      showToast('Failed to update monitor', 'error');
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this monitor?')) return;
    
    try {
      await fetch(`${API}/monitors/${id}`, { method: 'DELETE' });
      showToast('Monitor deleted', 'success');
      loadMonitors();
    } catch (error) {
      showToast('Failed to delete monitor', 'error');
    }
  };
  
  const loadMonitorDetails = async (id) => {
    try {
      if (USE_MOCK_DATA) {
        // Load mock monitor with detailed results
        const monitor = mockMonitors.find(m => m.id === id);
        if (monitor) {
          const detailedMonitor = {
            ...monitor,
            results: generateDetailedMonitorResults(id, 50)
          };
          setMonitorDetails(detailedMonitor);
          setSelectedMonitor(id);
        }
        return;
      }
      
      const res = await fetch(`${API}/monitors/${id}`);
      const data = await res.json();
      setMonitorDetails(data);
      setSelectedMonitor(id);
    } catch (error) {
      console.error('Failed to load monitor details:', error);
      // Fallback to mock data
      if (USE_MOCK_DATA) {
        const monitor = mockMonitors.find(m => m.id === id);
        if (monitor) {
          setMonitorDetails({
            ...monitor,
            results: generateDetailedMonitorResults(id, 50)
          });
          setSelectedMonitor(id);
        }
      }
    }
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
          <h1 className="text-2xl font-semibold mb-1">Active Monitors</h1>
          <p className="text-sm text-gray-400">
            {monitors.length} monitor{monitors.length !== 1 ? 's' : ''} • {monitors.filter(m => m.status === 'active').length} active
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {monitors.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md fade-in">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">No monitors yet</h3>
                <p className="text-gray-400">Create your first monitor to start tracking metrics.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-6xl mx-auto">
              {monitors.map((monitor, idx) => (
                <div 
                  key={monitor.id}
                  className="card-hover glass border border-white/10 rounded-xl p-6 cursor-pointer fade-in"
                  onClick={() => loadMonitorDetails(monitor.id)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${monitor.status === 'active' ? 'text-green-500' : 'text-gray-500'}`}>
                        ●
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{monitor.name}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{monitor.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePause(monitor.id, monitor.status);
                        }}
                        className="btn-hover p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                      >
                        {monitor.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(monitor.id);
                        }}
                        className="btn-hover p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {monitor.last_value ? JSON.stringify(Object.values(monitor.last_value)[0]) : '—'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {monitor.interval} • Last run: {formatTimestamp(monitor.last_run)}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      monitor.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {monitor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Monitor Details Panel */}
      {selectedMonitor && monitorDetails && (
        <div className="w-96 h-full glass border-l border-white/10 overflow-y-auto slide-in">
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 glass">
            <h2 className="text-lg font-semibold">Monitor Details</h2>
            <button
              onClick={() => {
                setSelectedMonitor(null);
                setMonitorDetails(null);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-lg">{monitorDetails.name}</h3>
              <p className="text-sm text-gray-400">{monitorDetails.description}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">SQL Query</h4>
              <pre className="bg-black/50 border border-white/10 rounded-lg p-4 text-xs overflow-x-auto font-mono">
                <code className="text-white">{monitorDetails.sql_query}</code>
              </pre>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3 text-gray-400 uppercase tracking-wider">Recent Results</h4>
              <div className="space-y-2">
                {monitorDetails.results && monitorDetails.results.slice(0, 10).map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm">
                    <span className="text-gray-400">{formatTimestamp(result.timestamp)}</span>
                    <span className="font-mono">{result.result ? JSON.stringify(Object.values(result.result[0])[0]) : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Alerts View
function AlertsView({ alerts, loadAlerts }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <h1 className="text-2xl font-semibold mb-1">Alert History</h1>
        <p className="text-sm text-gray-400">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} triggered</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md fade-in">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">No alerts yet</h3>
                <p className="text-gray-400">Alerts will appear here when thresholds are crossed.</p>
              </div>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div key={alert.id} className="glass border border-yellow-500/20 rounded-xl p-6 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{alert.monitor_name}</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Condition: {alert.condition}
                    </p>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(alert.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Reports View
function ReportsView({ monitors }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <h1 className="text-2xl font-semibold mb-1">Reports</h1>
        <p className="text-sm text-gray-400">Historical data and trends</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20 fade-in">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/20">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-3">Reports Coming Soon</h3>
            <p className="text-gray-400">
              Historical charts and trend analysis will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

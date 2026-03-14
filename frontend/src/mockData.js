// Mock Data for PulseTrack Product Metrics Tracker
// Realistic product analytics test data

export const mockDbConnections = [
  {
    id: 'db_prod_001',
    name: 'Production Database',
    db_type: 'postgres',
    host: 'prod-db.company.com',
    database: 'analytics_prod',
    created_at: '2026-01-15T10:30:00Z'
  },
  {
    id: 'db_staging_002',
    name: 'Staging Database',
    db_type: 'mysql',
    host: 'staging-db.company.com',
    database: 'analytics_staging',
    created_at: '2026-02-01T14:20:00Z'
  }
];

export const mockMonitors = [
  {
    id: 'mon_001',
    name: 'AI Smart Recommendations - Daily Active Users',
    description: 'Track DAU after AI recommendations feature launch',
    interval: 'hourly',
    status: 'active',
    last_run: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    last_value: { daily_active_users: 12450 },
    sql_query: 'SELECT COUNT(DISTINCT user_id) as daily_active_users FROM events WHERE event_timestamp >= CURRENT_DATE AND feature = \'ai_recommendations\'',
    db_connection_id: 'db_prod_001',
    natural_language: 'Track daily active users for AI recommendations feature',
    alert_condition: 'below',
    alert_threshold: 10000,
    slack_webhook: 'https://hooks.slack.com/services/MOCK/WEBHOOK/URL',
    created_at: '2026-03-01T09:00:00Z',
    history: generateMetricHistory(12450, 24, 0.15)
  },
  {
    id: 'mon_002',
    name: 'Checkout Redesign - Conversion Rate',
    description: 'Monitor conversion rate after checkout UI update',
    interval: 'hourly',
    status: 'active',
    last_run: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    last_value: { conversion_rate: 14.2 },
    sql_query: 'SELECT (COUNT(DISTINCT CASE WHEN event_name = \'purchase_completed\' THEN user_id END) * 100.0 / COUNT(DISTINCT user_id)) as conversion_rate FROM events WHERE created_at >= CURRENT_DATE',
    db_connection_id: 'db_prod_001',
    natural_language: 'Track checkout conversion rate',
    alert_condition: 'below',
    alert_threshold: 12,
    created_at: '2026-02-15T11:30:00Z',
    history: generateMetricHistory(14.2, 24, 0.08)
  },
  {
    id: 'mon_003',
    name: 'Mobile App v3.0 - Error Rate',
    description: 'Alert if error rate spikes after mobile app release',
    interval: '10min',
    status: 'active',
    last_run: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    last_value: { error_rate: 1.2 },
    sql_query: 'SELECT (COUNT(*) FILTER (WHERE event_name = \'error\') * 100.0 / COUNT(*)) as error_rate FROM events WHERE event_timestamp >= NOW() - INTERVAL \'1 hour\'',
    db_connection_id: 'db_prod_001',
    natural_language: 'Alert me if error rate spikes above 2%',
    alert_condition: 'above',
    alert_threshold: 2,
    slack_webhook: 'https://hooks.slack.com/services/MOCK/WEBHOOK/URL',
    created_at: '2026-03-10T08:00:00Z',
    history: generateMetricHistory(1.2, 24, 0.3)
  },
  {
    id: 'mon_004',
    name: 'Premium Plan Signups',
    description: 'Track premium subscription conversions',
    interval: 'daily',
    status: 'active',
    last_run: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_value: { premium_signups: 187 },
    sql_query: 'SELECT COUNT(*) as premium_signups FROM subscriptions WHERE plan = \'premium\' AND created_at >= CURRENT_DATE',
    db_connection_id: 'db_prod_001',
    natural_language: 'Track daily premium plan signups',
    alert_condition: 'below',
    alert_threshold: 150,
    created_at: '2026-01-20T10:00:00Z',
    history: generateMetricHistory(187, 30, 0.2)
  },
  {
    id: 'mon_005',
    name: 'Social Sharing Feature - Engagement',
    description: 'Monitor engagement with new social sharing feature',
    interval: 'hourly',
    status: 'active',
    last_run: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    last_value: { engagement_score: 76.5 },
    sql_query: 'SELECT AVG(engagement_duration_seconds) as engagement_score FROM events WHERE feature = \'social_sharing\' AND event_timestamp >= CURRENT_DATE',
    db_connection_id: 'db_prod_001',
    natural_language: 'Monitor engagement with social sharing feature',
    alert_condition: 'below',
    alert_threshold: 60,
    created_at: '2026-02-28T15:00:00Z',
    history: generateMetricHistory(76.5, 24, 0.12)
  },
  {
    id: 'mon_006',
    name: 'Payment Gateway Integration - Success Rate',
    description: 'Track payment success rate after new gateway integration',
    interval: 'hourly',
    status: 'active',
    last_run: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    last_value: { success_rate: 97.8 },
    sql_query: 'SELECT (COUNT(*) FILTER (WHERE status = \'success\') * 100.0 / COUNT(*)) as success_rate FROM payments WHERE created_at >= NOW() - INTERVAL \'1 day\'',
    db_connection_id: 'db_prod_001',
    natural_language: 'Track payment success rate',
    alert_condition: 'below',
    alert_threshold: 95,
    slack_webhook: 'https://hooks.slack.com/services/MOCK/WEBHOOK/URL',
    created_at: '2026-03-05T12:00:00Z',
    history: generateMetricHistory(97.8, 24, 0.02)
  },
  {
    id: 'mon_007',
    name: 'Dark Mode Feature - User Retention',
    description: 'Check retention rate for users using dark mode',
    interval: 'daily',
    status: 'active',
    last_run: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    last_value: { retention_rate: 62.3 },
    sql_query: 'SELECT (COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE dark_mode_enabled = true)) as retention_rate FROM events WHERE user_id IN (SELECT id FROM users WHERE dark_mode_enabled = true) AND event_timestamp >= CURRENT_DATE - INTERVAL \'7 days\'',
    db_connection_id: 'db_prod_001',
    natural_language: 'Track retention rate for dark mode users',
    alert_condition: 'below',
    alert_threshold: 55,
    created_at: '2026-02-10T09:30:00Z',
    history: generateMetricHistory(62.3, 30, 0.1)
  },
  {
    id: 'mon_008',
    name: 'Onboarding Flow v2 - Completion Rate',
    description: 'Monitor completion rate of new onboarding flow',
    interval: 'hourly',
    status: 'paused',
    last_run: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    last_value: { completion_rate: 82.4 },
    sql_query: 'SELECT (COUNT(DISTINCT user_id) FILTER (WHERE event_name = \'onboarding_completed\') * 100.0 / COUNT(DISTINCT user_id) FILTER (WHERE event_name = \'onboarding_started\')) as completion_rate FROM events WHERE created_at >= CURRENT_DATE',
    db_connection_id: 'db_staging_002',
    natural_language: 'Track onboarding completion rate',
    alert_condition: 'below',
    alert_threshold: 75,
    created_at: '2026-03-08T14:00:00Z',
    history: generateMetricHistory(82.4, 24, 0.05)
  }
];

export const mockAlerts = [
  {
    id: 'alert_001',
    monitor_id: 'mon_003',
    monitor_name: 'Mobile App v3.0 - Error Rate',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    condition: 'above 2',
    result: [{ error_rate: 2.4 }]
  },
  {
    id: 'alert_002',
    monitor_id: 'mon_002',
    monitor_name: 'Checkout Redesign - Conversion Rate',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    condition: 'below 12',
    result: [{ conversion_rate: 11.8 }]
  },
  {
    id: 'alert_003',
    monitor_id: 'mon_001',
    monitor_name: 'AI Smart Recommendations - Daily Active Users',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    condition: 'below 10000',
    result: [{ daily_active_users: 9876 }]
  },
  {
    id: 'alert_004',
    monitor_id: 'mon_006',
    monitor_name: 'Payment Gateway Integration - Success Rate',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    condition: 'below 95',
    result: [{ success_rate: 94.2 }]
  }
];

export const mockFeatureReleases = [
  {
    id: 'feature_001',
    featureName: 'AI Smart Recommendations',
    releaseDate: '2026-03-01',
    activeUsers: 12450,
    dailyActiveUsers: 8734,
    retentionRate: 62,
    churnRate: 8,
    conversionRate: 14,
    errorRate: 1.2,
    revenueImpact: 5400,
    engagementScore: 78,
    description: 'AI-powered product recommendations based on user behavior',
    status: 'live',
    category: 'ML/AI'
  },
  {
    id: 'feature_002',
    featureName: 'Checkout Redesign',
    releaseDate: '2026-02-15',
    activeUsers: 18920,
    dailyActiveUsers: 12450,
    retentionRate: 68,
    churnRate: 6,
    conversionRate: 18.5,
    errorRate: 0.8,
    revenueImpact: 12300,
    engagementScore: 82,
    description: 'Streamlined checkout flow with one-click purchase',
    status: 'live',
    category: 'E-commerce'
  },
  {
    id: 'feature_003',
    featureName: 'Mobile App v3.0',
    releaseDate: '2026-03-10',
    activeUsers: 24567,
    dailyActiveUsers: 16234,
    retentionRate: 71,
    churnRate: 5,
    conversionRate: 16.2,
    errorRate: 1.4,
    revenueImpact: 8900,
    engagementScore: 85,
    description: 'Complete mobile app redesign with improved performance',
    status: 'live',
    category: 'Mobile'
  },
  {
    id: 'feature_004',
    featureName: 'Premium Plan Upgrade',
    releaseDate: '2026-01-20',
    activeUsers: 9823,
    dailyActiveUsers: 6123,
    retentionRate: 89,
    churnRate: 3,
    conversionRate: 22.7,
    errorRate: 0.3,
    revenueImpact: 28900,
    engagementScore: 92,
    description: 'New premium tier with advanced features',
    status: 'live',
    category: 'Monetization'
  },
  {
    id: 'feature_005',
    featureName: 'Social Sharing Integration',
    releaseDate: '2026-02-28',
    activeUsers: 15678,
    dailyActiveUsers: 9876,
    retentionRate: 58,
    churnRate: 11,
    conversionRate: 9.8,
    errorRate: 2.1,
    revenueImpact: 3200,
    engagementScore: 65,
    description: 'Share content directly to social media platforms',
    status: 'live',
    category: 'Social'
  },
  {
    id: 'feature_006',
    featureName: 'Payment Gateway Integration',
    releaseDate: '2026-03-05',
    activeUsers: 22341,
    dailyActiveUsers: 14567,
    retentionRate: 73,
    churnRate: 4,
    conversionRate: 19.3,
    errorRate: 0.9,
    revenueImpact: 15600,
    engagementScore: 88,
    description: 'New payment gateway with lower fees and faster processing',
    status: 'live',
    category: 'Payments'
  },
  {
    id: 'feature_007',
    featureName: 'Dark Mode Theme',
    releaseDate: '2026-02-10',
    activeUsers: 31245,
    dailyActiveUsers: 19823,
    retentionRate: 76,
    churnRate: 4,
    conversionRate: 15.7,
    errorRate: 0.5,
    revenueImpact: 7800,
    engagementScore: 90,
    description: 'System-wide dark mode with custom themes',
    status: 'live',
    category: 'UI/UX'
  },
  {
    id: 'feature_008',
    featureName: 'Onboarding Flow v2',
    releaseDate: '2026-03-08',
    activeUsers: 8934,
    dailyActiveUsers: 6234,
    retentionRate: 82,
    churnRate: 7,
    conversionRate: 28.4,
    errorRate: 1.6,
    revenueImpact: 4500,
    engagementScore: 86,
    description: 'Interactive onboarding with personalized setup wizard',
    status: 'testing',
    category: 'Onboarding'
  }
];

// Helper function to generate realistic metric history with variations
function generateMetricHistory(baseValue, points, volatility = 0.1) {
  const history = [];
  let currentValue = baseValue;
  
  for (let i = points; i > 0; i--) {
    // Add random variation
    const change = (Math.random() - 0.5) * 2 * volatility * baseValue;
    currentValue = Math.max(baseValue * (1 - volatility * 2), Math.min(baseValue * (1 + volatility * 2), currentValue + change));
    
    history.unshift({
      value: parseFloat(currentValue.toFixed(2)),
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
    });
  }
  
  return history;
}

// Detailed monitor results for history
export const generateDetailedMonitorResults = (monitorId, count = 50) => {
  const monitor = mockMonitors.find(m => m.id === monitorId);
  if (!monitor || !monitor.last_value) return [];
  
  const results = [];
  const valueKey = Object.keys(monitor.last_value)[0];
  const baseValue = monitor.last_value[valueKey];
  
  for (let i = count; i > 0; i--) {
    const variation = (Math.random() - 0.5) * 0.2 * baseValue;
    const value = baseValue + variation;
    
    results.unshift({
      monitor_id: monitorId,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      result: [{ [valueKey]: parseFloat(value.toFixed(2)) }],
      status: 'success'
    });
  }
  
  return results;
};

export default {
  mockDbConnections,
  mockMonitors,
  mockAlerts,
  mockFeatureReleases,
  generateDetailedMonitorResults
};

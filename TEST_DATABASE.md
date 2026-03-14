# PulseTrack Test Database Schema & Sample Data

This schema represents a typical SaaS e-commerce application with users, events, orders, and subscriptions.

## Quick Setup

### Option 1: PostgreSQL (Recommended)

```bash
# Create database
createdb pulsetrack_test

# Run schema
psql pulsetrack_test < schema_postgres.sql

# Run sample data
psql pulsetrack_test < sample_data_postgres.sql
```

### Option 2: MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE pulsetrack_test;"

# Run schema
mysql -u root -p pulsetrack_test < schema_mysql.sql

# Run sample data
mysql -u root -p pulsetrack_test < sample_data_mysql.sql
```

### Option 3: Docker PostgreSQL (Easiest)

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name pulsetrack-db \
  -e POSTGRES_PASSWORD=testpass123 \
  -e POSTGRES_DB=pulsetrack_test \
  -p 5432:5432 \
  postgres:15

# Wait 5 seconds for startup
sleep 5

# Load schema and data
docker exec -i pulsetrack-db psql -U postgres pulsetrack_test < schema_postgres.sql
docker exec -i pulsetrack-db psql -U postgres pulsetrack_test < sample_data_postgres.sql
```

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `pulsetrack_test`
- Username: `postgres`
- Password: `testpass123`

---

## Database Schema

### Tables Overview

1. **users** - User accounts and registration data
2. **events** - User activity tracking (page views, clicks, errors)
3. **orders** - Purchase transactions
4. **payments** - Payment processing records
5. **subscriptions** - Subscription plans and status
6. **products** - Product catalog

---

## Natural Language Test Queries

Once connected, try these monitoring requests:

### Basic Metrics

1. **"Track daily signups"**
   - Expected SQL: `SELECT DATE(created_at) as day, COUNT(*) as signups FROM users GROUP BY day ORDER BY day DESC`

2. **"Monitor active users today"**
   - Expected SQL: `SELECT COUNT(DISTINCT user_id) as active_users FROM events WHERE event_timestamp >= CURRENT_DATE`

3. **"Check total revenue"**
   - Expected SQL: `SELECT SUM(amount) as total_revenue FROM orders WHERE status = 'completed'`

### Conversion Metrics

4. **"Track checkout conversion rate"**
   - Expected SQL: `SELECT (COUNT(DISTINCT CASE WHEN event_name = 'checkout_completed' THEN user_id END) * 100.0 / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'checkout_started' THEN user_id END), 0)) as conversion_rate FROM events`

5. **"Monitor daily order count"**
   - Expected SQL: `SELECT DATE(created_at) as day, COUNT(*) as orders FROM orders GROUP BY day ORDER BY day DESC`

### Error Monitoring

6. **"Check if payment failures increased"**
   - Expected SQL: `SELECT DATE(created_at) as day, COUNT(*) as failed_payments FROM payments WHERE status = 'failed' GROUP BY day ORDER BY day DESC LIMIT 7`

7. **"Track error rate"**
   - Expected SQL: `SELECT (COUNT(*) FILTER (WHERE event_name = 'error') * 100.0 / COUNT(*)) as error_rate FROM events WHERE event_timestamp >= CURRENT_DATE - INTERVAL '1 day'`

### User Engagement

8. **"Monitor user churn"**
   - Expected SQL: `SELECT DATE(canceled_at) as day, COUNT(*) as churned_users FROM subscriptions WHERE status = 'canceled' GROUP BY day ORDER BY day DESC`

9. **"Track average order value"**
   - Expected SQL: `SELECT AVG(amount) as avg_order_value FROM orders WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`

10. **"Check subscription renewals"**
    - Expected SQL: `SELECT COUNT(*) as renewals FROM subscriptions WHERE status = 'active' AND renewed_at >= CURRENT_DATE`

---

## Sample Alert Configurations

### Critical Alerts (Check every 10 minutes)

- **Payment Failure Spike**
  - Query: Count failed payments in last hour
  - Condition: Above 10
  - Slack: Yes

- **Error Rate**
  - Query: Calculate error percentage
  - Condition: Above 5%
  - Slack: Yes

### Important Alerts (Check hourly)

- **Checkout Conversion Drop**
  - Query: Calculate conversion rate
  - Condition: Below 2%
  - Slack: Yes

- **Active Users Drop**
  - Query: Count active users today
  - Condition: Below 100
  - Slack: Yes

### Daily Reports

- **Daily Signups**
  - Query: Count new users today
  - Interval: Daily
  - Slack: Send report

- **Revenue Report**
  - Query: Sum completed orders today
  - Interval: Daily
  - Slack: Send report

---

## Database Statistics

**Users:** ~500 records
**Events:** ~10,000 records (last 30 days)
**Orders:** ~1,000 records
**Payments:** ~1,200 records
**Subscriptions:** ~300 records
**Products:** ~50 records

**Date Range:** Last 90 days with realistic patterns:
- Weekday vs weekend variations
- Business hours activity spikes
- Occasional error spikes
- Failed payment patterns
- Churn events

---

## Connection String Examples

### PostgreSQL
```
postgresql://postgres:testpass123@localhost:5432/pulsetrack_test
```

### MySQL
```
mysql://root:testpass123@localhost:3306/pulsetrack_test
```

---

## Troubleshooting

### Can't connect to database?

**PostgreSQL:**
```bash
# Check if running
docker ps | grep pulsetrack-db

# Check logs
docker logs pulsetrack-db

# Restart
docker restart pulsetrack-db
```

**MySQL:**
```bash
# Check if running
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql
```

### Schema already exists?

```sql
-- Drop and recreate (PostgreSQL)
DROP DATABASE IF EXISTS pulsetrack_test;
CREATE DATABASE pulsetrack_test;

-- Drop and recreate (MySQL)
DROP DATABASE IF EXISTS pulsetrack_test;
CREATE DATABASE pulsetrack_test;
```

---

## Next Steps

1. **Connect Database**: Use the connection form in PulseTrack
2. **Verify Schema**: Check that all 6 tables are detected
3. **Create First Monitor**: Try "Track daily signups"
4. **Set Alert**: Configure threshold (e.g., below 10 signups)
5. **View Results**: Check Active Monitors dashboard
6. **Test Slack**: Add webhook URL to get notifications

---

## Advanced Test Scenarios

### Simulate a Deploy Issue

```sql
-- Insert spike of errors (simulates bad deploy)
INSERT INTO events (user_id, event_name, event_timestamp, properties)
SELECT 
  (random() * 500)::int + 1,
  'error',
  NOW() - (random() * interval '1 hour'),
  '{"error": "500 Internal Server Error"}'::jsonb
FROM generate_series(1, 50);
```

Monitor: **"Alert me if error rate spikes above 5%"**

### Simulate Conversion Drop

```sql
-- Remove recent checkout completions (simulates conversion issue)
DELETE FROM events 
WHERE event_name = 'checkout_completed' 
AND event_timestamp >= NOW() - interval '1 hour';
```

Monitor: **"Alert if checkout conversion drops below 2%"**

### Simulate Payment Failures

```sql
-- Add failed payments
INSERT INTO payments (user_id, order_id, amount, status, created_at)
SELECT 
  user_id,
  id,
  amount,
  'failed',
  NOW() - (random() * interval '30 minutes')
FROM orders 
WHERE created_at >= NOW() - interval '1 day'
LIMIT 20;
```

Monitor: **"Alert if payment failures increase above 10"**

---

## Support

If you encounter issues:
1. Check database connection credentials
2. Verify tables were created: `\dt` (PostgreSQL) or `SHOW TABLES;` (MySQL)
3. Check row counts: `SELECT COUNT(*) FROM users;`
4. Review PulseTrack backend logs for SQL errors

Happy monitoring! 🚀

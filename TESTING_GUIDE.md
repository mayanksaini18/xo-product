# 🚀 PulseTrack Complete Testing Guide

A step-by-step guide to test all features of PulseTrack.

---

## 📋 Table of Contents

1. [Setup Test Database](#step-1-setup-test-database)
2. [Connect Database to PulseTrack](#step-2-connect-database)
3. [Create Your First Monitor](#step-3-create-monitor)
4. [View Active Monitors](#step-4-view-monitors)
5. [Test Alerts](#step-5-test-alerts)
6. [Advanced Testing](#step-6-advanced-testing)
7. [Troubleshooting](#troubleshooting)

---

## Step 1: Setup Test Database

### Option A: Quick Setup with Docker (Recommended)

```bash
# Navigate to app directory
cd /app

# Make script executable
chmod +x setup-test-db.sh

# Run setup script
./setup-test-db.sh
```

**What this does:**
- Starts PostgreSQL in Docker container
- Creates `pulsetrack_test` database
- Loads schema with 6 tables
- Inserts sample data (500 users, 1000 orders, 10,000 events)
- Shows connection details

**Expected Output:**
```
✅ Database ready for testing!

📝 Connection Details:
   Host:     localhost
   Port:     5432
   Database: pulsetrack_test
   Username: postgres
   Password: testpass123
```

### Option B: Manual Docker Setup

```bash
# Start PostgreSQL
docker run -d \
  --name pulsetrack-test-db \
  -e POSTGRES_PASSWORD=testpass123 \
  -e POSTGRES_DB=pulsetrack_test \
  -p 5432:5432 \
  postgres:15

# Wait 5 seconds
sleep 5

# Load schema
docker exec -i pulsetrack-test-db psql -U postgres pulsetrack_test < /app/schema_postgres.sql
```

### Option C: Use Existing Database

If you have a PostgreSQL or MySQL database:
- Just note down the connection details
- You'll need: host, port, database name, username, password

---

## Step 2: Connect Database to PulseTrack

### 2.1 Open PulseTrack

Visit: **https://db-monitor-hub-1.preview.emergentagent.com**

You should see:
- Black premium UI
- Sidebar with navigation
- "Database" view (default)
- Empty state with "No databases connected"

### 2.2 Add Database Connection

**Click:** "Add Database" button (top right)

A form will appear with these fields:

| Field | Value | Example |
|-------|-------|---------|
| **Connection Name** | Any friendly name | `Production Database` |
| **Database Type** | PostgreSQL or MySQL | `PostgreSQL` |
| **Host** | Database host | `localhost` |
| **Port** | Database port | `5432` |
| **Database Name** | Database name | `pulsetrack_test` |
| **Username** | DB username | `postgres` |
| **Password** | DB password | `testpass123` |

### 2.3 Fill the Form

```
Connection Name:  My Test Database
Database Type:    PostgreSQL
Host:            localhost
Port:            5432
Database Name:   pulsetrack_test
Username:        postgres
Password:        testpass123
```

### 2.4 Connect

**Click:** "Connect Database" button

**What happens:**
1. PulseTrack tests the connection
2. Fetches the database schema automatically
3. Detects all tables (users, events, orders, payments, subscriptions, products)
4. Shows success message: "Connected to My Test Database! Found 6 tables"

**Result:** You'll see a database card showing:
- ✅ Database name: "My Test Database"
- 🔌 Connection: "POSTGRESQL • localhost:pulsetrack_test"
- 🟢 Status: "Connected"

---

## Step 3: Create Your First Monitor

### 3.1 Navigate to Create Monitor

**Click:** "Create Monitor" in sidebar

You'll see a 2-step wizard interface.

### 3.2 Fill Basic Details (Step 1)

**Monitor Name:**
```
Daily Signups
```

**Description:**
```
Track new user registrations each day
```

**Select Database:**
```
My Test Database
```

**What do you want to monitor?**
```
Track daily signups
```

💡 **Other examples you can try:**
- "Monitor checkout conversion rate"
- "Check if payment failures increased"
- "Track active users today"
- "Alert me if error rate spikes above 5%"

### 3.3 Click "Continue"

PulseTrack will:
1. Send your request to Claude AI
2. Claude analyzes the database schema
3. Generates SQL automatically

**Behind the scenes:**
```sql
-- Claude generates:
SELECT DATE(created_at) as day, COUNT(*) as signups 
FROM users 
GROUP BY day 
ORDER BY day DESC
```

### 3.4 Configure Schedule & Alerts (Step 2)

**Check Interval:**
```
Hourly  (or choose: Every 10 minutes, Daily)
```

**Alert Condition (Optional):**
```
Below threshold
```

**Threshold Value:**
```
10
```
*(Alert if daily signups drop below 10)*

**Slack Webhook (Optional):**
```
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
*(Get this from: Slack → Settings → Incoming Webhooks)*

### 3.5 Create Monitor

**Click:** "Create Monitor"

**What happens:**
1. Monitor is created in database
2. SQL query is stored
3. Background scheduler adds the job
4. Monitor runs immediately for first time
5. Result is stored in MongoDB
6. Success toast: "Monitor 'Daily Signups' created successfully!"
7. Auto-navigates to "Active Monitors" view

---

## Step 4: View Active Monitors

### 4.1 Active Monitors Dashboard

You should now see your monitor card:

```
🟢 Daily Signups
Track new user registrations each day

500 ← Latest value
hourly • Last run: Jan 14, 2:30 PM

[▶] [🗑️] ← Pause/Delete buttons
```

### 4.2 View Monitor Details

**Click on the monitor card**

A detail panel slides in from the right showing:

**SQL Query:**
```sql
SELECT DATE(created_at) as day, COUNT(*) as signups 
FROM users 
GROUP BY day 
ORDER BY day DESC
```

**Recent Results:**
- Last 10 query executions
- Timestamps
- Values returned

### 4.3 Monitor Controls

**Pause Monitor:**
- Click ▶ icon
- Monitor status changes to "paused"
- Scheduled job is removed
- Monitor stops running

**Resume Monitor:**
- Click ▶ icon again
- Status changes back to "active"
- Scheduled job is re-added

**Delete Monitor:**
- Click 🗑️ icon
- Confirmation: "Are you sure?"
- Click OK
- Monitor and all results are deleted

---

## Step 5: Test Alerts

### 5.1 Create a Monitor with Alert

**Navigate to:** "Create Monitor"

**Setup:**
```
Monitor Name:      Error Rate Monitor
Description:       Alert if error rate goes above 5%
Database:          My Test Database
Natural Language:  "Alert me if error rate spikes above 5%"

Check Interval:    Every 10 minutes
Alert Condition:   Above threshold
Threshold:         5
Slack Webhook:     (paste your Slack webhook URL)
```

**Click:** "Create Monitor"

### 5.2 Simulate an Error Spike

Open a database connection to trigger an alert:

```bash
# Connect to database
docker exec -it pulsetrack-test-db psql -U postgres pulsetrack_test

# Insert many error events
INSERT INTO events (user_id, event_name, event_timestamp)
SELECT 
  (random() * 499 + 1)::int,
  'error',
  NOW() - (random() * interval '10 minutes')
FROM generate_series(1, 100);

# Exit
\q
```

### 5.3 Wait for Alert

- Monitor runs every 10 minutes
- Queries the database
- Calculates error rate
- If > 5%, alert triggers
- Slack notification sent
- Alert logged in system

### 5.4 View Alerts

**Navigate to:** "Alerts" in sidebar

You'll see:
```
⚠️ Error Rate Monitor

Condition: above 5
Jan 14, 2:35 PM
```

---

## Step 6: Advanced Testing

### 6.1 Create Multiple Monitors

Try creating these monitors:

**1. Checkout Conversion**
```
Natural Language: "Monitor checkout conversion rate hourly"
Alert: Below 2%
```

**2. Payment Failures**
```
Natural Language: "Track payment failures every 10 minutes"
Alert: Above 10
```

**3. Active Users**
```
Natural Language: "Check active users today"
Alert: Below 100
```

**4. Revenue Today**
```
Natural Language: "Track total revenue from completed orders today"
Alert: Below 1000
```

**5. Subscription Churn**
```
Natural Language: "Monitor users who canceled subscriptions"
Alert: Above 5
```

### 6.2 Test Different Intervals

Create 3 monitors with different intervals:
- One with "Every 10 minutes"
- One with "Hourly"
- One with "Daily"

Watch them run at different schedules.

### 6.3 Test Natural Language Variations

PulseTrack should handle these variations:

✅ **Simple:**
- "Track daily signups"
- "Monitor orders"

✅ **With Time:**
- "Count users who signed up today"
- "Show orders from last 7 days"

✅ **With Aggregations:**
- "Average order value"
- "Total revenue"
- "Count of failed payments"

✅ **With Conditions:**
- "Users in USA"
- "Orders with status completed"
- "Events where event_name is error"

✅ **Complex:**
- "Calculate checkout conversion as percentage of users who completed checkout divided by users who started checkout"

### 6.4 Verify SQL Generation

For each monitor you create:
1. Click on the monitor card
2. View the generated SQL in detail panel
3. Verify it matches your intent
4. Check if results make sense

---

## Step 7: Test the Complete Flow

### End-to-End Test Scenario

**Scenario:** You just deployed a new feature and want to monitor its impact.

**Step 1:** Connect Database ✅ (Already done)

**Step 2:** Create Monitors
```
1. "Track daily signups" (Daily)
2. "Monitor error rate" (Every 10 minutes) → Alert if > 5%
3. "Check checkout conversion" (Hourly) → Alert if < 2%
```

**Step 3:** Simulate a Problem
```sql
-- Simulate errors from bad deploy
INSERT INTO events (user_id, event_name, event_timestamp)
SELECT (random() * 499 + 1)::int, 'error', NOW()
FROM generate_series(1, 50);
```

**Step 4:** Wait for Monitors to Run
- Error monitor runs in 10 minutes
- Detects spike
- Sends Slack alert

**Step 5:** Check Results
- View "Active Monitors" → See updated values
- View "Alerts" → See triggered alert
- Check Slack → Received notification

**Step 6:** Fix the Issue (Pause Faulty Feature)
```sql
-- Reduce errors
DELETE FROM events 
WHERE event_name = 'error' 
AND event_timestamp > NOW() - interval '1 hour';
```

**Step 7:** Verify Recovery
- Monitor runs again
- Error rate drops below 5%
- No new alerts
- System back to normal

---

## 📊 What to Expect

### Normal Operation

**Active Monitors Dashboard:**
- Shows all monitors with real-time values
- Green dots for active monitors
- Last run timestamps update every check
- Values update after each run

**Alert History:**
- Shows only triggered alerts
- Empty if no thresholds crossed
- Yellow warning cards for each alert

**Reports:**
- Coming soon (placeholder for now)
- Will show historical trends

### Performance

**Query Execution:**
- Simple queries: < 100ms
- Complex queries: < 500ms
- Monitor creation: 2-3 seconds (includes AI SQL generation)

**Scheduling:**
- 10-minute monitors: ±10 seconds accuracy
- Hourly monitors: ±1 minute accuracy
- Daily monitors: Run at midnight

---

## 🧪 Sample Natural Language Queries

Copy-paste these into "What do you want to monitor?":

### User Metrics
```
Track daily signups
Monitor active users today
Check user retention rate
Count users by country
Show users who haven't logged in for 7 days
```

### Order & Revenue Metrics
```
Track daily orders
Monitor total revenue today
Calculate average order value
Check orders by status
Count failed orders in last hour
```

### Conversion Metrics
```
Monitor checkout conversion rate
Calculate signup to purchase conversion
Track abandoned carts
Check payment success rate
```

### Error & Performance
```
Alert me if error rate spikes above 5%
Monitor API failures
Check if response time increased
Track 500 errors
```

### Subscription Metrics
```
Monitor subscription cancellations
Track new subscriptions today
Calculate monthly recurring revenue
Check subscription renewal rate
```

---

## 🔍 Troubleshooting

### Issue: "Connection failed"

**Check:**
```bash
# Is database running?
docker ps | grep pulsetrack

# Try connecting manually
docker exec -it pulsetrack-test-db psql -U postgres pulsetrack_test
```

**Fix:**
```bash
# Restart database
docker restart pulsetrack-test-db

# Or recreate
./setup-test-db.sh
```

### Issue: "Failed to generate SQL"

**Possible causes:**
- Natural language is too vague
- Referenced tables don't exist
- Claude API issue

**Try:**
- Be more specific: "Count users from users table created today"
- Check database has data: `SELECT COUNT(*) FROM users;`
- Verify tables exist in sidebar status

### Issue: Monitor shows "—" for value

**Means:** Query returned no results or NULL

**Check:**
```bash
# Does table have data?
docker exec pulsetrack-test-db psql -U postgres pulsetrack_test -c "SELECT COUNT(*) FROM users;"

# Check monitor's SQL
# Click monitor → View SQL in detail panel
# Copy SQL and test manually
```

### Issue: Alerts not triggering

**Check:**
1. Monitor status is "active" (not paused)
2. Threshold is set correctly
3. Slack webhook URL is valid
4. Alert condition matches data (above vs below)

**Test Slack webhook:**
```bash
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from PulseTrack"}'
```

### Issue: Monitor not running

**Check backend logs:**
```bash
tail -f /var/log/supervisor/backend.out.log
```

**Look for:**
- Scheduler errors
- Database connection errors
- SQL execution errors

### Issue: "No databases connected" after adding

**Possible causes:**
- Connection test passed but schema fetch failed
- MongoDB storage issue

**Fix:**
```bash
# Check backend logs
tail -n 50 /var/log/supervisor/backend.out.log

# Restart backend
sudo supervisorctl restart backend

# Try connecting again
```

---

## 📞 Support

**Check Status:**
```bash
# Backend
curl https://db-monitor-hub-1.preview.emergentagent.com/api/

# Database
docker exec pulsetrack-test-db pg_isready -U postgres
```

**View Logs:**
```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Database logs
docker logs pulsetrack-test-db

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log
```

**Reset Everything:**
```bash
# Delete database and start fresh
docker-compose -f docker-compose.test-db.yml down -v
./setup-test-db.sh

# Restart PulseTrack
sudo supervisorctl restart backend frontend
```

---

## ✅ Testing Checklist

- [ ] Database connected successfully
- [ ] Schema shows 6 tables
- [ ] Created first monitor with natural language
- [ ] Monitor appears in Active Monitors
- [ ] Monitor shows a value (not "—")
- [ ] Clicked monitor to view SQL query
- [ ] Paused and resumed monitor
- [ ] Created monitor with alert
- [ ] Alert triggered and appeared in Alerts view
- [ ] Tested Slack notification (if webhook configured)
- [ ] Created 3+ different monitors
- [ ] Deleted a monitor
- [ ] Verified monitors run on schedule

---

## 🎉 You're Done!

You've successfully tested all major features of PulseTrack:

✅ Database connectivity
✅ Natural language to SQL conversion
✅ Monitor creation and management
✅ Scheduled monitoring
✅ Alert system
✅ Real-time dashboard

**Next Steps:**
- Connect your real production database
- Create monitors for your actual metrics
- Set up Slack alerts for your team
- Monitor your product's health in real-time!

---

## 💡 Pro Tips

1. **Start Simple:** Begin with basic monitors like "Track daily signups" before complex queries

2. **Be Specific:** "Count users from users table created today" works better than "count users"

3. **Check Generated SQL:** Always review the SQL query in the detail panel to verify it matches your intent

4. **Test Alerts First:** Use low thresholds initially to verify alerts work before setting real values

5. **Use Hourly for Most Monitors:** 10-minute intervals are for critical metrics only

6. **Name Monitors Clearly:** Use descriptive names like "Daily Signups" not "Query 1"

7. **Monitor the Monitors:** Keep an eye on the Active Monitors dashboard to verify they're running

8. **Leverage Natural Language:** Describe what you want in plain English - Claude is smart!

Happy monitoring! 🚀

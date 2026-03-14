import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import psycopg2
import pymysql
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import requests
from anthropic import Anthropic

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
DB_NAME = os.environ.get('DB_NAME', 'pulsetrack')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', 'sk-emergent-cEd44295e39AeF6A2F')

# MongoDB setup
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Collections
db_connections = db['db_connections']
monitors = db['monitors']
monitor_results = db['monitor_results']
alerts_collection = db['alerts']

# Initialize FastAPI
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Initialize Anthropic client
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)

# Models
class DatabaseConnection(BaseModel):
    name: str
    db_type: str  # 'postgres' or 'mysql'
    host: str
    port: int
    database: str
    username: str
    password: str

class Monitor(BaseModel):
    name: str
    description: str
    db_connection_id: str
    sql_query: Optional[str] = None
    natural_language: str
    interval: str  # '10min', 'hourly', 'daily'
    alert_condition: Optional[str] = None
    alert_threshold: Optional[float] = None
    slack_webhook: Optional[str] = None
    email: Optional[str] = None

class MonitorUpdate(BaseModel):
    status: str  # 'active' or 'paused'

# Helper Functions
def generate_id():
    return hashlib.md5(str(datetime.now().timestamp()).encode()).hexdigest()[:12]

def test_db_connection(conn_data: DatabaseConnection):
    """Test database connection"""
    try:
        if conn_data.db_type == 'postgres':
            conn = psycopg2.connect(
                host=conn_data.host,
                port=conn_data.port,
                database=conn_data.database,
                user=conn_data.username,
                password=conn_data.password
            )
            conn.close()
            return True
        elif conn_data.db_type == 'mysql':
            conn = pymysql.connect(
                host=conn_data.host,
                port=conn_data.port,
                database=conn_data.database,
                user=conn_data.username,
                password=conn_data.password
            )
            conn.close()
            return True
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

def fetch_database_schema(conn_data: dict):
    """Fetch schema from connected database"""
    try:
        if conn_data['db_type'] == 'postgres':
            conn = psycopg2.connect(
                host=conn_data['host'],
                port=conn_data['port'],
                database=conn_data['database'],
                user=conn_data['username'],
                password=conn_data['password']
            )
            cursor = conn.cursor()
            
            # Get tables and columns
            cursor.execute("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
            """)
            
            rows = cursor.fetchall()
            tables = {}
            for row in rows:
                table_name, column_name, data_type, is_nullable = row
                if table_name not in tables:
                    tables[table_name] = []
                tables[table_name].append({
                    'name': column_name,
                    'type': data_type,
                    'nullable': is_nullable == 'YES'
                })
            
            conn.close()
            return tables
            
        elif conn_data['db_type'] == 'mysql':
            conn = pymysql.connect(
                host=conn_data['host'],
                port=conn_data['port'],
                database=conn_data['database'],
                user=conn_data['username'],
                password=conn_data['password']
            )
            cursor = conn.cursor()
            
            cursor.execute(f"SHOW TABLES")
            table_names = [row[0] for row in cursor.fetchall()]
            
            tables = {}
            for table_name in table_names:
                cursor.execute(f"DESCRIBE {table_name}")
                columns = []
                for row in cursor.fetchall():
                    columns.append({
                        'name': row[0],
                        'type': row[1],
                        'nullable': row[2] == 'YES'
                    })
                tables[table_name] = columns
            
            conn.close()
            return tables
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {str(e)}")

def generate_sql_from_nl(natural_language: str, schema: dict):
    """Use Claude to generate SQL from natural language"""
    schema_text = "\n".join([
        f"Table: {table}\nColumns: {', '.join([c['name'] + ' (' + c['type'] + ')' for c in columns])}"
        for table, columns in schema.items()
    ])
    
    prompt = f"""You are a SQL expert. Convert the following natural language request into a SQL query.

Database Schema:
{schema_text}

Natural Language Request:
{natural_language}

Requirements:
- Generate a valid SQL query that answers the request
- Use proper aggregations (COUNT, SUM, AVG) as needed
- Include GROUP BY for time-based queries
- Order results appropriately
- Return ONLY the SQL query, no explanations

SQL Query:"""

    try:
        message = anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        sql_query = message.content[0].text.strip()
        # Remove markdown code blocks if present
        if sql_query.startswith('```sql'):
            sql_query = sql_query[6:]
        if sql_query.startswith('```'):
            sql_query = sql_query[3:]
        if sql_query.endswith('```'):
            sql_query = sql_query[:-3]
        
        return sql_query.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate SQL: {str(e)}")

def execute_query(conn_data: dict, sql_query: str):
    """Execute SQL query on the database"""
    try:
        if conn_data['db_type'] == 'postgres':
            conn = psycopg2.connect(
                host=conn_data['host'],
                port=conn_data['port'],
                database=conn_data['database'],
                user=conn_data['username'],
                password=conn_data['password']
            )
            cursor = conn.cursor()
            cursor.execute(sql_query)
            
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            result = [dict(zip(columns, row)) for row in rows]
            conn.close()
            return result
            
        elif conn_data['db_type'] == 'mysql':
            conn = pymysql.connect(
                host=conn_data['host'],
                port=conn_data['port'],
                database=conn_data['database'],
                user=conn_data['username'],
                password=conn_data['password']
            )
            cursor = conn.cursor()
            cursor.execute(sql_query)
            
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            result = [dict(zip(columns, row)) for row in rows]
            conn.close()
            return result
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

def send_slack_notification(webhook_url: str, message: dict):
    """Send notification to Slack"""
    try:
        requests.post(webhook_url, json=message, timeout=5)
    except Exception as e:
        print(f"Slack notification failed: {e}")

def evaluate_alert(monitor_data: dict, result: list):
    """Check if alert condition is met"""
    if not monitor_data.get('alert_condition') or not monitor_data.get('alert_threshold'):
        return False
    
    if not result or len(result) == 0:
        return False
    
    # Get the first numeric value from result
    first_row = result[0]
    metric_value = None
    for key, value in first_row.items():
        if isinstance(value, (int, float)):
            metric_value = float(value)
            break
    
    if metric_value is None:
        return False
    
    threshold = float(monitor_data['alert_threshold'])
    condition = monitor_data['alert_condition']
    
    if condition == 'above' and metric_value > threshold:
        return True
    elif condition == 'below' and metric_value < threshold:
        return True
    
    return False

def run_monitor_job(monitor_id: str):
    """Execute a monitor and check alerts"""
    try:
        monitor_data = monitors.find_one({'_id': monitor_id}, {'_id': 0})
        if not monitor_data or monitor_data.get('status') != 'active':
            return
        
        # Get database connection
        conn_data = db_connections.find_one({'_id': monitor_data['db_connection_id']}, {'_id': 0})
        if not conn_data:
            return
        
        # Execute query
        result = execute_query(conn_data, monitor_data['sql_query'])
        
        # Store result
        monitor_results.insert_one({
            'monitor_id': monitor_id,
            'result': result,
            'timestamp': datetime.now(),
            'status': 'success'
        })
        
        # Check alert
        if evaluate_alert(monitor_data, result):
            # Send notification
            if monitor_data.get('slack_webhook'):
                message = {
                    "text": f"🚨 Alert: {monitor_data['name']}",
                    "attachments": [{
                        "color": "warning",
                        "fields": [
                            {"title": "Metric", "value": monitor_data['name'], "short": True},
                            {"title": "Condition", "value": f"{monitor_data['alert_condition']} {monitor_data['alert_threshold']}", "short": True},
                            {"title": "Current Value", "value": str(result[0]), "short": False}
                        ]
                    }]
                }
                send_slack_notification(monitor_data['slack_webhook'], message)
            
            # Store alert
            alerts_collection.insert_one({
                'monitor_id': monitor_id,
                'monitor_name': monitor_data['name'],
                'timestamp': datetime.now(),
                'result': result,
                'condition': f"{monitor_data['alert_condition']} {monitor_data['alert_threshold']}"
            })
        
    except Exception as e:
        print(f"Monitor job failed: {e}")
        monitor_results.insert_one({
            'monitor_id': monitor_id,
            'result': None,
            'timestamp': datetime.now(),
            'status': 'failed',
            'error': str(e)
        })

def schedule_monitor(monitor_id: str, interval: str):
    """Add monitor to scheduler"""
    job_id = f"monitor_{monitor_id}"
    
    # Remove existing job if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    # Parse interval
    if interval == '10min':
        trigger = IntervalTrigger(minutes=10)
    elif interval == 'hourly':
        trigger = IntervalTrigger(hours=1)
    elif interval == 'daily':
        trigger = IntervalTrigger(days=1)
    else:
        trigger = IntervalTrigger(hours=1)  # default to hourly
    
    # Add job
    scheduler.add_job(
        run_monitor_job,
        trigger=trigger,
        args=[monitor_id],
        id=job_id,
        replace_existing=True
    )

# API Endpoints
@app.get("/api/")
def root():
    return {"message": "PulseTrack API"}

@app.post("/api/db-connections")
def create_db_connection(conn: DatabaseConnection):
    """Create a new database connection"""
    # Test connection
    test_db_connection(conn)
    
    # Fetch schema
    conn_dict = conn.dict()
    schema = fetch_database_schema(conn_dict)
    
    # Store connection
    conn_id = generate_id()
    conn_dict['_id'] = conn_id
    conn_dict['schema'] = schema
    conn_dict['created_at'] = datetime.now()
    
    db_connections.insert_one(conn_dict)
    
    return {
        "id": conn_id,
        "name": conn.name,
        "schema": schema,
        "tables": list(schema.keys())
    }

@app.get("/api/db-connections")
def get_db_connections():
    """Get all database connections"""
    connections = list(db_connections.find({}, {'_id': 1, 'name': 1, 'db_type': 1, 'host': 1, 'database': 1, 'created_at': 1}))
    return [{'id': c['_id'], **{k: v for k, v in c.items() if k != '_id'}} for c in connections]

@app.get("/api/db-connections/{conn_id}")
def get_db_connection(conn_id: str):
    """Get specific database connection"""
    conn = db_connections.find_one({'_id': conn_id}, {'password': 0})
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    conn['id'] = conn.pop('_id')
    return conn

@app.post("/api/monitors")
def create_monitor(monitor: Monitor):
    """Create a new monitor"""
    # Get connection
    conn = db_connections.find_one({'_id': monitor.db_connection_id}, {'_id': 0})
    if not conn:
        raise HTTPException(status_code=404, detail="Database connection not found")
    
    # Generate SQL if not provided
    if not monitor.sql_query:
        sql_query = generate_sql_from_nl(monitor.natural_language, conn['schema'])
    else:
        sql_query = monitor.sql_query
    
    # Create monitor
    monitor_id = generate_id()
    monitor_dict = monitor.dict()
    monitor_dict['_id'] = monitor_id
    monitor_dict['sql_query'] = sql_query
    monitor_dict['created_at'] = datetime.now()
    monitor_dict['status'] = 'active'
    
    monitors.insert_one(monitor_dict)
    
    # Schedule monitor
    schedule_monitor(monitor_id, monitor.interval)
    
    # Run immediately
    run_monitor_job(monitor_id)
    
    return {
        "id": monitor_id,
        "name": monitor.name,
        "sql_query": sql_query,
        "status": "active"
    }

@app.get("/api/monitors")
def get_monitors():
    """Get all monitors"""
    monitor_list = list(monitors.find({}, {'_id': 1, 'name': 1, 'description': 1, 'interval': 1, 'status': 1, 'created_at': 1}))
    
    result = []
    for m in monitor_list:
        # Get latest result
        latest_result = monitor_results.find_one(
            {'monitor_id': m['_id']},
            sort=[('timestamp', -1)]
        )
        
        result.append({
            'id': m['_id'],
            'name': m['name'],
            'description': m['description'],
            'interval': m['interval'],
            'status': m['status'],
            'last_run': latest_result['timestamp'] if latest_result else None,
            'last_value': latest_result['result'][0] if latest_result and latest_result.get('result') else None
        })
    
    return result

@app.get("/api/monitors/{monitor_id}")
def get_monitor(monitor_id: str):
    """Get specific monitor with results"""
    monitor = monitors.find_one({'_id': monitor_id})
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    
    # Get recent results
    results = list(monitor_results.find(
        {'monitor_id': monitor_id},
        sort=[('timestamp', -1)],
        limit=50
    ))
    
    monitor['id'] = monitor.pop('_id')
    monitor['results'] = results
    
    return monitor

@app.patch("/api/monitors/{monitor_id}")
def update_monitor(monitor_id: str, update: MonitorUpdate):
    """Update monitor status"""
    monitors.update_one(
        {'_id': monitor_id},
        {'$set': {'status': update.status}}
    )
    
    if update.status == 'paused':
        job_id = f"monitor_{monitor_id}"
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
    else:
        monitor = monitors.find_one({'_id': monitor_id})
        schedule_monitor(monitor_id, monitor['interval'])
    
    return {"status": "updated"}

@app.delete("/api/monitors/{monitor_id}")
def delete_monitor(monitor_id: str):
    """Delete a monitor"""
    monitors.delete_one({'_id': monitor_id})
    monitor_results.delete_many({'monitor_id': monitor_id})
    
    job_id = f"monitor_{monitor_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    return {"status": "deleted"}

@app.get("/api/alerts")
def get_alerts():
    """Get recent alerts"""
    alert_list = list(alerts_collection.find({}, sort=[('timestamp', -1)], limit=50))
    return [{'id': str(a['_id']), **{k: v for k, v in a.items() if k != '_id'}} for a in alert_list]

@app.post("/api/test-query")
def test_query(data: dict):
    """Test a SQL query"""
    conn = db_connections.find_one({'_id': data['db_connection_id']}, {'_id': 0})
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    result = execute_query(conn, data['sql_query'])
    return {"result": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

#!/bin/bash

# PulseTrack Test Database Setup Script
# This script sets up a PostgreSQL test database with sample data

set -e

echo "🚀 PulseTrack Test Database Setup"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Use docker compose (v2) or docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "✓ Docker found"
echo ""

# Stop existing container if running
echo "📦 Stopping existing container (if any)..."
$DOCKER_COMPOSE -f docker-compose.test-db.yml down 2>/dev/null || true
echo ""

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
$DOCKER_COMPOSE -f docker-compose.test-db.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec pulsetrack-test-db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✓ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done
echo ""

# Run schema
echo "📊 Loading schema and sample data..."
docker exec -i pulsetrack-test-db psql -U postgres pulsetrack_test < schema_postgres.sql > /dev/null 2>&1
echo "✓ Schema loaded successfully!"
echo ""

# Show statistics
echo "📈 Database Statistics:"
echo "----------------------"
docker exec pulsetrack-test-db psql -U postgres pulsetrack_test -c "SELECT 'Users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'Products', COUNT(*) FROM products UNION ALL SELECT 'Orders', COUNT(*) FROM orders UNION ALL SELECT 'Payments', COUNT(*) FROM payments UNION ALL SELECT 'Subscriptions', COUNT(*) FROM subscriptions UNION ALL SELECT 'Events', COUNT(*) FROM events;" -t
echo ""

# Connection details
echo "✅ Database ready for testing!"
echo ""
echo "📝 Connection Details:"
echo "   Host:     localhost"
echo "   Port:     5432"
echo "   Database: pulsetrack_test"
echo "   Username: postgres"
echo "   Password: testpass123"
echo ""
echo "💡 Next Steps:"
echo "   1. Open PulseTrack: https://ai-analytics-hub-18.preview.emergentagent.com"
echo "   2. Go to 'Database' in sidebar"
echo "   3. Click 'Add Database'"
echo "   4. Use the connection details above"
echo "   5. Create your first monitor!"
echo ""
echo "🧪 Try these natural language queries:"
echo "   • Track daily signups"
echo "   • Monitor checkout conversion rate"
echo "   • Check if payment failures increased"
echo "   • Alert me if error rate spikes above 5%"
echo ""
echo "🛠️  Manage Database:"
echo "   View logs:    docker logs pulsetrack-test-db"
echo "   Connect CLI:  docker exec -it pulsetrack-test-db psql -U postgres pulsetrack_test"
echo "   Stop:         docker-compose -f docker-compose.test-db.yml down"
echo "   Reset:        docker-compose -f docker-compose.test-db.yml down -v && ./setup-test-db.sh"
echo ""

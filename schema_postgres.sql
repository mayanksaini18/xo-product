-- PulseTrack Test Database Schema (PostgreSQL)
-- SaaS E-commerce Application

-- Drop existing tables
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    country VARCHAR(100),
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    amount DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    renewed_at TIMESTAMP,
    canceled_at TIMESTAMP,
    next_billing_date DATE
);

-- Events table (user activity tracking)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_name VARCHAR(255) NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    properties JSONB,
    session_id VARCHAR(255),
    page_url TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_timestamp ON events(event_timestamp);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Insert sample data

-- Users (500 users over 90 days)
INSERT INTO users (email, name, country, plan, created_at, last_login, status)
SELECT 
    'user' || generate_series || '@example.com',
    'User ' || generate_series,
    CASE (random() * 5)::int
        WHEN 0 THEN 'USA'
        WHEN 1 THEN 'UK'
        WHEN 2 THEN 'Canada'
        WHEN 3 THEN 'Germany'
        ELSE 'France'
    END,
    CASE (random() * 10)::int
        WHEN 0 THEN 'pro'
        WHEN 1 THEN 'premium'
        ELSE 'free'
    END,
    CURRENT_TIMESTAMP - (random() * interval '90 days'),
    CURRENT_TIMESTAMP - (random() * interval '7 days'),
    CASE (random() * 20)::int
        WHEN 0 THEN 'inactive'
        ELSE 'active'
    END
FROM generate_series(1, 500);

-- Products
INSERT INTO products (name, price, category, stock_quantity, created_at)
VALUES
    ('Premium Plan (Monthly)', 29.99, 'subscription', 999, CURRENT_TIMESTAMP),
    ('Pro Plan (Monthly)', 49.99, 'subscription', 999, CURRENT_TIMESTAMP),
    ('Enterprise Plan (Monthly)', 99.99, 'subscription', 999, CURRENT_TIMESTAMP),
    ('E-book: Getting Started', 9.99, 'digital', 999, CURRENT_TIMESTAMP),
    ('Video Course: Advanced', 49.99, 'digital', 999, CURRENT_TIMESTAMP),
    ('Consulting Hour', 150.00, 'service', 100, CURRENT_TIMESTAMP),
    ('API Credits (1000)', 19.99, 'credits', 999, CURRENT_TIMESTAMP),
    ('API Credits (5000)', 79.99, 'credits', 999, CURRENT_TIMESTAMP),
    ('T-Shirt', 24.99, 'merchandise', 50, CURRENT_TIMESTAMP),
    ('Hoodie', 49.99, 'merchandise', 30, CURRENT_TIMESTAMP);

-- Orders (1000 orders)
INSERT INTO orders (user_id, amount, status, product_id, quantity, created_at, completed_at)
SELECT 
    (random() * 499 + 1)::int,
    (random() * 100 + 10)::numeric(10,2),
    CASE (random() * 10)::int
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'failed'
        ELSE 'completed'
    END,
    (random() * 9 + 1)::int,
    (random() * 3 + 1)::int,
    CURRENT_TIMESTAMP - (random() * interval '60 days'),
    CASE 
        WHEN (random() * 10)::int > 1 THEN CURRENT_TIMESTAMP - (random() * interval '59 days')
        ELSE NULL
    END
FROM generate_series(1, 1000);

-- Payments (1200 payments - more than orders due to retries)
INSERT INTO payments (user_id, order_id, amount, status, payment_method, created_at, processed_at)
SELECT 
    (random() * 499 + 1)::int,
    (random() * 999 + 1)::int,
    (random() * 100 + 10)::numeric(10,2),
    CASE (random() * 10)::int
        WHEN 0 THEN 'failed'
        WHEN 1 THEN 'pending'
        ELSE 'completed'
    END,
    CASE (random() * 3)::int
        WHEN 0 THEN 'credit_card'
        WHEN 1 THEN 'paypal'
        ELSE 'stripe'
    END,
    CURRENT_TIMESTAMP - (random() * interval '60 days'),
    CURRENT_TIMESTAMP - (random() * interval '59 days')
FROM generate_series(1, 1200);

-- Subscriptions (300 subscriptions)
INSERT INTO subscriptions (user_id, plan, status, amount, billing_cycle, started_at, renewed_at, canceled_at, next_billing_date)
SELECT 
    (random() * 499 + 1)::int,
    CASE (random() * 2)::int
        WHEN 0 THEN 'premium'
        WHEN 1 THEN 'pro'
        ELSE 'enterprise'
    END,
    CASE (random() * 10)::int
        WHEN 0 THEN 'canceled'
        WHEN 1 THEN 'paused'
        ELSE 'active'
    END,
    CASE (random() * 2)::int
        WHEN 0 THEN 29.99
        WHEN 1 THEN 49.99
        ELSE 99.99
    END,
    'monthly',
    CURRENT_TIMESTAMP - (random() * interval '90 days'),
    CURRENT_TIMESTAMP - (random() * interval '30 days'),
    CASE WHEN (random() * 10)::int = 0 THEN CURRENT_TIMESTAMP - (random() * interval '30 days') ELSE NULL END,
    CURRENT_DATE + (random() * 30)::int
FROM generate_series(1, 300);

-- Events (10,000 events - last 30 days)
INSERT INTO events (user_id, event_name, event_timestamp, properties, session_id, page_url)
SELECT 
    (random() * 499 + 1)::int,
    CASE (random() * 15)::int
        WHEN 0 THEN 'page_view'
        WHEN 1 THEN 'signup'
        WHEN 2 THEN 'login'
        WHEN 3 THEN 'logout'
        WHEN 4 THEN 'button_click'
        WHEN 5 THEN 'checkout_started'
        WHEN 6 THEN 'checkout_completed'
        WHEN 7 THEN 'payment_submitted'
        WHEN 8 THEN 'subscription_started'
        WHEN 9 THEN 'subscription_canceled'
        WHEN 10 THEN 'error'
        WHEN 11 THEN 'api_call'
        WHEN 12 THEN 'file_upload'
        WHEN 13 THEN 'profile_updated'
        ELSE 'feature_used'
    END,
    CURRENT_TIMESTAMP - (random() * interval '30 days'),
    jsonb_build_object(
        'browser', CASE (random() * 3)::int WHEN 0 THEN 'Chrome' WHEN 1 THEN 'Firefox' ELSE 'Safari' END,
        'device', CASE (random() * 3)::int WHEN 0 THEN 'desktop' WHEN 1 THEN 'mobile' ELSE 'tablet' END,
        'version', '1.0.' || (random() * 100)::int
    ),
    'session_' || md5(random()::text),
    '/page/' || (random() * 20)::int
FROM generate_series(1, 10000);

-- Add some recent activity for testing (last 24 hours)
INSERT INTO events (user_id, event_name, event_timestamp, properties)
SELECT 
    (random() * 499 + 1)::int,
    CASE (random() * 8)::int
        WHEN 0 THEN 'page_view'
        WHEN 1 THEN 'login'
        WHEN 2 THEN 'checkout_started'
        WHEN 3 THEN 'checkout_completed'
        WHEN 4 THEN 'error'
        WHEN 5 THEN 'api_call'
        ELSE 'feature_used'
    END,
    CURRENT_TIMESTAMP - (random() * interval '24 hours'),
    jsonb_build_object('recent', true)
FROM generate_series(1, 500);

-- Summary statistics
SELECT 'Database setup complete!' as message;
SELECT 'Users: ' || COUNT(*) as stat FROM users;
SELECT 'Products: ' || COUNT(*) as stat FROM products;
SELECT 'Orders: ' || COUNT(*) as stat FROM orders;
SELECT 'Payments: ' || COUNT(*) as stat FROM payments;
SELECT 'Subscriptions: ' || COUNT(*) as stat FROM subscriptions;
SELECT 'Events: ' || COUNT(*) as stat FROM events;

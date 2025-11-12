-- Initialize databases for federation example
-- This script runs when the PostgreSQL container starts

-- Create database for Products service
CREATE DATABASE products_service;

-- Create database for Reviews service
CREATE DATABASE reviews_service;

-- Create database for Gateway service
CREATE DATABASE gatewayql;

-- Grant permissions to postgres user (already has superuser, but being explicit)
GRANT ALL PRIVILEGES ON DATABASE products_service TO postgres;
GRANT ALL PRIVILEGES ON DATABASE reviews_service TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gatewayql TO postgres;

-- Switch to products_service database and create initial schema if needed
\c products_service;

-- Enable UUID extension for products
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Switch to reviews_service database
\c reviews_service;

-- Enable UUID extension for reviews
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Switch to gatewayql database
\c gatewayql;

-- Enable UUID extension for gateway
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log completion
\echo 'Federation databases initialized successfully!';
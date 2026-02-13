#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE plantation_db;
    CREATE DATABASE inventory_db;
    CREATE DATABASE operation_db;
    GRANT ALL PRIVILEGES ON DATABASE plantation_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE inventory_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE operation_db TO postgres;
EOSQL

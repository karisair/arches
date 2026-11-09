# PostgreSQL 17 with PostGIS 3, built on the official multi-arch Postgres image
# so it runs natively on both Apple Silicon and Intel Macs.
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
    && rm -rf /var/lib/apt/lists/*

# Runs once, when the database volume is first created.
COPY init-template-postgis.sql /docker-entrypoint-initdb.d/

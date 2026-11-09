#!/usr/bin/env bash
# First start: create the Arches project, configure it, set up the database and
# search indexes, and build the frontend. Later starts skip whatever is already done.
set -euo pipefail

PROJECT="${ARCHES_PROJECT:-myproject}"
PROJECT_ROOT="/web_root/${PROJECT}"     # contains manage.py and package.json
APP_DIR="${PROJECT_ROOT}/${PROJECT}"     # contains settings.py

log() { echo "[arches-docker] $*"; }

wait_for() {
    local name="$1" check="$2"
    log "Waiting for ${name}..."
    for _ in $(seq 1 120); do
        if eval "$check" >/dev/null 2>&1; then
            log "${name} is up."
            return 0
        fi
        sleep 2
    done
    log "Gave up waiting for ${name}."
    exit 1
}

db_query() {
    # Prints the first column of the first row, or nothing.
    python - "$1" "$2" <<'EOF'
import os, sys, psycopg2
conn = psycopg2.connect(
    host=os.environ.get("PGHOST", "db"), port=os.environ.get("PGPORT", "5432"),
    user=os.environ.get("PGUSER", "postgres"), password=os.environ.get("PGPASSWORD", "postgis"),
    dbname=sys.argv[1],
)
cur = conn.cursor()
cur.execute(sys.argv[2])
row = cur.fetchone()
print(row[0] if row and row[0] is not None else "")
EOF
}

wait_for "PostgreSQL" "db_query postgres 'SELECT 1' | grep -q 1"
wait_for "Elasticsearch" "python -c \"import urllib.request; urllib.request.urlopen('http://${ESHOST:-elasticsearch}:${ESPORT:-9200}')\""

# 1. Project files (kept on your Mac in local-docker/project).
if [ ! -f "${PROJECT_ROOT}/manage.py" ]; then
    log "Creating Arches project '${PROJECT}' (first start only; npm install takes a few minutes)..."
    mkdir -p "${PROJECT_ROOT}"
    # Run from a neutral directory: Django rejects a project name that is importable
    # from the working directory, and the node_modules volume pre-creates the folder.
    cd /tmp
    arches-admin startproject "${PROJECT}" --directory "${PROJECT_ROOT}"
fi

# 2. Docker-specific settings.
if [ ! -f "${APP_DIR}/settings_local.py" ] || grep -q "from .${PROJECT}.settings import" "${APP_DIR}/settings_local.py"; then
    log "Writing ${PROJECT}/settings_local.py"
    cp /opt/arches-docker/settings_local.py "${APP_DIR}/settings_local.py"
fi

cd "${PROJECT_ROOT}"

# 3. JavaScript dependencies (node_modules lives in a Docker volume).
if [ ! -d node_modules/arches ]; then
    log "Installing JavaScript dependencies..."
    npm install
fi

# 4. Database and search indexes.
if [ -z "$(db_query postgres "SELECT 1 FROM pg_database WHERE datname='${PGDBNAME}'")" ] \
    || [ -z "$(db_query "${PGDBNAME}" "SELECT to_regclass('public.graphs')")" ]; then
    log "Setting up the database and search indexes..."
    python manage.py setup_db --force
fi

# 5. Frontend bundle.
if [ ! -f webpack/webpack-stats.json ]; then
    log "Building the frontend (takes a few minutes)..."
    npm run build_development
fi

if [ "${1:-runserver}" = "runserver" ]; then
    log "Arches is starting at http://localhost:${ARCHES_PORT:-8000}"
    exec python manage.py runserver 0.0.0.0:8000
fi
exec "$@"

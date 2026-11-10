# Arches 8.1 in Docker (local)

Runs Arches 8.1.6 on your Mac with everything inside Docker containers. Nothing
is installed on your system except Docker Desktop.

| Container       | What it is                                   |
| --------------- | -------------------------------------------- |
| `arches`        | Arches (Python 3.12, Node 22), dev server    |
| `db`            | PostgreSQL 17 + PostGIS 3                    |
| `elasticsearch` | Elasticsearch 8 (security off, private only) |

All images are multi-arch, so they run natively on Apple Silicon and Intel.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/).
  In Settings → Resources, give it at least **6 GB of memory**. The frontend
  build and Elasticsearch both need it.

## First start

```bash
cd local-docker
docker compose up --build
```

The first start takes a while, typically 10–20 minutes. It builds the images,
creates an Arches project, installs JavaScript packages, sets up the database
and search indexes, and builds the frontend. When the log shows
`Arches is starting at http://localhost:8000`, open
<http://localhost:8000>. The default login is **admin / admin**.

Later starts skip all of that and are ready within seconds of the database and
Elasticsearch coming up.

### Maps

Arches' maps use Mapbox, so the map area stays blank until you add a free
Mapbox access token. Create one at <https://account.mapbox.com/>, then in
Arches go to **System Settings** (sidebar) → **Mapbox API Key**, paste it and save.

### Example data models

A new Arches has no resource models (the definitions of what you record), so
it starts empty. To load Arches' example package, with models for heritage
resources, heritage resource groups, actors (people and organisations),
activities, historical events and information resources, plus their
vocabularies and map layers, run this once while Arches is up:

```bash
docker compose exec arches bash /opt/example-package/load-example-package.sh
```

It takes a few minutes. The package was last updated for Arches 7.4, so the
script patches a downloaded copy for 8.1 first (see
`example-package/patch_example_pkg.py`), then loads it and activates its
models. It adds models only, no sample records. Afterwards you can add records
under **Manage → Add new resource**.

The package also sets Arches' analysis coordinate system to British National
Grid (EPSG:27700), because it was made for UK heritage records.

## Everyday use

```bash
docker compose up -d        # start in the background
docker compose logs -f arches
docker compose stop         # stop, keeping all data
```

Run Arches management commands inside the container:

```bash
docker compose exec arches python manage.py createsuperuser
docker compose exec arches python manage.py packages -o import_graphs -s path/to/graphs
docker compose exec arches bash          # a shell inside the container
```

After changing frontend code, rebuild it:

```bash
docker compose exec arches npm run build_development
```

## Where things live

- **`local-docker/project/myproject/`** is your Arches project: code, settings and
  uploaded files. It's on your Mac, so you can edit it in any editor. It's
  ignored by git. Docker-specific settings are in
  `project/myproject/myproject/settings_local.py`.
- **Database, search index and `node_modules`** are in Docker volumes.

Only Arches is reachable from your Mac, on `127.0.0.1:8000`. The database and
Elasticsearch are reachable only from inside Docker. To use a different port,
start with `ARCHES_PORT=8080 docker compose up`.

## Starting over

```bash
docker compose down -v      # deletes the database, search index and node_modules
rm -rf project              # deletes the generated project
```

If you keep the database but reset only Elasticsearch, rebuild the search index with
`docker compose exec arches python manage.py es reindex_database`.

## Notes

- This is a development setup: Django's dev server with `DEBUG = True` and
  well-known passwords. Don't expose it to the internet.
- To use a different Arches release, change `ARCHES_VERSION` in
  `arches/Dockerfile` and run `docker compose build`.
- The older `Dockerfile` and `docker-compose.yml` at the repository root are
  left over from Arches 5 and don't work with 8.1.

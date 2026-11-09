# Arches application image: Python 3.12 + Node 22 + the system libraries Arches needs.
# The Arches project itself is generated on first start into ../project (see entrypoint.sh).
FROM node:22-bookworm-slim AS node

FROM python:3.12-slim-bookworm

# Node.js and npm, for building the Arches frontend.
# npm 10 (bundled with Node 22) crashes resolving Arches' dependency tree
# ("Cannot read properties of null (reading 'edgesOut')"); npm 11 does not.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && npm install -g npm@11

# GDAL/GEOS/PROJ for GeoDjango, libpq + compilers for psycopg2, git for npm GitHub dependencies.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gdal-bin \
        git \
        libgdal-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ARG ARCHES_VERSION=8.1.6
RUN pip install --no-cache-dir "arches==${ARCHES_VERSION}"

COPY settings_local.py /opt/arches-docker/settings_local.py
COPY entrypoint.sh /opt/arches-docker/entrypoint.sh
RUN chmod +x /opt/arches-docker/entrypoint.sh

WORKDIR /web_root
EXPOSE 8000
ENTRYPOINT ["/opt/arches-docker/entrypoint.sh"]
CMD ["runserver"]

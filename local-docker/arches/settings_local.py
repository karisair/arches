# Local Docker settings, copied into the project on first start by entrypoint.sh.
# Values come from the environment set in local-docker/docker-compose.yml.
# This file is yours to edit afterwards; it is not overwritten once it exists.
import os

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

DATABASES = {
    "default": {
        "ATOMIC_REQUESTS": False,
        "AUTOCOMMIT": True,
        "CONN_MAX_AGE": 0,
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "HOST": os.environ.get("PGHOST", "db"),
        "PORT": os.environ.get("PGPORT", "5432"),
        "NAME": os.environ.get("PGDBNAME", "arches"),
        "USER": os.environ.get("PGUSER", "postgres"),
        "PASSWORD": os.environ.get("PGPASSWORD", "postgis"),
        "POSTGIS_TEMPLATE": "template_postgis",
        "OPTIONS": {"options": "-c cursor_tuple_fraction=1"},
        "TEST": {"CHARSET": None, "COLLATION": None, "MIRROR": None, "NAME": None},
    }
}

# Elasticsearch runs with security disabled inside the private Docker network.
ELASTICSEARCH_HOSTS = [
    {
        "scheme": "http",
        "host": os.environ.get("ESHOST", "elasticsearch"),
        "port": int(os.environ.get("ESPORT", "9200")),
    }
]
ELASTICSEARCH_CONNECTION_OPTIONS = {"request_timeout": 30}

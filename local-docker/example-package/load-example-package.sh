#!/usr/bin/env bash
# Downloads the Arches example package, patches it for Arches 8.1 and loads it.
# Run from local-docker/ on your Mac:
#   docker compose exec arches bash /opt/example-package/load-example-package.sh
set -euo pipefail

PKG_REPO="https://github.com/archesproject/arches-example-pkg.git"
PKG_COMMIT="85fded018e2991a19c836761796ad0b4f2454864"   # master, last updated for Arches 7.4
WORK="/tmp/arches-example-pkg"

echo "Downloading the example package..."
rm -rf "${WORK}"
git clone --quiet "${PKG_REPO}" "${WORK}"
git -C "${WORK}" checkout --quiet "${PKG_COMMIT}"

echo "Patching it for Arches 8..."
python /opt/example-package/patch_example_pkg.py "${WORK}"

echo "Loading it into Arches (takes a few minutes)..."
cd "/web_root/${ARCHES_PROJECT:-myproject}"
python manage.py packages -o load_package -s "${WORK}" -y

# Imported models start inactive, which hides them from "Add new resource". This does
# what the "Active" switch in the Graph Designer does, for the package's models only.
echo "Activating the package's resource models..."
python manage.py shell -c "
import json, pathlib
from arches.app.models.models import GraphModel
ids = [g['graphid'] for p in pathlib.Path('${WORK}/graphs/resource_models').glob('*.json')
       for g in json.loads(p.read_text())['graph']]
GraphModel.objects.filter(pk__in=ids, source_identifier__isnull=True).update(is_active=True)
for g in GraphModel.objects.filter(pk__in=ids, source_identifier__isnull=True).order_by('name'):
    print('  active:' if g.is_active else '  NOT active:', g.name)
"

echo "Done. Reload Arches in your browser."

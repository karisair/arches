"""Make the Arches example package (built for Arches 7.4) loadable into Arches 8.1.

Usage: python patch_example_pkg.py <path-to-arches-example-pkg>

Changes, all made in place on the downloaded copy:
1. Give every graph a slug. Arches 8 requires one; the package's graphs have none.
2. Remove the package's old copies of Arches' own "Settings ..." branches. Arches 8
   ships its own versions, and the old ones clash with them.
3. Add the map_layers columns Arches 8 made required (searchonly, sortorder,
   ispublic) to the package's SQL that adds the "Search Results" map layer.
"""

import json
import re
import sys
from pathlib import Path


def slugify(name):
    if isinstance(name, dict):  # translated names, e.g. {"en": "Heritage Resource"}
        name = name.get("en") or next(iter(name.values()), "")
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def add_slugs(pkg):
    used = set()
    for path in sorted((pkg / "graphs").rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for graph in data.get("graph", []):
            if graph.get("slug"):
                used.add(graph["slug"])
                continue
            base = slugify(graph.get("name") or path.stem)
            slug, n = base, 2
            while slug in used:
                slug, n = f"{base}_{n}", n + 1
            graph["slug"] = slug
            used.add(slug)
            changed = True
        if changed:
            path.write_text(json.dumps(data, indent=4), encoding="utf-8")
            print(f"slug added: {path.relative_to(pkg)}")


def remove_core_settings_branches(pkg):
    for path in sorted((pkg / "graphs" / "branches").glob("Settings *.json")):
        path.unlink()
        print(f"removed (Arches 8 ships its own): {path.relative_to(pkg)}")


def fix_search_layer_sql(pkg):
    path = pkg / "preliminary_sql" / "add_search_layer.sql"
    if not path.exists():
        return
    sql = path.read_text(encoding="utf-8")
    columns = "activated, addtomap)"
    values = "TRUE, TRUE);"
    if "searchonly" in sql or columns not in sql or not sql.rstrip().endswith(values):
        return
    sql = sql.replace(columns, "activated, addtomap, searchonly, sortorder, ispublic)", 1)
    head, _, tail = sql.rpartition(values)
    path.write_text(head + "TRUE, TRUE, FALSE, 0, TRUE);" + tail, encoding="utf-8")
    print(f"map_layers columns added: {path.relative_to(pkg)}")


if __name__ == "__main__":
    package_dir = Path(sys.argv[1])
    add_slugs(package_dir)
    remove_core_settings_branches(package_dir)
    fix_search_layer_sql(package_dir)

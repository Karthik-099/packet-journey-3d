#!/usr/bin/env python3
"""
Build public/data/cables.json from TeleGeography's Submarine Cable Map GeoJSON.

  curl -o cable-geo.json https://www.submarinecablemap.com/api/v3/cable/cable-geo.json
  curl -o landing-point-geo.json https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json
  python3 -I scripts/build-cable-data.py cable-geo.json landing-point-geo.json

Data: TeleGeography Submarine Cable Map, licensed CC BY-NC-SA 3.0 (attribution kept in the output).
Coordinates are rounded to 0.05° (~5 km) to keep the file small; that is far below what the globe can show.
"""
import json
import sys


def r(v):
    return round(round(v / 0.05) * 0.05, 2)


def main(cable_path, landing_path, out_path="public/data/cables.json"):
    cables = json.load(open(cable_path, encoding="utf-8"))["features"]
    lands = json.load(open(landing_path, encoding="utf-8"))["features"]
    out_cables = []
    for f in cables:
        p = f.get("properties", {})
        g = f.get("geometry") or {}
        lines = g.get("coordinates", []) if g.get("type") == "MultiLineString" else [g.get("coordinates", [])]
        segs = []
        for line in lines:
            pts = []
            for lon, lat, *_ in line:
                q = [r(lon), r(lat)]
                if not pts or pts[-1] != q:
                    pts.append(q)
            if len(pts) > 1:
                segs.append(pts)
        if segs:
            out_cables.append({"n": str(p.get("name", ""))[:80], "c": str(p.get("color", "#22d3ee"))[:9], "s": segs})
    out_lands = []
    for f in lands:
        lon, lat = f["geometry"]["coordinates"][:2]
        out_lands.append([r(lon), r(lat), str(f.get("properties", {}).get("name", ""))[:60]])
    data = {
        "source": "TeleGeography Submarine Cable Map (submarinecablemap.com), CC BY-NC-SA 3.0",
        "cables": out_cables,
        "landings": out_lands,
    }
    json.dump(data, open(out_path, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    print(f"{len(out_cables)} cables, {len(out_lands)} landing points -> {out_path}")


if __name__ == "__main__":
    main(*sys.argv[1:3])

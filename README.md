# 🪸 Reef Watch

> Real-time global coral bleaching monitor — live sea surface temps, degree heating weeks, and stress levels across every major reef system on Earth.

![Status](https://img.shields.io/badge/status-live-00e5a0?style=flat-square)
![Data](https://img.shields.io/badge/data-coral.tsr.lol-1a4a7a?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-f5c842?style=flat-square)

## What it does

Reef Watch pulls live data from the [Coral Stress API](https://api.coral.tsr.lol) and plots every monitored reef station on an interactive 3D globe. Each dot is colored by thermal stress level — from healthy green to critical red — updated in real time.

Hover any reef to see:
- Max sea surface temperature
- Bleaching threshold
- Degree Heating Weeks (DHW)
- Current stress classification

## Stress levels

| Color | Level | Meaning |
|-------|-------|---------|
| 🟢 `#00e5a0` | No Stress | Reef is healthy |
| 🟡 `#f5c842` | Bleach Watch | Temps elevated, monitor closely |
| 🟠 `#ff7c2a` | Bleach Alert 1 | Active bleaching likely |
| 🔴 `#ff2d55` | Bleach Alert 2 | Severe bleaching underway |
| 🔴 `#ff0066` | Critical | Mortality risk |

## Stack

- [globe.gl](https://globe.gl) — 3D WebGL globe
- [three.js](https://threejs.org) — 3D rendering
- [Coral Stress API](https://api.coral.tsr.lol) — reef monitoring data

No build step. No dependencies to install. Just open `index.html`.

## Run locally

```bash
git clone https://github.com/yourname/reef-watch
cd reef-watch
open index.html
```

> **Note:** The API is fetched via [allorigins.win](https://allorigins.win) to bypass CORS. For production, proxy the API server-side.

## File structure

```
reef-watch/
├── index.html   # markup
├── style.css    # styles + CSS variables
└── main.js      # globe setup, data fetching, tooltip logic
```

## Why it matters

50% of the world's coral reefs have disappeared since the 1950s. The ones that remain are under accelerating thermal stress from climate change. Reef Watch makes that crisis visible in real time, for anyone.

---

Data provided by [coral.tsr.lol](https://api.coral.tsr.lol) · Built at a hackathon
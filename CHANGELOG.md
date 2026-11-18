# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned
- Live online battles between two devices
- Hall of Fame and leaderboard
- Lobby to find and challenge human players

## [1.0.0] – 2026-11-18

### Added
- Complete game: 9×9 board with light, dark and cycling squares, five power points, 18 pieces per side in the original line-up.
- Real-time arena with 8-direction attacks, weapon ranges, reload times and fading obstacles; Phoenix, Banshee and Shapeshifter specials.
- The seven original spells: Teleport, Heal, Shift Time, Exchange, Summon Elemental, Revive, Imprison.
- Single player against the AI with three difficulty levels; two-player pass & play.
- High-resolution vector unit artwork modelled on the original silhouettes.
- English and German user interface with automatic detection and manual switch.
- Mobile optimisation for iOS Safari and Android Chrome (safe areas, full screen, back button, wake lock, haptics).
- Offline-capable PWA with service worker, auto-save and "Continue game".
- Resilience: validated save data, watchdog for stuck turns, error boundary, background pause.
- Production container (unprivileged nginx) with security headers, caching rules, health check and Coolify-ready Compose file.
- SEO: meta description, canonical URL, Open Graph/Twitter cards, JSON-LD, robots.txt, sitemap.xml, 404 page.
- CI: syntax and consistency checks, Docker build and smoke test.

[Unreleased]: https://github.com/drhdev/archon-neo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/drhdev/archon-neo/releases/tag/v1.0.0

# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned
- Live online battles between two devices
- Hall of Fame and leaderboard
- Lobby to find and challenge human players

## [1.1.0] – 2026-11-18

### Added
- **The Legend** – an illustrated story intro in seven chapters: the tale of the Balance, the board and the cycle of light, every unit with portrait, lore and stats, the arena, the old magic and the paths to victory. Shown on first launch and any time from the menu.
- Title screen that unlocks audio with the first tap.
- New audio engine: SID-inspired synthesis with compressor, generated reverb and stereo panning; a distinct sound for every weapon, footsteps per square on the board, power-point chime.
- Original background music for the title/menu, the board and the arena, with a separate music switch.
- Redesigned arena: painted flagstone floor in the colour of the contested square, engraved compass of the eight attack directions, faceted stone pillars with shimmering runes that dissolve and return, army-coloured frame.
- Duel announcement with both champions' portraits, life and square bonus.
- Keyboard play on the board (cursor with arrows/WASD, Enter/Space, E for the spellbook); Esc closes dialogs.
- Game-over summary (round and remaining pieces).

### Changed
- Move animations now take longer for longer moves.
- Story and lore typography uses the system serif font.

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

[Unreleased]: https://github.com/drhdev/archon-neo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/drhdev/archon-neo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/drhdev/archon-neo/releases/tag/v1.0.0

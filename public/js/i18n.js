/**
 * Archon NEO – internationalisation (English / German).
 * English is the default; German is picked automatically for German browsers.
 * Strings may contain {placeholders}. Keys ending in ".html" contain trusted markup.
 */

export const LANGS = ['en', 'de'];

const RULES_EN = `
<p><b>Goal:</b> Destroy every enemy piece, occupy all 5 power points (◇) at once – or leave your opponent with nothing but imprisoned pieces.</p>
<p><b>Board:</b> Tap one of your pieces, then a target square – or swipe the piece onto the target. Ground units move straight (no diagonals) and cannot pass other pieces. Flyers move in any direction and fly over pieces; the Wizard and the Sorceress teleport.</p>
<p><b>Cycle of light:</b> Light squares strengthen Light, dark squares strengthen Darkness. The dotted squares change their brightness every round (see “Cycle”, top right). In combat the square colour grants up to +7 life.</p>
<p><b>Power points:</b> Wounded pieces heal slowly, much faster on a power point. Pieces on power points are immune to all spells.</p>
<p><b>Combat:</b> Moving onto an enemy starts a real-time duel. Move with the joystick (bottom left) and attack with the button (bottom right). As in the original, attacks only go in 8 directions (arrow at your piece); every weapon has its own range and reload time (ring around the attack button). Obstacles fade in and out – while solid they block movement and shots.</p>
<p><b>Specials:</b> The Phoenix bursts into flames and is invulnerable meanwhile. The Banshee’s wail hurts everything near her. The Shapeshifter takes on the form, weapon and life of its opponent.</p>
<p><b>Magic:</b> Select your Wizard or Sorceress and tap “Spell”. There are the 7 original spells: Teleport, Heal, Shift Time, Exchange, Summon Elemental, Revive and Imprison. Each can be cast once per game and uses up your turn.</p>
<p><b>Two players:</b> In combat Light plays at the bottom, Darkness at the top (rotated controls) – put the phone flat between you.</p>`;

const RULES_DE = `
<p><b>Ziel:</b> Lösche alle gegnerischen Figuren aus, besetze alle 5 Machtpunkte (◇) gleichzeitig – oder lass dem Gegner nur noch gefangene Figuren.</p>
<p><b>Brett:</b> Tippe eine eigene Figur an und dann ein Zielfeld – oder wische die Figur direkt aufs Ziel. Bodentruppen ziehen waagerecht/senkrecht und können nicht durch Figuren laufen. Flieger ziehen in alle Richtungen und überfliegen Figuren; Magier und Hexe teleportieren sich.</p>
<p><b>Lichtzyklus:</b> Helle Felder stärken das Licht, dunkle die Dunkelheit. Die Felder mit Punkten wechseln jede Runde ihre Helligkeit (Anzeige „Zyklus“ oben rechts). Im Kampf gibt die Feldfarbe bis zu +7 Lebenskraft.</p>
<p><b>Machtpunkte:</b> Verwundete Figuren heilen langsam, auf Machtpunkten deutlich schneller. Figuren auf Machtpunkten sind immun gegen alle Zauber.</p>
<p><b>Kampf:</b> Ziehst du auf eine gegnerische Figur, beginnt ein Echtzeit-Duell. Links unten bewegst du dich mit dem Joystick, rechts unten greifst du an. Wie im Original wird nur in 8 Richtungen angegriffen (Pfeil an der Figur), jede Waffe hat eigene Reichweite und Nachladezeit (Ring um den Angriffs-Button). Hindernisse tauchen auf und verschwinden – solange sie fest sind, blockieren sie Bewegung und Schüsse.</p>
<p><b>Besonderheiten:</b> Der Phönix explodiert in Flammen und ist dabei unverwundbar. Die Banshee schadet mit ihrem Klageschrei allem in ihrer Nähe. Der Gestaltwandler nimmt Gestalt, Waffe und Lebenskraft seines Gegners an.</p>
<p><b>Magie:</b> Wähle Magier bzw. Hexe und tippe auf „Zauber“. Es gibt die 7 Zauber des Originals: Teleport, Heilen, Zeitverschiebung, Tausch, Elementar beschwören, Wiederbeleben und Kerker. Jeder Zauber geht nur einmal pro Partie und kostet einen Zug.</p>
<p><b>2 Spieler:</b> Im Kampf spielt Licht unten, Dunkelheit oben (gedrehte Steuerung) – legt das Handy flach zwischen euch.</p>`;

const STRINGS = {
  en: {
    'meta.title': 'Archon NEO – Light vs. Dark',
    'menu.subtitle': 'Light vs. Dark',
    'menu.continue': 'Continue game',
    'menu.difficulty': 'AI difficulty',
    'diff.easy': 'Easy', 'diff.normal': 'Normal', 'diff.hard': 'Hard',
    'menu.playLight': '1 Player · Light',
    'menu.playDark': '1 Player · Darkness',
    'menu.pvp': '2 Players · Pass & Play',
    'menu.rules': 'How to play',
    'menu.soon': 'Coming soon',
    'soon.online': 'Live online battles',
    'soon.hof': 'Hall of Fame & leaderboard',
    'soon.lobby': 'Lobby – challenge human players who are ready to play',
    'menu.hint': 'iPhone: turn off silent mode for sound, “Add to Home Screen” for full screen. Android: starts in full screen, Back = pause.',
    'menu.disclaimer': 'A non-commercial fan tribute. Not affiliated with the original rights holders.',
    'lang.switch': 'Deutsch',
    'lang.aria': 'Switch language',
    'hud.menu': 'Menu',
    'hud.cycle': 'CYCLE',
    'hud.spell': 'SPELL',
    'hud.back': 'BACK',
    'pause.title': 'Paused',
    'pause.resume': 'Resume',
    'pause.soundOn': 'Sound: on',
    'pause.soundOff': 'Sound: off',
    'pause.quit': 'Main menu',
    'spells.title': 'Spellbook',
    'spells.revive': 'Revive whom?',
    'spells.cancel': 'Cancel',
    'spells.used': ' · used',
    'rules.title': 'How to play',
    'rules.html': RULES_EN,
    'rules.units': 'Units',
    'rules.elementals': 'Elementals (summoned)',
    'rules.life': 'Life {n}',
    'rules.strength': 'Strength {n}',
    'rules.close': 'Got it',
    'go.again': 'Rematch',
    'go.menu': 'Main menu',
    'error.title': 'Something went wrong',
    'error.text': 'The game hit an unexpected error. Your last turn has been saved – reload to continue.',
    'error.reload': 'Reload',
    'rotate.text': 'Please turn your device to portrait mode.',
    'side.light': 'Light', 'side.dark': 'Darkness',
    'turn.yours': '{side} · Your move',
    'turn.ai': '{side} · AI',
    'turn.pvp': '{side} to move',
    'info.thinking': 'The AI is thinking …',
    'info.idle': 'Tap a piece, then a target – or swipe it there.',
    'info.round': 'Round {n}',
    'info.spellsLeft': 'Spells left: {n}',
    'info.cycleUp': 'cycle brightening',
    'info.cycleDown': 'cycle darkening',
    'info.over': 'Game over.',
    'info.life': 'Life {a}/{b}',
    'info.square': 'Square +{n}',
    'info.strength': 'Strength {n}',
    'info.pp': 'power point',
    'info.jailed': 'imprisoned',
    'move.ground': 'Ground', 'move.fly': 'Flies', 'move.teleport': 'Teleports',
    'toast.youLight': 'You play Light',
    'toast.youDark': 'You play Darkness',
    'toast.lightStarts': 'Light begins!',
    'toast.toMove': '{side} to move',
    'toast.cannotMove': '{side} cannot move.',
    'toast.jailed': 'Imprisoned!',
    'toast.freed': '{unit} is free!',
    'toast.spell': '{side}: {text}',
    'toast.restored': 'Game restored',
    'fx.healed': '{unit} healed',
    'fx.jailed': '{unit} imprisoned',
    'fx.revived': '{unit} revived',
    'fx.shift': 'Time shift!',
    'fx.exchange': '{a} ⇄ {b}',
    'fx.teleport': '{unit} teleported',
    'fx.summon': '{unit} summoned!',
    'hint.heal': 'Tap one of your wounded pieces.',
    'hint.teleport1': 'Tap the piece to teleport.',
    'hint.teleport2': 'Tap the destination (enemies on power points are off limits).',
    'hint.exchange1': 'Tap the first piece.',
    'hint.exchange2': 'Tap the second piece.',
    'hint.summon': 'Tap the enemy piece the elemental should attack.',
    'hint.revive': 'Tap a free square next to your spellcaster ({unit}).',
    'hint.imprison': 'Tap an enemy piece.',
    'win.light': 'Light wins!', 'win.dark': 'Darkness wins!', 'win.draw': 'Draw',
    'reason.wipe': 'All enemies have been destroyed.',
    'reason.both': 'Both armies were wiped out.',
    'reason.pp': 'All 5 power points are occupied.',
    'reason.jailedLight': 'Light has only imprisoned pieces left.',
    'reason.jailedDark': 'Darkness has only imprisoned pieces left.',
    'reason.stuck': 'Neither side can move.',
    'combat.vs': 'VS',
    'combat.fight': 'FIGHT!',
    'combat.wins': '{unit} wins!',
    'combat.both': 'Both fall!',
    'combat.timeout': 'Time up – retreat!',
    'combat.time': 'Time: {n}',
    'combat.attack': 'ATTACK',
    'combat.ai': ' (AI)',
    'combat.shifter': 'Shifter ({unit})',
    'spell.teleport.name': 'Teleport', 'spell.teleport.desc': 'Moves one of your pieces to any square – even straight into combat.',
    'spell.heal.name': 'Heal', 'spell.heal.desc': 'Fully heals one of your wounded pieces.',
    'spell.shift.name': 'Shift Time', 'spell.shift.desc': 'Reverses the cycle of light. At an extreme it jumps to the opposite one.',
    'spell.exchange.name': 'Exchange', 'spell.exchange.desc': 'Two pieces of either side swap places.',
    'spell.summon.name': 'Summon Elemental', 'spell.summon.desc': 'A random elemental (air, earth, fire, water) fights an enemy piece and vanishes afterwards.',
    'spell.revive.name': 'Revive', 'spell.revive.desc': 'Brings a fallen piece back on a free square next to your spellcaster.',
    'spell.imprison.name': 'Imprison', 'spell.imprison.desc': 'An enemy piece is held until the cycle of light reaches its colour.',
    'unit.knight.name': 'Knight', 'unit.knight.role': 'Melee · sword',
    'unit.archer.name': 'Archer', 'unit.archer.role': 'Ranged · arrows',
    'unit.valkyrie.name': 'Valkyrie', 'unit.valkyrie.role': 'Flyer · magic spear',
    'unit.golem.name': 'Golem', 'unit.golem.role': 'Colossus · boulder',
    'unit.unicorn.name': 'Unicorn', 'unit.unicorn.role': 'Fast · energy bolt',
    'unit.djinni.name': 'Djinni', 'unit.djinni.role': 'Flyer · whirlwind',
    'unit.phoenix.name': 'Phoenix', 'unit.phoenix.role': 'Flyer · fire blast (invulnerable)',
    'unit.wizard.name': 'Wizard', 'unit.wizard.role': 'Spellcaster · fireball',
    'unit.goblin.name': 'Goblin', 'unit.goblin.role': 'Melee · club',
    'unit.manticore.name': 'Manticore', 'unit.manticore.role': 'Ranged · tail spikes',
    'unit.banshee.name': 'Banshee', 'unit.banshee.role': 'Flyer · wail',
    'unit.troll.name': 'Troll', 'unit.troll.role': 'Colossus · boulder',
    'unit.basilisk.name': 'Basilisk', 'unit.basilisk.role': 'Fast · deadly gaze',
    'unit.dragon.name': 'Dragon', 'unit.dragon.role': 'Flyer · fire breath (short)',
    'unit.shapeshifter.name': 'Shapeshifter', 'unit.shapeshifter.role': 'Flyer · copies its foe',
    'unit.sorceress.name': 'Sorceress', 'unit.sorceress.role': 'Spellcaster · lightning',
    'unit.air.name': 'Air Elemental', 'unit.air.role': 'Elemental · storm',
    'unit.earth.name': 'Earth Elemental', 'unit.earth.role': 'Elemental · rock',
    'unit.fire.name': 'Fire Elemental', 'unit.fire.role': 'Elemental · flames',
    'unit.water.name': 'Water Elemental', 'unit.water.role': 'Elemental · ice',
  },
  de: {
    'meta.title': 'Archon NEO – Licht gegen Dunkelheit',
    'menu.subtitle': 'Licht gegen Dunkelheit',
    'menu.continue': 'Partie fortsetzen',
    'menu.difficulty': 'KI-Stärke',
    'diff.easy': 'Leicht', 'diff.normal': 'Normal', 'diff.hard': 'Schwer',
    'menu.playLight': '1 Spieler · Licht',
    'menu.playDark': '1 Spieler · Dunkelheit',
    'menu.pvp': '2 Spieler · Pass & Play',
    'menu.rules': 'Spielregeln',
    'menu.soon': 'Demnächst',
    'soon.online': 'Live-Online-Duelle',
    'soon.hof': 'Hall of Fame & Bestenliste',
    'soon.lobby': 'Lobby – spielbereite menschliche Gegner herausfordern',
    'menu.hint': 'iPhone: Für Ton den Stummschalter deaktivieren, „Zum Home-Bildschirm“ für Vollbild. Android: startet im Vollbild, Zurück = Pause.',
    'menu.disclaimer': 'Eine nicht-kommerzielle Fan-Hommage. Keine Verbindung zu den ursprünglichen Rechteinhabern.',
    'lang.switch': 'English',
    'lang.aria': 'Sprache wechseln',
    'hud.menu': 'Menü',
    'hud.cycle': 'ZYKLUS',
    'hud.spell': 'ZAUBER',
    'hud.back': 'ZURÜCK',
    'pause.title': 'Pause',
    'pause.resume': 'Weiter',
    'pause.soundOn': 'Ton: an',
    'pause.soundOff': 'Ton: aus',
    'pause.quit': 'Zum Hauptmenü',
    'spells.title': 'Zauberbuch',
    'spells.revive': 'Wen erwecken?',
    'spells.cancel': 'Abbrechen',
    'spells.used': ' · verbraucht',
    'rules.title': 'Spielregeln',
    'rules.html': RULES_DE,
    'rules.units': 'Einheiten',
    'rules.elementals': 'Elementare (beschworen)',
    'rules.life': 'Lebenskraft {n}',
    'rules.strength': 'Stärke {n}',
    'rules.close': 'Verstanden',
    'go.again': 'Revanche',
    'go.menu': 'Zum Hauptmenü',
    'error.title': 'Da ist etwas schiefgelaufen',
    'error.text': 'Das Spiel hatte einen unerwarteten Fehler. Dein letzter Zug ist gespeichert – lade neu, um weiterzuspielen.',
    'error.reload': 'Neu laden',
    'rotate.text': 'Bitte dreh dein Gerät ins Hochformat.',
    'side.light': 'Licht', 'side.dark': 'Dunkelheit',
    'turn.yours': '{side} · Dein Zug',
    'turn.ai': '{side} · KI',
    'turn.pvp': '{side} am Zug',
    'info.thinking': 'Die KI überlegt …',
    'info.idle': 'Figur antippen, dann Ziel – oder hinwischen.',
    'info.round': 'Runde {n}',
    'info.spellsLeft': 'Zauber übrig: {n}',
    'info.cycleUp': 'Zyklus wird heller',
    'info.cycleDown': 'Zyklus wird dunkler',
    'info.over': 'Partie beendet.',
    'info.life': 'LK {a}/{b}',
    'info.square': 'Feld +{n}',
    'info.strength': 'Stärke {n}',
    'info.pp': 'Machtpunkt',
    'info.jailed': 'im Kerker',
    'move.ground': 'Boden', 'move.fly': 'Flug', 'move.teleport': 'Teleport',
    'toast.youLight': 'Du spielst das Licht',
    'toast.youDark': 'Du spielst die Dunkelheit',
    'toast.lightStarts': 'Licht beginnt!',
    'toast.toMove': '{side} ist am Zug',
    'toast.cannotMove': '{side} kann nicht ziehen.',
    'toast.jailed': 'Im Kerker gefangen!',
    'toast.freed': '{unit} ist frei!',
    'toast.spell': '{side}: {text}',
    'toast.restored': 'Partie wiederhergestellt',
    'fx.healed': '{unit} geheilt',
    'fx.jailed': '{unit} im Kerker',
    'fx.revived': '{unit} erweckt',
    'fx.shift': 'Zeitverschiebung!',
    'fx.exchange': '{a} ⇄ {b}',
    'fx.teleport': '{unit} teleportiert',
    'fx.summon': '{unit} beschworen!',
    'hint.heal': 'Tippe eine verwundete eigene Figur an.',
    'hint.teleport1': 'Tippe die Figur an, die teleportiert werden soll.',
    'hint.teleport2': 'Tippe das Zielfeld an (Gegner auf Machtpunkten sind tabu).',
    'hint.exchange1': 'Tippe die erste Figur an.',
    'hint.exchange2': 'Tippe die zweite Figur an.',
    'hint.summon': 'Tippe die feindliche Figur an, die das Elementar angreifen soll.',
    'hint.revive': 'Tippe ein freies Feld neben deinem Zauberer an ({unit}).',
    'hint.imprison': 'Tippe eine feindliche Figur an.',
    'win.light': 'Das Licht siegt!', 'win.dark': 'Die Dunkelheit siegt!', 'win.draw': 'Unentschieden',
    'reason.wipe': 'Alle Gegner wurden ausgelöscht.',
    'reason.both': 'Beide Heere wurden ausgelöscht.',
    'reason.pp': 'Alle 5 Machtpunkte sind besetzt.',
    'reason.jailedLight': 'Das Licht hat nur noch gefangene Figuren.',
    'reason.jailedDark': 'Die Dunkelheit hat nur noch gefangene Figuren.',
    'reason.stuck': 'Keine Seite kann mehr ziehen.',
    'combat.vs': 'VS',
    'combat.fight': 'KAMPF!',
    'combat.wins': '{unit} siegt!',
    'combat.both': 'Beide fallen!',
    'combat.timeout': 'Zeit abgelaufen – Rückzug!',
    'combat.time': 'Zeit: {n}',
    'combat.attack': 'ANGRIFF',
    'combat.ai': ' (KI)',
    'combat.shifter': 'Wandler ({unit})',
    'spell.teleport.name': 'Teleport', 'spell.teleport.desc': 'Versetzt eine eigene Figur auf ein beliebiges Feld – auch direkt in einen Kampf.',
    'spell.heal.name': 'Heilen', 'spell.heal.desc': 'Heilt eine verwundete eigene Figur vollständig.',
    'spell.shift.name': 'Zeitverschiebung', 'spell.shift.desc': 'Kehrt den Lichtzyklus um. Steht er an einem Extrem, springt er zum anderen.',
    'spell.exchange.name': 'Tausch', 'spell.exchange.desc': 'Zwei beliebige Figuren (auch gegnerische) tauschen ihre Plätze.',
    'spell.summon.name': 'Elementar beschwören', 'spell.summon.desc': 'Ein zufälliges Elementar (Luft, Erde, Feuer, Wasser) kämpft gegen eine feindliche Figur und verschwindet danach.',
    'spell.revive.name': 'Wiederbeleben', 'spell.revive.desc': 'Holt eine gefallene Figur auf ein freies Feld neben deinem Zauberer zurück.',
    'spell.imprison.name': 'Kerker', 'spell.imprison.desc': 'Eine feindliche Figur ist gefangen, bis der Lichtzyklus ihre Farbe erreicht.',
    'unit.knight.name': 'Ritter', 'unit.knight.role': 'Nahkampf · Schwert',
    'unit.archer.name': 'Bogenschützin', 'unit.archer.role': 'Fernkampf · Pfeile',
    'unit.valkyrie.name': 'Walküre', 'unit.valkyrie.role': 'Fliegerin · Zauberspeer',
    'unit.golem.name': 'Golem', 'unit.golem.role': 'Koloss · Felsbrocken',
    'unit.unicorn.name': 'Einhorn', 'unit.unicorn.role': 'Schnell · Energieblitz',
    'unit.djinni.name': 'Dschinn', 'unit.djinni.role': 'Flieger · Wirbelwind',
    'unit.phoenix.name': 'Phönix', 'unit.phoenix.role': 'Flieger · Feuerexplosion (unverwundbar)',
    'unit.wizard.name': 'Magier', 'unit.wizard.role': 'Zauberer · Feuerball',
    'unit.goblin.name': 'Goblin', 'unit.goblin.role': 'Nahkampf · Keule',
    'unit.manticore.name': 'Mantikor', 'unit.manticore.role': 'Fernkampf · Schwanzstacheln',
    'unit.banshee.name': 'Banshee', 'unit.banshee.role': 'Fliegerin · Klageschrei',
    'unit.troll.name': 'Troll', 'unit.troll.role': 'Koloss · Felsbrocken',
    'unit.basilisk.name': 'Basilisk', 'unit.basilisk.role': 'Schnell · Todesblick',
    'unit.dragon.name': 'Drache', 'unit.dragon.role': 'Flieger · Feueratem (kurz)',
    'unit.shapeshifter.name': 'Gestaltwandler', 'unit.shapeshifter.role': 'Flieger · kopiert seinen Gegner',
    'unit.sorceress.name': 'Hexe', 'unit.sorceress.role': 'Zauberin · Blitz',
    'unit.air.name': 'Luftelementar', 'unit.air.role': 'Elementar · Sturm',
    'unit.earth.name': 'Erdelementar', 'unit.earth.role': 'Elementar · Fels',
    'unit.fire.name': 'Feuerelementar', 'unit.fire.role': 'Elementar · Flammen',
    'unit.water.name': 'Wasserelementar', 'unit.water.role': 'Elementar · Eis',
  },
};

let current = 'en';

export function detectLang(saved) {
  if (LANGS.includes(saved)) return saved;
  const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
  for (const p of prefs) {
    const code = String(p).toLowerCase().slice(0, 2);
    if (LANGS.includes(code)) return code;
  }
  return 'en';
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : 'en';
  document.documentElement.lang = current;
  return current;
}

export const getLang = () => current;

/** Translate a key; falls back to English, then to the key itself. */
export function t(key, vars) {
  let s = STRINGS[current][key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return s;
}

/** Applies translations to static markup: data-i18n (text), data-i18n-html (markup), data-i18n-aria (aria-label). */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

/** Exposed for the CI consistency check. */
export const _STRINGS = STRINGS;

# FX Scanner Pro — Design Brainstorm

## Vereisten
- FxTrendy-achtige forex trend scanner maar dan 1000x beter
- Donker thema, professioneel, TradingView-achtig
- Echte live data via Twelve Data API
- Candlestick charts met automatische patroonherkenning
- Scanner overzicht van alle paren
- Technische indicatoren (RSI, MACD, MA)
- Entry/SL/TP suggesties

---

<response>
<text>

## Idee 1: "Terminal Noir" — Bloomberg Terminal meets Cyberpunk

**Design Movement**: Neo-brutalist fintech met terminal-esthetiek
**Core Principles**:
1. Informatie-dichtheid boven alles — elk pixel telt
2. Monospace typografie voor data, sans-serif voor navigatie
3. Neon accenten op een pikzwarte achtergrond als visuele hiërarchie
4. Grid-gebaseerde modulaire layout zoals een echte trading terminal

**Color Philosophy**: Puur zwart (#0a0a0a) als basis. Neon groen (#00ff88) voor bullish, neon rood (#ff3366) voor bearish. Cyaan (#00d4ff) voor neutrale data. Geel (#ffd700) voor alerts. De kleuren "gloeien" subtiel — alsof je naar een high-end monitor kijkt in een donkere kamer.

**Layout Paradigm**: Full-screen terminal grid. Linker sidebar met pair-lijst (scrollbaar), centraal de chart die 60% van het scherm inneemt, rechts een smal analytics panel. Bovenaan een ticker-tape met live prijzen die horizontaal scrollen.

**Signature Elements**:
- Gloeiende neon borders rond actieve elementen
- Scanline-effect op de achtergrond (subtiele horizontale lijnen)
- Pulserende dots naast live data

**Interaction Philosophy**: Alles voelt als een command center. Hover onthult extra data in tooltips. Klikken op een pair "zoomt" de chart in met een smooth transition.

**Animation**: Ticker tape scrollt continu. Charts laden met een "drawing" animatie van links naar rechts. Pair cards hebben een subtle glow pulse wanneer er een nieuw signaal is. Transitie tussen pairs is een smooth morph van de chart data.

**Typography System**: JetBrains Mono voor alle numerieke data en prijzen. Space Grotesk voor headers en labels. Gewichten: 700 voor titels, 500 voor labels, 400 voor body data.

</text>
<probability>0.06</probability>
</response>

<response>
<text>

## Idee 2: "Obsidian Flow" — Premium Dark Glass Morphism

**Design Movement**: Glassmorphism gecombineerd met premium fintech design
**Core Principles**:
1. Gelaagdheid door transparantie en blur — diepte zonder zwaarte
2. Zachte randen en subtiele schaduwen voor een premium gevoel
3. Kleurgebruik is minimaal maar impactvol — wit en goud als accenten
4. Vloeiende overgangen die de data "levend" laten voelen

**Color Philosophy**: Diepe obsidiaan achtergrond (#0d1117 naar #161b22 gradient). Glasachtige panels met rgba(255,255,255,0.05) achtergrond en backdrop-blur. Emerald groen (#10b981) voor bullish, rose (#f43f5e) voor bearish. Goud (#f59e0b) voor premium accenten en belangrijke signalen.

**Layout Paradigm**: Asymmetrische dashboard layout. Bovenaan een brede hero-zone met de geselecteerde chart. Daaronder een masonry-achtige grid van pair cards die zich aanpassen aan de content. Linker navigatie als een smalle icon-bar die expandeert on hover.

**Signature Elements**:
- Frosted glass panels met subtiele border-glow
- Gradient mesh achtergronden in de hero sectie
- Micro-animaties op data updates (numbers morphen)

**Interaction Philosophy**: Elegant en vloeiend. Cards liften op bij hover met een zachte schaduw. De chart reageert op muisbewegingen met een crosshair. Navigatie voelt als het bladeren door een premium magazine.

**Animation**: Staggered entrance van cards (30ms delay per card). Chart candles "groeien" omhoog bij laden. Smooth number transitions bij prijsupdates (count-up effect). Panel transitions gebruiken spring physics.

**Typography System**: Plus Jakarta Sans voor alle UI tekst — modern, geometrisch, premium. Tabular numbers voor prijzen (monospaced cijfers). Gewichten: 800 voor grote titels, 600 voor section headers, 500 voor labels, 400 voor body.

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Idee 3: "Stealth Ops" — Military-Grade Trading Intelligence

**Design Movement**: Tactical/military UI design — denk aan F-35 cockpit displays
**Core Principles**:
1. Functionaliteit is de esthetiek — geen decoratie, pure informatie
2. Hoog contrast voor snelle scanability
3. Hiërarchische kleurcodering: groen = veilig, amber = waarschuwing, rood = gevaar
4. Compacte, dense layout die maximale data toont

**Color Philosophy**: Donker marineblauw (#0a0f1a) als basis. Militair groen (#22c55e) voor bullish/positief. Amber (#f59e0b) voor neutrale waarschuwingen. Rood (#ef4444) voor bearish/gevaar. Alle kleuren op 80% opacity voor subtiliteit, 100% voor actieve alerts. Witte tekst (#e2e8f0) voor primaire data.

**Layout Paradigm**: Command & Control layout. Bovenaan een status bar met market overview en klok. Links een verticale pair-selector met mini-sparklines. Centraal een groot chart-area met overlay panels. Onderaan een "intelligence feed" met recente signalen en alerts.

**Signature Elements**:
- Hoekige borders met 45-graden cuts (militaire badge-stijl)
- Radar-achtige scanning animatie in de scanner
- Status indicators met pulserende rings

**Interaction Philosophy**: Precies en direct. Geen onnodige animaties — alles reageert instant. Keyboard shortcuts voor power users. Data updates flashen kort op in de accent kleur voordat ze settelen.

**Animation**: Minimaal maar impactvol. Scanning pulse op de scanner pagina. Flash-highlight bij prijsupdates (200ms). Smooth maar snelle page transitions (150ms). Loading states gebruiken een "radar sweep" animatie.

**Typography System**: Inter voor UI, Fira Code voor numerieke data. Uppercase voor labels en categorieën. Gewichten: 700 voor alerts, 600 voor headers, 500 voor labels, 400 voor data.

</text>
<probability>0.04</probability>
</response>

---

## Gekozen Design: Idee 2 — "Obsidian Flow"

Dit design combineert premium uitstraling met functionaliteit. De glassmorphism elementen geven diepte zonder de data te overweldigen. De kleurkeuze (emerald/rose) is duidelijk leesbaar en de asymmetrische layout maakt het uniek ten opzichte van standaard trading dashboards.

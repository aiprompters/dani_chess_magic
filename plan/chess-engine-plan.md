# Schach-Engine & Spielmodi — Implementierungsplan

## Übersicht

Eigene Schach-KI mit austauschbaren Spielmodi. Die Engine läuft clientseitig (Web Worker) für Singleplayer und optional serverseitig für Online-Partien gegen den Computer.

---

## 1. Architektur

```
shared/
  types.ts              ← erweiterte Typen (GameMode, EngineConfig)
  engine/
    core/
      move-generator.ts ← legale Züge berechnen
      board.ts          ← Board-Repräsentation (Bitboard oder Array)
      zobrist.ts        ← Hashing für Transposition Table
    search/
      minimax.ts        ← Minimax mit Alpha-Beta-Pruning
      evaluation.ts     ← Stellungsbewertung
      opening-book.ts   ← Eröffnungsbuch (optional)
    modes/
      base-mode.ts      ← Interface/Basisklasse für Spielmodi
      standard.ts       ← Normales Schach
      must-capture.ts   ← Schlagzwang
      king-of-hill.ts   ← King of the Hill
      three-check.ts    ← Drei-Schach
      atomic.ts         ← Atomar-Schach
      horde.ts          ← Horde-Variante
    engine.ts           ← Haupt-Engine (verbindet Search + Mode)
client/
  src/
    workers/
      engine.worker.ts  ← Web Worker für KI-Berechnung
    components/
      ModeSelect.tsx    ← Spielmodus-Auswahl UI
      DifficultySelect.tsx ← Schwierigkeitsgrad
      ComputerGameView.tsx ← Partie gegen Computer
    hooks/
      useEngine.ts      ← Hook für Engine-Kommunikation
```

---

## 2. Spielmodi

### 2.1 Standard
- Normale FIDE-Regeln
- Gewinn durch Schachmatt oder Aufgabe
- Remis durch Patt, 50-Züge-Regel, dreifache Stellungswiederholung, ungenügendes Material

### 2.2 Schlagzwang (Must-Capture / Räuberschach)
- Wenn ein Schlagzug möglich ist, MUSS geschlagen werden
- Bei mehreren Schlagzügen: freie Wahl welcher
- Gewinner: wer zuerst alle eigenen Figuren verliert ODER kein Zug mehr möglich
- König ist KEINE besondere Figur (kann geschlagen werden)
- Kein Schach-Konzept

### 2.3 King of the Hill
- Normale Schachregeln PLUS:
- Zusätzliche Gewinnbedingung: König erreicht eines der 4 Zentrumsfelder (d4, d5, e4, e5)
- Engine muss Zentrumskontrolle höher bewerten

### 2.4 Drei-Schach (Three-Check)
- Normale Schachregeln PLUS:
- Zusätzliche Gewinnbedingung: 3x Schach geben
- Schach-Zähler für beide Seiten
- Engine bewertet Schach-Angriffe aggressiver

### 2.5 Atomic Chess
- Bei jedem Schlagzug "explodieren" alle Figuren im 3x3-Bereich um das Zielfeld
- Bauern überleben Explosionen
- König kann nicht schlagen (würde sich selbst zerstören)
- Gewinn: gegnerischen König in Explosion zerstören

### 2.6 Horde (optional, Stretch Goal)
- Schwarz hat normale Aufstellung
- Weiß hat 36 Bauern
- Weiß gewinnt durch Schachmatt, Schwarz durch Schlagen aller Bauern

---

## 3. Engine-Kern

### 3.1 Board-Repräsentation
- **8x8 Array** (einfacher) oder **0x88-Board** (schneller)
- FEN-Import/Export für Kompatibilität mit bestehendem Code (chess.js)
- Empfehlung: 0x88 — guter Kompromiss aus Speed und Einfachheit

### 3.2 Zuggenerator
- Alle legalen Züge für aktuelle Stellung
- Spezialzüge: Rochade, En Passant, Bauernumwandlung
- Schach-Erkennung, Pin-Erkennung
- **Pro Spielmodus filterbar** (z.B. Schlagzwang filtert nicht-schlagende Züge)

### 3.3 Suchalgorithmus

```
Minimax + Alpha-Beta-Pruning
├── Iterative Deepening (Tiefe schrittweise erhöhen)
├── Move Ordering (beste Züge zuerst → besseres Pruning)
│   ├── Schlagzüge zuerst (MVV-LVA)
│   ├── Killer Moves
│   └── History Heuristic
├── Quiescence Search (Schlagzüge am Blattknoten weiter suchen)
└── Transposition Table (Zobrist Hashing, bereits bewertete Stellungen cachen)
```

### 3.4 Bewertungsfunktion

| Faktor | Gewicht | Beschreibung |
|--------|---------|--------------|
| Material | hoch | Bauer=100, Springer=320, Läufer=330, Turm=500, Dame=900 |
| Piece-Square Tables | mittel | Positionswerte pro Figur pro Feld (Eröffnung vs Endspiel) |
| Königssicherheit | mittel | Bauernschild, offene Linien zum König |
| Bauernstruktur | mittel | Doppelbauern, isolierte Bauern, Freibauern |
| Mobilität | niedrig | Anzahl legaler Züge |
| Zentrumskontrolle | niedrig | Kontrolle über d4/d5/e4/e5 |

**Pro Spielmodus anpassbar:**
- King of the Hill → Zentrum extrem hoch gewichten, König-zum-Zentrum-Bonus
- Schlagzwang → Material VERLIEREN ist gut, Bewertung umgedreht
- Three-Check → Schach-Angriffsmöglichkeiten hoch bewerten
- Atomic → Explosions-Potenzial bewerten, Königsnähe gefährlich

### 3.5 Schwierigkeitsgrade

| Level | Suchtiefe | Bewertung | Extras |
|-------|-----------|-----------|--------|
| Anfänger | 2 | nur Material | zufällige Fehler einbauen |
| Leicht | 3 | Material + PST | gelegentliche suboptimale Züge |
| Mittel | 4 | voll | — |
| Schwer | 5-6 | voll | Quiescence, Transposition Table |
| Maximum | 6+ iterativ | voll | alles aktiv, Zeitlimit statt feste Tiefe |

---

## 4. Implementierungsreihenfolge

### Phase 1 — Fundament
1. Board-Repräsentation (0x88) mit FEN-Support
2. Zuggenerator für Standard-Schach
3. Minimax + Alpha-Beta (Tiefe 4)
4. Basis-Bewertung (Material + Piece-Square Tables)
5. Web Worker Integration
6. `ComputerGameView.tsx` — einfache UI: Spielen gegen Computer

### Phase 2 — Engine verbessern
7. Iterative Deepening
8. Move Ordering (MVV-LVA, Killer Moves)
9. Quiescence Search
10. Transposition Table (Zobrist)
11. Schwierigkeitsgrade UI + Logik

### Phase 3 — Spielmodi
12. Mode-Interface definieren (`GameMode` Basisklasse)
13. Standard-Modus als Referenz
14. Schlagzwang implementieren
15. King of the Hill implementieren
16. Three-Check implementieren
17. Atomic Chess implementieren
18. `ModeSelect.tsx` — Modus-Auswahl im UI

### Phase 4 — Polish
19. Eröffnungsbuch (kleine Datenbank häufiger Eröffnungen)
20. Horde-Variante (Stretch Goal)
21. Engine-Analyse-Modus (zeigt Bewertung + beste Variante an)
22. Zug-Animation + Sound für Computer-Züge

---

## 5. Spielmodus-Interface

```typescript
interface GameMode {
  name: string;
  description: string;

  // Regeln
  getLegalMoves(board: Board): Move[];
  isGameOver(board: Board): GameOverResult | null;
  isInCheck(board: Board, color: Color): boolean;

  // Startstellung
  getInitialFen(): string;

  // Bewertung (überschreibt/erweitert Standard)
  evaluatePosition(board: Board): number;

  // UI-Hinweise
  getExtraInfo(board: Board): ModeExtraInfo; // z.B. Check-Counter bei Three-Check
}
```

Jeder Modus implementiert dieses Interface. Die Engine ruft `mode.getLegalMoves()` statt direkt den Zuggenerator auf → der Modus kann Züge filtern (Schlagzwang) oder erweitern.

---

## 6. Technische Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Engine-Sprache | TypeScript | Gleiche Sprache wie Projekt, läuft im Browser |
| chess.js ersetzen? | Nein, parallel nutzen | chess.js für Online-Spiele, eigene Engine für KI + Modi |
| Web Worker | Ja | UI bleibt responsiv während KI rechnet |
| Board-Format | 0x88 | Schneller als 8x8-Array, einfacher als Bitboard |
| Eröffnungsbuch | JSON | Klein, einfach zu laden, ~500 Stellungen reichen |

---

## 7. Erwartete Spielstärke

- **Phase 1 fertig:** ~1200-1400 ELO (schlägt Anfänger zuverlässig)
- **Phase 2 fertig:** ~1600-1800 ELO (solider Vereinsspieler)
- **Mit Eröffnungsbuch:** ~1800-2000 ELO

Zum Vergleich: Stockfish liegt bei ~3500 ELO. Unsere Engine wird kein Weltmeister, aber für ein Browserspiel absolut respektabel.

---

## 8. Beziehung zum bestehenden Code

- `GameState` in `shared/types.ts` wird um `gameMode` Feld erweitert
- `GameRoom.ts` im Server bekommt Mode-Support für Online-Partien
- Neues `ComputerGameView.tsx` neben bestehendem `LocalGameView.tsx`
- Lobby bekommt "vs Computer" Button + Modus/Schwierigkeit-Auswahl
- Bestehender Online-Modus bleibt unverändert funktional

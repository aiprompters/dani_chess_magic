# Schach Online

Klassisches 2D-Schachspiel für zwei Spieler mit Online-Multiplayer, Drag & Drop und konfigurierbarer Schachuhr.

## Features

- **Online-Multiplayer**: Spiele gegen Freunde über WebSocket (Socket.IO)
- **Drag & Drop**: Intuitive Figurenbewegung per Touch/Maus
- **Mobile First**: Optimiert für Smartphones und Tablets
- **Schachuhr**: Konfigurierbare Zeitkontrolle mit Inkrement
- **Zeitvoreinstellungen**: Bullet (1 Min), Blitz (3/5 Min), Rapid (10/15 Min), Klassisch (30 Min)
- **Eigene Zeitkontrolle**: Beliebige Minuten + Inkrement
- **Schachregeln**: Vollständige Regelunterstützung inkl. Rochade, En Passant, Bauernumwandlung
- **Geschlagene Figuren**: Übersicht der geschlagenen Figuren
- **Raum-System**: Erstelle einen Raum und teile den Code mit deinem Gegner

## Tech Stack

- **Server**: Node.js, Express, Socket.IO, chess.js
- **Client**: React, TypeScript, Tailwind CSS, Vite
- **Kommunikation**: WebSocket (Socket.IO)

## Projektstruktur

```
├── server/          # Express + Socket.IO Server
│   └── src/
│       ├── index.ts       # Server-Einstiegspunkt
│       └── GameRoom.ts    # Spielraum-Logik
├── client/          # React Frontend
│   └── src/
│       ├── App.tsx              # Haupt-App
│       ├── components/
│       │   ├── ChessBoard.tsx   # Schachbrett mit Drag & Drop
│       │   ├── ChessClock.tsx   # Schachuhr-Anzeige
│       │   ├── ChessPieces.ts   # Figuren-Symbole
│       │   ├── GameView.tsx     # Spielansicht
│       │   ├── Lobby.tsx        # Lobby/Raum-Erstellung
│       │   └── PromotionDialog.tsx  # Bauernumwandlung
│       └── hooks/
│           └── useSocket.ts     # Socket.IO Hook
└── shared/          # Geteilte Typen
    └── types.ts
```

## Installation

```bash
# Dependencies installieren
cd server && npm install
cd ../client && npm install
cd .. && npm install
```

## Entwicklung

```bash
# Server + Client gleichzeitig starten
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Produktion

```bash
# Bauen
npm run build

# Starten
npm start
```

## Spielanleitung

1. **Spiel erstellen**: Wähle eine Zeitkontrolle und klicke "Spiel erstellen"
2. **Code teilen**: Teile den 6-stelligen Raum-Code mit deinem Gegner
3. **Beitreten**: Dein Gegner gibt den Code ein und klickt "Beitreten"
4. **Spielen**: Ziehe Figuren per Drag & Drop oder tippe auf eine Figur und dann auf das Zielfeld

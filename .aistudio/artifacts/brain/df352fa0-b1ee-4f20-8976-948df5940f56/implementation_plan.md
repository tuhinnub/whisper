# WhisperCode: Ephemeral Real-Time Messaging

WhisperCode is a privacy-focused, zero-login temporary messaging application where friends connect instantly using a unique 6-character room code or QR code. Conversations are purely ephemeral—held in server memory and wiped without a trace the moment users leave.

### User Review & Critical Decisions

> [!IMPORTANT]
> The cloud sandbox runtime provides a Node.js/TypeScript execution environment without native C++ compiler toolchains (`g++`/`clang++`). Based on your feedback during Phase 1:
> - **Confirmed Architecture**: We will build an Express + Node.js/TypeScript WebSocket backend (`ws`) on port 3000 featuring a clean, modular room engine with deterministic message dispatching and memory cleanup.
> - **Confirmed Persistence Model**: Purely ephemeral in-memory state. No database, no logs, zero permanent storage. When all participants leave, the room self-destructs instantly.
> - **Confirmed Real-Time Features**: Live typing indicators, multi-user emoji reactions, interactive QR code sharing modal, and one-tap invite links.

- **Confirmed Decision 1**: Single full-stack server running `server.ts` with Express and `ws` handling WebSocket upgrades alongside Vite dev/production middleware on port 3000.
- **Confirmed Decision 2**: Room IDs are human-friendly 6-character alphanumeric tokens (e.g. `SKY-742` or `WISP-88`) with instant deep linking (`/?room=CODE`).
- **Confirmed Decision 3**: Nicknames are chosen per session or randomly generated (e.g., "Silver Falcon", "Echo Lynx") without passwords, email, or OAuth barriers.

---

### 1. Overview & Core Concept

- **What It Does**: Allows two or more friends to open a secure temporary chat session in seconds. A user creates a room, shares a short 6-digit code or QR code, and friends join instantly. All messages, presence signals, and reactions stream via low-latency WebSockets.
- **Target Audience / Persona**: Friends, colleagues, and collaborators who need quick, ad-hoc, untracked communication without signing up, downloading native apps, or cluttering their personal chat histories.
- **Key Value**: Maximum privacy, zero onboarding friction, instantaneous delivery, and complete ephemerality.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Lobby / Landing**:
   - Clean, focused interface with two clear paths: **"Create New Room"** (generates a fresh 6-character code) or **"Join with Code"** (input box with auto-formatting).
   - Quick nickname picker with instant randomized suggestions.
2. **Room Creation & Invite Share**:
   - Creator lands in the room and is greeted with an invite panel showing the unique code, a one-click copy button, and a toggleable QR code modal for mobile scanning.
3. **Active Real-Time Conversation**:
   - Stream of incoming and outgoing chat bubbles with subtle timestamps and sender initials.
   - Live presence bar showing active participants in the room.
   - Real-time typing indicators ("Alex is typing...").
   - Inline emoji reactions under messages that increment live across all connected clients.
4. **Self-Destruction & Room Exit**:
   - Users can manually leave or click "Destruct Room".
   - If the last user disconnects, the backend deletes the room from memory immediately.
   - A clear "Session Ended" state with option to start a new chat.

#### Visual Identity & Theme
- **Aesthetic Direction**: Sleek modern privacy aesthetic with clean typography, atmospheric dark/slate mode (and crisp light mode toggle), soft surface glows, and refined spatial geometry.
- **Color Palette**:
  - Background Neutral: Deep Charcoal Slate (`#0B0F17` / `#111827`) for dark mode with clean high-contrast off-white (`#F8FAFC`) for light mode.
  - Surface Structural: Translucent elevated cards (`rgba(17, 24, 39, 0.75)` with `border-slate-800`).
  - Accent Color: Electric Emerald / Cyan (`#10B981` / `#06B6D4`) providing high visibility for active send buttons, user badges, and real-time indicators without garish neon saturation.
- **Typography & Hierarchy**:
  - Display Font: `Plus Jakarta Sans` / `Outfit` for friendly, modern headers and titles.
  - Code & Timestamps: `JetBrains Mono` / `Space Mono` (`tabular-nums`) for room codes and message timestamps.
  - Body Prose: Clean system sans with optimal 1.5 line-height and balanced measure.
- **Component Styling & Layout**:
  - Zero-pill metadata discipline: unboxed clean text tags with typographic `·` separators.
  - Full responsive layout: mobile-optimized thumb reachability for input and actions, expanding gracefully to a centered, ergonomic workspace on 1440px desktop screens.
- **Interactive Feedback & Motion**:
  - Smooth message appearance with subtle upward drift (`motion` / CSS transitions).
  - Tactile button press feedback (`active:scale-[0.98]`).
  - Animated typing dot bounce.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express + `ws` WebSocket Engine on Port 3000**
  - *Chosen Approach*: Implement a custom `server.ts` utilizing Node's native `http.createServer`, mounting Express for API routes / static Vite handling, and creating a `WebSocketServer({ server })` on the exact same HTTP port.
  - *Why*: Meets the strict runtime constraint (port 3000 iFrame compatibility), avoids cross-origin port issues, and provides sub-10ms latency for message dispatching.
  - *Alternatives Considered*: Polling or server-sent events (higher latency, less interactive for reactions/typing).
- **Decision 2: Ephemeral In-Memory State Model**
  - *Chosen Approach*: Rooms and connected sockets are held in a TypeScript `Map<string, Room>` in memory. When a client socket closes, the server checks if the room has 0 connected users; if so, the room is deleted immediately.
  - *Why*: Enforces absolute privacy—no chat logs stored in any persistent database, no privacy leaks.
  - *Alternatives Considered*: SQLite or Firestore (unnecessary overhead for temporary burn-after-disconnect messaging).
- **Decision 3: Zero-Login Room Codes with Deep Links & QR Code Generator**
  - *Chosen Approach*: Rooms generate memorable 6-character uppercase codes (e.g., `FOX-942`). The app encodes the URL `window.location.origin + ?room=CODE` into an interactive client-side SVG QR code and a 1-click clipboard copy button.
  - *Why*: Effortless sharing from desktop to mobile phone or between friends via any secondary channel.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser (React SPA)               │
│                                                             │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────┐  │
│  │ Lobby View   │   │ Chat Room     │   │ Share & QR     │  │
│  │ - Code Input │   │ - Feed & Input│   │ Modal Dialog   │  │
│  │ - Name Input │   │ - Typing Bar  │   │ - SVG QR Code  │  │
│  │ - Create CTA │   │ - Reactions   │   │ - Copy Link    │  │
│  └──────┬───────┘   └───────┬───────┘   └────────────────┘  │
│         │                   │                               │
│         └───────────┬───────┴───────────────────────────────┘
│                     │ WebSocket Client Hook (useChatSocket)
│                     │ Auto-reconnect & Idempotent Event Handlers
▼                     ▼
──────────────────────┼────────────────────────────────────────
                      │ ws://host:3000 (HTTP Upgrade)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             Node.js / Express Server (server.ts)            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ WebSocket Server (ws)                                 │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Ephemeral Room Engine (In-Memory Map<string, Room>)│  │
│  │  │ - Room Lifecycle: Create, Join, Leave, Destruct  │  │
│  │  │ - Message Broadcast & Deduplication             │  │
│  │  │ - Presence Tracking & Ping/Pong Heartbeat       │  │
│  │  │ - Reaction Mutator & Typing Debounce Filter     │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │ Express HTTP Server & Vite Middleware (Dev/Prod)      │  │
│  │ - Port 3000 unified listener                          │  │
│  │ - /api/health probe                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### WebSocket Event Protocol
- `room:join` `{ roomId, username, userId }` -> Broadcasts updated user list and current message buffer to room.
- `message:send` `{ roomId, text, senderId, senderName, id, timestamp }` -> Broadcasts message to room members.
- `typing:set` `{ roomId, userId, username, isTyping }` -> Broadcasts typing status to other peers.
- `reaction:toggle` `{ roomId, messageId, emoji, userId }` -> Updates reaction counts and broadcasts.
- `room:leave` / socket disconnect -> Cleans up user; if room empty, purges room memory.
- `room:destruct` -> Creator or participant triggers immediate self-destruction; all sockets notified and redirected.

---

### Verification & Testing Plan

1. **Compilation & Build**:
   - Install `ws` and `@types/ws`.
   - Update `package.json` dev script to run `tsx server.ts`.
   - Verify TypeScript compilation and Vite build with `compile_applet`.
2. **Functional Real-Time Testing**:
   - Verify room creation and 6-character code formatting.
   - Verify multi-tab messaging: open two browser tabs with the same room code and test instant two-way text delivery.
   - Verify live typing indicators show when typing and clear after pause.
   - Verify emoji reaction toggling across clients.
   - Verify QR code renders correctly and matches current room URL.
   - Verify leaving room cleans up participant presence.

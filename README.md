# RelayChat Architecture Audit

## Executive Summary

RelayChat is currently a monorepo with:

- a `client/` Vite + React single-page app
- a `server/` Express + Socket.io + MongoDB backend

Important architectural reality: this is **not** a Next.js project yet.

- There is no `app/` directory.
- There is no Next.js file-system routing.
- `src/pages/` exists on the client, but it is only a folder of React view components selected manually by `App.jsx`.

The frontend is functional, but the architecture is concentrated in a few very large files:

- `client/src/components/ChatWindow.jsx` - 1769 lines
- `client/src/services/e2ee.js` - 699 lines
- `client/src/components/Login.jsx` - 623 lines
- `client/src/components/Settings.jsx` - 601 lines
- `client/src/components/Message.jsx` - 450 lines
- `client/src/pages/chat.jsx` - 388 lines
- `client/src/components/Sidebar.jsx` - 339 lines

That file-size concentration is the clearest signal that the codebase needs a feature-oriented component split.

---

## 1. Project Structure Overview

### Full Project Tree

The tree below lists the source and configuration structure in full. `server/uploads/` is intentionally summarized because it contains runtime artifacts rather than architectural source files.

```text
RelayChat/
├── README.md
├── package.json
├── package-lock.json
├── client/
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.cjs
│   ├── postcss.config.js
│   ├── public/
│   │   ├── backgrounds/
│   │   │   └── security_lock.png
│   │   ├── chat-bg-glass.png
│   │   ├── chat-doodle.png
│   │   └── vite.svg
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── ContactInfoPanel.jsx
│   │   │   ├── Login.css
│   │   │   ├── Login.jsx
│   │   │   ├── Message.jsx
│   │   │   ├── ReactionPicker.jsx
│   │   │   ├── Register.css
│   │   │   ├── Register.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ThemeSelector.jsx
│   │   │   ├── VideoCall.jsx
│   │   │   ├── VoiceRecorder.jsx
│   │   │   ├── WaveformPlayer.jsx
│   │   │   └── stitch/
│   │   │       ├── Button.jsx
│   │   │       ├── Card.jsx
│   │   │       ├── Chip.jsx
│   │   │       └── Input.jsx
│   │   ├── hooks/
│   │   │   └── useChatTheme.js
│   │   ├── pages/
│   │   │   ├── Auth.jsx
│   │   │   └── chat.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── e2ee.js
│   │   │   └── socket.js
│   │   └── utils/
│   │       └── auth.js
│   ├── tailwind.config.cjs
│   ├── tailwind.config.js
│   ├── tmp_stitch.html
│   ├── tmp_stitch_real.html
│   └── vite.config.js
└── server/
    ├── nodemon.json
    ├── package.json
    ├── package-lock.json
    ├── seed-mock-data.js
    ├── socket-test.js
    ├── socket-test-2.js
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── socket.js
    │   ├── config/
    │   │   ├── db.js
    │   │   └── redis.js
    │   ├── controllers/
    │   │   ├── auth.controller.js
    │   │   ├── chat.controller.js
    │   │   ├── message.controller.js
    │   │   └── user.controller.js
    │   ├── middleware/
    │   │   ├── auth.middleware.js
    │   │   ├── rateLimit.js
    │   │   ├── role.middleware.js
    │   │   └── upload.middleware.js
    │   ├── models/
    │   │   ├── Chat.js
    │   │   ├── Message.js
    │   │   └── User.js
    │   ├── routes/
    │   │   ├── admin.route.js
    │   │   ├── auth.routes.js
    │   │   ├── chat.routes.js
    │   │   ├── message.routes.js
    │   │   └── user.routes.js
    │   └── utils/
    │       └── sms.js
    └── uploads/
        └── runtime-generated binary, image, PDF, and voice files currently committed in repo
```

### Major Folder Purpose

#### `client/src/pages`

- Current purpose: top-level screen components.
- Actual files: `Auth.jsx`, `chat.jsx`.
- Important note: this is not Next.js routing. `App.jsx` manually swaps these views based on session state.

#### `client/src/app`

- Does not exist.
- If the project is migrated to Next.js App Router later, this is the missing structural layer.

#### `client/src/components`

- Current purpose: everything from large feature containers to low-level UI atoms.
- Reality: this folder mixes layout shells, modals, business-heavy components, and reusable UI.
- Result: weak separation between presentation and domain logic.

#### `client/src/hooks`

- Current purpose: reusable client-side state logic.
- Actual state: only one hook exists, `useChatTheme.js`.
- Architectural implication: almost all business logic still lives inside components instead of reusable hooks.

#### `client/src/lib` / `client/src/utils`

- `lib/` does not exist.
- `utils/auth.js` contains token/localStorage helpers.
- Most logic that would normally live in `lib/` or `domain` modules currently lives in `services/`.

#### `client/src/services`

- Current purpose: client-side side effects and domain services.
- `api.js` wraps Axios and auth redirects.
- `socket.js` wraps Socket.io client connection.
- `e2ee.js` is the largest client-side logic module and currently owns encryption, attachments, key management, history sync, and backup/restore.

#### `client/src/styles`

- Does not exist.
- Styling is currently split across:
  - `src/index.css`
  - inline styles
  - Tailwind utility classes
  - two unused legacy CSS files (`Login.css`, `Register.css`)

#### `server/src`

- Express API and Socket.io server.
- Serves as auth, chats, messages, uploads, presence, WebRTC signaling, and encryption key synchronization backend.

#### `server/src/routes`

- REST route registration layer.
- Thin route files delegating to controllers for auth, user, chat, message, and admin actions.

#### `server/src/controllers`

- Request handlers and domain orchestration.
- These currently contain a lot of business logic instead of delegating to service classes/modules.

#### `server/src/models`

- Mongoose schemas for `User`, `Chat`, and `Message`.
- These models are tightly coupled to frontend requirements such as unread counts, contacts, reactions, encryption keys, and read receipts.

#### `server/src/middleware`

- Authentication, upload filtering, rate limiting, and role checks.

#### `server/src/config`

- MongoDB and Redis configuration.

#### `server/uploads`

- Runtime-generated upload artifacts.
- These files should be treated as environment data, not architecture.
- They should normally be gitignored or moved to object storage.

---

## 2. Current Architecture by Layer

### Client App Shell

- `main.jsx` bootstraps React and global CSS.
- `App.jsx` decides whether to render authenticated chat or auth flows.
- `pages/Auth.jsx` toggles login vs registration.
- `pages/chat.jsx` is the real workspace shell and owns most application state.

### Client Domain/Logic Modules

- `services/api.js` handles authenticated HTTP calls and 401 redirects.
- `services/socket.js` manages websocket connection and device-aware auth payload.
- `services/e2ee.js` owns:
  - RSA/AES key generation
  - encrypted message payloads
  - encrypted attachment payloads
  - attachment decryption
  - device recipient mapping
  - history sync packaging
  - PIN-based backup/restore
- `hooks/useChatTheme.js` persists global and per-chat theme selection.
- `utils/auth.js` reads stored user and validates JWT expiry.

### Server Support Layer

- `server/src/app.js` sets middleware, CSP, static upload serving, and REST routes.
- `server/src/socket.js` handles presence, read receipts, message delivery, reactions, history sync, and WebRTC call signaling.
- Controllers provide the API used directly by the React client.

---

## 3. Component Identification and Classification

### Page Components

| Component | File Path | Responsibility | Props | Key Dependencies |
| --- | --- | --- | --- | --- |
| `App` | `client/src/App.jsx` | Root SPA shell; checks token/session state and chooses auth vs chat workspace. | None | `Auth`, `Chat`, `socket`, `isTokenValid` |
| `Auth` | `client/src/pages/Auth.jsx` | Auth page switcher between login and registration. | `onAuthSuccess`, `sessionExpired`, `onDismissExpiry` | `Login`, `Register`, `isTokenValid` |
| `Chat` | `client/src/pages/chat.jsx` | Authenticated workspace shell; owns chats, selected chat, presence, settings modal, call overlay, and history-sync state. | None | `Sidebar`, `ChatWindow`, `VideoCall`, `Settings`, `socket`, `api`, `e2ee`, `useChatTheme` |

### Layout and Feature Container Components

| Component | File Path | Responsibility | Props | Key Dependencies |
| --- | --- | --- | --- | --- |
| `Login` | `client/src/components/Login.jsx` | Handles phone OTP login, email login, new-device restore, PIN restore, and session resume. | `onLogin`, `onSignup`, `canResume`, `sessionExpired`, `onAction` | `api`, `socket`, `e2ee`, `Button`, `Input`, `Card`, `framer-motion` |
| `Register` | `client/src/components/Register.jsx` | Handles two-step registration flow with details entry and OTP verification. | `onRegister`, `onBackToLogin` | `api`, `ensureE2EERegistration`, `Button`, `Input`, `Card` |
| `Sidebar` | `client/src/components/Sidebar.jsx` | Left rail for chat list, conversation search, add-contact flow, create-group flow, and logout/settings entry. | `chats`, `setChats`, `setSelectedChat`, `selectedChat`, `onlineUsers`, `contacts`, `isAddingContact`, `setIsAddingContact`, `isCreatingGroup`, `setIsCreatingGroup`, `setIsShowingSettings` | `api`, `hydrateChatPreview`, `getLoggedInUser`, `useChatTheme` |
| `ChatWindow` | `client/src/components/ChatWindow.jsx` | Main conversation surface; message fetching, sending, typing, attachments, contact save, group management, local overlays, and message info. | `selectedChat`, `setSelectedChat`, `chats`, `onlineUsers`, `lastSeenMap`, `contacts`, `setContacts`, `setChats`, `setIsAddingContact`, `setIsCreatingGroup`, `setActiveVideoCall` | `Message`, `VoiceRecorder`, `ContactInfoPanel`, `ThemeSelector`, `socket`, `api`, `e2ee`, `useChatTheme` |
| `Settings` | `client/src/components/Settings.jsx` | Profile/settings overlay for avatar, profile fields, privacy toggles, theme selection, and backup PIN flows. | `user`, `onUpdate`, `onClose`, `onLogout` | `api`, `useChatTheme`, `THEMES`, `Button`, `Card`, `Input` |
| `VideoCall` | `client/src/components/VideoCall.jsx` | Full-screen WebRTC call overlay; handles offer/answer exchange, ICE, local/remote media, mute/video toggles. | `to`, `fromName`, `isIncoming`, `initialOffer`, `onClose` | `socket`, WebRTC APIs, `framer-motion` |

### UI and Leaf Feature Components

| Component | File Path | Responsibility | Props | Key Dependencies |
| --- | --- | --- | --- | --- |
| `Message` | `client/src/components/Message.jsx` | Renders a single message bubble, reactions, message actions, attachments, and read-state visuals. | `id`, `message`, `isOwn`, `onDeleteMe`, `onDeleteEveryone`, `onShowMessageInfo`, `searchQuery`, `isHighlighted`, `theme`, `participantIds`, `isGroupChat` | `ReactionPicker`, `WaveformPlayer`, `socket`, `api`, `getDecryptedAttachmentData` |
| `ReactionPicker` | `client/src/components/ReactionPicker.jsx` | Small emoji reaction popover. | `onSelect`, `isVisible`, `position` | `framer-motion` |
| `WaveformPlayer` | `client/src/components/WaveformPlayer.jsx` | Audio attachment player with generated waveform and progress state. | `url`, `accentColor`, `trackColor`, `playIconColor` | Browser audio element, `framer-motion` |
| `VoiceRecorder` | `client/src/components/VoiceRecorder.jsx` | Records microphone input and visualizes live waveform before sending. | `onSend`, `onCancel` | MediaRecorder, Web Audio API, `framer-motion` |
| `ContactInfoPanel` | `client/src/components/ContactInfoPanel.jsx` | Side panel showing direct-contact details and quick actions. | `user`, `displayName`, `onClose`, `onVideoCall`, `onVoiceCall`, `onSearch`, `onClearChat` | `framer-motion` |
| `ThemeSelector` | `client/src/components/ThemeSelector.jsx` | Theme swatch popover for per-chat theme switching. | `currentTheme`, `onSelect`, `onClose` | `THEMES`, `THEME_NAMES`, `framer-motion` |

### Reusable UI Primitives

| Component | File Path | Responsibility | Props | Key Dependencies |
| --- | --- | --- | --- | --- |
| `Button` | `client/src/components/stitch/Button.jsx` | Shared button primitive with `primary` and `secondary` variants. | `variant`, `className`, `children`, `...props` | Tailwind classes |
| `Card` | `client/src/components/stitch/Card.jsx` | Shared card surface wrapper. | `children`, `className` | Tailwind classes |
| `Input` | `client/src/components/stitch/Input.jsx` | Shared text input wrapper with optional icon and focus styling. | `icon`, `className`, `...props` | React state, Tailwind classes |
| `Chip` | `client/src/components/stitch/Chip.jsx` | Shared pill button primitive, currently unused. | `label`, `active`, `onClick`, `className` | Tailwind classes |

### Non-Component Logic Modules

| Module | File Path | Responsibility |
| --- | --- | --- |
| `useChatTheme` | `client/src/hooks/useChatTheme.js` | Stores global/per-chat theme selection in localStorage and exposes theme metadata. |
| `api` | `client/src/services/api.js` | Central Axios client with auth token injection and 401 redirect logic. |
| `socket` | `client/src/services/socket.js` | Socket.io client singleton plus `connectSocket()` helper. |
| `e2ee` | `client/src/services/e2ee.js` | All client-side encryption, attachment, backup, and device-sync logic. |
| `auth utils` | `client/src/utils/auth.js` | Reads logged-in user and checks JWT expiration. |

---

## 4. Component Hierarchy

### Runtime Tree

```text
App
├── Auth
│   ├── Login
│   │   ├── Card
│   │   ├── Input
│   │   └── Button
│   └── Register
│       ├── Card
│       ├── Input
│       └── Button
└── Chat
    ├── Sidebar
    ├── ChatWindow
    │   ├── ContactInfoPanel (direct chat only)
    │   ├── ThemeSelector (popover)
    │   ├── Message*
    │   │   ├── ReactionPicker
    │   │   └── WaveformPlayer (audio attachments only)
    │   ├── VoiceRecorder (conditional)
    │   ├── Search overlay
    │   ├── Add Contact overlay
    │   ├── Add Member dialog
    │   ├── Remove Member dialog
    │   ├── Participants dialog
    │   └── Message Info dialog
    ├── VideoCall (global overlay)
    └── Settings (global overlay)
        ├── Card
        ├── Input
        └── Button
```

### Ownership and Data Flow

- `Chat` is the real layout owner. It owns global chat workspace state and passes it down via props.
- `Sidebar` and `ChatWindow` share state through `Chat`, which means the current architecture relies on prop drilling.
- `ChatWindow` is both a view and a local controller for:
  - messages
  - typing
  - search
  - attachments
  - group member management
  - message metadata
- `Message` is a leaf renderer, but it still performs side effects (`api`, `socket`, attachment decryption), so it is not purely presentational.

---

## 5. Reusable Components and Shared UI

### Components That Are Actually Reusable Today

- `stitch/Button`
- `stitch/Card`
- `stitch/Input`
- `ThemeSelector`
- `WaveformPlayer`
- `ReactionPicker`

### Components That Should Be Reusable but Are Not Yet

- Avatar rendering is duplicated across:
  - `Sidebar`
  - `ChatWindow`
  - `ContactInfoPanel`
  - `Settings`
  - group add/remove dialogs
  - message info modal
- Modal and overlay shells are duplicated across:
  - `Settings`
  - `VideoCall`
  - chat search bar
  - add contact overlay
  - add/remove member dialogs
  - participants dialog
  - message info dialog
- Search input patterns are duplicated in:
  - `Sidebar`
  - `ChatWindow`
- Action icon buttons are duplicated throughout auth, sidebar, chat header, call controls, and settings.
- User list row patterns are duplicated in:
  - group creation
  - add member dialog
  - remove member dialog
  - participants dialog

### Shared Components That Should Be Introduced

- `Avatar`
- `IconButton`
- `ModalShell` / `DialogShell`
- `SheetPanel`
- `SearchField`
- `UserListItem`
- `ConversationListItem`
- `StatusBadge`
- `SectionHeader`
- `EmptyStateCard`
- `MessageAttachment`
- `MessageMeta`
- `ActionMenu`

### Dead or Underused Reusable Assets

- `stitch/Chip.jsx` exists but is not used anywhere.
- `Login.css` and `Register.css` exist but are not imported anywhere.
- `tmp_stitch.html` and `tmp_stitch_real.html` are prototype artifacts, not runtime UI.
- `chat-bg-glass.png` and `chat-doodle.png` are present in `public/` but not referenced by application code.

---

## 6. UI vs Logic Separation Assessment

### Mostly Presentational

- `stitch/Button`
- `stitch/Card`
- `stitch/Input`
- `stitch/Chip`
- `ThemeSelector`
- `ReactionPicker`
- `WaveformPlayer`
- `ContactInfoPanel`

### Mixed UI + Business Logic

- `Login`
- `Register`
- `Sidebar`
- `ChatWindow`
- `Message`
- `Settings`
- `VideoCall`
- `Chat`
- `App`

### Pure Logic / Side-Effect Modules

- `useChatTheme`
- `services/api`
- `services/socket`
- `services/e2ee`
- `utils/auth`

### Separation Problems

- `App.jsx` mixes view selection with storage/session cleanup and hard redirects.
- `pages/chat.jsx` mixes workspace layout with:
  - socket lifecycle
  - presence updates
  - encrypted history sync approval
  - device restore fallback
  - settings state
  - video-call state
- `ChatWindow.jsx` mixes rendering with:
  - network fetches
  - socket event subscriptions
  - encryption decisions
  - file upload orchestration
  - search state
  - contact creation
  - group administration
  - message info aggregation
- `Settings.jsx` mixes data fetch, form state, backup restore rules, avatar upload, and theme application.
- `Login.jsx` mixes four separate flows:
  - phone OTP login
  - email/password login
  - profile completion
  - new-device restore/approval
- `services/e2ee.js` is doing too much for one module and should be split by concern.

---

## 7. UI/UX and Design-System Issues

### Structural UI Issues

- No real design system boundary exists.
- The app mixes:
  - Tailwind utility classes
  - inline styles
  - theme objects
  - one-off hex colors
  - legacy CSS files
- `stitch/*` primitives are only used by auth/settings screens, not by the core chat experience.

### Styling Consistency Issues

- There are **two Tailwind config files**:
  - `tailwind.config.js`
  - `tailwind.config.cjs`
- There are **two PostCSS config files**:
  - `postcss.config.js`
  - `postcss.config.cjs`
- This creates ambiguity about which tokens are real.
- The `.cjs` Tailwind config defines `font-inter` and `font-space`, but the `.js` config does not.
- The UI uses `font-space`, `font-inter`, and `font-headline`, but:
  - `font-headline` is not defined
  - `font-space` and `font-inter` depend on which Tailwind config is actually active

### Runtime Styling Problems

- Many classes attempt to interpolate runtime values inside Tailwind class strings, for example:
  - `bg-[$theme.primary]`
  - `text-[$theme.primary]`
  - `border-[$theme.primary]/30`
- Tailwind will not generate CSS for those runtime-computed class names.
- These styles should be converted to inline style props or semantic CSS variables.

### Theme-System Problems

- The server model default is `globalTheme: "neon"`.
- The client `THEMES` object does **not** define `neon`.
- `Sidebar` and `ChatWindow` still reference `"neon"` as a fallback value.
- Result: there is a mismatch between persisted backend theme state and valid frontend theme tokens.

### Asset and Responsiveness Issues

- `ChatWindow` references `/premium-chat-pattern.svg`, but that asset does not exist in `client/public`.
- The left sidebar is fixed at `w-[380px]`, which is not mobile-friendly.
- Multiple overlays and panels are absolutely positioned with desktop-biased offsets.
- There is no clear mobile layout strategy such as collapsing the sidebar into a drawer/sheet.

### Interaction/Flow Issues

- `window.location.href` is used as navigation instead of router-driven transitions.
- `ContactInfoPanel` exposes actions like block/report that are only visual placeholders.
- The history-sync gate in `pages/chat.jsx` contains an unfinished placeholder comment instead of a real dedicated component.
- There is no automated UI test, component story, or design token reference to protect the interface during refactors.

### Repository Hygiene Issues

- `server/uploads/` contains committed runtime data.
- Unused CSS and prototype HTML files remain in the repo.
- No dedicated `tests/`, `stories`, or visual regression layer exists.

---

## 8. Refactoring Opportunities

### High-Priority Splits

#### Split `pages/chat.jsx`

Current responsibilities:

- workspace layout
- chat list orchestration
- selected chat state
- presence state
- history sync approval
- device restore fallback
- video call overlay
- settings overlay

Recommended split:

- `features/chat/ChatShell`
- `features/chat/useWorkspaceState`
- `features/chat/usePresence`
- `features/chat/useHistorySync`
- `features/calls/useVideoCall`

#### Split `components/ChatWindow.jsx`

Recommended children:

- `ChatHeader`
- `ChatStatusBar`
- `MessageList`
- `MessageComposer`
- `AttachmentPreview`
- `ChatSearchOverlay`
- `SaveContactDialog`
- `AddGroupMemberDialog`
- `RemoveGroupMemberDialog`
- `ParticipantsDialog`
- `MessageInfoDialog`

#### Split `components/Login.jsx`

Recommended children:

- `AuthShell`
- `PhoneOtpLoginForm`
- `EmailLoginForm`
- `ProfileCompletionForm`
- `DeviceRestoreOptions`
- `HistorySyncWaitingCard`

#### Split `components/Settings.jsx`

Recommended children:

- `SettingsDialog`
- `ProfileSettingsSection`
- `PrivacySettingsSection`
- `BackupSettingsSection`
- `ThemeSettingsSection`

#### Split `components/Message.jsx`

Recommended children:

- `MessageBubble`
- `MessageAttachment`
- `MessageReactionBar`
- `MessageActionMenu`
- `MessageStatus`

### Modules That Should Be Extracted Into Hooks

- `useSessionGuard`
- `useAuthFlow`
- `useChats`
- `useMessages(chatId)`
- `useTypingIndicator(chatId)`
- `useChatSearch(messages)`
- `useGroupMembers(chatId)`
- `useProfileSettings`
- `useHistorySync`
- `useVideoCall`

### Modules That Should Be Split by Domain

Current monolith:

- `services/e2ee.js`

Recommended split:

- `services/e2ee/keys.js`
- `services/e2ee/messages.js`
- `services/e2ee/attachments.js`
- `services/e2ee/deviceSync.js`
- `services/e2ee/backup.js`
- `services/e2ee/recipients.js`

### Components to Merge, Reuse, or Remove

- Merge repeated modal wrappers into a shared `DialogShell`.
- Merge repeated user-row UIs into a shared `UserListItem`.
- Reuse one `SearchField` component across sidebar and chat search.
- Reuse one `Avatar` component everywhere.
- Reuse one `ActionIconButton` component everywhere.
- Remove `Chip` if it will stay unused.
- Remove unused `Login.css` and `Register.css`.
- Remove or relocate `tmp_stitch.html` and `tmp_stitch_real.html`.

---

## 9. Suggested Clean Component-Based Target Structure

### Recommended Client Structure

```text
client/src/
├── app/
│   ├── providers/
│   ├── layout/
│   └── routes/
├── components/
│   └── ui/
│       ├── avatar.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog-shell.jsx
│       ├── icon-button.jsx
│       ├── input.jsx
│       ├── search-field.jsx
│       ├── sheet-panel.jsx
│       └── status-badge.jsx
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── chat/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── calls/
│   │   ├── components/
│   │   └── hooks/
│   └── settings/
│       ├── components/
│       └── hooks/
├── hooks/
├── services/
├── lib/
├── styles/
└── utils/
```

### Recommended Server Structure

```text
server/src/
├── app.js
├── server.js
├── socket/
│   ├── index.js
│   ├── presence.handlers.js
│   ├── message.handlers.js
│   ├── call.handlers.js
│   └── history-sync.handlers.js
├── services/
│   ├── auth.service.js
│   ├── chat.service.js
│   ├── message.service.js
│   ├── user.service.js
│   └── encryption.service.js
├── controllers/
├── routes/
├── models/
├── middleware/
└── config/
```

---

## 10. Styling Migration Plan for Future UI Upgrade

### Components That Map Cleanly to `shadcn/ui`

| Current Area | Recommended `shadcn/ui` Replacement | Notes |
| --- | --- | --- |
| `stitch/Button` | `Button` | Direct replacement; move variants into one source of truth. |
| `stitch/Input` | `Input` / `Textarea` | Keep icon wrapper as a small local composition helper. |
| `stitch/Card` | `Card` | Direct replacement. |
| `ThemeSelector` | `Popover` + `RadioGroup` or `Command` | Cleaner accessibility and keyboard support. |
| `Settings` overlay | `Dialog`, `Tabs`, `Switch`, `Avatar`, `Form` | Best candidate for a full design-system rewrite. |
| sidebar add/create panels | `Sheet` or `Dialog` | Better mobile behavior than inline expanding panels. |
| chat action menus | `DropdownMenu` | Replaces custom floating menus. |
| add/remove member overlays | `Dialog` + `ScrollArea` | Standardized modal shell. |
| contact info panel | `Sheet` | Cleaner side-panel pattern. |
| message info overlay | `Dialog` | Direct mapping. |
| banners and notices | `Alert` + toast system | Standard feedback layer. |

### Tailwind Migration Targets

- Consolidate to one Tailwind config.
- Consolidate to one PostCSS config.
- Move all theme colors into semantic CSS variables:
  - `--background`
  - `--surface`
  - `--surface-elevated`
  - `--border`
  - `--text`
  - `--muted`
  - `--primary`
  - `--danger`
  - `--success`
- Replace hardcoded inline hex values with semantic classes backed by variables.
- Move typography tokens into Tailwind theme extension once, then remove undefined classes.
- Create reusable utility patterns for:
  - panes
  - list items
  - glass surfaces
  - modal shells
  - icon buttons
  - status pills

### Animation Opportunities

- Auth screen step transitions should stay animated but be centralized in one auth shell.
- Sidebar conversation insert/reorder should use a consistent list animation.
- Message entry and read-state animation should be limited to list-level motion, not every nested control.
- Contact info/settings/member management should use a standardized sheet/dialog transition.
- Video call overlay should support an intentional enter/exit and possibly a minimized state.
- History sync approval and restore flows should become banners/toasts/dialogs instead of ad hoc absolute panels.

### What Should Be Replaced First

1. Replace `stitch/*` with real `ui/*` primitives.
2. Convert settings/auth screens to shared form primitives.
3. Replace custom overlays with dialog/sheet/dropdown primitives.
4. Introduce `Avatar`, `IconButton`, `StatusBadge`, and `SearchField`.
5. Remove invalid dynamic Tailwind classes and move theme values to variables.

---

## 11. Next.js Migration Readiness Notes

If the long-term target is Next.js, the current frontend should first be refactored into domain-based client components before moving frameworks.

Recommended sequence:

1. Split feature containers and hooks inside the existing Vite app.
2. Introduce a stable `components/ui` layer and feature folders.
3. Replace manual auth/view switching with explicit route boundaries.
4. Move to Next.js App Router only after browser-only concerns are isolated.

Client-only modules that must stay on the client in a Next.js migration:

- websocket connection logic
- WebRTC call handling
- MediaRecorder and audio waveform capture
- browser `localStorage` theme/session state
- Web Crypto E2EE logic

---

## 12. Final Architectural Assessment

### What Is Working

- The product already has clear feature domains:
  - auth
  - chat
  - messages
  - calls
  - settings
  - encryption
- A small reusable primitive layer already exists.
- The backend structure is conventional enough to support frontend cleanup.

### What Is Holding the Architecture Back

- Feature state is concentrated in a few oversized components.
- Routing/layout boundaries are manual, not framework-driven.
- UI primitives are not applied consistently across the app.
- Styling tokens are fragmented and partially conflicting.
- Side effects and rendering are too tightly coupled.

### Recommended Priority Order

1. Normalize the styling/tooling foundation.
2. Split `ChatWindow`, `Login`, and `Settings`.
3. Extract chat/auth/history-sync logic into hooks.
4. Introduce a true `components/ui` layer.
5. Reorganize by feature.
6. Only then evaluate a Next.js App Router migration.

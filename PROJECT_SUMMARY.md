# Meetspace - Complete Project Summary

## 🎯 Project Overview
Meetspace is a full-stack video meeting application with user authentication, meeting management, and real-time meeting control features.

---

## 📦 Project Structure

```
Meetspace/
├── meetspace-backend/          # Spring Boot backend
│   ├── src/main/java/
│   │   └── com/meetspace/
│   │       ├── config/         # Security, OpenAPI, WebSocket, Exception Handler
│   │       ├── controller/     # REST endpoints + STOMP message handlers
│   │       ├── entity/         # JPA entities
│   │       ├── repository/     # Data access layer
│   │       ├── services/       # Business logic
│   │       ├── dto/            # Request/Response objects (incl. WebSocket/)
│   │       ├── enums/          # Status enums (incl. WebSocket/)
│   │       ├── filter/         # Authentication filter
│   │       └── utils/          # JWT, meeting code generator
│   └── pom.xml                 # Maven dependencies
│
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Shared UI, icons, video preview
│   │   ├── hooks/              # useMediaStream (camera/mic lifecycle)
│   │   ├── services/           # api.ts (REST), websocket.ts (STOMP)
│   │   ├── types/              # Shared domain types (Participant)
│   │   ├── App.tsx             # Router setup
│   │   └── index.css           # Tailwind directives
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── postcss.config.js       # PostCSS configuration
│   └── package.json            # NPM dependencies
│
└── docker-compose.yml          # Database setup
```

---

## 🔧 Backend Stack

### Technology
- **Framework**: Spring Boot 4.1.0
- **Language**: Java 21
- **Database**: PostgreSQL 16
- **Authentication**: JWT (jjwt)
- **API Documentation**: OpenAPI/Swagger
- **ORM**: Spring Data JPA + Hibernate
- **Build**: Maven

### Key Features

#### 1. Authentication (JWT-based)
- User registration with email and password
- Login with JWT token generation
- Secure password hashing (BCrypt)
- Token-based request authentication

#### 2. Meeting Management
- Create meetings with unique codes
- Automatic meeting code generation
- Meeting status tracking (SCHEDULED, LIVE, ENDED)
- Host-based access control

#### 3. Participant Management
- Track meeting participants
- Reject a duplicate join while `JOINED`; a participant who `LEFT` may rejoin (the row is reused)
- Join/Leave meeting functionality
- Participant status tracking (JOINED, LEFT, REMOVED)
- Query the current roster of a meeting (`JOINED` only)

#### 4. Real-Time Messaging (STOMP over WebSocket)
- Native WebSocket endpoint at `/ws` (no SockJS — the client opens a raw socket)
- `/app` prefix routes client messages to `@MessageMapping` handlers
- `/topic` prefix is the broker's broadcast namespace
- Join and leave events fan out to every subscriber of a meeting's topic
- `MeetingMessage` is the wire format both directions, typed by `MeetingMessageType`

#### 5. Security
- Global exception handler for consistent error responses
- STATELESS session management
- CSRF disabled (for stateless JWT auth)
- Role-based access control
- Protected endpoints requiring authentication

### API Endpoints

**Authentication:**
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user

**Meetings:**
- `POST /meeting` - Create new meeting
- `GET /meeting/{code}` - Get meeting details
- `GET /meeting/my` - Get all user's meetings
- `GET /meeting/{code}/participants` - Current roster (`JOINED` only)
- `POST /meeting/{code}/join` - Join meeting
- `POST /meeting/{code}/start` - Start meeting (host only)
- `POST /meeting/{code}/leave` - Leave meeting
- `POST /meeting/{code}/end` - End meeting (host only)

`POST /auth/login` and `/auth/signup` both return `{ token, email, userId, name }`. The client stores
all four — `userId` is what identifies a participant on the websocket and decides host-only UI.

### WebSocket Destinations

Handshake at `ws://localhost:8080/ws` (permitted without a token; see Security).

| Direction | Destination | Purpose |
|---|---|---|
| Client → Server | `/app/meeting.join` | Announce arrival; handler rebroadcasts |
| Client → Server | `/app/meeting.leave` | Announce departure; handler rebroadcasts |
| Server → Client | `/topic/meeting/{code}` | Every event for one meeting |

Payload (`MeetingMessage`) in both directions:

```json
{ "type": "USER_JOINED", "userId": 3, "email": "a@b.com", "userName": "Ada", "meetingCode": "ABC123" }
```

`type` is `USER_JOINED` or `USER_LEFT`. The broadcast reaches **every** subscriber including the
sender, so clients must dedupe on `userId`.

---

## 🎨 Frontend Stack

### Technology
- **Framework**: React 19.2.8
- **Language**: TypeScript
- **Build Tool**: Vite 8.2.0
- **Routing**: React Router 7.18.2
- **Styling**: Tailwind CSS 3.4.0
- **HTTP Client**: Fetch API

### Key Features

#### Pages

**1. Auth Page** (`/`)
- Login form
- Registration form
- Toggle between login/register
- JWT token storage

**2. Dashboard** (`/dashboard`)
- View all hosted meetings
- Create new meetings
- Meeting status badges
- Copy meeting codes
- Access meeting details

**3. Join Meeting** (`/join`)
- Enter meeting code
- Join any public meeting

**4. Lobby** (`/lobby/:code`)
- Camera and microphone preview before entering
- Device toggles, permission and no-device failure states
- Validates the meeting (and re-checks for ENDED) before calling join
- Hands mic/camera choices to the room via `sessionStorage`

**5. Meeting Room** (`/meeting/:code`)
- View meeting information
- Host controls:
  - Start meeting (SCHEDULED → LIVE)
  - End meeting (LIVE → ENDED)
- Participant controls:
  - Leave meeting
- **Live participant roster** — seeded from `GET /meeting/{code}/participants`, then updated by
  `USER_JOINED` / `USER_LEFT` events on the meeting's topic
- Local camera tile (remote tiles need WebRTC signalling, which does not exist yet)
- Share meeting code

**Identity in `localStorage`**: `token`, `email`, `userId`, `name`. All four are written at
login/signup and cleared on logout. `userId` is required — the room's websocket effect deliberately
does nothing without it rather than announce an unidentifiable user.

### Styling (Tailwind CSS)
- Gradient backgrounds (primary → secondary)
- Responsive layouts (mobile-first)
- Card-based UI components
- Smooth transitions and hover effects
- Dark/light mode support

---

## 🚀 Getting Started

### Prerequisites
- Java 21
- Node.js 16+
- PostgreSQL 14+
- Maven 3.8+

### Backend Setup

1. **Database Setup**
   ```bash
   docker-compose up -d
   ```

2. **Configure application properties**
   Edit `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/meetspace
   spring.datasource.username=postgres
   spring.datasource.password=postgres
   jwt.secret=your-secret-key
   jwt.expiration=3600000
   ```

3. **Build and run**
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```
   Server runs on `http://localhost:8080`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL**
   Edit `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'http://localhost:8080';
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:5173`

---

## 🔐 Security Features

✅ **Authentication**: JWT token-based  
✅ **Password Security**: BCrypt hashing  
✅ **CSRF Protection**: Disabled for stateless API  
✅ **CORS**: Configured for frontend origin  
✅ **Exception Handling**: Global exception handler  
✅ **Input Validation**: Request validation via DTOs  
✅ **Access Control**: Role-based endpoint protection  

---

## 📊 Database Schema

### Users Table
```sql
- id (Primary Key)
- name (String)
- email (String, Unique)
- password (String, Hashed)
- createdAt (Timestamp)
- updatedAt (Timestamp)
```

### Meetings Table
```sql
- id (Primary Key)
- meetingCode (String, Unique)
- title (String)
- hostId (Foreign Key → Users)
- status (SCHEDULED, LIVE, ENDED)
- createdAt (Timestamp)
- startedAt (Timestamp, Nullable)
- endedAt (Timestamp, Nullable)
```

### MeetingParticipants Table
```sql
- id (Primary Key)
- meetingId (Foreign Key → Meetings)
- userId (Foreign Key → Users)
- status (JOINED, LEFT)
- joinedAt (Timestamp)
- leftAt (Timestamp, Nullable)
```

---

## 🧪 Testing

### Backend
```bash
mvn test
```

### Frontend
```bash
cd frontend
npm run build
```

---

## 📝 Development Workflow

### Making Changes

**Backend:**
1. Edit source files in `meetspace-backend/src/`
2. Run `mvn clean compile` to verify
3. Test with `mvn test` or run the app
4. Commit with meaningful messages

**Frontend:**
1. Edit files in `frontend/src/`
2. Changes auto-reload with Vite HMR
3. Build with `npm run build`
4. Test in browser
5. Commit changes

### Code Quality
- **Backend**: Follow Spring conventions, clean code practices
- **Frontend**: Use TypeScript strictly, follow React best practices
- **Global**: Meaningful commit messages, single responsibility principle

---

## 🐛 Troubleshooting

### Backend Issues

**Database Connection Error**
- Ensure PostgreSQL is running: `docker-compose up -d`
- Check connection string in `application.properties`
- Verify database exists: `createdb meetspace`

**Build Fails**
- Clear Maven cache: `mvn clean`
- Check Java version: `java -version` (should be 21+)
- Update dependencies: `mvn dependency:resolve`

### Frontend Issues

**CORS Errors**
- Ensure backend is running on `http://localhost:8080`
- Check `API_BASE_URL` in `src/services/api.ts`

**Tailwind Styles Not Applied**
- Rebuild: `npm install` and `npm run dev`
- Check `tailwind.config.js` for content paths
- Clear browser cache (Ctrl+Shift+Del)

---

## 📚 API Documentation

Access Swagger UI at: `http://localhost:8080/swagger-ui.html`

All endpoints return JSON responses with:
- `status`: HTTP status code
- `message`: Error message (if applicable)
- `data`: Response payload

---

## 🎯 Future Enhancements

**Next up**
- [ ] **WebRTC signalling and peer connections** — the participant roster now provides the stable
      `userId` set that peer connections key off
- [ ] **Disconnect detection** — a backend `SessionDisconnectEvent` listener that broadcasts
      `USER_LEFT` when a STOMP session drops. Closing a tab currently announces nothing, because no
      React cleanup runs; this also covers crashes and network loss.
- [ ] Screen sharing (the room's button is UI-only; `getDisplayMedia` is not wired up)

**Later**
- [ ] Message/chat in meetings
- [ ] Meeting recordings
- [ ] User profiles
- [ ] Meeting history
- [ ] Notifications
- [ ] Mobile app

---

## 📜 License

This project is for educational purposes.

---

## 👥 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push to repository

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check backend/frontend logs
4. Consult the codebase comments

---

## ✨ Project Status

- ✅ Authentication: JWT-based; login/signup return `userId` and `name`
- ✅ Meeting CRUD: create, start, end, join, leave
- ✅ Database: PostgreSQL setup
- ✅ API Documentation: Swagger UI
- ✅ Exception Handling: Global handler
- ✅ Lobby: device preview and permission handling
- ✅ Real-time participants: STOMP join/leave events, roster seeded from REST
- ⬜ Video/audio between participants: **not started** — needs WebRTC
- ⬜ Automated tests: none exist for either side

### Known gaps

- **The real-time participant layer has not been exercised against a running backend.** It compiles
  on both sides; that is all that has been verified.
- Sessions created before `userId` was added to the auth response must log out and back in. Without
  it the roster does nothing and host-only controls resolve incorrectly.
- `meeting_participant` rows written before `joinMeetings` set `status` have `status = NULL` and will
  not appear in the roster. Rejoining rewrites the row.
- React StrictMode logs a harmless `WebSocket is not connected` on each room mount in development —
  the first cleanup runs before the STOMP handshake completes.

---

**Last Updated**: 2026-08-23  
**Version**: 1.1.0

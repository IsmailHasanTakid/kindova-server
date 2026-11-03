# ⚙️ Kindova Server – REST API

<p align="center">
  <strong>Backend API for Kindova Community Event Management Platform</strong>
  <br />
  Built with Node.js, Express.js, MongoDB, and JWT authentication.
</p>

---

## 📖 About The Project

**Kindova Server** is the backend application of the Kindova Community Event Management Platform.

It provides RESTful APIs to manage community events, user participation, event ownership, and database operations.

The backend uses Express.js to handle HTTP requests, MongoDB to store event information, and Better Auth JWKS with JWT verification to secure protected API endpoints.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend framework |
| MongoDB | NoSQL database |
| MongoDB Driver | Database operations |
| JOSE | JWT verification |
| Better Auth JWKS | Public key-based token verification |
| CORS | Cross-origin resource sharing |
| dotenv | Environment variable management |
| Nodemon | Development server monitoring |

## ✨ Backend Features

### 1. 🔐 Authentication & Authorization

- JWT-based authentication.
- Token verification using Better Auth JWKS.
- Public key retrieval through a remote JWKS endpoint.
- Protected API routes using authentication middleware.
- Extract authenticated user information from the verified JWT payload.
- Verify event ownership before allowing updates and deletions.

### 2. 📅 Event Management

- Create new community events.
- Retrieve all available events.
- Retrieve individual event details.
- Update existing events.
- Delete events.
- Automatically associate newly created events with the authenticated user.

### 3. 🔍 Event Filtering & Searching

- Search events by title.
- Filter events by category.
- Filter upcoming events.
- Filter previous events.
- Retrieve all events.
- Sort upcoming events by date and time.
- Sort previous events by date and time.

### 4. ⏰ Recent & Previous Events

- Retrieve the 6 most recent upcoming events.
- Retrieve the 6 most recent previous events.
- Handle event dates according to the Bangladesh timezone (Asia/Dhaka).

### 5. 🤝 Event Participation

- Join available events.
- Leave joined events.
- Store participant information inside the event document.
- Prevent event creators from joining their own events.
- Prevent users from joining the same event multiple times.
- Retrieve all events joined by the authenticated user.

### 6. 👤 User-Specific Event Management

- Retrieve events created by the logged-in user.
- Retrieve events joined by the logged-in user.
- Associate events with their creator's email.
- Restrict event updates and deletions to their respective creators.

### 7. 🛡️ Error Handling & Validation

- Validate MongoDB ObjectIds.
- Handle missing and invalid JWT tokens.
- Handle unauthorized requests.
- Handle event not found errors.
- Handle duplicate event participation.
- Return appropriate HTTP status codes.
- Use try-catch blocks for database operations.

## 🗄️ Database Structure

**Database:** `kindova`

**Collection:** `events`

The events collection stores event information and participation details.

### Event Document Structure

```javascript
{
  _id: ObjectId,
  title: String,
  eventType: String,
  description: String,
  eventDate: String,
  eventTime: String,
  location: String,
  fullAddress: String,
  thumbnailUrl: String,
  volunteerLimit: Number,
  requiredVolunteers: Number,
  contactNumber: String,
  additionalRequirements: String,
  creatorEmail: String,

  joinedUsers: [
    {
      email: String,
      name: String,
      image: String,
      joinedAt: String
    }
  ]
}
```

*The document structure shows the main fields used by the application. Optional fields depend on the event data submitted by the frontend.*

## 🔗 API Documentation

Base URL:

```text
http://localhost:5000
```

### Event APIs

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/api/events` | Get all events | Public |
| GET | `/api/events/recent` | Get 6 upcoming events | Public |
| GET | `/api/events/previous` | Get 6 previous events | Public |
| GET | `/api/events/:id` | Get single event | Public |
| POST | `/api/events` | Create an event | Required |
| PATCH | `/api/events/:id` | Update an event | Required |
| DELETE | `/api/events/:id` | Delete an event | Required |

### Event Participation APIs

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/api/events/:id/join` | Join an event | Required |
| DELETE | `/api/events/:id/leave` | Leave an event | Required |

### User-Specific APIs

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| GET | `/api/events/my-events` | Get events created by the user | Required |
| GET | `/api/events/joined` | Get events joined by the user | Required |

### Query Parameters

The `/api/events` endpoint supports:

| Parameter | Description | Example |
|---|---|---|
| `search` | Search by event title | `?search=Winter` |
| `category` | Filter by event category | `?category=Charity` |
| `status` | Filter by event status | `?status=upcoming` |

Available status values:

- `all` – All events.
- `upcoming` – Upcoming events.
- `previous` – Previous events.

Example:

```text
GET /api/events?search=Winter&category=Charity&status=upcoming
```

### Authentication Header

Protected routes require a valid JWT access token.

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The backend verifies the token using the Better Auth JWKS endpoint before processing protected requests.

## 🔄 How The Backend Works

1. The frontend sends an HTTP request to the Express.js server.
2. For protected routes, the authentication middleware checks the JWT.
3. JOSE verifies the token using the public keys from the JWKS endpoint.
4. The backend processes the requested operation.
5. MongoDB performs the required database operation.
6. The server returns a JSON response to the frontend.

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB account or local MongoDB server
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/IsmailHasanTakid/kindova-server
```

### 2. Navigate to the Project

```bash
cd kindova-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

### 5. Start the Development Server

```bash
npm run dev
```

The backend server will run at:

```text
http://localhost:5000
```

Expected terminal output:

```text
MongoDB Connected Successfully!
Kindova server running on port 5000
```

Make sure the frontend application and Better Auth JWKS endpoint are available when testing authenticated API routes.

## 🔒 Security Notes

- JWT verification through Better Auth JWKS.
- Protected routes for sensitive operations.
- Event ownership verification.
- Authenticated user identification from verified token payloads.
- Environment variables for database credentials.
- Input validation for event IDs.

**Production note:** Configure the JWKS URL for the deployed frontend instead of using the local development URL. Also configure CORS to allow only trusted frontend origins.

## 🔗 Related Repository

**Frontend Repository:** [Kindova](https://github.com/IsmailHasanTakid/kindova)

## 👨‍💻 Developer

**Ismail Hasan Takid**

- GitHub: [@IsmailHasanTakid](https://github.com/IsmailHasanTakid)

---

<p align="center">
  Built with ❤️ using Node.js and MongoDB.
  <br />
  <strong>Kindova – Connect. Contribute. Care.</strong>
</p>
# Resource Pulse

Resource Pulse is a syllabus-aligned full-stack water and electricity tracking system. It demonstrates:

- Semantic HTML5, CSS3, Flexbox, Grid, responsiveness, and elegant UI composition
- JavaScript events, DOM manipulation, modules, async/await, and dynamic rendering
- Node.js with Express routing, middleware, sessions, validation, API versioning, and MongoDB integration
- Real-time updates with Socket.IO and CRUD operations for usage entries

## Run the project

1. Install dependencies:
   `npm install`
2. Create a `.env` file in the project root and add:
   `MONGODB_URI=your-mongodb-atlas-connection-string`
   `SESSION_SECRET=your-session-secret`
3. Start the server:
   `npm start`
4. Open:
   `http://localhost:4000`

If `MONGODB_URI` is not set yet, the app still runs using the local `data/readings.json` file as a fallback.

## MongoDB setup

1. Create a free cluster on MongoDB Atlas
2. Create a database user and allow your current IP address
3. Copy the connection string into `.env` as `MONGODB_URI`
4. Restart the server

On the first MongoDB-backed run, the app seeds the database from `data/readings.json` if the Mongo collection is empty.

## API endpoints

- `GET /api/v1/health`
- `GET /api/v1/readings`
- `POST /api/v1/readings`
- `PUT /api/v1/readings/:id`
- `DELETE /api/v1/readings/:id`
- `GET /api/v1/analytics/summary`

## Storage behavior

- With `MONGODB_URI`: MongoDB Atlas or any MongoDB instance
- Without `MONGODB_URI`: local JSON fallback
- Health endpoint shows the active storage mode

## Syllabus mapping

- Frontend syllabus: semantic layout, responsive design, JavaScript interaction, DOM updates, event delegation
- Backend syllabus: Express app, middleware, HTTP services, CRUD, session usage, validation, MongoDB persistence, versioned REST API, Socket.IO

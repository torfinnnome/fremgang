import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { db, initDatabase } from './database';
import http from 'http';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3010;

// Initialize Database
initDatabase();

// Middleware
app.use(express.json());
app.use(cors());

const JWT_SECRET = 'asdfdslhaksdg.-asdf--asdfasdfads5252-sg'; // In production, use an environment variable

// --- AUTHENTICATION ROUTES ---

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password_hash) VALUES (?, ?)';
    
    db.run(sql, [email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ message: 'Email already exists' });
        }
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      res.status(201).json({ message: 'User created successfully', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while hashing password' });
  }
});

interface User {
  id: number;
  email: string;
  password_hash: string;
}

// Login a user
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.get(sql, [email], async (err, user: User) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ message: 'Logged in successfully', token });
  });
});


interface AuthenticatedRequest extends express.Request {
  user?: { userId: number };
}

// JWT Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};


// --- API ROUTES (Protected) ---

// Get all activities for a user
app.get('/api/activities', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const sql = "SELECT * FROM activities WHERE user_id = ?";
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(rows);
  });
});

// Add a new activity
app.post('/api/activities', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const { name, target_count } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Activity name is required" });
  }

  const sql = "INSERT INTO activities (user_id, name, target_count) VALUES (?, ?, ?)";
  db.run(sql, [userId, name, target_count || 0], function (err) {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.status(201).json({ message: "Activity created", id: this.lastID });
  });
});

// Update an activity
app.put('/api/activities/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const activityId = req.params.id;
  const { name, target_count } = req.body;
  const userId = req.user!.userId;

  if (!name) {
    return res.status(400).json({ message: "Activity name is required" });
  }

  // Verify that the activity belongs to the user
  const verifySql = "SELECT id FROM activities WHERE id = ? AND user_id = ?";
  db.get(verifySql, [activityId, userId], (err, activity) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (!activity) {
      return res.status(403).json({ message: "Forbidden: Activity does not belong to the user" });
    }

    const updateSql = "UPDATE activities SET name = ?, target_count = ? WHERE id = ?";
    db.run(updateSql, [name, target_count || 0, activityId], function (err) {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({ message: "Activity updated", changes: this.changes });
    });
  });
});

// Get all events for a user, with pagination
app.get('/api/events', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Query for the total count of events
  const countSql = `SELECT COUNT(*) as count FROM events e
                    INNER JOIN activities a ON e.activity_id = a.id
                    WHERE a.user_id = ?`;

  db.get(countSql, [userId], (err, countRow: { count: number }) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    const totalEvents = countRow.count;

    // Query for the paginated events
    const sql = `SELECT e.* FROM events e
                 INNER JOIN activities a ON e.activity_id = a.id
                 WHERE a.user_id = ?
                 ORDER BY e.timestamp DESC
                 LIMIT ? OFFSET ?`;

    db.all(sql, [userId, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({
        events: rows,
        totalEvents: totalEvents,
        page: page,
        limit: limit
      });
    });
  });
});

// Get all events for a user (non-paginated)
app.get('/api/events/all', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const sql = `SELECT e.* FROM events e
               INNER JOIN activities a ON e.activity_id = a.id
               WHERE a.user_id = ?
               ORDER BY e.timestamp DESC`;
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    res.json(rows);
  });
});

// Add a new event
app.post('/api/events', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const { activity_id, count } = req.body;

  if (!activity_id || count == null) {
    return res.status(400).json({ message: "Activity ID and count are required" });
  }

  const timestamp = new Date().toISOString();

  // Verify that the activity belongs to the user before inserting the event
  const verifySql = "SELECT id FROM activities WHERE id = ? AND user_id = ?";
  db.get(verifySql, [activity_id, userId], (err, activity) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (!activity) {
      return res.status(403).json({ message: "Forbidden: Activity does not belong to the user" });
    }

    const insertSql = "INSERT INTO events (activity_id, count, timestamp) VALUES (?, ?, ?)";
    db.run(insertSql, [activity_id, count, timestamp], function (err) {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.status(201).json({ message: "Event created", id: this.lastID });
    });
  });
});

// Update an event
app.put('/api/events/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const { activity_id, count, timestamp } = req.body;
  const userId = req.user!.userId;

  if (!activity_id || count == null || !timestamp) {
    return res.status(400).json({ message: "Activity ID, count, and timestamp are required" });
  }

  // Verify that the event belongs to an activity owned by the user
  const verifySql = `SELECT e.id FROM events e
                     INNER JOIN activities a ON e.activity_id = a.id
                     WHERE e.id = ? AND a.user_id = ?`;
  db.get(verifySql, [eventId, userId], (err, event) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (!event) {
      return res.status(403).json({ message: "Forbidden: Event does not belong to the user" });
    }

    const updateSql = "UPDATE events SET activity_id = ?, count = ?, timestamp = ? WHERE id = ?";
    db.run(updateSql, [activity_id, count, timestamp, eventId], function (err) {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({ message: "Event updated", changes: this.changes });
    });
  });
});

// Delete an event
app.delete('/api/events/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const eventId = req.params.id;
  const userId = req.user!.userId;

  // Verify that the event belongs to an activity owned by the user
  const verifySql = `SELECT e.id FROM events e
                     INNER JOIN activities a ON e.activity_id = a.id
                     WHERE e.id = ? AND a.user_id = ?`;
  db.get(verifySql, [eventId, userId], (err, event) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (!event) {
      return res.status(403).json({ message: "Forbidden: Event does not belong to the user" });
    }

    const deleteSql = "DELETE FROM events WHERE id = ?";
    db.run(deleteSql, [eventId], function (err) {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }
      res.json({ message: "Event deleted", changes: this.changes });
    });
  });
});


if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, '../../client-svelte/build');
  // Serve static files from the Svelte app
  app.use(express.static(clientBuildPath));

  // All other GET requests not handled before will return our Svelte app
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const server = http.createServer({ maxHeaderSize: 16384 }, app);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

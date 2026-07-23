const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
// Enable CORS for all routes so your frontend can connect
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*", 
    methods: ["GET", "POST", "DELETE"] 
  } 
});

app.get('/', (req, res) => res.send('Vidhiora Pro API is Live!'));

// --- IN-MEMORY DATABASES ---
let content = {
  cases: [{ id: 1, title: "State of Maharashtra v. XYZ", court: "Supreme Court", summary: "Landmark judgment redefining procedural thresholds for anticipatory bail." }],
  blogs: [{ id: 1, title: "The Future of AI in Legal Tech", author: "Adv. Sharma", summary: "How artificial intelligence is changing contract drafting and review." }],
  notes: [{ id: 1, subject: "Constitution", title: "Fundamental Rights (Art 12-35)", uploadedBy: "Admin" }],
  jobs: [{ id: 1, title: "Legal Advisor", company: "TechLaw Solutions", salary: "₹50,000/mo", type: "Full-Time" }],
  webinars: [{ id: 1, title: "Drafting Corporate Contracts", speaker: "Adv. Mehra", date: "Oct 25, 2026" }],
  announcements: [{ id: 1, title: "Orientation Webinar 2026", meta: "August 15, 2026 | 10:00 AM", summary: "Mandatory orientation for all new first-year students." }],
  qa: [{ id: 1, title: "How do I participate in the Live Quiz?", meta: "System FAQ", summary: "You must be logged in using your Google Account. Navigate to the Live Quiz tab and wait for a faculty member to broadcast a question." }]
};

// Security Codes
const FACULTY_SECRET = process.env.FACULTY_CODE || "FACULTY-2026";
const ADMIN_SECRET = process.env.ADMIN_CODE || "ADMIN-MASTER-037";
let validFacultyCodes = [FACULTY_SECRET, ADMIN_SECRET];
let leaderboard = {};

// --- REST API ENDPOINTS ---

// Fetch Content
app.get('/api/:type', (req, res) => {
  const type = req.params.type;
  if (content[type]) res.json(content[type]);
  else res.status(404).json({ error: "Not found" });
});

// Upload Content Endpoint
app.post('/api/upload', (req, res) => {
  const { type, data, code } = req.body;
  if (!validFacultyCodes.includes(code)) return res.status(403).json({ error: "Unauthorized Code" });

  if (content[type]) {
    content[type].unshift({ id: Date.now(), ...data });
    res.status(201).json({ message: "Content uploaded successfully!" });
  } else {
    res.status(400).json({ error: "Invalid content type" });
  }
});

// Delete Content Endpoint
app.delete('/api/delete/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const { code } = req.body;

  if (!validFacultyCodes.includes(code)) {
    return res.status(403).json({ error: "Unauthorized Code" });
  }

  if (content[type]) {
    const initialLength = content[type].length;
    content[type] = content[type].filter(item => item.id !== parseInt(id));

    if (content[type].length < initialLength) {
      return res.json({ message: "Content deleted successfully!" });
    } else {
      return res.status(404).json({ error: "Item not found" });
    }
  } else {
    return res.status(400).json({ error: "Invalid content type" });
  }
});

// --- SOCKET.IO (LIVE QUIZ) ---
io.on('connection', (socket) => {
  socket.on('faculty_start_quiz', (data) => {
    if (validFacultyCodes.includes(data.code)) {
      io.emit('student_receive_question', data.questionData);
    }
  });

  socket.on('student_submit_answer', (data) => {
    const { email, name, points } = data; 
    
    // Prevent crash if email is somehow missing
    const userKey = email || name || socket.id;

    if (!leaderboard[userKey]) leaderboard[userKey] = { name: name || "Anonymous", score: 0 };
    leaderboard[userKey].score += points;

    const sorted = Object.values(leaderboard).sort((a, b) => b.score - a.score);
    io.emit('update_leaderboard', sorted);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Vidhiora Backend active on port ${PORT}`));
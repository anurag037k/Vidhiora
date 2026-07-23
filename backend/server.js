const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.get('/', (req, res) => res.send('Vidhiora Pro API is Live!'));

// --- IN-MEMORY DATABASES ---
let content = {
  cases: [{ id: 1, title: "State of Maharashtra v. XYZ", court: "Supreme Court", summary: "Landmark judgment redefining procedural thresholds for anticipatory bail." }],
  blogs: [{ id: 1, title: "The Future of AI in Legal Tech", author: "Adv. Sharma", summary: "How artificial intelligence is changing contract drafting and review." }],
  notes: [{ id: 1, subject: "Constitution", title: "Fundamental Rights (Art 12-35)", uploadedBy: "Admin" }],
  jobs: [{ id: 1, title: "Legal Advisor", company: "TechLaw Solutions", salary: "₹50,000/mo", type: "Full-Time" }],
  webinars: [{ id: 1, title: "Drafting Corporate Contracts", speaker: "Adv. Mehra", date: "Oct 25, 2026" }]
};

// Admin & Faculty Codes
let validFacultyCodes = ["FACULTY-2026", "ADMIN-MASTER-037"];
let leaderboard = {};

// --- REST API ENDPOINTS ---
app.get('/api/:type', (req, res) => {
  const type = req.params.type;
  if (content[type]) res.json(content[type]);
  else res.status(404).json({ error: "Not found" });
});

// Admin/Faculty Upload Endpoint
app.post('/api/upload', (req, res) => {
  const { type, data, code } = req.body;
  
  if (!validFacultyCodes.includes(code)) {
    return res.status(403).json({ error: "Unauthorized Code" });
  }

  if (content[type]) {
    content[type].unshift({ id: Date.now(), ...data });
    res.status(201).json({ message: "Content uploaded successfully!" });
  } else {
    res.status(400).json({ error: "Invalid content type" });
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
    if (!leaderboard[email]) leaderboard[email] = { name, score: 0 };
    leaderboard[email].score += points;

    const sorted = Object.values(leaderboard).sort((a, b) => b.score - a.score);
    io.emit('update_leaderboard', sorted);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Vidhiora Backend active on port ${PORT}`));
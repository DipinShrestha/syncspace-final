// backend/server.js
const express    = require('express');
const dotenv     = require('dotenv');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');

const authRoutes      = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const boardRoutes     = require('./routes/boardRoutes');
const cardRoutes      = require('./routes/cardRoutes');
const documentRoutes  = require('./routes/documentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoute     = require('./routes/uploadRoute');   // NEW
const chatSocket      = require('./sockets/chatSocket');
const { setIO }       = require('./socketInstance');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5500;

app.use(express.json());
app.use(cors());

// Serve uploaded files as static assets  →  GET /uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI, {
  autoSelectFamily: false,
  serverSelectionTimeoutMS: 30000,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => { console.error('❌ MongoDB:', err.message); process.exit(1); });

app.use('/api/auth',       authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards',     boardRoutes);
app.use('/api/cards',      cardRoutes);
app.use('/api/documents',  documentRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload',     uploadRoute);   // NEW  →  POST /api/upload

app.get('/', (_req, res) => res.send('SyncSpace API running'));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
setIO(io); // make io available to controllers (e.g. boardController emits card-updated)
chatSocket(io);

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = 3000;

// Configured with your live Google Client ID from your cloud console
const googleClient = new OAuth2Client("1025926587968-flg80c3repb78hrb18vs4oqtotgaa417.apps.googleusercontent.com");
const JWT_SECRET = "ralli_studios_super_secret_key_123"; 

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// Temporary mock user and order databases
const users = [];
const dummyOrders = [
    { _id: "RALLI-1001", items: ["Custom Sticker Pack Set"], totalPrice: 15 },
    { _id: "RALLI-1002", items: ["Studio Hoodie", "Vinyl Decal"], totalPrice: 65 }
];

// REGISTER ENDPOINT
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now().toString(), email, password: hashedPassword };
        users.push(newUser);
        res.status(201).json({ success: true, message: "Account created!" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

// LOGIN ENDPOINT
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid email or password" });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// GOOGLE AUTH ENDPOINT
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: "1025926587968-flg80c3repb78hrb18vs4oqtotgaa417.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        
        let user = users.find(u => u.email === payload.email);
        if (!user) {
            user = { id: payload.sub, email: payload.email, name: payload.name };
            users.push(user);
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(400).json({ error: "Google verification failed" });
    }
});

// FETCH ORDERS ENDPOINT (Protected by checking for the token)
app.get('/api/orders', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        jwt.verify(token, JWT_SECRET);
        res.json(dummyOrders); // Return orders if token is valid!
    } catch (err) {
        res.status(403).json({ error: "Invalid token" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    const mongoose = require('mongoose');

// Connect to the secure MongoDB string we just hid in Render
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/rallistudios";
mongoose.connect(mongoURI)
    .then(() => console.log("💾 Securely connected to MongoDB Atlas!"))
    .catch(err => console.error("Database connection error:", err));
});
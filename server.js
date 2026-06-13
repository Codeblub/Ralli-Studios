const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = 3000;

// Initialize Google Auth Client (Get your Client ID from Google Cloud Console later)
const googleClient = new OAuth2Client("YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com");
const JWT_SECRET = "ralli_studios_super_secret_key_123"; // Keep this secret!

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// Temporary mock user database
const users = [];

// 1. CUSTOM EMAIL/PASSWORD REGISTRATION
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = { id: Date.now().toString(), email, password: hashedPassword };
        users.push(newUser);

        res.status(201).json({ success: true, message: "Account created!" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

// 2. CUSTOM EMAIL/PASSWORD LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Generate a secure session token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// 3. SIGN IN WITH GOOGLE
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify the token sent from the Google browser button
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: "1025926587968-flg80c3repb78hrb18vs4oqtotgaa417.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        
        let user = users.find(u => u.email === payload.email);
        if (!user) {
            // Create a new user account automatically if they don't exist yet
            user = { id: payload.sub, email: payload.email, name: payload.name };
            users.push(user);
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(400).json({ error: "Google authentication failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
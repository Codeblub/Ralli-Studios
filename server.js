const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = 3000;

// Connect to MongoDB Atlas securely using Render's background variable
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/rallistudios";
mongoose.connect(mongoURI)
    .then(() => console.log("💾 Securely connected to MongoDB Atlas!"))
    .catch(err => console.error("Database connection error:", err));

// Define your real User database structure
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional because Google users won't have one
    name: { type: String },
    googleId: { type: String }
});
const User = mongoose.model('User', UserSchema);

const googleClient = new OAuth2Client("1025926587968-flg80c3repb78hrb18vs4oqtotgaa417.apps.googleusercontent.com");
const JWT_SECRET = "ralli_studios_super_secret_key_123"; 

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const dummyOrders = [
    { _id: "RALLI-1001", items: ["Custom Sticker Pack Set"], totalPrice: 15 },
    { _id: "RALLI-1002", items: ["Studio Hoodie", "Vinyl Decal"], totalPrice: 65 }
];

// REGISTER ENDPOINT (Saves to MongoDB)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Look up user inside MongoDB Atlas
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save(); // Save record straight to the cloud database!

        res.status(201).json({ success: true, message: "Account created!" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

// LOGIN ENDPOINT (Reads from MongoDB)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// GOOGLE AUTH ENDPOINT (Saves or Logs In Google Users on MongoDB)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: "1025926587968-flg80c3repb78hrb18vs4oqtotgaa417.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        
        let user = await User.findOne({ email: payload.email });
        if (!user) {
            // Register them automatically into your database if they are new
            user = new User({ email: payload.email, name: payload.name, googleId: payload.sub });
            await user.save();
        }

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(400).json({ error: "Google verification failed" });
    }
});

// FETCH ORDERS ENDPOINT
app.get('/api/orders', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        jwt.verify(token, JWT_SECRET);
        res.json(dummyOrders); 
    } catch (err) {
        res.status(403).json({ error: "Invalid token" });
    }
});

// SECURE ADMIN LOGIN ENDPOINT
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Pull the encrypted values directly from Render's environment variables
    const secureUser = process.env.ADMIN_USER;
    const securePass = process.env.ADMIN_PASS;

    if (!secureUser || !securePass) {
        return res.status(500).json({ error: "Admin credentials are not configured in environment." });
    }

    if (username === secureUser && password === securePass) {
        // Issue a specialized Admin Token
        const adminToken = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ success: true, adminToken });
    }

    res.status(401).json({ error: "Invalid admin credentials" });
});

// MASTER ADMIN ENDPOINT: VIEW ALL ORDERS
app.get('/api/admin/all-orders', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Block anyone who doesn't have the specific admin signature
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        // Return the global list of orders (When you hook up MongoDB orders, replace with Order.find())
        res.json(dummyOrders); 
    } catch (err) {
        res.status(403).json({ error: "Invalid session" });
    }
});

// MASTER ADMIN ENDPOINT: CANCEL/DELETE AN ORDER
app.delete('/api/admin/cancel-order/:id', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Strict administration check
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const orderId = req.params.id;
        
        // Find the index of the order inside our global array
        const orderIndex = dummyOrders.findIndex(o => o._id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: "Order reference number not found." });
        }

        // Remove the order from the system
        dummyOrders.splice(orderIndex, 1);
        
        res.json({ success: true, message: `Order ${orderId} successfully canceled.` });
    } catch (err) {
        res.status(403).json({ error: "Invalid admin session" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
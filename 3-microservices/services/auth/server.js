const app = require('koa')();
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db.json');
const fs = require('fs');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'adventure-time-secret-key';

// Middleware
app.use(bodyParser());
app.use(function *(next){
  const start = new Date;
  yield next;
  const ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

// Helper to save changes to db.json
function saveDatabase() {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

// Authentication routes
router.post('/api/auth/login', function *() {
  const { username, password } = this.request.body;
  
  // Find user
  const user = db.users.find(u => u.username === username);
  if (!user) {
    this.status = 401;
    this.body = { error: 'Invalid credentials' };
    return;
  }
  
  // Verify password
  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    this.status = 401;
    this.body = { error: 'Invalid credentials' };
    return;
  }
  
  // Generate token
  const token = jwt.sign({ 
    id: user.id, 
    username: user.username 
  }, JWT_SECRET, { expiresIn: '24h' });
  
  // Save session
  db.sessions.push({
    userId: user.id,
    token,
    createdAt: new Date().toISOString()
  });
  saveDatabase();
  
  this.body = {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
});

router.post('/api/auth/register', function *() {
  const { username, password, email } = this.request.body;
  
  // Check if username exists
  if (db.users.some(u => u.username === username)) {
    this.status = 400;
    this.body = { error: 'Username already taken' };
    return;
  }
  
  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);
  
  // Create new user
  const newUser = {
    id: db.users.length + 1,
    username,
    password: hashedPassword,
    email
  };
  
  db.users.push(newUser);
  saveDatabase();
  
  this.body = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email
  };
});

router.get('/api/auth/verify', function *() {
  const token = this.headers.authorization?.split(' ')[1];
  
  if (!token) {
    this.status = 401;
    this.body = { error: 'No token provided' };
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is in active sessions
    const session = db.sessions.find(s => s.token === token && s.userId === decoded.id);
    if (!session) {
      this.status = 401;
      this.body = { error: 'Invalid or expired token' };
      return;
    }
    
    this.body = { valid: true, user: decoded };
  } catch (err) {
    this.status = 401;
    this.body = { error: 'Invalid or expired token' };
  }
});

router.post('/api/auth/logout', function *() {
  const token = this.headers.authorization?.split(' ')[1];
  
  if (!token) {
    this.status = 400;
    this.body = { error: 'No token provided' };
    return;
  }
  
  // Remove session
  const sessionIndex = db.sessions.findIndex(s => s.token === token);
  if (sessionIndex > -1) {
    db.sessions.splice(sessionIndex, 1);
    saveDatabase();
  }
  
  this.body = { message: 'Logout successful' };
});

// Standard health check routes
router.get('/api/', function *() {
  this.body = "Auth API ready to receive requests";
});

router.get('/', function *() {
  this.body = "Auth service ready";
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
console.log('Auth service started on port 3000');


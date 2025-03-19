const app = require('koa')();
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const db = require('./db.json');
const fs = require('fs');

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

// Notifications routes
router.get('/api/notifications/user/:userId', function *() {
  const userId = parseInt(this.params.userId);
  const notifications = db.notifications.filter(n => n.userId === userId);
  
  // Sort by creation date, newest first
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  this.body = notifications;
});

router.post('/api/notifications', function *() {
  const notification = this.request.body;
  
  // Validate required fields
  if (!notification.userId || !notification.type || !notification.message) {
    this.status = 400;
    this.body = { error: 'Missing required fields' };
    return;
  }
  
  // Create new notification
  const newNotification = {
    id: db.notifications.length + 1,
    userId: parseInt(notification.userId),
    type: notification.type,
    sourceId: notification.sourceId ? parseInt(notification.sourceId) : null,
    threadId: notification.threadId ? parseInt(notification.threadId) : null,
    message: notification.message,
    read: false,
    createdAt: new Date().toISOString()
  };
  
  db.notifications.push(newNotification);
  saveDatabase();
  
  this.body = newNotification;
});

router.put('/api/notifications/:notificationId/read', function *() {
  const notificationId = parseInt(this.params.notificationId);
  const notification = db.notifications.find(n => n.id === notificationId);
  
  if (!notification) {
    this.status = 404;
    this.body = { error: 'Notification not found' };
    return;
  }
  
  notification.read = true;
  saveDatabase();
  
  this.body = notification;
});

router.delete('/api/notifications/:notificationId', function *() {
  const notificationId = parseInt(this.params.notificationId);
  const index = db.notifications.findIndex(n => n.id === notificationId);
  
  if (index === -1) {
    this.status = 404;
    this.body = { error: 'Notification not found' };
    return;
  }
  
  db.notifications.splice(index, 1);
  saveDatabase();
  
  this.body = { message: 'Notification deleted' };
});

// Standard health check routes
router.get('/api/', function *() {
  this.body = "Notifications API ready to receive requests";
});

router.get('/', function *() {
  this.body = "Notifications service ready";
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
console.log('Notifications service started on port 3000');

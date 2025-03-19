const app = require('koa')();
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const request = require('request-promise');
const lunr = require('lunr');

// Middleware
app.use(bodyParser());
app.use(function *(next){
  const start = new Date;
  yield next;
  const ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

// In-memory indices
let indices = {
  posts: null,
  threads: null,
  users: null
};

// Raw data storage
let dataStore = {
  posts: [],
  threads: [],
  users: []
};

// Initialize service and build indices
function initializeIndices() {
  console.log('Building search indices...');
  
  // Define service endpoints to fetch data
  const endpoints = [
    { type: 'posts', url: 'http://posts:3000/api/posts' },
    { type: 'threads', url: 'http://threads:3000/api/threads' },
    { type: 'users', url: 'http://users:3000/api/users' }
  ];
  
  // Fetch all data and build indices
  return Promise.all(endpoints.map(endpoint => {
    return request({
      uri: endpoint.url,
      json: true
    }).then(data => {
      dataStore[endpoint.type] = data;
      
      // Create appropriate index based on content type
      switch(endpoint.type) {
        case 'posts':
          indices.posts = lunr(function() {
            this.field('text');
            this.ref('id');
            
            // Add documents to index
            data.forEach((post, index) => {
              // Add a generated ID since posts don't have their own
              post.id = index;
              this.add({
                id: index,
                text: post.text
              });
            });
          });
          break;
          
        case 'threads':
          indices.threads = lunr(function() {
            this.field('title');
            this.ref('id');
            
            data.forEach(thread => {
              this.add({
                id: thread.id,
                title: thread.title
              });
            });
          });
          break;
          
        case 'users':
          indices.users = lunr(function() {
            this.field('username');
            this.field('name');
            this.field('bio');
            this.ref('id');
            
            data.forEach(user => {
              this.add({
                id: user.id,
                username: user.username,
                name: user.name,
                bio: user.bio
              });
            });
          });
          break;
      }
      
      console.log(`Built index for ${endpoint.type}`);
    }).catch(err => {
      console.error(`Failed to build index for ${endpoint.type}:`, err.message);
    });
  }));
}

// Search routes
router.get('/api/search', function *() {
  const query = this.query.q;
  const type = this.query.type; // Optional filter
  
  if (!query) {
    this.status = 400;
    this.body = { error: 'Query parameter "q" is required' };
    return;
  }
  
  let results = [];
  
  // Search specific type or all if not specified
  if (type && indices[type]) {
    try {
      const searchResults = indices[type].search(query);
      results = searchResults.map(result => {
        const item = dataStore[type].find(i => i.id.toString() === result.ref.toString());
        return {
          type,
          score: result.score,
          item
        };
      });
    } catch (err) {
      console.error(`Search error for type ${type}:`, err);
    }
  } else {
    // Search all indices
    Object.keys(indices).forEach(indexType => {
      if (!indices[indexType]) return;
      
      try {
        const searchResults = indices[indexType].search(query);
        const typeResults = searchResults.map(result => {
          const item = dataStore[indexType].find(i => i.id.toString() === result.ref.toString());
          return {
            type: indexType,
            score: result.score,
            item
          };
        });
        
        results = results.concat(typeResults);
      } catch (err) {
        console.error(`Search error for type ${indexType}:`, err);
      }
    });
    
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
  }
  
  this.body = results;
});

router.post('/api/search/index', function *() {
  // This would typically be protected by authentication
  yield initializeIndices();
  this.body = { message: 'Indices rebuilt successfully' };
});

// Standard health check routes
router.get('/api/', function *() {
  this.body = "Search API ready to receive requests";
});

router.get('/', function *() {
  this.body = "Search service ready";
});

app.use(router.routes());
app.use(router.allowedMethods());

// Initialize indices on startup
initializeIndices().then(() => {
  console.log('All indices built successfully');
}).catch(err => {
  console.error('Failed to initialize indices:', err);
});

app.listen(3000);
console.log('Search service started on port 3000');

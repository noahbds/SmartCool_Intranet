const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // API endpoint for team data
  if (req.url === '/api/team') {
    try {
      const teamData = fs.readFileSync(path.join(__dirname, 'data', 'team.json'), 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(teamData);
      console.log('✓ Team data served');
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to load team data', details: e.message }));
      console.error('✗ Error loading team:', e.message);
    }
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Test server running at http://localhost:${PORT}`);
  console.log('📁 Serving from: ' + __dirname);
  console.log('\nTest the API:');
  console.log(`  curl http://localhost:${PORT}/api/team\n`);
});

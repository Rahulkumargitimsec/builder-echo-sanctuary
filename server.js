const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.pdf': 'application/pdf'
};

const server = http.createServer((request, response) => {
  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const extension = path.extname(filePath);
    const headers = { 'Content-Type': contentTypes[extension] || 'application/octet-stream' };
    if (extension === '.pdf') headers['Content-Disposition'] = 'attachment; filename="gridsense-ai-development-plan.pdf"';
    response.writeHead(200, headers);
    response.end(file);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`GridSense AI download page listening on port ${port}`);
});

const { program } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'cache directory path');

program.parse(process.argv);
const options = program.opts();

const cacheDir = options.cache;

// створення директорії кешу якщо її немає
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1); // отримуємо код з URL
  const filePath = path.join(cacheDir, `${code}.jpg`);

  if (!code) {
    res.statusCode = 400;
    return res.end('Bad Request');
  }

  try {

    // GET
    if (req.method === 'GET') {
      const data = await fs.promises.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      return res.end(data);
    }

    // PUT
    if (req.method === 'PUT') {
      let body = [];

      req.on('data', chunk => body.push(chunk));

      req.on('end', async () => {
        const buffer = Buffer.concat(body);
        await fs.promises.writeFile(filePath, buffer);
        res.statusCode = 201;
        res.end('Created');
      });

      return;
    }

    // DELETE
    if (req.method === 'DELETE') {
      await fs.promises.unlink(filePath);
      res.statusCode = 200;
      return res.end('Deleted');
    }

    // інші методи
    res.statusCode = 405;
    res.end('Method Not Allowed');

  } catch (err) {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});
const { program } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');
const superagent = require('superagent');

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'cache directory path');

program.parse(process.argv);
const options = program.opts();

const cacheDir = options.cache;
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1).trim(); // наприклад "404"
  if (!code) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  const filePath = path.join(cacheDir, `${code}.jpg`);

  if (req.method === 'GET') {
    try {
      // Перевірка кешу
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(data);
      }

      // Запит на http.cat
      try {
        const response = await superagent
          .get(`https://http.cat/${code}`)
          .responseType('arraybuffer'); // отримуємо Buffer

        const imageBuffer = Buffer.from(response.body); // гарантія Buffer
        await fs.promises.writeFile(filePath, imageBuffer); // збереження у кеш
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(imageBuffer);

      } catch (err) {
        // Якщо http.cat повертає помилку
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }

    } catch (err) {
      res.writeHead(500);
      return res.end('Server Error');
    }
  } else if (req.method === 'PUT') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(body);
      await fs.promises.writeFile(filePath, buffer);
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('Created');
    });
  } else if (req.method === 'DELETE') {
    try {
      await fs.promises.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Deleted');
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});
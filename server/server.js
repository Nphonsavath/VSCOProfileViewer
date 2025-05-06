// server.js (Puppeteer version)
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'Server running',
    endpoint: '/api/vsco/:username'
  });
});

app.get('/api/vsco/:username', async (req, res) => {
  const { username } = req.params;
  const url = `https://vsco.co/${username}`;

  let browser;
  try {
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });      
    const page = await browser.newPage();

    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000, // lower timeout for speed
      });
      

    // Wait for image to appear (CSS class from inspection)
    await page.waitForSelector('img.css-1yi5vov', { timeout: 10000 });

    const imageUrl = await page.$eval('img.css-1yi5vov', img => img.src);

    await browser.close();

    return res.json({ imageUrl });
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ error: 'Could not fetch profile image. Possibly private or not found.' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(port, () => {
  console.log(`✅ Puppeteer server running at http://localhost:${port}`);
});

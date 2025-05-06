// server.js (Puppeteer version)
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import rateLimit from 'express-rate-limit';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const app = express();
const port = process.env.PORT || 3001;

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Browser instance pool
let browserPool = [];
const MAX_BROWSERS = 5;
const BROWSER_TIMEOUT = 30000; // 30 seconds

// Initialize browser pool
async function initializeBrowserPool() {
  for (let i = 0; i < MAX_BROWSERS; i++) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      browserPool.push(browser);
    } catch (err) {
      console.error('Failed to initialize browser:', err);
    }
  }
}

// Get available browser from pool
async function getBrowser() {
  while (browserPool.length === 0) {
    await sleep(1000); // Wait for a browser to become available
  }
  return browserPool.shift();
}

// Return browser to pool
function returnBrowser(browser) {
  if (browserPool.length < MAX_BROWSERS) {
    browserPool.push(browser);
  } else {
    browser.close().catch(console.error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    browserPoolSize: browserPool.length,
    uptime: process.uptime()
  });
});

// VSCO profile endpoint
app.get('/api/vsco/:username', async (req, res) => {
  const { username } = req.params;
  let browser;
  let page;

  try {
    // Input validation
    if (!username || username.length > 50) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    // Get browser from pool
    browser = await getBrowser();
    page = await browser.newPage();

    // Set timeout and viewport
    await page.setDefaultNavigationTimeout(BROWSER_TIMEOUT);
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to profile
    const url = `https://vsco.co/${username}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for image with retry logic
    let imageUrl;
    for (let i = 0; i < 3; i++) {
      try {
        await page.waitForSelector('img[src*="i.vsco.co"]', { timeout: 5000 });
        imageUrl = await page.$eval('img[src*="i.vsco.co"]', img => img.src);
        break;
      } catch (err) {
        if (i === 2) throw new Error('Profile image not found');
        await sleep(1000);
      }
    }

    if (!imageUrl) {
      throw new Error('Profile image not found');
    }

    // Return browser to pool
    returnBrowser(browser);
    browser = null;

    res.json({ imageUrl });
  } catch (err) {
    console.error(`Error fetching profile for ${username}:`, err.message);
    
    // Handle specific error cases
    if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      res.status(503).json({ error: 'VSCO service temporarily unavailable' });
    } else if (err.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      res.status(404).json({ error: 'VSCO profile not found' });
    } else if (err.message.includes('timeout')) {
      res.status(504).json({ error: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Failed to fetch profile image' });
    }
  } finally {
    // Cleanup
    if (page) await page.close().catch(console.error);
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, async () => {
  console.log(`Server running`);
  await initializeBrowserPool();
  console.log(`Browser pool initialized with ${browserPool.length} instances`);
});

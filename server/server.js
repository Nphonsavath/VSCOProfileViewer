const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3001;

// Enable CORS for our React frontend
app.use(cors());
app.use(express.json());

// Root route to show server is running
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    endpoints: {
      vscoProfile: '/api/vsco/:username'
    }
  });
});

// Endpoint to fetch VSCO profile image
app.get('/api/vsco/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log('Fetching profile for username:', username);
    
    // Fetch the VSCO profile page
    const response = await axios.get(`https://vsco.co/${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);
    
    // Find the profile image - try different selectors
    let profileImage = $('img[alt=""][width="140"]').attr('src');
    
    if (!profileImage) {
      // Try alternative selectors
      profileImage = $('img[alt=""]').attr('src');
    }
    
    if (!profileImage) {
      console.log('HTML content:', response.data);
      return res.status(404).json({ error: 'Profile image not found' });
    }

    console.log('Found image URL:', profileImage);
    res.json({ imageUrl: profileImage });
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    });
    
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'VSCO profile not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch VSCO profile' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 
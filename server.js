import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json());

// Security headers with relaxed CSP for development
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:;"
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

const BASE_URL = "https://va.mite.gov.it";
const SEARCH_ENDPOINT = "/it-IT/Ricerca/ViaLibera";
const DOWNLOAD_FOLDER = "downloads";

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER);
}

async function getProjects(keyword) {
  try {
    const searchUrl = `${BASE_URL}${SEARCH_ENDPOINT}?Testo=${encodeURIComponent(keyword)}&t=o`;
    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(resp.data);
    const projectLinks = [];

    $('a[href]').each((_, aTag) => {
      const href = $(aTag).attr('href');
      if (href && href.includes("/it-IT/Oggetti/Info/")) {
        const fullUrl = new URL(href, BASE_URL).href;
        projectLinks.push({
          url: fullUrl,
          title: $(aTag).text().trim()
        });
      }
    });

    return projectLinks;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects from the server');
  }
}

// API routes
app.post('/api/search', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const projects = await getProjects(keyword);
    res.json({ projects });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Proxy route for document downloads
app.get('/api/download', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Forward the headers and the file stream
    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download the file' });
  }
});

// Handle SPA routing - should be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

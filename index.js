require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb');
const dns = require('dns');
const urlparser = require('url');

// Mongo connection
const client = new MongoClient(process.env.DB_URL);

async function main() {
  await client.connect();
  const db = client.db("urlshortner");
  const urls = db.collection("urls");

  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/public', express.static(`${process.cwd()}/public`));

  app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
  });

  // POST create short URL
  app.post('/api/shorturl', async (req, res) => {
    const url = req.body.url;

    // Validación estilo freeCodeCamp
    if (!/^https?:\/\/.+/i.test(url)) {
      return res.json({ error: "invalid url" });
    }

    // Validar que el dominio exista
    const hostname = new URL(url).hostname;


    dns.lookup(hostname, async (err, address) => {
      if (err || !address) {
        return res.json({ error: "invalid url" });
      }

      // Buscar si ya existe
      const existing = await urls.findOne({ url });
      if (existing) {
        return res.json({
          original_url: existing.url,
          short_url: existing.short_url
        });
      }

      // Nuevo short_url incremental
      const count = await urls.countDocuments({});
      const newShort = count + 1;

      const doc = {
        url,
        short_url: newShort
      };

      await urls.insertOne(doc);

      res.json({
        original_url: url,
        short_url: newShort
      });
    });
  });

  // GET redirect
  app.get("/api/shorturl/:short_url", async (req, res) => {
    const shorturl = parseInt(req.params.short_url, 10);
    const urlDoc = await urls.findOne({ short_url: shorturl });

    if (!urlDoc) return res.json({ error: "No URL found" });

    res.redirect(urlDoc.url);
  });

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

main();

 

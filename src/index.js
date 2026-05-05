import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { query, initDB } from './db.js';
import { signToken, verifyToken } from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['*'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Multer — memory storage, return base64
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Aeton Homes API' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'aeton2024';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = signToken();
  res.json({ token });
});

// ── Image Upload ──────────────────────────────────────────────────────────────
app.post('/api/upload', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const b64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
  res.json({ url: dataUrl });
});

// ── Site Content ──────────────────────────────────────────────────────────────
app.get('/api/content', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM site_content');
    const content = {};
    result.rows.forEach(r => { content[r.key] = r.value; });
    res.json(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/content', verifyToken, async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await query(
        `INSERT INTO site_content (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Properties ────────────────────────────────────────────────────────────────
app.get('/api/properties', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM properties WHERE active = true ORDER BY order_index ASC, created_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/properties/all', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM properties ORDER BY order_index ASC, created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/properties', verifyToken, async (req, res) => {
  try {
    const {
      title, subtitle = '', description = '', price, price_suffix = '',
      type = 'sale', beds = 0, baths = 0, sqm = 0, location = '',
      image_url = '', images = [], featured = false, active = true, order_index = 0
    } = req.body;
    const result = await query(
      `INSERT INTO properties
        (title, subtitle, description, price, price_suffix, type, beds, baths, sqm, location, image_url, images, featured, active, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [title, subtitle, description, price, price_suffix, type, beds, baths, sqm, location, image_url, JSON.stringify(images), featured, active, order_index]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/properties/:id', verifyToken, async (req, res) => {
  try {
    const {
      title, subtitle, description, price, price_suffix,
      type, beds, baths, sqm, location, image_url, images = [], featured, active, order_index
    } = req.body;
    const result = await query(
      `UPDATE properties SET
        title=$1, subtitle=$2, description=$3, price=$4, price_suffix=$5,
        type=$6, beds=$7, baths=$8, sqm=$9, location=$10, image_url=$11,
        images=$12, featured=$13, active=$14, order_index=$15
       WHERE id=$16 RETURNING *`,
      [title, subtitle, description, price, price_suffix, type, beds, baths, sqm, location, image_url, JSON.stringify(images), featured, active, order_index, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/properties/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM properties WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Testimonials ──────────────────────────────────────────────────────────────
app.get('/api/testimonials', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM testimonials WHERE active = true ORDER BY order_index ASC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/testimonials/all', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM testimonials ORDER BY order_index ASC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/testimonials', verifyToken, async (req, res) => {
  try {
    const { name, role = '', quote, stars = 5, avatar_url = '', active = true, order_index = 0 } = req.body;
    const result = await query(
      `INSERT INTO testimonials (name, role, quote, stars, avatar_url, active, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, role, quote, stars, avatar_url, active, order_index]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/testimonials/:id', verifyToken, async (req, res) => {
  try {
    const { name, role, quote, stars, avatar_url, active, order_index } = req.body;
    const result = await query(
      `UPDATE testimonials SET name=$1, role=$2, quote=$3, stars=$4, avatar_url=$5, active=$6, order_index=$7
       WHERE id=$8 RETURNING *`,
      [name, role, quote, stars, avatar_url, active, order_index, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/testimonials/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM testimonials WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Team ──────────────────────────────────────────────────────────────────────
app.get('/api/team', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM team WHERE active = true ORDER BY order_index ASC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/team/all', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM team ORDER BY order_index ASC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/team', verifyToken, async (req, res) => {
  try {
    const { name, role = '', bio = '', photo_url = '', order_index = 0, active = true } = req.body;
    const result = await query(
      `INSERT INTO team (name, role, bio, photo_url, order_index, active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, role, bio, photo_url, order_index, active]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/team/:id', verifyToken, async (req, res) => {
  try {
    const { name, role, bio, photo_url, order_index, active } = req.body;
    const result = await query(
      `UPDATE team SET name=$1, role=$2, bio=$3, photo_url=$4, order_index=$5, active=$6
       WHERE id=$7 RETURNING *`,
      [name, role, bio, photo_url, order_index, active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/team/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM team WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Videos ────────────────────────────────────────────────────────────────────
app.get('/api/videos', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM videos WHERE active = true ORDER BY featured DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/videos/all', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM videos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/videos', verifyToken, async (req, res) => {
  try {
    const {
      title, description = '', location_tag = '', category = 'Tour',
      thumbnail_url = '', video_url, video_type = 'youtube',
      featured = false, active = true
    } = req.body;
    const result = await query(
      `INSERT INTO videos (title, description, location_tag, category, thumbnail_url, video_url, video_type, featured, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, location_tag, category, thumbnail_url, video_url, video_type, featured, active]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/videos/:id', verifyToken, async (req, res) => {
  try {
    const {
      title, description, location_tag, category,
      thumbnail_url, video_url, video_type, featured, active
    } = req.body;
    const result = await query(
      `UPDATE videos SET title=$1, description=$2, location_tag=$3, category=$4,
        thumbnail_url=$5, video_url=$6, video_type=$7, featured=$8, active=$9
       WHERE id=$10 RETURNING *`,
      [title, description, location_tag, category, thumbnail_url, video_url, video_type, featured, active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/videos/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM videos WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Enquiries ─────────────────────────────────────────────────────────────────
app.post('/api/enquiries', async (req, res) => {
  try {
    const { name, email, phone = '', interest = '', message = '' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const result = await query(
      `INSERT INTO enquiries (name, email, phone, interest, message)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email, phone, interest, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/enquiries', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM enquiries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/enquiries/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await query(
      'UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/enquiries/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM enquiries WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public Reviews ────────────────────────────────────────────────────────────
// Public: submit a review
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, email = '', quote, stars = 5 } = req.body;
    if (!name || !quote) return res.status(400).json({ error: 'name and quote required' });
    if (stars < 1 || stars > 5) return res.status(400).json({ error: 'stars must be 1-5' });
    const result = await query(
      `INSERT INTO public_reviews (name, email, quote, stars) VALUES ($1,$2,$3,$4) RETURNING id,name,stars,created_at`,
      [name, email, quote, stars]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: get approved reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await query(
      'SELECT id,name,quote,stars,created_at FROM public_reviews WHERE approved=true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: get all reviews (including unapproved)
app.get('/api/reviews/all', verifyToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM public_reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: approve/reject a review
app.put('/api/reviews/:id/approve', verifyToken, async (req, res) => {
  try {
    const { approved } = req.body;
    const result = await query(
      'UPDATE public_reviews SET approved=$1 WHERE id=$2 RETURNING *',
      [approved, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete a review
app.delete('/api/reviews/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM public_reviews WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Aeton Homes API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to init DB:', err);
    process.exit(1);
  });

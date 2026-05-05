import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      description TEXT DEFAULT '',
      price TEXT NOT NULL,
      price_suffix TEXT DEFAULT '',
      type TEXT DEFAULT 'sale',
      beds INTEGER DEFAULT 0,
      baths INTEGER DEFAULT 0,
      sqm INTEGER DEFAULT 0,
      location TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      featured BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      quote TEXT NOT NULL,
      stars INTEGER DEFAULT 5,
      avatar_url TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS team (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      location_tag TEXT DEFAULT '',
      category TEXT DEFAULT 'Tour',
      thumbnail_url TEXT DEFAULT '',
      video_url TEXT NOT NULL,
      video_type TEXT DEFAULT 'youtube',
      featured BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      interest TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Database tables ready');
}

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
      images JSONB DEFAULT '[]',
      featured BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public_reviews (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      quote TEXT NOT NULL,
      stars INTEGER DEFAULT 5,
      approved BOOLEAN DEFAULT false,
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
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      interest TEXT DEFAULT '',
      message TEXT DEFAULT '',
      preferred_contact TEXT DEFAULT 'call',
      status TEXT DEFAULT 'new',
      source TEXT DEFAULT 'website',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'call';
    ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      property_title TEXT DEFAULT '',
      property_id INTEGER DEFAULT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      preferred_contact TEXT DEFAULT 'call',
      viewing_date TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      admin_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS page_visits (
      id SERIAL PRIMARY KEY,
      ip TEXT DEFAULT '',
      path TEXT DEFAULT '/',
      user_agent TEXT DEFAULT '',
      referrer TEXT DEFAULT '',
      screen_width INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Schema migrations — safe to run on existing DB
  await query(`ALTER TABLE public_reviews ALTER COLUMN approved SET DEFAULT true`);
  await query(`UPDATE public_reviews SET approved=true WHERE approved=false`);
  // properties columns added after initial deploy
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT ''`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_suffix TEXT DEFAULT ''`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 0`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS baths INTEGER DEFAULT 0`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqm INTEGER DEFAULT 0`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_videos JSONB DEFAULT '[]'`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);
  await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0`);
  await query(`ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`);

  console.log('✅ Database tables ready');
}

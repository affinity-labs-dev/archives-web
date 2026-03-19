const SUPABASE_URL = 'https://kcgihainlnntshupiztu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZ2loYWlubG5udHNodXBpenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODMzNzMsImV4cCI6MjA3MDI1OTM3M30.hyZB28wO88jiCh30PoLCDGt8MvsmaLjsl96a56xpyJk';

const cache = new Map();

async function query(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

export async function getAdventures(eraId = 'prophets') {
  return query(`content?era_id=eq.${encodeURIComponent(eraId)}&order=order_by.asc&select=readable_id,era_id,adventure_title,adventure_description,timeline,order_by,icon_url,card_content`);
}

export async function getAdventure(readableId) {
  const rows = await query(`content?readable_id=eq.${encodeURIComponent(readableId)}&select=*`);
  return rows[0] || null;
}

export async function getEra(eraId = 'prophets') {
  const rows = await query(`eras?era_id=eq.${encodeURIComponent(eraId)}&select=*`);
  return rows[0] || null;
}

export async function getAllEras() {
  return query('eras?order=order_by.asc&select=*');
}

export async function getTodayStory() {
  const today = new Date().toISOString().split('T')[0];
  const rows = await query(`daily_content?date=eq.${encodeURIComponent(today)}&select=*`);
  if (rows[0]) return rows[0];
  // Fallback: get most recent past entry
  const fallback = await query('daily_content?date=lte.' + encodeURIComponent(today) + '&order=date.desc&limit=1&select=*');
  return fallback[0] || null;
}

export async function getDailyStory(date) {
  const rows = await query(`daily_content?date=eq.${encodeURIComponent(date)}&select=*`);
  return rows[0] || null;
}

export async function getDailyStories() {
  return query('daily_content?order=date.desc&select=id,date,content,is_active');
}

export async function getFeaturedAdventure() {
  // Get the newest adventure, excluding recaps
  const rows = await query('content?select=readable_id,adventure_title,adventure_description,timeline,era_id,card_content,icon_url&order=created_at.desc&readable_id=not.like.*recap*&limit=1');
  return rows[0] || null;
}

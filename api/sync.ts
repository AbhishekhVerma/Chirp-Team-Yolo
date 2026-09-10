import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return new Response('Username is required', { status: 400 });
    }

    // Handle GET: Fetch user's saved spots
    if (request.method === 'GET') {
      const data = await kv.get(`vibes_saved_${username}`);
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle POST: Update user's saved spots
    if (request.method === 'POST') {
      const body = await request.json();
      const savedSpots = body.savedSpots;
      
      if (!Array.isArray(savedSpots)) {
        return new Response('Invalid data format', { status: 400 });
      }

      await kv.set(`vibes_saved_${username}`, savedSpots);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

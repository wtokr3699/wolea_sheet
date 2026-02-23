export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Spotify Access Token 발급
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('Spotify 토큰 발급 실패');
    const accessToken = tokenData.access_token;

    // 2. Track 검색
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const searchData = await searchResponse.json();

    if (searchData.tracks && searchData.tracks.items.length > 0) {
      const track = searchData.tracks.items[0];
      res.status(200).json({
        found: true,
        title: track.name,
        artist: track.artists[0].name,
        url: track.external_urls.spotify
      });
    } else {
      res.status(200).json({ found: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query가 필요합니다.' });

  const API_KEY = process.env.YOUTUBE_API_KEY;

  try {
    const searchQuery = encodeURIComponent(`${query} 찬양 CCM`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=5&regionCode=KR&relevanceLanguage=ko&key=${API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube API 오류: ${response.status}`);

    const data = await response.json();

    const items = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

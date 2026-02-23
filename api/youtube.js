export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY가 설정되지 않았습니다.' });

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query + ' 찬양')}&type=video&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const items = data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

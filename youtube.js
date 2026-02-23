export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, blogId } = req.query;

  if (!query || !blogId) {
    return res.status(400).json({ error: 'query와 blogId가 필요합니다.' });
  }

  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  try {
    // 네이버 블로그 검색 API 호출
    // query에 블로그 ID를 포함시켜 해당 블로그 내 검색
    const searchQuery = encodeURIComponent(`${query} site:blog.naver.com/${blogId}`);
    const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${searchQuery}&display=5&sort=sim`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status}`);
    }

    const data = await response.json();

    // 해당 블로그의 포스팅만 필터링
    const filtered = (data.items || []).filter(item =>
      item.link && item.link.includes(`blog.naver.com/${blogId}`)
    );

    return res.status(200).json({
      blogId,
      total: filtered.length,
      hasResults: filtered.length > 0,
      items: filtered.map(item => ({
        title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        link: item.link,
        description: item.description.replace(/<[^>]*>/g, ''),
        postdate: item.postdate,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

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
    // 💡 핵심 수정 1: 정확도를 높이기 위해 검색어 뒤에 '악보' 키워드와 블로그 ID를 함께 검색
    const optimizedQuery = `${query} 악보 ${blogId}`;
    const searchQuery = encodeURIComponent(optimizedQuery);
    
    // 💡 핵심 수정 2: display=100으로 설정하여 네이버 전체 검색 결과에서 100개를 싹쓸이해옴
    const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${searchQuery}&display=100&sort=sim`;

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

    // 💡 핵심 수정 3: 100개의 결과 중, URL에 해당 블로그 ID가 포함된 것만 '진짜 그 블로그 글'로 인정
    const filtered = (data.items || []).filter(item =>
      item.link && item.link.includes(blogId)
    );

    return res.status(200).json({
      blogId,
      total: filtered.length,
      hasResults: filtered.length > 0,
      // 프론트엔드 화면이 지저분해지지 않게 가장 연관성 높은 상위 5개만 잘라서 전달
      items: filtered.slice(0, 5).map(item => ({
        title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 깔끔하게 제거
        link: item.link,
        description: item.description.replace(/<[^>]*>/g, ''),
        postdate: item.postdate,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

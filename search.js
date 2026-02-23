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
    // 💡 핵심 수정: 네이버 고급 검색 문법 (site:) 적용
    // 예: "은혜 악보 site:blog.naver.com/0909junseo"
    // 이렇게 하면 네이버가 정확히 해당 블로그 내부에서만 곡을 뒤집니다.
    const optimizedQuery = `${query} 악보 site:blog.naver.com/${blogId}`;
    const searchQuery = encodeURIComponent(optimizedQuery);
    
    // display=100으로 설정하여 해당 블로그의 관련 글을 넉넉하게 끌어옵니다.
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

    // 2차 안전장치: 가져온 결과 중 실제 해당 블로거의 글이 맞는지 링크로 한 번 더 검증
    const filtered = (data.items || []).filter(item => 
      (item.link && item.link.includes(blogId)) || 
      (item.bloggerlink && item.bloggerlink.includes(blogId))
    );

    return res.status(200).json({
      blogId,
      total: filtered.length,
      hasResults: filtered.length > 0,
      // 상위 5개만 깔끔하게 잘라서 화면에 전달
      items: filtered.slice(0, 5).map(item => ({
        title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 찌꺼기 완벽 제거
        link: item.link,
        description: item.description.replace(/<[^>]*>/g, ''),
        postdate: item.postdate,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

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
    // 💡 해결책: 네이버 API는 site: 문법을 지원하지 않음. 
    // 대신 블로그 고유의 '이름(닉네임)'을 검색어에 강제로 붙여서 해당 블로그 글을 Top 100으로 끌어올림!
    const blogKeywords = {
      '0909junseo': '준서',
      'wkdghks38811': '찬양',
      'relishsky': '릴리쉬스카이',
      'jskyscore': '제이스카이'
    };

    const keyword = blogKeywords[blogId] || '';
    
    // 곡 제목은 반드시 포함되도록 쌍따옴표("")로 묶고, 뒤에 악보와 블로그 이름을 붙임
    const optimizedQuery = keyword ? `"${query}" 악보 ${keyword}` : `"${query}" 악보`;
    const searchQuery = encodeURIComponent(optimizedQuery);
    
    // 네이버 전체 블로그 중 위 조건에 맞는 글 100개를 쓸어담음
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

    // 100개 중에서 진짜 해당 블로그(blogId)의 주소에서 쓴 글만 완벽하게 필터링
    const filtered = (data.items || []).filter(item => 
      (item.link && item.link.includes(blogId)) || 
      (item.bloggerlink && item.bloggerlink.includes(blogId))
    );

    return res.status(200).json({
      blogId,
      total: filtered.length,
      hasResults: filtered.length > 0,
      // 프론트엔드로는 제일 연관도 높은 상위 5개만 전송
      items: filtered.slice(0, 5).map(item => ({
        title: item.title.replace(/<[^>]*>/g, ''), // 불필요한 HTML 태그 제거
        link: item.link,
        description: item.description.replace(/<[^>]*>/g, ''),
        postdate: item.postdate,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

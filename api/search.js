export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, blogId } = req.query;

  if (!query || !blogId) {
    return res.status(400).json({ error: '검색어와 블로그 ID가 필요합니다.' });
  }

  try {
    const searchUrl = `https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`;
    
    // 모바일 환경으로 위장하여 네이버 블로그 검색 페이지 요청
    const response = await fetch(searchUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    const html = await response.text();

    // 💡 핵심 수정 1: 진짜로 검색 결과가 없는 경우를 가장 먼저 걸러냅니다. (네이버의 '검색결과가 없습니다' 텍스트 감지)
    if (html.includes('검색결과가 없습니다') || html.includes('검색 결과가 없습니다')) {
      return res.status(200).json({
        blogId,
        total: 0,
        hasResults: false,
        items: []
      });
    }

    const items = [];
    const uniqueLogNos = new Set();
    
    // 검색 결과가 있을 경우에만 글 번호 추출
    const linkRegex = new RegExp(`\\/${blogId}\\/(\\d{8,15})`, 'g');
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const logNo = match[1];
      if (!uniqueLogNos.has(logNo)) {
        uniqueLogNos.add(logNo);
        
        items.push({
          title: `[악보] ${query} - 포스팅 바로가기`,
          link: `https://blog.naver.com/${blogId}/${logNo}`,
          description: '해당 블로그에서 검색된 악보 포스팅입니다.',
          postdate: ''
        });
      }
      if (items.length >= 5) break; 
    }

    // 💡 핵심 수정 2: 억지로 결과를 띄우는 가짜 다이렉트 링크 로직을 완전히 삭제했습니다.
    // 추출된 아이템이 0개라면 정직하게 결과 없음 처리
    if (items.length === 0) {
      return res.status(200).json({
        blogId,
        total: 0,
        hasResults: false,
        items: []
      });
    }

    // 진짜 결과가 있을 때만 반환
    return res.status(200).json({
      blogId,
      total: items.length,
      hasResults: true,
      items: items
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

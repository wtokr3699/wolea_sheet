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
    // 1. 네이버 모바일 블로그 검색 페이지로 직접 접속 (크롤링)
    const searchUrl = `https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`;
    
    // 모바일 기기인 척 속여서 페이지를 요청 (User-Agent 필수)
    const response = await fetch(searchUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    const html = await response.text();
    const items = [];
    const uniqueLogNos = new Set();
    
    // 2. 검색 결과 HTML에서 글 번호(logNo)를 정규식으로 추출
    // 패턴: /blogId/1234567890
    const linkRegex = new RegExp(`\\/${blogId}\\/(\\d{8,15})`, 'g');
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const logNo = match[1];
      if (!uniqueLogNos.has(logNo)) {
        uniqueLogNos.add(logNo);
        
        // 3. 추출한 글 번호를 이용해 실제 블로그 포스팅 링크 생성
        items.push({
          title: `[악보] ${query} - 포스팅 바로가기`,
          link: `https://blog.naver.com/${blogId}/${logNo}`,
          description: '클릭하여 해당 블로그에서 악보를 바로 확인하세요.',
          postdate: ''
        });
      }
      if (items.length >= 5) break; // 화면이 길어지지 않게 5개까지만 추출
    }

    // 4. ★최후의 보루★ 결과가 없거나 크롤링이 안 먹힐 때
    // 무조건 '결과 없음' 대신 블로그 검색창으로 다이렉트로 쏴주는 링크 생성
    if (items.length === 0) {
      items.push({
        title: `👉 '${query}' 악보 검색 결과 직접 확인하기`,
        link: searchUrl,
        description: '클릭하시면 해당 블로그의 악보 검색 화면으로 즉시 이동합니다.',
        postdate: ''
      });
    }

    // 네이버 API를 안 쓰므로 무조건 화면에 띄우기 위해 hasResults: true 반환
    return res.status(200).json({
      blogId,
      total: items.length,
      hasResults: true,
      items: items
    });

  } catch (error) {
    // 5. 서버 에러 발생 시에도 앱이 멈추지 않고 다이렉트 링크 제공
    return res.status(200).json({
      blogId,
      total: 1,
      hasResults: true,
      items: [{
        title: `👉 '${query}' 악보 검색 결과 직접 확인하기`,
        link: `https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`,
        description: '네이버 연결이 지연되었습니다. 클릭하시면 악보 검색 화면으로 바로 이동합니다.',
        postdate: ''
      }]
    });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, blogId } = req.query;
  if (!query || !blogId) return res.status(400).json({ error: '파라미터 누락' });

  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  try {
    const uniqueMap = new Map();

    const addItems = (items) => {
      for (const item of items) {
        const link = item.link.replace('m.blog.naver.com', 'blog.naver.com');
        if (!uniqueMap.has(link)) {
          uniqueMap.set(link, {
            title: item.title.replace(/<[^>]*>/g, '').trim(),
            link: link,
            description: item.description ? item.description.replace(/<[^>]*>/g, '').trim() : '',
            postdate: item.postdate || ''
          });
        }
      }
    };

    // [1단계] 네이버 웹문서 API로 정밀 타겟팅 검색 (site: 문법)
    try {
      const webUrl = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(`site:blog.naver.com/${blogId} ${query}`)}&display=15`;
      const webRes = await fetch(webUrl, { headers: { 'X-Naver-Client-Id': CLIENT_ID, 'X-Naver-Client-Secret': CLIENT_SECRET } });
      if (webRes.ok) {
        const webData = await webRes.json();
        addItems((webData.items || []).filter(i => i.link.includes(blogId)));
      }
    } catch (e) {}

    // [2단계: 핵심] API가 못 찾으면 앱이 직접 블로그에 들어가서 검색 결과를 긁어옴(크롤링)
    if (uniqueMap.size === 0) {
      try {
        const htmlRes = await fetch(`https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' }
        });
        
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          // 블로그 검색창의 링크와 제목을 정규식으로 강제 추출
          const regex = new RegExp(`href="\\/${blogId}\\/(\\d+)"[^>]*>(.*?)<\\/a>`, 'gis');
          let match;
          
          while ((match = regex.exec(html)) !== null) {
            const logNo = match[1];
            const innerHtml = match[2];
            
            const titleMatch = innerHtml.match(/<strong[^>]*>(.*?)<\/strong>/is) || innerHtml.match(/<span[^>]*class="ell"[^>]*>(.*?)<\/span>/is);
            let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `${query} 관련 악보`;
            
            const link = `https://blog.naver.com/${blogId}/${logNo}`;
            if (!uniqueMap.has(link)) {
              uniqueMap.set(link, { title, link, description: '블로그 검색에서 직접 찾은 악보입니다.', postdate: '' });
            }
          }
        }
      } catch (e) {}
    }

    const finalItems = Array.from(uniqueMap.values()).slice(0, 5);

    return res.status(200).json({
      blogId,
      total: finalItems.length,
      hasResults: finalItems.length > 0,
      items: finalItems
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

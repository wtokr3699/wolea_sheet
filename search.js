export default async function handler(req, res) {
  // CORS 오류 방지
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, blogId } = req.query;

  try {
    // 1. 네이버 모바일 블로그 검색창에 직접 접속 (API 사용 안 함)
    const url = `https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' }
    });
    
    const html = await response.text();
    const items = [];
    
    // 2. 검색 결과 HTML에서 글 번호(logNo)를 정규식으로 모조리 긁어옵니다.
    const logNoRegex = new RegExp(`\\/${blogId}\\/(\\d{8,15})`, 'g');
    const matches = [...html.matchAll(logNoRegex)];
    const uniqueLogNos = [...new Set(matches.map(m => m[1]))].slice(0, 5); // 중복 제거 후 5개만

    // 3. 긁어온 글 번호를 바탕으로 클릭할 수 있는 악보 링크를 생성합니다.
    for (let logNo of uniqueLogNos) {
       // 제목도 어떻게든 추출 시도
       let title = `[악보] ${query} - 포스팅 보러가기`;
       const titleRegex = new RegExp(`href=["']?[^>]*?${logNo}["']?[^>]*>\\s*<[^>]*>([\\s\\S]*?)<\\/`, 'i');
       const titleMatch = html.match(titleRegex);
       if (titleMatch && titleMatch[1]) {
         title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
       }

       items.push({
         title: title || `[악보] ${query} - 포스팅 보러가기`,
         link: `https://blog.naver.com/${blogId}/${logNo}`,
         description: '클릭하여 해당 블로그에서 악보를 바로 확인하세요.',
         postdate: ''
       });
    }

    // 4. ★최후의 보루★ 만약 네이버가 사이트 구조를 바꿔서 글 번호를 못 찾았다면?
    // 무조건 '결과 없음' 대신 다이렉트 검색창 링크를 생성해서 화면에 띄웁니다.
    if (items.length === 0) {
      items.push({
        title: `👉 '${query}' 악보 검색 결과 다이렉트로 보기`,
        link: url,
        description: '클릭하시면 해당 블로그의 악보 검색 결과 화면으로 즉시 이동합니다.',
        postdate: ''
      });
    }

    return res.status(200).json({
      blogId,
      total: items.length,
      hasResults: true,
      items: items
    });

  } catch (error) {
    // 5. 서버 자체에 에러가 나더라도 앱 화면이 망가지지 않고 다이렉트 링크를 줍니다.
    return res.status(200).json({
      blogId,
      total: 1,
      hasResults: true,
      items: [{
        title: `👉 '${query}' 악보 검색 결과 다이렉트로 보기`,
        link: `https://m.blog.naver.com/PostSearchList.naver?blogId=${blogId}&searchText=${encodeURIComponent(query)}`,
        description: '서버 로딩이 지연되었습니다. 클릭하시면 악보 검색 화면으로 바로 이동합니다.',
        postdate: ''
      }]
    });
  }
}

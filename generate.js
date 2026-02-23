export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 가능합니다.' });

  const { meditationData, worshipData } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    // 1. Gemini Pro를 이용한 콘티 생성 프롬프트
    const prompt = `당신은 전문 예배 인도자입니다. 다음 주제에 맞는 CCM 찬양 콘티를 추천해주세요. 할루시네이션을 방지하기 위해 반드시 실제로 존재하는 유명한 찬양만 추천해야 합니다.

    [요청 정보]
    - 묵상내용: ${meditationData.input}
    - 예배주제: ${worshipData.theme}
    - 예배시간: ${worshipData.duration}분

    반드시 다음 JSON 구조로만 응답하세요. 마크다운 백틱(\`\`\`) 없이 순수 JSON만 출력해야 합니다:
    {
      "songs": [
        { "order": 1, "title": "곡제목", "artist": "아티스트명", "key": "G", "bpm": 70, "position": "경배", "reason": "이유", "verse": "관련성경", "lyrics": "가사일부" }
      ]
    }`;

    // Gemini API 호출 (1.5 Pro 모델 사용, JSON 출력 강제)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const geminiData = await geminiRes.json();
    if (geminiData.error) throw new Error(geminiData.error.message);

    const rawText = geminiData.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(rawText);
    const songs = parsedData.songs;

    // 2. 할루시네이션 검증: Spotify API를 호출하여 실제 음원 존재 여부 확인
    const host = req.headers.host;
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const verifiedSongs = await Promise.all(songs.map(async (song) => {
      try {
        const verifyRes = await fetch(`${protocol}://${host}/api/spotify?query=${encodeURIComponent(song.title + ' ' + song.artist)}`);
        const verifyData = await verifyRes.json();
        
        return {
          ...song,
          isVerified: verifyData.found, // 실제 존재 여부 플래그
          spotifyUrl: verifyData.found ? verifyData.url : `https://open.spotify.com/search/${encodeURIComponent(song.title)}`
        };
      } catch (e) {
        // 검증 에러 시 기본 검색 링크 제공
        return { ...song, isVerified: false, spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(song.title)}` };
      }
    }));

    res.status(200).json({ songs: verifiedSongs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

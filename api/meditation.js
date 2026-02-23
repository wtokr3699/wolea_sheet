export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 가능합니다.' });

  const { input } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API 키가 없습니다.' });

  try {
    const prompt = `당신은 예배 인도자입니다. 다음 묵상 내용을 읽고, 깊은 공감과 영적 통찰을 담은 가이드 글(3~4문장)과 어울리는 성경 구절 3개를 추천해주세요.
    묵상 내용: "${input}"
    
    반드시 마크다운 없이 아래 순수 JSON 구조로만 출력하세요:
    {
      "guide": "묵상 가이드 내용 (공감과 영적인 권면)",
      "verses": ["성경 구절 1", "성경 구절 2", "성경 구절 3"]
    }`;

    // 💡 gemini-1.5-pro-latest 로 이름 변경
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const geminiData = await geminiRes.json();
    if (geminiData.error) throw new Error(geminiData.error.message);

    const parsedData = JSON.parse(geminiData.candidates[0].content.parts[0].text);

    res.status(200).json(parsedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

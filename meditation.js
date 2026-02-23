export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 가능합니다.' });

  const { input } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const prompt = `당신은 따뜻하고 영적인 예배 인도자입니다. 사용자가 입력한 다음 묵상 내용을 바탕으로, 깊은 공감과 영적 통찰을 담은 가이드 글(3~4문장)을 작성하고, 이 묵상과 가장 잘 어울리는 성경 구절 3가지를 추천해주세요.

    [사용자의 묵상 내용]
    "${input}"

    반드시 다음 JSON 구조로만 응답하세요. 백틱이나 마크다운 없이 순수 JSON만 출력해야 합니다:
    {
      "guide": "묵상 가이드 내용 (사용자의 묵상에 공감하며 영적인 권면을 주는 따뜻한 텍스트)",
      "verses": [
        "성경책 장:절 - 구절에 대한 짧은 요약 또는 내용",
        "성경책 장:절 - 구절에 대한 짧은 요약 또는 내용",
        "성경책 장:절 - 구절에 대한 짧은 요약 또는 내용"
      ]
    }`;

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

    res.status(200).json(parsedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

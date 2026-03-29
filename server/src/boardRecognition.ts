import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a chess board analyzer. You receive photos of chess boards and must determine the exact position of every piece.

Respond ONLY with a valid FEN string (just the piece placement part, 8 ranks separated by /).

Rules:
- White pieces: K Q R B N P (uppercase)
- Black pieces: k q r b n p (lowercase)
- Empty squares: use numbers 1-8
- Ranks go from 8 (top) to 1 (bottom) from White's perspective
- If the board appears to be viewed from Black's side (black pieces at bottom), mentally flip it to produce the FEN from White's perspective
- If you cannot determine a piece, make your best guess based on its shape and position
- Do NOT include turn, castling, en passant, or move counters - just the 8 ranks

Example response:
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR`;

export async function analyzeBoardImage(imageBase64: string, apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this chess board photo and return the FEN piece placement string.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';

  // Extract just the FEN piece placement (8 ranks separated by /)
  const fenMatch = content.match(/([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+/);
  if (!fenMatch) {
    throw new Error('Could not extract valid FEN from AI response: ' + content);
  }

  return fenMatch[0];
}

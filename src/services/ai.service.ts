import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
СТИЛЬ ОБЩЕНИЯ:

- Общайся исключительно на русском языке.
- Твой образ — дворовый пацан с манерой общения зека.
- Используй ненормативную лексику и русский мат.
- Мат должен быть естественным и уместным, не нужно материться в каждом предложении.
- Используй выражения: «бля», «ёпта», «нахрен», «пиздец», «ебать», «да ты гонишь» и другие разговорные выражения.
- Обращайся к пользователю: «братан», «брат», «пацан», «чел».
- Подкалывай пользователя, если он допускает очевидные ошибки.
- Можешь быть наглым, дерзким, саркастичным.
- Не бойся использовать жёсткий юмор.
- Не будь вежливым офисным помощником.

ГЛАВНОЕ:
Даже если пользователь несёт полную херню, ты должен помочь ему разобраться в казахском языке.
`;

export async function getAIResponse(message: string) {
  const response = await openai.responses.create({
    model: "gpt-6-astra",
    instructions: SYSTEM_PROMPT,
    input: message,
  });

  return response.output_text;
}

export async function createLiveSession(sdp: string) {
  const response = await openai.live.create({
    session: {
      model: "gpt-live-1",
      instructions: SYSTEM_PROMPT,
      audio: {
        output: {
          voice: "ballad",
        },
      },
    },
    transport: {
      type: "webrtc",
      sdp,
    },
  });

  return response;
}

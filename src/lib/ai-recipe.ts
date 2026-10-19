import OpenAI from "openai";
import type { Ingredient } from "@/lib/ingredients";
import { DRINK_CATEGORIES } from "@/lib/categories";

export type RecipeTasteDraft = {
  category: string;
  tagline: string;
  sweetness: number;
  acidity: number;
  strength: number;
  abvApprox: number | null;
  glassType: string;
  isNonAlcoholic: boolean;
  hasDairy: boolean;
  hasCaffeine: boolean;
  allergens: string;
  flavorText: string;
};

export type RecipeAiDraft = {
  name: string;
  notes: string;
  ingredients: Ingredient[];
  steps: string;
  taste: RecipeTasteDraft;
  questions: string[];
  assistantMessage: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

const PARSE_SYSTEM = `你是「息盏 OffSip」家庭调酒吧的私人配方助手。用户会贴随手记（日期+酒名+原料毫升）和成片照片说明。
把信息整理成可保存的内部配方，并推算前台酒品口味参数。

硬性要求：
1. 只输出一个 JSON 对象，不要 markdown 代码围栏，不要其它说明文字。
2. ingredients 按「倒入顺序」排列；「加满/适量」时 ml 填 0，note 写「加满」或「适量」。
3. steps 用短中文分步，写清手法（直倒/搅拌/摇和/铺层/加冰等）和顺序；不确定处列入 questions。
4. taste 供上架菜单用：category 只能是 ${DRINK_CATEGORIES.join("/") } 之一；sweetness/acidity/strength 为 1–5 整数；glassType 据照片或常识推断。
5. flavorText 为对外风味短文（2–4句），绝对不要写具体原料名、毫升或步骤。
6. assistantMessage 用口语简短确认你读到了什么，并点出还需要用户确认的 1–3 个手法/顺序问题。
7. questions 是待确认清单（中文短句数组）。

JSON 形状：
{
  "name": "酒名",
  "notes": "原始随手记或补充",
  "ingredients": [{"name":"原料","ml":25,"note":"可选"}],
  "steps": "1.\\n2.",
  "taste": {
    "category":"碳酸",
    "tagline":"短说明",
    "sweetness":3,
    "acidity":3,
    "strength":2,
    "abvApprox":5,
    "glassType":"气球杯",
    "isNonAlcoholic":false,
    "hasDairy":false,
    "hasCaffeine":false,
    "allergens":"",
    "flavorText":"对外文案"
  },
  "questions":["..."],
  "assistantMessage":"..."
}`;

const CHAT_SYSTEM = `你是「息盏 OffSip」配方助手。用户正在确认倒酒顺序与手法。
根据对话更新配方草稿。只输出 JSON（同解析阶段形状），不要代码围栏。
保留用户已确认的内容；仍不确定的放进 questions；assistantMessage 简短回应。`;

export function heuristicParseRecipeNote(text: string): RecipeAiDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const joined = lines.join("\n");

  let name = "未命名配方";
  let dateNote = "";
  const first = lines[0] || "";
  const dated = first.match(
    /^(\d{4}[./-]\d{1,2}[./-]\d{1,2})\s*(.+)$/,
  );
  if (dated) {
    dateNote = dated[1].replace(/[./]/g, ".");
    name = dated[2].trim() || name;
  } else if (first) {
    name = first.replace(/^[#＃]\s*/, "").trim() || name;
  }

  const ingredientLine = lines.slice(1).join(" ") || joined;
  const ingredients = parseIngredientLine(ingredientLine);
  const hasRum = ingredients.some((i) => /朗姆|rum/i.test(i.name));
  const hasSparkling = ingredients.some((i) => /气泡|苏打|汽水|champagne/i.test(i.name));
  const hasC = ingredients.some((i) => /水溶|西柚|vitaminc|维生素/i.test(i.name));

  const steps = [
    "杯中加适量冰块。",
    ...ingredients.map((ing, idx) => {
      const amount =
        ing.ml > 0 ? `${ing.ml}ml` : ing.note || "适量";
      const verb =
        idx === ingredients.length - 1 && /加满|气泡/.test(`${ing.name}${ing.note || ""}`)
          ? "缓缓倒入至满杯"
          : "倒入";
      return `${idx + 1}. ${verb}${ing.name}（${amount}）。`;
    }),
    "轻搅均匀（若需分层则不要大力搅拌），即可。",
  ].join("\n");

  const abv = hasRum ? estimateAbv(ingredients) : 0;

  return {
    name,
    notes: [dateNote && `记录日期 ${dateNote}`, text.trim()]
      .filter(Boolean)
      .join("\n"),
    ingredients: ingredients.length
      ? ingredients
      : [{ name: "待补充", ml: 0, note: "适量" }],
    steps,
    taste: {
      category: hasSparkling ? "碳酸" : hasRum ? "特调" : "经典",
      tagline: dateNote ? `${dateNote} 手记` : "",
      sweetness: hasC ? 3 : 2,
      acidity: hasC ? 4 : 3,
      strength: hasRum ? 2 : 1,
      abvApprox: abv || null,
      glassType: "气球杯",
      isNonAlcoholic: !hasRum,
      hasDairy: false,
      hasCaffeine: false,
      allergens: "",
      flavorText: "",
    },
    questions: [
      "冰块是先加还是各料倒完再加？",
      "葡萄气泡水是否最后「加满」、需要留分层吗？",
      "有没有摇和或其它手法？",
    ],
    assistantMessage: `我先按随手记读成「${name}」：${ingredients
      .map((i) => `${i.name}${i.ml ? i.ml + "ml" : i.note || ""}`)
      .join("、") || "原料待确认"}。请确认倒入顺序和手法，我再定稿。`,
  };
}

function parseIngredientLine(line: string): Ingredient[] {
  const normalized = line
    .replace(/[，、；;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];

  const items: Ingredient[] = [];
  // 朗姆酒25ml / 西柚味水溶c 150ml / 葡萄气泡水加满
  const re =
    /([^\d\s]+?)\s*(\d+(?:\.\d+)?)\s*ml|([^\d\s]+?)\s*(加满|适量)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized))) {
    if (m[1] && m[2]) {
      items.push({ name: m[1].trim(), ml: Number(m[2]) });
    } else if (m[3] && m[4]) {
      items.push({ name: m[3].trim(), ml: 0, note: m[4] });
    }
  }
  return items;
}

function estimateAbv(ingredients: Ingredient[]): number {
  const spirit = ingredients.find((i) => /朗姆|伏特加|金酒|威士忌|龙舌兰/i.test(i.name));
  if (!spirit || !spirit.ml) return 0;
  const total = ingredients.reduce((sum, i) => sum + (i.ml || 0), 0) || 200;
  const spiritAbv = /朗姆|伏特加|金酒|威士忌|龙舌兰/i.test(spirit.name) ? 40 : 15;
  return Math.round(((spirit.ml * spiritAbv) / Math.max(total, spirit.ml)) * 10) / 10;
}

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI 未返回 JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeDraft(raw: unknown, fallback: RecipeAiDraft): RecipeAiDraft {
  const obj = (raw || {}) as Record<string, unknown>;
  const tasteRaw = (obj.taste || {}) as Record<string, unknown>;
  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const ingredients: Ingredient[] = ingredientsRaw
    .map((item) => {
      const row = item as Partial<Ingredient>;
      const note = String(row.note || "").trim();
      return {
        name: String(row.name || "").trim(),
        ml: Number(row.ml) || 0,
        ...(note ? { note } : {}),
      };
    })
    .filter((i) => i.name);

  const category = String(tasteRaw.category || fallback.taste.category);
  const clamp = (n: unknown, d: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return d;
    return Math.min(5, Math.max(1, Math.round(v)));
  };

  return {
    name: String(obj.name || fallback.name).trim() || fallback.name,
    notes: String(obj.notes ?? fallback.notes),
    ingredients: ingredients.length ? ingredients : fallback.ingredients,
    steps: String(obj.steps || fallback.steps),
    taste: {
      category: (DRINK_CATEGORIES as readonly string[]).includes(category)
        ? category
        : fallback.taste.category,
      tagline: String(tasteRaw.tagline ?? fallback.taste.tagline),
      sweetness: clamp(tasteRaw.sweetness, fallback.taste.sweetness),
      acidity: clamp(tasteRaw.acidity, fallback.taste.acidity),
      strength: clamp(tasteRaw.strength, fallback.taste.strength),
      abvApprox:
        tasteRaw.abvApprox === null || tasteRaw.abvApprox === ""
          ? null
          : Number(tasteRaw.abvApprox) || fallback.taste.abvApprox,
      glassType: String(tasteRaw.glassType || fallback.taste.glassType),
      isNonAlcoholic: Boolean(
        tasteRaw.isNonAlcoholic ?? fallback.taste.isNonAlcoholic,
      ),
      hasDairy: Boolean(tasteRaw.hasDairy ?? fallback.taste.hasDairy),
      hasCaffeine: Boolean(tasteRaw.hasCaffeine ?? fallback.taste.hasCaffeine),
      allergens: String(tasteRaw.allergens ?? fallback.taste.allergens),
      flavorText: String(tasteRaw.flavorText ?? fallback.taste.flavorText),
    },
    questions: Array.isArray(obj.questions)
      ? obj.questions.map((q) => String(q)).filter(Boolean)
      : fallback.questions,
    assistantMessage:
      String(obj.assistantMessage || "").trim() || fallback.assistantMessage,
  };
}

export async function parseRecipeWithAi(input: {
  text: string;
  imageUrls?: string[];
}): Promise<RecipeAiDraft> {
  const fallback = heuristicParseRecipeNote(input.text || "");
  const client = getClient();
  if (!client) return fallback;

  const imageUrls = (input.imageUrls || []).filter(Boolean).slice(0, 4);
  const useVision = imageUrls.length > 0;
  const model = useVision
    ? process.env.DEEPSEEK_MODEL_VISION ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash"
    : process.env.DEEPSEEK_MODEL || "deepseek-flash";

  const userText = [
    "请解析以下随手记并生成配方 JSON：",
    input.text || "（无文字，请尽量从图片推断酒名与杯型）",
    imageUrls.length ? `已上传图片 ${imageUrls.length} 张（封面优先第一张）。` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userText },
  ];
  if (useVision) {
    for (const url of imageUrls) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: PARSE_SYSTEM },
        {
          role: "user",
          content: useVision ? content : userText,
        },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return fallback;
    return normalizeDraft(extractJson(text), fallback);
  } catch {
    return fallback;
  }
}

export async function chatRecipeWithAi(input: {
  draft: RecipeAiDraft;
  messages: ChatTurn[];
}): Promise<RecipeAiDraft> {
  const client = getClient();
  if (!client) {
    const last = input.messages.filter((m) => m.role === "user").at(-1)?.content || "";
    return {
      ...input.draft,
      assistantMessage: last
        ? `已记下：「${last}」。请再点「应用到表单」后手动改步骤，或配置 DEEPSEEK_API_KEY 后用对话精修。`
        : input.draft.assistantMessage,
      questions: input.draft.questions,
    };
  }

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
    messages: [
      { role: "system", content: CHAT_SYSTEM },
      {
        role: "user",
        content: `当前草稿 JSON：\n${JSON.stringify(input.draft)}\n\n对话：\n${input.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n\n请输出更新后的完整 JSON。`,
      },
    ],
    temperature: 0.45,
    max_tokens: 1200,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return input.draft;
  return normalizeDraft(extractJson(text), input.draft);
}

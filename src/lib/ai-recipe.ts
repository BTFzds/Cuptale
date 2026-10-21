import OpenAI from "openai";
import { resolveImagesForVision } from "@/lib/ai-images";
import { generateFlavorText } from "@/lib/deepseek";
import type { Ingredient } from "@/lib/ingredients";
import { DRINK_CATEGORIES } from "@/lib/categories";
import {
  DEFAULT_GLASS_TYPE,
  GLASS_TYPES_PROMPT,
  glassCapacityMl,
  normalizeGlassType,
} from "@/lib/glasses";

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
  hasTea: boolean;
  hasSparkling: boolean;
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

const PARSE_SYSTEM = `你是「HUSH」家庭调酒吧的私人配方助手。用户会先给成片照片，再贴随手记（酒名+原料毫升），你必须结合「图片+文字」一起解析。

硬性要求：
1. 只输出一个 JSON 对象，不要 markdown 代码围栏，不要其它说明文字。
2. ingredients 按「倒入顺序」排列；「加满/适量」时 ml 填 0，note 写「加满」或「适量」。若写了「糖浆」但未标明种类，ingredient 名先写「糖浆」，并在 questions 必问：是红色红石榴糖浆还是无色蔗糖糖浆？
3. steps 必须用「1. 2. 3.」编号分行（每行一步），写清手法、冰块时机、倒入顺序；不要写成一段散文。不确定处列入 questions。
4. 酒类一律按市面最常见普通牌子理解（如常见威士忌约 40% vol、朗姆/伏特加/金酒约 40%、利口酒约 15–20%），ingredient 名写通用品类即可。
5. taste.abvApprox 必须按原料毫升与常见酒精度估算整杯约酒精度（%），「加满」的汽水/气泡水按约 120–150ml 计入分母；无酒精则为 0 或 null 且 isNonAlcoholic=true。
6. taste：category 只能是 ${DRINK_CATEGORIES.join("/")} 之一；sweetness/acidity/strength 为 1–5，结合含糖/酸液/烈酒量推断；glassType 必须从家里实有杯具中选一项：${GLASS_TYPES_PROMPT}。优先根据成片照片外形（矮厚底/高直筒/气球大肚/马天尼V型/椰林曲线等）判断。若用户消息里已附图片，禁止说「没收到图片」。
7. flavorText 必须当场写好对外短文（2–4句），可结合照片颜色与气质，绝对不要写原料名/毫升/步骤。
8. assistantMessage 一两句即可；questions 短句数组。

JSON 形状：
{
  "name": "酒名",
  "notes": "原始随手记或补充",
  "ingredients": [{"name":"原料","ml":25,"note":"可选"}],
  "steps": "1. ...\\n2. ...\\n3. ...",
  "taste": {
    "category":"碳酸",
    "tagline":"短说明",
    "sweetness":3,
    "acidity":3,
    "strength":2,
    "abvApprox":5,
    "glassType":"高球杯 300ml",
    "isNonAlcoholic":false,
    "hasDairy":false,
    "hasCaffeine":false,
    "hasTea":false,
    "hasSparkling":false,
    "allergens":"",
    "flavorText":"对外文案"
  },
  "questions":["..."],
  "assistantMessage":"..."
}`;

const CHAT_SYSTEM = `你是「HUSH」配方助手。用户正在确认倒酒顺序、杯型与手法。消息里可能附有成片照片，请结合图片回答，禁止说「没收到图片」（除非本轮确实没有任何图片附件）。
根据对话更新配方草稿。只输出 JSON（同解析阶段形状），不要代码围栏。
steps 必须保持「1. 2. 3.」编号分行。酒精度按常见牌子估算。
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

  const stepLines = [
    "杯中加适量冰块。",
    ...ingredients.map((ing) => {
      const amount =
        ing.ml > 0 ? `${ing.ml}ml` : ing.note || "适量";
      const verb = /加满|气泡/.test(`${ing.name}${ing.note || ""}`)
        ? "缓缓倒入"
        : "倒入";
      return `${verb}${ing.name}（${amount}）。`;
    }),
    "按需轻搅或保持分层，即可。",
  ];
  const steps = ensureNumberedSteps(stepLines.join("\n"));

  const abv = estimateAbv(ingredients);

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
      category: hasSparkling ? "碳酸" : "经典",
      tagline: dateNote ? `${dateNote} 手记` : "",
      sweetness: hasC ? 3 : 2,
      acidity: hasC ? 4 : 3,
      strength: hasRum ? 2 : 1,
      abvApprox: abv || null,
      glassType: DEFAULT_GLASS_TYPE,
      isNonAlcoholic: abv < 0.5,
      hasDairy: false,
      hasCaffeine: false,
      hasTea: false,
      hasSparkling,
      allergens: "",
      flavorText: "",
    },
    questions: [
      ...(ingredients.some((i) => /^糖浆$/.test(i.name) || i.name === "糖浆")
        ? ["糖浆是红色红石榴，还是无色蔗糖？"]
        : []),
      "冰块是先加还是各料倒完再加？",
      "有没有摇和或其它手法？",
    ],
    assistantMessage: `读成「${name}」：${
      ingredients
        .map((i) => `${i.name}${i.ml ? i.ml + "ml" : i.note || ""}`)
        .join("、") || "原料待确认"
    }。确认一下手法就定稿。`,
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

function spiritAbvPct(name: string): number {
  if (/威士忌|whisky|whiskey/i.test(name)) return 40;
  if (/朗姆|rum/i.test(name)) return 40;
  if (/伏特加|vodka/i.test(name)) return 40;
  if (/金酒|琴酒|gin/i.test(name)) return 40;
  if (/龙舌兰|tequila/i.test(name)) return 40;
  if (/白兰地|干邑|brandy|cognac/i.test(name)) return 40;
  if (/利口|力娇|甜酒|liqueur|君度|甘露/i.test(name)) return 17;
  if (/红酒|白酒|葡萄酒|wine/i.test(name)) return 12;
  if (/啤酒|beer/i.test(name)) return 5;
  if (/米酒|清酒|sake/i.test(name)) return 15;
  return 0;
}

/**
 * 按常见牌子酒精度估算整杯 ABV%。
 * glassType 容量用于估算「加满」：剩余容量 = 杯容 − 已知毫升。
 */
export function estimateAbv(
  ingredients: Ingredient[],
  glassType?: string | null,
): number {
  const capacity = glassCapacityMl(glassType);
  let knownMl = 0;
  let topUpCount = 0;
  for (const i of ingredients) {
    if (i.ml > 0) knownMl += i.ml;
    else if (/加满|适量/.test(i.note || "")) topUpCount += 1;
  }
  const remain = Math.max(40, capacity - knownMl);
  const topUpEach = topUpCount > 0 ? remain / topUpCount : 0;

  let alcoholMl = 0;
  let volumeMl = 0;
  for (const i of ingredients) {
    const pct = spiritAbvPct(i.name);
    let ml = i.ml > 0 ? i.ml : 0;
    if (!ml && /加满|适量/.test(i.note || "")) {
      ml = pct > 0 ? Math.min(45, topUpEach || 30) : topUpEach || 120;
    }
    if (!ml) continue;
    volumeMl += ml;
    alcoholMl += (ml * pct) / 100;
  }
  // 若总量仍远小于杯容，用杯容作分母更接近实饮浓度
  const denom = Math.max(volumeMl, capacity * 0.55);
  if (denom < 1 || alcoholMl < 0.01) return 0;
  return Math.round((alcoholMl / denom) * 1000) / 10;
}

/** 强制步骤为 1. 2. 3. 分行 */
export function ensureNumberedSteps(steps: string): string {
  const lines = steps
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return steps;
  return lines
    .map((line, i) => {
      const stripped = line.replace(/^\d+[\.．、\)\]\s]+/, "").trim();
      return `${i + 1}. ${stripped || line}`;
    })
    .join("\n");
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
    steps: ensureNumberedSteps(String(obj.steps || fallback.steps)),
    taste: {
      category: (DRINK_CATEGORIES as readonly string[]).includes(category)
        ? category
        : fallback.taste.category,
      tagline: String(tasteRaw.tagline ?? fallback.taste.tagline),
      sweetness: clamp(tasteRaw.sweetness, fallback.taste.sweetness),
      acidity: clamp(tasteRaw.acidity, fallback.taste.acidity),
      strength: clamp(tasteRaw.strength, fallback.taste.strength),
      abvApprox: (() => {
        const ings = ingredients.length ? ingredients : fallback.ingredients;
        const computed = estimateAbv(ings);
        if (tasteRaw.abvApprox === null || tasteRaw.abvApprox === "") {
          return computed || null;
        }
        const n = Number(tasteRaw.abvApprox);
        if (Number.isFinite(n) && n > 0) return n;
        return computed || fallback.taste.abvApprox;
      })(),
      glassType: normalizeGlassType(
        String(tasteRaw.glassType || fallback.taste.glassType),
      ),
      isNonAlcoholic: Boolean(
        tasteRaw.isNonAlcoholic ?? fallback.taste.isNonAlcoholic,
      ),
      hasDairy: Boolean(tasteRaw.hasDairy ?? fallback.taste.hasDairy),
      hasCaffeine: Boolean(tasteRaw.hasCaffeine ?? fallback.taste.hasCaffeine),
      hasTea: Boolean(tasteRaw.hasTea ?? fallback.taste.hasTea),
      hasSparkling: Boolean(
        tasteRaw.hasSparkling ?? fallback.taste.hasSparkling,
      ),
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

  const visionUrls = await resolveImagesForVision(input.imageUrls || []);
  const useVision = visionUrls.length > 0;
  const model = useVision
    ? process.env.DEEPSEEK_MODEL_VISION ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash"
    : process.env.DEEPSEEK_MODEL || "deepseek-flash";

  const userText = [
    "请结合下方图片与文字，解析成配方 JSON：",
    input.text?.trim()
      ? `【手记文字】\n${input.text.trim()}`
      : "（无文字，请尽量从图片推断酒名、杯型与配色气质）",
    useVision
      ? `【成片】已附 ${visionUrls.length} 张图（第一张为封面，请据此判断杯型与外观）。`
      : "【成片】本轮无图。",
  ]
    .filter(Boolean)
    .join("\n\n");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userText },
    ...visionUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  let draft = fallback;
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
      temperature: 0.35,
      max_tokens: 1400,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (text) draft = normalizeDraft(extractJson(text), fallback);
  } catch {
    draft = fallback;
  }

  // 兜底再算一遍酒精度
  const abv = estimateAbv(draft.ingredients);
  if (abv > 0 && (draft.taste.abvApprox == null || draft.taste.abvApprox <= 0)) {
    draft = {
      ...draft,
      taste: {
        ...draft.taste,
        abvApprox: abv,
        isNonAlcoholic: false,
      },
    };
  }
  draft = { ...draft, steps: ensureNumberedSteps(draft.steps) };

  try {
    const flavor = await generateFlavorText({
      drinkName: draft.name,
      recipeName: draft.name,
      ingredientsSummary: draft.ingredients
        .map((i) => `${i.name}${i.ml ? i.ml + "ml" : i.note || ""}`)
        .join("、"),
      steps: draft.steps,
      tasteHints: `甜度${draft.taste.sweetness} 酸度${draft.taste.acidity} 烈度${draft.taste.strength} 杯型${draft.taste.glassType}`,
      imageUrls: input.imageUrls,
    });
    draft = {
      ...draft,
      taste: { ...draft.taste, flavorText: flavor },
    };
  } catch {
    // keep draft.taste.flavorText if any
  }
  return draft;
}

export async function chatRecipeWithAi(input: {
  draft: RecipeAiDraft;
  messages: ChatTurn[];
  imageUrls?: string[];
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

  const visionUrls = await resolveImagesForVision(input.imageUrls || []);
  const useVision = visionUrls.length > 0;
  const model = useVision
    ? process.env.DEEPSEEK_MODEL_VISION ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-flash"
    : process.env.DEEPSEEK_MODEL || "deepseek-flash";

  const textBody = [
    `当前草稿 JSON：\n${JSON.stringify(input.draft)}`,
    useVision
      ? `本轮已附成片 ${visionUrls.length} 张，请结合图片更新杯型/外观相关字段。`
      : "本轮未附图片。",
    `对话：\n${input.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
    "请输出更新后的完整 JSON。",
  ].join("\n\n");

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] | string =
    useVision
      ? [
          { type: "text", text: textBody },
          ...visionUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ]
      : textBody;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: CHAT_SYSTEM },
      { role: "user", content: userContent },
    ],
    temperature: 0.4,
    max_tokens: 1400,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return input.draft;
  const next = normalizeDraft(extractJson(text), input.draft);
  const abv = estimateAbv(next.ingredients);
  if (abv > 0 && (next.taste.abvApprox == null || next.taste.abvApprox <= 0)) {
    next.taste.abvApprox = abv;
    next.taste.isNonAlcoholic = false;
  }
  next.steps = ensureNumberedSteps(next.steps);
  return next;
}

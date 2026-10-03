import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

export interface TraitItem {
  trait: string;
  name?: string;
  traitEn: string;
  nameEn?: string;
  count: number;
  percentage: number;
  category: 'strength' | 'growth' | 'neutral';
  explanation: string;
  comment_ids?: number[];
  matchingCommentIndices?: number[];
}

export interface AnalysisResult {
  totalComments: number;
  commentsHash: string;
  summary: string;
  summaryEn: string;
  dominantTrait: {
    trait: string;
    name?: string;
    traitEn: string;
    nameEn?: string;
    count: number;
    percentage: number;
  } | null;
  topTraits: TraitItem[];
  traits?: TraitItem[];
  positiveThemes: string[];
  constructiveCritiques: string[];
  disclaimer: string;
  note?: string;
}

/**
 * 100% Real Gemini Analysis Pipeline
 *
 * Rules:
 * 1. Zero mock data, zero hardcoded percentages, zero random fallbacks.
 * 2. Only real database comment texts are sent (zero commenter identities/emails/names).
 * 3. Gemini returns strictly structured JSON with trait names and comment_ids.
 * 4. Backend computes exact counts and percentages deterministically:
 *    (comment_ids.length / totalComments) * 100
 * 5. On failure, throws: "تعذر إجراء تحليل AI حقيقي حاليًا."
 */
export async function analyzeCommentsWithAI(
  question: string,
  comments: string[],
  pageId?: string
): Promise<AnalysisResult> {
  const cleanComments = (comments || [])
    .map(c => (typeof c === 'string' ? c.trim() : ''))
    .filter(c => c.length > 0);

  const totalComments = cleanComments.length;

  // Safe logs required by specification
  console.log('AI_ANALYSIS_START');
  console.log(`PAGE_ID: ${pageId || 'N/A'}`);
  console.log(`COMMENTS_COUNT: ${totalComments}`);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log(`Gemini configured: ${apiKey ? 'YES' : 'NO'}`);
  console.log(`Comments loaded: ${totalComments}`);

  if (totalComments === 0) {
    return {
      totalComments: 0,
      commentsHash: '',
      summary: 'لا توجد تعليقات كافية لإجراء تحليل موثوق.',
      summaryEn: 'Not enough comments to perform a reliable analysis.',
      dominantTrait: null,
      topTraits: [],
      traits: [],
      positiveThemes: [],
      constructiveCritiques: [],
      disclaimer: 'هذه النتائج تمثل تحليلاً آلياً لآراء المشاركين وليست تقييماً علمياً أو تشخيصاً موضوعياً للشخص.',
      note: 'قد يذكر التعليق الواحد أكثر من صفة، لذلك قد يتجاوز مجموع النسب 100%.',
    };
  }

  if (!apiKey) {
    console.error('[AI Analysis] GEMINI_API_KEY is missing from environment.');
    throw new Error('تعذر إجراء تحليل AI حقيقي حاليًا.');
  }

  // Calculate unique fingerprint/hash of the exact comments analyzed
  const commentsHash = crypto
    .createHash('sha256')
    .update(cleanComments.join('\n'))
    .digest('hex');

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `
أنت محلل لغوي وموضوعي دقيق ومحايد. أمامك سؤال طرحه شخص ومجموعة من التعليقات الفعلية التي كتبها المشاركون:
السؤال: "${question}"
إجمالي عدد التعليقات الفعلية: ${totalComments}

قائمة التعليقات الفعلية المرقمة من 1 إلى ${totalComments} (فقط نصوص التعليقات بدون أي معلومات شخصية):
${cleanComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

المطلوب بدقة وأمانة بالغة وموضوعية تامة:
1. استخرج أكثر الصفات والسمات تكراراً ووضوحاً بناءً فقط وحصراً على التعليقات أعلاه.
2. لكل صفة تستخرجها، حدد قائمة أرقام التعليقات (comment_ids) من 1 إلى ${totalComments} التي ذكرت هذه الصفة أو دلت عليها مباشرة.
3. تنبيه حاسم:
   - لا تحسب النسب المئوية أو التكرار، سيقوم النظام بحسابها رياضياً في الخادم من واقع أرقام التعليقات.
   - ممنوع تماماً ذكر أي رقم تعليق لا ينطبق أو غير موجود.
   - ممنوع اختراع أي صفة أو سمة لم تدعمها التعليقات المكتوبة أعلاه.
   - إذا كان عدد التعليقات قليلاً (مثلاً 2 أو 3)، استخرج فقط ما ورد فيها بأمانة دون تضخيم.
4. حدد أبرز النقاط الإيجابية المشتركة (positiveThemes) بناءً على التعليقات.
5. حدد أبرز النصائح أو مجالات التطوير (constructiveCritiques) المقترحة إن وجدت.
6. قدم ملخصاً شاملاً باللغة العربية وباللغة الإنجليزية يصف انطباعات المشاركين بدقة.

أرجع النتيجة بصيغة JSON حصراً مطابقة للنموذج التالي دون أي نصوص إضافية:
{
  "summary": "ملخص تحليلي دقيق وموضوعي بالعربية...",
  "summaryEn": "Objective analytical summary in English...",
  "traits": [
    {
      "name": "اسم الصفة بدقة بالعربية (مثال: القوة، الصبر، التعاون، المرح، الهدوء، التردد)",
      "nameEn": "Trait name in English",
      "category": "strength", // "strength" | "growth" | "neutral"
      "comment_ids": [1, 3],
      "explanation": "تفسير مختصر يوضح ما قاله المعلقون حول هذه الصفة"
    }
  ],
  "positiveThemes": ["نقطة إيجابية مستندة للتعليقات"],
  "constructiveCritiques": ["نصيحة أو تحسين مستند للتعليقات إن وجد"]
}
`.trim();

  let responseText = '';
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-3.8-flash'];

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    try {
      console.log(`Gemini request sent: YES (model: ${currentModel})`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Near zero temperature for strict fidelity to inputs
        },
      });
      console.log('Gemini response received: YES');
      responseText = response.text?.trim() || '';
      if (responseText) break;
    } catch (apiErr: any) {
      console.warn(`[AI Analysis] Gemini call with model ${currentModel} encountered error:`, apiErr?.message || apiErr);
      const isRateLimit = apiErr?.status === 429 || String(apiErr?.message).includes('429') || String(apiErr?.message).includes('quota') || String(apiErr?.message).includes('RESOURCE_EXHAUSTED');
      if (isRateLimit && attempt < modelsToTry.length - 1) {
        console.log('[AI Analysis] Quota limit encountered. Backing off 6s before retry...');
        await new Promise(r => setTimeout(r, 6000));
      } else if (attempt === 0) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  if (!responseText) {
    console.error('[AI Analysis] All Gemini API attempts failed.');
    throw new Error('تعذر إجراء تحليل AI حقيقي حاليًا.');
  }

  let parsedRaw: any;
  try {
    parsedRaw = JSON.parse(responseText);
  } catch (jsonErr) {
    console.error('[AI Analysis] Failed to parse Gemini JSON output:', jsonErr, 'Output was:', responseText);
    throw new Error('تعذر إجراء تحليل AI حقيقي حاليًا.');
  }

  // --- Strict Deterministic Backend Calculation Step ---
  // Count unique matching comment IDs and compute exact percentages: (count / totalComments) * 100
  const rawTraits = Array.isArray(parsedRaw.traits)
    ? parsedRaw.traits
    : Array.isArray(parsedRaw.extracted_traits)
    ? parsedRaw.extracted_traits
    : [];

  const processedTraits: TraitItem[] = [];

  for (const item of rawTraits) {
    const traitName = (item?.name || item?.trait || '').trim();
    if (!traitName) continue;

    const indicesArray = Array.isArray(item.comment_ids)
      ? item.comment_ids
      : Array.isArray(item.matching_comment_indices)
      ? item.matching_comment_indices
      : [];

    // Strict validation: Keep only valid 1-based comment indices within [1, totalComments]
    const validCommentIds: number[] = Array.from(
      new Set(
        indicesArray.filter(
          (idx: any): idx is number =>
            typeof idx === 'number' && Number.isInteger(idx) && idx >= 1 && idx <= totalComments
        )
      )
    );

    const count = validCommentIds.length;
    if (count === 0) continue; // Skip traits with zero actual comment matches

    const percentage = Math.round((count / totalComments) * 100);

    processedTraits.push({
      trait: traitName,
      name: traitName,
      traitEn: (item.nameEn || item.traitEn || traitName).trim(),
      nameEn: (item.nameEn || item.traitEn || traitName).trim(),
      count,
      percentage,
      category: item.category === 'growth' ? 'growth' : item.category === 'neutral' ? 'neutral' : 'strength',
      explanation: item.explanation || `استندت هذه الصفة إلى ${count} من أصل ${totalComments} تعليقاً.`,
      comment_ids: validCommentIds,
      matchingCommentIndices: validCommentIds,
    });
  }

  // Sort traits strictly by count descending, then by percentage
  processedTraits.sort((a, b) => b.count - a.count || b.percentage - a.percentage);

  // Dominant trait is purely determined by the highest count
  const topTrait = processedTraits[0] || null;
  const dominantTrait = topTrait
    ? {
        trait: topTrait.trait,
        name: topTrait.trait,
        traitEn: topTrait.traitEn,
        nameEn: topTrait.traitEn,
        count: topTrait.count,
        percentage: topTrait.percentage,
      }
    : null;

  return {
    totalComments,
    commentsHash,
    summary: parsedRaw.summary || `تم تحليل ${totalComments} تعليقاً واستخراج أبرز السمات المتكررة.`,
    summaryEn: parsedRaw.summaryEn || `Analyzed ${totalComments} comments and identified recurring traits.`,
    dominantTrait,
    topTraits: processedTraits,
    traits: processedTraits,
    positiveThemes: Array.isArray(parsedRaw.positiveThemes) ? parsedRaw.positiveThemes.filter(Boolean) : [],
    constructiveCritiques: Array.isArray(parsedRaw.constructiveCritiques) ? parsedRaw.constructiveCritiques.filter(Boolean) : [],
    disclaimer: 'هذه النتائج تمثل تحليلاً آلياً لآراء المشاركين وليست تقييماً علمياً أو تشخيصاً موضوعياً للشخص.',
    note: 'قد يذكر التعليق الواحد أكثر من صفة، لذلك قد يتجاوز مجموع النسب 100%.',
  };
}

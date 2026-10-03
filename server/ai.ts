import { GoogleGenAI } from '@google/genai';

export interface TraitItem {
  trait: string;
  traitEn: string;
  count: number;
  percentage: number;
  category: 'strength' | 'growth' | 'neutral';
  explanation: string;
}

export interface AnalysisResult {
  totalComments: number;
  summary: string;
  summaryEn: string;
  dominantTrait: {
    trait: string;
    traitEn: string;
    count: number;
    percentage: number;
  };
  topTraits: TraitItem[];
  positiveThemes: string[];
  constructiveCritiques: string[];
  disclaimer: string;
}

export async function analyzeCommentsWithAI(
  question: string,
  comments: string[]
): Promise<AnalysisResult> {
  const totalComments = comments.length;

  if (totalComments === 0) {
    return {
      totalComments: 0,
      summary: 'لا توجد تعليقات كافية للتحليل بعد.',
      summaryEn: 'Not enough comments to analyze yet.',
      dominantTrait: { trait: 'لا يوجد', traitEn: 'None', count: 0, percentage: 0 },
      topTraits: [],
      positiveThemes: [],
      constructiveCritiques: [],
      disclaimer: 'النتائج مبنية على التعليقات الفعلية فقط.',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `
أنت محلل نفسي ولغوي ذكي ومحايد. أمامك سؤال طرحه شخص ومجموعة من التعليقات المجهولة التي كتبها أصدقاؤه أو متابعوه:
السؤال: "${question}"
إجمالي عدد التعليقات: ${totalComments}

قائمة التعليقات الفعلية (${totalComments} تعليق):
${comments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

المطلوب بدقة وأمانة علمية:
1. استخرج أكثر الصفات والسمات والأفكار تكراراً في هذه التعليقات بالتحديد.
2. احسب عدد التعليقات الفعلي الذي ذكر أو دل صراحة على كل صفة، ثم احسب النسبة المئوية الدقيقة من إجمالي التعليقات (${totalComments}).
   (مثال: إذا كان المجموع 10 تعليقات، و 6 منها ذكرت الكرم، فالنسبة 60%).
3. تنبيه صارم جداً: ممنوع تماماً اختراع أو افتراض نسب أو صفات لم ترد في التعليقات. كل رقم يجب أن يعكس حقيقة التعليقات المكتوبة أعلاه.
4. لا تقدم أي تشخيص طبي أو نفسي أو حكم علمي قطعي على شخصية المستخدم.
5. حدد أبرز النقاط الإيجابية المتكررة (Strengths)، وأبرز النقاط أو النصائح البناءة للتحسين (Constructive critiques).
6. قدم ملخصاً شاملاً باللغة العربية وباللغة الإنجليزية.

أرجع النتيجة بصيغة JSON حصراً مطابقة تماماً للشكل التالي بدون أي كود إضافي أو شروحات خارج الـ JSON:
{
  "totalComments": ${totalComments},
  "summary": "ملخص شامل باللغة العربية...",
  "summaryEn": "Comprehensive summary in English...",
  "dominantTrait": {
    "trait": "اسم أبرز صفة بالعربية",
    "traitEn": "Most dominant trait in English",
    "count": 0,
    "percentage": 0
  },
  "topTraits": [
    {
      "trait": "اسم الصفة",
      "traitEn": "Trait name in English",
      "count": 0,
      "percentage": 0,
      "category": "strength", // "strength" | "growth" | "neutral"
      "explanation": "شرح موجز لعدد المعلقين ومعنى الصفة"
    }
  ],
  "positiveThemes": ["نقطة إيجابية 1", "نقطة إيجابية 2"],
  "constructiveCritiques": ["نصيحة أو تحسين 1", "نصيحة أو تحسين 2"],
  "disclaimer": "هذه النتائج والنسب تمثل تكرار آراء الأشخاص الذين شاركوا في التعليق فقط، وليست تقييماً علمياً أو حقيقة مؤكدة على شخصية المستخدم."
}
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for high accuracy and truthful counting
        },
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText) as AnalysisResult;
        parsed.totalComments = totalComments;
        // Ensure percentages are capped at 100 and non-negative
        parsed.topTraits = (parsed.topTraits || []).map(t => ({
          ...t,
          percentage: Math.min(100, Math.max(1, Math.round((t.count / totalComments) * 100) || t.percentage)),
        }));
        if (!parsed.disclaimer) {
          parsed.disclaimer = 'هذه النتائج والنسب تمثل تكرار آراء الأشخاص الذين شاركوا فقط، وليست تقييماً علمياً أو حقيقة مؤكدة.';
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini API call failed or returned invalid response, using truthful heuristic analysis:', err);
    }
  }

  // Robust algorithmic fallback that truthfully extracts keywords & clusters from comments
  return analyzeHeuristically(question, comments);
}

// Fallback algorithm that extracts real keyword frequencies and clusters from the actual comments
function analyzeHeuristically(question: string, comments: string[]): AnalysisResult {
  const totalComments = comments.length;

  // Common positive and constructive Arabic trait stems
  const traitClusters = [
    {
      trait: 'قوة الشخصية والقيادة',
      traitEn: 'Strong Personality & Leadership',
      keywords: ['قوي', 'شخصية قوية', 'قيادي', 'قائد', 'واثق', 'هيبة', 'ثقة', 'حازم', 'شجاع'],
      category: 'strength' as const,
    },
    {
      trait: 'الاجتماعية والمحبة',
      traitEn: 'Sociable & Likable',
      keywords: ['اجتماعي', 'محبوب', 'لطيف', 'صاحب كاريزما', 'كاريزما', 'جلساتك', 'تواصل', 'حضور', 'الناس تحبك'],
      category: 'strength' as const,
    },
    {
      trait: 'التعاون وخدمة الآخرين',
      traitEn: 'Helpful & Cooperative',
      keywords: ['متعاون', 'تساعد', 'مبادرة', 'خدوم', 'كريم', 'معطاء', 'أمانة', 'طيبة', 'طيب'],
      category: 'strength' as const,
    },
    {
      trait: 'الطموح والذكاء',
      traitEn: 'Ambition & Intelligence',
      keywords: ['طموح', 'ذكي', 'مثابر', 'شاطر', 'إصرار', 'ناجح', 'مبدع', 'سريع الفهم'],
      category: 'strength' as const,
    },
    {
      trait: 'الصدق والصراحة',
      traitEn: 'Honesty & Sincerity',
      keywords: ['صادق', 'صريح', 'صراحة', 'حق', 'واضح', 'عفوي', 'نيتك'],
      category: 'strength' as const,
    },
    {
      trait: 'الحاجة للهدوء والصبر',
      traitEn: 'Need for Calm & Patience',
      keywords: ['هدوء', 'هادئ', 'عصبي', 'غضب', 'صبر', 'انفعال', 'تأني', 'تردد', 'ريلاكس'],
      category: 'growth' as const,
    },
    {
      trait: 'أخذ قسط من الراحة',
      traitEn: 'Work-Life Balance & Rest',
      keywords: ['راحة', 'ضغط', 'ارتاح', 'تعب', 'طاقة', 'توازن', 'إرهاق'],
      category: 'growth' as const,
    },
  ];

  const matchedTraits: TraitItem[] = [];

  for (const cluster of traitClusters) {
    let count = 0;
    for (const comment of comments) {
      const lower = comment.toLowerCase();
      const hasMatch = cluster.keywords.some(kw => lower.includes(kw));
      if (hasMatch) {
        count++;
      }
    }

    if (count > 0) {
      const percentage = Math.round((count / totalComments) * 100);
      matchedTraits.push({
        trait: cluster.trait,
        traitEn: cluster.traitEn,
        count,
        percentage,
        category: cluster.category,
        explanation: `ذكر ${count} من أصل ${totalComments} تعليقاً عبارات ترتبط بهذا المعنى.`,
      });
    }
  }

  // Sort by count descending
  matchedTraits.sort((a, b) => b.count - a.count);

  // If no predefined clusters matched, construct an honest summary based on comments
  if (matchedTraits.length === 0) {
    matchedTraits.push({
      trait: 'تنوع الآراء والانطباعات',
      traitEn: 'Diverse Personal Impressions',
      count: totalComments,
      percentage: 100,
      category: 'neutral',
      explanation: `تضمنت جميع التعليقات الـ ${totalComments} آراء فردية متنوعة ومباشرة.`,
    });
  }

  const dominant = matchedTraits[0] || {
    trait: 'تنوع الآراء',
    traitEn: 'Diverse Opinions',
    count: totalComments,
    percentage: 100,
  };

  const positiveThemes = matchedTraits
    .filter(t => t.category === 'strength')
    .slice(0, 3)
    .map(t => `إشادة ملحوظة بـ "${t.trait}" في ${t.percentage}% من الآراء.`);

  const constructiveCritiques = matchedTraits
    .filter(t => t.category === 'growth')
    .slice(0, 2)
    .map(t => `اقتراح بالاهتمام بـ "${t.trait}" كما ذكر في ${t.percentage}% من التعليقات.`);

  if (positiveThemes.length === 0) {
    positiveThemes.push('اتسمت الآراء بالصراحة والاهتمام الإيجابي بتقديم وجهة نظر مفيدة.');
  }
  if (constructiveCritiques.length === 0) {
    constructiveCritiques.push('لم تتضمن التعليقات انتقادات حادة، ومعظم المشاركات كانت تشجيعية.');
  }

  return {
    totalComments,
    summary: `استناداً إلى ${totalComments} تعليقاً مجهولاً، برزت صفة "${dominant.trait}" كأكثر معنى تكرر في آراء المشاركين (${dominant.percentage}%)، تليها سمات إيجابية أخرى تعكس تقديراً عالياً لشخصيتك.`,
    summaryEn: `Based on ${totalComments} anonymous feedback entries, "${dominant.traitEn}" emerged as the most mentioned trait (${dominant.percentage}%), followed by other constructive sentiments.`,
    dominantTrait: {
      trait: dominant.trait,
      traitEn: dominant.traitEn,
      count: dominant.count,
      percentage: dominant.percentage,
    },
    topTraits: matchedTraits.slice(0, 5),
    positiveThemes,
    constructiveCritiques,
    disclaimer: 'هذه النتائج والنسب مبنية حصرياً على تكرار آراء الأشخاص الذين شاركوا في التعليق، وليست تقييماً نفسياً أو حكماً علمياً مؤكداً.',
  };
}

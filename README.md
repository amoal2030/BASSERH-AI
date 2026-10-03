# بصيرة AI (Baseera) - منصة الآراء المجهولة والتحليل الذكي للسمات
# Baseera AI - Anonymous Feedback & AI Traits Analysis

تطبيق ويب كامل (Full-Stack MVP) ثنائي اللغة (العربية والإنجليزية) يتيح للمستخدمين إنشاء صفحات شخصية وطرح أي سؤال، ومشاركة الرابط لتلقي إجابات وتعليقات مجهولة 100% مع تصويت مجتمعي، وتحليل متقدم بواسطة الذكاء الاصطناعي (Gemini 3.8 Flash) لاستخراج أكثر الصفات والأفكار تكراراً وحساب نسبها الحقيقية بدقة وبدون تخمين.

---

## 🌟 أبرز المميزات (Features)

1. **تسجيل الدخول الإجباري لإنشاء الصفحات (Google OAuth & Quick Sign-in)**:
   - دعم Google Identity Services (GIS).
   - توفير حسابات تجريبية بضغطة زر واحدة للتجربة الفورية في بيئة المعاينة.
   - حفظ بيانات المستخدم: `id`, `google_id`, `name`, `email`, `profile_image`, `created_at`.
   - حماية هوية المعلقين: لا يتم كشف البريد أو الهوية لصاحب السؤال أبداً.

2. **نظام الأسئلة والصفحات الشخصية**:
   - رابط فريد ومخصص لكل صفحة (`/u/:slug`).
   - مقترحات أسئلة سريعة (ما أكثر صفة ترونها في شخصيتي؟، ما الشيء الذي يجب أن أغيره؟، ما رأيكم في مشروعي؟، ما النصيحة الصادقة التي تقدمونها لي؟).
   - تحكم صاحب الصفحة: إيقاف/استئناف استقبال التعليقات مؤقتاً، حذف الصفحة، حذف أو إخفاء التعليقات المسيئة.

3. **التعليقات المجهولة والحد الصارم (50 تعليقاً)**:
   - المعلق يكتب بحرية تامة دون تسجيل دخول.
   - تنبيهات واضحة قبل الإرسال بالسرية وإخلاء المسؤولية العلمية.
   - **حد أقصى صارم 50 تعليقاً** يتم التحقق منه وفرضه في الـ Backend.
   - تتبع العداد: "تم استخدام 14 من 50 تعليقاً". عند الوصول لـ 50: "اكتملت الصفحة، لم يعد بالإمكان إرسال تعليقات جديدة."

4. **نظام التصويت التفاعلي (👍 أتفق / Agree)**:
   - تصويت بنقرة واحدة على أي تعليق يتفق معه الزائر.
   - منع التصويت المزدوج بواسطة معرف تقني مشفر ومحمي.
   - فرز التعليقات: حسب الأكثر اتفاقاً (تصويتاً) أو الأحدث أولاً.

5. **تحليل الذكاء الاصطناعي (Gemini 3.8 Flash)**:
   - تلخيص شامل للتعليقات.
   - استخراج الصفات الأكثر تكراراً وحساب النسب الحقيقية بدقة تامة: `(عدد التعليقات / إجمالي التعليقات) * 100`.
   - استخراج نقاط القوة (Strengths) ومقترحات التحسين (Growth Tips).
   - تنبيه موضوعي صريح: "النتائج تمثل تكرار آراء المشاركين فقط وليست تقييماً نفسياً أو حقيقة مؤكدة".

6. **مكافحة الإساءة والأمان**:
   - فلترة تلقائية للتهديدات، الشتائم، ونشر أرقام الهواتف أو المعلومات الشخصية.
   - نظام إبلاغ متكامل (إساءة، تهديد، تنمر، محتوى غير مناسب، معلومات شخصية، أخرى).
   - حجب تلقائي عند تكرار البلاغات، مع إمكانية تحكم صاحب الصفحة.
   - Rate Limiting لمنع الإغراق والتكرار.

7. **مشاركة سهلة ومتكاملة**:
   - نسخ الرابط مع تأثيرات احتفالية.
   - مشاركة مباشرة على واتساب و X (تويتر).
   - توليد رمز QR فوري للمسح بكاميرا الهاتف.

---

## 🛠 البنية التقنية وإدارة البيانات (Tech Stack & Database)

- **Backend**: Node.js & Express REST API (`server.ts`, `server/db.ts`, `server/ai.ts`, `server/moderation.ts`, `server/auth.ts`).
- **Database**: SQLite عبر `sql.js` (WebAssembly SQLite) مع حفظ ذري ومستمر في ملف `data/app.sqlite`.
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Motion + Lucide Icons.
- **AI Model**: Google Gemini API (`gemini-3.8-flash`) عبر `@google/genai`.
- **Localization**: عربي (RTL) & English (LTR).

### الجداول المخزنة في قاعدة البيانات (`data/app.sqlite`):
1. **users**: `id, google_id, name, email, profile_image, created_at`
2. **pages**: `id, user_id, slug, question, max_comments, comments_count, is_active, created_at, updated_at`
3. **comments**: `id, page_id, content, anonymous_identifier, votes_count, is_hidden, created_at`
4. **votes**: `id, comment_id, voter_identifier, created_at`
5. **reports**: `id, comment_id, reason, reporter_identifier, created_at`
6. **ai_analyses**: `id, page_id, summary, traits, percentages, analysis_json, analyzed_at, comments_analyzed_count, created_at, updated_at`

### 🔒 قاعدة تعليق واحد فقط لكل شخص:
- يُمنع إرسال أكثر من تعليق واحد لنفس السؤال من قبل نفس الشخص.
- يتم التحقق برمجياً في الـ Backend قبل الإدراج، وفي واجهة المستخدم لعرض رسالة واضحة وإخفاء نموذج الإرسال.

### 💾 النسخ الاحتياطي (Backups):
- يتم حفظ النسخ الاحتياطية تلقائياً في مجلد `backups/` بصيغة `backup-YYYY-MM-DD_HH-mm-ss.sqlite`.
- **لإنشاء نسخة احتياطية فورية من سطر الأوامر:**
  ```bash
  npm run backup
  ```
- **أو من خلال واجهة لوحة التحكم:** النقر على زر "نسخ احتياطي للقاعدة" لإنشاء نسخة فورية عبر `POST /api/backup`.

---

## 🚀 طريقة التشغيل (Getting Started)

### 1. المتغيرات البيئية (`.env`):
قم بإنشاء ملف `.env` استناداً إلى `.env.example`:
```bash
GEMINI_API_KEY="your-gemini-api-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com" # اختياري
APP_URL="http://localhost:3000"
```

### 2. تثبيت الحزم وتشغيل الخادم:
```bash
npm run dev
```
سيفتح الخادم على المنفذ `3000` متضمناً واجهات Frontend و Backend معاً وقاعدة بيانات SQLite الدائمة.

### 3. إنشاء نسخة احتياطية:
```bash
npm run backup
```

### 4. البناء للإنتاج (Production Build):
```bash
npm run build
npm start
```

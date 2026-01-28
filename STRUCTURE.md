# هيكل المشروع المقترح

لتحسين الكود وجعله أكثر تنظيماً وقابلية للصيانة، أقترح التقسيم التالي:

## 1. المكونات (Components)
- `Header.jsx`: شريط التنقل العلوي ومعلومات المستخدم.
- `FacebookLogin.jsx`: معالجة تسجيل الدخول وربط الحساب.
- `PageSelector.jsx`: عرض الصفحات المتاحة واختيار الصفحة النشطة.
- `PostEditor.jsx`: المكون الخاص بكتابة المنشورات (Single / Bulk).
- `PostQueue.jsx`: عرض قائمة المنشورات المجدولة وإدارتها (Move, Duplicate, Remove).
- `LogViewer.jsx`: عرض سجل العمليات (Logs).

## 2. النوافذ المنبثقة (Modals)
- `AiModal.jsx`: المكون الخاص بالذكاء الاصطناعي Gemini.
- `HashtagManager.jsx`: إدارة الهاشتاجات.
- `RescheduleModal.jsx`: إعادة جدولة المنشورات.
- `PreviewModal.jsx`: معاينة المنشور قبل النشر.

## 3. الخدمات (Services/Hooks)
- `useFacebookSDK.js`: Custom Hook لإدارة Facebook SDK وعمليات الـ API.
- `useGeminiAI.js`: Custom Hook للتعامل مع Gemini API.
- `canvasUtils.js`: دوال مساعدة لإنشاء الصور من النصوص.
- `dateUtils.js`: معالجة التواريخ والأوقات.

## 4. الحالة المركزية (State Management)
- يفضل استخدام `React Context` أو `Zustand` لإدارة حالة الـ Access Token والصفحات والمنشورات بدلاً من وضع كل شيء في `App.js`.

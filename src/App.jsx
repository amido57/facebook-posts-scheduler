import Login from './Login';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Clock, List, Settings, Play, FileText, X, RefreshCw, 
  Check, CheckCircle, User, Users, Zap, ExternalLink, ShieldCheck, 
  ShieldAlert, Facebook, Sparkles, Wand2, Key, ArrowUp, ArrowDown, 
  Copy, Shuffle, Ban, RotateCcw, Edit3, Save, Hash, PenTool, Eye, 
  Scissors, Eraser, Share2 
} from 'lucide-react';

// ثابت لإصدار Graph API لتسهيل التحديث مستقبلاً
const GRAPH_VER = 'v19.0';
const graphUrl = (path) => `https://graph.facebook.com/${GRAPH_VER}${path}`;

export default function App() {
  // --- Facebook SDK Setup ---
  const [fbAppId] = useState('1125808962067340');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [fbUser, setFbUser] = useState(null);
  const [manualInputToken, setManualInputToken] = useState('');

  // --- Gemini AI Setup (With Persistence) ---
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState('generate'); 

  // --- Core State ---
  const [pageId, setPageId] = useState('');
  const [pageData, setPageData] = useState(null); 
  const [accessToken, setAccessToken] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState(''); 
  const [tokenType, setTokenType] = useState('unknown'); 
  
  const [fetchedPages, setFetchedPages] = useState([]);
  const [existingScheduledTimes, setExistingScheduledTimes] = useState([]); 
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [showPagesList, setShowPagesList] = useState(false);

  const [postsQueue, setPostsQueue] = useState([]);
  
  // --- Reschedule Feature State ---
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [manageablePosts, setManageablePosts] = useState([]);
  const [selectedManageablePosts, setSelectedManageablePosts] = useState([]); 
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleInterval, setRescheduleInterval] = useState(1);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isLoadingManageablePosts, setIsLoadingManageablePosts] = useState(false);

  // --- Preview Feature State ---
  const [previewPost, setPreviewPost] = useState(null);
  // تخزين أوقات المعاينة المحسوبة بدقة
  const [calculatedPreviewTimes, setCalculatedPreviewTimes] = useState({});

  // --- Input State ---
  const [singleText, setSingleText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [captionMode, setCaptionMode] = useState('lines'); 
  const [selectedBg, setSelectedBg] = useState(null); 
  
  const [bulkText, setBulkText] = useState('');
  const [activeTab, setActiveTab] = useState('single');

  const [publishMode, setPublishMode] = useState('scheduled'); 
  const [startTime, setStartTime] = useState('');
  const [intervalHours, setIntervalHours] = useState(1);

  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- New Features State ---
  const [isHashtagModalOpen, setIsHashtagModalOpen] = useState(false);
  const [hashtagGroups, setHashtagGroups] = useState(() => JSON.parse(localStorage.getItem('hashtagGroups')) || []);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTags, setNewGroupTags] = useState('');
  
  const [signature, setSignature] = useState(() => localStorage.getItem('postSignature') || '');
  const [useSignature, setUseSignature] = useState(() => JSON.parse(localStorage.getItem('useSignature')) || false);
  const [showSignatureSettings, setShowSignatureSettings] = useState(false);

  const backgroundOptions = [
    { id: 'none', name: 'بدون', css: 'bg-white border' },
    { id: 'red-grad', name: 'أحمر', css: 'bg-gradient-to-br from-red-500 to-pink-600 text-white', color: ['#ef4444', '#db2777'] },
    { id: 'blue-grad', name: 'أزرق', css: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white', color: ['#3b82f6', '#06b6d4'] },
    { id: 'green-grad', name: 'أخضر', css: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white', color: ['#10b981', '#0d9488'] },
    { id: 'purple-grad', name: 'بنفسجي', css: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white', color: ['#9333ea', '#4f46e5'] },
    { id: 'orange-grad', name: 'برتقالي', css: 'bg-gradient-to-br from-orange-400 to-red-500 text-white', color: ['#fb923c', '#ef4444'] },
    { id: 'dark', name: 'أسود', css: 'bg-slate-900 text-white', color: ['#0f172a', '#334155'] },
  ];

  // --- Helpers ---
  const addLog = (message, type = 'info', link = null, linkText = 'عرض الرابط') => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('ar-EG'),
      message,
      type,
      link,
      linkText
    }, ...prev]);
  };

  // دالة لضمان أن وقت الجدولة يلتزم بقاعدة الـ 10 دقائق من فيسبوك
  const ensureMinScheduleLead = (dateStr, minMinutes = 15) => {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    const now = new Date();
    const minTime = new Date(now.getTime() + minMinutes * 60 * 1000);
    return date < minTime ? minTime : date;
  };

  // دالة لحساب الوقت المتاح التالي (تتخطى الأوقات المشغولة)
  const getNextAvailableTime = (baseTime, existingTimes) => {
      let candidate = new Date(baseTime);
      let attempts = 0;
      // نبحث عن تعارض في نطاق دقيقة واحدة
      while (attempts < 50) {
          const timeMs = candidate.getTime();
          const conflict = existingTimes.find(t => Math.abs(t - timeMs) < 60000);
          if (!conflict) return candidate;
          
          // لو مشغول، زود دقيقة (أو حسب منطقك، هنا بنزود دقيقة للمحاولة)
          // لكن في اللوجيك الأساسي بنزود الفاصل الزمني. 
          // لتجنب التعقيد هنا، سنعتمد أن الفاصل الزمني هو اللي بيحدد القفزة في اللوب الرئيسي
          return null; // إشارة لوجود تعارض عند هذا الوقت المحدد
      }
      return candidate;
  };

  // --- Effects ---
  useEffect(() => { localStorage.setItem('hashtagGroups', JSON.stringify(hashtagGroups)); }, [hashtagGroups]);
  useEffect(() => { localStorage.setItem('postSignature', signature); localStorage.setItem('useSignature', JSON.stringify(useSignature)); }, [signature, useSignature]);
  useEffect(() => { localStorage.setItem('geminiApiKey', geminiApiKey); }, [geminiApiKey]);

  // حساب أوقات المعاينة بدقة عند تغيير أي مدخلات
  useEffect(() => {
    if (publishMode === 'scheduled' && startTime && postsQueue.length > 0) {
        const times = {};
        let currentTime = ensureMinScheduleLead(startTime);
        
        postsQueue.forEach((post) => {
            // محاكاة منطق تخطي الأوقات المحجوزة
            let isTimeConflict = true;
            let attempts = 0;
            
            while (isTimeConflict && attempts < 50) {
                const timeToCheck = currentTime.getTime();
                const conflict = existingScheduledTimes.find(t => Math.abs(t - timeToCheck) < 60000);
                
                if (conflict) {
                    // وقت مشغول، نقفز للفاصل التالي
                    currentTime = new Date(currentTime.getTime() + (intervalHours * 60 * 60 * 1000));
                    attempts++;
                } else {
                    isTimeConflict = false;
                }
            }
            
            times[post.id] = currentTime.toLocaleTimeString('ar-EG', {
                day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            
            // تجهيز الوقت للبوست القادم
            currentTime = new Date(currentTime.getTime() + (intervalHours * 60 * 60 * 1000));
        });
        setCalculatedPreviewTimes(times);
    }
  }, [postsQueue, startTime, intervalHours, existingScheduledTimes, publishMode]);

  // تهيئة Facebook SDK (استخدام ar_AR للغة العربية)
  useEffect(() => {
    window.fbAsyncInit = function() {
      try {
        window.FB.init({
          appId      : '1125808962067340',
          cookie     : true,
          xfbml      : true,
          version    : GRAPH_VER
        });
        setIsSdkLoaded(true);
        window.FB_Initialized = true;
        addLog('تم تهيئة الاتصال بفيسبوك.', 'success');
        checkLoginStatus();
      } catch (e) { console.error(e); }
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       // استخدام ar_AR بدلاً من en_US
       js.src = "https://connect.facebook.net/ar_AR/sdk.js"; 
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  }, []);

  const checkLoginStatus = () => {
      if (!window.FB) return;
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          addLog('تنبيه أمني: يتطلب فيسبوك HTTPS.', 'warning');
      }
      try {
          window.FB.getLoginStatus((response) => {
              if (response.status === 'connected') handleFBResponse(response);
          });
      } catch (error) { console.warn(error); }
  };

  const handleFBLogin = () => {
      if (!window.FB) { addLog('Facebook SDK غير جاهز.', 'warning'); return; }
      window.FB.login((response) => {
          if (response.authResponse) handleFBResponse(response);
      }, {scope: 'pages_show_list,pages_read_engagement,pages_manage_posts'});
  };

  const handleFBResponse = (response) => {
      const token = response.authResponse?.accessToken;
      if (!token) return;
      
      setAccessToken(token);
      setTokenType('user');
      addLog('تم تسجيل الدخول بنجاح!', 'success');
      
      // التأكد من عدم وجود خطأ قبل استدعاء الدالة التالية
      window.FB.api('/me', (res) => { 
          if (!res.error) {
              setFbUser(res); 
              fetchPagesWithToken(token); 
          } else {
              addLog(`فشل جلب بيانات المستخدم: ${res.error.message}`, 'error');
          }
      });
  };

  const handleManualTokenLogin = () => {
      if (!manualInputToken.trim()) return;
      const token = manualInputToken.trim();
      setAccessToken(token);
      setTokenType('user');
      addLog('جاري استخدام التوكن اليدوي...', 'info');
      fetchPagesWithToken(token);
  };

  const fetchPagesWithToken = async (token) => {
    setIsLoadingPages(true);
    try {
      const response = await fetch(graphUrl(`/me/accounts?limit=1000&fields=name,id,picture{url},access_token,followers_count&access_token=${token}`));
      const data = await response.json();
      if (!data.error) {
        setFetchedPages(data.data || []);
        setShowPagesList(true);
        if (data.data?.length > 0) addLog(`تم العثور على ${data.data.length} صفحة.`, 'success');
      } else {
          addLog(`خطأ التوكن: ${data.error.message}`, 'error');
      }
    } catch (error) { addLog('فشل الاتصال.', 'error'); } 
    finally { setIsLoadingPages(false); }
  };

  const createTextPostImage = async (text, bgStyle) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1080; 
      const ctx = canvas.getContext('2d');

      if (bgStyle.color.length > 1) {
          const grd = ctx.createLinearGradient(0, 0, 1080, 1080);
          grd.addColorStop(0, bgStyle.color[0]);
          grd.addColorStop(1, bgStyle.color[1]);
          ctx.fillStyle = grd;
      } else {
          ctx.fillStyle = bgStyle.color[0];
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const fontSize = text.length > 100 ? 50 : 80;
      ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;

      const words = text.split(' ');
      let lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
          const width = ctx.measureText(currentLine + " " + words[i]).width;
          if (width < 900) { currentLine += " " + words[i]; } 
          else { lines.push(currentLine); currentLine = words[i]; }
      }
      lines.push(currentLine);

      const lineHeight = fontSize * 1.4;
      const startY = (canvas.height - (lines.length * lineHeight)) / 2 + (lineHeight/2);
      lines.forEach((line, i) => { ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight)); });

      return new Promise(resolve => {
          canvas.toBlob(blob => {
              const file = new File([blob], "text-post.png", { type: "image/png" });
              resolve(file);
          }, 'image/png');
      });
  };

  const fetchScheduledPosts = async (pId, pToken) => {
      if (!pId || !pToken) return;
      try {
          const response = await fetch(graphUrl(`/${pId}/scheduled_posts?limit=100&fields=scheduled_publish_time&access_token=${pToken}`));
          const data = await response.json();
          if (data.data) {
              const times = data.data.map(p => p.scheduled_publish_time * 1000);
              setExistingScheduledTimes(times);
              addLog(`تم جلب ${times.length} موعد محجوز مسبقاً.`, 'info');
          }
      } catch (e) { console.error(e); }
  };

  const fetchManageablePosts = async () => {
      if (!pageId || !pageAccessToken) {
          addLog('الرجاء اختيار الصفحة أولاً (يجب أن يكون لديك صلاحية أدمن).', 'error');
          return;
      }
      setIsLoadingManageablePosts(true); 
      try {
          const response = await fetch(graphUrl(`/${pageId}/scheduled_posts?limit=100&fields=id,message,scheduled_publish_time,full_picture&access_token=${pageAccessToken}`));
          const data = await response.json();
          if (data.data) {
              const sortedPosts = data.data.sort((a, b) => a.scheduled_publish_time - b.scheduled_publish_time);
              setManageablePosts(sortedPosts);
              setSelectedManageablePosts(sortedPosts.map(p => p.id));
              setIsRescheduleModalOpen(true);
              addLog(`تم جلب ${sortedPosts.length} منشور مجدول للتعديل.`, 'success');
          } else {
              addLog('لا توجد منشورات مجدولة حالياً على هذه الصفحة.', 'warning');
          }
      } catch (error) {
          addLog(`حدث خطأ أثناء جلب المنشورات: ${error.message}`, 'error');
      } finally {
          setIsLoadingManageablePosts(false);
      }
  };

  const toggleSelectPost = (id) => {
      if (selectedManageablePosts.includes(id)) {
          setSelectedManageablePosts(selectedManageablePosts.filter(pId => pId !== id));
      } else {
          setSelectedManageablePosts([...selectedManageablePosts, id]);
      }
  };

  const toggleSelectAllManageable = () => {
      if (selectedManageablePosts.length === manageablePosts.length) {
          setSelectedManageablePosts([]);
      } else {
          setSelectedManageablePosts(manageablePosts.map(p => p.id));
      }
  };

  const handleRescheduleExecution = async () => {
      if (!rescheduleStartTime) {
          alert('الرجاء تحديد وقت البداية الجديد.');
          return;
      }
      
      const postsToReschedule = manageablePosts.filter(p => selectedManageablePosts.includes(p.id));
      if (postsToReschedule.length === 0) {
          alert('لم يتم تحديد أي منشورات لإعادة جدولتها.');
          return;
      }

      setIsRescheduling(true);
      let startDate = ensureMinScheduleLead(rescheduleStartTime);

      addLog(`جاري تحديث مواعيد ${postsToReschedule.length} منشور محدد...`, 'info');

      for (let i = 0; i < postsToReschedule.length; i++) {
          const post = postsToReschedule[i];
          const newTime = new Date(startDate.getTime() + (i * rescheduleInterval * 60 * 60 * 1000));
          const unixTimestamp = Math.floor(newTime.getTime() / 1000);

          try {
              const response = await fetch(graphUrl(`/${post.id}`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      scheduled_publish_time: unixTimestamp,
                      published: false, 
                      access_token: pageAccessToken
                  })
              });
              
              const data = await response.json();
              if (data.success) {
                  addLog(`✅ تم تحديث البوست (${post.id.slice(-4)}) إلى ${newTime.toLocaleTimeString('ar-EG')}`, 'success');
              } else {
                  addLog(`❌ فشل تحديث البوست: ${data.error?.message}`, 'error');
              }
          } catch (e) {
              addLog(`خطأ اتصال: ${e.message}`, 'error');
          }
          
          await new Promise(r => setTimeout(r, 800));
      }

      setIsRescheduling(false);
      addLog('تمت عملية إعادة الجدولة للمنشورات المحددة.', 'success');
      fetchManageablePosts(); 
  };

  const handleSelectPage = async (page) => {
    setPageId(page.id);
    setPageData(page);
    setPageAccessToken(page.access_token);
    addLog(`تم اختيار الصفحة: ${page.name}`, 'success');
    
    // التحقق من صلاحية توكن الصفحة فوراً
    try {
        const response = await fetch(graphUrl(`/${page.id}?fields=id&access_token=${page.access_token}`));
        const data = await response.json();
        if (data.error) {
            addLog('تحذير: توكن الصفحة يبدو غير صالح أو لا يملك صلاحيات كافية.', 'warning');
        } else {
            addLog('تم التحقق من صلاحيات الصفحة بنجاح.', 'success');
        }
    } catch (e) {
        console.error(e);
    }

    fetchScheduledPosts(page.id, page.access_token);
  };

  const getProcessedCaption = (text) => {
      let content = text || '';
      if (useSignature && signature) {
          content += `\n\n${signature}`;
      }
      return content;
  };

  // ... (نفس دوال معالجة النصوص والمودال والذكاء الاصطناعي السابقة) ...
  const handleSplitText = () => {
      if (!singleText.trim()) { alert('أدخل نصاً طويلاً لتقسيمه.'); return; }
      const parts = singleText.split(/\n\s*\n/).filter(p => p.trim() !== '');
      if (parts.length < 2) { alert('النص قصير جداً.'); return; }
      const newPosts = parts.map((part, index) => ({ id: Date.now() + index, content: getProcessedCaption(part.trim()), file: null, type: 'text' }));
      setPostsQueue([...postsQueue, ...newPosts]);
      setSingleText('');
      addLog(`تم تقسيم النص إلى ${newPosts.length} منشورات.`, 'success');
  };

  const handleCleanText = () => {
      if (!singleText.trim()) return;
      const cleaned = singleText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      setSingleText(cleaned);
      addLog('تم تنظيف وتنسيق النص.', 'info');
  };

  const handleCaptionFromFilename = async () => {
      if (selectedFiles.length === 0) { alert('الرجاء اختيار ملفات أولاً.'); return; }

      if (geminiApiKey) {
          setIsAiLoading(true);
          try {
              const fileNames = selectedFiles.map(f => f.name).join('\n');
              const prompt = `حول أسماء الملفات التالية لعناوين بوستات عربية جذابة ومختصرة (سطر لكل ملف):\n${fileNames}`;
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
              });
              const data = await response.json();
              if (data.error) throw new Error(data.error.message);
              const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (generatedText) {
                  setSingleText(generatedText.trim());
                  addLog('✨ تم استخراج العناوين بالذكاء الاصطناعي!', 'success');
              }
          } catch (e) {
              console.error("AI Error:", e);
              addLog(`فشل AI (${e.message})، تم استخدام الطريقة التقليدية.`, 'warning');
              processFilenamesRegex();
          } finally { setIsAiLoading(false); }
      } else {
          addLog('تم استخدام الطريقة التقليدية (أضف مفتاح Gemini لتحسين النتائج).', 'info');
          processFilenamesRegex();
      }
  };

  const processFilenamesRegex = () => {
      const captions = selectedFiles.map(file => {
          let rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-\.]/g, ' '); 
          let arabicName = rawName.replace(/[^\u0600-\u06FF0-9 ]/g, '').replace(/\s+/g, ' ').trim();
          return arabicName || rawName;
      }).join('\n');
      setSingleText(captions);
  };

  const handleAddSinglePost = async () => {
    if (!singleText && selectedFiles.length === 0) return;
    
    if (selectedBg && selectedBg.id !== 'none' && singleText && selectedFiles.length === 0) {
        setIsProcessing(true); 
        try {
            const imageFile = await createTextPostImage(singleText, selectedBg);
            const previewUrl = URL.createObjectURL(imageFile);
            const postCaption = useSignature ? signature : '';
            const newPost = { id: Date.now(), content: postCaption, file: imageFile, type: 'image', previewUrl, isColoredBackground: true };
            setPostsQueue([...postsQueue, newPost]);
            addLog('تم إنشاء بوست بخلفية ملونة.', 'success');
            setSingleText(''); setSelectedBg(null);
        } catch (e) { addLog('فشل إنشاء الصورة.', 'error'); }
        setIsProcessing(false);
        return;
    }

    const newPosts = [];
    const captions = singleText.split('\n'); 
    if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, index) => {
            const fileType = file.type.startsWith('image/') ? 'image' : 'video';
            let captionRaw = captionMode === 'lines' ? (captions[index] ? captions[index].trim() : '') : singleText.trim();
            const caption = getProcessedCaption(captionRaw); 
            const previewUrl = URL.createObjectURL(file);
            newPosts.push({ id: Date.now() + index, content: caption, file: file, type: fileType, previewUrl });
        });
        addLog(`تم إضافة ${selectedFiles.length} ملفات.`, 'success');
    } else {
        const caption = getProcessedCaption(singleText);
        newPosts.push({ id: Date.now(), content: caption, file: null, type: 'text' });
    }
    setPostsQueue([...postsQueue, ...newPosts]);
    setSingleText(''); setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddBulkPosts = () => {
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const newPosts = lines.map((line, index) => ({ id: Date.now() + index, content: getProcessedCaption(line), file: null, type: 'text' }));
    setPostsQueue([...postsQueue, ...newPosts]);
    setBulkText('');
  };

  const removePost = (id) => setPostsQueue(postsQueue.filter(p => p.id !== id));
  const movePost = (index, direction) => {
      const newQueue = [...postsQueue];
      if (direction === -1 && index > 0) [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
      else if (direction === 1 && index < newQueue.length - 1) [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      setPostsQueue(newQueue);
  };
  const duplicatePost = (post) => setPostsQueue([...postsQueue, { ...post, id: Date.now() + Math.random() }]);
  const shuffleQueue = () => {
      const newQueue = [...postsQueue];
      for (let i = newQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
      }
      setPostsQueue(newQueue);
  };

  const resetScheduleTime = () => {
      const d = ensureMinScheduleLead(new Date(), 20); // 20 mins buffer
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
      setStartTime(localISOTime);
      addLog('تم تحديث وقت البداية.', 'info');
  };

  const saveNewHashtagGroup = () => {
      if (!newGroupName.trim() || !newGroupTags.trim()) { alert('أدخل البيانات'); return; }
      setHashtagGroups([...hashtagGroups, { id: Date.now(), name: newGroupName, tags: newGroupTags }]);
      setNewGroupName(''); setNewGroupTags('');
  };
  const deleteHashtagGroup = (id) => setHashtagGroups(hashtagGroups.filter(g => g.id !== id));
  const insertHashtagGroup = (tags) => {
      const textToInsert = `\n${tags}`;
      if (activeTab === 'single') setSingleText(prev => prev + textToInsert); else setBulkText(prev => prev + textToInsert);
      setIsHashtagModalOpen(false);
  };

  const handleOpenAiModal = (mode) => {
      setAiMode(mode);
      if (mode === 'improve') {
          const currentText = activeTab === 'single' ? singleText : bulkText;
          if (!currentText.trim()) { alert('اكتب نصاً أولاً!'); return; }
          setAiPrompt(currentText);
      } else { setAiPrompt(''); }
      setIsAiModalOpen(true);
  };

  const generateWithGemini = async () => {
      if (!geminiApiKey) { alert('أدخل مفتاح Gemini API في الإعدادات.'); return; }
      if (!aiPrompt.trim()) return;
      setIsAiLoading(true);
      try {
          const prompt = aiMode === 'generate' ? `اكتب بوست فيسبوك عن: ${aiPrompt}` : `حسن صياغة هذا النص: ${aiPrompt}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
              activeTab === 'single' ? setSingleText(text) : setBulkText(text);
              setIsAiModalOpen(false);
              addLog('✨ تم التوليد بنجاح!', 'success');
          }
      } catch (e) { alert(`خطأ: ${e.message}`); }
      setIsAiLoading(false);
  };

  const handleProcess = async () => {
    if (!pageId) { addLog('اختر صفحة أولاً', 'error'); return; }
    if (publishMode === 'scheduled' && !pageAccessToken) { addLog('الجدولة تتطلب توكن صفحة (Page Token).', 'error'); return; }
    
    const finalToken = pageAccessToken || accessToken;
    if (!finalToken) { addLog('لا يوجد توكن.', 'error'); return; }
    if (!pageAccessToken && !window.confirm('أنت تنشر كزائر (User Token). هل متأكد؟')) return;
    if (postsQueue.length === 0) { addLog('القائمة فارغة.', 'error'); return; }

    let currentScheduleTime = new Date();
    
    if (publishMode === 'scheduled') {
        if (!startTime) { addLog('حدد الوقت.', 'error'); return; }
        // استخدام الدالة المساعدة لضبط الوقت
        currentScheduleTime = ensureMinScheduleLead(startTime);
    }

    setIsProcessing(true);
    addLog(`بدء العملية... (${postsQueue.length} منشور)`, 'info');

    for (let i = 0; i < postsQueue.length; i++) {
      const post = postsQueue[i];
      let unixTimestamp;
      const formData = new FormData();
      formData.append('access_token', finalToken);

      if (publishMode === 'scheduled') {
          // استخدام دالة تخطي التعارضات
          currentScheduleTime = getNextAvailableTime(currentScheduleTime, existingScheduledTimes) || currentScheduleTime;
          
          unixTimestamp = Math.floor(currentScheduleTime.getTime() / 1000);
          formData.append('published', 'false');
          formData.append('scheduled_publish_time', unixTimestamp);
          
          // خاصية مهمة لجدولة الصور والفيديو
          if (post.type !== 'text') {
              formData.append('unpublished_content_type', 'SCHEDULED');
          }

          // زيادة الوقت للبوست القادم
          currentScheduleTime = new Date(currentScheduleTime.getTime() + (intervalHours * 60 * 60 * 1000));
      } else {
          formData.append('published', 'true');
      }

      try {
        let url;
        if (post.type === 'text') {
            url = graphUrl(`/${pageId}/feed`);
            const payload = {
                message: post.content,
                access_token: finalToken,
                published: publishMode !== 'scheduled',
                ...(publishMode === 'scheduled' && { scheduled_publish_time: unixTimestamp })
            };
            await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        addLog(`✅ تم (${post.type})`, 'success');
                        if (publishMode === 'scheduled') setExistingScheduledTimes(prev => [...prev, unixTimestamp * 1000]);
                    } else {
                        addLog(`❌ فشل: ${data.error?.message}`, 'error');
                        if (data.error?.code === 190) setIsProcessing(false);
                    }
                });
        } else {
            url = graphUrl(`/${pageId}/${post.type === 'image' ? 'photos' : 'videos'}`);
            formData.append(post.type === 'image' ? 'message' : 'description', post.content || '');
            formData.append('source', post.file);
            await fetch(url, { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        addLog(`✅ تم (${post.type})`, 'success');
                        if (publishMode === 'scheduled') setExistingScheduledTimes(prev => [...prev, unixTimestamp * 1000]);
                    } else {
                        addLog(`❌ فشل: ${data.error?.message}`, 'error');
                        if (data.error?.code === 190) setIsProcessing(false);
                    }
                });
        }
      } catch (error) { addLog(`خطأ: ${error.message}`, 'error'); }
      
      if (i < postsQueue.length - 1) await new Promise(r => setTimeout(r, 2000));
    }
    setIsProcessing(false);
    addLog('انتهت العملية.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      
      {/* Live Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Eye className="w-4 h-4"/> معاينة البوست</h3>
                    <button onClick={() => setPreviewPost(null)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-4 bg-white">
                    <div className="flex gap-2 mb-2">
                        <img src={pageData?.picture?.data?.url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border" />
                        <div>
                            <p className="font-bold text-sm text-slate-900 leading-tight">{pageData?.name || 'اسم الصفحة'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">الآن • <ExternalLink className="w-3 h-3"/></p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-900 mb-3 whitespace-pre-wrap font-normal" style={{direction: 'auto'}}>{previewPost.content}</p>
                    {previewPost.previewUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                            {previewPost.type === 'video' ? (
                                <video src={previewPost.previewUrl} controls className="w-full max-h-80 object-cover" />
                            ) : (
                                <img src={previewPost.previewUrl} className="w-full h-auto object-cover" />
                            )}
                        </div>
                    )}
                    <div className="flex items-center justify-between text-slate-500 text-sm mt-3 pt-2 border-t">
                        <span className="flex items-center gap-1"><Share2 className="w-4 h-4"/> مشاركة</span>
                        <span className="flex items-center gap-1">تعليق</span>
                        <span className="flex items-center gap-1">أعجبني</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Hashtag Manager Modal */}
      {isHashtagModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                <button onClick={() => setIsHashtagModalOpen(false)} className="absolute left-4 top-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-700"><Hash className="w-5 h-5 text-blue-500" /> مدير الهاشتاجات</h3>
                <div className="space-y-3 mb-4">
                    <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="اسم المجموعة" />
                    <textarea value={newGroupTags} onChange={(e) => setNewGroupTags(e.target.value)} className="w-full p-2 border rounded text-sm h-20" placeholder="#هاشتاج..." />
                    <button onClick={saveNewHashtagGroup} className="w-full bg-blue-600 text-white py-2 rounded text-sm font-bold">حفظ المجموعة</button>
                </div>
                <div className="border-t pt-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {hashtagGroups.map(g => (
                         <div key={g.id} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-1 border border-slate-100">
                             <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-700">{g.name}</p></div>
                             <div className="flex gap-2">
                                 <button onClick={() => insertHashtagGroup(g.tags)} className="text-green-600 bg-green-50 p-1 rounded hover:bg-green-100 text-xs font-bold">إدراج</button>
                                 <button onClick={() => deleteHashtagGroup(g.id)} className="text-red-500 bg-red-50 p-1 rounded hover:bg-red-100"><Trash2 className="w-3 h-3" /></button>
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-blue-700"><Edit3 className="w-6 h-6" /> إدارة المنشورات المجدولة</h3>
                    <button onClick={() => setIsRescheduleModalOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                </div>
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-blue-800"><strong>{selectedManageablePosts.length}</strong> منشور محدد.</p>
                        <button onClick={toggleSelectAllManageable} className="text-xs text-blue-600 hover:underline">{selectedManageablePosts.length === manageablePosts.length ? 'إلغاء الكل' : 'تحديد الكل'}</button>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1"><label className="block text-xs font-bold text-blue-600 mb-1">وقت البداية</label><input type="datetime-local" value={rescheduleStartTime} onChange={(e) => setRescheduleStartTime(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
                        <div className="w-24"><label className="block text-xs font-bold text-blue-600 mb-1">الفاصل (س)</label><input type="number" min="1" value={rescheduleInterval} onChange={(e) => setRescheduleInterval(Number(e.target.value))} className="w-full p-2 border rounded text-sm" /></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-lg p-2 mb-4 border border-slate-200">
                    {isLoadingManageablePosts ? <p className="text-center text-slate-500 py-4">جاري التحميل...</p> : 
                    manageablePosts.map((post, idx) => (
                        <div key={post.id} onClick={() => toggleSelectPost(post.id)} className={`p-3 rounded border mb-2 flex gap-3 items-center cursor-pointer transition ${selectedManageablePosts.includes(post.id) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selectedManageablePosts.includes(post.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>{selectedManageablePosts.includes(post.id) && <Check className="w-3 h-3 text-white" />}</div>
                            <div className="w-10 h-10 bg-slate-200 rounded flex-shrink-0 overflow-hidden">{post.full_picture ? <img src={post.full_picture} className="w-full h-full object-cover" /> : <FileClock className="w-5 h-5 m-auto mt-2.5 text-slate-400" />}</div>
                            <div className="flex-1 min-w-0"><p className="text-xs text-slate-800 truncate font-medium">{post.message || '(بدون نص)'}</p><p className="text-[10px] text-slate-500">حالياً: {new Date(post.scheduled_publish_time * 1000).toLocaleString('ar-EG')}</p></div>
                        </div>
                    ))}
                </div>
                <button onClick={handleRescheduleExecution} disabled={isRescheduling || !rescheduleStartTime || selectedManageablePosts.length === 0} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">{isRescheduling ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isRescheduling ? 'جاري التحديث...' : `حفظ المواعيد`}</button>
            </div>
        </div>
      )}

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95">
                <button onClick={() => setIsAiModalOpen(false)} className="absolute left-4 top-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-purple-700"><Sparkles className="w-6 h-6 text-purple-500" /> الذكاء الاصطناعي</h3>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder={aiMode === 'generate' ? 'اكتب الموضوع...' : 'النص...'}></textarea>
                <button onClick={generateWithGemini} disabled={isAiLoading || !aiPrompt.trim()} className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg">{isAiLoading ? 'جاري العمل...' : 'نفذ'}</button>
            </div>
        </div>
      )}

      <header className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3"><Calendar className="w-8 h-8" /><h1 className="text-2xl font-bold">مجدول فيسبوك الذكي</h1></div>
          {fbUser && <div className="text-sm bg-blue-700 px-3 py-1 rounded-full flex items-center gap-2"><User className="w-4 h-4"/> {fbUser.name}</div>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700"><Settings className="w-5 h-5 text-blue-500" /> الإعدادات</h2>
            <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">1. حساب فيسبوك</label>
                    {!accessToken ? (
                        <div className="space-y-2">
                            <button onClick={handleFBLogin} className="w-full py-2 bg-[#1877F2] text-white rounded text-sm flex justify-center gap-2"><Facebook className="w-4 h-4" /> تسجيل الدخول</button>
                            <div className="flex gap-2"><input type="password" value={manualInputToken} onChange={(e) => setManualInputToken(e.target.value)} className="flex-1 p-2 border rounded text-xs" placeholder="Access Token..." /><button onClick={handleManualTokenLogin} className="bg-slate-700 text-white px-3 rounded text-xs">ربط</button></div>
                        </div>
                    ) : <div className="flex justify-between text-sm"><span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> متصل</span><button onClick={() => window.location.reload()} className="text-red-500 text-xs">خروج</button></div>}
                </div>
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-amber-700 flex items-center gap-1"><PenTool className="w-3 h-3" /> التوقيع التلقائي</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowSignatureSettings(!showSignatureSettings)} className="text-xs text-amber-600 underline">{showSignatureSettings ? 'إخفاء' : 'تعديل'}</button>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={useSignature} onChange={(e) => setUseSignature(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                    </div>
                    {showSignatureSettings && <textarea value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full p-2 border border-amber-200 rounded text-sm h-20 outline-none" placeholder="اكتب التوقيع هنا..." />}
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <label className="block text-xs font-bold text-purple-700 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> 2. مفتاح Gemini API</label>
                    <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="w-full p-2 border border-purple-200 rounded text-sm outline-none" placeholder="API Key..." />
                </div>
            </div>
          </div>

          {accessToken && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700"><List className="w-5 h-5 text-blue-500" /> اختر الصفحة</h2>
                 {pageId && pageAccessToken && (
                     <button onClick={fetchManageablePosts} className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-amber-200 transition font-bold">
                         <Edit3 className="w-3 h-3" /> تعديل المجدول
                     </button>
                 )}
             </div>
             {fetchedPages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                      {fetchedPages.map(page => (
                          <div key={page.id} onClick={() => handleSelectPage(page)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition hover:shadow-md ${pageId === page.id ? 'border-green-500 bg-green-50 ring-1' : 'bg-white'}`}>
                              <img src={page.picture?.data?.url} alt={page.name} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                              <div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-slate-800 truncate">{page.name}</h4><p className="text-[10px] text-slate-500">{page.id}</p></div>
                              {pageId === page.id && <Check className="w-5 h-5 text-green-600" />}
                          </div>
                      ))}
                  </div>
              ) : <p className="text-center text-sm text-slate-500">جاري التحميل...</p>}
          </div>
          )}

          {pageId && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('single')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'single' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>ميديا (متعدد)</button>
              <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'bulk' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>نصوص (جملة)</button>
            </div>

            <div className="p-6 relative">
              <div className="flex gap-2 mb-3 justify-end flex-wrap">
                  <button onClick={handleCleanText} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-slate-200 transition"><Eraser className="w-3 h-3" /> تنظيف</button>
                  <button onClick={handleSplitText} className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-orange-100 transition"><Scissors className="w-3 h-3" /> تقسيم</button>
                  <button onClick={() => setIsHashtagModalOpen(true)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-blue-100 transition"><Hash className="w-3 h-3" /> هاشتاجات</button>
                  <button onClick={handleCaptionFromFilename} className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition ${isAiLoading ? 'bg-teal-100 text-teal-700 animate-pulse' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`} disabled={isAiLoading}>
                      <FileText className="w-3 h-3" /> {isAiLoading ? 'جاري التحليل...' : 'اسم الملف (AI)'}
                  </button>
                  <button onClick={() => handleOpenAiModal('generate')} className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-purple-200 transition"><Sparkles className="w-3 h-3" /> فكرة</button>
                  <button onClick={() => handleOpenAiModal('improve')} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 hover:bg-indigo-200 transition"><Wand2 className="w-3 h-3" /> تحسين</button>
              </div>

              {activeTab === 'single' ? (
                <div className="space-y-4">
                  {selectedFiles.length === 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                          {backgroundOptions.map(bg => (
                              <button key={bg.id} onClick={() => setSelectedBg(bg)} className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition ${selectedBg?.id === bg.id ? 'border-blue-600 scale-110' : 'border-transparent hover:scale-105'} ${bg.css}`} title={bg.name}>
                                {bg.id === 'none' && <Ban className="w-4 h-4 m-auto text-slate-400"/>}
                              </button>
                          ))}
                      </div>
                  )}
                  
                  <div className={`relative rounded-lg overflow-hidden transition-all ${selectedBg && selectedBg.id !== 'none' ? 'h-60' : 'h-auto'}`}>
                      {selectedBg && selectedBg.id !== 'none' && (
                          <div className={`absolute inset-0 ${selectedBg.css} flex items-center justify-center p-6 text-center font-bold text-xl pointer-events-none`}>
                              {singleText || 'معاينة النص'}
                          </div>
                      )}
                      <textarea value={singleText} onChange={(e) => setSingleText(e.target.value)} className={`w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${selectedBg && selectedBg.id !== 'none' ? 'opacity-0 h-60 absolute inset-0 z-10' : 'h-24 bg-white'}`} placeholder="اكتب النصوص هنا..." />
                  </div>

                  <div className="flex gap-4 bg-slate-50 p-2 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="captionMode" value="lines" checked={captionMode === 'lines'} onChange={() => setCaptionMode('lines')} disabled={!!selectedBg} /> توزيع الأسطر</label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="captionMode" value="fixed" checked={captionMode === 'fixed'} onChange={() => setCaptionMode('fixed')} disabled={!!selectedBg} /> نص موحد</label>
                  </div>
                   
                   <input type="file" ref={fileInputRef} multiple accept="image/*,video/*" onChange={(e) => {setSelectedFiles(Array.from(e.target.files)); setSelectedBg(null);}} className="block w-full text-sm text-slate-500" disabled={!!selectedBg} />
                   <button onClick={handleAddSinglePost} disabled={!singleText && selectedFiles.length === 0} className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">إضافة للقائمة</button>
                </div>
              ) : (
                <div className="space-y-4">
                    <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg h-40" placeholder="كل سطر منشور..." />
                    <button onClick={handleAddBulkPosts} disabled={!bulkText.trim()} className="w-full py-2 bg-slate-800 text-white rounded-lg">إضافة</button>
                </div>
              )}
            </div>
          </div>
          )}

          {postsQueue.length > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
             <div className="flex gap-4 mb-4">
                 <label className="flex items-center gap-2 font-bold"><input type="radio" name="pm" value="scheduled" checked={publishMode === 'scheduled'} onChange={() => setPublishMode('scheduled')} /> جدولة</label>
                 <label className="flex items-center gap-2 font-bold text-red-600"><input type="radio" name="pm" value="immediate" checked={publishMode === 'immediate'} onChange={() => setPublishMode('immediate')} /> نشر فوري</label>
             </div>
             {publishMode === 'scheduled' && (
                <div className="grid grid-cols-12 gap-2 mb-4 items-end">
                    <div className="col-span-6">
                        <label className="block text-xs font-bold text-slate-500 mb-1">وقت البداية</label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">الفاصل</label>
                        <input type="number" min="1" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className="w-full p-2 border rounded text-sm" placeholder="ساعات" />
                    </div>
                    <div className="col-span-3">
                        <button onClick={resetScheduleTime} className="w-full p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs flex flex-col items-center justify-center h-[38px] gap-0.5" title="ضبط للوقت الحالي + 20 دقيقة"><RotateCcw className="w-3 h-3"/> ضبط تلقائي</button>
                    </div>
                </div>
             )}
              <button onClick={handleProcess} disabled={isProcessing} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-md">
                {isProcessing ? 'جاري التنفيذ...' : `بدء العملية (${postsQueue.length})`}
              </button>
          </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[450px]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2"><List className="w-4 h-4" /> القائمة ({postsQueue.length})</h3>
                    <div className="flex gap-2">
                        {postsQueue.length > 1 && <button onClick={shuffleQueue} className="text-xs text-blue-600 hover:bg-blue-50 p-1.5 rounded flex items-center gap-1" title="خلط"><Shuffle className="w-3 h-3" /> خلط</button>}
                        {postsQueue.length > 0 && <button onClick={() => setPostsQueue([])} className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded">مسح الكل</button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {postsQueue.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm"><List className="w-12 h-12 mb-2 opacity-20" /><p>القائمة فارغة</p></div> : 
                        postsQueue.map((post, idx) => {
                            let scheduledTimeDisplay = '';
                            if (publishMode === 'scheduled' && startTime) {
                                // Calculate time using the calculated preview logic directly
                                // Here we rely on the pre-calculated times if available, or fallback to simple math for display
                                // Ideally, we should lift the 'calculatedPreviewTimes' logic up and pass it down or integrate it here.
                                // For simplicity in this display block, we'll use the tracked logic from the useEffect we added.
                                const timeStr = calculatedPreviewTimes[post.id]; 
                                if (timeStr) scheduledTimeDisplay = timeStr;
                            }
                            return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600" dir="rtl">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">مجدول فيسبوك الذكي</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
                            <div key={post.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-100 hover:border-blue-200 transition relative group">
                                <div className="mt-1 w-12 h-12 flex-shrink-0 bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                                    {post.previewUrl ? (post.type === 'video' ? <div className="relative w-full h-full"><video src={post.previewUrl} className="w-full h-full object-cover"/><div className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="w-4 h-4 text-white"/></div></div> : <img src={post.previewUrl} className="w-full h-full object-cover" />) : <FileText className="w-6 h-6 text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 line-clamp-2 font-medium">{post.isColoredBackground ? '🎨 ' : ''}{post.content || <span className="italic text-slate-400">بدون نص</span>}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-slate-500 bg-slate-200 px-1.5 rounded">{idx + 1}</p>
                                            {publishMode === 'scheduled' && scheduledTimeDisplay && <p className="text-[10px] text-blue-600 bg-blue-50 px-1.5 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> {scheduledTimeDisplay}</p>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setPreviewPost(post)} className="p-1 text-slate-400 hover:text-blue-600" title="معاينة"><Eye className="w-3 h-3"/></button>
                                            <button onClick={() => movePost(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp className="w-3 h-3"/></button>
                                            <button onClick={() => movePost(idx, 1)} disabled={idx === postsQueue.length - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown className="w-3 h-3"/></button>
                                            <button onClick={() => duplicatePost(post)} className="p-1 text-slate-400 hover:text-green-600"><Copy className="w-3 h-3"/></button>
                                            <button onClick={() => removePost(post.id)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )})
                    }
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl shadow-lg p-4 text-slate-100 h-[300px] overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-slate-700">سجل العمليات</h3>
                {logs.map((log) => (
                    <div key={log.id} className={`mb-2 p-2 rounded text-xs border-l-2 ${log.type === 'error' ? 'border-red-500 bg-red-900/20' : log.type === 'success' ? 'border-green-500 bg-green-900/20' : log.type === 'warning' ? 'border-yellow-500 bg-yellow-900/20' : 'border-blue-500 bg-slate-800'}`}>
                        <span className="opacity-50">[{log.time}]</span> {log.message}
                        {log.link && <a href={log.link} target="_blank" className="block mt-1 text-blue-400 underline hover:text-blue-300">{log.linkText}</a>}
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
    </div>
  );
  

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
  };

  if (!isLoggedIn) {
    return <Login onLogin={setIsLoggedIn} />;
  }

  return (
}

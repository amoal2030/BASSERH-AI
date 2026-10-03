import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { getPublicShareUrl, copyToClipboard, shareQuestion } from '../utils/api.ts';
import { X, Copy, Check, Share2, MessageCircle, QrCode, ExternalLink, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSlug: string;
  question: string;
  onNavigateToQuestion?: (slug: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  pageSlug,
  question,
  onNavigateToQuestion,
}) => {
  const { t, lang } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  // Use the public shared URL that never throws 403 Forbidden
  const pageUrl = getPublicShareUrl(pageSlug);

  const handleCopy = async () => {
    const success = await copyToClipboard(pageUrl);
    if (success) {
      setCopied(true);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    const res = await shareQuestion({
      title: question || 'استطلاع رأي مجهول',
      text: `شارك برأيك بصراحة وبشكل مجهول في استطلاع: "${question}"`,
      url: pageUrl,
    });
    if (res.method === 'clipboard' && res.shared) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const whatsappText = encodeURIComponent(
    `${question}\n\nشاركوني رأيكم بصراحة وبشكل مجهول عبر هذا الرابط:\n${pageUrl}`
  );
  const twitterText = encodeURIComponent(
    `${question}\n\nشاركوني رأيكم بصراحة وبشكل مجهول:\n`
  );

  // Simple clean SVG QR code visualizer using external quick chart API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    pageUrl
  )}&bgcolor=0f172a&color=ffffff&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">{t('share_modal_title')}</h3>
          <p className="mt-1 text-xs text-slate-400">{t('share_modal_desc')}</p>
        </div>

        {/* Question Snippet */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 mb-5">
          <p className="text-xs text-indigo-400 font-semibold mb-1">
            {lang === 'ar' ? 'السؤال المطروح:' : 'Question:'}
          </p>
          <p className="text-sm font-medium text-slate-200 line-clamp-2">
            "{question}"
          </p>
        </div>

        {/* URL Box & Copy Button */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 mb-3">
          <input
            type="text"
            readOnly
            value={pageUrl}
            className="w-full bg-transparent px-3 text-xs sm:text-sm text-slate-300 focus:outline-none select-all font-mono"
            dir="ltr"
          />
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t('share_copied') : t('share_copy_btn')}</span>
          </button>
        </div>

        {/* Status Banner */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 mb-3">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{lang === 'ar' ? 'رابط صفحة السؤال جاهز للمشاركة والتفاعل' : 'Question link is ready to share'}</span>
          </div>
          <button
            onClick={() => {
              onClose();
              if (onNavigateToQuestion) onNavigateToQuestion(pageSlug);
            }}
            className="text-indigo-400 hover:text-indigo-200 underline font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>{lang === 'ar' ? 'عرض الصفحة' : 'Open Page'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Action Buttons: Native Share & In-App View */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            onClick={handleNativeShare}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مشاركة عبر التطبيقات (واتساب، تليجرام...)' : 'Share via Apps (WhatsApp, Telegram...)'}</span>
          </button>

          {onNavigateToQuestion && (
            <button
              onClick={() => {
                onClose();
                onNavigateToQuestion(pageSlug);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>{lang === 'ar' ? 'فتح صفحة السؤال مباشرة هنا' : 'Open Question Page Directly Here'}</span>
            </button>
          )}
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <a
            href={`https://api.whatsapp.com/send?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>{t('share_whatsapp')}</span>
          </a>

          <a
            href={`https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 text-sky-300 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <svg className="w-3.5 h-3.5 fill-current text-sky-400" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>{t('share_twitter')}</span>
          </a>
        </div>

        {/* QR Code toggle */}
        <div className="text-center pt-2">
          <button
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>{showQr ? (lang === 'ar' ? 'إخفاء رمز QR' : 'Hide QR Code') : t('share_qr')}</span>
          </button>

          {showQr && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 inline-block">
              <img
                src={qrImageUrl}
                alt="QR Code"
                className="w-44 h-44 rounded-xl mx-auto border border-slate-800"
              />
              <p className="mt-2 text-[10px] text-slate-500">
                {lang === 'ar' ? 'امسح الكاميرا لفتح الرابط مباشرة' : 'Scan with camera to open instantly'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

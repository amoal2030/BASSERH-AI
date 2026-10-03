import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  commentId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  commentId,
}) => {
  const { t, lang } = useAuth();
  const [reason, setReason] = useState<string>('abuse');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const reasons = [
    { id: 'abuse', label: t('report_reason_abuse') },
    { id: 'threat', label: t('report_reason_threat') },
    { id: 'bullying', label: t('report_reason_bullying') },
    { id: 'inappropriate', label: t('report_reason_inappropriate') },
    { id: 'personal_info', label: t('report_reason_personal') },
    { id: 'other', label: t('report_reason_other') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">{t('report_modal_title')}</h3>
          <p className="mt-1 text-xs text-slate-400">{t('report_modal_desc')}</p>
        </div>

        {success ? (
          <div className="py-8 text-center animate-in zoom-in-95 duration-200">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-emerald-300">
              {t('report_success')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {reasons.map(r => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === r.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white font-medium'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs sm:text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                {t('report_cancel_btn')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : t('report_submit_btn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

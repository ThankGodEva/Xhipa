import React, { useState } from 'react';
import { Share2, Copy, Check, QrCode } from 'lucide-react';
import { Button } from './Button';
import { QRModal } from './QRModal';
import { useToast } from '../../context/ToastContext';

export interface ShareButtonProps {
  storeUrl: string;
  storeName: string;
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'white' | 'white-outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  qrButtonClassName?: string;
  compactOnMobile?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  storeUrl,
  storeName,
  variant = 'outline',
  size = 'md',
  className = '',
  qrButtonClassName = '',
  compactOnMobile = false
}) => {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: `Check out products from ${storeName} online:`,
          url: storeUrl
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed native share
      }
    }

    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    success('Store link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Hello! Check out our online store here: ${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const defaultQrStyles = variant === 'white-outline'
    ? 'p-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl transition cursor-pointer backdrop-blur-xs shrink-0'
    : variant === 'white'
    ? 'p-2 bg-white hover:bg-blue-50 text-blue-600 border border-transparent rounded-xl shadow-sm transition cursor-pointer shrink-0'
    : 'p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer bg-white shrink-0';

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
        <Button
          variant={variant}
          size={size}
          leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          onClick={handleShare}
          className="shrink-0"
        >
          {copied ? 'Copied' : (
            <>
              <span>Share</span>
              <span className={compactOnMobile ? 'hidden sm:inline ml-1' : 'ml-1'}>Store</span>
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={() => setShowQR(true)}
          className={qrButtonClassName || defaultQrStyles}
          title="Show QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={storeUrl}
        storeName={storeName}
      />
    </>
  );
};

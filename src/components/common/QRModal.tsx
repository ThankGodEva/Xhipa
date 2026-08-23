import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from './Modal';
import { Button } from './Button';
import { Download, Copy, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  storeName: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  url,
  storeName
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  useEffect(() => {
    if (url && isOpen) {
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(dataUrl => setQrDataUrl(dataUrl))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [url, isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    success('Store URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${storeName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Store QR Code"
      description="Print this QR code on product packaging, flyers, stickers, or display it at your store counter."
      maxWidth="sm"
    >
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 mb-5">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`${storeName} QR Code`} className="w-56 h-56 rounded-lg shadow-xs" />
        ) : (
          <div className="w-56 h-56 flex items-center justify-center text-sm text-slate-400">
            Generating QR...
          </div>
        )}
        <span className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Scan to visit store
        </span>
        <span className="text-xs text-slate-600 font-mono mt-0.5 truncate max-w-xs">{url}</span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="md"
          className="flex-1"
          leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy Link'}
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleDownload}
        >
          Download PNG
        </Button>
      </div>
    </Modal>
  );
};

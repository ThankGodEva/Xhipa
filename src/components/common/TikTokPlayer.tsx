import React, { useState } from 'react';
import { ExternalLink, Play, AlertCircle, Video } from 'lucide-react';
import { getTikTokEmbedUrl, extractTikTokVideoId } from '../../lib/utils';

interface TikTokPlayerProps {
  url: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
}

export const TikTokPlayer: React.FC<TikTokPlayerProps> = ({
  url,
  title = 'Product Video',
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);
  const embedUrl = getTikTokEmbedUrl(url);
  const videoId = extractTikTokVideoId(url);

  if (!url) return null;

  if (hasError || !embedUrl) {
    return (
      <div className={`aspect-4/5 sm:aspect-9/16 max-w-sm mx-auto bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-center text-white border border-slate-800 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <Video className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <p className="text-2xs text-slate-400 mb-4 max-w-[200px]">
          Watch this product showcase on TikTok.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
        >
          <span>Watch on TikTok</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className={`relative aspect-4/5 sm:aspect-9/16 max-w-xs mx-auto rounded-3xl overflow-hidden bg-black shadow-xl border border-slate-200 ${className}`}>
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onError={() => setHasError(true)}
      />
      <div className="absolute top-2 right-2 z-10 pointer-events-auto">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-3xs flex items-center gap-1 px-2.5 transition shadow-sm"
          title="Open in TikTok"
        >
          <span>TikTok</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};

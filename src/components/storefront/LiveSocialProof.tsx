import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, CheckCircle2 } from 'lucide-react';
import { Product } from '../../types';

interface LiveSocialProofProps {
  products: Product[];
}

export const LiveSocialProof: React.FC<LiveSocialProofProps> = ({ products }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<{
    name: string;
    location: string;
    productName: string;
    time: string;
    image: string;
  } | null>(null);

  const buyers = [
    { name: 'Blessing O.', location: 'Lekki, Lagos' },
    { name: 'Khadijah A.', location: 'Maitama, Abuja' },
    { name: 'Ngozi E.', location: 'Port Harcourt' },
    { name: 'Folake S.', location: 'Ikeja, Lagos' },
    { name: 'Emeka U.', location: 'Enugu' }
  ];

  useEffect(() => {
    if (!products || products.length === 0) return;

    const showRandomNotification = () => {
      const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomTime = `${Math.floor(Math.random() * 8) + 2} minutes ago`;

      setCurrentNotification({
        name: randomBuyer.name,
        location: randomBuyer.location,
        productName: randomProduct.name,
        time: randomTime,
        image: randomProduct.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=120'
      });

      setIsVisible(true);

      // Hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5500);
    };

    // Initial trigger after 4 seconds
    const initialTimeout = setTimeout(showRandomNotification, 4000);

    // Interval every 25 seconds
    const interval = setInterval(showRandomNotification, 25000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [products]);

  if (!isVisible || !currentNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-slate-200/80 animate-slide-up flex items-center gap-3 select-none">
      <img
        src={currentNotification.image}
        alt="Product thumbnail"
        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
      />
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-2xs text-slate-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{currentNotification.name} from {currentNotification.location}</span>
        </p>
        <p className="text-xs font-bold text-slate-900 truncate">
          Purchased {currentNotification.productName}
        </p>
        <p className="text-3xs text-slate-400 font-medium">{currentNotification.time}</p>
      </div>

      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="p-1 text-slate-400 hover:text-slate-700 transition"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

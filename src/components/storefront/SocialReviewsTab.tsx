import React, { useState } from 'react';
import { CheckCircle2, ThumbsUp, MessageSquare, ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { Business } from '../../types';

interface SocialReviewsTabProps {
  business: Business;
}

export const SocialReviewsTab: React.FC<SocialReviewsTabProps> = ({ business }) => {
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  const reviews = [
    {
      id: 'rev-1',
      name: 'Amara Nwosu',
      location: 'Lekki Phase 1, Lagos',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      date: '3 days ago',
      productBought: '20% Vitamin C Radiance Serum',
      verified: true,
      text: 'Literally the best serum I have used! My acne spots are almost invisible after 2 weeks of consistent use. The texture is lightweight and absorbs immediately without making my face oily.',
      likesCount: 19,
      photos: [
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'
      ]
    },
    {
      id: 'rev-2',
      name: 'Blessing Adebayo',
      location: 'Maitama, Abuja',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
      date: '1 week ago',
      productBought: 'Organic Golden Marula Glow Body Oil',
      verified: true,
      text: 'Delivery to Abuja took only 2 days! The packaging is top tier with bubble wrap and cute thank-you notes. The glow oil smells heavenly and keeps my skin hydrated all day long.',
      likesCount: 27,
      photos: [
        'https://images.unsplash.com/photo-1608248597359-07f2a74c3e7b?w=400'
      ]
    },
    {
      id: 'rev-3',
      name: 'Chinedu Eze',
      location: 'Ikeja GRA, Lagos',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
      date: '2 weeks ago',
      productBought: 'Clarifying Tea Tree & Green Tea Face Cleanser',
      verified: true,
      text: 'My girlfriend recommended this cleanser to me for beard breakout issues. It cleared my irritation within 4 days. Very mild and does not sting at all.',
      likesCount: 14,
      photos: []
    }
  ];

  const handleToggleHelpful = (id: string) => {
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Customer Feedback Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Heart className="w-7 h-7 fill-emerald-600 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Customer Feedback & Stories</h3>
            <p className="text-xs text-slate-500">Real thoughts and experiences from verified shoppers</p>
            <div className="flex items-center gap-2 mt-1.5 text-2xs font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Genuine Buyer Experiences</span>
            </div>
          </div>
        </div>

        {business.whatsapp_number && (
          <a
            href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
              `Hi ${business.name}, I want to share my feedback on my recent order!`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition shadow-xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Feedback on WhatsApp</span>
          </a>
        )}
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {reviews.map(rev => {
          const isHelpful = Boolean(likes[rev.id]);
          return (
            <div
              key={rev.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* User Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{rev.name}</span>
                        {rev.verified && (
                          <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified Order
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-slate-400">{rev.location} • {rev.date}</p>
                    </div>
                  </div>
                </div>

                {/* Purchased product tag */}
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-3xs font-semibold">
                  Ordered: {rev.productBought}
                </span>

                {/* Review Text */}
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  "{rev.text}"
                </p>

                {/* Photos if any */}
                {rev.photos.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {rev.photos.map((p, idx) => (
                      <img
                        key={idx}
                        src={p}
                        alt="Customer upload"
                        className="w-20 h-20 rounded-xl object-cover border border-slate-100 shadow-2xs"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Helpful Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <span>Was this helpful?</span>
                <button
                  type="button"
                  onClick={() => handleToggleHelpful(rev.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    isHelpful
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{rev.likesCount + (isHelpful ? 1 : 0)}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

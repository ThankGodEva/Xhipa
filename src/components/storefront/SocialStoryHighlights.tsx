import React from 'react';
import { Sparkles, Star, Package, HelpCircle, Heart, Flame } from 'lucide-react';
import { Business, Product, StoryHighlightGroup } from '../../types';

interface SocialStoryHighlightsProps {
  business: Business;
  products: Product[];
  stories?: StoryHighlightGroup[];
  onOpenStory: (group: StoryHighlightGroup) => void;
}

export const SocialStoryHighlights: React.FC<SocialStoryHighlightsProps> = ({
  business,
  products,
  stories,
  onOpenStory
}) => {
  const p1 = products[0];
  const p2 = products[1];
  const p3 = products[2];

  const defaultHighlights: StoryHighlightGroup[] = [
    {
      id: 'reviews',
      title: 'Reviews',
      coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
      unread: true,
      slides: [
        {
          id: 'rev-1',
          title: '⭐️⭐️⭐️⭐️⭐️ "My skin is glowing!"',
          subtitle: 'Amara from Lekki: "Within 2 weeks of using the Vitamin C serum, my dark spots visibly cleared up."',
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
          tag: 'Customer Glow',
          product: p1
        },
        {
          id: 'rev-2',
          title: 'Pure Hydration Glow ✨',
          subtitle: 'Blessing from Abuja: "The Marula body oil is light, non-sticky and smells so divine!"',
          image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
          tag: 'Real Results',
          product: p2
        }
      ]
    },
    {
      id: 'unboxing',
      title: 'Packaging',
      coverImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200',
      unread: true,
      slides: [
        {
          id: 'unbox-1',
          title: 'Eco-Luxury Packaging 🌿',
          subtitle: 'Every order is carefully bubble-wrapped with aesthetic satin ribbons & surprise samples.',
          image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800',
          tag: 'Behind The Scenes'
        },
        {
          id: 'unbox-2',
          title: 'Same Day Dispatch in Lagos 🚚',
          subtitle: 'Orders placed before 2 PM are packed and handed to dispatchers immediately.',
          image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
          tag: 'Fast Delivery'
        }
      ]
    },
    {
      id: 'bestsellers',
      title: 'Top Drops',
      coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200',
      unread: false,
      slides: [
        {
          id: 'best-1',
          title: 'Viral 20% Vitamin C Serum 🍊',
          subtitle: 'Formulated with L-ascorbic acid, ferulic acid & pure hyaluronic booster.',
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
          tag: 'Most Popular',
          product: p1
        },
        {
          id: 'best-2',
          title: 'Golden Marula Body Oil ✨',
          subtitle: 'Cold-pressed wild harvested botanical oil for silky 24hr moisture.',
          image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800',
          tag: 'Trending',
          product: p2
        }
      ]
    },
    {
      id: 'routine',
      title: 'How To Use',
      coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200',
      unread: false,
      slides: [
        {
          id: 'rout-1',
          title: 'Step 1: Gentle Cleanser',
          subtitle: 'Wash with lukewarm water and our Tea Tree cleanser for 60 seconds.',
          image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
          tag: 'Morning Routine',
          product: p3
        },
        {
          id: 'rout-2',
          title: 'Step 2: 3 Drops of Radiance',
          subtitle: 'Pat gently onto damp face & neck before moisturizer and sunscreen.',
          image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800',
          tag: 'Pro Tip',
          product: p1
        }
      ]
    },
    {
      id: 'shipping',
      title: 'FAQs & Delivery',
      coverImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200',
      unread: false,
      slides: [
        {
          id: 'faq-1',
          title: 'Nationwide Delivery Timeline 📦',
          subtitle: 'Lagos: 24–48 Hours. Other States: 2–4 Business Days via DHL / GIG Logistics.',
          image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
          tag: 'Delivery Info'
        },
        {
          id: 'faq-2',
          title: 'Payment & Guarantees 🛡️',
          subtitle: 'Pay via Card, Bank Transfer, or request payment on dispatch confirmation.',
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
          tag: 'Safe Shopping'
        }
      ]
    }
  ];

  const highlights = (stories && stories.length > 0) ? stories : defaultHighlights;

  return (
    <div className="w-full py-4 border-b border-slate-100 bg-white/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-1">
          {highlights.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenStory(item)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer"
            >
              <div
                className={`p-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                  item.unread
                    ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-500 shadow-sm'
                    : 'bg-slate-200 group-hover:bg-slate-300'
                }`}
              >
                <div className="p-0.5 bg-white rounded-full">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-2xs font-semibold text-slate-700 max-w-[70px] truncate text-center group-hover:text-slate-900">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Eye,
  Check,
  RefreshCw,
  Package,
  Layers,
  ChevronRight,
  HelpCircle,
  Link,
  Edit2,
  Upload,
  Loader2,
  Cloud,
  EyeOff
} from 'lucide-react';
import { api } from '../../lib/api';
import { Product, StoryHighlightGroup, StorySlide } from '../../types';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { StoryViewerModal } from '../storefront/StoryViewerModal';

interface StoreStoriesManagerProps {
  products?: Product[];
}

export const STARTER_HIGHLIGHTS_TEMPLATES: StoryHighlightGroup[] = [
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
        tag: 'Customer Glow'
      },
      {
        id: 'rev-2',
        title: 'Pure Hydration Glow ✨',
        subtitle: 'Blessing from Abuja: "The Marula body oil is light, non-sticky and smells so divine!"',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
        tag: 'Real Results'
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
        tag: 'Most Popular'
      },
      {
        id: 'best-2',
        title: 'Golden Marula Body Oil ✨',
        subtitle: 'Cold-pressed wild harvested botanical oil for silky 24hr moisture.',
        image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800',
        tag: 'Trending'
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
        tag: 'Morning Routine'
      },
      {
        id: 'rout-2',
        title: 'Step 2: 3 Drops of Radiance',
        subtitle: 'Pat gently onto damp face & neck before moisturizer and sunscreen.',
        image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800',
        tag: 'Pro Tip'
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

export const StoreStoriesManager: React.FC<StoreStoriesManagerProps> = ({ products = [] }) => {
  const [stories, setStories] = useState<StoryHighlightGroup[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<string | null>(null);
  const [previewStory, setPreviewStory] = useState<StoryHighlightGroup | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const slideFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const { success, error } = useToast();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMerchantStories();
      setStories(data || []);
      if (data && data.length > 0) {
        setActiveStoryIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to load merchant stories:', err);
      error(err.message || 'Failed to load storefront stories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updated = await api.updateMerchantStories(stories);
      setStories(updated || []);
      if (updated && updated.length > 0) {
        success('Storefront stories updated and live on your store!');
      } else {
        success('Stories removed. Stories & highlights are now hidden on your storefront.');
      }
    } catch (err: any) {
      console.error('Failed to save stories:', err);
      error(err.message || 'Failed to save storefront stories');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStory = stories[activeStoryIndex] || null;

  const updateCurrentStory = (updater: (prev: StoryHighlightGroup) => StoryHighlightGroup) => {
    setStories(prev => {
      const next = [...prev];
      if (next[activeStoryIndex]) {
        next[activeStoryIndex] = updater(next[activeStoryIndex]);
      }
      return next;
    });
  };

  const handleAddStory = () => {
    const newStory: StoryHighlightGroup = {
      id: `story_${Date.now()}`,
      title: `Highlight ${stories.length + 1}`,
      coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
      unread: true,
      slides: [
        {
          id: `slide_${Date.now()}`,
          title: 'Welcome to our story',
          subtitle: 'Share an update, product demo, or customer spotlight here.',
          image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
          tag: 'New Update'
        }
      ]
    };
    const nextStories = [...stories, newStory];
    setStories(nextStories);
    setActiveStoryIndex(nextStories.length - 1);
  };

  const handleDeleteStory = (idx: number) => {
    const storyToDelete = stories[idx];
    if (window.confirm(`Are you sure you want to delete highlight "${storyToDelete?.title || 'this story'}"?`)) {
      const nextStories = stories.filter((_, i) => i !== idx);
      setStories(nextStories);
      if (activeStoryIndex >= nextStories.length) {
        setActiveStoryIndex(Math.max(0, nextStories.length - 1));
      }
    }
  };

  const handleAddSlide = () => {
    if (!currentStory) return;
    const newSlide: StorySlide = {
      id: `slide_${Date.now()}`,
      title: 'New Story Slide',
      subtitle: 'Add a helpful tip, announcement, or review here.',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
      tag: 'New Update'
    };
    updateCurrentStory(s => ({
      ...s,
      slides: [...s.slides, newSlide]
    }));
  };

  const handleUpdateSlide = (slideIndex: number, field: keyof StorySlide, value: any) => {
    updateCurrentStory(s => {
      const slides = [...s.slides];
      slides[slideIndex] = {
        ...slides[slideIndex],
        [field]: value
      };
      // If updating product_id, associate product object
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        slides[slideIndex].product = prod;
      }
      return { ...s, slides };
    });
  };

  const handleDeleteSlide = (slideIndex: number) => {
    if (!currentStory || currentStory.slides.length <= 1) {
      error('A story highlight must have at least 1 slide.');
      return;
    }
    updateCurrentStory(s => {
      const slides = s.slides.filter((_, idx) => idx !== slideIndex);
      return { ...s, slides };
    });
  };

  const handleLoadStarterTemplates = () => {
    setStories(STARTER_HIGHLIGHTS_TEMPLATES);
    setActiveStoryIndex(0);
    success('Loaded 5 starter story templates! Click "Save Stories" to publish them to your store.');
  };

  const handleClearAll = () => {
    if (window.confirm('Disable and remove all story highlights? They will be hidden from your storefront once saved.')) {
      setStories([]);
      setActiveStoryIndex(0);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xs flex items-center justify-center min-h-[260px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading Storefront Stories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-500 rounded-2xl text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Storefront Stories & Highlights</h3>
              {stories.length === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Hidden by Default
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active ({stories.length} Highlights)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {stories.length === 0
                ? 'Stories and highlights are hidden on your storefront until you add and publish them.'
                : 'Manage the Instagram-style story bubbles displayed at the top of your public storefront.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewStory(currentStory)}
              leftIcon={<Eye className="w-4 h-4 text-slate-600" />}
            >
              Preview
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Empty State / Hidden Default State */}
      {stories.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50/80 rounded-3xl border border-slate-200/80 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
            <EyeOff className="w-7 h-7 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900">No Stories or Highlights Published</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your public storefront currently has stories and highlights disabled. You can populate 5 starter templates (Reviews, Packaging, Top Drops, How To, FAQs) or create your own custom highlight.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleLoadStarterTemplates}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Load Starter Templates (5 Stories)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleAddStory}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Highlight
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Highlights Navigation Pills */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Story to Edit ({stories.length} Highlights)
              </label>
              <button
                type="button"
                onClick={handleAddStory}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Highlight</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stories.map((story, idx) => {
                const isSelected = activeStoryIndex === idx;
                return (
                  <button
                    key={story.id || idx}
                    type="button"
                    onClick={() => setActiveStoryIndex(idx)}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center relative ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div
                      className={`p-0.5 rounded-full mb-1.5 transition-transform duration-200 ${
                        story.unread
                          ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    >
                      <div className="p-0.5 bg-white rounded-full">
                        <img
                          src={story.coverImage}
                          alt={story.title}
                          className="w-11 h-11 rounded-full object-cover"
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200';
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-full">
                      {story.title || `Story ${idx + 1}`}
                    </span>
                    <span className="text-2xs text-slate-500 mt-0.5">
                      {story.slides?.length || 0} {story.slides?.length === 1 ? 'slide' : 'slides'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Story Highlight Form */}
          {currentStory && (
            <div className="bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-800 text-2xs font-bold uppercase">
                    Editing Story #{activeStoryIndex + 1}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">{currentStory.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentStory.unread ?? true}
                      onChange={e => updateCurrentStory(s => ({ ...s, unread: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-medium text-slate-700">Highlight with colourful gradient ring</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteStory(activeStoryIndex)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Story</span>
                  </button>
                </div>
              </div>

              {/* Highlight Top-level Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Story Title / Tab Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentStory.title}
                    onChange={e => updateCurrentStory(s => ({ ...s, title: e.target.value }))}
                    placeholder="e.g. Reviews, Packaging, Top Drops"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Cover Thumbnail Image <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingMedia('cover');
                      try {
                        const res = await api.uploadMedia(file, { folder: 'stories' });
                        updateCurrentStory(s => ({ ...s, coverImage: res.url }));
                        success('Story cover uploaded successfully');
                      } catch (err: any) {
                        error(err.message || 'Failed to upload cover');
                      } finally {
                        setIsUploadingMedia(null);
                        if (coverFileInputRef.current) coverFileInputRef.current.value = '';
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      required
                      value={currentStory.coverImage}
                      onChange={e => updateCurrentStory(s => ({ ...s, coverImage: e.target.value }))}
                      placeholder="https://... or upload photo"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingMedia === 'cover'}
                      onClick={() => coverFileInputRef.current?.click()}
                      className="shrink-0 text-xs gap-1.5"
                    >
                      {isUploadingMedia === 'cover' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingMedia === 'cover' ? 'Uploading...' : 'Upload'}</span>
                    </Button>
                    <div className="w-9 h-9 rounded-full shrink-0 border border-slate-300 overflow-hidden bg-slate-100">
                      <img
                        src={currentStory.coverImage}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Slides List Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Story Slides ({currentStory.slides?.length || 0})
                    </h4>
                    <p className="text-2xs text-slate-500">
                      Customers view these slides full-screen in sequence with auto-advancing progress bars
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSlide}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Slide
                  </Button>
                </div>

                <div className="space-y-4">
                  {currentStory.slides.map((slide, slideIdx) => (
                    <div
                      key={slide.id || slideIdx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-2xs font-bold flex items-center justify-center">
                            {slideIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {slide.title || `Slide ${slideIdx + 1}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSlide(slideIdx)}
                          title="Delete this slide"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-2xs font-semibold text-slate-700 mb-1">
                            Slide Headline <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={slide.title}
                            onChange={e => handleUpdateSlide(slideIdx, 'title', e.target.value)}
                            placeholder="e.g. ⭐️⭐️⭐️⭐️⭐️ Real Customer Result"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs font-semibold text-slate-700 mb-1">
                            Badge Tag (Optional)
                          </label>
                          <input
                            type="text"
                            value={slide.tag || ''}
                            onChange={e => handleUpdateSlide(slideIdx, 'tag', e.target.value)}
                            placeholder="e.g. Customer Glow, Fast Delivery, Pro Tip"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-slate-700 mb-1">
                          Subtitle / Story Note
                        </label>
                        <textarea
                          rows={2}
                          value={slide.subtitle || ''}
                          onChange={e => handleUpdateSlide(slideIdx, 'subtitle', e.target.value)}
                          placeholder="Add helpful context or a quote..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-2xs font-semibold text-slate-700 mb-1">
                            Slide Media / Photo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            ref={el => (slideFileInputRefs.current[slideIdx] = el)}
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingMedia(`slide_${slideIdx}`);
                              try {
                                const res = await api.uploadMedia(file, { folder: 'stories' });
                                handleUpdateSlide(slideIdx, 'image', res.url);
                                success('Slide photo uploaded successfully');
                              } catch (err: any) {
                                error(err.message || 'Failed to upload photo');
                              } finally {
                                setIsUploadingMedia(null);
                                if (slideFileInputRefs.current[slideIdx]) {
                                  slideFileInputRefs.current[slideIdx]!.value = '';
                                }
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={slide.image}
                              onChange={e => handleUpdateSlide(slideIdx, 'image', e.target.value)}
                              placeholder="https://... or upload photo"
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                            <button
                              type="button"
                              disabled={isUploadingMedia === `slide_${slideIdx}`}
                              onClick={() => slideFileInputRefs.current[slideIdx]?.click()}
                              title="Upload image from device"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0 disabled:opacity-50"
                            >
                              {isUploadingMedia === `slide_${slideIdx}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="w-8 h-8 rounded-lg shrink-0 border border-slate-200 overflow-hidden bg-slate-100">
                              <img
                                src={slide.image}
                                alt="Slide Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-2xs font-semibold text-slate-700 mb-1">
                            Link to Store Product (Optional)
                          </label>
                          <select
                            value={slide.product_id || slide.product?.id || ''}
                            onChange={e => handleUpdateSlide(slideIdx, 'product_id', e.target.value || undefined)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="">-- No product linked --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleLoadStarterTemplates}
                className="text-xs text-slate-400 hover:text-slate-600 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset to Starter Templates
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disable & Clear All Stories
              </button>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSaveAll}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Stories ({stories.length} Highlights)
            </Button>
          </div>
        </>
      )}

      {/* Interactive Story Viewer Modal */}
      {previewStory && (
        <StoryViewerModal
          isOpen={Boolean(previewStory)}
          onClose={() => setPreviewStory(null)}
          highlightGroup={previewStory}
          business={{
            id: 'biz_preview',
            name: 'Store Preview',
            slug: 'preview',
            currency: 'NGN',
            status: 'active',
            created_at: '',
            updated_at: ''
          }}
          settings={{
            id: 'set_preview',
            business_id: 'biz_preview',
            primary_color: '#10B981',
            enable_checkout: true,
            enable_catalogue: true,
            show_whatsapp: true,
            show_logo: true,
            show_phone: true,
            show_social_links: true,
            created_at: '',
            updated_at: ''
          }}
          storeSlug="preview"
        />
      )}
    </div>
  );
};

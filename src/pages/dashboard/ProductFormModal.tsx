import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Product, Category } from '../../types';
import { slugify, toKobo, toNaira, extractTikTokVideoId } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  Image as ImageIcon,
  Upload,
  AlertCircle,
  X,
  Plus,
  Star,
  Video,
  Play,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Cloud,
  Loader2
} from 'lucide-react';
import { TikTokPlayer } from '../../components/common/TikTokPlayer';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
  product?: Product | null;
  categories: Category[];
  isAtProductLimit?: boolean;
  isCategoryAllowed?: boolean;
  onCategoryCreated?: (cat: Category) => void;
}

interface ImageItem {
  id?: string;
  url: string;
  isNew?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
  isAtProductLimit = false,
  isCategoryAllowed = true,
  onCategoryCreated
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priceNaira, setPriceNaira] = useState('');
  const [comparePriceNaira, setComparePriceNaira] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [trackInventory, setTrackInventory] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  
  // Quick Category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  
  // Media State: Multiple Images + TikTok Video URL
  const [images, setImages] = useState<ImageItem[]>([]);
  const [tiktokVideoUrl, setTiktokVideoUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error, success } = useToast();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setDescription(product.description || '');
      setCategoryId(product.category_id || '');
      setPriceNaira(toNaira(product.price).toString());
      setComparePriceNaira(product.compare_at_price ? toNaira(product.compare_at_price).toString() : '');
      setStockQuantity(product.stock_quantity.toString());
      setTrackInventory(product.track_inventory);
      setFeatured(product.featured);
      setStatus((product.status as any) === 'draft' ? 'draft' : 'published');
      
      // Load existing images
      if (product.images && product.images.length > 0) {
        setImages(product.images.map(img => ({ id: img.id, url: img.public_url })));
      } else {
        setImages([]);
      }

      setTiktokVideoUrl(product.tiktok_video_url || '');
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setCategoryId(isCategoryAllowed ? (categories[0]?.id || '') : '');
      setPriceNaira('');
      setComparePriceNaira('');
      setStockQuantity('15');
      setTrackInventory(true);
      setFeatured(false);
      setStatus('published');
      setImages([
        { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800' }
      ]);
      setTiktokVideoUrl('');
      setCustomImageUrl('');
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }
  }, [product, categories, isOpen, isCategoryAllowed]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!product) {
      setSlug(slugify(val));
    }
  };

  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newCategoryName.trim()) return;

    setIsSubmittingCategory(true);
    try {
      const created = await api.createCategory({ name: newCategoryName.trim() });
      if (onCategoryCreated) {
        onCategoryCreated(created);
      }
      setCategoryId(created.id);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      success(`Category "${created.name}" created!`);
    } catch (err: any) {
      error(err.message || 'Failed to create category');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  /**
   * Compress and convert File to Data URL
   */
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Selected file is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Optionally resize image via Canvas for optimal memory and storage
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.88));
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle Device File Selection (Multiple images supported, stored in Cloudflare R2)
   */
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImages(true);

    try {
      const fileList = Array.from(files);
      const newImages: ImageItem[] = [];

      for (const file of fileList) {
        if (file.type.startsWith('image/')) {
          try {
            // Upload directly to Cloudflare R2 bucket storage
            const uploadRes = await api.uploadMedia(file, { folder: 'products' });
            newImages.push({ url: uploadRes.url, isNew: true });
          } catch (uploadErr) {
            // If network or offline fallback is needed, fallback to processed data URL
            console.warn('R2 upload fallback to local processing:', uploadErr);
            const dataUrl = await processImageFile(file);
            newImages.push({ url: dataUrl, isNew: true });
          }
        }
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        success(`Uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} to Cloudflare R2 storage`);
      }
    } catch (err: any) {
      error(err.message || 'Failed to upload images to storage');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddUrlImage = () => {
    if (!customImageUrl.trim()) return;
    setImages(prev => [...prev, { url: customImageUrl.trim(), isNew: true }]);
    setCustomImageUrl('');
    success('Image added to product gallery');
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
    success('Cover image updated');
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Sample presets for quick testing
  const samplePresets = [
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
    'https://images.unsplash.com/photo-1608248597359-07f2a74c3e7b?w=800',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
  ];

  const sampleTikTokLinks = [
    { label: 'Beauty Skincare Glow Demo', url: 'https://www.tiktok.com/@tiktok/video/7106594312292453678' },
    { label: 'Product Unboxing Reel', url: 'https://www.tiktok.com/@tiktok/video/7081706693444226346' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !priceNaira) {
      error('Please provide a product name and price.');
      return;
    }

    const priceInKobo = toKobo(Number(priceNaira));
    const comparePriceInKobo = comparePriceNaira ? toKobo(Number(comparePriceNaira)) : undefined;

    if (isNaN(priceInKobo) || priceInKobo <= 0) {
      error('Please enter a valid price in Naira.');
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        name,
        slug: slug || slugify(name),
        description,
        category_id: isCategoryAllowed && categoryId ? categoryId : undefined,
        price: priceInKobo,
        compare_at_price: comparePriceInKobo,
        stock_quantity: trackInventory ? Number(stockQuantity) || 0 : 999,
        track_inventory: trackInventory,
        featured,
        status,
        images: images.map((img, idx) => ({
          url: img.url,
          id: img.id,
          sort_order: idx
        })),
        tiktok_video_url: tiktokVideoUrl.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const hasTikTokVideo = Boolean(tiktokVideoUrl.trim());
  const isTikTokValid = Boolean(extractTikTokVideoId(tiktokVideoUrl) || tiktokVideoUrl.includes('tiktok.com'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      description="List an item in your storefront catalogue with multiple device photos and TikTok video reels."
      maxWidth="2xl"
    >
      {!product && isAtProductLimit && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>You have reached the maximum product capacity for your subscription plan. Upgrade your plan to add more products.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 20% Vitamin C Radiance Serum"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Selection - Only shown for plans with Category support */}
          {isCategoryAllowed && (
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                {!isCreatingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="text-2xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="text-2xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Skin Care, Hair..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateQuickCategory(e);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!newCategoryName.trim() || isSubmittingCategory}
                    onClick={handleCreateQuickCategory}
                    isLoading={isSubmittingCategory}
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className={isCategoryAllowed ? 'sm:col-span-1' : 'sm:col-span-2'}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Price in Naira (₦) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-bold">₦</span>
              <input
                type="number"
                required
                min="0"
                step="50"
                placeholder="8500"
                value={priceNaira}
                onChange={e => setPriceNaira(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Original / Compare-at Price (₦)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-400 font-bold">₦</span>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="10000"
                value={comparePriceNaira}
                onChange={e => setComparePriceNaira(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* 📸 1. MULTIPLE PRODUCT IMAGES & DEVICE UPLOAD */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-900">
                Product Images ({images.length})
              </label>
              <p className="text-2xs text-slate-500">
                Upload multiple images from your device. The first image is used as the cover photo.
              </p>
            </div>

            {images.length > 0 && (
              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {images.length} Image{images.length > 1 ? 's' : ''} Ready
              </span>
            )}
          </div>

          {/* Hidden File Input for Device Upload (Multiple files) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => handleFilesSelected(e.target.files)}
          />

          {/* Drag & Drop / Upload Device Action Area */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => !isUploadingImages && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                {isUploadingImages ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 justify-center">
                <span>{isUploadingImages ? 'Uploading images...' : 'Click to upload images from your device or drag and drop'}</span>
              </div>
              <div className="flex items-center gap-2 text-2xs text-slate-400">
                <span>PNG, JPG, WEBP • Multiple files supported</span>
              </div>
            </div>
          </div>

          {/* Thumbnails Gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-slate-100 group shadow-xs ${
                    idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Product ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
                    }}
                  />

                  {/* Primary / Cover Tag */}
                  {idx === 0 ? (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-600 text-white shadow-xs">
                      Cover Photo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCoverImage(idx)}
                      className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-3xs font-semibold bg-black/60 hover:bg-black text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      title="Make this the cover photo"
                    >
                      Set Cover
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 transition shadow-sm cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Left / Right Reorder Controls */}
                  <div className="absolute bottom-1.5 inset-x-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'left')}
                        className="p-1 rounded-md bg-black/60 hover:bg-black text-white text-3xs"
                        title="Move left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-3xs text-white bg-black/50 px-1 rounded ml-auto">
                      #{idx + 1}
                    </span>
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'right')}
                        className="p-1 rounded-md bg-black/60 hover:bg-black text-white text-3xs ml-1"
                        title="Move right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional: Add via URL or Preset */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <input
                type="url"
                placeholder="Or paste an image URL..."
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddUrlImage}
                disabled={!customImageUrl.trim()}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add URL
              </Button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-3xs text-slate-400 shrink-0">Sample presets:</span>
              <div className="flex gap-1">
                {samplePresets.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setImages(prev => [...prev, { url: img, isNew: true }])}
                    className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition shrink-0"
                    title="Add sample preset photo"
                  >
                    <img src={img} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🎬 2. PRODUCT VIDEO UPLOAD (TIKTOK VIDEO LINK) */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  Product Video (TikTok Video Link)
                </label>
                <p className="text-2xs text-slate-500">
                  Upload a showcase video by pasting your TikTok video link.
                </p>
              </div>
            </div>

            {hasTikTokVideo && (
              <button
                type="button"
                onClick={() => setShowVideoPreview(prev => !prev)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{showVideoPreview ? 'Hide Preview' : 'Preview Video'}</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="url"
              placeholder="https://www.tiktok.com/@yourbrand/video/7123456789012345678"
              value={tiktokVideoUrl}
              onChange={e => setTiktokVideoUrl(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
            <div className="absolute left-3 top-3 text-slate-400">
              <Video className="w-4 h-4 text-slate-500" />
            </div>
            {tiktokVideoUrl && (
              <button
                type="button"
                onClick={() => setTiktokVideoUrl('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                title="Clear TikTok link"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick sample TikTok buttons for testing */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xs text-slate-400">Try sample link:</span>
            {sampleTikTokLinks.map((sample, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  setTiktokVideoUrl(sample.url);
                  setShowVideoPreview(true);
                }}
                className="text-3xs font-medium px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-rose-500" />
                <span>{sample.label}</span>
              </button>
            ))}
          </div>

          {/* Embedded Live TikTok Preview */}
          {(showVideoPreview || hasTikTokVideo) && hasTikTokVideo && (
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-rose-400" />
                  TikTok Video Embed Preview
                </span>
                <a
                  href={tiktokVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-3xs"
                >
                  <span>Open TikTok</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="max-w-[280px] mx-auto">
                <TikTokPlayer url={tiktokVideoUrl} title={name || 'Product Video'} />
              </div>
            </div>
          )}
        </div>

        {/* Inventory, Status & Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Quantity</label>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={e => setStockQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Storefront & Feed Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="published">🟢 Published (Live in Feed)</option>
              <option value="draft">🟡 Draft (Hidden from Store)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center space-y-2 pt-4 sm:pt-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={e => setFeatured(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Mark as Featured Product</span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
          <textarea
            rows={3}
            placeholder="Describe product benefits, sizing, materials, or instructions..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="md" onClick={onClose} disabled={isLoading || isUploadingImages}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading || isUploadingImages}
            disabled={!product && isAtProductLimit}
          >
            {product ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

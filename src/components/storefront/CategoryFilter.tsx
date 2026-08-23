import React from 'react';
import { Sparkles, Grid, Tag } from 'lucide-react';
import { Category } from '../../types';

export interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  primaryColor?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  primaryColor = '#10B981'
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="py-3 bg-white/70 backdrop-blur-xs border-b border-slate-100 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            selectedCategoryId === null
              ? 'bg-slate-900 text-white shadow-sm scale-[1.02]'
              : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>All Items</span>
        </button>

        {categories.map(cat => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'text-white shadow-sm scale-[1.02]'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900'
              }`}
              style={isSelected ? { backgroundColor: primaryColor } : {}}
            >
              <Tag className="w-3.5 h-3.5 opacity-80" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

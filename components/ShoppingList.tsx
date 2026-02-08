import React, { useState, useMemo } from 'react';
import { Ingredient } from '../types';
import { Plus, Check, Trash2, ShoppingBag, Tag } from 'lucide-react';

interface ShoppingListProps {
  items: Ingredient[];
  onToggleItem: (name: string) => void;
  onAddItem: (item: Ingredient) => void;
  onClearList: () => void;
}

interface MergedItem {
  name: string;
  category: string;
  quantities: string[];
  sourceRecipes: string[];
  checked: boolean;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onToggleItem, onAddItem, onClearList }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  // Merge duplicates based on name
  const mergedItems = useMemo(() => {
    const map = new Map<string, MergedItem>();
    
    items.forEach(item => {
      // Use exact name for grouping to match toggle behavior in App.tsx
      const key = item.name;
      
      if (!map.has(key)) {
        map.set(key, {
          name: item.name,
          category: item.category,
          quantities: [item.quantity],
          sourceRecipes: item.sourceRecipe ? [item.sourceRecipe] : [],
          checked: !!item.checked
        });
      } else {
        const existing = map.get(key)!;
        existing.quantities.push(item.quantity);
        if (item.sourceRecipe && !existing.sourceRecipes.includes(item.sourceRecipe)) {
          existing.sourceRecipes.push(item.sourceRecipe);
        }
        // If duplicates exist, App.tsx syncs their checked state, so we take the current item's state
      }
    });

    return Array.from(map.values());
  }, [items]);

  const activeMerged = mergedItems.filter(i => !i.checked);
  const checkedMerged = mergedItems.filter(i => i.checked);

  // Group active items by category
  const categorizedItems = useMemo(() => {
    const groups: Record<string, MergedItem[]> = {};
    activeMerged.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [activeMerged]);

  const activeCategories = Object.keys(categorizedItems).sort();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    onAddItem({
      name: newItemName,
      quantity: newItemQty || '1',
      category: 'Other',
      checked: false,
      sourceRecipe: 'Manual Add'
    });
    setNewItemName('');
    setNewItemQty('');
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 transition-colors duration-200">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Add Item
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name (e.g., Milk)"
            className="w-full sm:flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          />
          <div className="flex gap-2 sm:contents">
            <input
                type="text"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="Qty"
                className="flex-1 sm:w-24 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
            />
            <button 
                type="submit"
                className="bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shrink-0"
            >
                <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        {activeCategories.map(category => {
          const catItems = categorizedItems[category];
          if (catItems.length === 0) return null;

          return (
            <div key={category} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 flex justify-between">
                {category}
                <span className="text-slate-400 dark:text-slate-500 text-xs font-normal mt-1">{catItems.length} items</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {catItems.map((item, idx) => (
                  <div 
                    key={`${item.name}-${idx}`} 
                    onClick={() => onToggleItem(item.name)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group gap-2 sm:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 transition-colors shrink-0"></div>
                      <div className="flex-1">
                          <span className="text-slate-700 dark:text-slate-200 block font-medium">{item.name}</span>
                          {item.sourceRecipes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {item.sourceRecipes.map(recipe => (
                                    <span key={recipe} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                        <Tag className="w-3 h-3 mr-1 opacity-70" />
                                        {recipe}
                                    </span>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-sm ml-8 sm:ml-0 whitespace-nowrap">
                        {item.quantities.join(' + ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {activeMerged.length === 0 && items.length > 0 && checkedMerged.length > 0 && (
            <div className="text-center py-8 text-green-600 dark:text-green-400 font-medium">
                All items purchased! Great job.
            </div>
        )}

        {items.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                Your shopping list is empty. Generate a meal plan to fill it up!
            </div>
        )}

        {checkedMerged.length > 0 && (
          <div className="opacity-60 mt-8">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-4 px-2">Purchased Items</h3>
            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {checkedMerged.map((item, idx) => (
                    <div 
                        key={`checked-${item.name}-${idx}`} 
                        onClick={() => onToggleItem(item.name)}
                        className="p-4 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600">{item.name}</span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-600 text-sm line-through">
                            {item.quantities.length > 1 ? `${item.quantities.length} items` : item.quantities[0]}
                        </span>
                    </div>
                    ))}
                </div>
            </div>
            <button 
                onClick={onClearList}
                className="mt-4 flex items-center gap-2 text-red-500 dark:text-red-400 text-sm font-medium hover:text-red-700 dark:hover:text-red-300 px-2"
            >
                <Trash2 className="w-4 h-4" /> Clear list
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;

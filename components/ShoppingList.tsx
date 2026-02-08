import React, { useState, useMemo } from 'react';
import { Ingredient } from '../types';
import { Plus, Check, Trash2, ShoppingBag } from 'lucide-react';

interface ShoppingListProps {
  items: Ingredient[];
  onToggleItem: (name: string) => void;
  onAddItem: (item: Ingredient) => void;
  onClearList: () => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onToggleItem, onAddItem, onClearList }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  // Group items by category
  const categorizedItems = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  const activeCategories = Object.keys(categorizedItems).sort();
  const checkedItems = items.filter(i => i.checked);
  const activeItemsCount = items.length - checkedItems.length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    onAddItem({
      name: newItemName,
      quantity: newItemQty || '1',
      category: 'Other',
      checked: false
    });
    setNewItemName('');
    setNewItemQty('');
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 transition-colors duration-200">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Add Item
        </h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name (e.g., Milk)"
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          />
          <input
            type="text"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            placeholder="Qty"
            className="w-20 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          />
          <button 
            type="submit"
            className="bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {activeCategories.map(category => {
          const catItems = categorizedItems[category].filter(i => !i.checked);
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
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 group-hover:border-indigo-500 dark:group-hover:border-indigo-400 transition-colors"></div>
                      <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-sm">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {activeItemsCount === 0 && items.length > 0 && checkedItems.length > 0 && (
            <div className="text-center py-8 text-green-600 dark:text-green-400 font-medium">
                All items purchased! Great job.
            </div>
        )}

        {activeItemsCount === 0 && items.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                Your shopping list is empty. Generate a meal plan to fill it up!
            </div>
        )}

        {checkedItems.length > 0 && (
          <div className="opacity-60 mt-8">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-4 px-2">Purchased Items</h3>
            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {checkedItems.map((item, idx) => (
                    <div 
                        key={`checked-${item.name}-${idx}`} 
                        onClick={() => onToggleItem(item.name)}
                        className="p-4 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600">{item.name}</span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-600 text-sm line-through">{item.quantity}</span>
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
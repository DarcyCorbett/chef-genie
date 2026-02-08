import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import { Clock, CheckSquare, Square, ChevronDown, ChevronUp, RefreshCw, ChefHat, Check } from 'lucide-react';

interface RecipeListProps {
  recipes: Recipe[];
  selectedRecipeIds: string[];
  onToggleSelect: (id: string) => void;
  onRegenerate: (options: string[]) => void;
  isRegenerating: boolean;
  onCommit: () => void;
}

const REGEN_OPTIONS = [
  'Make more kid friendly',
  'Make it vegetarian',
  'More protein',
  'Different cuisine',
  'Quick and easy',
  'Budget friendly',
  'Surprise me'
];

const RecipeList: React.FC<RecipeListProps> = ({ 
  recipes, 
  selectedRecipeIds, 
  onToggleSelect, 
  onRegenerate,
  isRegenerating,
  onCommit
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['Different cuisine']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  if (recipes.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 dark:text-slate-500">
        <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-xl">No recipes generated yet. Adjust settings above and click Generate!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-4 z-10 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedRecipeIds.length} Selected</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">for regeneration</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
            {/* Multi-select Dropdown */}
            <div className="relative w-full sm:w-64" ref={dropdownRef}>
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={isRegenerating}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <span className="truncate">
                        {selectedOptions.length === 0 
                        ? "Select options" 
                        : `${selectedOptions.length} selected`}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {REGEN_OPTIONS.map(opt => (
                            <label key={opt} className="flex items-center gap-2 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedOptions.includes(opt) ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {selectedOptions.includes(opt) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={selectedOptions.includes(opt)}
                                    onChange={() => toggleOption(opt)}
                                />
                                <span className="text-slate-700 dark:text-slate-200 text-sm">{opt}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

          <button
            onClick={() => onRegenerate(selectedOptions)}
            disabled={selectedRecipeIds.length === 0 || isRegenerating || selectedOptions.length === 0}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white transition-colors w-full sm:w-auto ${
              selectedRecipeIds.length === 0 || isRegenerating || selectedOptions.length === 0
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-500'
                : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {recipes.map((recipe) => (
          <div 
            key={recipe.id} 
            className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-200 ${
              selectedRecipeIds.includes(recipe.id) 
                ? 'border-indigo-500 ring-1 ring-indigo-500 dark:border-indigo-400 dark:ring-indigo-400' 
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="p-4 flex items-start gap-4">
              <button 
                onClick={() => onToggleSelect(recipe.id)}
                className="mt-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 -ml-1"
              >
                {selectedRecipeIds.includes(recipe.id) 
                  ? <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> 
                  : <Square className="w-6 h-6" />}
              </button>

              <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(recipe.id)}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                             <span className="inline-block px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 rounded-md">
                                Day {recipe.day} • {recipe.mealType}
                            </span>
                            {(recipe.prepTime || recipe.cookTime) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md">
                                    <Clock className="w-3 h-3" />
                                    {recipe.prepTime && <span>Prep: {recipe.prepTime}</span>}
                                    {recipe.prepTime && recipe.cookTime && <span>•</span>}
                                    {recipe.cookTime && <span>Cook: {recipe.cookTime}</span>}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{recipe.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-1">{recipe.description}</p>
                    </div>
                    {expandedId === recipe.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
            </div>

            {expandedId === recipe.id && (
              <div className="px-4 pb-4 pl-4 md:pl-14 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl">
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm uppercase tracking-wide">Ingredients</h4>
                    <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 mt-1.5 shrink-0"></span>
                            <span>{ing.quantity} {ing.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm uppercase tracking-wide">Instructions</h4>
                    <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-decimal pl-4">
                      {recipe.instructions.map((step, idx) => (
                        <li key={idx} className="pl-1">{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
       <div className="mt-8 p-6 bg-indigo-900 dark:bg-slate-900 border dark:border-indigo-900 rounded-xl text-center text-white">
            <h3 className="text-xl font-bold mb-2">Happy with this plan?</h3>
            <p className="text-indigo-200 dark:text-slate-400 mb-4">Clicking done will add these recipes to your history and save your favorites.</p>
            <button 
                onClick={onCommit}
                className="bg-white dark:bg-indigo-600 text-indigo-900 dark:text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500 transition-colors shadow-lg w-full sm:w-auto"
            >
                Done! Add to History
            </button>
        </div>
    </div>
  );
};

export default RecipeList;
import React, { useMemo, useState } from 'react';
import { HistoryItem } from '../types';
import { Star, Search, Calendar, LayoutGrid, List, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface RecipeHistoryProps {
  history: HistoryItem[];
  onToggleStar: (id: string) => void;
}

const RecipeHistory: React.FC<RecipeHistoryProps> = ({ history, onToggleStar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    return history
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Sort by starred status (true first), then by date (newest first)
        if (a.isStarred === b.isStarred) {
             return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        }
        return a.isStarred ? -1 : 1;
      });
  }, [history, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 dark:text-slate-500">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-xl">No history yet. Complete a meal plan to see it here!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
            <input
                type="text"
                placeholder="Search your cookbook..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors"
            />
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
        </div>
        
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="Grid View"
            >
                <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="List View"
            >
                <List className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
        {filteredHistory.map((item) => (
            <div 
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden ${
                   viewMode === 'list' ? '' : 'flex flex-col'
                } ${expandedId === item.id ? 'ring-2 ring-indigo-500 border-indigo-500 dark:border-indigo-400 dark:ring-indigo-400' : ''}`}
            >
                {/* Header Section */}
                <div 
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 ${viewMode === 'list' ? 'items-center' : 'items-start h-full'}`}
                >
                    <div className="flex-1" onClick={() => toggleExpand(item.id)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{item.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                     <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                                        {item.mealType}
                                     </span>
                                     <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.prepTime || '-'} / {item.cookTime || '-'}
                                     </span>
                                </div>
                            </div>
                            {viewMode === 'grid' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleStar(item.id); }}
                                    className={`p-2 rounded-full transition-colors ${item.isStarred ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Star className={`w-6 h-6 transition-colors ${item.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} />
                                </button>
                            )}
                        </div>
                        {viewMode === 'grid' && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{item.description}</p>
                        )}
                    </div>
                    
                    {viewMode === 'list' && (
                         <div className="flex items-center gap-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onToggleStar(item.id); }}
                                className={`p-2 rounded-full transition-colors ${item.isStarred ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Star className={`w-5 h-5 transition-colors ${item.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} />
                            </button>
                            <button onClick={() => toggleExpand(item.id)}>
                                {expandedId === item.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </button>
                         </div>
                    )}
                </div>

                {/* Expanded Section */}
                {expandedId === item.id && (
                    <div className="px-4 pb-4 pt-0 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                        <div className="mt-4 grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs uppercase tracking-wide">Ingredients</h4>
                                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                    {item.ingredients?.map((ing, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 mt-1.5 shrink-0"></span>
                                        <span>{ing.quantity} {ing.name}</span>
                                    </li>
                                    )) || <li className="text-slate-400 italic">Details not available</li>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs uppercase tracking-wide">Instructions</h4>
                                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-decimal pl-4">
                                    {item.instructions?.map((step, idx) => (
                                    <li key={idx} className="pl-1">{step}</li>
                                    )) || <li className="text-slate-400 italic">Details not available</li>}
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>
      
      {filteredHistory.length === 0 && (
          <p className="text-center text-slate-400 dark:text-slate-500 mt-10">No recipes found matching "{searchTerm}"</p>
      )}
    </div>
  );
};

export default RecipeHistory;
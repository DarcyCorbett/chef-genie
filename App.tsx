import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Ingredient, HistoryItem, GenerationSettings } from './types';
import { generateMealPlan, regenerateRecipes } from './services/geminiService';
import { syncService } from './services/syncService';
import RecipeList from './components/RecipeList';
import ShoppingList from './components/ShoppingList';
import RecipeHistory from './components/RecipeHistory';
import { Utensils, ShoppingCart, BookHeart, Sparkles, ChevronDown, Check, Cloud, CloudOff, LogOut, Key, CloudUpload, CloudDownload, Edit2 } from 'lucide-react';

const GUIDELINE_OPTIONS = [
  'Kid Friendly', 'Healthy', 'Vegetarian', 'Mediterranean', 'Asian', 'Mexican', 
  'Italian', 'Quick & Easy', 'Budget Friendly', 'Extravagant', 'No Cook'
];

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'plan' | 'shop' | 'history'>('plan');
  
  // Auto-generate sync code on first load if missing to remove friction
  const [syncCode, setSyncCode] = useState<string | null>(() => {
    let code = syncService.getUserId();
    if (!code) {
       code = 'CHEF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
       syncService.setUserId(code);
    }
    return code;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null); // Feedback text
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [tempSyncCode, setTempSyncCode] = useState('');

  // Ref to track if the current update came from the cloud to prevent loops
  const isRemoteUpdate = useRef(false);

  const [settings, setSettings] = useState<GenerationSettings>({
    days: 5,
    meals: { breakfast: false, lunch: false, dinner: true },
    guidelines: []
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [shoppingList, setShoppingList] = useState<Ingredient[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('chefGenieHistory');
    try { return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuidelineDropdownOpen, setIsGuidelineDropdownOpen] = useState(false);
  const guidelineDropdownRef = useRef<HTMLDivElement>(null);

  // --- Initial Load & Sync Subscription ---
  useEffect(() => {
    if (!syncCode) return;

    // Subscribe to real-time updates
    const unsubscribe = syncService.subscribeToData((cloudData) => {
      // Flag this as a remote update so we don't push it back
      isRemoteUpdate.current = true;
      
      setHistory(cloudData.history || []);
      setShoppingList(cloudData.shoppingList || []);
      if (cloudData.recipes) {
        setRecipes(cloudData.recipes);
      }
      
      setSyncStatus("Synced!");
      setTimeout(() => setSyncStatus(null), 2000);
    });

    return () => unsubscribe();
  }, [syncCode]);

  // --- Persistence & Auto-Push ---
  useEffect(() => {
    localStorage.setItem('chefGenieHistory', JSON.stringify(history));
    
    // Auto-push to cloud if logged in (debounced slightly to prevent spam)
    if (syncCode) {
      // If this change was triggered by a remote update, do not push back
      if (isRemoteUpdate.current) {
         isRemoteUpdate.current = false;
         return;
      }

      const timeoutId = setTimeout(() => {
        syncService.pushData({ history, shoppingList, recipes });
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [history, shoppingList, recipes, syncCode]);

  // Handle Manual Pull (still useful for forcing, but less critical with subscription)
  const handleManualPull = async () => {
    setIsSyncing(true);
    setSyncStatus("Checking cloud...");
    const cloudData = await syncService.pullData();
    if (cloudData) {
      isRemoteUpdate.current = true; // Prevent loop
      setHistory(cloudData.history || []);
      setShoppingList(cloudData.shoppingList || []);
      if (cloudData.recipes) {
        setRecipes(cloudData.recipes);
      }
      setSyncStatus("Updated from cloud!");
    } else {
      setSyncStatus("Sync ready.");
    }
    setTimeout(() => setSyncStatus(null), 3000);
    setIsSyncing(false);
  };

  const handleManualPush = async () => {
    setIsSyncing(true);
    setSyncStatus("Saving...");
    const success = await syncService.pushData({ history, shoppingList, recipes });
    if (success) setSyncStatus("Saved to cloud!");
    else setSyncStatus("Save failed.");
    setTimeout(() => setSyncStatus(null), 3000);
    setIsSyncing(false);
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempSyncCode.trim()) {
      syncService.setUserId(tempSyncCode.trim());
      setSyncCode(tempSyncCode.trim());
      setShowSyncModal(false);
    }
  };

  const handleLogout = () => {
    syncService.logout();
    setSyncCode(null);
  };

  // --- Handlers: Generation ---
  const handleGenerate = async () => {
    if (settings.days < 1 || settings.days > 14) {
        setError("Please choose between 1 and 14 days.");
        return;
    }
    if (!settings.meals.breakfast && !settings.meals.lunch && !settings.meals.dinner) {
        setError("Please select at least one meal type.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const newRecipes = await generateMealPlan(settings.days, settings.meals, settings.guidelines, history);
      setRecipes(newRecipes);
      setSelectedRecipeIds([]);
      
      // Flatten ingredients and add source recipe name
      const newIngredients = newRecipes.flatMap(r => 
        r.ingredients.map(i => ({...i, checked: false, sourceRecipe: r.name}))
      );
      setShoppingList(newIngredients);
    } catch (e: any) {
      console.error(e);
      if (e.toString().includes('403') || e.toString().includes('leaked') || e.message?.includes('PERMISSION_DENIED')) {
         setError("API Error: The configured API Key has been reported as leaked or invalid. Please update your environment variables with a valid key.");
      } else {
         setError("Failed to generate recipes. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (options: string[], customInstruction?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const updatedRecipes = await regenerateRecipes(recipes, selectedRecipeIds, options, customInstruction);
      setRecipes(updatedRecipes);
      setSelectedRecipeIds([]);
      
      const newIngredients = updatedRecipes.flatMap(r => 
        r.ingredients.map(i => ({...i, sourceRecipe: r.name}))
      );
      
      // Preserve checked state if item name exists
      setShoppingList(prevList => {
          const checkedMap = new Set(prevList.filter(i => i.checked).map(i => i.name));
          return newIngredients.map(ing => ({ 
            ...ing, 
            checked: checkedMap.has(ing.name) 
          }));
      });
    } catch (e: any) {
       console.error(e);
       if (e.toString().includes('403') || e.toString().includes('leaked')) {
         setError("API Error: API Key invalid or leaked. Please check your configuration.");
       } else {
         setError("Failed to regenerate recipes.");
       }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGuideline = (option: string) => {
    setSettings(prev => ({
        ...prev,
        guidelines: prev.guidelines.includes(option) ? prev.guidelines.filter(g => g !== option) : [...prev.guidelines, option]
    }));
  };

  const toggleRecipeSelection = (id: string) => {
    setSelectedRecipeIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleCommitToHistory = () => {
    const existingNames = new Set(history.map(h => h.name.toLowerCase()));
    
    // Filter out duplicates based on name to prevent adding the same recipe twice
    const newHistoryItems: HistoryItem[] = recipes
        .filter(r => !existingNames.has(r.name.toLowerCase()))
        .map(r => ({
            ...r,
            originalId: r.id,
            id: r.id + Date.now(), // Create a unique ID for the history item
            isStarred: false,
            dateAdded: new Date().toISOString()
        }));
    
    if (newHistoryItems.length < recipes.length) {
        // Optional: Notify user that duplicates were skipped, or just silently handle it
        console.log("Skipped duplicate recipes");
    }

    setHistory(prev => [...prev, ...newHistoryItems]);
    setActiveTab('history'); 
  };

  const toggleHistoryStar = (id: string) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, isStarred: !item.isStarred } : item));
  };

  const toggleShoppingItem = (name: string) => {
    setShoppingList(prev => prev.map(item => item.name === name ? { ...item, checked: !item.checked } : item));
  };

  const addShoppingItem = (item: Ingredient) => setShoppingList(prev => [...prev, item]);
  const clearShoppingList = () => setShoppingList([]);

  // --- Helper Components ---
  const NavButton = ({ tab, icon: Icon, label, showBadge = false, badgeCount = 0 }: any) => (
      <button onClick={() => setActiveTab(tab)} className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
        <Icon className="w-5 h-5" />
        <span className="hidden md:inline">{label}</span>
        {showBadge && badgeCount > 0 && (
            <span className="bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 md:top-0 md:right-0 md:relative">
                {badgeCount}
            </span>
        )}
      </button>
  );

  const MobileNavButton = ({ tab, icon: Icon, label, showBadge = false, badgeCount = 0 }: any) => (
      <button onClick={() => setActiveTab(tab)} className={`relative flex flex-col items-center justify-center py-2 flex-1 transition-colors ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>
        <div className={`p-1.5 rounded-full ${activeTab === tab ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''}`}>
             <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-medium mt-1">{label}</span>
        {showBadge && badgeCount > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5 border-2 border-white dark:border-slate-900">
                {badgeCount}
            </span>
        )}
      </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200 pt-6 md:pt-0 h-auto min-h-[4rem]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg shadow-md">
                <Utensils className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
              ChefGenie
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sync Status Button */}
            <button 
              onClick={() => setShowSyncModal(true)}
              className={`p-2 rounded-full transition-all relative ${syncCode ? 'text-green-500 bg-green-50 dark:bg-green-950/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}
              title={syncCode ? "Cloud Sync Active" : "Click to Sync Devices"}
            >
              {syncCode ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              {syncCode && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
            </button>

            <nav className="hidden md:flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <NavButton tab="plan" icon={Utensils} label="Meal Plan" />
                <NavButton tab="shop" icon={ShoppingCart} label="Shop" showBadge={true} badgeCount={shoppingList.filter(i => !i.checked).length} />
                <NavButton tab="history" icon={BookHeart} label="Cookbook" />
            </nav>
          </div>
        </div>
      </header>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Cloud className="w-6 h-6 text-indigo-500" />
                    Cloud Sync
                </h2>
                <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
             </div>
             
             {syncCode ? (
                <div className="space-y-4 text-center">
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900">
                        <p className="text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">Active Family Code</p>
                        <p className="text-2xl font-mono font-bold mt-1 text-slate-800 dark:text-slate-100">{syncCode}</p>
                    </div>
                    
                    <p className="text-xs text-slate-500">
                        Sync is active! Use this code on other devices to share your meal plan and cookbook.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={handleManualPush}
                            disabled={isSyncing}
                            className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            <CloudUpload className={`w-6 h-6 ${isSyncing ? 'animate-bounce' : ''}`} />
                            <span className="text-xs font-bold">Save to Cloud</span>
                        </button>
                        <button 
                            onClick={handleManualPull}
                            disabled={isSyncing}
                            className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            <CloudDownload className={`w-6 h-6 ${isSyncing ? 'animate-bounce' : ''}`} />
                            <span className="text-xs font-bold">Load from Cloud</span>
                        </button>
                    </div>

                    {syncStatus && (
                        <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                            {syncStatus}
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
                        >
                            <Edit2 className="w-4 h-4" /> Change / Join Family Code
                        </button>
                    </div>
                </div>
             ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-sm text-slate-500">Enter a specific Family Code to sync with another device, or generate a new one.</p>
                    <div className="relative">
                        <Key className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Enter family code..."
                            value={tempSyncCode}
                            onChange={(e) => setTempSyncCode(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                        />
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors"
                    >
                        Connect
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                             const code = 'CHEF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                             syncService.setUserId(code);
                             setSyncCode(code);
                        }}
                        className="w-full py-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium"
                    >
                        Generate New Code
                    </button>
                </form>
             )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 pb-24 md:pb-6">
        {activeTab === 'plan' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="grid md:grid-cols-4 gap-6 items-end">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Days to Plan</label>
                  <input type="number" min="1" max="14" value={settings.days} onChange={(e) => setSettings({...settings, days: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meals per Day</label>
                        <div className="flex flex-wrap gap-3">
                            {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                            <label key={meal} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                                <input type="checkbox" checked={settings.meals[meal]} onChange={(e) => setSettings({ ...settings, meals: { ...settings.meals, [meal]: e.target.checked }})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
                                <span className="capitalize text-slate-700 dark:text-slate-200 font-medium">{meal}</span>
                            </label>
                            ))}
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Guidelines</label>
                         <div className="relative" ref={guidelineDropdownRef}>
                             <button onClick={() => setIsGuidelineDropdownOpen(!isGuidelineDropdownOpen)} className="w-full flex items-center justify-between px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                 <span className="truncate">{settings.guidelines.length === 0 ? "Any (No restrictions)" : `${settings.guidelines.length} selected`}</span>
                                 <ChevronDown className={`w-4 h-4 transition-transform ${isGuidelineDropdownOpen ? 'rotate-180' : ''}`} />
                             </button>
                             {isGuidelineDropdownOpen && (
                                 <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                     {GUIDELINE_OPTIONS.map(opt => (
                                         <label key={opt} className="flex items-center gap-2 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                                             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${settings.guidelines.includes(opt) ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                 {settings.guidelines.includes(opt) && <Check className="w-3.5 h-3.5 text-white" />}
                                             </div>
                                             <input type="checkbox" className="hidden" checked={settings.guidelines.includes(opt)} onChange={() => toggleGuideline(opt)} />
                                             <span className="text-slate-700 dark:text-slate-200 text-sm">{opt}</span>
                                         </label>
                                     ))}
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
                <div className="md:col-span-1">
                  <button onClick={handleGenerate} disabled={isGenerating} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    {isGenerating ? <><Sparkles className="w-5 h-5 animate-spin" /><span>Thinking...</span></> : <><Sparkles className="w-5 h-5" /><span>Generate</span></>}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">{error}</p>}
            </div>
            <RecipeList recipes={recipes} selectedRecipeIds={selectedRecipeIds} onToggleSelect={toggleRecipeSelection} onRegenerate={handleRegenerate} isRegenerating={isGenerating} onCommit={handleCommitToHistory} />
          </div>
        )}
        {activeTab === 'shop' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ShoppingList items={shoppingList} onToggleItem={toggleShoppingItem} onAddItem={addShoppingItem} onClearList={clearShoppingList} /></div>}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-6 rounded-xl mb-8 flex items-start gap-4">
                 <BookHeart className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
                 <div>
                     <h2 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg">My Cookbook</h2>
                     <p className="text-indigo-700 dark:text-slate-400 mt-1">Starred recipes sync across all your devices using your cloud profile.</p>
                 </div>
             </div>
            <RecipeHistory history={history} onToggleStar={toggleHistoryStar} />
          </div>
        )}
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-1 px-4 flex justify-between z-40">
         <MobileNavButton tab="plan" icon={Utensils} label="Meal Plan" />
         <MobileNavButton tab="shop" icon={ShoppingCart} label="Shop" showBadge={true} badgeCount={shoppingList.filter(i => !i.checked).length} />
         <MobileNavButton tab="history" icon={BookHeart} label="Cookbook" />
      </nav>
    </div>
  );
};

export default App;

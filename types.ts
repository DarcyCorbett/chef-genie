export interface Ingredient {
  name: string;
  quantity: string;
  category: string; // e.g., "Produce", "Meat", "Dairy", "Pantry"
  checked?: boolean;
  sourceRecipe?: string; // Tag to identify which recipe this belongs to
}

export interface Nutrition {
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  day: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  nutrition: Nutrition;
}

export interface HistoryItem extends Recipe {
  isStarred: boolean;
  dateAdded: string;
  originalId: string;
}

export interface GenerationSettings {
  days: number;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  guidelines: string[];
  adults: number;
  kids: number;
}

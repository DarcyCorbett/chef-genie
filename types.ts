export interface Ingredient {
  name: string;
  quantity: string;
  category: string; // e.g., "Produce", "Meat", "Dairy", "Pantry"
  checked?: boolean;
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
}

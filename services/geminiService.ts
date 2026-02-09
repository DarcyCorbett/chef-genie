import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe, HistoryItem } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ingredientSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    quantity: { type: Type.STRING },
    category: { 
      type: Type.STRING, 
      description: "One of: Produce, Meat, Dairy, Bakery, Frozen, Pantry, Beverages, Household, Other" 
    },
  },
  required: ["name", "quantity", "category"],
};

const nutritionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.STRING, description: "e.g. 500 kcal" },
    protein: { type: Type.STRING, description: "e.g. 25g" },
    carbs: { type: Type.STRING, description: "e.g. 40g" },
    fats: { type: Type.STRING, description: "e.g. 15g" },
  },
  required: ["calories", "protein", "carbs", "fats"]
};

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "A unique random string ID for this recipe" },
    name: { type: Type.STRING },
    description: { type: Type.STRING, description: "A short appetizing description" },
    day: { type: Type.INTEGER },
    mealType: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner"] },
    prepTime: { type: Type.STRING, description: "Preparation time (e.g., '15 mins')" },
    cookTime: { type: Type.STRING, description: "Cooking time (e.g., '30 mins')" },
    nutrition: nutritionSchema,
    ingredients: {
      type: Type.ARRAY,
      items: ingredientSchema,
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["id", "name", "day", "mealType", "ingredients", "instructions", "prepTime", "cookTime", "nutrition"],
};

const mealPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: recipeSchema,
    },
  },
  required: ["recipes"],
};

export const generateMealPlan = async (
  days: number, 
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean },
  guidelines: string[],
  starredRecipes: HistoryItem[],
  adults: number,
  kids: number
): Promise<Recipe[]> => {
  const mealTypes = [];
  if (meals.breakfast) mealTypes.push("Breakfast");
  if (meals.lunch) mealTypes.push("Lunch");
  if (meals.dinner) mealTypes.push("Dinner");

  // Filter favorites to only include recipes that match the meal types currently being generated
  const compatibleFavorites = starredRecipes.filter(r => {
    // Only include if the meal type matches one of the active checkboxes
    const typeKey = r.mealType.toLowerCase() as keyof typeof meals;
    return meals[typeKey] === true && r.isStarred;
  }).map(r => r.name);
    
  // Pick random count between 0 and 3 (inclusive)
  const countToPick = Math.floor(Math.random() * 4);
  const selectedFavorites = compatibleFavorites.sort(() => 0.5 - Math.random()).slice(0, countToPick);

  let specificInstructions = "";
  if (guidelines.includes('Chef Made')) {
      specificInstructions += "For 'Chef Made' recipes, create gourmet, restaurant-quality dishes with detailed steps and comprehensive ingredient lists. ";
  }

  const prompt = `
    Generate a meal plan for ${days} days.
    Include the following meal types for each day: ${mealTypes.join(", ")}.
    
    Portion each recipe for ${adults} adults and ${kids} children.
    
    Dietary Guidelines & Preferences: ${guidelines.length > 0 ? guidelines.join(", ") : "None specified"}.
    ${specificInstructions}
    
    IMPORTANT: Use METRIC units (grams, milliliters, celsius) for all measurements.
    
    ${selectedFavorites.length > 0 ? `You MUST include these ${selectedFavorites.length} favorite recipes (or extremely close variations) in the plan: ${selectedFavorites.join(", ")}. IMPORTANT: For these specific favorite recipes, IGNORE the dietary guidelines provided above and generate them in their traditional/classic style, but adjusted for the requested portion sizes.` : ""}

    Ensure the shopping list categories are accurate.
    Provide nutrition facts for every recipe.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealPlanSchema,
      },
    });

    const data = JSON.parse(response.text || "{ recipes: [] }");
    return data.recipes || [];
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw error;
  }
};

export const regenerateRecipes = async (
  currentRecipes: Recipe[],
  recipeIdsToRegenerate: string[],
  options: string[],
  customInstruction?: string
): Promise<Recipe[]> => {
  
  const recipesToKeep = currentRecipes.filter(r => !recipeIdsToRegenerate.includes(r.id));
  const recipesToChange = currentRecipes.filter(r => recipeIdsToRegenerate.includes(r.id));

  if (recipesToChange.length === 0) return currentRecipes;

  let promptInstruction = options.join(", ");
  if (customInstruction) {
    promptInstruction += `. Additional specific instruction: ${customInstruction}`;
  }

  const prompt = `
    I have a list of recipes. I want to REGENERATE specific recipes based on these instructions: "${promptInstruction}".
    
    IMPORTANT: Use METRIC units (grams, milliliters, celsius) for all measurements.

    Here are the recipes to regenerate (keep the same Day and Meal Type, but change the dish):
    ${JSON.stringify(recipesToChange.map(r => ({ day: r.day, mealType: r.mealType, oldName: r.name })))}

    Please return a valid JSON object containing ONLY the new versions of these specific recipes. 
    Use the same schema as before, including nutrition info.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealPlanSchema,
      },
    });

    const data = JSON.parse(response.text || "{ recipes: [] }");
    const newRecipes = data.recipes || [];

    // Merge kept recipes with new recipes, re-sorting by day and meal type
    const allRecipes = [...recipesToKeep, ...newRecipes];
    
    // Sort helper
    const typeOrder = { "Breakfast": 1, "Lunch": 2, "Dinner": 3 };
    
    return allRecipes.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return typeOrder[a.mealType] - typeOrder[b.mealType];
    });

  } catch (error) {
    console.error("Error regenerating recipes:", error);
    throw error;
  }
};

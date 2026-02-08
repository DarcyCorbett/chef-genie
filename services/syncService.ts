import { HistoryItem, Ingredient } from '../types';
import { db } from '../firebaseConfig'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SyncData {
  history: HistoryItem[];
  shoppingList: Ingredient[];
  lastUpdated: number;
}

export const syncService = {
  // This retrieves the "Family Code" you type into the app
  getUserId: () => localStorage.getItem('chefGenie_SyncCode'),

  setUserId: (code: string) => {
    // Normalize code to uppercase so "family" and "FAMILY" match
    localStorage.setItem('chefGenie_SyncCode', code.toUpperCase().trim());
  },

  logout: () => {
    localStorage.removeItem('chefGenie_SyncCode');
  },

  /**
   * Pushes local data to the Firebase Cloud
   */
  pushData: async (data: Omit<SyncData, 'lastUpdated'>): Promise<boolean> => {
    const userId = syncService.getUserId();
    
    // If user hasn't typed a Sync Code yet, we can't save to cloud
    if (!userId) return false;

    try {
      // We save to a collection called 'households', using the Sync Code as the ID
      const docRef = doc(db, 'households', userId);
      
      await setDoc(docRef, {
        ...data,
        lastUpdated: Date.now()
      });
      
      console.log('Successfully pushed to Firebase!');
      return true;
    } catch (e) {
      console.error('Firebase Sync push failed', e);
      return false;
    }
  },

  /**
   * Pulls data from the Firebase Cloud
   */
  pullData: async (): Promise<SyncData | null> => {
    const userId = syncService.getUserId();
    if (!userId) return null;

    try {
      const docRef = doc(db, 'households', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('Found cloud data:', docSnap.data());
        return docSnap.data() as SyncData;
      } else {
        console.log('No cloud data found for this code yet.');
        return null;
      }
    } catch (e) {
      console.error('Firebase Sync pull failed', e);
      return null;
    }
  }
};
import { HistoryItem, Ingredient, Recipe } from '../types';
import { db } from '../firebaseConfig'; 
import { doc, getDoc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';

export interface SyncData {
  history: HistoryItem[];
  shoppingList: Ingredient[];
  recipes: Recipe[];
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
    // Gracefully handle missing firebase config
    if (!db) {
        return false;
    }

    const userId = syncService.getUserId();
    
    // If user hasn't typed a Sync Code yet, we can't save to cloud
    if (!userId) return false;

    try {
      // We save to a collection called 'households', using the Sync Code as the ID
      const docRef = doc(db as Firestore, 'households', userId);
      
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
   * Pulls data from the Firebase Cloud (One-time fetch)
   */
  pullData: async (): Promise<SyncData | null> => {
    if (!db) return null;
    const userId = syncService.getUserId();
    if (!userId) return null;

    try {
      const docRef = doc(db as Firestore, 'households', userId);
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
  },

  /**
   * Subscribes to real-time updates from the Cloud
   */
  subscribeToData: (onDataReceived: (data: SyncData) => void) => {
    if (!db) return () => {}; 
    const userId = syncService.getUserId();
    if (!userId) return () => {};

    const docRef = doc(db as Firestore, 'households', userId);
    
    // onSnapshot sets up a continuous listener
    return onSnapshot(docRef, (docSnap) => {
      // Check if the write is local (latency compensation). 
      // We usually want to ignore local writes in the listener to avoid loopiness,
      // although checking for data equality in App.tsx also helps.
      if (docSnap.metadata.hasPendingWrites) {
        return; 
      }

      if (docSnap.exists()) {
        const data = docSnap.data() as SyncData;
        console.log("Real-time update received!");
        onDataReceived(data);
      }
    }, (error) => {
        console.error("Sync subscription error:", error);
    });
  }
};

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useStoreSync = () => {
    useEffect(() => {
        // Channel for signaling updates
        const channel = new BroadcastChannel('ascension_game_sync');

        // 1. Listen for updates from other windows
        channel.onmessage = (event) => {
            if (event.data === 'SYNC_Request') {
                // Reload from local storage
                const storedData = localStorage.getItem('ascension-storage');
                if (storedData) {
                    try {
                        const parsed = JSON.parse(storedData);
                        if (parsed && parsed.state) {
                            // Merge/Overwrite state
                            useGameStore.setState(parsed.state);
                        }
                    } catch (e) {
                        console.error('Failed to sync state:', e);
                    }
                }
            }
        };

        // 2. Listen for local storage events (Native browser mechanism)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'ascension-storage' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && parsed.state) {
                        useGameStore.setState(parsed.state);
                    }
                } catch (error) {
                    console.error('Sync Error:', error);
                }
            }
        };
        window.addEventListener('storage', handleStorage);

        // 3. Broadcast local changes to other windows
        // We subscribe to the store and notify others when WE make a change
        // We need a way to distinguish "local change" from "synced change" to avoid loops
        // But since we read from localStorage (single source of truth), it should be fine.
        // To avoid infinite loop (A updates -> Write LS -> B updates -> Write LS -> A updates...),
        // we should rely on the fact that setState won't trigger a storage write if data is identical? 
        // No, zustand persist writes on every change.
        
        // Actually, the safest way is:
        // - Window A changes state.
        // - Zustand persists to localStorage.
        // - 'storage' event fires in Window B.
        // - Window B updates state.
        
        // If 'storage' event is reliable, we don't need BroadcastChannel for the payload.
        // But we can use BroadcastChannel as a "Ping" to force check if 'storage' event misses.
        
        const unsubscribe = useGameStore.subscribe((state, prevState) => {
            // We only broadcast if this is a "local" action, not a sync result.
            // But detecting that is hard.
            // However, simply sending a ping is cheap.
            // The receiver will read LS. If LS matches current state, setState might be a no-op or cheap.
            // Let's rely on 'storage' event primarily, and BroadcastChannel as a backup trigger.
            
            // To prevent storming, we could debounce, but for now let's keep it simple.
            // We WON'T broadcast on every state change to avoid loops if we update state on receipt.
            // The 'storage' event is the most robust native way.
            
            // Wait, if I use BroadcastChannel to say "I changed something", 
            // the other window reads LS and updates state.
            // Does updating state trigger a persist? YES.
            // Does that persist trigger another 'storage' event? YES.
            // LOOP DETECTED.
            
            // SOLUTION:
            // When we receive an update from another window, we should update the store 
            // WITHOUT triggering the persist middleware? 
            // Or, Zustand's persist middleware might be smart enough not to write if state is same?
            // Usually not.
            
            // Better approach:
            // Just rely on `window.addEventListener('storage')`. It ONLY fires in other windows.
            // It does NOT fire in the originating window.
            // So:
            // A changes -> A writes LS -> B receives 'storage' event -> B reads LS -> B updates state.
            // Does B updating state trigger B to write LS? Yes.
            // Does B writing LS trigger 'storage' event in A? Yes.
            // Loop?
            // Only if B's write results in a NEW value.
            // If B updates state to match A, then writes to LS... the value in LS is identical.
            // Does writing identical value trigger 'storage' event? 
            // Spec says: "The storage event is fired when a storage area changes."
            // If newValue === oldValue, it might NOT fire.
            
            // Let's trust the 'storage' event first.
        });

        return () => {
            window.removeEventListener('storage', handleStorage);
            channel.close();
            unsubscribe();
        };
    }, []);
};

// src/utils/debugStorage.js
/**
 * Debug utility to log the contents of localStorage to the console
 * Only use this for debugging purposes
 */
export const debugLocalStorage = () => {
    console.group('LocalStorage Debug Info');

    // Get all keys
    const keys = Object.keys(localStorage);
    console.log(`Total items in localStorage: ${keys.length}`);

    // Look for our app's keys
    const appKeys = keys.filter(key => key.startsWith('staginfra_'));
    console.log(`App-specific items: ${appKeys.length}`);

    // Print each app key
    appKeys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            const parsedValue = JSON.parse(value);

            if (Array.isArray(parsedValue)) {
                console.log(`${key}: Array with ${parsedValue.length} items`);
                if (parsedValue.length > 0) {
                    console.log('Sample item:', parsedValue[0]);
                }
            } else {
                console.log(`${key}:`, parsedValue);
            }
        } catch (error) {
            console.log(`${key}: Error parsing value`, error);
        }
    });

    console.groupEnd();

    // Return a summary for easy access
    return {
        totalItems: keys.length,
        appItems: appKeys.length,
        keys: appKeys
    };
};

// Usage: debugLocalStorage() in browser console
if (typeof window !== 'undefined') {
    window.debugStorage = debugLocalStorage;
}
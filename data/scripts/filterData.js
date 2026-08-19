const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION FLAGS: USER FILTERING
// ==========================================
// 1. KEEP ONLY THESE USERS: If this array has IDs, ONLY these users will be kept. (Leave empty to keep everyone)
const USERS_TO_KEEP = []; // e.g. ['6a1980f382672e4131cc8212']

// 2. REMOVE THESE USERS: Any user ID in this array will be deleted from the data.
const USERS_TO_REMOVE = ['6a1980f382672e4131cc8212']; // e.g. ['6a1980f382672e4131cc8212']

// ==========================================
// CONFIGURATION FLAGS: EMPTY GAMES
// ==========================================
// Set to true to automatically remove games that are empty (e.g. score is 0, or no coordinates/plays recorded)
const REMOVE_EMPTY_GAMES = false;

const filesToProcess = [
    'pianosessions.json',
    'fruitBasketSession.json',
    'boarddrawingtries.json',
    'boarddrawingsessions.json'
];

function processFile(filename) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filename} not found.`);
        return;
    }
    
    console.log(`Processing ${filename}...`);
    const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    let emptyRemoved = 0;
    let usersRemoved = 0;
    
    const filteredData = originalData.filter(item => {
        // 1. User Filtering (if item has a user field)
        if (item.user) {
            const userId = item.user.toString();
            if (USERS_TO_KEEP.length > 0 && !USERS_TO_KEEP.includes(userId)) {
                usersRemoved++;
                return false;
            }
            if (USERS_TO_REMOVE.includes(userId)) {
                usersRemoved++;
                return false;
            }
        }
        
        // 2. Empty Game Filtering
        if (REMOVE_EMPTY_GAMES) {
            if (filename === 'pianosessions.json') {
                if (!item.plays || item.plays.length === 0 || item.sessionScore === 0) {
                    emptyRemoved++; return false;
                }
            } else if (filename === 'fruitBasketSession.json') {
                if (!item.coordinates || item.coordinates.length === 0 || item.sessionScore === 0) {
                    emptyRemoved++; return false;
                }
            } else if (filename === 'boarddrawingtries.json') {
                // For tries, we check hits and bgCoordinates
                if (!item.bgCoordinates || item.bgCoordinates.length === 0 || item.hits === 0) {
                    emptyRemoved++; return false;
                }
            } else if (filename === 'boarddrawingsessions.json') {
                if (!item.coordinates || item.coordinates.length === 0 || item.sessionScore === 0) {
                    emptyRemoved++; return false;
                }
            }
        }
        
        return true;
    });

    if (usersRemoved > 0 || emptyRemoved > 0) {
        console.log(`  -> Filtered out: ${usersRemoved} by User Rules, ${emptyRemoved} empty games.`);
    } else {
        console.log(`  -> No items filtered.`);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
    console.log(`Finished ${filename}. Remaining count: ${filteredData.length}\n`);
}

// Run the script on all files
filesToProcess.forEach(file => {
    processFile(file);
});

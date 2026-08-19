const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION FLAGS
// Set to true to enable deduplication for that collection
// Set to false to skip deduplication for that collection
// ==========================================
const ENABLE_PIANO_DEDUP = true;
const ENABLE_FRUIT_BASKET_DEDUP = true;
const ENABLE_BOARD_DRAWING_TRIES_DEDUP = true;
const ENABLE_BOARD_DRAWING_SESSIONS_DEDUP = true;

// Helper to deeply compare arrays (like plays, coordinates) securely
// Using JSON.stringify ensures every single property and element matches exactly
function deepEqual(arr1, arr2) {
    if (arr1 === arr2) return true;
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;
    return JSON.stringify(arr1) === JSON.stringify(arr2);
}

// Helper to check if two timestamps are within a certain millisecond range
function timeDifferenceMs(t1, t2) {
    if(!t1 || !t2) return Infinity;
    return Math.abs(new Date(t1).getTime() - new Date(t2).getTime());
}

function processFile(filename, getGroupKey, isDuplicateFn) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filename} not found.`);
        return;
    }
    
    console.log(`Processing ${filename}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Group by key to significantly speed up processing
    const groups = {};
    for (const item of data) {
        const key = getGroupKey(item) || 'unknown';
        if(!groups[key]) groups[key] = [];
        groups[key].push(item);
    }
    
    const unique = [];
    let duplicates = 0;
    
    // Check for duplicates only within the same group
    for (const key in groups) {
        const groupData = groups[key];
        const groupUnique = [];
        for (const item of groupData) {
            let isDup = false;
            for (const existing of groupUnique) {
                // If the custom duplicate function returns true, it's a duplicate
                if (isDuplicateFn(item, existing)) {
                    isDup = true;
                    break;
                }
            }
            if (isDup) {
                duplicates++;
            } else {
                groupUnique.push(item);
            }
        }
        unique.push(...groupUnique);
    }
    
    // Reconstruct the JSON array in its original order
    const finalUnique = [];
    const seenIds = new Set(unique.map(u => u._id));
    for (const item of data) {
        if(seenIds.has(item._id)) {
            finalUnique.push(item);
            seenIds.delete(item._id); // Ensure we don't add the same item twice
        } else if (!item._id) {
            finalUnique.push(item); // Fallback for items without _id
        }
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(finalUnique, null, 2));
    console.log(`Finished ${filename}: removed ${duplicates} duplicates. Unique count: ${finalUnique.length}`);
}

// ==========================================
// DEDUPLICATION RULES
// ==========================================

// 1. Piano Sessions
if (ENABLE_PIANO_DEDUP) {
    processFile('pianosessions.json', 
        (item) => item.user,
        (a, b) => {
            // Must have same user, gameType, and score
            // AND the exact same fully-deep 'plays' array
            // AND time must be within 60 seconds (double-click save)
            return a.user === b.user &&
                   a.gameType === b.gameType &&
                   a.sessionScore === b.sessionScore &&
                   timeDifferenceMs(a.time, b.time) < 60000 && 
                   deepEqual(a.plays, b.plays);
        }
    );
}

// 2. Fruit Basket
if (ENABLE_FRUIT_BASKET_DEDUP) {
    processFile('fruitBasketSession.json', 
        (item) => item.user,
        (a, b) => {
            return a.user === b.user &&
                   a.gameType === b.gameType &&
                   a.sessionScore === b.sessionScore &&
                   timeDifferenceMs(a.time, b.time) < 60000 &&
                   deepEqual(a.coordinates, b.coordinates);
        }
    );
}

// 3. Board Drawing Tries
if (ENABLE_BOARD_DRAWING_TRIES_DEDUP) {
    processFile('boarddrawingtries.json', 
        (item) => `${item.shapeType}_${item.hand}`,
        (a, b) => {
            return a.shapeType === b.shapeType &&
                   a.hand === b.hand &&
                   a.startedAt === b.startedAt &&
                   a.endedAt === b.endedAt &&
                   a.hits === b.hits &&
                   a.total === b.total &&
                   a.scoreAfter === b.scoreAfter &&
                   deepEqual(a.bgCoordinates, b.bgCoordinates);
        }
    );
}

// 4. Board Drawing Sessions
if (ENABLE_BOARD_DRAWING_SESSIONS_DEDUP) {
    processFile('boarddrawingsessions.json', 
        (item) => item.user,
        (a, b) => {
            const sysAMatch = a.systemMetrics ? a.systemMetrics.resolution : null;
            const sysBMatch = b.systemMetrics ? b.systemMetrics.resolution : null;
            return a.user === b.user &&
                   a.gameType === b.gameType &&
                   a.sessionScore === b.sessionScore &&
                   sysAMatch === sysBMatch &&
                   timeDifferenceMs(a.time, b.time) < 60000 &&
                   deepEqual(a.coordinates, b.coordinates);
        }
    );
}

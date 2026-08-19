const fs = require('fs');
const path = require('path');

// ==========================================
// The specific user ID you want to completely remove
// ==========================================
const USER_TO_REMOVE = '6a1980f382672e4131cc8212';

const filesToProcess = [
    'pianosessions.json',
    'fruitBasketSession.json',
    'boarddrawingtries.json',
    'boarddrawingsessions.json'
];

function removeSpecificUser(filename) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${filename} not found.`);
        return;
    }
    
    console.log(`Processing ${filename}...`);
    const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const filteredData = originalData.filter(item => {
        // If the item has a user field and it matches the one we want to remove, filter it out (return false)
        // Otherwise, keep it exactly as it is (return true)
        if (item.user && item.user.toString() === USER_TO_REMOVE) {
            return false;
        }
        return true;
    });

    const removedCount = originalData.length - filteredData.length;
    
    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
    console.log(`Finished ${filename}: Removed ${removedCount} entries for user ${USER_TO_REMOVE}.\n`);
}

// Run the script on all files
filesToProcess.forEach(file => {
    removeSpecificUser(file);
});

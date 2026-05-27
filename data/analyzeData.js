const fs = require('fs');
const path = require('path');

const dataDir = __dirname;
const analysisFile = path.join(dataDir, 'data_analysis.txt');

function loadJSON(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return [];
  }
}

function runAnalysis() {
  const users = loadJSON('users.json');
  const boardDrawingGames = loadJSON('boarddrawinggames.json');
  const boardDrawingSessions = loadJSON('boarddrawingsessions.json');
  const boardDrawingTries = loadJSON('boarddrawingtries.json');
  const pianoSessions = loadJSON('pianosessions.json');
  const gameSessions = loadJSON('gamesessions.json');

  let report = '';
  report += '========================================================================\n';
  report += '                HCI MEDICAL PROJECT - GAME DATA ANALYSIS                 \n';
  report += `Report Generated on: ${new Date().toISOString()}\n`;
  report += '========================================================================\n\n';

  // 1. DATABASE & USER ANALYSIS
  report += '## 1. USER PROFILE & CLINICAL ANALYSIS\n';
  report += '------------------------------------------------------------------------\n';
  report += `Total Users Registered: ${users.length}\n\n`;

  const roles = {};
  users.forEach(u => {
    roles[u.role] = (roles[u.role] || 0) + 1;
  });
  report += 'Breakdown by Role:\n';
  Object.keys(roles).forEach(r => {
    report += `  - ${r.toUpperCase()}: ${roles[r]}\n`;
  });
  report += '\nDetailed Patient Info (Diagnosis & Impairment):\n';
  users.forEach(u => {
    if (u.role === 'patient') {
      const info = u.patientInfo || {};
      report += `  - Patient ID: ${u._id}\n`;
      report += `    Name: ${u.firstName} ${u.lastName}\n`;
      report += `    Condition/Diagnosis: ${info.condition || 'N/A'}\n`;
      report += `    Impaired Side: ${info.impairedSide || 'N/A'}\n`;
      report += `    Assigned Caretaker ID: ${u.caretaker || 'None'}\n`;
      report += `    Assigned Doctor ID: ${u.doctor || 'None'}\n`;
    }
  });
  report += '\n\n';

  // 2. BOARD DRAWING GAME ANALYSIS
  report += '## 2. GAME: BOARD DRAWING (TRAJECTORY & MOTOR COORDINATION)\n';
  report += '------------------------------------------------------------------------\n';
  report += `Total Board Drawing Game Records: ${boardDrawingGames.length}\n`;
  report += `Total Board Drawing Active Sessions: ${boardDrawingSessions.length}\n`;
  report += `Total Individual Drawing Tries (Target Shapes): ${boardDrawingTries.length}\n\n`;

  // Analyzing Tries by Shape Type and Completion Accuracy
  const shapeStats = {};
  const handStats = { Left: { count: 0, completed: 0 }, Right: { count: 0, completed: 0 }, unknown: { count: 0, completed: 0 } };
  
  boardDrawingTries.forEach(t => {
    const shape = t.shapeType;
    if (!shapeStats[shape]) {
      shapeStats[shape] = { count: 0, completed: 0, totalAccuracy: 0, totalReps: 0 };
    }
    shapeStats[shape].count++;
    if (t.completed) shapeStats[shape].completed++;
    shapeStats[shape].totalAccuracy += (t.percentComplete || 0);

    const hand = t.hand || 'unknown';
    if (handStats[hand]) {
      handStats[hand].count++;
      if (t.completed) handStats[hand].completed++;
    }
  });

  report += 'Shape-Specific Motor Performance metrics:\n';
  Object.keys(shapeStats).forEach(s => {
    const stat = shapeStats[s];
    const avgAccuracy = (stat.totalAccuracy / stat.count).toFixed(2);
    const successRate = ((stat.completed / stat.count) * 100).toFixed(2);
    report += `  - Shape: ${s.toUpperCase()}\n`;
    report += `    Total Tries: ${stat.count}\n`;
    report += `    Successes: ${stat.completed} (${successRate}% success rate)\n`;
    report += `    Average Trajectory Overlap/Accuracy: ${avgAccuracy}%\n`;
  });

  report += '\nHand-Specific Drawing Statistics (Impaired vs Non-Impaired analysis aid):\n';
  Object.keys(handStats).forEach(h => {
    const stat = handStats[h];
    if (stat.count > 0) {
      const successRate = ((stat.completed / stat.count) * 100).toFixed(2);
      report += `  - ${h} Hand:\n`;
      report += `    Total Tries: ${stat.count}\n`;
      report += `    Successes: ${stat.completed} (${successRate}% success rate)\n`;
    }
  });
  report += '\n\n';

  // 3. PIANO REACTION GAME ANALYSIS
  report += '## 3. GAME: PIANO REACTION (FINE MOTOR FINGER & WRIST REFLEXES)\n';
  report += '------------------------------------------------------------------------\n';
  report += `Total Piano Reaction Sessions: ${pianoSessions.length}\n\n`;

  let totalPianoScore = 0;
  const pianoModeCount = {};
  let totalLaptopMovements = 0;
  let totalMobileMovements = 0;

  pianoSessions.forEach(ps => {
    totalPianoScore += (ps.sessionScore || 0);
    const mode = ps.mode || 'laptop';
    pianoModeCount[mode] = (pianoModeCount[mode] || 0) + 1;
    if (ps.laptopMovements) totalLaptopMovements += ps.laptopMovements.length;
    if (ps.mobileMovements) totalMobileMovements += ps.mobileMovements.length;
  });

  const avgPianoScore = pianoSessions.length > 0 ? (totalPianoScore / pianoSessions.length).toFixed(2) : 0;
  report += `Average Score per Session: ${avgPianoScore}\n`;
  report += 'Play Mode Breakdown:\n';
  Object.keys(pianoModeCount).forEach(m => {
    report += `  - ${m.toUpperCase()} Mode: ${pianoModeCount[m]} sessions\n`;
  });
  report += `Total Registered Key Transitions (Laptop Mode): ${totalLaptopMovements}\n`;
  report += `Total Registered Finger Actions (Mobile Mode): ${totalMobileMovements}\n\n`;

  // Analyze Finger Timeouts
  if (pianoSessions.length > 0) {
    report += 'Finger Reflex / Speed Timeouts configured:\n';
    const sumTimeouts = {};
    let countWithTimeouts = 0;

    pianoSessions.forEach(ps => {
      if (ps.fingerTimeouts) {
        countWithTimeouts++;
        Object.keys(ps.fingerTimeouts).forEach(f => {
          if (typeof ps.fingerTimeouts[f] === 'number') {
            sumTimeouts[f] = (sumTimeouts[f] || 0) + ps.fingerTimeouts[f];
          }
        });
      }
    });

    if (countWithTimeouts > 0) {
      Object.keys(sumTimeouts).forEach(f => {
        const avg = (sumTimeouts[f] / countWithTimeouts).toFixed(2);
        report += `  - ${f}: ${avg}s limit\n`;
      });
    }
  }
  report += '\n\n';

  // 4. GENERAL GAME SESSIONS AND DOCKER/ENVIRONMENT OVERVIEW
  report += '## 4. GENERIC GAME SESSIONS (ARM REACH / FRUIT FETCHER & SYSTEM METRICS)\n';
  report += '------------------------------------------------------------------------\n';
  report += `Total Generic Game Session Records: ${gameSessions.length}\n\n`;

  // Aggregate System Metrics
  let totalFps = 0;
  let totalLatency = 0;
  let metricsCount = 0;

  const allSessions = [...boardDrawingSessions, ...pianoSessions, ...gameSessions];
  allSessions.forEach(s => {
    if (s.systemMetrics && typeof s.systemMetrics.avgFps === 'number') {
      totalFps += s.systemMetrics.avgFps;
      totalLatency += (s.systemMetrics.avgLatency || 0);
      metricsCount++;
    }
  });

  if (metricsCount > 0) {
    report += 'Average Client-Side System Performance:\n';
    report += `  - Average Frame Rate (FPS): ${(totalFps / metricsCount).toFixed(2)} frames/sec\n`;
    report += `  - Average Interface/API Latency: ${(totalLatency / metricsCount).toFixed(2)} ms\n`;
  } else {
    report += 'No performance/system metrics recorded in existing game sessions.\n';
  }
  
  report += '\n========================================================================\n';
  report += '                        END OF ANALYSIS REPORT                          \n';
  report += '========================================================================\n';

  fs.writeFileSync(analysisFile, report);
  console.log('Analysis report written successfully to:', analysisFile);
}

runAnalysis();

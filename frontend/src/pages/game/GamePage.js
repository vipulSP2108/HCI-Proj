import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gameService } from '../../services/gameService';
import { Play, Pause, RotateCcw, Home, Settings } from 'lucide-react';

const GamePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Game state
  const [currentlevelspan, setCurrentlevelspan] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLetter, setCurrentLetter] = useState('');
  const [playData, setPlayData] = useState([]);
  const [letterStartTime, setLetterStartTime] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [tempLevelspan, setTempLevelspan] = useState(5);

  // Timers
  const letterTimerRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    loadLevelSpan();
    return () => {
      if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
    };
  }, []);

  const loadLevelSpan = async () => {
    try {
      const response = await gameService.getLevelSpan();
      setCurrentlevelspan(response.currentlevelspan);
      setTempLevelspan(response.currentlevelspan);
    } catch (error) {
      console.error('Failed to load levelspan:', error);
      setCurrentlevelspan(5);
      setTempLevelspan(5);
    }
  };

  // Play audio feedback
  const playSound = (type) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'correct') {
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'incorrect') {
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'notdone') {
      oscillator.frequency.value = 400;
      oscillator.type = 'triangle';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setPlayData([]);
    setAttemptCount(0);
    setSessionStartTime(Date.now());
    showNextLetter();
  };

  const showNextLetter = () => {
    const letters = ['A', 'S'];
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    setCurrentLetter(randomLetter);
    setLetterStartTime(Date.now());
    setAttemptCount(prev => prev + 1);

    // Auto-mark as not done after levelspan seconds
    letterTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        recordResponse('none', -1, 0, randomLetter);
        playSound('notdone');
        showNextLetter();
      }
    }, currentlevelspan * 1000);
  };

  const handleKeyPress = (key) => {
    if (!isPlaying || isPaused || !currentLetter) return;

    const responseTime = (Date.now() - letterStartTime) / 1000; // Convert to seconds
    const userKey = key.toUpperCase();

    // Determine if correct
    let correct;
    if (userKey === currentLetter) {
      correct = 1; // Correct
    } else {
      correct = -1; // Incorrect
    }

    if (letterTimerRef.current) {
      clearTimeout(letterTimerRef.current);
    }

    // Round to 1 decimal place
    const roundedTime = Math.round(responseTime * 10) / 10;

    recordResponse(userKey, roundedTime, correct, currentLetter);

    // Play audio feedback
    playSound(correct === 1 ? 'correct' : 'incorrect');

    // Show visual feedback
    setShowResult(correct === 1 ? 'correct' : 'incorrect');
    setTimeout(() => setShowResult(null), 300);

    // Show next letter
    setTimeout(() => showNextLetter(), 100);
  };

  const recordResponse = (userResponse, responsetime, correct, shownLetter) => {
    const entry = {
      responsetime: responsetime, // 0 to currentlevelspan OR -1 if exceeded
      correct: correct // 1=correct, -1=incorrect, 0=not done
    };

    setPlayData(prev => [...prev, entry]);

    console.log(`Letter: ${shownLetter}, User: ${userResponse}, Time: ${responsetime}s, Correct: ${correct}`);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    if (isPlaying && !isPaused) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, currentLetter, letterStartTime]);

  const endGame = async () => {
    setIsPlaying(false);
    setCurrentLetter('');
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);

    if (playData.length === 0) {
      alert('No data to save. Play at least one round!');
      return;
    }

    // Save session to backend
    try {
      const response = await gameService.saveGameSession({
        levelspan: currentlevelspan,
        playData: playData
      });

      alert(`Game session saved!\nScore: ${response.sessionScore}\nTotal Score: ${response.totalScore}\nLevel: ${response.level}`);

      // Ask if user wants to play again
      const playAgain = window.confirm('Play another round?');
      if (playAgain) {
        startGame();
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      alert('Failed to save game session. Please try again.');
    }
  };

  const pauseGame = () => {
    setIsPaused(true);
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
  };

  const resumeGame = () => {
    setIsPaused(false);
    setLetterStartTime(Date.now());

    // Restart timer for current letter
    letterTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        recordResponse('none', -1, 0, currentLetter);
        playSound('notdone');
        showNextLetter();
      }
    }, currentlevelspan * 1000);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLetter('');
    setPlayData([]);
    setAttemptCount(0);
    if (letterTimerRef.current) clearTimeout(letterTimerRef.current);
  };

  const saveSettings = async () => {
    try {
      await gameService.updateLevelSpan(user.id, tempLevelspan);
      setCurrentlevelspan(tempLevelspan);
      setShowSettings(false);
      alert('Level span updated successfully!');
    } catch (error) {
      alert('Failed to update settings');
    }
  };

  // Calculate stats from current playData
  const correctCount = playData.filter(p => p.correct === 1).length;
  const incorrectCount = playData.filter(p => p.correct === -1).length;
  const notDoneCount = playData.filter(p => p.correct === 0).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Reaction Game</h1>
            <p className="text-gray-600">Press 'A' or 'S' based on what you see</p>
            <p className="text-sm text-gray-500 mt-1">Level Span: {currentlevelspan} seconds</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSettings(true)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <Settings className="w-6 h-6 text-gray-700" />
            </button>
            <button onClick={() => navigate(-1)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <Home className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-sm text-gray-600">Attempts</p>
            <p className="text-3xl font-bold text-gray-800">{attemptCount}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 text-center border-2 border-green-200">
            <p className="text-sm text-green-700">Correct</p>
            <p className="text-3xl font-bold text-green-600">{correctCount}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 text-center border-2 border-red-200">
            <p className="text-sm text-red-700">Incorrect</p>
            <p className="text-3xl font-bold text-red-600">{incorrectCount}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 text-center border-2 border-yellow-200">
            <p className="text-sm text-yellow-700">Not Done</p>
            <p className="text-3xl font-bold text-yellow-600">{notDoneCount}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 text-center border-2 border-purple-200">
            <p className="text-sm text-purple-700">Accuracy</p>
            <p className="text-3xl font-bold text-purple-600">
              {correctCount + incorrectCount > 0 
                ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) 
                : 0}%
            </p>
          </div>
        </div>

        {/* Game Area */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-6">
          {/* Letter Display */}
          <div className="relative h-64 flex items-center justify-center mb-8 border-4 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
            {currentLetter && isPlaying && !isPaused ? (
              <div className={`game-letter text-9xl font-bold ${
                showResult === 'correct' ? 'text-success-500' :
                showResult === 'incorrect' ? 'text-error-500' :
                'text-primary-600'
              } transition-colors duration-200`}>
                {currentLetter}
              </div>
            ) : !isPlaying ? (
              <div className="text-center">
                <p className="text-3xl text-gray-400 mb-4 font-bold">Ready to Play?</p>
                <div className="space-y-2 text-lg text-gray-600">
                  <p>🎯 Press <span className="font-bold text-primary-600">'A'</span> when you see 'A'</p>
                  <p>🎯 Press <span className="font-bold text-primary-600">'S'</span> when you see 'S'</p>
                  <p className="text-sm text-gray-500 mt-4">You have {currentlevelspan} seconds to respond</p>
                </div>
              </div>
            ) : isPaused ? (
              <div className="text-4xl text-warning-500 font-bold">⏸️ PAUSED</div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex gap-4 justify-center flex-wrap">
            {!isPlaying ? (
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-lg font-semibold hover:from-success-600 hover:to-success-700 transition shadow-lg text-lg"
              >
                <Play className="w-6 h-6" />
                Start Game
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button onClick={pauseGame} className="flex items-center gap-2 px-6 py-3 bg-warning-500 text-white rounded-lg font-semibold hover:bg-warning-600 transition shadow-lg">
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                ) : (
                  <button onClick={resumeGame} className="flex items-center gap-2 px-6 py-3 bg-success-500 text-white rounded-lg font-semibold hover:bg-success-600 transition shadow-lg">
                    <Play className="w-5 h-5" />
                    Resume
                  </button>
                )}
                <button onClick={endGame} className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition shadow-lg">
                  💾 Save & End
                </button>
                <button onClick={resetGame} className="flex items-center gap-2 px-6 py-3 bg-error-500 text-white rounded-lg font-semibold hover:bg-error-600 transition shadow-lg">
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </>
            )}
          </div>

          {/* Keyboard Hint */}
          <div className="mt-8 flex gap-6 justify-center">
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 px-8 py-4 rounded-xl shadow-lg border-2 border-primary-300">
              <p className="text-sm text-primary-700 mb-1 text-center font-semibold">Press</p>
              <p className="text-4xl font-bold text-primary-800">A</p>
            </div>
            <div className="bg-gradient-to-br from-secondary-100 to-secondary-200 px-8 py-4 rounded-xl shadow-lg border-2 border-secondary-300">
              <p className="text-sm text-secondary-700 mb-1 text-center font-semibold">Press</p>
              <p className="text-4xl font-bold text-secondary-800">S</p>
            </div>
          </div>
        </div>

        {/* Current Session Data Preview */}
        {playData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Current Session Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3">Attempt</th>
                    <th className="text-left py-2 px-3">Response Time</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {playData.slice(-10).map((entry, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-3">#{playData.length - playData.slice(-10).length + index + 1}</td>
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${entry.responsetime === -1 ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {entry.responsetime === -1 ? 'Exceeded' : `${entry.responsetime}s`}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {entry.correct === 1 && <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">✓ Correct</span>}
                        {entry.correct === -1 && <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">✗ Incorrect</span>}
                        {entry.correct === 0 && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">⊘ Not Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {playData.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">Showing last 10 of {playData.length} attempts</p>
            )}
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Game Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Level Span (seconds): <span className="text-primary-600 text-2xl">{tempLevelspan}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={tempLevelspan}
                    onChange={(e) => setTempLevelspan(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1s (Harder)</span>
                    <span>10s (Easier)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    This is how many seconds you'll have to respond to each letter.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={saveSettings} 
                  className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition shadow-lg"
                >
                  💾 Save Settings
                </button>
                <button 
                  onClick={() => {
                    setTempLevelspan(currentlevelspan);
                    setShowSettings(false);
                  }} 
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;

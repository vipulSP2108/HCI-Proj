import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gameService } from '../../services/gameService';
import { Play, Pause, RotateCcw, Home, Settings, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import GameImage1 from "./1.png";
import GameImage2 from "./2.png";
import GameImage3 from "./3.png";

// --- NEW ONBOARDING SCREEN COMPONENT (TTS AUDIO IMPLEMENTED) ---
const OnboardingScreen = ({ onNext, currentLevelSpan }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  const PRIMARY_BLUE = "#2766EB";
  const LIGHT_BLUE = "#67C8EE";

  const instructionText = `
    Welcome! This is how to play the Piano Reaction Game. 
    Step 1: WATCH. A piano key section will turn black. Your goal is to identify the active key.
    Step 2: TAP QUICKLY. Quickly tap the corresponding black section or press the matching key on your keyboard. Tapping the wrong key gives an Incorrect response.
    Step 3: BE FAST. You have ${currentLevelSpan} seconds to respond. Being too slow results in a Not Done status. 
    Tap Start Game Setup when you are ready.
  `;

  const initializeTTS = () => {
    utteranceRef.current = new SpeechSynthesisUtterance(instructionText);
    utteranceRef.current.rate = 1;
    utteranceRef.current.pitch = 1.5;

    const voices = synthRef.current.getVoices();
    const desiredVoice = voices.find((voice) => voice.lang.startsWith("en")) || voices[0];
    if (desiredVoice) {
      utteranceRef.current.voice = desiredVoice;
    }

    utteranceRef.current.onend = () => {
      if (isSpeaking) {
        startSpeaking();
      } else {
        setIsSpeaking(false);
      }
    };
  };

  const startSpeaking = () => {
    if (!utteranceRef.current) initializeTTS();
    if (synthRef.current.paused) {
      synthRef.current.resume();
    } else if (!synthRef.current.speaking) {
      synthRef.current.speak(utteranceRef.current);
    }
    setIsSpeaking(true);
    setIsMuted(false);
  };

  const pauseSpeaking = () => {
    synthRef.current.pause();
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    if (isSpeaking) {
      pauseSpeaking();
      setIsMuted(true);
    } else if (isMuted) {
      startSpeaking();
      setIsMuted(false);
    } else {
      startSpeaking();
    }
  };

  const handleNext = () => {
    synthRef.current.cancel();
    onNext();
  };

  useEffect(() => {
    initializeTTS();
    setTimeout(startSpeaking, 500);

    return () => {
      synthRef.current.cancel();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-4 md:p-10 z-50 overflow-auto">
      <div
        className="max-w-4xl w-full bg-white rounded-xl shadow-2xl p-6 md:p-10 border-4 relative flex flex-col"
        style={{ borderColor: PRIMARY_BLUE, maxHeight: "90vh" }}
      >
        {/* TTS Control Button */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full transition text-white shadow-lg"
            style={{ backgroundColor: PRIMARY_BLUE }}
            aria-label={isSpeaking ? "Pause Instructions" : "Listen to Instructions"}
          >
            {isSpeaking ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <p className="text-xs text-center mt-1" style={{ color: PRIMARY_BLUE }}>
            {isSpeaking ? "Listening" : "Tap to Listen"}
          </p>
        </div>

        <div className="overflow-y-auto pr-2 mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6" style={{ color: PRIMARY_BLUE }}>
            👋 Welcome! How to Play
          </h2>

          <div className="space-y-6 md:space-y-8 text-lg text-gray-700">
            <p className="text-xl md:text-2xl font-semibold text-center">
              Listen to the instructions or follow the three steps below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center p-4 rounded-lg border-2" style={{ backgroundColor: "#F0FFF0", borderColor: "green" }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: "green" }}>Step 1: WATCH</h3>
                <p className="text-center mb-3 text-gray-800">A piano key section will turn black.</p>
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-400">
                  <img src={GameImage1} alt="Game" className="w-full h-full object-cover rounded-lg" />
                </div>
                <p className="mt-2 text-xs text-green-700 font-semibold">Goal: Identify the active key.</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center p-4 rounded-lg border-2" style={{ backgroundColor: "#FFF0F0", borderColor: "red" }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: "red" }}>Step 2: TAP QUICKLY</h3>
                <p className="text-center mb-3 text-gray-800">Quickly tap the corresponding black.</p>
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-400">
                  <img src={GameImage2} alt="Game" className="w-full h-full object-cover rounded-lg" />
                </div>
                <p className="mt-2 text-xs text-red-700 font-semibold">Caution: Tapping the wrong key gives Incorrect.</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center p-4 rounded-lg border-2" style={{ backgroundColor: "#FFFFF0", borderColor: "yellow" }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: "#CCB000" }}>Step 3: BE FAST</h3>
                <p className="text-center mb-3 text-gray-800">You have {currentLevelSpan} seconds to respond.</p>
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-400">
                  <img src={GameImage3} alt="Game" className="w-full h-full object-cover rounded-lg" />
                </div>
                <p className="mt-2 text-xs text-yellow-700 font-semibold">Warning: Being too slow results in Not Done.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Button - fixed at bottom */}
        <div className="absolute bottom-6 left-0 w-full flex justify-center">
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-4 text-white rounded-lg font-bold text-xl hover:shadow-2xl transition shadow-xl"
            style={{ background: `linear-gradient(90deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
          >
            Start Game Setup <ArrowRight className="w-6 h-6 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- EXISTING PLAYING GAME COMPONENT (COLORS DEFINED AND ADJUSTED) ---
const PlayingGame = ({ 
  // ... (props remain the same)
  currentLevelSpan, 
  currentNumSections, 
  isPaused, 
  onPause, 
  onResume, 
  onEnd, 
  onReset, 
  currentSection, 
  feedbackSection, 
  feedbackType, 
  attemptCount, 
  correctCount, 
  incorrectCount, 
  notDoneCount, 
  accuracy, 
  activeKeys, 
  noteNames, 
  keys, 
  handleSectionClick, 
  handleKeyPress 
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Defined LIGHT_BLUE here to resolve the no-undef error
  const PRIMARY_BLUE = '#2766EB';
  const LIGHT_BLUE = '#67C8EE';

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden z-50">
      {/* Minimal Header - Only essential controls */}
      <div className="shadow-lg p-3 flex items-center justify-between" style={{ backgroundColor: PRIMARY_BLUE, color: 'white' }}>
        <h1 className="text-xl font-bold">Piano Reaction Game</h1>
        <div className="flex gap-2">
          <button 
            onClick={isPaused ? onResume : onPause} 
            className={`p-2 rounded-lg transition ${
              isPaused 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-red-400 hover:bg-red-500 text-white' 
            }`}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button 
            onClick={onEnd} 
            className="p-2 bg-white hover:bg-gray-200 text-gray-800 rounded-lg transition font-semibold"
          >
            💾 Save
          </button>
          <button 
            onClick={onReset} 
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Compact Stats - Using Green, Red, Yellow for feedback counts */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-white border-b">
        <div className="text-center">
          <p className="text-xs text-gray-600">Attempts</p>
          <p className="text-lg font-bold text-gray-800">{attemptCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: 'green' }}>Correct</p>
          <p className="text-lg font-bold" style={{ color: 'green' }}>{correctCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: 'red' }}>Incorrect</p>
          <p className="text-lg font-bold" style={{ color: 'red' }}>{incorrectCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: '#CCB000' }}>Not Done</p>
          <p className="text-lg font-bold" style={{ color: '#CCB000' }}>{notDoneCount}</p>
        </div>
      </div>
      {/* Full-Screen Game Area */}
      <div className="flex-1 flex flex-col p-4">
        {/* Piano Sections - Larger for touch */}
        <div className="flex-1 relative mb-6 border-4 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 overflow-hidden">
          <div className="h-full flex flex-col-reverse md:flex-row">
            {activeKeys.map((key, index) => {
              const isActive = currentSection === index;
              const isFeedback = index === feedbackSection;
              const resultClass = isFeedback ?
                feedbackType === 'correct' ? 'ring-4 ring-green-500/50 scale-105' :
                feedbackType === 'incorrect' ? 'ring-4 ring-red-500/50 scale-105' :
                feedbackType === 'notdone' ? 'ring-4 ring-yellow-500/50' : '' : '';
              const bgClass = isActive ? 'bg-black' : 'bg-white';
              const textClass = isActive ? 'text-white' : 'text-gray-400';
              const fontSize = currentNumSections <= 3 ? 'text-6xl md:text-9xl' : currentNumSections <= 6 ? 'text-4xl md:text-7xl' : 'text-3xl md:text-5xl';
              return (
                <div
                  key={index}
                  className={`w-full md:flex-1 flex flex-col items-center justify-center border-b md:border-r border-gray-200 last:border-b-0 md:last:border-r-0 md:last:border-b-0 transition-all duration-200 ${isActive ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} hover:bg-gray-300 cursor-pointer ${bgClass} ${resultClass} flex-1`}
                  onClick={() => handleSectionClick(index)}
                >
                  <div className={`${fontSize} font-bold ${textClass} transition-colors duration-200 mb-1`}>
                    {key}
                  </div>
                  <span className={`text-xs md:text-sm font-mono ${isActive ? 'text-white/80' : 'text-gray-500'} transition-colors duration-200`}>
                    {noteNames[index]}
                  </span>
                </div>
              );
            })}
          </div>
          {isPaused ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="text-3xl md:text-4xl text-yellow-500 font-bold">⏸️ PAUSED</div>
            </div>
          ) : null}
        </div>
        {/* Mobile-Friendly Keyboard Hint - Blue/White scheme */}
        <div className="flex justify-center flex-wrap gap-2">
          {activeKeys.map((key, index) => (
            <div
              key={key}
              className="px-4 py-3 rounded-lg shadow-lg border-2 min-w-[60px] text-center touch-manipulation"
              style={{ backgroundColor: LIGHT_BLUE, borderColor: PRIMARY_BLUE }}
            >
              <p className="text-xs text-white font-semibold">Tap</p>
              <p className="text-2xl font-bold text-white">{key}</p>
              <p className="text-xs text-white/80">{noteNames[index]}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Handle key presses - passed from parent */}
      {isPaused ? null : (
        <div 
          tabIndex={-1} 
          className="invisible fixed inset-0" 
          onKeyDown={(e) => {
            const userKey = e.key.toLowerCase();
            if (['a','s','d','f','g','h','j','k','l'].includes(userKey)) {
              e.preventDefault();
              handleKeyPress(e.key);
            }
          }}
          ref={(el) => el && el.focus()}
        />
      )}
    </div>
  );
};

// --- UPDATED GAME PAGE COMPONENT (COLORS ADJUSTED) ---
const GamePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // --- STATE FOR ONBOARDING ---
  const [isOnboarding, setIsOnboarding] = useState(true); 
  // ---------------------------------
  // Game state
  const [currentLevelSpan, setCurrentLevelSpan] = useState(5);
  const [currentNumSections, setCurrentNumSections] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [playData, setPlayData] = useState([]);
  const [sectionStartTime, setSectionStartTime] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  // Feedback state
  const [feedbackSection, setFeedbackSection] = useState(null);
  const [feedbackType, setFeedbackType] = useState(null);
  // Available keys and frequencies (piano-like notes: C4 to A5)
  const keys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D'];
  const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [tempLevelSpan, setTempLevelSpan] = useState(5);
  const [tempNumSections, setTempNumSections] = useState(2);
  // Timers
  const sectionTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  
  const PRIMARY_BLUE = '#2766EB';
  const LIGHT_BLUE = '#67C8EE';

  useEffect(() => {
    loadSettings();
    return () => {
      if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const response = await gameService.getSettings(); 
      setCurrentLevelSpan(response.currentlevelspan || 5);
      setCurrentNumSections(response.currentnumsections || 7);
      setTempLevelSpan(response.currentlevelspan || 5);
      setTempNumSections(response.currentnumsections || 7);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setCurrentLevelSpan(5);
      setCurrentNumSections(7);
      setTempLevelSpan(5);
      setTempNumSections(7);
    }
  };

  // Play piano-like sound for a specific key (UNCHANGED)
  const playPianoSound = (keyIndex) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequencies[keyIndex];
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.5);
  };
  
  // Play feedback sounds (UNCHANGED)
  const playFeedbackSound = (type) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (type === 'correct') {
      if (currentSection !== null) {
        playPianoSound(currentSection);
        return;
      }
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
    showNextSection();
  };

  const showNextSection = () => {
    const randomSection = Math.floor(Math.random() * currentNumSections);
    setCurrentSection(randomSection);
    setSectionStartTime(Date.now());
    setAttemptCount(prev => prev + 1);
    sectionTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        recordResponse('none', -1, 0, keys[randomSection]);
        setFeedbackSection(currentSection);
        setFeedbackType('notdone');
        playFeedbackSound('notdone');
        setTimeout(() => {
          setFeedbackSection(null);
          setFeedbackType(null);
          showNextSection();
        }, 300);
      }
    }, currentLevelSpan * 1000);
  };
  
  const handleKeyPress = (key) => {
    if (!isPlaying || isPaused || currentSection === null) return;
    const responseTime = (Date.now() - sectionStartTime) / 1000; 
    const userKey = key.toUpperCase();
    const expectedKey = keys[currentSection];
    const userIndex = keys.indexOf(userKey);
    let correct;
    if (userKey === expectedKey) {
      correct = 1; 
    } else if (keys.slice(0, currentNumSections).map(k => k.toLowerCase()).includes(key.toLowerCase())) {
      correct = -1; 
    } else {
      return; 
    }
    if (sectionTimerRef.current) {
      clearTimeout(sectionTimerRef.current);
    }
    const roundedTime = Math.round(responseTime * 10) / 10;
    recordResponse(userKey, roundedTime, correct, expectedKey);
    playFeedbackSound(correct === 1 ? 'correct' : 'incorrect');
    setFeedbackSection(userIndex);
    setFeedbackType(correct === 1 ? 'correct' : 'incorrect');
    setTimeout(() => {
      setFeedbackSection(null);
      setFeedbackType(null);
      showNextSection();
    }, 300);
  };
  
  const handleSectionClick = (clickedIndex) => {
    if (!isPlaying || isPaused || currentSection === null) return;
    const responseTime = (Date.now() - sectionStartTime) / 1000; 
    const userKey = keys[clickedIndex];
    const expectedKey = keys[currentSection];
    let correct;
    if (clickedIndex === currentSection) {
      correct = 1; 
    } else if (clickedIndex < currentNumSections) {
      correct = -1; 
    } else {
      return; 
    }
    if (sectionTimerRef.current) {
      clearTimeout(sectionTimerRef.current);
    }
    const roundedTime = Math.round(responseTime * 10) / 10;
    recordResponse(userKey, roundedTime, correct, expectedKey);
    playFeedbackSound(correct === 1 ? 'correct' : 'incorrect');
    setFeedbackSection(clickedIndex);
    setFeedbackType(correct === 1 ? 'correct' : 'incorrect');
    setTimeout(() => {
      setFeedbackSection(null);
      setFeedbackType(null);
      showNextSection();
    }, 300);
  };

  const recordResponse = (userResponse, responsetime, correct, shownKey) => {
    const entry = {
      responsetime: responsetime, 
      correct: correct 
    };
    setPlayData(prev => [...prev, entry]);
    console.log(`Key: ${shownKey}, User: ${userResponse}, Time: ${responsetime}s, Correct: ${correct}`);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const userKey = e.key.toLowerCase();
      if (['a','s','d','f','g','h','j','k','l'].includes(userKey)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };
    if (isPlaying && !isPaused) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, currentSection, sectionStartTime, currentNumSections]);

  const endGame = async () => {
    setIsPlaying(false);
    setCurrentSection(null);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
    if (playData.length === 0) {
      alert('No data to save. Play at least one round!');
      return;
    }
    try {
      const response = await gameService.saveGameSession({
        levelspan: currentLevelSpan,
        numsections: currentNumSections,
        playData: playData
      });
      alert(`Game session saved!\nScore: ${response.sessionScore}\nTotal Score: ${response.totalScore}\nLevel: ${response.level}`);
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
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
  };

  const resumeGame = () => {
    setIsPaused(false);
    setSectionStartTime(Date.now());
    sectionTimerRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        recordResponse('none', -1, 0, keys[currentSection]);
        setFeedbackSection(currentSection);
        setFeedbackType('notdone');
        playFeedbackSound('notdone');
        setTimeout(() => {
          setFeedbackSection(null);
          setFeedbackType(null);
          showNextSection();
        }, 300);
      }
    }, currentLevelSpan * 1000);
  };

  const resetGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSection(null);
    setPlayData([]);
    setAttemptCount(0);
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current);
  };

  const saveSettings = async () => {
    try {
      await gameService.updateSettings(user.id, tempLevelSpan, tempNumSections);
      setCurrentLevelSpan(tempLevelSpan);
      setCurrentNumSections(tempNumSections);
      setShowSettings(false);
      alert('Settings updated successfully!');
    } catch (error) {
      alert('Failed to update settings');
    }
  };

  // Calculate stats from current playData
  const correctCount = playData.filter(p => p.correct === 1).length;
  const incorrectCount = playData.filter(p => p.correct === -1).length;
  const notDoneCount = playData.filter(p => p.correct === 0).length;
  const accuracy = correctCount + incorrectCount > 0
    ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
    : 0;
  // Current active keys
  const activeKeys = keys.slice(0, currentNumSections);

  // --- RENDERING LOGIC ---
  if (isOnboarding) {
    // The OnboardingScreen receives the current level span for TTS and instruction display.
    return <OnboardingScreen onNext={() => setIsOnboarding(false)} currentLevelSpan={currentLevelSpan} />;
  }

  if (isPlaying) {
    return (
      <PlayingGame 
        currentLevelSpan={currentLevelSpan}
        currentNumSections={currentNumSections}
        isPaused={isPaused}
        onPause={pauseGame}
        onResume={resumeGame}
        onEnd={endGame}
        onReset={resetGame}
        currentSection={currentSection}
        feedbackSection={feedbackSection}
        feedbackType={feedbackType}
        attemptCount={attemptCount}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        notDoneCount={notDoneCount}
        accuracy={accuracy}
        activeKeys={activeKeys}
        noteNames={noteNames}
        keys={keys}
        handleSectionClick={handleSectionClick}
        handleKeyPress={handleKeyPress}
      />
    );
  }
  // This is the main setup screen (after onboarding, before playing)
  return (
    <div className="min-h-screen p-2 md:p-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6 flex items-center justify-between text-white" style={{ background: `linear-gradient(90deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Piano Reaction Game</h1>
            <p className="text-white/90">Tap the highlighted (black) piano key section</p>
            <p className="text-sm text-white/70 mt-1">
              Level Span: {currentLevelSpan} seconds | Keys: {currentNumSections}
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button onClick={() => setShowSettings(true)} className="p-2 md:p-3 bg-white/30 hover:bg-white/50 rounded-lg transition text-white">
              <Settings className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button onClick={() => navigate(-1)} className="p-2 md:p-3 bg-white/30 hover:bg-white/50 rounded-lg transition text-white">
              <Home className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-2 md:p-4 text-center border">
            <p className="text-xs md:text-sm text-gray-600">Attempts</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">{attemptCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-2 md:p-4 text-center border" style={{ borderColor: 'green' }}>
            <p className="text-xs md:text-sm" style={{ color: 'green' }}>Correct</p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: 'green' }}>{correctCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-2 md:p-4 text-center border" style={{ borderColor: 'red' }}>
            <p className="text-xs md:text-sm" style={{ color: 'red' }}>Incorrect</p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: 'red' }}>{incorrectCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-2 md:p-4 text-center border" style={{ borderColor: 'yellow' }}>
            <p className="text-xs md:text-sm" style={{ color: '#CCB000' }}>Not Done</p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: '#CCB000' }}>{notDoneCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-2 md:p-4 text-center border" style={{ borderColor: PRIMARY_BLUE }}>
            <p className="text-xs md:text-sm text-gray-600">Accuracy</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">
              {accuracy}%
            </p>
          </div>
        </div>
        {/* Game Area */}
        <div className="bg-white rounded-xl shadow-2xl p-4 md:p-8 mb-4 md:mb-6">
          {/* Sections Display */}
          <div className="relative h-[60vh] md:h-64 mb-6 md:mb-8 border-4 border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="h-full flex flex-col-reverse md:flex-row">
              {activeKeys.map((key, index) => {
                const isActive = currentSection === index;
                const isFeedback = index === feedbackSection;
                const resultClass = isFeedback ?
                  feedbackType === 'correct' ? 'ring-4 ring-green-500/50 scale-105' :
                  feedbackType === 'incorrect' ? 'ring-4 ring-red-500/50 scale-105' :
                  feedbackType === 'notdone' ? 'ring-4 ring-yellow-500/50' : '' : '';
                const bgClass = isActive ? 'bg-black' : 'bg-white';
                const textClass = isActive ? 'text-white' : 'text-gray-400';
                const fontSize = currentNumSections <= 3 ? 'text-6xl md:text-9xl' : currentNumSections <= 6 ? 'text-4xl md:text-7xl' : 'text-3xl md:text-5xl';
                return (
                  <div
                    key={index}
                    className={`w-full md:flex-1 flex flex-col items-center justify-center border-b md:border-r border-gray-200 last:border-b-0 md:last:border-r-0 md:last:border-b-0 transition-all duration-200 ${isActive ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} hover:bg-gray-300 cursor-pointer ${bgClass} ${resultClass}`}
                    onClick={() => handleSectionClick(index)}
                  >
                    <div className={`${fontSize} font-bold ${textClass} transition-colors duration-200 mb-1`}>
                      {key}
                    </div>
                    <span className={`text-xs md:text-sm font-mono ${isActive ? 'text-white/80' : 'text-gray-500'} transition-colors duration-200`}>
                      {noteNames[index]}
                    </span>
                  </div>
                );
              })}
            </div>
            {!isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
                <div className="text-center p-4">
                  <p className="text-2xl md:text-3xl text-gray-400 mb-4 font-bold">Ready to Play?</p>
                  <div className="space-y-2 text-base md:text-lg text-gray-600">
                    <p>🎹 Tap the highlighted (black) piano key</p>
                    <p className="text-sm text-gray-500 mt-4">You have {currentLevelSpan} seconds to respond</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {/* Controls */}
          <div className="flex gap-2 md:gap-4 justify-center flex-wrap">
            {!isPlaying ? (
              <button
                onClick={startGame}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 text-white rounded-lg font-semibold hover:shadow-lg transition shadow-md text-base md:text-lg min-w-[120px]"
                style={{ background: `linear-gradient(90deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6" />
                Start Game
              </button>
            ) : null}
          </div>
          {/* Keyboard Hint - Adjusted for mobile as tap hints */}
          <div className="mt-4 md:mt-8 flex justify-center flex-col md:flex-row gap-2">
            {activeKeys.map((key, index) => (
              <div
                key={key}
                className="px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-lg border-2 min-w-[50px] md:min-w-[60px] text-center"
                style={{ backgroundColor: LIGHT_BLUE, borderColor: PRIMARY_BLUE }}
              >
                <p className="text-xs text-white font-semibold">Tap</p>
                <p className="text-xl md:text-2xl font-bold text-white">{key}</p>
                <p className="text-xs text-white/80">{noteNames[index]}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Current Session Data Preview */}
        {playData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-t">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Current Session Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
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
                        <span className={`font-semibold ${entry.responsetime === -1 ? 'text-yellow-600' : PRIMARY_BLUE}`}>
                          {entry.responsetime === -1 ? 'Exceeded' : `${entry.responsetime}s`}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {entry.correct === 1 && <span className="px-2 py-1 bg-green-100 rounded font-semibold" style={{ color: 'green' }}>✓ Correct</span>}
                        {entry.correct === -1 && <span className="px-2 py-1 bg-red-100 rounded font-semibold" style={{ color: 'red' }}>✗ Incorrect</span>}
                        {entry.correct === 0 && <span className="px-2 py-1 bg-yellow-100 rounded font-semibold" style={{ color: '#CCB000' }}>⊘ Not Done</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {playData.length > 10 && (
              <p className="text-xs md:text-sm text-gray-500 mt-2 text-center">Showing last 10 of {playData.length} attempts</p>
            )}
          </div>
        )}
        {/* Settings Modal (Colors Adjusted) */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 md:p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Game Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Level Span (seconds): <span className="text-xl md:text-2xl" style={{ color: PRIMARY_BLUE }}>{tempLevelSpan}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={tempLevelSpan}
                    onChange={(e) => setTempLevelSpan(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: PRIMARY_BLUE }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1s (Harder)</span>
                    <span>10s (Easier)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    This is how many seconds you'll have to respond to each key.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Number of Keys: <span className="text-xl md:text-2xl" style={{ color: PRIMARY_BLUE }}>{tempNumSections}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="9"
                    step="1"
                    value={tempNumSections}
                    onChange={(e) => setTempNumSections(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: PRIMARY_BLUE }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>2 (Easier)</span>
                    <span>9 (Harder)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Number of piano keys to use (A= C, S= D, etc.).
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={saveSettings}
                  className="flex-1 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition shadow-md"
                  style={{ background: `linear-gradient(90deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
                >
                  💾 Save Settings
                </button>
                <button
                  onClick={() => {
                    setTempLevelSpan(currentLevelSpan);
                    setTempNumSections(currentNumSections);
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
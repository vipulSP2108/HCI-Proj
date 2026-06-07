import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Accessibility, Type, Eye, Volume2, Square, X, ChevronUp, ChevronDown, Phone, PhoneCall, Stethoscope, User } from 'lucide-react';

const AccessibilityWidget = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSOSDialog, setShowSOSDialog] = useState(false);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [highContrast, setHighContrast] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  const readingElementsRef = useRef([]);
  const currentReadIndexRef = useRef(0);

  // Hide widget during gameplay
  const hideOnRoutes = ['/piano-reaction', '/shape-tracing', '/board-drawing', '/fruit-basket', '/in-cam-game'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.includes(route));

  // Load preferences
  useEffect(() => {
    const savedSize = localStorage.getItem('hci_a11y_font_size');
    if (savedSize) setFontSize(Number(savedSize));
    
    const savedContrast = localStorage.getItem('hci_a11y_contrast');
    if (savedContrast === 'true') setHighContrast(true);
  }, []);

  // Apply Font Size globally via rem scaling
  useEffect(() => {
    // 16px is default browser size. We scale it by percentage.
    const baseSize = 16 * (fontSize / 100);
    document.documentElement.style.fontSize = `${baseSize}px`;
    localStorage.setItem('hci_a11y_font_size', fontSize.toString());
  }, [fontSize]);

  // Apply High Contrast
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('hci_a11y_contrast', highContrast.toString());
  }, [highContrast]);

  // Handle routing changes - stop reading if user navigates
  useEffect(() => {
    stopReading();
  }, [location.pathname]);

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    
    // Clear highlights
    readingElementsRef.current.forEach(el => {
      if (el && el.classList) {
        el.classList.remove('read-aloud-highlight');
      }
    });
    readingElementsRef.current = [];
    currentReadIndexRef.current = 0;
  };

  const startReading = (mode = 'top') => {
    stopReading();
    setIsReading(true);

    // Find readable elements (excluding widget itself)
    const selectors = 'h1, h2, h3, h4, h5, h6, p, label, .readable';
    const rawElements = Array.from(document.querySelectorAll(selectors));
    
    // Filter out hidden elements or elements within this widget
    const elements = rawElements.filter(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      if (el.closest('.a11y-widget-container')) return false;
      if (!el.textContent.trim()) return false;
      return true;
    });

    let startIndex = 0;
    if (mode === 'current') {
      const headerOffset = 60; // Approximate fixed header allowance
      startIndex = elements.findIndex(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= -headerOffset;
      });
      if (startIndex === -1) startIndex = 0;
    }

    readingElementsRef.current = elements;
    currentReadIndexRef.current = startIndex;

    readNext();
  };

  const readNext = () => {
    if (currentReadIndexRef.current >= readingElementsRef.current.length) {
      stopReading();
      return;
    }

    const el = readingElementsRef.current[currentReadIndexRef.current];
    const text = el.textContent.trim();
    
    if (!text) {
      currentReadIndexRef.current++;
      readNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Slightly slower rate for older patients
    utterance.rate = 0.9;
    
    utterance.onstart = () => {
      el.classList.add('read-aloud-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    utterance.onend = () => {
      el.classList.remove('read-aloud-highlight');
      currentReadIndexRef.current++;
      readNext();
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error", e);
      el.classList.remove('read-aloud-highlight');
      currentReadIndexRef.current++;
      readNext();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleCallDoctor = () => {
    const phone = user?.doctor?.[0]?.doctorphone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      alert('No doctor phone number found in your profile.');
    }
    setShowSOSDialog(false);
  };

  const handleCallCaretaker = () => {
    const phone = user?.caretaker?.[0]?.caretakerphone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      alert('No caretaker phone number found in your profile.');
    }
    setShowSOSDialog(false);
  };

  const SOSDialog = (
    showSOSDialog && (
      <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center border-4 border-red-500 transform transition-all">
          <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <PhoneCall size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Emergency Help</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Who would you like to call?</p>
          <div className="space-y-3">
            <button 
              onClick={handleCallDoctor}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition shadow-md"
            >
              <Stethoscope size={24} /> Call Doctor
            </button>
            <button 
              onClick={handleCallCaretaker}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition shadow-md"
            >
              <User size={24} /> Call Care Taker
            </button>
            <button 
              onClick={() => setShowSOSDialog(false)}
              className="w-full py-3 mt-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  );

  const isPianoGame = location.pathname.includes('/piano-reaction');
  const displayClass = isPianoGame ? 'hidden md:flex' : 'flex';

  const containerClasses = shouldHide
    ? `a11y-widget-container fixed top-1/2 right-0 -translate-y-1/2 z-[9999] ${displayClass} flex-col items-end pointer-events-none`
    : `a11y-widget-container fixed bottom-6 right-6 z-[9999] ${displayClass} flex-col items-end pointer-events-none`;

  const menuClasses = `bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-4 border-blue-500 p-4 mb-2 w-72 transition-all duration-300 pointer-events-auto flex flex-col max-h-[65vh] ${
    shouldHide ? 'origin-right mr-2' : 'origin-bottom-right'
  } ${
    isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 hidden'
  }`;

  const toggleBtnClasses = `pointer-events-auto flex items-center justify-center transition-all duration-300 ${
    shouldHide && !isOpen
      ? 'bg-blue-600/50 text-white p-3 rounded-l-2xl shadow-lg hover:bg-blue-600 hover:-translate-x-1 border-y border-l border-white/30 backdrop-blur-sm opacity-50 hover:opacity-100'
      : 'bg-blue-600 text-white p-3 md:p-4 rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 border-2 md:border-4 border-white dark:border-gray-800'
  }`;

  return (
    <>
      {SOSDialog}
      <div className={containerClasses}>
      
      {/* Expanded Menu */}
      <div className={menuClasses}>
        <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-2 flex-shrink-0">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
            <Accessibility className="text-blue-500" size={20} /> Accessibility
          </h3>
          <button onClick={() => setIsOpen(false)} className="p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
          {/* Text Size */}
          <div>
            <label className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 mb-2 text-base">
              <Type className="text-blue-500" size={18} /> Text Size ({fontSize}%)
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setFontSize(prev => Math.max(80, prev - 10))}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-base active:scale-95 transition"
              >
                A-
              </button>
              <button 
                onClick={() => setFontSize(100)}
                className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-bold text-sm active:scale-95 transition"
              >
                Reset
              </button>
              <button 
                onClick={() => setFontSize(prev => Math.min(150, prev + 10))}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-lg active:scale-95 transition"
              >
                A+
              </button>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* High Contrast */}
          <button 
            onClick={() => setHighContrast(!highContrast)}
            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition active:scale-95 ${
              highContrast 
                ? 'bg-amber-500 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye size={18} /> High Contrast {highContrast ? 'On' : 'Off'}
          </button>

          <hr className="border-gray-200" />

          {/* Read Aloud */}
          <div>
            <label className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200 mb-2 text-base">
              <Volume2 className="text-blue-500" size={18} /> Read Screen Aloud
            </label>
            {isReading ? (
              <button 
                onClick={stopReading}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-sm active:scale-95 transition animate-pulse"
              >
                <Square fill="currentColor" size={18} /> Stop Reading
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => startReading('top')}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition"
                >
                  {/* <Volume2 size={16} />  */}
                  Read From Top View
                </button>
                <button 
                  onClick={() => startReading('current')}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition"
                >
                  {/* <Eye size={16} />  */}
                  {/* Read  */}
                  Read From Current View
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* SOS Button */}
          <div>
            <button 
              onClick={() => setShowSOSDialog(true)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
            >
              <Phone size={20} /> Emergency SOS
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={toggleBtnClasses}
        aria-label="Accessibility Settings"
        title="Accessibility Settings"
      >
        {isOpen ? <ChevronDown size={shouldHide ? 24 : 32} /> : <Accessibility size={shouldHide ? 24 : 32} />}
      </button>

    </div>
    </>
  );
};

export default AccessibilityWidget;

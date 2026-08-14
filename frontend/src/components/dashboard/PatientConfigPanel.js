import React, { useState, useEffect, useMemo } from 'react';
import GameParameterConfig from './GameParameterConfig';
import { patientConfigService } from '../../services/patientConfigService';
import { Loader2, Music, Target, Activity, Edit3, Save, AlertCircle, Settings2 } from 'lucide-react';

const GAMES = [
  { id: 'piano', label: 'Piano Reaction', icon: <Music className="w-4 h-4" /> },
  { id: 'boardDrawing', label: 'Shape Tracer', icon: <Target className="w-4 h-4" /> },
  { id: 'fruitBasket', label: 'Arm Orchard', icon: <Activity className="w-4 h-4" /> },
];

const DEFAULT_PARAMS = {
  piano: {
    responseTimer: { value: 3, minBound: 1, maxBound: 10 },
    disabledKeys: { value: "" },
    wristKeysCount: { value: 9, minBound: 2, maxBound: 9 },
    wristKeyTimer: { value: 2, minBound: 1, maxBound: 10 },
    sessionLength: { value: 300, minBound: 60, maxBound: 600 }
  },
  boardDrawing: {
    greenZone: { value: 2.5, minBound: 0.1, maxBound: 50 },
    yellowZone: { value: 5.0, minBound: 0.1, maxBound: 50 },
    assistiveMode: { value: 0, minBound: 0, maxBound: 1 },
    sessionLength: { value: 300, minBound: 60, maxBound: 1200 },
    patientFreedom: { value: "" },
    allowedShapes: { value: "random,circle,square,spiral,star" }
  },
  fruitBasket: {
    cooldownSeconds: { value: 3, minBound: 1, maxBound: 15 },
    maxAttempts: { value: 3, minBound: 1, maxBound: 10 },
    trialTimeoutSeconds: { value: 10, minBound: 3, maxBound: 60 },
    sessionLength: { value: 300, minBound: 60, maxBound: 600 },
    assistiveMode: { value: 2, minBound: 0, maxBound: 2 },
    patientFreedom: { value: "" }
  }
};

const MultiSelectCheckboxGroup = ({ label, description, options, value, onChange, disabled }) => {
  const selected = value ? value.split(',').filter(Boolean) : [];
  
  const toggleOption = (opt) => {
    if (disabled) return;
    let newSelected;
    if (selected.includes(opt)) {
      newSelected = selected.filter(s => s !== opt);
    } else {
      newSelected = [...selected, opt];
    }
    onChange(newSelected.join(','));
  };
  const selectedOptions = options.filter(opt => selected.includes(opt.id));
  const unselectedOptions = options.filter(opt => !selected.includes(opt.id));

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
      <div>
        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary-500" />
          {label}
        </h4>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      
      <div className="space-y-4 mt-4">
        {/* Selected Box */}
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 rounded-xl min-h-[60px]">
          <div className="text-[10px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2">
            Selected (Active)
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedOptions.length === 0 ? (
              <span className="text-xs text-primary-400 dark:text-primary-600/50 italic">None selected</span>
            ) : (
              selectedOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOption(opt.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-800 dark:border-primary-600 dark:text-primary-100 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-200 dark:hover:bg-primary-700 cursor-pointer shadow-sm hover:shadow'
                  }`}
                >
                  {opt.label} ✕
                </button>
              ))
            )}
          </div>
        </div>

        {/* Unselected Box */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[60px]">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Available Options
          </div>
          <div className="flex flex-wrap gap-2">
            {unselectedOptions.length === 0 ? (
              <span className="text-xs text-gray-400 italic">All options selected</span>
            ) : (
              unselectedOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOption(opt.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all bg-white border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer hover:text-gray-900 dark:hover:text-white shadow-sm hover:shadow'
                  }`}
                >
                  {opt.label} +
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientConfigPanel = ({ patientId, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('piano');
  
  // Local editable state for all games
  const [draftConfig, setDraftConfig] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success'|'error', text: '' }
  const [isSaving, setIsSaving] = useState(false);

  const isDoctor = userRole === 'doctor' || userRole === 'admin';

  useEffect(() => {
    fetchConfig();
  }, [patientId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await patientConfigService.getConfig(patientId);
      
      // Build a full draft config merged with defaults
      const dbGames = res.config?.games || {};
      const newDraft = {};
      
      GAMES.forEach(game => {
        newDraft[game.id] = {};
        const gameParams = DEFAULT_PARAMS[game.id];
        const dbGameParams = dbGames[game.id] || {};
        
        Object.keys(gameParams).forEach(paramKey => {
          const defaults = gameParams[paramKey];
          const dbVal = dbGameParams[paramKey] || {};
          
          newDraft[game.id][paramKey] = {
            modality: dbVal.modality || 'STRICT',
            value: dbVal.value !== undefined ? dbVal.value : defaults.value,
            minBound: dbVal.minBound !== undefined && dbVal.minBound !== null ? dbVal.minBound : defaults.minBound,
            maxBound: dbVal.maxBound !== undefined && dbVal.maxBound !== null ? dbVal.maxBound : defaults.maxBound
          };
        });
      });
      
      setDraftConfig(newDraft);
    } catch (error) {
      console.error('Failed to load patient game configs');
    } finally {
      setLoading(false);
    }
  };

  // The active game's modality is taken from the first parameter
  const currentGameModality = useMemo(() => {
    if (!draftConfig[activeTab]) return 'STRICT';
    const firstParam = Object.values(draftConfig[activeTab])[0];
    return firstParam?.modality || 'STRICT';
  }, [draftConfig, activeTab]);

  const setGameModality = (newModality) => {
    if (!isDoctor) return;
    
    setDraftConfig(prev => {
      const next = { ...prev };
      const gameUpdates = { ...next[activeTab] };
      Object.keys(gameUpdates).forEach(paramKey => {
        gameUpdates[paramKey] = { ...gameUpdates[paramKey], modality: newModality };
      });
      next[activeTab] = gameUpdates;
      return next;
    });
  };

  const handleParamChange = (paramKey, field, value) => {
    setDraftConfig(prev => {
      const next = { ...prev };
      next[activeTab] = {
        ...next[activeTab],
        [paramKey]: {
          ...next[activeTab][paramKey],
          [field]: value
        }
      };
      return next;
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    
    const updates = {};
    
    // We only save the currently active tab's changes to be efficient, or we could save everything.
    // The user said: "make a coomion save which will save all chnages done thee in singel"
    // So let's save the entire draftConfig.
    Object.keys(draftConfig).forEach(gameName => {
      Object.keys(draftConfig[gameName]).forEach(paramKey => {
        const paramData = draftConfig[gameName][paramKey];
        const basePath = `games.${gameName}.${paramKey}`;
        
        if (isDoctor) {
          updates[`${basePath}.modality`] = paramData.modality;
          updates[`${basePath}.value`] = paramData.value;
          if (paramData.modality !== 'STRICT') {
            updates[`${basePath}.minBound`] = paramData.minBound;
            updates[`${basePath}.maxBound`] = paramData.maxBound;
          }
        } else {
          // Caretakers can only update 'value' when modality is CARETAKER
          if (paramData.modality === 'CARETAKER') {
            updates[`${basePath}.value`] = paramData.value;
          }
        }
      });
    });
    
    if (Object.keys(updates).length === 0) {
      setIsSaving(false);
      setSaveStatus({ type: 'warning', text: 'No authorized changes to save.' });
      setTimeout(() => setSaveStatus(null), 5000);
      return;
    }

    try {
      const res = await patientConfigService.updateConfig(patientId, updates);
      if (res?.warning) {
        setSaveStatus({ type: 'warning', text: res.warning });
      } else {
        setSaveStatus({ type: 'success', text: 'All changes saved successfully.' });
      }
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err) {
      console.error("Failed to update game modality", err);
      setSaveStatus({ type: 'error', text: 'Failed to save changes.' });
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !draftConfig[activeTab]) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-primary-500" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full relative pb-16">
      {/* Sidebar Tabs */}
      <div className="md:w-48 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 pr-4 space-y-1 sticky top-0 self-start">
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => setActiveTab(game.id)}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === game.id 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {game.icon}
            <span className="text-left">{game.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {/* Game Modality Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {GAMES.find(g => g.id === activeTab)?.label} Settings
            </h3>
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">
              Configuration Mode
            </p>
          </div>
          
          {isDoctor ? (
            <select 
              value={currentGameModality} 
              onChange={(e) => setGameModality(e.target.value)}
              className="mt-3 sm:mt-0 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
            >
              <option value="STRICT">Strict Mode (Doctor Only)</option>
              <option value="CARETAKER">Caretaker Delegated</option>
              <option value="DYNAMIC">Dynamic Auto-Scaling</option>
            </select>
          ) : (
            <span className="mt-3 sm:mt-0 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg text-xs font-bold border border-gray-100 dark:border-gray-700 shadow-sm text-gray-600">
              {currentGameModality === 'STRICT' ? 'Doctor Managed' : currentGameModality === 'CARETAKER' ? 'Caretaker Delegated' : 'Auto-Scaling Active'}
            </span>
          )}
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 gap-4">
          {activeTab === 'piano' && (
            <>
              <GameParameterConfig
                gameName="piano"
                paramKey="responseTimer"
                paramLabel="Key Response Timer (sec)"
                description="Time the patient has to press the correct key before it's considered a miss."
                currentValue={draftConfig.piano.responseTimer.value}
                currentMin={draftConfig.piano.responseTimer.minBound}
                currentMax={draftConfig.piano.responseTimer.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="piano"
                paramKey="disabledKeys"
                paramLabel="Piano Disabled Keys (comma separated)"
                description="e.g. C4, D4. Leave empty for none."
                currentValue={draftConfig.piano.disabledKeys.value}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="piano"
                paramKey="wristKeysCount"
                paramLabel="Piano Wrist Keys Count (2-9)"
                description="Number of active keys for Piano Wrist mode"
                currentValue={draftConfig.piano.wristKeysCount.value}
                currentMin={draftConfig.piano.wristKeysCount.minBound}
                currentMax={draftConfig.piano.wristKeysCount.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="piano"
                paramKey="wristKeyTimer"
                paramLabel="Piano Wrist Key Timer (seconds)"
                description="Time given per key in Piano Wrist mode"
                currentValue={draftConfig.piano.wristKeyTimer.value}
                currentMin={draftConfig.piano.wristKeyTimer.minBound}
                currentMax={draftConfig.piano.wristKeyTimer.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="piano"
                paramKey="sessionLength"
                paramLabel="Session Length (sec)"
                currentValue={draftConfig.piano.sessionLength.value}
                currentMin={draftConfig.piano.sessionLength.minBound}
                currentMax={draftConfig.piano.sessionLength.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
            </>
          )}

          {activeTab === 'boardDrawing' && draftConfig.boardDrawing && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <GameParameterConfig
                gameName="boardDrawing"
                paramKey="greenZone"
                paramLabel="Safe Zone (%)"
                description="Inner perfect boundary."
                currentValue={draftConfig.boardDrawing.greenZone.value}
                currentMin={draftConfig.boardDrawing.greenZone.minBound}
                currentMax={draftConfig.boardDrawing.greenZone.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="boardDrawing"
                paramKey="yellowZone"
                paramLabel="Warning Zone (%)"
                description="Outer boundary before trace breaks."
                currentValue={draftConfig.boardDrawing.yellowZone.value}
                currentMin={draftConfig.boardDrawing.yellowZone.minBound}
                currentMax={draftConfig.boardDrawing.yellowZone.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="boardDrawing"
                paramKey="assistiveMode"
                paramLabel="Assistive Mode"
                description="Allows picking shapes via Dwell (Hold) instead of Drag & Drop."
                currentValue={draftConfig.boardDrawing.assistiveMode.value}
                currentMin={draftConfig.boardDrawing.assistiveMode.minBound}
                currentMax={draftConfig.boardDrawing.assistiveMode.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
                options={[
                  { value: 0, label: 'Off' },
                  { value: 1, label: 'On' }
                ]}
              />
              <GameParameterConfig
                gameName="boardDrawing"
                paramKey="sessionLength"
                paramLabel="Session Length (sec)"
                currentValue={draftConfig.boardDrawing.sessionLength.value}
                currentMin={draftConfig.boardDrawing.sessionLength.minBound}
                currentMax={draftConfig.boardDrawing.sessionLength.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              {(isDoctor || currentGameModality === 'CARETAKER') && (
                <>
                  <MultiSelectCheckboxGroup
                    label="Patient Freedom (Board Drawing)"
                    description="Allow the patient to override these specific settings during gameplay."
                    options={[
                      { id: 'greenZone', label: 'Safe Zone' },
                      { id: 'yellowZone', label: 'Warning Zone' },
                      { id: 'assistiveMode', label: 'Assistive Mode' }
                    ]}
                    value={draftConfig.boardDrawing.patientFreedom.value}
                    onChange={(val) => handleParamChange('patientFreedom', 'value', val)}
                  />
                  <MultiSelectCheckboxGroup
                    label="Allowed Target Shapes"
                    description="Select which shapes the patient is allowed to trace. (If none selected, defaults to all)"
                    options={[
                      { id: 'random', label: 'Randomize' },
                      { id: 'circle', label: 'Circle' },
                      { id: 'ellipse', label: 'Ellipse' },
                      { id: 'triangle', label: 'Triangle' },
                      { id: 'square', label: 'Square' },
                      { id: 'hexagon', label: 'Hexagon' },
                      { id: 'star', label: 'Star' },
                      { id: 'heart', label: 'Heart' },
                      { id: 'diamond', label: 'Diamond' },
                      { id: 'spiral', label: 'Spiral' },
                      { id: 'infinity', label: 'Infinity' },
                      { id: 'zigzag', label: 'Zigzag' }
                    ]}
                    value={draftConfig.boardDrawing.allowedShapes.value}
                    onChange={(val) => handleParamChange('allowedShapes', 'value', val)}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'fruitBasket' && (
            <>
              <GameParameterConfig
                gameName="fruitBasket"
                paramKey="cooldownSeconds"
                paramLabel="Cooldown Between Fruits (sec)"
                description="Wait time before the next fruit spawns after completing a trial."
                currentValue={draftConfig.fruitBasket.cooldownSeconds.value}
                currentMin={draftConfig.fruitBasket.cooldownSeconds.minBound}
                currentMax={draftConfig.fruitBasket.cooldownSeconds.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="fruitBasket"
                paramKey="maxAttempts"
                paramLabel="Max Attempts per Trial"
                description="Number of attempts allowed before a trial is marked as failed."
                currentValue={draftConfig.fruitBasket.maxAttempts.value}
                currentMin={draftConfig.fruitBasket.maxAttempts.minBound}
                currentMax={draftConfig.fruitBasket.maxAttempts.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="fruitBasket"
                paramKey="trialTimeoutSeconds"
                paramLabel="Trial Timeout (sec)"
                description="How long the patient has for each attempt before it's marked as a timeout."
                currentValue={draftConfig.fruitBasket.trialTimeoutSeconds.value}
                currentMin={draftConfig.fruitBasket.trialTimeoutSeconds.minBound}
                currentMax={draftConfig.fruitBasket.trialTimeoutSeconds.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              <GameParameterConfig
                gameName="fruitBasket"
                paramKey="assistiveMode"
                paramLabel="Assistive Mode"
                description="Force Dwell pick/drop mode. Auto allows the calibration to decide."
                currentValue={draftConfig.fruitBasket.assistiveMode.value}
                currentMin={draftConfig.fruitBasket.assistiveMode.minBound}
                currentMax={draftConfig.fruitBasket.assistiveMode.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
                options={[
                  { value: 0, label: 'Off' },
                  { value: 1, label: 'On' },
                  { value: 2, label: 'Auto' }
                ]}
              />
              <GameParameterConfig
                gameName="fruitBasket"
                paramKey="sessionLength"
                paramLabel="Session Length (sec)"
                currentValue={draftConfig.fruitBasket.sessionLength.value}
                currentMin={draftConfig.fruitBasket.sessionLength.minBound}
                currentMax={draftConfig.fruitBasket.sessionLength.maxBound}
                gameModality={currentGameModality}
                userRole={userRole}
                onChange={handleParamChange}
              />
              {(isDoctor || currentGameModality === 'CARETAKER') && (
                <MultiSelectCheckboxGroup
                  label="Patient Freedom (Arm Orchard)"
                  description="Allow the patient to override these specific settings during gameplay."
                  options={[
                    { id: 'assistiveMode', label: 'Assistive Mode' }
                  ]}
                  value={draftConfig.fruitBasket.patientFreedom.value}
                  onChange={(val) => handleParamChange('patientFreedom', 'value', val)}
                />
              )}
            </>
          )}
        </div>

        {/* Global Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex-1 mr-4">
            {saveStatus && (
              <div className={`flex items-center gap-2 text-sm font-bold p-3 rounded-xl ${
                saveStatus.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 
                saveStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {saveStatus.text}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientConfigPanel;

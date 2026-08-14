import React from 'react';
import { Settings2 } from 'lucide-react';

const GameParameterConfig = ({ 
  gameName, 
  paramKey, 
  paramLabel, 
  description,
  defaultValue,
  userRole,
  
  // These come from the parent's draft state or actual config
  currentValue,
  currentMin,
  currentMax,
  gameModality,
  options,
  
  onChange
}) => {
  const isDoctor = userRole === 'doctor' || userRole === 'admin';
  const isCaretaker = userRole === 'caretaker';

  if (isCaretaker && gameModality !== 'CARETAKER') {
    const displayValue = options 
      ? options.find(opt => opt.value === currentValue)?.label || currentValue
      : currentValue;
      
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 opacity-60 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-gray-700 dark:text-gray-300">{paramLabel}</h4>
          <p className="text-xs text-gray-500">Managed by Doctor (Strict Mode)</p>
        </div>
        <div className="text-lg font-black text-gray-500">{displayValue}</div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary-500" />
            {paramLabel}
          </h4>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
        </div>
        
        {isCaretaker && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
            Caretaker Access
          </span>
        )}
      </div>

      <div className={options ? "w-full" : "grid grid-cols-1 md:grid-cols-3 gap-4"}>
        {options ? (
          <div className="flex gap-2 w-full mt-2">
            {options.map(opt => {
              const isSelected = currentValue === opt.value;
              
              // Caretaker logic: if opt.value is greater than currentMax, it's disabled.
              const isDisabled = isCaretaker && opt.value > currentMax;
              
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(paramKey, 'value', opt.value);
                    if (isDoctor) {
                      // Automatically cap the maxBound so the caretaker can't exceed this choice
                      onChange(paramKey, 'maxBound', opt.value);
                      onChange(paramKey, 'minBound', 0);
                    }
                  }}
                  disabled={isDisabled}
                  className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition-all ${
                    isSelected 
                      ? 'bg-primary-500 text-white shadow-md border-transparent' 
                      : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''} border`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Value</label>
            <input 
              type={typeof currentValue === 'string' ? "text" : "number"} 
              step="any"
              value={currentValue}
              onChange={(e) => {
                let val = typeof currentValue === 'string' ? e.target.value : Number(e.target.value);
                onChange(paramKey, 'value', val);
              }}
              onBlur={(e) => {
                if (isCaretaker && typeof currentValue !== 'string') {
                  let val = Number(e.target.value);
                  if (val < currentMin) val = currentMin;
                  if (val > currentMax) val = currentMax;
                  if (val !== Number(currentValue)) {
                    onChange(paramKey, 'value', val);
                  }
                }
              }}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {!options && gameModality !== 'STRICT' && typeof currentValue !== 'string' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Min Bound</label>
              <input 
                type="number" 
                step="any"
                value={currentMin}
                onChange={(e) => onChange(paramKey, 'minBound', Number(e.target.value))}
                disabled={!isDoctor}
                className={`w-full px-3 py-2 border rounded-xl font-bold focus:ring-2 focus:ring-primary-500 ${isDoctor ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 border-transparent opacity-70 cursor-not-allowed'}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Max Bound</label>
              <input 
                type="number" 
                step="any"
                value={currentMax}
                onChange={(e) => onChange(paramKey, 'maxBound', Number(e.target.value))}
                disabled={!isDoctor}
                className={`w-full px-3 py-2 border rounded-xl font-bold focus:ring-2 focus:ring-primary-500 ${isDoctor ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 border-transparent opacity-70 cursor-not-allowed'}`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameParameterConfig;

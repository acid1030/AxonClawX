import React, { useState } from 'react';
import { useThemeStore, ThemeColor } from '../../store';

export const ThemeToggle: React.FC = () => {
  const { mode, color, toggleMode, setColor } = useThemeStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const themeColors: ThemeColor[] = ['indigo', 'purple', 'blue'];
  
  const colorClasses: Record<ThemeColor, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
  };

  const colorIcons: Record<ThemeColor, string> = {
    indigo: '🔮',
    purple: '💜',
    blue: '💙',
  };

  return (
    <div className="relative">
      {/* Theme Mode Toggle */}
      <button
        onClick={toggleMode}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
        title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
      >
        {mode === 'dark' ? (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
        
        {/* Tooltip */}
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {mode === 'dark' ? '亮色模式' : '暗色模式'}
        </span>
      </button>

      {/* Color Picker Toggle */}
      <button
        onClick={() => setShowColorPicker(!showColorPicker)}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative ml-1"
        title="选择主题色"
      >
        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colorClasses[color]} ring-2 ring-white/20`} />
        
        {/* Tooltip */}
        <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          主题色
        </span>
      </button>

      {/* Color Picker Dropdown */}
      {showColorPicker && (
        <div className="absolute right-0 mt-2 p-3 glass rounded-xl shadow-xl border border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-gray-400 mb-2">选择主题色</div>
          <div className="flex gap-2">
            {themeColors.map((themeColor) => (
              <button
                key={themeColor}
                onClick={() => {
                  setColor(themeColor);
                  setShowColorPicker(false);
                }}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClasses[themeColor]} ring-2 transition-all duration-200 ${
                  color === themeColor ? 'ring-white scale-110' : 'ring-white/20 hover:scale-105'
                }`}
                title={themeColor}
              >
                <span className="sr-only">{themeColor}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default ThemeToggle;

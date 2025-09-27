import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ApiKeySettingsProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  uiTheme: { color: string; opacity: number };
  buttonTheme: { color: string; opacity: number };
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({
  apiKey,
  onApiKeyChange,
  uiTheme,
  buttonTheme
}) => {
  const { t } = useTranslation();
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onApiKeyChange(localApiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    setLocalApiKey('');
    onApiKeyChange('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const isValidApiKey = (key: string) => {
    return key.trim().length > 0 && key.startsWith('AIza');
  };

  return (
    <div className="space-y-3">
      <div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder={t('apiKeySettings.placeholder', '请输入您的 Gemini API Key')}
              className="w-full px-3 py-2 pr-20 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
              {localApiKey && (
                <div>
                  {isValidApiKey(localApiKey) ? (
                    <span className="text-green-400 text-sm">✓</span>
                  ) : (
                    <span className="text-red-400 text-sm">✗</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {localApiKey && !isValidApiKey(localApiKey) && (
            <p className="text-red-400 text-sm mt-1">
              {t('apiKeySettings.invalidKey', 'API Key 格式无效，应以 "AIza" 开头')}
            </p>
          )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleSave}
          disabled={!localApiKey.trim()}
          style={{
            backgroundColor: `${buttonTheme.color}${Math.round(buttonTheme.opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaved ? '✓ ' + t('apiKeySettings.saved', '已保存') : t('apiKeySettings.save', '保存')}
        </button>
        
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:bg-red-700"
        >
          {t('apiKeySettings.clear', '清空')}
        </button>
      </div>

      <div className="text-sm text-gray-400 space-y-2">
        <p>
          {t('apiKeySettings.description', '秘钥将安全地保存在您的本地存储中。')}
        </p>
        <p>
          {t('apiKeySettings.getKey', '获取 API Key：')}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline ml-1"
          >
            Google AI Studio
          </a>
        </p>
      </div>

      {apiKey && (
        <div className="p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">✓</span>
            <span className="text-green-300 text-sm">
              {t('apiKeySettings.configured', 'API Key 已配置')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: () => void;
  t: (key: string) => string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, t }) => {
  const [step, setStep] = useState<number>(1);
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    // 添加动画效果
    const timer = setTimeout(() => {
      setVisible(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [step]);

  const handleNext = () => {
    if (step < 2) {
      setVisible(false);
      setTimeout(() => {
        setStep(step + 1);
      }, 300);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setVisible(false);
    setTimeout(() => {
      onComplete();
      // 保存到本地存储，确保引导只显示一次
      localStorage.setItem('onboardingCompleted', 'true');
    }, 300);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center">
            <div className="mb-4 text-center">
              <svg className="w-16 h-16 mx-auto mb-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
              <h3 className="text-xl font-bold">在这里画画</h3>
              <p className="text-gray-300 mt-2">
                使用工具栏中的绘图工具在画布上创作
              </p>
            </div>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              下一步
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center">
            <div className="mb-4 text-center">
              <svg className="w-16 h-16 mx-auto mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <h3 className="text-xl font-bold">点击这里生成</h3>
              <p className="text-gray-300 mt-2">
                输入提示词，点击生成按钮，AI将根据您的绘画创作内容
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              开始创作
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div 
        className={`bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl transform transition-all duration-300 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {renderStep()}
      </div>
      
      {step === 1 && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
          <svg className="w-20 h-20 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-400 rounded-full animate-ping opacity-50"></div>
        </div>
      )}
      
      {step === 2 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 animate-pulse">
          <svg className="w-20 h-20 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-green-400 rounded-full animate-ping opacity-50"></div>
        </div>
      )}
    </div>
  );
};
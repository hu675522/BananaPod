

import React, { useEffect, useState } from 'react';

interface LoaderProps {
    progressMessage: string;
    progress?: number; // 进度百分比 (0-100)
}

export const Loader: React.FC<LoaderProps> = ({ progressMessage, progress }) => {
    const [visible, setVisible] = useState(false);
    const [displayProgress, setDisplayProgress] = useState(0);
    
    useEffect(() => {
        // 立即显示加载状态
        setVisible(true);
        return () => setVisible(false);
    }, []);

    // 平滑进度条动画
    useEffect(() => {
        if (progress !== undefined) {
            const timer = setTimeout(() => {
                setDisplayProgress(progress);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
                className={`transition-all duration-300 ease-in-out transform ${
                    visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
            >
                <div className="w-auto max-w-md px-6 py-4 bg-neutral-900/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col items-center justify-center space-y-4">
                    {/* 旋转加载图标 */}
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    
                    {/* 进度条 */}
                    {progress !== undefined && (
                        <div className="w-full space-y-2">
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${displayProgress}%` }}
                                ></div>
                            </div>
                            <div className="text-center text-sm text-gray-300">
                                {Math.round(displayProgress)}%
                            </div>
                        </div>
                    )}
                    
                    {/* 进度消息 */}
                    <span className="text-white text-base font-medium text-center">{progressMessage || 'Generating...'}</span>
                </div>
            </div>
        </div>
    );
};

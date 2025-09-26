

import React, { useEffect, useState } from 'react';

interface LoaderProps {
    progressMessage: string;
}

export const Loader: React.FC<LoaderProps> = ({ progressMessage }) => {
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        // 立即显示加载状态
        setVisible(true);
        return () => setVisible(false);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
                className={`transition-all duration-300 ease-in-out transform ${
                    visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
            >
                <div className="w-auto max-w-md px-6 py-4 bg-neutral-900/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col items-center justify-center space-y-3">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-white text-base font-medium">{progressMessage || 'Generating...'}</span>
                </div>
            </div>
        </div>
    );
};

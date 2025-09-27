import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    ),
                    confirmButtonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                };
            case 'warning':
                return {
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    ),
                    confirmButtonClass: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                };
            default:
                return {
                    icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="m9 12 2 2 4-4"/>
                        </svg>
                    ),
                    confirmButtonClass: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                };
        }
    };

    const typeStyles = getTypeStyles();

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={onCancel}
        >
            <div 
                className="relative backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col w-full max-w-md text-white animate-in fade-in-0 zoom-in-95 duration-300"
                style={{ 
                    backgroundColor: 'rgba(30, 27, 75, 0.95)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="flex flex-col items-center text-center p-8 pb-4">
                    <div className="flex-shrink-0 p-3 rounded-full bg-red-500/20 mb-4">
                        {typeStyles.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-wide mb-3">{title}</h3>
                    <p className="text-gray-200 leading-relaxed text-base max-w-sm">
                        {message}
                    </p>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 p-6 pt-4 border-t border-white/10">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-3.5 text-sm font-medium text-gray-300 bg-slate-700/60 border border-slate-600/60 rounded-xl hover:bg-slate-600/70 hover:border-slate-500/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400/50 active:scale-[0.98] transition-all duration-200 backdrop-blur-sm shadow-lg shadow-slate-900/20"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 border border-red-400/40 rounded-xl hover:from-red-600 hover:to-red-700 hover:border-red-300/60 hover:shadow-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-400/50 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-red-500/30"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
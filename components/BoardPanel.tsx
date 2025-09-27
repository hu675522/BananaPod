
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Board } from '../types';
import { translations } from '../translations';
import { ConfirmDialog } from './ConfirmDialog';

interface BoardPanelProps {
    isOpen: boolean;
    onClose: () => void;
    boards: Board[];
    activeBoardId: string;
    onSwitchBoard: (id: string) => void;
    onAddBoard: () => void;
    onRenameBoard: (id: string, name: string) => boolean;
    onDuplicateBoard: (id: string) => void;
    onDeleteBoard: (id: string) => void;
    generateBoardThumbnail: (elements: Board['elements']) => string;
    language: 'en' | 'zho';
}

const BoardItem: React.FC<{
    board: Board;
    isActive: boolean;
    thumbnail: string;
    onClick: () => void;
    onRename: (name: string) => boolean;
    onDuplicate: () => void;
    onDelete: () => void;
    language: 'en' | 'zho';
    totalBoards: number;
}> = ({ board, isActive, thumbnail, onClick, onRename, onDuplicate, onDelete, language, totalBoards }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(board.name);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setName(board.name);
    }, [board.name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBlur = () => {
        setIsEditing(false);
        if (name.trim() === '') {
            setName(board.name);
        } else if (name.trim() !== board.name) {
            const success = onRename(name.trim());
            if (!success) {
                // If rename failed, revert to original name
                setName(board.name);
            }
        }
    };
    
    const handleMenuAction = (action: 'rename' | 'duplicate' | 'delete') => {
        setMenuOpen(false);
        switch (action) {
            case 'rename':
                setIsEditing(true);
                break;
            case 'duplicate':
                onDuplicate();
                break;
            case 'delete':
                if (totalBoards <= 1) {
                    alert(t('boards.cannotDeleteLast'));
                } else {
                    setShowDeleteConfirm(true);
                }
                break;
        }
    };

    const handleDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        onDelete();
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <div 
            onClick={onClick}
            className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-green-500/30' : 'hover:bg-white/10'}`}
        >
            <div className={`aspect-[3/2] w-full rounded-md mb-2 overflow-hidden border-2 ${isActive ? 'border-green-500' : 'border-transparent'}`}>
                <img src={thumbnail} alt={`${board.name} thumbnail`} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center justify-between">
                {isEditing ? (
                     <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                        className="w-full bg-transparent border-b border-green-400 outline-none text-white text-sm"
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span 
                        className="text-sm truncate" 
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >
                        {board.name}
                    </span>
                )}
               
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(p => !p); }} 
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 bottom-full mb-1 z-10 w-32 bg-neutral-800 rounded-md shadow-lg border border-white/10 py-1 text-sm">
                            <button onClick={() => handleMenuAction('rename')} className="block w-full text-left px-3 py-1.5 hover:bg-white/10">{t('boards.rename')}</button>
                            <button onClick={() => handleMenuAction('duplicate')} className="block w-full text-left px-3 py-1.5 hover:bg-white/10">{t('boards.duplicate')}</button>
                            <div className="my-1 border-t border-white/10"></div>
                            <button onClick={() => handleMenuAction('delete')} className="block w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400">{t('boards.delete')}</button>
                        </div>
                    )}
                </div>
            </div>
            
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title={t('boards.deleteConfirm')}
                message={`${t('boards.deleteMessage')} "${board.name}"?`}
                type="danger"
                confirmText={t('boards.delete')}
                cancelText={t('common.cancel')}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
            />
        </div>
    );
};


export const BoardPanel: React.FC<BoardPanelProps> = ({ 
    isOpen, onClose, boards, activeBoardId, onSwitchBoard, onAddBoard, 
    onRenameBoard, onDuplicateBoard, onDeleteBoard, generateBoardThumbnail, language 
}) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
         <div 
            className="absolute top-4 left-4 z-20 flex flex-col w-64 h-[calc(100vh-2rem)] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden"
            style={{ backgroundColor: 'var(--ui-bg-color)' }}
        >
            <div className="flex-shrink-0 flex justify-between items-center p-3 border-b border-white/10">
                <h3 className="text-base font-semibold">{t('boards.title')}</h3>
                <div className="flex items-center space-x-1">
                    <button onClick={onAddBoard} className="text-gray-300 hover:text-white p-1.5 rounded-full hover:bg-white/10" title={t('boards.newBoard')}>
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div className="flex-grow p-2 overflow-y-auto grid grid-cols-2 gap-2 content-start">
                 {boards.map(board => (
                     <BoardItem 
                        key={board.id}
                        board={board}
                        isActive={board.id === activeBoardId}
                        thumbnail={generateBoardThumbnail(board.elements)}
                        onClick={() => onSwitchBoard(board.id)}
                        onRename={(name) => onRenameBoard(board.id, name)}
                        onDuplicate={() => onDuplicateBoard(board.id)}
                        onDelete={() => onDeleteBoard(board.id)}
                        language={language}
                        totalBoards={boards.length}
                     />
                 ))}
            </div>
        </div>
    );
};

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Press Enter to add' }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !tags.includes(trimmed)) {
                onChange([...tags, trimmed]);
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            // Remove last tag on backspace if input is empty
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (indexToRemove: number) => {
        onChange(tags.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="flex flex-wrap gap-2 rounded-md border border-gray-300 bg-white p-2 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
            {tags.map((tag, index) => (
                <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="text-gray-500 hover:text-red-600 focus:outline-none"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] border-none outline-none text-sm"
            />
        </div>
    );
}

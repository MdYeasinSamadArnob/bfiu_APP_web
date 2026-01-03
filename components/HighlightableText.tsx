import React from 'react';

interface HighlightableTextProps {
  text: string;
  isActive: boolean;
  currentGlobalIndex: number; // The charIndex from the speech synthesis event
  prefixLength: number; // The length of the prefix added to the spoken text (e.g., "Description: ")
  className?: string;
}

// Refined component implementation with logic inside render
export const HighlightableTextContent: React.FC<HighlightableTextProps> = ({
    text,
    isActive,
    currentGlobalIndex,
    prefixLength,
    className
}) => {
    if (!isActive) return <span className={className}>{text}</span>;

    const relativeIndex = currentGlobalIndex - prefixLength;

    // Split text into words and delimiters to preserve formatting
    const words = text.split(/(\s+)/);
    
    // We need to map the words back to their start indices to find the active one
    // We want to find the word that starts at or closest before `relativeIndex`.
    
    // Use reduce to build metadata without side-effect mutation of local variable in map
    const { meta: wordMeta } = words.reduce((acc, word) => {
        const start = acc.count;
        const end = acc.count + word.length;
        acc.meta.push({ word, start, end, isWord: /\S/.test(word) });
        acc.count = end;
        return acc;
    }, { count: 0, meta: [] as { word: string, start: number, end: number, isWord: boolean }[] });

    // Find the active word index
    // The active word is the last word-token where start <= relativeIndex
    let activeIndex = -1;
    for (let i = 0; i < wordMeta.length; i++) {
        if (wordMeta[i].isWord && wordMeta[i].start <= relativeIndex) {
            activeIndex = i;
        } else if (wordMeta[i].start > relativeIndex) {
            break; 
        }
    }

    return (
        <span className={className}>
            {wordMeta.map((item, index) => (
                <span 
                    key={index}
                    className={
                        index === activeIndex 
                            ? "bg-indigo-600 text-white px-0.5 rounded shadow-sm transition-colors duration-200" 
                            : "transition-colors duration-200"
                    }
                >
                    {item.word}
                </span>
            ))}
        </span>
    );
}

export default HighlightableTextContent;

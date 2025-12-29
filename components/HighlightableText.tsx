import React, { useMemo } from 'react';

interface HighlightableTextProps {
  text: string;
  isActive: boolean;
  currentGlobalIndex: number; // The charIndex from the speech synthesis event
  prefixLength: number; // The length of the prefix added to the spoken text (e.g., "Description: ")
  className?: string;
}

const HighlightableText: React.FC<HighlightableTextProps> = ({ 
  text, 
  isActive, 
  currentGlobalIndex, 
  prefixLength,
  className = "" 
}) => {
  // If not active, just render the text
  if (!isActive) {
    return <span className={className}>{text}</span>;
  }

  // Calculate the relative index within the actual text
  // currentGlobalIndex is the index in the full spoken string (Prefix + Text)
  // We want the index relative to Text.
  const relativeIndex = currentGlobalIndex - prefixLength;

  // Memoize the tokenization to avoid re-calculating on every render if text doesn't change
  // However, since we re-render on charIndex change, we want this to be fast.
  // We can split by regex to capture words and separators.
  const tokens = useMemo(() => {
    const result: { content: string; isWord: boolean; start: number; end: number }[] = [];
    // This regex matches non-whitespace sequences as words, capturing whitespace as separate tokens
    // Adjust regex as needed. \S+ matches any non-whitespace.
    // Or we can use a more natural splitter.
    // Let's iterate.
    const regex = /([^\s]+)(\s*)/g;
    let match;
    let lastIndex = 0;

    // Handle leading whitespace if any (though trim() usually handles this)
    // We assume text matches the spoken text structure roughly.
    
    while ((match = regex.exec(text)) !== null) {
        const word = match[1];
        const space = match[2];
        const index = match.index;

        result.push({
            content: word,
            isWord: true,
            start: index,
            end: index + word.length
        });

        if (space) {
            result.push({
                content: space,
                isWord: false,
                start: index + word.length,
                end: index + word.length + space.length
            });
        }
    }
    return result;
  }, [text]);

  // Find which token is currently active
  // The speech synthesis boundary event usually fires at the start of the word.
  // We highlight the word if relativeIndex is within [start, end] or if it's the closest previous word.
  // Actually, boundary fires at the start. So if relativeIndex == token.start, it's that token.
  // We'll highlight the token where relativeIndex >= start && relativeIndex < end (roughly).
  // But strictly, boundary events are discrete.
  
  return (
    <span className={className}>
      {tokens.map((token, i) => {
        // Check if this token is currently spoken
        // We consider it spoken if the relativeIndex falls within it, 
        // OR if it's the word immediately following the boundary index (since boundary is start index)
        // Wait, boundary index IS the start index.
        // So if relativeIndex is 5, and word starts at 5, highlight it.
        // We keep it highlighted until the next boundary moves past it.
        // Since we only get boundary events, we don't know when it ends until the next one starts.
        // But here we rely on the `relativeIndex` state being the LATEST boundary.
        // So we highlight the word that *starts* at or before `relativeIndex` and *ends* after it?
        // No, typically we just check if relativeIndex is roughly at the start.
        
        // Simpler logic: Find the token that contains the relativeIndex.
        // Since boundary events stay constant until the next word, `relativeIndex` points to the start of the current word.
        // So if relativeIndex >= token.start && relativeIndex < token.end, highlight it.
        // But what if the word is long and speech is slow? relativeIndex stays at start.
        // So yes, we highlight the token where relativeIndex >= token.start.
        // But we must stop highlighting when we move to the next word.
        // So we highlight the LAST word that had `start <= relativeIndex`.
        
        // Let's refine:
        // We want to highlight ONE word at a time.
        // The word to highlight is the one with the largest `start` such that `start <= relativeIndex`.
        // AND it must be a word (not whitespace).
        
        // Let's determine if this specific token is the active one.
        // We can do this by finding the active token index first.
        
        return (
             <span key={i} className={token.isWord ? undefined : undefined}>
                {token.content}
             </span>
        );
      })}
    </span>
  );
};

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
    
    let charCount = 0;
    // We need to map the words back to their start indices to find the active one
    // We want to find the word that starts at or closest before `relativeIndex`.
    
    // Let's build a map of start indices
    const wordMeta = words.map(word => {
        const start = charCount;
        const end = charCount + word.length;
        charCount = end;
        return { word, start, end, isWord: /\S/.test(word) };
    });

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

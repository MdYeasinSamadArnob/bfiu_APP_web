const fs = require('fs');

const rawText = fs.readFileSync('extracted-content.txt', 'utf8');
const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

const sections = ['General Banking', 'Credit', 'Trade', 'Remittance'];
let currentSection = '';
let useCases = [];

let i = 0;

function isSectionHeader(line) {
    return sections.some(s => line.startsWith(s) && line.length < 20);
}

function isRuleStart(index) {
    if (/^\d+$/.test(lines[index])) {
        return true;
    }
    return false;
}

while (i < lines.length) {
    const line = lines[i];

    if (sections.includes(line)) {
        currentSection = line;
        i++;
        continue;
    }
    
    if (['Rule No', 'Rule', 'Classification', 'Reason', 'Risk Level'].includes(line)) {
        i++;
        continue;
    }
    
    if (line.includes('Hard Logic Rules:') || line.includes('AI Rules') || line.includes('AI-General:') || line.includes('AI-RAG:')) {
        i++;
        continue;
    }

    if (isRuleStart(i)) {
        const ruleNo = lines[i];
        let ruleText = '';
        let classification = '';
        let reason = '';
        let riskLevel = '';
        
        let offset = 1;
        let tempText = [];
        let tempReason = [];
        
        let ptr = i + 1;
        
        // Collect Rule Text
        while(ptr < lines.length) {
            const l = lines[ptr];
            if (l.startsWith('Hard Logic') || l.startsWith('AI-')) {
                classification = l;
                ptr++;
                break;
            }
            if (/^\d+$/.test(l) || sections.includes(l)) {
                break;
            }
            tempText.push(l);
            ptr++;
        }
        ruleText = tempText.join(' ');
        
        // Collect Reason and find Risk Level
        if (classification) {
             while(ptr < lines.length) {
                const l = lines[ptr];
                // Check for Risk Level keywords
                if (['High', 'Med', 'Low', 'Low-Med', 'Medium'].includes(l) || l.startsWith('High') || l.startsWith('Med') || l.startsWith('Low')) {
                    riskLevel = l;
                    ptr++;
                    break;
                }
                if (/^\d+$/.test(l) || sections.includes(l)) {
                    break;
                }
                tempReason.push(l);
                ptr++;
            }
            reason = tempReason.join(' ');
        }
        
        if (ruleText && classification) {
            // Clean up classification
            let type = classification;
            if (classification.includes('Hard Logic')) type = 'Hard Logic';
            else if (classification.includes('AI-General')) type = 'AI-General';
            else if (classification.includes('AI-RAG')) type = 'AI-RAG';

             useCases.push({
                id: `${currentSection.substring(0,2).toUpperCase()}-${ruleNo.padStart(3, '0')}`,
                title: ruleText.length > 60 ? ruleText.substring(0, 60) + '...' : ruleText,
                description: ruleText,
                indicators: reason ? [reason] : [],
                section: currentSection,
                type: type,
                risk: riskLevel || 'Unknown'
            });
            i = ptr; 
        } else {
            i++;
        }
    } else {
        i++;
    }
}

const tsContent = `export interface UseCase {
  id: string;
  title: string;
  description: string;
  indicators: string[];
  section: string;
  type: string;
  risk: string;
}

export const useCases: UseCase[] = ${JSON.stringify(useCases, null, 2)};
`;

fs.writeFileSync('data/useCases.ts', tsContent);
console.log(`Successfully parsed ${useCases.length} use cases with structured fields.`);

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'requirements.json');
const TXT_FILE = path.join(DATA_DIR, 'requiremnets.txt');

export async function GET() {
  try {
    // 1. Try reading JSON first
    if (fs.existsSync(JSON_FILE)) {
      const fileContent = fs.readFileSync(JSON_FILE, 'utf8');
      return NextResponse.json(JSON.parse(fileContent));
    }

    // 2. Fallback to TXT parsing
    if (!fs.existsSync(TXT_FILE)) {
      return NextResponse.json({ error: 'Requirements file not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(TXT_FILE, 'utf8');
    const lines = fileContent.split('\n');
    
    const requirements = [];
    let currentCategory: any = null;
    let currentItem: any = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('## ')) {
        // New Category
        if (currentCategory) {
            if (currentItem) currentCategory.items.push(currentItem);
            requirements.push(currentCategory);
        }
        currentCategory = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: line.replace('## ', '').trim(),
          description: '',
          items: []
        };
        currentItem = null;
      } else if (line.startsWith('- **')) {
        // New Item
        if (currentItem && currentCategory) {
            currentCategory.items.push(currentItem);
        }
        const titleMatch = line.match(/\- \*\*(.*?)\*\*(.*)/);
        if (titleMatch) {
            currentItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: titleMatch[1].trim(),
                subtitle: titleMatch[2].replace(':', '').trim(),
                details: []
            };
        }
      } else if (line.startsWith('- ')) {
        // Detail item
        if (currentItem) {
            currentItem.details.push(line.replace('- ', '').trim());
        }
      } else if (currentCategory && !currentItem) {
         // Description line for the category
         if (!line.startsWith('#')) {
             currentCategory.description += (currentCategory.description ? ' ' : '') + line;
         }
      }
    }

    // Push last ones
    if (currentItem && currentCategory) {
        currentCategory.items.push(currentItem);
    }
    if (currentCategory) {
        requirements.push(currentCategory);
    }

    // Save to JSON for future use
    fs.writeFileSync(JSON_FILE, JSON.stringify(requirements, null, 2));

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error reading requirements:', error);
    return NextResponse.json({ error: 'Failed to read requirements' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const requirements = await request.json();
    
    // Validate basic structure
    if (!Array.isArray(requirements)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    fs.writeFileSync(JSON_FILE, JSON.stringify(requirements, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving requirements:', error);
    return NextResponse.json({ error: 'Failed to save requirements' }, { status: 500 });
  }
}

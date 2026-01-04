import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { AI_CONFIG } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const { messages, context, model } = await req.json();

    // 1. Get Technical Context (Package.json)
    let techStack = 'Unknown';
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            techStack = Object.keys(dependencies).join(', ');
        }
    } catch (e) {
        console.error('Failed to read package.json', e);
    }

    // 2. Get Architecture Context (architecture.json)
    let architectureSummary = 'No architecture defined.';
    try {
        const archPath = path.join(process.cwd(), 'data', 'architecture.json');
        if (fs.existsSync(archPath)) {
            const archData = JSON.parse(fs.readFileSync(archPath, 'utf8'));
            const nodes = archData.nodes || [];
            // const edges = archData.edges || [];
            
            const groups = nodes.filter((n: { type: string; data?: { label?: string } }) => n.type === 'group').map((n: { data?: { label?: string } }) => n.data?.label || 'Unnamed Group');
            const services = nodes.filter((n: { type: string; data?: { label?: string } }) => n.type !== 'group').map((n: { type: string; data?: { label?: string; subLabel?: string; details?: string[] } }) => {
                let desc = `${n.data?.label} (${n.type})`;
                if (n.data?.subLabel) desc += ` - ${n.data.subLabel}`;
                if (n.data?.details && n.data.details.length > 0) desc += ` [${n.data.details.join(', ')}]`;
                return desc;
            });
            
            architectureSummary = `
            - Groups/Zones: ${groups.join(', ')}
            - Components: ${services.join(', ')}
            `;
        }
    } catch (e) {
        console.error('Failed to read architecture.json', e);
    }

    const systemPrompt = `You are a helpful AI assistant specialized in analyzing banking rules and use cases for the BFIU (Bangladesh Financial Intelligence Unit) Rules Analytics App.

TECHNICAL CONTEXT (The actual stack used in this project):
- Framework: Next.js 16 (React 19)
- Styling: Tailwind CSS v4
- Diagrams: ReactFlow
- AI/LLM: Ollama (running locally)
- Icons: Lucide React
- Markdown: React Markdown with GFM
- Libraries: ${techStack}

CURRENT SYSTEM ARCHITECTURE (Dynamically loaded):
${architectureSummary}

USE CASE CONTEXT:
ID: ${context.id}
Title: ${context.title}
Description: ${context.description}
Indicators: ${context.indicators?.join(', ')}
Section: ${context.section}
Type: ${context.type}
Risk: ${context.risk}

YOUR ROLE:
1. Help the user understand this use case and suggest technical solutions that align with the CURRENT stack and architecture.
2. If suggesting a new feature, explain how it fits into the existing Next.js/ReactFlow architecture.
3. Reference specific libraries (e.g., "Use ReactFlow to visualize this flow" or "Use Lucide icons for UI") when appropriate.
4. Keep answers concise, professional, and technically accurate.`;

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Connect to local Ollama instance
    // We use fetch with stream: true (default) but for simplicity in this proxy we might want to handle it carefully
    // To ensure best UX with streaming, we will forward the stream
    
    const ollamaResponse = await fetch(`${AI_CONFIG.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || AI_CONFIG.ollamaModel, 
        messages: allMessages,
        stream: true,
      }),
    });

    if (!ollamaResponse.ok) {
        // If local ollama is not running or other error
        return NextResponse.json(
            { error: 'Ollama service not available. Make sure Ollama is running locally.' },
            { status: 503 }
        );
    }

    // Return the stream directly
    return new Response(ollamaResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

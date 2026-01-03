import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Ollama is running
    const rootResponse = await fetch('http://127.0.0.1:11434/', {
      method: 'GET',
    });

    if (!rootResponse.ok) {
        return NextResponse.json({ status: 'error', message: 'Ollama not reachable' }, { status: 503 });
    }

    // Check for available models
    const tagsResponse = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
    });

    if (!tagsResponse.ok) {
        return NextResponse.json({ status: 'error', message: 'Could not fetch models' }, { status: 503 });
    }

    const data = await tagsResponse.json();
    const models = data.models || [];

    if (models.length === 0) {
        return NextResponse.json({ status: 'error', message: 'No models found' }, { status: 503 });
    }

    // Prefer specific models
    const preferredModels = ['llama3', 'llama3:latest', 'mistral', 'gemma', 'llama2'];
    let selectedModel = models[0].name; // Default to first available

    for (const pref of preferredModels) {
        const found = models.find((m: { name: string }) => m.name.includes(pref));
        if (found) {
            selectedModel = found.name;
            break;
        }
    }

    return NextResponse.json({ status: 'ok', model: selectedModel }, { status: 200 });

  } catch (_error) {
    return NextResponse.json({ status: 'error', message: 'Connection failed' }, { status: 503 });
  }
}

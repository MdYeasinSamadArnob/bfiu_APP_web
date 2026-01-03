import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { useCases as initialUseCases } from '../../../data/useCases';

const dataFilePath = path.join(process.cwd(), 'data', 'useCases.json');

export async function GET() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileContents = fs.readFileSync(dataFilePath, 'utf8');
      const data = JSON.parse(fileContents);
      return NextResponse.json(data);
    } else {
      // If JSON doesn't exist, initialize it with the static TS data
      // We don't necessarily need to write it immediately, but it helps for consistency.
      // Let's write it so subsequent requests use the file.
      fs.writeFileSync(dataFilePath, JSON.stringify(initialUseCases, null, 2));
      return NextResponse.json(initialUseCases);
    }
  } catch (error) {
    console.error('Failed to read rules data:', error);
    // Fallback to static data
    return NextResponse.json(initialUseCases);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save rules data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

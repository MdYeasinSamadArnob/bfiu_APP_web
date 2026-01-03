import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { timelineData as initialTimelineData } from '../../../data/timelineData';

const dataFilePath = path.join(process.cwd(), 'data', 'timeline.json');

export async function GET() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileContents = fs.readFileSync(dataFilePath, 'utf8');
      const data = JSON.parse(fileContents);
      return NextResponse.json(data);
    } else {
      fs.writeFileSync(dataFilePath, JSON.stringify(initialTimelineData, null, 2));
      return NextResponse.json(initialTimelineData);
    }
  } catch (error) {
    console.error('Failed to read timeline data:', error);
    return NextResponse.json(initialTimelineData);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save timeline data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

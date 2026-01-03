import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const viewId = searchParams.get('viewId') || 'root';
  
  // Sanitize viewId to prevent directory traversal
  const sanitizedViewId = viewId.replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = sanitizedViewId === 'root' ? 'architecture.json' : `architecture_${sanitizedViewId}.json`;
  const dataFilePath = path.join(process.cwd(), 'data', fileName);

  try {
    if (!fs.existsSync(dataFilePath)) {
        if (sanitizedViewId === 'root') {
             // For root, return 404 or empty default, but for sub-views, we might want to return empty structure
             return NextResponse.json({ nodes: [], edges: [] }, { status: 404 });
        }
        return NextResponse.json({ nodes: [], edges: [] }); // Return empty for new sub-views
    }
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewId = searchParams.get('viewId') || 'root';
    const sanitizedViewId = viewId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = sanitizedViewId === 'root' ? 'architecture.json' : `architecture_${sanitizedViewId}.json`;
    const dataFilePath = path.join(process.cwd(), 'data', fileName);

    const body = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
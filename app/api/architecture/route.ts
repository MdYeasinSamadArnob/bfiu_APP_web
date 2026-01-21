import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

// Ensure versions dir exists
if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const viewId = searchParams.get('viewId') || 'root';
  const versionId = searchParams.get('versionId');

  if (action === 'list_versions') {
    try {
         if (!fs.existsSync(VERSIONS_DIR)) return NextResponse.json([]);
         const versions = fs.readdirSync(VERSIONS_DIR)
            .filter(file => fs.statSync(path.join(VERSIONS_DIR, file)).isDirectory())
            .map(verId => {
                try {
                    const metaPath = path.join(VERSIONS_DIR, verId, 'meta.json');
                    if (fs.existsSync(metaPath)) {
                        return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    }
                } catch (e) {}
                return { id: verId, name: verId, createdAt: new Date().toISOString() };
            })
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
         return NextResponse.json(versions);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 });
    }
  }

  // Sanitize viewId to prevent directory traversal
  const sanitizedViewId = viewId.replace(/[^a-zA-Z0-9-_]/g, '');
  const fileName = sanitizedViewId === 'root' ? 'architecture.json' : `architecture_${sanitizedViewId}.json`;
  
  let dataFilePath;
  if (versionId) {
      dataFilePath = path.join(VERSIONS_DIR, versionId, fileName);
  } else {
      dataFilePath = path.join(DATA_DIR, fileName);
  }

  try {
    if (!fs.existsSync(dataFilePath)) {
        if (sanitizedViewId === 'root') {
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
    const action = searchParams.get('action');
    
    if (action === 'create_version') {
        const body = await request.json();
        const { name } = body;
        const id = Date.now().toString();
        const versionDir = path.join(VERSIONS_DIR, id);
        
        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
        }

        // Save meta
        fs.writeFileSync(path.join(versionDir, 'meta.json'), JSON.stringify({
            id,
            name,
            createdAt: new Date().toISOString()
        }, null, 2));

        // Copy all architecture files from DATA_DIR to versionDir
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
            if (file.startsWith('architecture') && file.endsWith('.json')) {
                fs.copyFileSync(path.join(DATA_DIR, file), path.join(versionDir, file));
            }
        }
        
        return NextResponse.json({ success: true, id, name });
    }

    if (action === 'delete_version') {
        const body = await request.json();
        const { id } = body;
        const versionDir = path.join(VERSIONS_DIR, id);
        if (fs.existsSync(versionDir)) {
            fs.rmSync(versionDir, { recursive: true, force: true });
        }
        return NextResponse.json({ success: true });
    }

    if (action === 'restore_version') {
        const body = await request.json();
        const { id } = body;
        const versionDir = path.join(VERSIONS_DIR, id);
        
        if (!fs.existsSync(versionDir)) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        // Copy all architecture files from versionDir back to DATA_DIR
        const files = fs.readdirSync(versionDir);
        for (const file of files) {
            if (file.startsWith('architecture') && file.endsWith('.json')) {
                fs.copyFileSync(path.join(versionDir, file), path.join(DATA_DIR, file));
            }
        }
        return NextResponse.json({ success: true });
    }

    const viewId = searchParams.get('viewId') || 'root';
    const sanitizedViewId = viewId.replace(/[^a-zA-Z0-9-_]/g, '');
    const fileName = sanitizedViewId === 'root' ? 'architecture.json' : `architecture_${sanitizedViewId}.json`;
    const dataFilePath = path.join(DATA_DIR, fileName);

    const body = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
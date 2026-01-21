import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { timelineData as initialTimelineData } from '../../../data/timelineData';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const VERSIONS_DIR = path.join(DATA_DIR, 'timeline_versions');
const TIMELINE_FILE = 'timeline.json';

// Ensure versions dir exists
if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const versionId = searchParams.get('versionId');
  const timestamp = Date.now(); // Prevent caching

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

  let dataFilePath;
  if (versionId) {
      dataFilePath = path.join(VERSIONS_DIR, versionId, TIMELINE_FILE);
  } else {
      dataFilePath = path.join(DATA_DIR, TIMELINE_FILE);
  }

  try {
    if (fs.existsSync(dataFilePath)) {
      const fileContents = fs.readFileSync(dataFilePath, 'utf8');
      const data = JSON.parse(fileContents);
      return NextResponse.json(data);
    } else {
        // If live file doesn't exist, create it
        if (!versionId) {
            fs.writeFileSync(dataFilePath, JSON.stringify(initialTimelineData, null, 2));
            return NextResponse.json(initialTimelineData);
        }
        return NextResponse.json([], { status: 404 });
    }
  } catch (error) {
    console.error('Failed to read timeline data:', error);
    return NextResponse.json(initialTimelineData);
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

        // Copy timeline file
        const sourcePath = path.join(DATA_DIR, TIMELINE_FILE);
        if (fs.existsSync(sourcePath)) {
             fs.copyFileSync(sourcePath, path.join(versionDir, TIMELINE_FILE));
        } else {
             // If no live file, save initial data
             fs.writeFileSync(path.join(versionDir, TIMELINE_FILE), JSON.stringify(initialTimelineData, null, 2));
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

        // Copy timeline file from version to live
        const sourcePath = path.join(versionDir, TIMELINE_FILE);
        if (fs.existsSync(sourcePath)) {
            const destPath = path.join(DATA_DIR, TIMELINE_FILE);
            // Explicitly read and write to ensure file system updates
            const content = fs.readFileSync(sourcePath);
            fs.writeFileSync(destPath, content);
        }
        return NextResponse.json({ success: true });
    }

    if (action === 'rename_version') {
        const body = await request.json();
        const { id, name } = body;
        const versionDir = path.join(VERSIONS_DIR, id);
        const metaPath = path.join(versionDir, 'meta.json');

        if (!fs.existsSync(metaPath)) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        meta.name = name;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const dataFilePath = path.join(DATA_DIR, TIMELINE_FILE);
    fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save timeline data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

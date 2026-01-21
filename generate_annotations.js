// Polyfill for DOMMatrix in Node environment (required by some PDF parsers)
// MUST be defined BEFORE requiring pdf-parse
if (typeof DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
        setMatrixValue(str) {}
        translate(tx, ty) { return this; }
        scale(sx, sy) { return this; }
        rotate(angle) { return this; }
        multiply(other) { return this; }
    };
}

const fs = require('fs');
const path = require('path');

const pdf = require('pdf-parse');

const PDF_PATH = path.join(__dirname, 'pdf', 'RFQ - EFRM Bank Asia Jan 2026 v0.9-final_v1.1.pdf');
const OUTPUT_PATH = path.join(__dirname, 'data', 'rfqAnnotations.json');

// Keywords to look for
const CRITERIA = {
    strategic: ['scope', 'objective', 'goal', 'deliverable', 'strategy', 'vision', 'bank asia'],
    technical: ['architecture', 'api', 'integration', 'real-time', 'latency', 'tps', 'database', 'on-premise', 'cloud', 'security', 'encryption', 'ml', 'ai', 'model'],
    urgent: ['deadline', 'submission', 'timeline', 'schedule', 'date', 'phase', 'milestone', 'urgent'],
    risk: ['compliance', 'audit', 'fraud', 'risk', 'penalty', 'sla', 'regulation', 'sanction', 'black list']
};

async function render_page(pageData) {
    // 1. Get Text Content with Coordinates
    const render_options = {
        normalizeWhitespace: true,
        disableCombineTextItems: false
    };

    let textContent;
    try {
        // Try getting text content.
        // Note: in standard PDF.js, getTextContent returns a promise.
        // In pdf-parse context, pageData is usually a PDFPageProxy from pdfjs-dist.
        
        // Wait, if pageData is indeed a PDFPageProxy, it should work.
        // But maybe the version of pdfjs-dist bundled is old/new and API changed.
        
        // Let's log keys to see what we have
        // console.log('Page Keys:', Object.keys(pageData));
        
        textContent = await pageData.getTextContent(render_options);
    } catch (e) {
        console.error(`Error getting text content for page ${pageData.pageNumber}:`, e);
        return [];
    }

    const viewport = pageData.getViewport({ scale: 1.0 });
    
    let annotations = [];
    let currentSentence = '';
    let sentenceStartX = 0;
    let sentenceStartY = 0;
    let sentenceWidth = 0;
    let sentenceHeight = 0;

    // Helper to finish a sentence and check for keywords
    const processSentence = (text, x, y, w, h) => {
        if (text.length < 10) return; // Ignore short noise

        const lowerText = text.toLowerCase();
        let matchedType = null;
        let matchedKeyword = '';

        // Check for matches
        for (const [type, keywords] of Object.entries(CRITERIA)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    matchedType = type;
                    matchedKeyword = keyword;
                    break;
                }
            }
            if (matchedType) break;
        }

        if (matchedType) {
            // Calculate % coordinates
            // PDF coordinates: (0,0) is bottom-left
            // Web coordinates: (0,0) is top-left
            // x_percent = (x / viewport.width) * 100
            // y_percent = ((viewport.height - y) / viewport.height) * 100
            // Note: y in PDF is usually bottom-up. We need to check if 'y' from textContent is bottom-up.
            // Yes, PDF.js usually returns y from bottom.
            // But let's be careful. transform[5] is y.
            
            // Heuristic for bounding box
            const safeX = Math.max(0, Math.min(x, viewport.width));
            const safeY = Math.max(0, Math.min(y, viewport.height));
            
            // Invert Y for web
            const webY = viewport.height - safeY;
            
            // Adjust for font height (approximate since we don't have exact font metrics here easily)
            // We'll assume a standard line height or use the 'h' if it's reliable (it's often 0 in transform)
            // Text items usually have height in transform[0] or [3]? No, transform is [scaleX, skewX, skewY, scaleY, x, y]
            // We'll default to a reasonable highlight height (e.g., 1.5% of page)
            
            annotations.push({
                id: `auto-${pageData.pageIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                pageNumber: pageData.pageNumber, // 1-based
                rect: {
                    x: (safeX / viewport.width) * 100,
                    y: ((webY - 15) / viewport.height) * 100, // Shift up slightly to cover text
                    width: Math.min(80, (text.length * 0.8)), // Estimate width based on char count (very rough) -> Better: Use a fixed highlight width or reasonable max
                    height: 2 // 2% height is usually good for a line
                },
                title: `${matchedType.toUpperCase()}: ${matchedKeyword}`,
                content: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
                type: matchedType
            });
        }
    };

    // Iterate items to build rudimentary sentence detection
    // Note: PDF text items are often fragmented. "Arch" "itec" "ture".
    // pdf-parse's default render usually joins them. But here we are iterating raw items if we use pageData.getTextContent()
    // BUT, for simplicity and robustness given we are in a script:
    // We will use the *joined text* provided by pdf-parse for the CONTENT,
    // and use a simplified heuristic for LOCATION:
    // We'll take the first item's location that matches the keyword.
    
    for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i];
        // item.str is the text content
        // item.transform is [scaleX, skewX, skewY, scaleY, x, y]
        const text = item.str;
        
        if (!text || !text.trim()) continue;

        // Check each item individually for keywords (simpler than full sentence reconstruction)
        // This ensures we get accurate location for the *keyword*
        for (const [type, keywords] of Object.entries(CRITERIA)) {
             for (const keyword of keywords) {
                 if (text.toLowerCase().includes(keyword)) {
                     // Found a keyword hit!
                     const tx = item.transform[4];
                     const ty = item.transform[5];
                     // PDF coordinates are bottom-left origin.
                     // Viewport height is needed to flip Y.
                     const webY = viewport.height - ty;

                     // Approximate width if not provided
                     const width = item.width || (text.length * 5); // Fallback width estimation
                     const height = item.height || 10; // Fallback height

                     // Create annotation
                     annotations.push({
                        id: `gen-${pageData.pageIndex}-${i}`,
                        pageNumber: pageData.pageNumber,
                        rect: {
                            x: (tx / viewport.width) * 100,
                            y: ((webY - height) / viewport.height) * 100, // Adjust Y to be top-left of the box
                            width: (width / viewport.width) * 100,
                            height: (height / viewport.height) * 100 * 1.5 // slightly taller highlight
                        },
                        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Focus`,
                        content: `Mention of '${keyword}' in context: "...${text}..."`,
                        type: type
                     });
                     
                     // Break to avoid multiple highlights for same word in same item
                     break;
                 }
             }
        }
    }

    return annotations;
}

async function main() {
    if (!fs.existsSync(PDF_PATH)) {
        console.error('PDF not found at:', PDF_PATH);
        return;
    }

    const dataBuffer = fs.readFileSync(PDF_PATH);
    let allAnnotations = [];

    // Use pdf-parse with custom pagerender
    // Note: pdf-parse v2.4.5 exports a class or object in some environments
    const { PDFParse } = pdf;
    
    if (typeof PDFParse === 'function') {
        const parser = new PDFParse(dataBuffer);
        // We need to access internal doc to render pages manually or check docs
        // Actually, let's try the simpler approach first: check what `pdf` actually is
        console.log('PDF Export Type:', typeof pdf);
        console.log('PDF Keys:', Object.keys(pdf));
    } else {
        // Fallback or if it's the function itself
    }

    // Try default export first if it exists (common in CJS/ESM interop)
    // In older pdf-parse versions, the default export is the function itself.
    // In v2.4.5 ESM build (which seems to be what node is picking up due to package.json type: module?), it might be different.
    
    // BUT we are using require().
    // If we look at the exports log:
    // PDF Export Type: object
    // Keys: [ ... 'PDFParse', ... ]
    
    // So pdf.PDFParse is the class.
    // But does pdf-parse have a helper function that mimics the old API?
    // It doesn't look like it from the keys.
    
    // Wait, the main export seems to be an object with named exports.
    // So `pdf` IS that object.
    
    // Let's try to construct PDFParse and see if we can use it.
    // But wait, the previous attempt `new entryPoint({ data: ... })` failed with `TypeError: Class constructors cannot be invoked without 'new'`.
    // Wait, I did `new entryPoint(...)`.
    // Why did it fail?
    // "TypeError: Class constructors cannot be invoked without 'new'"
    // This usually happens if `entryPoint` is actually a class but I called it as a function, OR if it's a native class and I tried to call it weirdly.
    // But I did `new entryPoint`.
    
    // Ah, maybe `pdf.default` was undefined, so it fell back to `pdf` (the object), and `new pdf(...)` failed?
    // `pdf` is the object with keys.
    
    // Let's explicitly pick `pdf.PDFParse`.
    const PDFParseClass = pdf.PDFParse;
    
    if (PDFParseClass) {
          try {
              // It seems PDFParse class in this lib takes options in constructor.
              // The error "TypeError: Cannot read properties of undefined (reading 'verbosity')"
              // implies it expects an options object in the constructor, and tries to access .verbosity on it.
              
              const parser = new PDFParseClass({ data: dataBuffer }); 
              
              // Check if it has load method?
              // Based on previous attempt, it seems it might not have 'load' or we need to use it differently.
              // But let's assume it has getText or load.
              
              // If it has `load`, use it.
              if (parser.load) {
                  const doc = await parser.load(); // data is already in constructor
                  // doc is likely the PDFDocumentProxy
                  
                  const numPages = doc.numPages;
                  for (let i = 1; i <= numPages; i++) {
                      const page = await doc.getPage(i);
                      const pageAnns = await render_page(page);
                      allAnnotations.push(...pageAnns);
                  }
              } else if (parser.getText) {
                  // Fallback: maybe constructor takes the buffer?
                  await parser.getText({
                     pagerender: async (pageData) => {
                         const pageAnns = await render_page(pageData);
                         allAnnotations.push(...pageAnns);
                         return "";
                     }
                  });
              } else {
                  console.error('Parser instance created but no load/getText method found.');
                  console.log('Parser keys:', Object.keys(parser));
              }
              
          } catch (e) {
              console.error('Failed with PDFParse class:', e);
          }
     } else {
        console.error('Could not find PDFParse class in exports');
    }

    // Deduplicate and Limit
    // If too many annotations, we might overwhelm the user.
    // Strategy: Limit to top 3 per page, prioritize different types.
    
    // Group by page
    const byPage = {};
    allAnnotations.forEach(ann => {
        if (!byPage[ann.pageNumber]) byPage[ann.pageNumber] = [];
        byPage[ann.pageNumber].push(ann);
    });

    let finalAnnotations = [];
    Object.keys(byPage).forEach(pageNum => {
        let pageAnns = byPage[pageNum];
        // Unique by type if possible
        const uniqueTypes = new Set();
        const kept = [];
        
        for (const ann of pageAnns) {
            if (!uniqueTypes.has(ann.type) || kept.length < 2) {
                uniqueTypes.add(ann.type);
                kept.push(ann);
            }
        }
        finalAnnotations.push(...kept);
    });

    console.log(`Generated ${finalAnnotations.length} annotations from ${Object.keys(byPage).length} pages.`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalAnnotations, null, 2));
    console.log('Saved to:', OUTPUT_PATH);
}

main().catch(console.error);

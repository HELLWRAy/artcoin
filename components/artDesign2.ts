import p5 from 'p5';

let flowField: p5.Vector[];
let particles: Particle[] = [];
let cols: number, rows: number;
let inc = 0.1;  // Increment for Perlin noise
let scl: number; // Scale of each grid cell
let zoff = 0;   // Z-offset for Perlin noise
let currentSeed = 0;
let transactionHash: string;


// Define color palettes using RGB values instead of hex
const palettes = [
    [[230, 57, 70], [241, 250, 238], [168, 218, 220], [69, 123, 157], [29, 53, 87]],
    [[255, 190, 11], [251, 86, 7], [255, 0, 110], [131, 56, 236], [58, 134, 255]],
    [[6, 214, 160], [27, 154, 170], [239, 71, 111], [255, 196, 61], [17, 138, 178]],
    [[38, 70, 83], [42, 157, 143], [233, 196, 106], [244, 162, 97], [231, 111, 81]],
    [[155, 93, 229], [0, 187, 249], [0, 245, 212], [251, 86, 7], [254, 228, 64]]
];

// First, let's define interfaces for our metadata
export interface ArtMetadata {
    hash: string;
    blobUrl: string;
    tier: 'legendary' | 'rare' | 'uncommon' | 'common';
    stats: {
        shapeCount: number;
        backgroundStyle: string;
        shapeTypes: {
            circles: number;
            rectangles: number;
            triangles: number;
            lines: number;
        };
        palette: number[][];
    };
}

export const renderedPNGs: Map<string, p5.Graphics> = new Map();
export const renderedPNGsBlobUrls: { [hash: string]: ArtMetadata } = {};

// Add this near the top with other exports
export type RenderProgress = {
    completed: number;
    total: number;
};

function saveGraphicsAsImage(graphics: p5.Graphics, callback: (url: string) => void) {
    // Convert the p5.Graphics to a canvas element
    const canvas = graphics.elt as HTMLCanvasElement;

    // Use the canvas.toBlob() method to create a Blob
    canvas.toBlob((blob) => {
        if (blob) {
            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);
            callback(url);
        }
    });
}

function seededRandom() {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
}

function hashRandom(min: any, max?: any) {
    if (Array.isArray(min)) {
        return min[Math.floor(seededRandom() * min.length)];
    }
    if (typeof min === 'undefined') return seededRandom();
    if (typeof max === 'undefined') {
        max = min;
        min = 0;
    }
    return seededRandom() * (max - min) + min;
}

function chooseTier() {
    let rand = seededRandom();
    if (rand < 0.01) return "legendary";
    if (rand < 0.1) return "rare";
    if (rand < 0.3) return "uncommon";
    return "common";
}

function initWithHash(p: p5, hash: string, size: number) {
    if (!hash || typeof hash !== 'string') {
        console.error('Invalid hash provided');
        hash = 'default'.repeat(10); // fallback hash
    }

    transactionHash = hash;
    currentSeed = hash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    setup(p, size);

    let tier = chooseTier() as 'legendary' | 'rare' | 'uncommon' | 'common';
    let chosenPalette = hashRandom(palettes);
    let bgStyle = generateBackground(p, chosenPalette, size);
    let shapeStats = generateShapes(p, chosenPalette, tier, size);

    return {
        tier,
        bgStyle,
        shapeStats,
        palette: chosenPalette
    };
}

function setup(p: p5, size: number) {
    let tier = chooseTier() as 'legendary' | 'rare' | 'uncommon' | 'common';

    // Adjust settings based on tier
    switch (tier) {
        case "legendary":
            scl = 10;
              particles = new Array(3000).fill(null).map(() => new Particle(p, size));
            break;
        case "rare":
            scl = 20;
              particles = new Array(2000).fill(null).map(() => new Particle(p, size));
            break;
        case "uncommon":
            scl = 30;
              particles = new Array(1000).fill(null).map(() => new Particle(p, size));
            break;
        default: // common
            scl = 40;
              particles = new Array(500).fill(null).map(() => new Particle(p, size));
            break;
    }

    cols = p.floor(size / scl);
    rows = p.floor(size / scl);
    flowField = new Array(cols * rows);

    // Choose random palette
    let chosenPalette = hashRandom(palettes);

    generateBackground(p, chosenPalette, size);
    generateShapes(p, chosenPalette, tier, size);
}

function generateBackground(p: p5, palette: number[][], size: number): string {
    let bgStyle = hashRandom([
        'gradient', 
        'noise', 
        'subtle-shapes',
        'concentric',
        'grid-pattern',
        'wave-lines',
        'dot-matrix',
        'cross-hatch',
        'spiral',
        'mosaic',
        'flow-field',
        'circuit-board'
    ]);

    // First set a solid base background to prevent transparency
    p.background(p.color(palette[0][0], palette[0][1], palette[0][2], 255));

    switch (bgStyle) {
        case 'gradient':
            let c1 = p.color(palette[0][0], palette[0][1], palette[0][2], 255);
            let c2 = p.color(palette[palette.length - 1][0], palette[palette.length - 1][1], palette[palette.length - 1][2], 255);
            for (let y = 0; y < size; y++) {
                let inter = p.map(y, 0, size, 0, 1);
                let c = p.lerpColor(c1, c2, inter);
                p.stroke(c);
                p.line(0, y, size, y);
            }
            break;

        case 'noise':
            p.loadPixels();
            let noiseScale1 = 0.01;
            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    let noiseVal = p.noise(x * noiseScale1, y * noiseScale1);
                    let paletteIndex = p.floor(noiseVal * palette.length);
                    let [r, g, b] = palette[paletteIndex];
                    p.set(x, y, p.color(r, g, b, 255)); // Set alpha to 255
                }
            }
            p.updatePixels();
            break;

        case 'subtle-shapes':
            // Background already set above
            for (let i = 0; i < 500; i++) {
                let x = hashRandom(size);
                let y = hashRandom(size);
                let shapeSize = hashRandom(1, 10);
                p.noStroke();
                let [r, g, b] = palette[p.floor(hashRandom(palette.length))];
                p.fill(r, g, b, 100); // Use semi-transparent shapes but on solid background
                p.ellipse(x, y, shapeSize, shapeSize);
            }
            break;

        case 'concentric':
            let maxRadius = size * 1.5;
            let steps = 50;
            for (let i = maxRadius; i > 0; i -= maxRadius/steps) {
                let [r, g, b] = hashRandom(palette);
                p.noStroke();
                p.fill(r, g, b, 40);
                p.ellipse(size/2, size/2, i, i);
            }
            break;

        case 'grid-pattern':
            let gridSize = hashRandom(10, 30);
            for (let x = 0; x < size; x += gridSize) {
                for (let y = 0; y < size; y += gridSize) {
                    let [r, g, b] = hashRandom(palette);
                    p.noStroke();
                    p.fill(r, g, b, 200);
                    if (hashRandom(0, 1) > 0.5) {
                        p.rect(x, y, gridSize * 0.9, gridSize * 0.9);
                    }
                }
            }
            break;

        case 'wave-lines':
            let amplitude = size / 10;
            let frequency = hashRandom(0.001, 0.005);
            for (let y = 0; y < size; y += 5) {
                let [r, g, b] = hashRandom(palette);
                p.stroke(r, g, b, 150);
                p.strokeWeight(2);
                p.noFill();
                p.beginShape();
                for (let x = 0; x < size; x += 2) {
                    let yOffset = Math.sin(x * frequency + y * 0.01) * amplitude;
                    p.vertex(x, y + yOffset);
                }
                p.endShape();
            }
            break;

        case 'dot-matrix':
            let spacing = hashRandom(10, 20);
            for (let x = spacing; x < size; x += spacing) {
                for (let y = spacing; y < size; y += spacing) {
                    let [r, g, b] = hashRandom(palette);
                    let dotSize = hashRandom(2, 6);
                    p.noStroke();
                    p.fill(r, g, b, 200);
                    p.ellipse(x, y, dotSize, dotSize);
                }
            }
            break;

        case 'cross-hatch':
            let lineSpacing = hashRandom(10, 20);
            let [r, g, b] = hashRandom(palette);
            p.stroke(r, g, b, 100);
            p.strokeWeight(1);
            
            // Draw diagonal lines in one direction
            for (let i = -size; i < size * 2; i += lineSpacing) {
                p.line(i, 0, i + size, size);
            }
            
            // Draw diagonal lines in the other direction
            for (let i = -size; i < size * 2; i += lineSpacing) {
                p.line(i, size, i + size, 0);
            }
            break;

        case 'spiral':
            let spiralRotations = hashRandom(3, 8);
            let spiralSpacing = hashRandom(5, 15);
            let angle = 0;
            let radius = 0;
            
            while (radius < size * 1.5) {
                let [r, g, b] = hashRandom(palette);
                p.stroke(r, g, b, 150);
                p.strokeWeight(hashRandom(1, 4));
                
                let x = size/2 + radius * Math.cos(angle);
                let y = size/2 + radius * Math.sin(angle);
                p.point(x, y);
                
                angle += 0.1;
                radius += spiralSpacing / (Math.PI * 2);
            }
            break;

        case 'mosaic':
            let tileSize = hashRandom(10, 30);
            for (let x = 0; x < size; x += tileSize) {
                for (let y = 0; y < size; y += tileSize) {
                    let [r, g, b] = hashRandom(palette);
                    p.noStroke();
                    p.fill(r, g, b, 200);
                    
                    if (hashRandom(0, 1) < 0.5) {
                        // Draw triangular tiles
                        if (hashRandom(0, 1) < 0.5) {
                            p.triangle(x, y, x + tileSize, y, x, y + tileSize);
                            p.triangle(x + tileSize, y + tileSize, x + tileSize, y, x, y + tileSize);
                        } else {
                            p.triangle(x, y, x + tileSize, y, x + tileSize, y + tileSize);
                            p.triangle(x, y, x, y + tileSize, x + tileSize, y + tileSize);
                        }
                    } else {
                        // Draw rectangular tiles with random subdivisions
                        let subdivide = hashRandom(0, 1) < 0.3;
                        if (subdivide) {
                            let [r2, g2, b2] = hashRandom(palette);
                            p.rect(x, y, tileSize/2, tileSize/2);
                            p.fill(r2, g2, b2, 200);
                            p.rect(x + tileSize/2, y + tileSize/2, tileSize/2, tileSize/2);
                        } else {
                            p.rect(x, y, tileSize, tileSize);
                        }
                    }
                }
            }
            break;

        case 'flow-field':
            let noiseScale2 = 0.005;
            let flowFieldSize = 20;
            for (let x = 0; x < size; x += flowFieldSize) {
                for (let y = 0; y < size; y += flowFieldSize) {
                    let angle = p.noise(x * noiseScale2, y * noiseScale2) * p.TWO_PI * 4;
                    let length = flowFieldSize * 0.8;
                    let [r, g, b] = hashRandom(palette);
                    
                    p.stroke(r, g, b, 100);
                    p.strokeWeight(hashRandom(1, 3));
                    p.line(
                        x, y,
                        x + Math.cos(angle) * length,
                        y + Math.sin(angle) * length
                    );
                }
            }
            break;

        case 'circuit-board':
            let nodeSize = 8;
            let nodeSpacing = 40;
            
            // Draw nodes
            for (let x = nodeSpacing; x < size; x += nodeSpacing) {
                for (let y = nodeSpacing; y < size; y += nodeSpacing) {
                    if (hashRandom(0, 1) < 0.7) {
                        let [r, g, b] = hashRandom(palette);
                        p.fill(r, g, b, 200);
                        p.noStroke();
                        p.ellipse(x, y, nodeSize, nodeSize);
                        
                        // Draw connections
                        p.stroke(r, g, b, 150);
                        p.strokeWeight(2);
                        
                        if (hashRandom(0, 1) < 0.5 && x < size - nodeSpacing) {
                            p.line(x, y, x + nodeSpacing, y);
                        }
                        if (hashRandom(0, 1) < 0.5 && y < size - nodeSpacing) {
                            p.line(x, y, x, y + nodeSpacing);
                        }
                    }
                }
            }
            break;
    }

    return bgStyle;
}

function generateShapes(p: p5, palette: number[][], tier: 'legendary' | 'rare' | 'uncommon' | 'common', size: number) {
    const shapeTypes = ['circles', 'rectangles', 'triangles', 'lines', 'stars', 'polygons', 'curves', 'spirals'];
    const shapeCount = {
        'legendary': [50, 100],
        'rare': [30, 70],
        'uncommon': [20, 50],
        'common': [10, 30]
    };

    // Track shape type counts
    const shapeCounts = {
        circles: 0,
        rectangles: 0,
        triangles: 0,
        lines: 0,
        stars: 0,
        polygons: 0,
        curves: 0,
        spirals: 0
    };

    let [minShapes, maxShapes] = shapeCount[tier];
    let numShapes = p.floor(hashRandom(minShapes, maxShapes));

    for (let i = 0; i < numShapes; i++) {
        let shapeType = hashRandom(shapeTypes);
        let x = hashRandom(size);
        let y = hashRandom(size);
        let shapeSize = hashRandom(10, 100);
        let [r, g, b] = hashRandom(palette);

        p.noStroke();
        p.fill(r, g, b, hashRandom(20, 100));

        switch (shapeType) {
            case 'circles':
                shapeCounts.circles++;
                p.ellipse(x, y, shapeSize, shapeSize);
                break;
            case 'rectangles':
                shapeCounts.rectangles++;
                p.rect(x, y, shapeSize, shapeSize * hashRandom(0.5, 1.5));
                break;
            case 'triangles':
                shapeCounts.triangles++;
                p.triangle(
                    x, y,
                    x + shapeSize, y,
                    x + shapeSize / 2, y - shapeSize
                );
                break;
            case 'lines':
                shapeCounts.lines++;
                p.stroke(r, g, b, 50);
                p.strokeWeight(hashRandom(1, 5));
                p.line(x, y, x + shapeSize * hashRandom(-1, 1), y + shapeSize * hashRandom(-1, 1));
                break;
            case 'stars':
                shapeCounts.stars = (shapeCounts.stars || 0) + 1;
                let starPoints = Math.floor(hashRandom(5, 8));
                let innerRadius = shapeSize * 0.4;
                let outerRadius = shapeSize;
                
                p.beginShape();
                for (let i = 0; i < starPoints * 2; i++) {
                    let radius = i % 2 === 0 ? outerRadius : innerRadius;
                    let angle = (i * p.TWO_PI) / (starPoints * 2);
                    let px = x + radius * Math.cos(angle);
                    let py = y + radius * Math.sin(angle);
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
                break;
            case 'polygons':
                shapeCounts.polygons = (shapeCounts.polygons || 0) + 1;
                let sides = Math.floor(hashRandom(6, 10));
                p.beginShape();
                for (let i = 0; i < sides; i++) {
                    let angle = (i * p.TWO_PI) / sides;
                    let px = x + shapeSize * Math.cos(angle);
                    let py = y + shapeSize * Math.sin(angle);
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
                break;
            case 'curves':
                shapeCounts.curves = (shapeCounts.curves || 0) + 1;
                p.noFill();
                p.stroke(r, g, b, 150);
                p.strokeWeight(hashRandom(1, 4));
                p.beginShape();
                let curvePoints = Math.floor(hashRandom(3, 6));
                for (let i = 0; i < curvePoints; i++) {
                    let px = x + hashRandom(-shapeSize, shapeSize);
                    let py = y + hashRandom(-shapeSize, shapeSize);
                    p.curveVertex(px, py);
                }
                p.endShape();
                break;
            case 'spirals':
                shapeCounts.spirals = (shapeCounts.spirals || 0) + 1;
                p.noFill();
                p.stroke(r, g, b, 150);
                p.strokeWeight(hashRandom(1, 3));
                let turns = hashRandom(2, 4);
                let spacing = shapeSize / (turns * 10);
                
                for (let angle = 0; angle < p.TWO_PI * turns; angle += 0.1) {
                    let radius = spacing * angle;
                    let px = x + radius * Math.cos(angle);
                    let py = y + radius * Math.sin(angle);
                    p.point(px, py);
                }
                break;
        }
    }

    return {
        totalShapes: numShapes,
        shapeCounts
    };
}

function drawParticles(p: p5, size: number) {
    if (!transactionHash) {
        console.error('No hash set');
        return;
    }

    currentSeed = transactionHash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    let yoff = 0;
    for (let y = 0; y < rows; y++) {
        let xoff = 0;
        for (let x = 0; x < cols; x++) {
            let index = x + y * cols;
            let angle = p.noise(xoff, yoff, zoff) * p.TWO_PI * 4;
            let v = p5.Vector.fromAngle(angle);
            v.setMag(1);
            flowField[index] = v;
            xoff += inc;
        }
        yoff += inc;
    }
    zoff += 0.01;

    for (let particle of particles) {
        particle.follow(flowField);
        particle.update();
        particle.edges(size);
        particle.show(p);
    }
}

class Particle {
    pos: p5.Vector;
    vel: p5.Vector;
    acc: p5.Vector;
    maxSpeed: number;
    strokeColor: p5.Color;
    strokeWeight: number;

    constructor(p: p5, size: number) {
        this.pos = p.createVector(hashRandom(size), hashRandom(size));
        this.vel = p.createVector(0, 0);
        this.acc = p.createVector(0, 0);
        this.maxSpeed = 2;
        this.strokeColor = p.color(hashRandom(255), hashRandom(255), hashRandom(255), 100);
        this.strokeWeight = hashRandom(1, 3);
    }

    follow(vectors: p5.Vector[]) {
        let x = Math.floor(this.pos.x / scl);
        let y = Math.floor(this.pos.y / scl);
        let index = x + y * cols;
        let force = vectors[index];
        if (force) this.applyForce(force);
    }

    applyForce(force: p5.Vector) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    show(p: p5) {
        p.stroke(this.strokeColor);
        p.strokeWeight(this.strokeWeight);

        const renderStyleRoll = seededRandom();
        let renderStyle = renderStyleRoll < 0.33 ? 'point' :
            renderStyleRoll < 0.66 ? 'line' : 'circle';

        switch (renderStyle) {
            case 'point':
                p.point(this.pos.x, this.pos.y);
                break;
            case 'line':
                p.line(
                    this.pos.x,
                    this.pos.y,
                    this.pos.x + this.vel.x * 5,
                    this.pos.y + this.vel.y * 5
                );
                break;
            case 'circle':
                p.noStroke();
                p.fill(this.strokeColor);
                p.ellipse(this.pos.x, this.pos.y, 3, 3);
                break;
        }
    }

    edges(size: number) {
        if (this.pos.x > size) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = size;
        if (this.pos.y > size) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = size;
    }
}

export function preRenderAllHashes(
    hashes: string[],
    size: number,
    onProgress: (progress: RenderProgress) => void
) {
    let completed = 0;
    const total = hashes.length;

    console.log("Prerendering hashes", hashes)

    for (const hash of hashes) {
        if (!renderedPNGs.has(hash)) {
            const localP5 = new p5(() => { });
            const graphics = localP5.createGraphics(size, size);
            graphics.pixelDensity(2);
            graphics.push();
            graphics.translate(size / 2, size / 2);
            graphics.scale(1);
            graphics.translate(-size / 2, -size / 2);

            const metadata = initWithHash(graphics, hash, size);
            drawParticles(graphics, size);
            graphics.pop();

            renderedPNGs.set(hash, graphics);

            saveGraphicsAsImage(graphics, (url) => {
                renderedPNGsBlobUrls[hash] = {
                    hash,
                    blobUrl: url,
                    tier: metadata.tier as 'legendary' | 'rare' | 'uncommon' | 'common',
                    stats: {
                        shapeCount: metadata.shapeStats.totalShapes,
                        backgroundStyle: metadata.bgStyle,
                        shapeTypes: metadata.shapeStats.shapeCounts,
                        palette: metadata.palette
                    }
                };

                completed++;
                onProgress({ completed, total });

                localP5.remove();
            });
        } else {
            completed++;
            onProgress({ completed, total });
        }
    }
}

function stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return Math.abs(hash);
}

function randColor(p: p5): p5.Color {
    return p.color(p.random(255), p.random(255), p.random(255));
}

// Add these helper functions at the top
function lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
}

function easeOutExpo(x: number): number {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function drawArt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    hash: string,
    opacity: number,
    scale: number,
    selectedCell: { row: number, col: number } | null,
    cellSize: number,
    padding: number,
    scaleFactor: number
) {
    if (renderedPNGs.has(hash)) {
        const graphics = renderedPNGs.get(hash)!;

        // Calculate target scale and current scale
        const targetScale = scale;
        const currentScale = targetScale;

        // Calculate target opacity
        const targetOpacity = opacity * 255;
        const currentOpacity = targetOpacity;

        ctx.save();

        // Smooth transform
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(currentScale, currentScale);
        ctx.translate(-size / 2, -size / 2);

        // Apply smooth opacity transition
        ctx.globalAlpha = currentOpacity / 255;
        ctx.drawImage(graphics.elt as HTMLCanvasElement, 0, 0, size, size);

        // Add selection highlight with smooth animation
        const isSelected = selectedCell?.row === Math.floor(y / (cellSize + padding)) &&
            selectedCell?.col === Math.floor(x / (cellSize + padding));

        if (isSelected) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${currentOpacity / 255})`;
            ctx.lineWidth = 5 / scaleFactor / currentScale;
            ctx.strokeRect(0, 0, size - 1, size - 1);
        }

        ctx.restore();
        return;
    }

    // If the image is not pre-rendered, you might want to handle this case
    console.warn(`Image for hash ${hash} not pre-rendered.`);
} 
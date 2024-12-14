import p5 from 'p5';

export function drawArt(p: p5, x: number, y: number, size: number, hash: string, opacity: number, scale: number, selectedCell: { row: number, col: number } | null, cellSize: number, padding: number, scaleFactor: number) {
  const seed = stringToSeed(hash);
  p.randomSeed(seed);

  p.push();
  
  p.translate(x + size / 2, y + size / 2);
  p.scale(scale);
  p.translate(-size / 2, -size / 2);

  const bgColor = randColor(p);
  bgColor.setAlpha(opacity * 255);
  p.fill(bgColor);
  p.noStroke();
  p.rect(0, 0, size, size);

  p.noFill();
  const baseStrokeWeight = 2;
  p.strokeWeight(baseStrokeWeight / scaleFactor / scale);
  
  const strokeColor = p.color(255);
  strokeColor.setAlpha(opacity * 255);
  p.stroke(strokeColor);

  const circleRadius = p.random(size / 4, size / 2);
  p.circle(size / 2, size / 2, circleRadius);

  const ellipseWidth = p.random(0, size / 2);
  p.ellipse(size / 2, size / 2, ellipseWidth, ellipseWidth / 4);

  p.rectMode(p.CENTER);
  p.square(size / 2, size / 2, p.random(0, circleRadius));

  p.bezier(
      0, 0,
      randCoord(p, size), randCoord(p, size),
      randCoord(p, size), randCoord(p, size),
      randCoord(p, size), randCoord(p, size)
  );

  // Add selection highlight
  const isSelected = selectedCell?.row === Math.floor(y / (cellSize + padding)) && 
                    selectedCell?.col === Math.floor(x / (cellSize + padding));
  
  if (isSelected) {
    p.stroke(0, 150, 255);
    p.strokeWeight(4 / scaleFactor / scale);
    p.noFill();
    p.rect(size / 2, size / 2, size + 4, size + 4);
  }

  p.pop();
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

function randCoord(p: p5, max: number): number {
  return p.random(max);
} 
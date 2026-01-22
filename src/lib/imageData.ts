// Generate filenames based on the grid pattern from the sprite sheet
export function getAllFilenames(): string[] {
  const filenames: string[] = [];

  // Rows 1-7 have 19 columns each
  for (let row = 1; row <= 7; row++) {
    for (let col = 1; col <= 19; col++) {
      const rowStr = row.toString().padStart(2, '0');
      const colStr = col.toString().padStart(2, '0');
      filenames.push(`Pasted Layer-${rowStr}-${colStr}.png`);
    }
  }

  // Row 8 has 18 columns
  for (let col = 1; col <= 18; col++) {
    const colStr = col.toString().padStart(2, '0');
    filenames.push(`Pasted Layer-08-${colStr}.png`);
  }

  return filenames;
}

// Extract a short display name from filename
export function getDisplayName(filename: string): string {
  // "Pasted Layer-01-05.png" -> "1-5"
  const match = filename.match(/Layer-(\d+)-(\d+)\.png/);
  if (match) {
    return `${parseInt(match[1])}-${parseInt(match[2])}`;
  }
  // Fallback: remove extension
  return filename.replace(/\.[^.]+$/, '');
}

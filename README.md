# Image Color Arranger

A visual tool for arranging images by their dominant colors, creating aesthetically pleasing collages perfect for painting blueprints or mosaic designs.

## Features

- **Smart Color Extraction**: Uses k-means clustering to identify the top 3 dominant colors in each image
- **Intelligent Arrangement**: Arranges images in a grid based on color properties (hue, lightness, or chroma)
- **Entropy Control**: Adjustable randomness factor for organic-looking arrangements
- **Drag & Drop Reordering**: Manually swap images to fine-tune the arrangement
- **Multiple View Modes**: Toggle between sprite view and color-only view
- **Blueprint View**: Compact reference view for painting guidance
- **Custom Image Upload**: Upload your own images to arrange
- **Responsive Grid**: Configurable grid dimensions

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **OKLCH Color Space** - Perceptually uniform color calculations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pokemoncollagething

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## How It Works

1. **Image Loading**: Images are loaded and processed to extract pixel data
2. **Color Extraction**: K-means++ clustering identifies the 3 most prominent colors
3. **Color Conversion**: Colors are converted to OKLCH color space for perceptually uniform sorting
4. **Arrangement**: Images are sorted along the selected color axis (hue, lightness, or chroma)
5. **Grid Placement**: Sorted images are placed in a 2D grid with optional entropy for variation
6. **Interactive Editing**: Users can drag and drop to swap positions

## Project Structure

```
src/
├── components/
│   ├── ImageGrid.tsx        # Main grid display component
│   ├── ImageCell.tsx        # Individual image cell
│   ├── ArrangementControls.tsx  # Sorting and entropy controls
│   ├── GridControls.tsx     # Grid dimension controls
│   ├── SourceGridControls.tsx   # Source image grid config
│   ├── ViewModeToggle.tsx   # Sprite/color view toggle
│   ├── BlueprintView.tsx    # Compact blueprint reference
│   ├── Modal.tsx            # Reusable modal wrapper
│   ├── ImageUploadModal.tsx # Custom image upload dialog
│   └── ImageSourceControls.tsx  # Image source selector
├── lib/
│   ├── colorExtraction.ts   # K-means color extraction
│   ├── colorSpace.ts        # Color space conversions
│   ├── arrangement.ts       # Grid arrangement algorithms
│   └── imageData.ts         # Image filename utilities
├── types/
│   └── index.ts             # TypeScript type definitions
└── App.tsx                  # Main application component
```

## Configuration

### Arrangement Parameters

- **Sort Axis**: Choose to sort by hue (rainbow order), lightness (dark to light), or chroma (gray to vibrant)
- **Entropy Factor**: 0 = strict sorting, 1 = maximum randomness
- **Neighbor Radius**: How many neighboring cells influence placement decisions
- **Seed**: Random seed for reproducible arrangements

### Grid Settings

- **Rows/Columns**: Set the output grid dimensions
- **Source Grid**: Configure how source images are organized

## License

MIT

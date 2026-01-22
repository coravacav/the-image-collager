import { useState } from "react";
import type { ArrangementState, ViewMode, ImageSprite, ImageLocation, RGBColor } from "../types";
import { ImageCell } from "./ImageCell";
import { rgbToHex } from "../lib/colorSpace";

interface Props {
	arrangement: ArrangementState;
	viewMode: ViewMode;
	onSwap: (from: ImageLocation, to: ImageLocation) => void;
	draggedLocation: ImageLocation | null;
	onDragStart: (location: ImageLocation) => void;
	onDragEnd: () => void;
	colorOverrides: Map<string, RGBColor>;
	onColorChange: (filename: string, colorIndex: number, rgb: RGBColor) => void;
}

export function ImageGrid({
	arrangement,
	viewMode,
	onSwap,
	draggedLocation,
	onDragStart,
	onDragEnd,
	colorOverrides,
	onColorChange,
}: Props) {
	const { grid, cols } = arrangement;
	const [dragOverPos, setDragOverPos] = useState<{ row: number; col: number } | null>(null);
	const [hoveredPos, setHoveredPos] = useState<{ row: number; col: number } | null>(null);

	const handleDragStart = (row: number, col: number) => {
		onDragStart({ type: "grid", row, col });
	};

	const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
		e.preventDefault();
		setDragOverPos({ row, col });
	};

	const handleDragLeave = () => {
		setDragOverPos(null);
	};

	const handleDrop = (row: number, col: number) => {
		if (draggedLocation) {
			const to: ImageLocation = { type: "grid", row, col };
			// Don't swap if dropping on self
			if (draggedLocation.type === "grid" && draggedLocation.row === row && draggedLocation.col === col) {
				setDragOverPos(null);
				return;
			}
			onSwap(draggedLocation, to);
		}
		setDragOverPos(null);
	};

	const handleDragEnd = () => {
		setDragOverPos(null);
		onDragEnd();
	};

	// Check if a grid position is currently being dragged
	const isDraggedPos = (row: number, col: number) => {
		return draggedLocation?.type === "grid" && draggedLocation.row === row && draggedLocation.col === col;
	};

	// Get neighbor at offset from hovered position
	const getNeighbor = (dr: number, dc: number): ImageSprite | null => {
		if (!hoveredPos) return null;
		const nr = hoveredPos.row + dr;
		const nc = hoveredPos.col + dc;
		if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
			return grid[nr][nc];
		}
		return null;
	};

	const hoveredImage = hoveredPos ? grid[hoveredPos.row]?.[hoveredPos.col] : null;

	// Get color overrides map for a specific image
	const getImageColorOverrides = (image: ImageSprite | null): Map<number, RGBColor> => {
		const map = new Map<number, RGBColor>();
		if (!image) return map;
		for (const [key, rgb] of colorOverrides) {
			const [filename, indexStr] = key.split(":");
			if (filename === image.filename) {
				map.set(parseInt(indexStr, 10), rgb);
			}
		}
		return map;
	};

	// Get effective color for an image (with override if present)
	const getEffectiveColor = (image: ImageSprite, colorIndex: number): RGBColor => {
		const key = `${image.filename}:${colorIndex}`;
		return colorOverrides.get(key) ?? image.colors[colorIndex].rgb;
	};

	// Render connection bar between two adjacent cells
	const renderConnectionBar = (row: number, col: number, direction: "bottom" | "right") => {
		const image = grid[row]?.[col];
		if (!image) return null;

		const neighborRow = direction === "bottom" ? row + 1 : row;
		const neighborCol = direction === "right" ? col + 1 : col;
		const neighbor = grid[neighborRow]?.[neighborCol];
		if (!neighbor) return null;

		const imageColor = rgbToHex(getEffectiveColor(image, 0));
		const neighborColor = rgbToHex(getEffectiveColor(neighbor, 0));

		const isVertical = direction === "bottom";
		const gradientDirection = isVertical ? "to bottom" : "to right";

		const style: React.CSSProperties = isVertical
			? {
					position: "absolute",
					bottom: "-3px",
					left: "20%",
					right: "20%",
					height: "8px",
					transform: "translateY(50%)",
					zIndex: 5,
					pointerEvents: "none",
				}
			: {
					position: "absolute",
					right: "-2px",
					top: "20%",
					bottom: "20%",
					width: "8px",
					transform: "translateX(50%)",
					zIndex: 5,
					pointerEvents: "none",
				};

		return (
			<div
				key={`${row}-${col}-${direction}`}
				className="rounded-full"
				style={{
					...style,
					background: `linear-gradient(${gradientDirection}, ${imageColor} 50%, ${neighborColor} 50%)`,
				}}
			/>
		);
	};

	// Calculate connection bar positions for hovered cell (with enhanced styling)
	const renderHoveredConnectionBars = () => {
		if (!hoveredPos || !hoveredImage) return null;

		const neighbors = [
			{ dr: -1, dc: 0, direction: "top" },
			{ dr: 1, dc: 0, direction: "bottom" },
			{ dr: 0, dc: -1, direction: "left" },
			{ dr: 0, dc: 1, direction: "right" },
		];

		return neighbors.map(({ dr, dc, direction }) => {
			const neighbor = getNeighbor(dr, dc);
			if (!neighbor) return null;

			const hoveredColor = rgbToHex(getEffectiveColor(hoveredImage, 0));
			const neighborColor = rgbToHex(getEffectiveColor(neighbor, 0));

			let style: React.CSSProperties = {
				position: "absolute",
				zIndex: 20,
				pointerEvents: "none",
			};

			// Position and size based on direction
			if (direction === "top") {
				style = {
					...style,
					top: "-4px",
					left: "20%",
					right: "20%",
					height: "8px",
					transform: "translateY(-50%)",
				};
			} else if (direction === "bottom") {
				style = {
					...style,
					bottom: "-4px",
					left: "20%",
					right: "20%",
					height: "8px",
					transform: "translateY(50%)",
				};
			} else if (direction === "left") {
				style = {
					...style,
					left: "-4px",
					top: "20%",
					bottom: "20%",
					width: "8px",
					transform: "translateX(-50%)",
				};
			} else if (direction === "right") {
				style = {
					...style,
					right: "-4px",
					top: "20%",
					bottom: "20%",
					width: "8px",
					transform: "translateX(50%)",
				};
			}

			const isVertical = direction === "top" || direction === "bottom";
			const gradientDirection = isVertical
				? direction === "top"
					? "to top"
					: "to bottom"
				: direction === "left"
					? "to left"
					: "to right";

			return (
				<div
					key={direction}
					className="rounded-full shadow-lg border border-white/20"
					style={{
						...style,
						background: `linear-gradient(${gradientDirection}, ${hoveredColor} 50%, ${neighborColor} 50%)`,
					}}
				/>
			);
		});
	};

	return (
		<div
			className="grid gap-1 bg-gray-800 p-2 rounded-lg relative"
			style={{
				gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
			}}
		>
			{grid.map((row, r) =>
				row.map((image, c) => (
					<div
						key={`${r}-${c}`}
						className="relative"
						onMouseEnter={() => setHoveredPos({ row: r, col: c })}
						onMouseLeave={() => setHoveredPos(null)}
					>
						<ImageCell
							image={image}
							viewMode={viewMode}
							isDragging={isDraggedPos(r, c)}
							isDragOver={dragOverPos?.row === r && dragOverPos?.col === c}
							isHovered={hoveredPos?.row === r && hoveredPos?.col === c}
							onDragStart={() => handleDragStart(r, c)}
							onDragOver={(e) => handleDragOver(e, r, c)}
							onDragLeave={handleDragLeave}
							onDrop={() => handleDrop(r, c)}
							onDragEnd={handleDragEnd}
							colorOverrides={getImageColorOverrides(image)}
							onColorChange={
								image ? (colorIndex, rgb) => onColorChange(image.filename, colorIndex, rgb) : undefined
							}
						/>
						{/* Always-visible connection bars to adjacent cells */}
						{renderConnectionBar(r, c, "bottom")}
						{renderConnectionBar(r, c, "right")}
						{/* Enhanced connection bars for hovered cell */}
						{hoveredPos?.row === r && hoveredPos?.col === c && renderHoveredConnectionBars()}
					</div>
				)),
			)}
		</div>
	);
}

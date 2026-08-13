// Draws the backend's cell_overlay data directly on top of the smear
// photo , one colored ellipse per detected cell, green through yellow to
// red depending on how far the cell's shape is from a normal round RBC.
// Coordinates from the backend are normalized 0-1 (fraction of image
// width/height), so this component just needs to know the rendered
// width/height of the photo on screen to place things correctly ,
// it doesn't need to know anything about the backend's internal
// 260x260 processing size.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

// Only draws cells at or above this severity by default, to avoid
// cluttering the photo with every faint, harmless variation , the
// technician can still see the raw numbers in the report even for
// cells not drawn here. Pass showAllCells to override this.
const DEFAULT_MINIMUM_SEVERITY_TO_DRAW = 0.0;

const CellOverlay = ({
  cellOverlay,
  displayWidth,
  displayHeight,
  showAllCells = true,
  minimumSeverityToDraw = DEFAULT_MINIMUM_SEVERITY_TO_DRAW,
}) => {
  if (!cellOverlay || !Array.isArray(cellOverlay.cells) || cellOverlay.cells.length === 0) {
    return null;
  }

  const cellsToRender = showAllCells
    ? cellOverlay.cells
    : cellOverlay.cells.filter(cell => cell.severity >= minimumSeverityToDraw);

  return (
    <View
      pointerEvents="none"
      style={[styles.overlayContainer, { width: displayWidth, height: displayHeight }]}
    >
      <Svg width={displayWidth} height={displayHeight}>
        {cellsToRender.map((cell, cellIndex) => {
          const centerXPixels = cell.center_x * displayWidth;
          const centerYPixels = cell.center_y * displayHeight;
          const radiusXPixels = cell.radius_x * displayWidth;
          const radiusYPixels = cell.radius_y * displayHeight;

          return (
            <Ellipse
              key={cellIndex}
              cx={centerXPixels}
              cy={centerYPixels}
              rx={radiusXPixels}
              ry={radiusYPixels}
              rotation={cell.rotation_angle}
              originX={centerXPixels}
              originY={centerYPixels}
              stroke={cell.color}
              strokeWidth={cell.severity >= 0.5 ? 2.5 : 1.5}
              fill={cell.color}
              fillOpacity={cell.severity >= 0.5 ? 0.18 : 0.08}
            />
          );
        })}
      </Svg>
    </View>
  );
}
export default CellOverlay;

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
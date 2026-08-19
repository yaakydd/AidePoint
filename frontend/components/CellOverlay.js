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
  maximumSeverityToDraw = 1.001,
}) => {
  if (!cellOverlay || !Array.isArray(cellOverlay.cells) || cellOverlay.cells.length === 0) {
    return null;
  }


  const cellsToRender = showAllCells
    ? cellOverlay.cells
    : cellOverlay.cells.filter(
        cell => cell.severity >= minimumSeverityToDraw && cell.severity < maximumSeverityToDraw
      );

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
              // Was a hard cutoff (1.5px/8% below severity 0.5, 2.5px/18%
              // at or above) -- on a real, low-contrast smear the faint
              // end was visually indistinguishable from the background,
              // so "normal" cells (which sit well under 0.5) rendered as
              // effectively invisible even though they were technically
              // in the SVG. A smooth gradient keeps flagged cells
              // visually louder while guaranteeing every cell, including
              // normal ones, has a real minimum visible stroke/fill.
              strokeWidth={1.5 + cell.severity * 1.5}
              fill={cell.color}
              fillOpacity={0.14 + cell.severity * 0.16}
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
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { severityToColor } from '../utils/ReportUtils';

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

          // Always derive from severity via the shared function, so this
          // dot's color is guaranteed to match the legend swatch for the
          // bucket it falls into -- never trust a pre-baked cell.color,
          // which may have been computed by a different formula (e.g.
          // server-side) and silently drift out of sync.
          const cellColor = severityToColor(cell.severity);

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
              stroke={cellColor}
              strokeWidth={1.5 + cell.severity * 1.5}
              fill={cellColor}
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
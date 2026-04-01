import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const CameraStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  viewfinder: {
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: [{ translateX: -width / 4 }],
    width: width / 2,
    height: width / 2,
    justifyContent: "center",
    alignItems: "center",
  },

  outerCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0bc9da50",
    justifyContent: "center",
    alignItems: "center",
  },

  innerCircle: {
    width: "80%",
    height: "80%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0bc9da30",
  },

  feedbackContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    flexDirection: "row",
    gap: 10,
  },

  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00000080",
    padding: 6,
    borderRadius: 12,
    gap: 4,
  },

  feedbackText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  bottomControls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },

  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#0bc9da",
    justifyContent: "center",
    alignItems: "center",
  },

  innerCaptureButton: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#0bc9da",
  },

  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fff",
  },

  thumbImage: {
    width: "100%",
    height: "100%",
  },
});
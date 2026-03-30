import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f8f8",
    justifyContent: "center",
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },

  subtitle: {
    color: "#666",
    marginBottom: 20,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  input: {
    flex: 1,
    padding: 12,
  },

  button: {
    backgroundColor: "#0bc9da",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
  },
});
import { StyleSheet } from "react-native";

// Common shadow style for cards
const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 5,
};

export const signupStyle = StyleSheet.create({

  // CONTAINERe
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
  },

  // CARD
  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    ...cardShadow,
  },

  // HEADER / LOGO
  logoContainer: {
    flexDirection: 'row',           // Icon and text side by side
    alignItems: 'center',           // Vertically centered
    justifyContent: 'flex-start',   // Start from left
    marginBottom: 30,               // Space below logo
  },

  logoCircle: {
    width: 50,                       // Circle width
    height: 50,                      // Circle height
    borderRadius: 25,                // Circle shape
    backgroundColor: '#E0F7FA',      // Light background color
    alignItems: 'center',            // Center icon horizontally
    justifyContent: 'center',        // Center icon vertically
    marginRight: 12,                 // Space between circle and text
  },

  logoText: {
    fontSize: 24,                     // Logo text size
    fontWeight: 'bold',               // Bold text
    color: '#00CFE8',                 // Match your brand color
  },

  // TEXT
  title: {
    fontSize: 26,
    color: "#00CFE8",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748B",
    textAlign: "center",
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
  },

  // INPUTS
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    color: "#1E293B",
  },

  // BUTTONS
  registerBtn: {
    backgroundColor: "#00CFE8",
    borderRadius: 30,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  registerBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginRight: 10,
  },

  // SSO / DIVIDER
  ssoDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  ssoText: {
    marginHorizontal: 10,
    color: "#94A3B8",
    fontSize: 12,
  },
  ssoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ssoButton: {
    flex: 0.48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  ssoBtnLabel: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#475569",
  },

  // LINKS / FOOTER
  signInText: {
    textAlign: "center",
    marginTop: 25,
    color: "#64748B",
  },
  signInLink: {
    color: "#00CFE8",
    fontWeight: "bold",
  },
  footerLegal: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 30,
    lineHeight: 18,
  },

  // ERRORS
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 10,
  },
});
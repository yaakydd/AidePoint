import { StyleSheet } from "react-native";

// HOME SCREEN STYLES
export const homeStyles = StyleSheet.create({
  // CONTAINER
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 20,
  },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#FFF",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  subGreeting: {
    color: "#64748B",
    fontSize: 12,
  },

  // DASHBOARD STATS
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    ...cardShadow,
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginVertical: 4,
  },
  statTrend: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  statCritical: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },

  // CHART
  chartCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    ...cardShadow,
  },
  placeholderChart: {
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 15,
  },
  avgText: {
    fontSize: 12,
    color: "#64748B",
  },

  // RECENT SCANS
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 15,
  },
  viewAll: {
    color: "#00CFE8",
    fontWeight: "600",
  },

  patientCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  patientTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
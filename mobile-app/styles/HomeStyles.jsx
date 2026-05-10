import { StyleSheet } from "react-native";

/**
 * Shared card shadow
 */
const cardShadow = {
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};

export const homeStyles = StyleSheet.create({
  /**
   * SAFE AREA
   */
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /**
   * MAIN CONTAINER
   */
  container: {
    flex: 1,
  },

  /**
   * SCROLL CONTENT
   */
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  /**
   * HEADER
   */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 20,
    paddingVertical: 15,

    backgroundColor: "#FFFFFF",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },

  subGreeting: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },

  notificationButton: {
    padding: 6,
  },

  /**
   * TITLES
   */
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 15,
  },

  /**
   * STATS SECTION
   */
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",

    padding: 18,
    borderRadius: 18,

    ...cardShadow,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },

  statValue: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 6,
  },

  statTrend: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },

  statCritical: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },

  /**
   * CHART SECTION
   */
  chartCard: {
    marginTop: 18,

    backgroundColor: "#FFFFFF",

    padding: 20,
    borderRadius: 18,

    ...cardShadow,
  },

  averageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  avgText: {
    marginLeft: 5,
    marginBottom: 5,

    fontSize: 13,
    color: "#64748B",
  },

  placeholderChart: {
    height: 120,
    marginTop: 25,

    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  emptyChartLine: {
    height: 2,
    width: "100%",

    marginTop: 50,

    backgroundColor: "#E2E8F0",
    borderRadius: 1,
  },

  /**
   * RECENT SCANS
   */
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginTop: 28,
    marginBottom: 12,
  },

  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00CFE8",
  },

  /**
   * PATIENT CARD
   */
  patientCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    padding: 15,
    marginBottom: 14,

    borderRadius: 18,

    ...cardShadow,
  },

  patientInfo: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,
  },

  patientIcon: {
    width: 52,
    height: 52,

    borderRadius: 16,

    justifyContent: "center",
    alignItems: "center",
  },

  patientTextContainer: {
    marginLeft: 12,
    flexShrink: 1,
  },

  patientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  patientTime: {
    marginTop: 4,

    fontSize: 12,
    color: "#94A3B8",
  },

  /**
   * STATUS BADGE
   */
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 20,

    marginLeft: 10,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /**
   * EMPTY STATE
   */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",

    marginTop: 40,
    paddingBottom: 40,
  },

  emptyText: {
    marginTop: 12,

    fontSize: 14,
    color: "#64748B",
  },
});
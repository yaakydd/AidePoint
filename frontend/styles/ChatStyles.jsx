import { StyleSheet, Platform } from "react-native";
import {
    COLORS,
    FONTS,
    SPACING,
    RADIUS,
    SHADOWS,
    layout,
    vScale,
    scale,
} from "../assets/theme";

export const ChatStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Body Layout Structure 
    mainLayoutBody: {
        flex: 1,
    },
    messageList: {
        flex: 1,
    },
    todayText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontSize: FONTS.xs,
        fontFamily: FONTS.family.bold,
        marginVertical: SPACING.xl,
        letterSpacing: 1,
    },
    flatListContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },

    // Interaction Deck (floats above the tab bar, never hidden behind it)
    bottomControlsDeck: {
        width: '100%',
        backgroundColor: 'transparent',
    },

    // Suggestion Chips Layout 
    suggestionContainer: {
        width: '100%',
        paddingVertical: SPACING.xs,
        backgroundColor: 'transparent',
    },
    suggestionScrollContent: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    suggestionChip: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    suggestionText: {
        color: COLORS.primaryDark,
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.semibold,
    },

    // Input Bar Capsule 
    inputLayout: {
        width: '100%',
        backgroundColor: 'transparent',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        minHeight: vScale(54),
        maxHeight: vScale(120),
        ...SHADOWS.md,
    },
    iconButton: {
        paddingRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: FONTS.md,
        color: COLORS.textPrimary,
        backgroundColor: 'transparent',
        paddingHorizontal: SPACING.sm,
        paddingVertical: Platform.select({ ios: SPACING.xs, android: 0 }),
        textAlignVertical: 'center',
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: scale(38),
        height: scale(38),
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.xs,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },

    // History Sidebar 
    sidebarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
        flexDirection: 'row',
        zIndex: 200,
    },
    sidebarPanel: {
        width: '80%',
        maxWidth: scale(320),
        height: '100%',
        backgroundColor: COLORS.surface,
        paddingTop: layout.statusBarHeight + SPACING.lg,
        ...SHADOWS.lg,
    },
    sidebarDismissArea: {
        flex: 1,
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    sidebarTitle: {
        fontSize: FONTS.lg,
        fontFamily: FONTS.family.bold,
        color: COLORS.textPrimary,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    newChatButtonText: {
        color: COLORS.primaryDark,
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.bold,
    },
    usageBanner: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    usageBannerLabel: {
        fontSize: FONTS.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    usageBannerValue: {
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.semibold,
        color: COLORS.textPrimary,
    },
    usageBannerValueWarning: {
        color: COLORS.warning,
    },
    sidebarSectionLabel: {
        fontSize: FONTS.xs,
        fontFamily: FONTS.family.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    sessionList: {
        flexGrow: 0,
    },
    sessionItem: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    sessionItemActive: {
        backgroundColor: COLORS.primaryLight,
    },
    sessionItemTitle: {
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.semibold,
        color: COLORS.textPrimary,
    },
    sessionItemDate: {
        fontSize: FONTS.xs,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    sidebarFooter: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xl,
    },
    sidebarFooterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    sidebarFooterText: {
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.semibold,
        color: COLORS.textPrimary,
    },

    // Disclaimer 
    disclaimerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: SPACING.lg + SPACING.xs,
        paddingTop: SPACING.xs,
        gap: SPACING.xs,
    },
    disclaimerText: {
        flex: 1,
        fontSize: FONTS.xs,
        color: COLORS.textSecondary,
        lineHeight: FONTS.xs * FONTS.normal,
    },

    // Base Chat Window Styling 
    titleLayout: {
        marginLeft: SPACING.md,
    },
    title: {
        fontSize: FONTS.lg,
        fontFamily: FONTS.family.bold,
        color: COLORS.textPrimary,
    },
    subTitle: {
        color: COLORS.primaryDark,
        fontSize: FONTS.sm,
        fontFamily: FONTS.family.regular,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerIconsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    botWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.xl,
        maxWidth: '85%',
    },
    userWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        marginBottom: SPACING.xl,
        alignSelf: 'flex-end',
        maxWidth: '85%',
    },
    messageGroup: {
        flexDirection: 'column',
        flex: 1,
    },
    botName: {
        color: COLORS.primaryDark,
        fontFamily: FONTS.family.bold,
        fontSize: FONTS.sm,
        marginBottom: SPACING.xs,
    },
    userName: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.family.bold,
        fontSize: FONTS.sm,
        marginBottom: SPACING.xs,
        textAlign: 'right',
    },
    botBubble: {
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        borderTopLeftRadius: RADIUS.xs,
        ...SHADOWS.sm,
    },
    userBubble: {
        backgroundColor: COLORS.primary,
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xs,
    },
    botText: {
        fontSize: FONTS.md,
        lineHeight: FONTS.md * FONTS.normal,
        color: COLORS.textPrimary,
    },
    userText: {
        fontSize: FONTS.md,
        lineHeight: FONTS.md * FONTS.normal,
        color: COLORS.white,
    },
    avatarCircleBot: {
        width: scale(40),
        height: scale(40),
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    avatarCircleUser: {
        width: scale(40),
        height: scale(40),
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING['2xl'],
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    modalTitle: {
        fontSize: FONTS.lg,
        fontFamily: FONTS.family.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    modalDescription: {
        fontSize: FONTS.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: FONTS.sm * FONTS.normal,
        marginBottom: SPACING.xl,
    },
    closeButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING['3xl'],
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
    },
    closeButtonText: {
        color: COLORS.white,
        fontFamily: FONTS.family.bold,
    },
    bugModalContent: {
        width: '90%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.lg,
    },
    bugInput: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        height: vScale(150),
        textAlignVertical: 'top',
        fontSize: FONTS.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    bugButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    bugButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
});
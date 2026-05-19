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

    // ── Body Layout Structure ────────────────────────────────────────────────
    mainLayoutBody: {
        flex: 1,
    },
    messageList: {
        flex: 1,
    },
    todayText: {
        textAlign: 'center',
        color: COLORS.textMuted,
        fontSize: FONTS.xs,
        fontWeight: FONTS.bold,
        marginVertical: SPACING.xl,
        letterSpacing: 1,
    },
    flatListContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },

    // ── Interaction Deck (Floats neatly above TabBar) ───────────────────────
    bottomControlsDeck: {
        width: '100%',
        backgroundColor: 'transparent',
        // Adds native tab bar padding when resting, clears it cleanly when keyboard lifts
        marginBottom: layout.tabBarHeight, 
    },

    // ── Suggestion Chips Layout ──────────────────────────────────────────────
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
        fontWeight: FONTS.semibold,
    },

    // ── Input Bar Capsule (Exact Screenshot Match) ───────────────────────────
    inputLayout: {
        width: '100%',
        backgroundColor: 'transparent',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xs,
        paddingBottom: Platform.OS === 'ios' ? SPACING.xs : SPACING.sm,
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

    // ── Base Chat Window Styling ─────────────────────────────────────────────
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        height: vScale(70),
        backgroundColor: COLORS.surface,
        ...SHADOWS.md,
        zIndex: 10,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleLayout: {
        marginLeft: SPACING.md,
    },
    title: {
        fontSize: FONTS.lg,
        fontWeight: FONTS.bold,
        color: COLORS.textPrimary,
    },
    subTitle: {
        color: COLORS.primary,
        fontSize: FONTS.sm,
        fontWeight: FONTS.regular,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerIconsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownMenu: {
        position: 'absolute',
        top: vScale(75),
        right: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        width: scale(180),
        ...SHADOWS.lg,
        zIndex: 100,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    menuText: {
        fontSize: FONTS.sm,
        color: COLORS.textPrimary,
        fontWeight: FONTS.semibold,
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
        fontWeight: FONTS.bold,
        fontSize: FONTS.sm,
        marginBottom: SPACING.xs,
    },
    userName: {
        color: COLORS.textSecondary,
        fontWeight: FONTS.bold,
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
        fontWeight: FONTS.bold,
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
        fontWeight: FONTS.bold,
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
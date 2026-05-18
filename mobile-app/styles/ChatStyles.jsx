import { StyleSheet } from "react-native";
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, vScale, scale } from "../assets/theme"; // Adjust path if necessary

export const ChatStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header
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
        alignItems: 'center' 
    },
    titleLayout: { 
        marginLeft: SPACING.md 
    },
    title: { 
        fontSize: FONTS.lg, 
        fontWeight: FONTS.bold, 
        color: COLORS.textPrimary 
    },
    subTitle: { 
        color: COLORS.primary, 
        fontSize: FONTS.sm, 
        fontWeight: FONTS.regular 
    },
    backButton: { 
        padding: SPACING.xs 
    },
    headerIconsRight: { 
        flexDirection: 'row', 
        gap: SPACING.lg, 
        alignItems: 'center' 
    },

    // Menu
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
        gap: SPACING.md 
    },
    menuText: { 
        fontSize: FONTS.sm, 
        color: COLORS.textPrimary, 
        fontWeight: FONTS.semibold 
    },

    // Chat Body
    chatBodyContainer: { 
        flex: 1, 
        zIndex: 1 
    },
    todayText: { 
        textAlign: 'center', 
        color: COLORS.textMuted, 
        fontSize: FONTS.xs, 
        fontWeight: FONTS.bold, 
        marginVertical: SPACING.xl, 
        letterSpacing: 1 
    },
    flatListContent: { 
        paddingHorizontal: SPACING.lg, 
        paddingBottom: SPACING.xl 
    },
    
    // Messages
    botWrapper: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: SPACING.xl, 
        maxWidth: '85%' 
    },
    userWrapper: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        justifyContent: 'flex-end', 
        marginBottom: SPACING.xl, 
        alignSelf: 'flex-end', 
        maxWidth: '85%' 
    },
    messageGroup: { 
        flexDirection: 'column', 
        flex: 1 
    },
    botName: { 
        color: COLORS.primaryDark, 
        fontWeight: FONTS.bold, 
        fontSize: FONTS.sm, 
        marginBottom: SPACING.xs 
    },
    userName: { 
        color: COLORS.textSecondary, 
        fontWeight: FONTS.bold, 
        fontSize: FONTS.sm, 
        marginBottom: SPACING.xs, 
        textAlign: 'right' 
    },
    botBubble: { 
        backgroundColor: COLORS.surface, 
        padding: SPACING.lg, 
        borderRadius: RADIUS.xl, 
        borderTopLeftRadius: RADIUS.xs, 
        ...SHADOWS.sm 
    },
    userBubble: { 
        backgroundColor: COLORS.primary, 
        padding: SPACING.lg, 
        borderRadius: RADIUS.xl, 
        borderTopRightRadius: RADIUS.xs 
    },
    botText: { 
        fontSize: FONTS.md, 
        lineHeight: FONTS.md * FONTS.normal, 
        color: COLORS.textPrimary 
    },
    userText: { 
        fontSize: FONTS.md, 
        lineHeight: FONTS.md * FONTS.normal, 
        color: COLORS.white 
    },

    // Avatars
    avatarCircleBot: { 
        width: scale(40), 
        height: scale(40), 
        borderRadius: RADIUS.full, 
        backgroundColor: COLORS.primaryDark, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: SPACING.sm 
    },
    avatarCircleUser: { 
        width: scale(40), 
        height: scale(40), 
        borderRadius: RADIUS.full, 
        backgroundColor: COLORS.primary, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginLeft: SPACING.sm 
    },

    // Input & Chips
    suggestionContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        gap: SPACING.sm, 
        paddingBottom: SPACING.md 
    },
    suggestionChip: { 
        backgroundColor: COLORS.primaryLight, 
        paddingHorizontal: SPACING.lg, 
        paddingVertical: SPACING.sm, 
        borderRadius: RADIUS.full, 
        borderWidth: 1, 
        borderColor: COLORS.primary 
    },
    suggestionText: { 
        color: COLORS.primaryDark, 
        fontSize: FONTS.sm, 
        fontWeight: FONTS.semibold 
    },
    inputLayout: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.surface, 
        borderRadius: RADIUS.full, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        paddingHorizontal: SPACING.lg, 
        paddingVertical: SPACING.xs, 
        marginHorizontal: SPACING.lg, 
        marginBottom: layout.bottomInset > 0 ? layout.bottomInset : SPACING.md 
    },
    input: { 
        flex: 1, 
        height: vScale(45), 
        fontSize: FONTS.md, 
        color: COLORS.textPrimary, 
        marginHorizontal: SPACING.sm 
    },
    sendButton: { 
        backgroundColor: COLORS.primary, 
        width: scale(40), 
        height: scale(40), 
        borderRadius: RADIUS.md, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },

    // Modals
    modalOverlay: { 
        flex: 1, 
        backgroundColor: COLORS.overlay, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalContent: { 
        width: '85%', 
        backgroundColor: COLORS.surface, 
        borderRadius: RADIUS.xl, 
        padding: SPACING['2xl'], 
        alignItems: 'center', 
        ...SHADOWS.lg 
    },
    modalTitle: { 
        fontSize: FONTS.lg, 
        fontWeight: FONTS.bold, 
        color: COLORS.textPrimary, 
        marginBottom: SPACING.lg 
    },
    modalDescription: { 
        fontSize: FONTS.sm, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        lineHeight: FONTS.sm * FONTS.normal, 
        marginBottom: SPACING.xl 
    },
    closeButton: { 
        backgroundColor: COLORS.primary, 
        paddingHorizontal: SPACING['3xl'], 
        paddingVertical: SPACING.md, 
        borderRadius: RADIUS.md 
    },
    closeButtonText: { 
        color: COLORS.white, 
        fontWeight: FONTS.bold 
    },

    // Bug Form Specifics
    bugModalContent: { 
        width: '90%', 
        backgroundColor: COLORS.surface, 
        borderRadius: RADIUS.xl, 
        padding: SPACING.xl, 
        ...SHADOWS.lg 
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
        borderColor: COLORS.border
    },
    bugButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        gap: SPACING.md 
    },
    bugButton: { 
        flex: 1, 
        backgroundColor: COLORS.primary, 
        paddingVertical: SPACING.md, 
        borderRadius: RADIUS.md, 
        alignItems: 'center' 
    }
});
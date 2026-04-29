import { StyleSheet } from "react-native";

export const ChatStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 70,
        backgroundColor: 'white',
        elevation: 2, 
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleLayout: {
        marginLeft: 30, // Adjusted for typical back arrow spacing
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    backButton: {
    padding: 5, // Makes the button easier to press without changing the icon size
    marginRight: 5, 
    },
    subTitle: {
        color: '#00BCD4',
        fontSize: 13,
        fontWeight: '400',
    },
    headerIconsRight: {
        flexDirection: 'row',
        gap: 15, // Gap between the two right-side icons
        alignItems: 'center',
    },

    chatBodyContainer: {
        flex: 1,
    },
    todayText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '700',
        marginVertical: 20,
        letterSpacing: 1,
    },
    flatListContent: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },

    botWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        maxWidth: '85%',
    },
    userWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        marginBottom: 20,
        alignSelf: 'flex-end',
        maxWidth: '85%',
    },
    // Fix: Ensures Name is on top of Bubble
    messageGroup: {
        flexDirection: 'column',
        flex: 1,
    },

    avatarCircleBot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#98C1BD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarCircleUser: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#00BCD4',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },

    botBubble: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 20,
        borderTopLeftRadius: 2,
        elevation: 1,
    },
    userBubble: {
        backgroundColor: '#00BCD4',
        padding: 15,
        borderRadius: 20,
        borderTopRightRadius: 2,
    },

    botName: {
        color: '#00BCD4',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    userName: {
        color: '#94A3B8', // Changed to soft grey to contrast with teal bubble
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
        textAlign: 'right', // Aligns name to the right for user
    },

    botText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#334155',
    },
    userText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#FFFFFF',
    },

    suggestionContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingBottom: 20,
    },
    suggestionChip: {
        backgroundColor: '#E0F7FA',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#B2EBF2',
    },
    suggestionText: {
        color: '#00BCD4',
        fontSize: 13,
        fontWeight: '600',
    },

    inputLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 30, 
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginHorizontal: 15,
        marginBottom: 10,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 16,
        color: '#334155',
        marginHorizontal: 10,
    },
    sendButton: {
        backgroundColor: '#00BCD4',
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
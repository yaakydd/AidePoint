import { StyleSheet } from "react-native";

export const ChatStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    // Header
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 70,
        backgroundColor: 'white',
        elevation: 4, 
        zIndex: 10,
    },
    leftContent: { flexDirection: 'row', alignItems: 'center' },
    titleLayout: { marginLeft: 15 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    subTitle: { color: '#00BCD4', fontSize: 13, fontWeight: '400' },
    backButton: { padding: 5 },
    headerIconsRight: { flexDirection: 'row', gap: 15, alignItems: 'center' },

    // Menu
    dropdownMenu: {
        position: 'absolute',
        top: 75,
        right: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 10,
        width: 180,
        elevation: 15, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 100,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, gap: 12 },
    menuText: { fontSize: 14, color: '#334155', fontWeight: '600' },

    // Chat Body
    chatBodyContainer: { flex: 1, zIndex: 1 },
    todayText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: '700', marginVertical: 20, letterSpacing: 1 },
    flatListContent: { paddingHorizontal: 15, paddingBottom: 20 },
    
    // Messages
    botWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, maxWidth: '85%' },
    userWrapper: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: 20, alignSelf: 'flex-end', maxWidth: '85%' },
    messageGroup: { flexDirection: 'column', flex: 1 },
    botName: { color: '#00BCD4', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    userName: { color: '#94A3B8', fontWeight: 'bold', fontSize: 14, marginBottom: 5, textAlign: 'right' },
    botBubble: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 20, borderTopLeftRadius: 2, elevation: 1 },
    userBubble: { backgroundColor: '#00BCD4', padding: 15, borderRadius: 20, borderTopRightRadius: 2 },
    botText: { fontSize: 15, lineHeight: 22, color: '#334155' },
    userText: { fontSize: 15, lineHeight: 22, color: '#FFFFFF' },

    // Avatars
    avatarCircleBot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#98C1BD', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarCircleUser: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00BCD4', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

    // Input & Chips
    suggestionContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 20 },
    suggestionChip: { backgroundColor: '#E0F7FA', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#B2EBF2' },
    suggestionText: { color: '#00BCD4', fontSize: 13, fontWeight: '600' },
    inputLayout: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 30, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 15, paddingVertical: 5, marginHorizontal: 15, marginBottom: 10 },
    input: { flex: 1, height: 45, fontSize: 16, color: '#334155', marginHorizontal: 10 },
    sendButton: { backgroundColor: '#00BCD4', width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
    modalDescription: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    closeButton: { backgroundColor: '#00BCD4', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    closeButtonText: { color: 'white', fontWeight: 'bold' },

    // Bug Form Specifics
    bugModalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
    bugInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 15, height: 150, textAlignVertical: 'top', fontSize: 15, color: '#1E293B', marginBottom: 20 },
    bugButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    bugButton: { flex: 1, backgroundColor: '#00BCD4', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }
});
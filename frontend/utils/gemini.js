import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    Alert,
    Linking,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, HEADER } from "../assets/theme";
import Header from "../components/Header";
import { AuthContext } from "../context/AuthContext";
import { sendToGemini } from "../utils/gemini";
import {
    loadSessions,
    saveSessions,
    clearAllSessions,
    deriveSessionTitle,
    getTodayUsageCount,
    incrementTodayUsage,
} from "../utils/chatstorage";
import { getPlan } from "../constants/SubscriptionPlans";

const welcomeMessage = {
    id: 'welcome',
    type: 'bot',
    text: "Hello! I'm AideBot. I can help you interpret blood smear results or provide info on malaria, sickle cell, and anemia. How can I assist you today?",
};

function newSession() {
    return {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [welcomeMessage],
        updatedAt: new Date().toISOString(),
    };
}

function formatSessionDate(iso) {
    return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const Chatbot = () => {
    const navigation = useNavigation();
    const flatListRef = useRef(null);
    const { user } = useContext(AuthContext);
    const plan = getPlan(user?.subscriptionTier);
    const displayName = user?.name?.trim() || 'You';

    // Sidebar / history
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(newSession());

    // Usage / limits
    const [usageCount, setUsageCount] = useState(0);

    // Modals & input
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const [isBugModalVisible, setIsBugModalVisible] = useState(false);
    const [bugReport, setBugReport] = useState("");
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);

    const messages = activeSession.messages;
    const limitReached = usageCount >= plan.dailyChatLimit;

    // Load persisted history + today's usage on mount 
    useEffect(() => {
        (async () => {
            const stored = await loadSessions(user?.id);
            setSessions(stored);
            if (stored.length > 0) {
                setActiveSession(stored[0]);
            }
            const count = await getTodayUsageCount(user?.id);
            setUsageCount(count);
        })();
    }, [user?.id]);

    const persistSession = useCallback(async (session) => {
        setSessions(prev => {
            const others = prev.filter(s => s.id !== session.id);
            const next = [session, ...others];
            saveSessions(user?.id, next);
            return next;
        });
    }, [user?.id]);

    // Sending a message 

    const handleSend = async (textToSend = inputText) => {
        const messageText = typeof textToSend === 'string' ? textToSend : inputText;
        if (messageText.trim().length === 0 || isSending) return;

        if (limitReached) {
            Alert.alert(
                'Daily chat limit reached',
                `You've used all ${plan.dailyChatLimit} AideBot messages included in your ${plan.label} plan today. Upgrade your plan for a higher daily limit.`,
                [{ text: 'OK' }]
            );
            return;
        }

        const newUserMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: messageText.trim(),
        };

        const updatedMessages = [...messages, newUserMessage];
        const updatedSession = {
            ...activeSession,
            title: activeSession.title === 'New Chat'
                ? deriveSessionTitle(updatedMessages)
                : activeSession.title,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
        };
        setActiveSession(updatedSession);
        setInputText("");
        setIsSending(true);

        try {
            const replyText = await sendToGemini(updatedMessages);

            const botResponse = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                text: replyText,
            };

            const finalMessages = [...updatedMessages, botResponse];
            const finalSession = {
                ...updatedSession,
                messages: finalMessages,
                updatedAt: new Date().toISOString(),
            };
            setActiveSession(finalSession);
            await persistSession(finalSession);

            const newCount = await incrementTodayUsage(user?.id);
            setUsageCount(newCount);

        } catch (err) {
            console.error('Chatbot handleSend (Gemini):', err.message);

            if (err.isChatLimitError) {
                // The server is the authoritative limit -- this fires when
                // the on-device counter (chatstorage.js) has drifted behind
                // the real count (new device, reinstall, another session).
                // Snap the local counter forward so the UI reflects reality
                // and the "limit reached" state below takes over instead of
                // silently re-hitting the server on every keystroke.
                setUsageCount(plan.dailyChatLimit);
                Alert.alert('Daily chat limit reached', err.message, [{ text: 'OK' }]);
                setActiveSession(updatedSession);
                return;
            }

            const errorResponse = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                text: "Sorry, I couldn't reach AideBot's AI service just now. Please check your connection and try again.",
            };
            const finalMessages = [...updatedMessages, errorResponse];
            const finalSession = { ...updatedSession, messages: finalMessages };
            setActiveSession(finalSession);
            await persistSession(finalSession);
        } finally {
            setIsSending(false);
        }
    };

    // Sidebar actions 

    const handleStartNewChat = () => {
        setActiveSession(newSession());
        setSidebarVisible(false);
    };

    const handleSelectSession = (session) => {
        setActiveSession(session);
        setSidebarVisible(false);
    };

    const handleClearAllChats = () => {
        Alert.alert(
            "Clear All Chats",
            "This permanently deletes every saved AideBot conversation on this device. This can't be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        await clearAllSessions(user?.id);
                        setSessions([]);
                        setActiveSession(newSession());
                        setSidebarVisible(false);
                    },
                },
            ]
        );
    };

    const handleOpenBugReport = () => {
        setSidebarVisible(false);
        setIsBugModalVisible(true);
    };

    const sendEmail = () => {
        const transcript = messages
            .map(m => `${m.type === 'bot' ? 'AideBot' : 'User'}: ${m.text}`)
            .join('\n');

        const body =
            `Issue description:\n${bugReport} \nChat history (${activeSession.title}):\n${transcript}`;

        const url = `mailto:support@aidebot.gmail.com?subject=Bug Report&body=${encodeURIComponent(body)}`;
        Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open email app."));
        setIsBugModalVisible(false);
        setBugReport("");
    };

    const suggestions = [
        { id: "1", text: "What is Anemia?" },
        { id: "2", text: "What are the symptoms of Anemia?" }
    ];

    const canSend = inputText.trim().length > 0 && !isSending && !limitReached;

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>

            <Header
                left={
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back-ios-new" size={HEADER.iconSize} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                }
                center={
                    <View style={styles.titleLayout}>
                        <Text style={styles.title}>AideBot AI</Text>
                        <Text style={styles.subTitle}>Lab Assistant Online</Text>
                    </View>
                }
                right={
                    <View style={styles.headerIconsRight}>
                        <TouchableOpacity onPress={() => setIsInfoVisible(true)}>
                            <MaterialIcons name="info-outline" size={HEADER.iconSize} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
                            <MaterialIcons name="menu" size={HEADER.iconSize} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {/*  Outer Layout System */}
            <KeyboardAvoidingView
                style={styles.mainLayoutBody}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {/* Chat Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListHeaderComponent={() => (
                        <Text style={styles.todayText}>TODAY</Text>
                    )}
                    renderItem={({ item }) => {
                        const isBot = item.type === 'bot';
                        return (
                            <View style={isBot ? styles.botWrapper : styles.userWrapper}>
                                {isBot && (
                                    <View style={styles.avatarCircleBot}>
                                        <MaterialIcons name="person-outline" size={20} color={COLORS.white} />
                                    </View>
                                )}
                                <View style={styles.messageGroup}>
                                    <Text style={isBot ? styles.botName : styles.userName}>
                                        {isBot ? 'AideBot' : displayName}
                                    </Text>
                                    <View style={isBot ? styles.botBubble : styles.userBubble}>
                                        <Text style={isBot ? styles.botText : styles.userText}>
                                            {item.text}
                                        </Text>
                                    </View>
                                </View>
                                {!isBot && (
                                    <View style={styles.avatarCircleUser}>
                                        <MaterialIcons name="person" size={20} color={COLORS.white} />
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    ListFooterComponent={isSending ? (
                        <View style={styles.botWrapper}>
                            <View style={styles.avatarCircleBot}>
                                <MaterialIcons name="person-outline" size={20} color={COLORS.white} />
                            </View>
                            <View style={styles.messageGroup}>
                                <Text style={styles.botName}>AideBot</Text>
                                <View style={styles.botBubble}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            </View>
                        </View>
                    ) : null}
                    contentContainerStyle={styles.flatListContent}
                    style={styles.messageList}
                />

                {/* Inline Interaction Layer, lifted clear of the floating tab bar */}
                <View style={styles.bottomControlsDeck}>
                    {/* Horizontal Suggestion Chips */}
                    {messages.length === 1 && (
                        <View style={styles.suggestionContainer}>
                            <FlatList
                                data={suggestions}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.suggestionScrollContent}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionChip}
                                        onPress={() => handleSend(item.text)}
                                    >
                                        <Text style={styles.suggestionText}>{item.text}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}

                    {/* Input Bar */}
                    <View style={styles.inputLayout}>
                        <View style={styles.inputContainer}>
                            <TouchableOpacity style={styles.iconButton}>
                                <MaterialIcons name="attach-file" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>

                            <TextInput
                                placeholder={limitReached ? "Daily message limit reached" : "Ask AideBot anything..."}
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                onSubmitEditing={() => handleSend()}
                                returnKeyType="send"
                                multiline
                                blurOnSubmit={false}
                                editable={!limitReached}
                            />

                            <TouchableOpacity
                                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                                onPress={() => handleSend()}
                                disabled={!canSend}
                            >
                                <MaterialIcons name="send" size={22} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Disclaimer */}
                    <View style={styles.disclaimerRow}>
                        <MaterialIcons name="info-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.disclaimerText}>
                            AideBot can make mistakes. Please double-check responses.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* History Sidebar */}
            <Modal animationType="fade" transparent visible={sidebarVisible} onRequestClose={() => setSidebarVisible(false)}>
                <View style={styles.sidebarOverlay}>
                    <View style={styles.sidebarPanel}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>Chats</Text>
                            <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                                <MaterialIcons name="close" size={22} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.newChatButton} onPress={handleStartNewChat}>
                            <MaterialIcons name="add" size={18} color={COLORS.primaryDark} />
                            <Text style={styles.newChatButtonText}>New Chat</Text>
                        </TouchableOpacity>

                        <View style={styles.usageBanner}>
                            <Text style={styles.usageBannerLabel}>{plan.label.toUpperCase()} PLAN</Text>
                            <Text style={[styles.usageBannerValue, limitReached && styles.usageBannerValueWarning]}>
                                {usageCount} / {plan.dailyChatLimit} messages used today
                            </Text>
                        </View>

                        <Text style={styles.sidebarSectionLabel}>HISTORY</Text>
                        <FlatList
                            style={styles.sessionList}
                            data={sessions}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.sessionItem,
                                        item.id === activeSession.id && styles.sessionItemActive,
                                    ]}
                                    onPress={() => handleSelectSession(item)}
                                >
                                    <Text style={styles.sessionItemTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={styles.sessionItemDate}>
                                        {formatSessionDate(item.updatedAt)}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <Text style={[styles.sessionItemDate, { paddingHorizontal: 16 }]}>
                                    No saved chats yet.
                                </Text>
                            )}
                        />

                        <View style={styles.sidebarFooter}>
                            <TouchableOpacity style={styles.sidebarFooterItem} onPress={handleOpenBugReport}>
                                <MaterialIcons name="bug-report" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.sidebarFooterText}>Report Bug</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.sidebarFooterItem} onPress={handleClearAllChats}>
                                <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
                                <Text style={[styles.sidebarFooterText, { color: COLORS.danger }]}>
                                    Clear All Chats
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.sidebarDismissArea}
                        activeOpacity={1}
                        onPress={() => setSidebarVisible(false)}
                    />
                </View>
            </Modal>

            {/* Info Modal */}
            <Modal animationType="fade" transparent visible={isInfoVisible} onRequestClose={() => setIsInfoVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>About AideBot AI</Text>
                        <Text style={styles.modalDescription}>AideBot is an AI assistant designed to help interpret lab results. It does not replace clinical judgement —
                            please verify diagnoses, CBC estimates, and treatment guidance with a
                            qualified physician before acting on them.</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsInfoVisible(false)}>
                            <Text style={styles.closeButtonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/*  Bug Report Modal (now includes chat history as context)  */}
            <Modal animationType="slide" transparent visible={isBugModalVisible} onRequestClose={() => setIsBugModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.bugModalContent}>
                        <Text style={styles.modalTitle}>Report a Bug</Text>
                        <Text style={styles.modalDescription}>
                            The current chat ("{activeSession.title}") will be attached automatically
                            so our team has full context.
                        </Text>
                        <TextInput style={styles.bugInput} placeholder="Describe the issue..." placeholderTextColor={COLORS.textMuted} multiline value={bugReport} onChangeText={setBugReport} />
                        <View style={styles.bugButtonContainer}>
                            <TouchableOpacity style={[styles.bugButton, { backgroundColor: COLORS.textMuted }]} onPress={() => setIsBugModalVisible(false)}>
                                <Text style={styles.closeButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bugButton} onPress={sendEmail}>
                                <Text style={styles.closeButtonText}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Chatbot;

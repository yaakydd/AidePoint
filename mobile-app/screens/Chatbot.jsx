import React, { useState, useRef } from "react";
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    FlatList, 
    Modal, 
    Alert, 
    Linking 
} from 'react-native'; 
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../assets/theme"; // Import your theme colors here

const Chatbot = () => {
    const navigation = useNavigation();
    const flatListRef = useRef(null);
    
    // State Management
    const [showMenu, setShowMenu] = useState(false);
    const [isInfoVisible, setIsInfoVisible] = useState(false);
    const [isBugModalVisible, setIsBugModalVisible] = useState(false);
    const [bugReport, setBugReport] = useState("");
    const [inputText, setInputText] = useState("");

    const welcomeMessage = { 
        id: '1', 
        type: 'bot', 
        text: "Hello! I'm AideBot. I can help you interpret blood smear results or provide info on malaria, sickle cell, and anemia. How can I assist you today?" 
    };

    const [messages, setMessages] = useState([welcomeMessage]);

    // Action Handlers
    const handleSend = (textToSend = inputText) => {
        const messageText = typeof textToSend === 'string' ? textToSend : inputText;
        
        if (messageText.trim().length === 0) return;

        const newUserMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: messageText.trim(),
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputText("");

        setTimeout(() => {
            const botResponse = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                text: "...",
            };
            setMessages((prev) => [...prev, botResponse]);
        }, 1000);
    };

    const handleClearChat = () => {
        Alert.alert("Clear Chat", "Reset the conversation?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", onPress: () => { setMessages([welcomeMessage]); setShowMenu(false); } }
        ]);
    };

    const sendEmail = () => {
        const url = `mailto:support@aidebot.com?subject=Bug Report&body=${encodeURIComponent(bugReport)}`;
        Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open email app."));
        setIsBugModalVisible(false);
        setBugReport("");
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Area */}
            <View style={styles.leftHeader}>
                <View style={styles.leftContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.titleLayout}>
                        <Text style={styles.title}>AideBot AI</Text>
                        <Text style={styles.subTitle}>Lab Assistant Online</Text>
                    </View>
                </View>
                <View style={styles.headerIconsRight}>
                    <TouchableOpacity onPress={() => setIsInfoVisible(true)}>
                        <MaterialIcons name="info-outline" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
                        <MaterialIcons 
                            name={showMenu ? "close" : "more-vert"} 
                            size={24} 
                            color={showMenu ? COLORS.primary : COLORS.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Menu */}
            {showMenu && (
                <View style={styles.dropdownMenu}>
                    <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
                        <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
                        <Text style={[styles.menuText, { color: COLORS.danger }]}>Clear Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsBugModalVisible(true); setShowMenu(false); }}>
                        <MaterialIcons name="bug-report" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.menuText}>Report Bug</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Chat Messages */}
            <View style={styles.chatBodyContainer}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
                    ListHeaderComponent={() => <Text style={styles.todayText}>TODAY</Text>}
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
                                    <Text style={isBot ? styles.botName : styles.userName}>{isBot ? 'AideBot' : 'Lab Technician'}</Text>
                                    <View style={isBot ? styles.botBubble : styles.userBubble}>
                                        <Text style={isBot ? styles.botText : styles.userText}>{item.text}</Text>
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
                    contentContainerStyle={styles.flatListContent}
                />
            </View>

            {/* Suggestions */}
            {messages.length === 1 && (
                <View style={styles.suggestionContainer}>
                    <TouchableOpacity 
                        style={styles.suggestionChip} 
                        onPress={() => handleSend("Explain Sickle Cell findings")}
                    >
                        <Text style={styles.suggestionText}>Explain Sickle Cell findings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.suggestionChip} 
                        onPress={() => handleSend("Treatment guidelines")}
                    >
                        <Text style={styles.suggestionText}>Treatment guidelines</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Bar */}
            <View style={styles.inputLayout}>
                <TouchableOpacity>
                    <MaterialIcons name="attach-file" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TextInput
                    placeholder="Ask AideBot anything..."
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => handleSend()}
                />
                <TouchableOpacity 
                    style={[styles.sendButton, { opacity: inputText.trim().length > 0 ? 1 : 0.5 }]} 
                    onPress={() => handleSend()}
                    disabled={inputText.trim().length === 0}
                >
                    <MaterialIcons name="send" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <Modal animationType="fade" transparent visible={isInfoVisible} onRequestClose={() => setIsInfoVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>About AideBot AI</Text>
                        <Text style={styles.modalDescription}>
                            AideBot is an AI assistant designed to help interpret lab results.
                        </Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsInfoVisible(false)}>
                            <Text style={styles.closeButtonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal animationType="slide" transparent visible={isBugModalVisible} onRequestClose={() => setIsBugModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.bugModalContent}>
                        <Text style={styles.modalTitle}>Report a Bug</Text>
                        <TextInput
                            style={styles.bugInput}
                            placeholder="Describe the issue..."
                            multiline
                            value={bugReport}
                            onChangeText={setBugReport}
                        />
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
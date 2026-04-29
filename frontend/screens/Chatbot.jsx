import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal } from 'react-native'; 
import { useNavigation } from '@react-navigation/native';
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";

const Chatbot = () => {

    const navigation = useNavigation();

    const [messages, setMessages] = useState([
        { 
            id: '1', 
            type: 'bot', 
            text: "Hello! I'm AideBot. I can help you interpret blood smear results or provide info on malaria, sickle cell, and anemia. How can I assist you today?" 
        },
    ]);

    const [isInfoVisible, setIsInfoVisible] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Area */}
            <View style={styles.leftHeader}>
                <View style={styles.leftContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialIcons name="arrow-back" size={28} color="#00BCD4" />
                    </TouchableOpacity>
                    <View style={styles.titleLayout}>
                        <Text style={styles.title}>AideBot AI</Text>
                        <Text style={styles.subTitle}>Lab Assistant Online</Text>
                    </View>
                </View>
                <View style={styles.headerIconsRight}>
                    <TouchableOpacity onPress={() => setIsInfoVisible(true)}>
                        <MaterialIcons name="info-outline" size={24} color="#4A5568" />
                    </TouchableOpacity>
                    <MaterialIcons name="more-vert" size={24} color="#4A5568" />
                </View>
            </View>

            {/* Chat Body Section */}
            <View style={styles.chatBodyContainer}>
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={() => (
                        <Text style={styles.todayText}>TODAY</Text>
                    )}
                    renderItem={({ item }) => {
                        const isBot = item.type === 'bot';
                        return (
                            <View style={isBot ? styles.botWrapper : styles.userWrapper}>
                                {isBot && (
                                    <View style={styles.avatarCircleBot}>
                                        <MaterialIcons name="person-outline" size={20} color="#FFF" /> 
                                    </View>
                                )}

                                {/* Fix: Vertical stack for Name + Bubble */}
                                <View style={styles.messageGroup}>
                                    <Text style={isBot ? styles.botName : styles.userName}>
                                        {isBot ? 'AideBot' : 'Lab Technician'}
                                    </Text>
                                    <View style={isBot ? styles.botBubble : styles.userBubble}>
                                        <Text style={isBot ? styles.botText : styles.userText}>
                                            {item.text}
                                        </Text>
                                    </View>
                                </View>

                                {!isBot && (
                                    <View style={styles.avatarCircleUser}>
                                        <MaterialIcons name="person" size={20} color="#FFF" />
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.flatListContent}
                />
            </View>

            {/* Suggestion Chips */}
            <View style={styles.suggestionContainer}>
                <TouchableOpacity style={styles.suggestionChip}>
                    <Text style={styles.suggestionText}>Explain Sickle Cell findings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionChip}>
                    <Text style={styles.suggestionText}>Treatment guidelines</Text>
                </TouchableOpacity>
            </View>

            {/* Input Bar */}
            <View style={styles.inputLayout}>
                <MaterialIcons name="attach-file" size={22} color="#94A3B8" />
                <TextInput
                    placeholder="Ask AideBot anything..."
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                />
                <TouchableOpacity style={styles.sendButton}>
                    <MaterialIcons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            <Modal
  animationType="fade"
  transparent={true}
  visible={isInfoVisible}
  onRequestClose={() => setIsInfoVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>About AideBot AI</Text>
      <Text style={styles.modalDescription}>
        AideBot is an AI assistant designed to help interpret lab results. 
        It is not a substitute for professional medical advice, diagnosis, or treatment.
      </Text>
      
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => setIsInfoVisible(false)}
      >
        <Text style={styles.closeButtonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


        </SafeAreaView>
    );
};

export default Chatbot;
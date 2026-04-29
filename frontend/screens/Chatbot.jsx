import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity } from 'react-native'; 
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";

const Chatbot = () => {
    return(
        <SafeAreaView style={styles.container}>
            {/* Header and the Left SIde Group */}
            <View style={styles.leftHeader}>
                <View style={styles.leftContent}>
                    <MaterialIcons name="arrow-back" size={24} color="#00BCD4" />
                    <View style={styles.titleLayout}>
                        <Text style={styles.title}>AideBot AI</Text>
                        <Text style={styles.subTitle}>Lab Assistant Online</Text>
                    </View>
                </View>

                {/* Right Side Group */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="info-outline" size={24} color="#4A5568" style={{ marginRight: 15 }} />
                    <MaterialIcons name="more-vert" size={24} color="#4A5568" />
                </View>
                
            </View>

             {/* Chat Body (Middle) */}
            <View style={{ flex: 1 }}>
            </View>

            {/* Input Layout (Bottom) */}
            <View style={styles.inputLayout}>
                <MaterialIcons name="attach-file" size={22} color="#94A3B8" />
                <TextInput
                placeholder="Ask Aidebot ..."
                placeholderTextColor="#94A3B8"
                style={styles.input}
                ></TextInput>

                <TouchableOpacity style={styles.sendButton}>
                    <MaterialIcons name="send" size={25} color="#FFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default Chatbot;
import React from "react";
// ADDED 'Text' below
import { SafeAreaView, View, Text } from 'react-native'; 
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";

const Chatbot = () => {
    return(
        <SafeAreaView style={styles.container}>
            {/* Header Parent */}
            <View style={styles.leftHeader}>
                
                {/* Left Side Group */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                {/* We will put the FlatList here next */}
            </View>

            {/* Input Layout (Bottom) */}
            <View>
                {/* We will build the input bar here */}
            </View>
        </SafeAreaView>
    );
};

export default Chatbot;
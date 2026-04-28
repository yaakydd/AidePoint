import React from "react";
import { SafeAreaView, View} from 'react-native';
import { ChatStyles as styles } from "../styles/ChatStyles";
import { MaterialIcons } from "@expo/vector-icons";

const Chatbot = () => {

    return(
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.leftHeader}>
                <MaterialIcons name="back-arrow" size={20} color="#94A3B8" />
                <View style={styles.titleLayout}>
                    <Text style={styles.title}>AideBot AI</Text>
                    <Text style={styles.subTitle}>Lab Assistant Online</Text>
                </View>
            </View>

             {/* Chat Body */}
            <View>

            </View>

            {/* Input Layout  */}
            <View>

            </View>
        </SafeAreaView>
    );
};

export default Chatbot;
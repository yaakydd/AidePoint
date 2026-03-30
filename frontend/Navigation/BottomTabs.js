import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';

import ReportScreen from '../screens/ReportScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import BadgesScreen from '../screens/BadgesScreen';

const Tab = createBottomTabNavigator();

// Custom Tab Bar
function MyTabBar({ state, descriptors, navigation }) {
  return (
    <View style={{ flexDirection: 'row', height: 60, borderTopWidth: 0.5, borderTopColor: '#ccc' }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => navigation.navigate(route.name);

        const iconName = (() => {
          switch (route.name) {
            case 'Home': return isFocused ? 'home' : 'home-outline';
            case 'Scan': return isFocused ? 'scan' : 'scan-outline';
            case 'Report': return isFocused ? 'document-text' : 'document-text-outline';
            case 'Chatbot': return isFocused ? 'chatbubble' : 'chatbubble-outline';
            case 'Badges': return isFocused ? 'ribbon' : 'ribbon-outline';
          }
        })();

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {isFocused && <View style={{ height: 3, width: '100%', backgroundColor: '#007AFF', position: 'absolute', top: 0 }} />}
            <Ionicons name={iconName} size={24} color={isFocused ? '#007AFF' : '#8e8e93'} />
            <Text style={{ color: isFocused ? '#007AFF' : '#8e8e93', fontSize: 12 }}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator tabBar={props => <MyTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Scan" component={ScanStack} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} />
      <Tab.Screen name="Badges" component={BadgesScreen} />
    </Tab.Navigator>
  );
}
import { StyleSheet } from "react-native";

export const ChatStyles = StyleSheet.create({
        container : {
            flex : 1,
            boxSizing: 'border-box',
        },
        leftHeader : {
            flexDirection : 'row',
            alignItems : 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 15,
            height: 60,
            backgroundColor : 'white',
        },
        leftContent : {
            flexDirection: 'row',
            alignItems: 'center', 
            
        },
        titleLayout : {
            marginLeft : 40,
            
        },
        title : {
            fontSize : 18,
            fontWeight : 'bold',
            alignItems : 'center',
        },
        subTitle : {
            color: '#00BCD4',
            fontSize : 13,
            fontWeight : '500',
        },
        inputLayout: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF', // The whole bar should be white
            borderRadius: 15,
            borderColor: '#E2E8F0',
            paddingHorizontal: 10,     // Room for the icons
            paddingVertical: 8,
            margin: 10,                // Space from screen edges
        },
        input: {
            flex: 1,                   // Stretches to fill the middle
            height: 45,
            fontSize: 17,   
            color: '#334155',
            paddingHorizontal: 15,     // Space between text and icons
        },
        sendButton: {
            backgroundColor: '#00BCD4', // Teal color
            width: 45,
            height: 45,
            borderRadius: 10,          
            justifyContent: 'center',
            alignItems: 'center',
        },
});
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
        inputLayout : {
            flexDirection : 'row',
            alignItems : 'center',
            borderRadius : 25,
        },
});
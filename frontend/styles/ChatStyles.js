import { StyleSheet } from "react-native";

export const ChatStyles = StyleSheet.create({
        container : {
            flex : 1,
        },
        leftHeader : {
            flexDirection : 'row',
            alignItems : 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 15,
            height: 60,
            backgroundColor : 'white',
        },
        titleLayout : {
            marginLeft : 15,
        },
        title : {
            fontSize : 16,
            fontWeight : 'bold',
        },
        subTitle : {
            color: '#00BCD4',
            fontSize : 12,
        },
});
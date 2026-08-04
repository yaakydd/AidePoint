import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import SplashScreen from "../screens/SplashScreen";
import ConsentScreen from "../screens/ConsentScreen";

import AuthNavigator from "./AuthNavigator";
import MainAppNavigator from "./MainAppNavigator";

import SubscriptionScreen from "../screens/SubscriptionScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ForgotPassword from "../auth/ForgotPassword";
import HelpCenterScreen from "../screens/HelpCenter";
import PrivacyPolicyScreen from "../screens/PrivacyPolicy";
// import LanguageScreen from "../screens/LanguageScreen";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {

    const { authState } = useAuth();
    console.log("AUTH STATE:", authState);

    if(authState === "BOOTING")
        return <SplashScreen />;

    return (

        <Stack.Navigator
            screenOptions={{ headerShown:false }}
        >

            {authState === "AUTH" && (

                <Stack.Screen
                    name="Auth"
                    component={AuthNavigator}
                />

            )}

            {authState === "CONSENT" && (
                <>
                    <Stack.Screen
                    name="Consent"
                    component={ConsentScreen}
                    />
                    <Stack.Screen
                        name="Subscription"
                        component={SubscriptionScreen}
                    />
                </>
            )}

            {authState === "APP" && (
                <>
                    <Stack.Screen
                        name="Main"
                        component={MainAppNavigator}
                    />
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                    />
                    <Stack.Screen
                        name="Subscription"
                        component={SubscriptionScreen}
                    />
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPassword}
                    />
                    {<Stack.Screen
                        name="HelpCenter"
                        component={HelpCenterScreen}
                    /> }

                    {<Stack.Screen
                        name="PrivacyPolicy"
                        component={PrivacyPolicyScreen}
                    /> }
                </>

            )}
        </Stack.Navigator>
    );

}
export default RootNavigator;

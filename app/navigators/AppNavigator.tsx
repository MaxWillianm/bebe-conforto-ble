import { Text } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsNavigator from "./SettingsNavigator";
import Home from "../routes/Home";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

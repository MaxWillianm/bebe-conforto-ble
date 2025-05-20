import { Text } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Settings from "../routes/Settings";

const Stack = createNativeStackNavigator();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={
          {
            // headerShown: false,
          }
        }
      />
    </Stack.Navigator>
  );
}

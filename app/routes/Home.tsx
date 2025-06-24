import React, { useEffect, useState } from "react";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Vibration,
} from "react-native";
import { useBle } from "../Contexts/BleContext";
import {
  Card,
  Button,
  ActivityIndicator,
  useTheme,
  ProgressBar,
} from "react-native-paper";

export default function Home() {
  const {
    isConnected,
    rssi,
    connectedDevice,
    reconnectLastDevice,
    pauseRssi,
    resumeRssi,
    isMonitoring,
  } = useBle();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const getDistanceFromRSSI = (rssi: number): string => {
    if (rssi >= -50) return "Muito próximo (0–1m)";
    if (rssi >= -70) return "Próximo (1–5m)";
    if (rssi >= -80) return "Distância média (5–10m)";
    if (rssi >= -90) return "Distante (10–20m)";
    return "Muito distante (+20m ou obstruções)";
  };

  // Normaliza o valor do RSSI para um valor entre 0 e 1 para o ProgressBar
  const getProgressFromRSSI = (rssi: number): number => {
    // Considerando -100 (muito distante) até -40 (muito próximo)
    const min = -100;
    const max = -40;
    let progress = (rssi - min) / (max - min);
    progress = Math.max(0, Math.min(1, progress));
    return progress;
  };

  useEffect(() => {
    if (rssi !== null) {
      const progress = getProgressFromRSSI(rssi);
      console.log("progress -> ", progress);
      if (progress <= 0.3) {
        Vibration.vibrate(1000);
      }
    }
  }, [rssi]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reconnectLastDevice();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card
        style={[
          styles.card,
          { backgroundColor: isConnected ? "#4CAF50" : "#F44336" },
        ]}
      >
        <Card.Title
          title={isConnected ? `Conectado` : "Não conectado"}
          titleStyle={styles.title}
        />
        <Card.Actions>
          {!isConnected && (
            <Button
              mode="contained-tonal"
              onPress={onRefresh}
              disabled={refreshing}
            >
              Reconectar
            </Button>
          )}
          <Button
            mode="contained-tonal"
            onPress={isMonitoring ? pauseRssi : resumeRssi}
            style={{ marginLeft: 8 }}
          >
            {isMonitoring ? "Standby" : "Retomar"}
          </Button>
        </Card.Actions>
      </Card>

      {rssi !== null && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.paragraph}>
              Estimativa de distância: {getDistanceFromRSSI(rssi)}
            </Text>
            <View style={{ marginTop: 16 }}>
              <ProgressBar
                progress={getProgressFromRSSI(rssi)}
                color={theme.colors.primary}
                style={{ height: 12, borderRadius: 6 }}
              />
              <Text style={styles.progressLabel}>
                {getProgressFromRSSI(rssi) >= 0.8
                  ? "Muito próximo"
                  : getProgressFromRSSI(rssi) >= 0.6
                    ? "Próximo"
                    : getProgressFromRSSI(rssi) >= 0.4
                      ? "Médio"
                      : getProgressFromRSSI(rssi) >= 0.2
                        ? "Distante"
                        : "Muito distante"}
              </Text>
            </View>
            <Text style={{ marginTop: 12 }}>Potencia do sinal: {rssi}</Text>
          </Card.Content>
        </Card>
      )}

      {refreshing && (
        <ActivityIndicator
          animating={true}
          style={styles.activityIndicator}
          size="large"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fdfdfd",
  },
  card: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
  },
  paragraph: {
    marginTop: 8,
    fontSize: 16,
    height: 40,
  },
  activityIndicator: {
    marginTop: 24,
  },
  progressLabel: {
    marginTop: 4,
    fontSize: 14,
    textAlign: "center",
    color: "#555",
  },
});

import React, { useState } from "react";
import {
  Text,
  View,
  Button,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { useBle } from "../Contexts/BleContext";
import { BleManager } from "react-native-ble-plx";

export default function Settings() {
  const { connectedDevice, isConnected, connectToDevice, disconnectDevice } =
    useBle();

  const [devicesList, setDevicesList] = useState<
    { id: string; name: string | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState<string | null>(null);

  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  const scanDevices = async () => {
    setDevicesList([]);
    let devices: { id: string; name: string | null }[] = [];
    setIsLoading(true);

    const manager = new BleManager();

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert("Atenção", `${error.message}`);
        return;
      }
      if (device && device.name) {
        if (!devices.find((d) => d.id === device.id)) {
          devices.push({ id: device.id, name: device.name });
          setDevicesList([...devices]);
          console.log("Dispositivo encontrado:", device.name, device.id);
        }
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsLoading(false);
      console.log("Parando o scan");
    }, 5000);
  };

  const handleConnect = async (id: string) => {
    try {
      const device = await connectToDevice(id);
      if (device) {
        setDevicesList([]);
        listenNotifications(device); // escuta após conectar
      }
    } catch (error) {
      console.error("Erro ao conectar:", error);
    }
  };

  const listenNotifications = (device: Device) => {
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("Erro ao monitorar:", error);
          return;
        }
        if (characteristic?.value) {
          const decoded = Buffer.from(characteristic.value, "base64").toString(
            "utf-8"
          );
          console.log("Recebido do ESP32:", decoded);
          setReceivedMessage(decoded);
        }
      }
    );
  };

  const handleSendMessage = async () => {
    if (!connectedDevice) return;

    try {
      const message = "Mensagem de teste 2";
      const base64 = Buffer.from(message).toString("base64");

      await connectedDevice.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64
      );

      console.log("Mensagem enviada:", message);
    } catch (error) {
      console.error("Erro ao enviar:", error);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1, rowGap: 8 }}>
      <Button title="Escanear Dispositivos" onPress={scanDevices} />
      <Button title="Limpar lista" onPress={() => setDevicesList([])} />
      {isLoading && <ActivityIndicator />}
      <FlatList
        data={devicesList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text>{item.name}</Text>
            <Button title="Conectar" onPress={() => handleConnect(item.id)} />
          </View>
        )}
      />
      {isConnected && connectedDevice && (
        <View
          style={{
            padding: 20,
            backgroundColor: "silver",
          }}
        >
          <Text style={{ marginBottom: 24 }}>
            <Text style={{ fontWeight: "bold" }}>Conectado a: </Text>
            {connectedDevice?.name}
          </Text>
          <View style={{ rowGap: 12 }}>
            <Button
              title="Enviar mensagem de teste"
              onPress={handleSendMessage}
            />
            <Button title="Desconectar" onPress={disconnectDevice} />
          </View>
          {receivedMessage && (
            <Text style={{ marginTop: 16 }}>Recebido: {receivedMessage}</Text>
          )}
        </View>
      )}
    </View>
  );
}

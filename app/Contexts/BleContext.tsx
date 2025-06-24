// src/contexts/BleContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { BleManager, Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Vibration } from "react-native";
import { Buffer } from "buffer";
const myDeviceId = "FC:B4:67:51:4A:7A";

type BleContextType = {
  connectedDevice: Device | null;
  isConnected: boolean;
  rssi: number | null;
  connectToDevice: (deviceId: string) => Promise<Device | null>;
  disconnectDevice: () => Promise<void>;
  reconnectLastDevice: () => Promise<void>;
  verifyStatusBlePoweredOn: () => Promise<boolean>;
  pauseRssi: () => void;
  resumeRssi: () => void;
  isMonitoring: boolean;
  messages: string[];
  disconnectAlert: boolean;
  clearMessages: () => void;
};

const BleContext = createContext<BleContextType>({} as BleContextType);

const manager = new BleManager();
const LAST_DEVICE_ID_KEY = "LAST_CONNECTED_DEVICE_ID";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rssi, setRssi] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [messages, setMessages] = useState<string[]>([]);
  const [disconnectAlert, setDisconnectAlert] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const listenNotifications = useCallback((device: Device) => {
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
            "utf-8",
          );
          setMessages((prev) => [...prev, decoded]);
        }
      },
    );
  }, []);

  const startRssiLoop = useCallback(
    (device: Device) => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(async () => {
        try {
          const stillConnected = await manager.isDeviceConnected(device.id);

          if (!stillConnected) {
            Alert.alert("Desconectado", "O dispositivo foi desconectado.", [
              { text: "OK" },
            ]);
            Vibration.vibrate();
            setDisconnectAlert(true);
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setConnectedDevice(null);
            setIsConnected(false);
            setRssi(null);
            await AsyncStorage.removeItem(LAST_DEVICE_ID_KEY);
            return;
          }

          if (isMonitoring) {
            const updated = await device.readRSSI();
            if (updated?.rssi != null) {
              setRssi(updated.rssi);
            }
          }
        } catch (error) {
          console.error("Erro ao ler RSSI:", error);
        }
      }, 1000);
    },
    [isMonitoring],
  );

  const connectToDevice = useCallback(
    async (deviceId: string): Promise<Device | null> => {
      try {
        const device = await manager.connectToDevice(deviceId);
        await device.discoverAllServicesAndCharacteristics();
        setConnectedDevice(device);
        setIsConnected(true);
        setDisconnectAlert(false);
        await AsyncStorage.setItem(LAST_DEVICE_ID_KEY, deviceId);
        listenNotifications(device);
        if (isMonitoring) {
          startRssiLoop(device);
        }
        return device;
      } catch (error) {
        Alert.alert(
          "Erro ao conectar",
          "Não foi possível conectar ao dispositivo. Verifique se ele está ligado e próximo.",
          [{ text: "OK" }],
        );

        setConnectedDevice(null);
        setIsConnected(false);
        return null;
      }
    },
    [startRssiLoop, isMonitoring],
  );

  const disconnectDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await manager.cancelDeviceConnection(connectedDevice.id);
      } catch (e) {
        console.warn("Erro ao desconectar:", e);
      }
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    await AsyncStorage.removeItem(LAST_DEVICE_ID_KEY);
    setConnectedDevice(null);
    setIsConnected(false);
    setRssi(null);
  }, [connectedDevice]);

  const reconnectLastDevice = useCallback(async () => {
    const lastId = await AsyncStorage.getItem(LAST_DEVICE_ID_KEY);
    console.log("Último ID do dispositivo:", lastId);
    await connectToDevice(lastId ?? myDeviceId);
  }, [connectToDevice]);

  const pauseRssi = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    setRssi(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const resumeRssi = useCallback(() => {
    setIsMonitoring(true);
    if (connectedDevice) {
      startRssiLoop(connectedDevice);
    }
  }, [connectedDevice, startRssiLoop]);

  const verifyStatusBlePoweredOn = useCallback(async (): Promise<boolean> => {
    const state = await manager.state();

    if (state === "PoweredOn") {
      console.log("Bluetooth ligado");
      return true;
    }

    console.log("Bluetooth desligado");
    Alert.alert("Bluetooth Desligado", "Ative o Bluetooth para continuar.", [
      { text: "OK" },
    ]);
    return false;
  }, []);

  useEffect(() => {
    reconnectLastDevice();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <BleContext.Provider
      value={{
        connectedDevice,
        isConnected,
        rssi,
        connectToDevice,
        disconnectDevice,
        reconnectLastDevice,
        verifyStatusBlePoweredOn,
        pauseRssi,
        resumeRssi,
        isMonitoring,
        messages,
        disconnectAlert,
        clearMessages,
      }}
    >
      {children}
    </BleContext.Provider>
  );
};

export const useBle = () => useContext(BleContext);

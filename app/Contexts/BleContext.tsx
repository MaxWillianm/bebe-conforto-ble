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
import { Alert } from "react-native";
const myDeviceId = "FC:B4:67:51:4A:7A";

type BleContextType = {
  connectedDevice: Device | null;
  isConnected: boolean;
  rssi: number | null;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  reconnectLastDevice: () => Promise<void>;
  verifyStatusBlePoweredOn: () => void;
};

const BleContext = createContext<BleContextType>({} as BleContextType);

const manager = new BleManager();
const LAST_DEVICE_ID_KEY = "LAST_CONNECTED_DEVICE_ID";

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rssi, setRssi] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRssiLoop = useCallback((device: Device) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const stillConnected = await manager.isDeviceConnected(device.id);

        if (!stillConnected) {
          Alert.alert("Desconectado", "O dispositivo foi desconectado.", [
            { text: "OK" },
          ]);
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setConnectedDevice(null);
          setIsConnected(false);
          setRssi(null);
          await AsyncStorage.removeItem(LAST_DEVICE_ID_KEY);
          return;
        }

        const updated = await device.readRSSI();
        if (updated?.rssi != null) {
          setRssi(updated.rssi);
        }
      } catch (error) {
        console.error("Erro ao ler RSSI:", error);
      }
    }, 1000);
  }, []);

  const connectToDevice = useCallback(
    async (deviceId: string) => {
      try {
        const device = await manager.connectToDevice(deviceId);
        await device.discoverAllServicesAndCharacteristics();
        setConnectedDevice(device);
        setIsConnected(true);
        await AsyncStorage.setItem(LAST_DEVICE_ID_KEY, deviceId);
        startRssiLoop(device);
      } catch (error) {
        Alert.alert(
          "Erro ao conectar",
          "Não foi possível conectar ao dispositivo. Verifique se ele está ligado e próximo.",
          [{ text: "OK" }]
        );

        setConnectedDevice(null);
        setIsConnected(false);
      }
    },
    [startRssiLoop]
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

  const verifyStatusBlePoweredOn = useCallback(() => {
    const [isPoweredOn, setIsPoweredOn] = useState(false);

    manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        console.log("Bluetooth ligado");
        setIsPoweredOn(true);
        manager.stopDeviceScan();
      } else {
        console.log("Bluetooth desligado");
        setIsPoweredOn(false);
        Alert.alert(
          "Bluetooth Desligado",
          "Ative o Bluetooth para continuar.",
          [{ text: "OK" }]
        );
      }
    }, true);
    if (!isPoweredOn) {
      return false;
    } else true;
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
      }}
    >
      {children}
    </BleContext.Provider>
  );
};

export const useBle = () => useContext(BleContext);

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiBaseUrl;

// const defaultDevBaseUrl =
//   Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000'

// const baseURL =
//   configuredApiBaseUrl ||
//   (__DEV__ ? defaultDevBaseUrl : 'https://sweetcasa-production.up.railway.app')

const baseURL = "http://192.168.40.203:3000";
const api = axios.create({ baseURL });

// Automatically attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "role", "profile"]);
    }
    return Promise.reject(error);
  },
);

export default api;

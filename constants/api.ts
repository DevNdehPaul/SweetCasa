import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://sweetcasa.bonto.run';

const api = axios.create({
  baseURL: BASE_URL,
})

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

// Use this for multipart/form-data uploads (file uploads)
// Axios on React Native doesn't handle FormData+files correctly,
// so we use fetch directly which works natively.
export async function uploadWithFetch(path: string, formData: FormData): Promise<any> {
  const token = await AsyncStorage.getItem("token");

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw { response: { data, status: response.status } };
  }

  return data;
}

export default api;
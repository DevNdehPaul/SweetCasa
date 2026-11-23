import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

export const BASE_URL = 'https://sweetcasa-production-4232.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
});

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
export async function uploadWithFetch(
  path: string,
  formData: FormData,
  method: "POST" | "PUT" = "POST",
): Promise<any> {
  const token = await AsyncStorage.getItem("token");

  let data: any = {};
  let ok = false;
  let status = 0;

  if (Platform.OS === "web") {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    data = await response.json();
    ok = response.ok;
    status = response.status;
  } else {
    // iPhone/Android: use XMLHttpRequest. Newer Expo builds swap the global fetch() for one that
    // rejects React Native file parts ("Unsupported FormDataPart implementation"); XHR always works.
    // Do NOT set Content-Type — the boundary is added automatically.
    const result = await new Promise<{ ok: boolean; status: number; data: any }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, `${BASE_URL}${path}`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 120000;
      xhr.onload = () => {
        let body: any = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON body */ }
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data: body });
      };
      xhr.onerror = () => reject(new Error("Network request failed"));
      xhr.ontimeout = () => reject(new Error("The upload took too long"));
      xhr.send(formData as any);
    });
    data = result.data;
    ok = result.ok;
    status = result.status;
  }

  if (!ok) {
    throw { response: { data, status } };
  }

  // Wrap in the same { data } shape axios responses use, so callers can
  // handle uploadWithFetch(...) and api.put(...)/api.post(...) results
  // identically (e.g. `res.data?.profile || res.data`).
  return { data };
}

export default api;
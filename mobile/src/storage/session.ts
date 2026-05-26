import * as SecureStore from "expo-secure-store";

const tokenKey = "leadsy_mobile_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(tokenKey);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(tokenKey, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(tokenKey);
}

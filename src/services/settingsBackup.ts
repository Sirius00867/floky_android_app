import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Backup de configuración cifrado.
// En iOS/Android: guardado en documentDirectory (incluido en iCloud / Google Backup automático).
// Sobrevive actualizaciones de app; sobrevive reinstalaciones si el usuario tiene backup de nube activo.

const BACKUP_FILENAME = 'floky-config.enc';
const APP_SALT = 'Floky-DislexicApp-2024-Backup-v1';

async function deriveKey(): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, APP_SALT);
}

function xorEncode(text: string, key: string): string {
  const keyArr = Array.from(key);
  return Array.from(text)
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ keyArr[i % keyArr.length].charCodeAt(0)))
    .join('');
}

function getBackupFile(): File {
  return new File(Paths.document, BACKUP_FILENAME);
}

export async function saveSettingsBackup(settings: Record<string, unknown>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const key = await deriveKey();
    const payload = JSON.stringify({ v: 1, ts: Date.now(), settings });
    // btoa/atob son globales en React Native (Hermes)
    const encrypted = btoa(unescape(encodeURIComponent(xorEncode(payload, key))));
    const file = getBackupFile();
    file.write(encrypted);
  } catch { /* best-effort — no bloquea la UI */ }
}

export async function loadSettingsBackup(): Promise<Record<string, unknown> | null> {
  if (Platform.OS === 'web') return null;
  try {
    const file = getBackupFile();
    if (!file.exists) return null;
    const encrypted = await file.text();
    const key = await deriveKey();
    const decoded = decodeURIComponent(escape(xorEncode(atob(encrypted), key)));
    const parsed = JSON.parse(decoded);
    if (parsed?.v !== 1 || !parsed.settings) return null;
    return parsed.settings as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function backupFileExists(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return getBackupFile().exists;
  } catch {
    return false;
  }
}

export async function deleteSettingsBackup(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const file = getBackupFile();
    if (file.exists) file.delete();
  } catch { /* best-effort */ }
}

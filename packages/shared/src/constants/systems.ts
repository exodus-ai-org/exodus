// Plaintext HTTP, bound to loopback only: the renderer, exodus-cli, the API
// tests and the iOS Simulator. Nothing on the LAN can reach it.
export const SERVER_PORT = 60223

// HTTPS, behind a per-device token, and only up while a device is paired or a
// pairing window is open (src/main/lib/lan/). exodus-ios on a device connects
// here. Changing either port means updating every client.
export const LAN_SERVER_PORT = 60224

// How long a pairing window (and the QR code on Settings → Devices) stays
// open. The main process enforces it; the renderer only draws the countdown.
export const PAIRING_TTL_MS = 120_000

export const BASE_URL = `http://localhost:${SERVER_PORT}`

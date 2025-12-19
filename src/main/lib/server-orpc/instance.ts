export interface Server {
  close(callback?: (err?: Error) => void): void
  start(): void
}

let server: Server | null = null

export function getServer(): Server | null {
  return server
}

export function setServer(newServer: Server) {
  server = newServer
}

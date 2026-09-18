export const STATION_NAME_KEY = 'psyc_station_name'
export const DEFAULT_STATION_NAME = '河南大学基础医学院心理站'

export function loadStationName(): string {
  try {
    return localStorage.getItem(STATION_NAME_KEY) || DEFAULT_STATION_NAME
  } catch {
    return DEFAULT_STATION_NAME
  }
}

export function saveStationName(name: string) {
  try { localStorage.setItem(STATION_NAME_KEY, name) } catch {}
}

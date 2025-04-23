export interface WeatherAPIResponse {
  current_condition: CurrentCondition[]
  nearest_area: NearestArea[]
  request: Request[]
  weather: Weather[]
}

export interface CurrentCondition {
  FeelsLikeC: string
  FeelsLikeF: string
  cloudcover: string
  humidity: string
  localObsDateTime: string
  observation_time: string
  precipInches: string
  precipMM: string
  pressure: string
  pressureInches: string
  temp_C: string
  temp_F: string
  uvIndex: string
  visibility: string
  visibilityMiles: string
  weatherCode: string
  weatherDesc: Value[]
  weatherIconUrl: Value[]
  winddir16Point: string
  winddirDegree: string
  windspeedKmph: string
  windspeedMiles: string
}

export interface NearestArea {
  areaName: Value[]
  country: Value[]
  latitude: string
  longitude: string
  population: string
  region: Value[]
  weatherUrl: Value[]
}

export interface Value {
  value: string
}

export interface Request {
  query: string
  type: string
}

export interface Weather {
  astronomy: Astronomy[]
  avgtempC: string
  avgtempF: string
  date: string
  hourly: Hourly[]
  maxtempC: string
  maxtempF: string
  mintempC: string
  mintempF: string
  sunHour: string
  totalSnow_cm: string
  uvIndex: string
}

export interface Astronomy {
  moon_illumination: string
  moon_phase: string
  moonrise: string
  moonset: string
  sunrise: string
  sunset: string
}

export interface Hourly {
  DewPointC: string
  DewPointF: string
  FeelsLikeC: string
  FeelsLikeF: string
  HeatIndexC: string
  HeatIndexF: string
  WindChillC: string
  WindChillF: string
  WindGustKmph: string
  WindGustMiles: string
  chanceoffog: string
  chanceoffrost: string
  chanceofhightemp: string
  chanceofovercast: string
  chanceofrain: string
  chanceofremdry: string
  chanceofsnow: string
  chanceofsunshine: string
  chanceofthunder: string
  chanceofwindy: string
  cloudcover: string
  diffRad: string
  humidity: string
  precipInches: string
  precipMM: string
  pressure: string
  pressureInches: string
  shortRad: string
  tempC: string
  tempF: string
  time: string
  uvIndex: string
  visibility: string
  visibilityMiles: string
  weatherCode: string
  weatherDesc: Value[]
  weatherIconUrl: Value[]
  winddir16Point: string
  winddirDegree: string
  windspeedKmph: string
  windspeedMiles: string
}

export const WWO_CODE = {
  '113': 'Sunny',
  '116': 'PartlyCloudy',
  '119': 'Cloudy',
  '122': 'VeryCloudy',
  '143': 'Fog',
  '176': 'LightShowers',
  '179': 'LightSleetShowers',
  '182': 'LightSleet',
  '185': 'LightSleet',
  '200': 'ThunderyShowers',
  '227': 'LightSnow',
  '230': 'HeavySnow',
  '248': 'Fog',
  '260': 'Fog',
  '263': 'LightShowers',
  '266': 'LightRain',
  '281': 'LightSleet',
  '284': 'LightSleet',
  '293': 'LightRain',
  '296': 'LightRain',
  '299': 'HeavyShowers',
  '302': 'HeavyRain',
  '305': 'HeavyShowers',
  '308': 'HeavyRain',
  '311': 'LightSleet',
  '314': 'LightSleet',
  '317': 'LightSleet',
  '320': 'LightSnow',
  '323': 'LightSnowShowers',
  '326': 'LightSnowShowers',
  '329': 'HeavySnow',
  '332': 'HeavySnow',
  '335': 'HeavySnowShowers',
  '338': 'HeavySnow',
  '350': 'LightSleet',
  '353': 'LightShowers',
  '356': 'HeavyShowers',
  '359': 'HeavyRain',
  '362': 'LightSleetShowers',
  '365': 'LightSleetShowers',
  '368': 'LightSnowShowers',
  '371': 'HeavySnowShowers',
  '374': 'LightSleetShowers',
  '377': 'LightSleet',
  '386': 'ThunderyShowers',
  '389': 'ThunderyHeavyRain',
  '392': 'ThunderySnowShowers',
  '395': 'HeavySnowShowers'
}

import { DATA_MODE } from './http'
import { demoApi } from './demo/api'
import { remoteApi } from './remote-api'
export const api = DATA_MODE === 'demo' ? demoApi : remoteApi

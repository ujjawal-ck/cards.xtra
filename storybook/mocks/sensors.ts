// Storybook stub: no motion sensors on the web canvas. Listeners never fire.
const sensor = {
  isAvailableAsync: async () => false,
  addListener: () => ({ remove() {} }),
  removeAllListeners() {},
  removeSubscription() {},
  setUpdateInterval() {},
  requestPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
  getPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
};
export const Gyroscope = sensor; export const Accelerometer = sensor; export const DeviceMotion = sensor;
export const Magnetometer = sensor; export const Barometer = sensor; export const LightSensor = sensor; export const Pedometer = sensor;
export default { Gyroscope, Accelerometer, DeviceMotion, Magnetometer, Barometer, LightSensor, Pedometer };

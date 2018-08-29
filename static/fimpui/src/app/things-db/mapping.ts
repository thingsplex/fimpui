export const msgTypeToValueTypeMap = {
  "evt.binary.report":"bool",
  "cmd.binary.set":"bool",
  "evt.lvl.report":"int",
  "cmd.lvl.set":"int",
  "evt.meter.report":"float",
  "evt.sensor.report":"float",
  "evt.open.report":"bool",
  "evt.presence.report":"bool",
  "evt.alarm.report":"str_map",
  "evt.setpoint.report":"str_map",
  "cmd.setpoint.report":"str_map",
  "cmd.mode.set":"string",
  "evt.mode.report":"string",
  "evt.state.report":"string",
  "evt.lock.report":"bool_map",
  "cmd.lock.set":"bool",
  "cmd.color.set":"int_map",
  "evt.color.report":"int_map",
  "evt.scene.report":"string",

}
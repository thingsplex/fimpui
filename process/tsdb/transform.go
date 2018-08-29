package tsdb

import (
	influx "github.com/influxdata/influxdb/client/v2"
	"github.com/alivinco/fimpgo"
	"strconv"
)

// DefaultTransform - transforms IotMsg into InfluxDb datapoint
func DefaultTransform(context *MsgContext, topic string, iotMsg *fimpgo.FimpMessage, domain string) (*influx.Point, error) {
	tags := map[string]string{
		"topic":  topic,
		"domain": domain,
		"mtype":    iotMsg.Type,
		"serv": iotMsg.Service,
	}
	if context.service != nil {
		tags["location_id"] = strconv.Itoa(int(context.service.LocationId))
		tags["location_alias"] = context.service.LocationAlias
		tags["service_id"] = strconv.Itoa(int(context.service.ID))
		tags["service_alias"] = context.service.Alias
	}
	var fields map[string]interface{}
	var vInt int64
	var err error
	switch iotMsg.ValueType {
	case "float":
		val ,err := iotMsg.GetFloatValue()
		unit , _ := iotMsg.Properties["unit"]
		if err == nil {
			fields = map[string]interface{}{
				"value": val,
				"unit":  unit,
			}
		}

	case "bool":
		val ,err := iotMsg.GetBoolValue()
		if err == nil {
			fields = map[string]interface{}{
				"value": val,
			}
		}

	case "int":
		vInt, err = iotMsg.GetIntValue()
		if err == nil {
			fields = map[string]interface{}{
				"value": vInt,
			}
		}

	case "string":
		vStr, err := iotMsg.GetStringValue()
		if err == nil {
			fields = map[string]interface{}{
				"value": vStr,
			}
		}

	case "null":
		fields = map[string]interface{}{
			"value": 0,
		}
	default:
		fields = map[string]interface{}{
			"value": iotMsg.Value,
		}

	}

	if fields != nil {
		point, err := influx.NewPoint(context.measurementName, tags, fields, context.time)
		return point, err
	}

	return nil, err

}



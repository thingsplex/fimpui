package statsdb

import "time"

type EventRec struct {
	ID int64		`storm:"id,increment"`
	Timestamp time.Time
	Value string
	Topic string
	MsgType string  `storm:"index"` // evt.state.report , evt.error.report
	Service string  `storm:"index"` // dev_sys ,zwave-ad
	ResourceType string `storm:"index"`   // dev,ad
	ThingAddress string `storm:"index"`   // zw:12
	ErrorSource string
	Msg string
}

type InterfaceStats struct {
	Topic string
	ThingAddress string
	Service string
	MsgType string
	Counter int64
	UpdatedAt time.Time
}


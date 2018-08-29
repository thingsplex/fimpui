package node

import (
	"github.com/alivinco/fimpgo"
	"github.com/alivinco/thingsplex/flow/model"
)

type Constructor func(context *model.FlowOperationalContext, meta model.MetaNode, ctx *model.Context, transport *fimpgo.MqttTransport) model.Node

var Registry = map[string]Constructor{
	"trigger":      NewTriggerNode,
	"receive":      NewReceiveNode,
	"if":           NewIfNode,
	"action":       NewActionNode,
	"rest_action":  NewRestActionNode,
	"wait":         NewWaitNode,
	"set_variable": NewSetVariableNode,
	"loop":         NewLoopNode,
	"time_trigger": NewTimeTriggerNode,
	"transform":    NewTransformNode,
	"exec":			NewExecNode,
}

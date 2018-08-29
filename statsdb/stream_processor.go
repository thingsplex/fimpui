package statsdb

import (
	"github.com/alivinco/thingsplex/model"
	"github.com/alivinco/fimpgo"
	log "github.com/Sirupsen/logrus"
)

type StreamProcessor struct {
	msgTransport *fimpgo.MqttTransport
	config       *model.FimpUiConfigs
	statsStore   *StatsStore
}

func NewStreamProcessor(config *model.FimpUiConfigs,statsStore *StatsStore) *StreamProcessor {
	int := StreamProcessor{config: config,statsStore:statsStore}
	return &int
}
func (mg *StreamProcessor) InitMessagingTransport() {
	clientId := mg.config.MqttClientIdPrefix + "stats_stream_proc"
	mg.msgTransport = fimpgo.NewMqttTransport(mg.config.MqttServerURI, clientId, mg.config.MqttUsername, mg.config.MqttPassword, true, 1, 1)
	mg.msgTransport.SetGlobalTopicPrefix(mg.config.MqttTopicGlobalPrefix)
	err := mg.msgTransport.Start()
	log.Info("<StProc> Mqtt transport connected")
	if err != nil {
		log.Error("<StProc> Error connecting to broker : ", err)
	}
	mg.msgTransport.SetMessageHandler(mg.onMqttMessage)
	mg.msgTransport.Subscribe("pt:j1/+/rt:ad/#")
	mg.msgTransport.Subscribe("pt:j1/+/rt:dev/#")
	mg.msgTransport.Subscribe("pt:j1/mt:cmd/rt:app/rn:fimpstats/ad:1")

}

func (mg *StreamProcessor) onMqttMessage(topic string, addr *fimpgo.Address, iotMsg *fimpgo.FimpMessage, rawMessage []byte) {
	defer func() {
		if r := recover(); r != nil {
			log.Error("<StProc> StreamProcessor process CRASHED with error : ", r)
			log.Errorf("<StProc> Crashed while processing message from topic = %s msgType = ", r, addr.MsgType)
		}
	}()


	switch iotMsg.Type {
	case "evt.error.report":
		evtMsg := EventRec{}
		evtMsg.Value , _ = iotMsg.GetStringValue()
		evtMsg.Topic = topic
		evtMsg.ThingAddress = addr.ResourceName+":"+addr.ServiceAddress
		evtMsg.Service = iotMsg.Service
		evtMsg.MsgType = iotMsg.Type
		evtMsg.ResourceType = addr.ResourceType
		if iotMsg.Properties != nil {
			evtMsg.Msg , _ = iotMsg.Properties["msg"]
			evtMsg.ErrorSource , _ = iotMsg.Properties["src"]
		}
		mg.statsStore.AddEvent(&evtMsg)
	case "evt.state.report":
		if addr.ResourceType=="ad"{
			evtMsg := EventRec{}
			evtMsg.Value , _ = iotMsg.GetStringValue()
			evtMsg.Topic = topic
			evtMsg.Service = iotMsg.Service
			evtMsg.ResourceType = addr.ResourceType
			evtMsg.ThingAddress = addr.ResourceName+":"+addr.ServiceAddress
			evtMsg.MsgType = iotMsg.Type
			mg.statsStore.AddEvent(&evtMsg)
		}
	default:
		break
	}
	//mg.statsStore.CountEvent(topic)
	mg.statsStore.MeterEvent(topic)

}
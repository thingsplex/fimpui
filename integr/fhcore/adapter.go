package fhcore
import (
	log "github.com/sirupsen/logrus"
	"github.com/futurehomeno/fimpgo"
	"github.com/alivinco/thingsplex/model"
)

type VinculumAdapter struct {
	msgTransport *fimpgo.MqttTransport
	config       *model.FimpUiConfigs
	vc           *VinculumClient
	vcChan       chan VinculumMsg
}

func NewVinculumAdapter(config *model.FimpUiConfigs,vc *VinculumClient) *VinculumAdapter {
	int := VinculumAdapter{config: config,vc:vc}
	int.vcChan = int.vc.RegisterSubscriber()
	return &int
}
func (mg *VinculumAdapter) InitMessagingTransport() {
	clientId := mg.config.MqttClientIdPrefix + "vinculum_ad"
	mg.msgTransport = fimpgo.NewMqttTransport(mg.config.MqttServerURI, clientId, mg.config.MqttUsername, mg.config.MqttPassword, true, 1, 1)
	mg.msgTransport.SetGlobalTopicPrefix(mg.config.MqttTopicGlobalPrefix)
	err := mg.msgTransport.Start()
	if err != nil {
		log.Error("<VincAd> Error connecting to broker : ", err)
	}else {
		log.Info("<VincAd> Mqtt transport connected")
		mg.dispatchVinculumMessages()
	}
	mg.msgTransport.SetMessageHandler(mg.onMqttMessage)
	err = mg.msgTransport.Subscribe("pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1")
	if err != nil {
		log.Error("<VincAd> Error subscribing to topic : ", err)
	}

}

func (mg *VinculumAdapter) onMqttMessage(topic string, addr *fimpgo.Address, iotMsg *fimpgo.FimpMessage, rawMessage []byte) {
	log.Info("<VincAd> New fimp message")
	if iotMsg.Service == "home_mode" {
		if iotMsg.Type == "cmd.mode.set"  {
			val,err := iotMsg.GetStringValue()
			if err == nil {
				mg.vc.SetMode(val)
			}else {
				log.Info("<VincAd> Incorrect value type")
			}

		}else {
			log.Info("<VincAd> Unsupported msg type")
		}
	}else if iotMsg.Service == "shortcut" {
		if iotMsg.Type == "cmd.mode.set"  {
			val,err := iotMsg.GetStringValue()
			if err == nil {
				mg.vc.SetShortcut(val)
			}else {
				log.Info("<VincAd> Unsupported msg type")
			}

		}else {
			log.Info("<VincAd> Incorrect value type")
		}
	}else {
		log.Info("<VincAd> Unsupported service")
	}

}
//Message: sending {"msg":{"data":{"cmd":"set","component":"house","id":null,"param":{"fimp":true,"learning":null,"mode":"home","time":"2018-11-06T07:57:22Z","uptime":185822}},"dst":"clients","type":"notify"},"ver":"sevenOfNine"}
func (mg *VinculumAdapter) dispatchVinculumMessages() {
	log.Info("<VincAd> Starting Vinculum dispatcher")
	go func() {
		for msg:= range mg.vcChan {
			switch msg.Msg.Data.Component {
			case "house":
				log.Info("<VincAd> Vinculum changed house mode")
				fimpMsg := fimpgo.NewStringMessage("evt.mode.report","home_mode",msg.Msg.Data.Param.House.Mode,nil,nil,nil)
				addr,err:= fimpgo.NewAddressFromString("pt:j1/mt:evt/rt:app/rn:vinculum/ad:1")
				if err == nil {
					mg.msgTransport.Publish(addr,fimpMsg)
				}else {
					log.Error("<VincAd> Error validating address : ", err)
				}


			}
		}
		log.Info("<VincAd> Vinculum dispatcher stopped")
	}()

}
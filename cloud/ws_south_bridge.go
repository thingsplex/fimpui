package cloud

import (
	"fmt"
	"github.com/alivinco/thingsplex/model"
	"github.com/dgrijalva/jwt-go"
	"github.com/futurehomeno/fimpgo"
	log "github.com/sirupsen/logrus"
)

// WsSouthBridge is used only in Cloud version. It's a process that connects to Cloud WS Bridge (instead of MQTT broker) and
// forwards local MQTT messages to cloud and cloud messages to local MQTT broker .
// WsSouthBridge (hub) <-> Centrifugo (cloud WS bridge) <-> CloudThingsplex (ws_north_bridge-ws_centrifugo)
// The component works directly with local MQTT broker.
type WsSouthBridge struct {
	configs *model.Configs
	mqtt                 *fimpgo.MqttTransport
}

func NewWsSouthBridge(configs *model.Configs) *WsSouthBridge {
	upg := &WsSouthBridge{configs:configs}
	return upg
}


// connect createas new mqtt connection
func (mp *WsSouthBridge) ConnectToLocalMqttBroker() error {
	var err error
	if mp.configs.MqttServerURI == "" {
		return fmt.Errorf("mqtt server address is empty")
	}
	// Start mqtt connection
	log.Debug("<brSes> mqtt session name ", mp.configs.MqttClientIdPrefix)
	mp.mqtt = fimpgo.NewMqttTransport(mp.configs.MqttServerURI, mp.configs.MqttClientIdPrefix+"_southbr_", mp.configs.MqttUsername, mp.configs.MqttPassword, true, 1, 1)

	if mp.configs.TlsCertDir != "" {
		mp.mqtt.ConfigureTls("awsiot.private.key", "awsiot.crt", mp.configs.TlsCertDir, true)
	}
	mp.mqtt.SetStartAutoRetryCount(3)
	err = mp.mqtt.Start()
	if err != nil {
		log.Error("<brSes> Can't connect to broker . Error :", err)
		return err
	}
	mp.mqtt.SetMessageHandler(mp.onMqttMessage)
	mp.mqtt.Subscribe("#")
	return nil
}

func (mp *WsSouthBridge) ConnectToCloudMqttBroker()  {
	// Connection to remote broker will be secured by JWT token that must be sent in CONNECT password field.
	// fimpui must obtain JWT token either from Auth0 or from other auth system using Playgrounds UI interface or
	// using local Thingsplex interface. JWT token must contain topic permission (topic prefix)

	// Connection to cloud is initiated from Thingsplex UI / Playground UI , it means that token .
	// 1) User must exist in cloud
	// 2) Register hub using "Device flow" from Thingsplex UI or Playgrounds UI
	// 3) Hub-thingsplex get user token , it must exchange it for MQTT connection JWT token from Cloud API. Cloud API must save thinsplex-hub-id under user.
	// 4) Save MQTT JWT token locally.
	// 5) Use MQTT JWT token to establish connection to Cloud MQTT broker.
	// 6) Use can open Cloud Thingsplex , choose hub/remote-thingsplex from the list and click connect. Cloud Thingsplex will be using MQTT JWT for establishing
	//    connection to mqtt broker.
	// 7) User can connect and disconnect ones hub from and to cloud broker. 
}


// onMqttMessage - routes messages from MQTT broker to browser over websocket. MQTT broker -> WS Bridge -> Browser
func (mp *WsSouthBridge) onMqttMessage(topic string, addr *fimpgo.Address, iotMsg *fimpgo.FimpMessage, rawPayload []byte) {
	log.Debug("Routing mqtt message to centrifugo")
	iotMsg.Topic = topic
	//binMsg , _ := iotMsg.SerializeToJson()
	//if err != nil {
	//	log.Error(" Publish error : ",err.Error())
	//}
	//log.Debug("Publish result : ",resp)


	// Use special tunneling messages to deliver messages to remote broker

}





func connToken(user string, exp int64) string {
	// NOTE that JWT must be generated on backend side of your application!
	// Here we are generating it on client side only for example simplicity.
	claims := jwt.MapClaims{"sub": user}
	if exp > 0 {
		claims["exp"] = exp
	}
	t, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte("3edb5261-2025-487d-9651-3d585b750d0d"))
	if err != nil {
		panic(err)
	}
	return t
}
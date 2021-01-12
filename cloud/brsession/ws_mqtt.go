package brsession

import (
	"fmt"
	"github.com/alivinco/thingsplex/user"
	"github.com/futurehomeno/fimpgo"
	"github.com/futurehomeno/fimpgo/transport"
	"github.com/gorilla/websocket"
	log "github.com/sirupsen/logrus"
	"math/rand"
	"strings"
	"sync"
	"time"
)

// WsToMqttSession represents container that holds mqtt connection to broker and one or multiple WebSocket connections. Message router routes message between WS and MQTT.
// mqtt connection lifetime equals to session lifetimes , however WS connection comes and goes as browsers connects and disconnects. Session also acts
// as connection multiplexer , one MQTT <-> many WS connections
type WsToMqttSession struct {
	id                   string
	userConfig           user.Configs
	wsConn               map[int]*websocket.Conn
	mqtt                 *fimpgo.MqttTransport
	startedAt            time.Time
	lastWsDisconnectAt   time.Time
	isMqttConnected      bool
	wsConnLock           *sync.RWMutex
	mqttPubPrefix        string
	mqttSubPrefix        string
	mqttCBSessionMode    bool
	compressor           *transport.MsgCompressor
	cbKeepAliveTicker    *time.Ticker
	sessionClosedSignal  chan bool
	isConnected          bool // true if session is connected to mqtt broker
}

func NewWsToMqttSession(id string, userConfig user.Configs) *WsToMqttSession {
	userConfig.MqttClientIdPrefix = fmt.Sprintf("%s_%s", userConfig.MqttClientIdPrefix, id)
	ses := &WsToMqttSession{id: id, userConfig: userConfig}
	ses.wsConnLock = &sync.RWMutex{}
	ses.wsConn = make(map[int]*websocket.Conn)
	ses.sessionClosedSignal = make(chan bool)
	ses.mqttCBSessionMode = userConfig.EnableCbSupport
	if ses.mqttCBSessionMode {
		log.Info("<brSes> CB session enabled.")
		ses.mqttPubPrefix = userConfig.MqttTopicGlobalPrefix
		ses.mqttSubPrefix = fmt.Sprintf("%s_tplex_%s", userConfig.MqttTopicGlobalPrefix, id)
	}else {
		ses.mqttPubPrefix = userConfig.MqttTopicGlobalPrefix
		ses.mqttSubPrefix = userConfig.MqttTopicGlobalPrefix
	}
	return ses
}
// connect createas new mqtt connection
func (mp *WsToMqttSession) ConnectToMqttBroker() error {
	var err error
	if mp.userConfig.MqttServerURI == "" {
		return fmt.Errorf("mqtt server address is empty")
	}
	// Start mqtt connection
	log.Debug("<brSes> mqtt session name ", mp.userConfig.MqttClientIdPrefix)
	mp.mqtt = fimpgo.NewMqttTransport(mp.userConfig.MqttServerURI, mp.userConfig.MqttClientIdPrefix, mp.userConfig.MqttUsername, mp.userConfig.MqttPassword, true, 1, 1)

	if mp.userConfig.TlsCertDir != "" {
		mp.mqtt.ConfigureTls("awsiot.private.key", "awsiot.crt", mp.userConfig.TlsCertDir, true)
	}
	mp.mqtt.SetStartAutoRetryCount(3)
	err = mp.mqtt.Start()
	if err != nil {
		log.Error("<brSes> Can't connect to broker . Error :", err)
		return err
	}
	mp.mqtt.SetMessageHandler(mp.onMqttMessage)
	if mp.mqttSubPrefix != "" {
		mp.mqtt.Subscribe(fmt.Sprintf("%s/#",mp.mqttSubPrefix))
		if mp.mqttCBSessionMode {
			// if CB session enabled we must subscribe to session topic and site topic .
			mp.mqtt.Subscribe(fmt.Sprintf("%s/#",mp.userConfig.MqttTopicGlobalPrefix))
		}
	}else {
		mp.mqtt.Subscribe("#")
	}

	if mp.mqttCBSessionMode {
		mp.startCBSession()
	}

	log.Debugf("<brSes> Sessions %s connected to broker", mp.id)
	mp.startedAt = time.Now()
	mp.isConnected = true
	return nil
}

func (mp *WsToMqttSession) IsMqttConnected() bool {
	for i:=0;i<50;i++ {
		if mp.isConnected {
			return true
		}
		time.Sleep(time.Millisecond*200)
	}
	return false
}

func (mp *WsToMqttSession) Close() {
	if mp.mqttCBSessionMode {
		mp.stopCBSession()
	}
	mp.mqtt.Stop()
}
// IsStale return true if session is stale and can be deleted .
func (mp *WsToMqttSession) IsStale() bool{
	disconnectedDuration :=  time.Now().Sub(mp.lastWsDisconnectAt)
	//log.Debugf("<brSes> Last session disconnected %f sec ago ",disconnectedDuration.Seconds())
	if mp.IsAnyWsConnectionActive() {
		return false
	}else if disconnectedDuration.Seconds() > 30  {
		return true
	}
	return false
}

// StartWsToMqttRouter - consumes WS Fimp messages and publishes them MQTT broker.  Browser -> WS Bridge -> MQTT broker
func (mp *WsToMqttSession) StartWsToSouthboundRouter(wsConn *websocket.Conn) error{
	if !mp.isConnected {
		return fmt.Errorf("<brSes> mqtt broker is not connected")
	}
	s1 := rand.NewSource(time.Now().UnixNano())
	r1 := rand.New(s1)
	wsConnID := r1.Int()
	defer func() {
		log.Debug("<brSes> Quit from WsReader loop. ConnID = ", wsConnID)
		if wsConn != nil {
			wsConn.Close()
		}
		mp.wsConnLock.Lock()
		delete(mp.wsConn, wsConnID)
		mp.lastWsDisconnectAt = time.Now()
		mp.wsConnLock.Unlock()
	}()
	mp.wsConnLock.Lock()
	mp.wsConn[wsConnID] = wsConn
	mp.wsConnLock.Unlock()
	log.Debug("<brSes> Starting connection reader")
	for {
		msgType, msg, err := wsConn.ReadMessage()
		if err != nil {
			log.Error("<brSes> Read error :", err)
			break
		} else if msgType == websocket.TextMessage {
			fimpMsg, err := fimpgo.NewMessageFromBytes(msg)
			fimpMsg.Version = "1"
			if err != nil {
				log.Debug("<brSes> Can't parse fimp message from WS. Message dropped.Err:", err.Error())
				continue
			}
			//log.Debug(fimpMsg)
			if fimpMsg.Topic == "" {
				log.Debug("<brSes> Empty topic in WS message. Message dropped")
				continue
			}
			pubTopic := fimpMsg.Topic
			if mp.mqttPubPrefix != "" {
				pubTopic = fimpgo.AddGlobalPrefixToTopic(mp.mqttPubPrefix,pubTopic)
			}
			if mp.mqttCBSessionMode {
				if strings.Contains(fimpMsg.ResponseToTopic,"rsp") {
					fimpMsg.ResponseToTopic = "pt:j1/mt:rsp/rt:cloud/rn:remote-client/ad:tplex-ui"
				}
			}
			if !mp.IsMqttConnected() {
				log.Error("<brSes> Can't configure mqtt connection. Id =",mp.id)
				return fmt.Errorf("mqtt connection is not configured")
			}

			err = mp.mqtt.PublishToTopic(pubTopic, fimpMsg)
			if err != nil {
				log.Info("<brSes> Msg publish error . Err:", err.Error())
			}

		} else if msgType == websocket.BinaryMessage {
			log.Debug("<brSes> New binary message")
		} else {
			log.Debug(" <brSes> Message with type = ", msgType)
		}
	}
	return nil
}

func (mp *WsToMqttSession) IsAnyWsConnectionActive() bool {
	defer mp.wsConnLock.RUnlock()
	mp.wsConnLock.RLock()
	if len(mp.wsConn) > 0 {
		return true
	}
	return false
}

func (mp *WsToMqttSession) CountOfActiveWsSessions() int {
	return len(mp.wsConn)
}

// onMqttMessage - routes messages from MQTT broker to browser over websocket. MQTT broker -> WS Bridge -> Browser
func (mp *WsToMqttSession) onMqttMessage(topic string, addr *fimpgo.Address, iotMsg *fimpgo.FimpMessage, rawPayload []byte) {
	if !mp.IsAnyWsConnectionActive() {
		//log.Debug("<brSes> no active ws connection , msg dropped")
		return
	}

	var packet []byte
	var err error
    if addr.PayloadType == fimpgo.CompressedJsonPayload {
    	//log.Debug("<brSes> Compressed payload msg")
    	if mp.compressor == nil {
    		mp.compressor = transport.NewMsgCompressor("","")
		}
		iotMsg,err = mp.compressor.DecompressFimpMsg(rawPayload)
		if err != nil {
			log.Error("<brSes> Can't decompress payload.Err:", err.Error())
			return
		}
		topic = iotMsg.Topic
	}

	if mp.mqttSubPrefix != "" {
		_, iotMsg.Topic = fimpgo.DetachGlobalPrefixFromTopic(topic)
	}else {
		iotMsg.Topic = topic
	}

	packet, err = iotMsg.SerializeToJson()

	if err != nil {
		log.Error("<brSes> Can't serialize json.Err:", err.Error())
		return
	}
	// Broadcasting MQTT message over all active WS connections
	mp.wsConnLock.RLock()
	for _, conn := range mp.wsConn {
		err = conn.WriteMessage(websocket.TextMessage, packet)
		if err != nil {
			log.Error("<brSes> Write error :", err)
		}
	}
	mp.wsConnLock.RUnlock()
}

// startCBSession sends command that starts CloudBridge session.
func (mp *WsToMqttSession) startCBSession() {
	log.Debug("<dbSes> Starting CB session")
	params:= map[string]string{
		"token":"",
		"client-id":"tplex_"+mp.id,
		"compression":"gzip",
	}
	msg := fimpgo.NewStrMapMessage("cmd.session.start","clbridge",params,nil,nil,nil)
	mp.mqtt.PublishToTopic(fmt.Sprintf("%s/pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",mp.mqttPubPrefix),msg)
	mp.cbKeepAliveTicker = time.NewTicker(time.Second*500)

	go func() {
		for {
			select {
			case <- mp.sessionClosedSignal:
				return
			case <- mp.cbKeepAliveTicker.C:
				log.Debug("<dbSes> Sending session keep-alive signal . Id = ",mp.id)
				mp.mqtt.PublishToTopic(fmt.Sprintf("%s/pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",mp.mqttPubPrefix),msg)
			}
		}
	}()
}

func (mp *WsToMqttSession) stopCBSession() {
	log.Debug("<dbSes> Stopping CB session Id = ",mp.id)
	params:= map[string]string{
		"client-id":"tplex_"+mp.id,
	}
	msg := fimpgo.NewStrMapMessage("cmd.session.stop","clbridge",params,nil,nil,nil)
	mp.mqtt.PublishToTopic(fmt.Sprintf("%s/pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",mp.mqttPubPrefix),msg)
	if mp.cbKeepAliveTicker != nil {
		mp.cbKeepAliveTicker.Stop()
		mp.sessionClosedSignal <- true
	}
	time.Sleep(time.Millisecond*500)
	log.Debug("<dbSes> Stopping stopped Id = ",mp.id)
}

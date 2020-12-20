package mqtt

import (
	"fmt"
	"github.com/alivinco/thingsplex/api"
	"github.com/alivinco/thingsplex/model"
	"github.com/futurehomeno/fimpgo"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
	"math/rand"
	"net/http"
	"runtime/debug"
	"sync"
	"time"
)

var (
	brUpgrader = websocket.Upgrader{
		Subprotocols: []string{},
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

// WebSockets begin life as a standard HTTP request and response. Within that request response chain,
// the client asks to open a WebSocket connection, and the server responds (if its able to).
// If this initial handshake is successful, the client and server have agreed to use the existing TCP/IP connection
// that was established for the HTTP request as a WebSocket connection. Data can now flow over this connection using a basic framed message protocol.
// Once both parties acknowledge that the WebSocket connection should be closed, the TCP connection is torn down.

type WsBridge struct {
	auth           *api.Auth
	sessions       map[string]*BridgeWsProxySession
	configs        map[string]model.UserConfigs
	sesLock        *sync.RWMutex
	// each session can have different connection settings
}

func NewWsBridge(auth *api.Auth) *WsBridge {
	upg := &WsBridge{auth: auth}
	upg.sesLock = &sync.RWMutex{}
	upg.configs = make(map[string]model.UserConfigs)
	upg.sessions = make(map[string]*BridgeWsProxySession)
	return upg
}

func (wu *WsBridge) UpdateUserConfig(username string, conf model.UserConfigs) {
	wu.configs[username] = conf

	ses,ok := wu.sessions[username]
	if ok {
		ses.Close()
		delete(wu.sessions,username)
	}
}

// Upgrade - the method is invoked by higher HTTP framework . It blocks and reads messages.
// IMPORTANT NOTE : the same user can open multiple browser sessions
func (wu *WsBridge) Upgrade(c echo.Context) error {
	defer func() {
		if r := recover(); r != nil {
			log.Error("!!!!!!!!!!! Mqtt WS-MQTT bridge (Upgrade) crashed with panic!!!!!!!!!!!!!!!")
			debug.PrintStack()
		}
	}()
	if !wu.auth.IsRequestAuthenticated(c, true) {
		return nil
	}

	ws, err := brUpgrader.Upgrade(c.Response(), c.Request(), nil)

	if err != nil {
		log.Error("<MqWsProxy> Can't upgrade . Error:", err)
		return err
	}
	log.Info("<MqWsBridge> Upgraded ")

	var username string
	if wu.auth.AuthType == api.AuthTypeNone {
		username = "unknown"
	}else {
		username := wu.auth.GetUsername(c)
		if username == "" {
			return fmt.Errorf("http session doesn't exist. Can't upgrate WS connection")
		}
	}
	wu.sesLock.RLock()
	session, ok := wu.sessions[username]
	wu.sesLock.RUnlock()
	if ok {
		session.StartWsToMqttRouter(ws)
	} else {
		conf,ok := wu.configs[username]
		if !ok {
			return fmt.Errorf("can't find config for user %s",username)
		}
		wu.sesLock.Lock()
		newSession := NewBridgeWsProxySession(username,conf)
		wu.sessions[username] = newSession
		defer wu.sesLock.Unlock()
		newSession.StartWsToMqttRouter(ws)
		log.Debugf("New session added . Active sessions = %d", len(wu.sessions))
	}
	return nil
}

// StartSessionMonitor - monitors for old expired sessions and removes expired ones
func (wu *WsBridge) StartSessionMonitor() {
	// TODO : Implement
}


// BridgeWsProxySession represents container that holds mqtt connection to broker and WebSocket connection. Message router routes message between WS and MQTT.
// mqtt connection lifetime equals to session lifetimes , however WS connection comes and goes as browsers connects and disconnects.
type BridgeWsProxySession struct {
	id               string
	userConfig       model.UserConfigs
	wsConn           map[int]*websocket.Conn
	mqtt             *fimpgo.MqttTransport
	startedAt        time.Time
	isMqttConnected  bool
	wsConnLock        *sync.RWMutex
}

func NewBridgeWsProxySession(id string, userConfig model.UserConfigs) *BridgeWsProxySession {
	userConfig.MqttClientIdPrefix = fmt.Sprintf("%s_%s",userConfig.MqttClientIdPrefix,id)
	ses := &BridgeWsProxySession{id: id, userConfig: userConfig}
	ses.wsConnLock = &sync.RWMutex{}
	ses.wsConn = make(map[int]*websocket.Conn)
	ses.connect()
	return ses
}


func (mp *BridgeWsProxySession) connect() error {
	var err error
	// Start mqtt connection
	log.Debug("mqtt session name ",mp.userConfig.MqttClientIdPrefix)
	mp.mqtt = fimpgo.NewMqttTransport(mp.userConfig.MqttServerURI,mp.userConfig.MqttClientIdPrefix,mp.userConfig.MqttUsername,mp.userConfig.MqttPassword,true,1,1)
	if mp.userConfig.MqttTopicGlobalPrefix !="" {
		mp.mqtt.SetGlobalTopicPrefix(mp.userConfig.MqttTopicGlobalPrefix)
	}

	if mp.userConfig.TlsCertDir != "" {
		mp.mqtt.ConfigureTls("awsiot.private.key","awsiot.crt",mp.userConfig.TlsCertDir,true)
	}

	err = mp.mqtt.Start()
	if err != nil {
		log.Error("<MqWsBridge> Can't connect to broker . Error :", err)
		return err
	}
	mp.mqtt.SetMessageHandler(mp.OnMqttMessage)
	mp.mqtt.Subscribe("#")
	log.Debugf("<MqWsBridge> Sessions %s connected to broker", mp.id)
	mp.startedAt = time.Now()
	return nil
}

func (mp *BridgeWsProxySession) Close() {
	mp.mqtt.Stop()
}

// StartWsToMqttRouter - consumes WS Fimp messages and publishes them MQTT broker.  Browser -> WS Bridge -> MQTT broker
func (mp *BridgeWsProxySession) StartWsToMqttRouter(wsConn *websocket.Conn) {
		s1 := rand.NewSource(time.Now().UnixNano())
		r1 := rand.New(s1)
		wsConnID := r1.Int()
		defer func() {
			log.Debug("<MqWsBridge> Quit from WsReader loop. ConnID = ",wsConnID)
			if wsConn != nil {
				wsConn.Close()
			}
			mp.wsConnLock.Lock()
			delete(mp.wsConn,wsConnID)
			mp.wsConnLock.Unlock()
		}()
		mp.wsConnLock.Lock()
		mp.wsConn[wsConnID] = wsConn
		mp.wsConnLock.Unlock()
	    log.Debug("<MqWsBridge> Starting connection reader" )
		for {
			msgType, msg, err := wsConn.ReadMessage()
			if err != nil {
				log.Error("<MqWsBridge> Read error :", err)
				break
			} else if msgType == websocket.TextMessage {
				fimpMsg, err := fimpgo.NewMessageFromBytes(msg)
				if err != nil {
					log.Debug("<MqWsBridge> Can't parse fimp message from WS. Message dropped.Err:",err.Error())
					continue
				}
				log.Debug(fimpMsg)
				if fimpMsg.Topic == "" {
					log.Debug("<MqWsBridge> Empty topic in WS message. Message dropped")
					continue
				}

				err = mp.mqtt.PublishToTopic(fimpMsg.Topic, fimpMsg)
				if err != nil {
					log.Info("<MqWsBridge> Msg publish error . Err:", err.Error())
				}

			}else if msgType == websocket.BinaryMessage {
				log.Debug("<MqWsBridge> New binary message")
			} else {
				log.Debug(" <MqWsBridge> Message with type = ", msgType)
			}
		}
}

func(mp *BridgeWsProxySession) IsAnyWsConnectionActive() bool {
	defer mp.wsConnLock.RUnlock()
	mp.wsConnLock.RLock()
	if len(mp.wsConn)>0 {
		return true
	}
	return false
}

func(mp *BridgeWsProxySession) CountOfActiveWsSessions() int {
	return len(mp.wsConn)
}

// OnMqttMessage - routes messages from MQTT broker to browser over websocket. MQTT broker -> WS Bridge -> Browser
func(mp *BridgeWsProxySession) OnMqttMessage(topic string, addr *fimpgo.Address, iotMsg *fimpgo.FimpMessage, rawPayload []byte) {
	if !mp.IsAnyWsConnectionActive() {
		log.Debug("<brSes> no active ws connection , msg dropped")
		return
	}
	iotMsg.Topic = topic
	packet,err := iotMsg.SerializeToJson()
	if err != nil {
		log.Error("<brSes> Can't serialize json.Err:",err.Error())
		return
	}
	// Broadcasting MQTT message over all active WS connections
	mp.wsConnLock.RLock()
	for _,conn := range mp.wsConn {
		err = conn.WriteMessage(websocket.TextMessage, packet)
		if err != nil {
			log.Error("<brSes> Write error :", err)
		}
	}
	mp.wsConnLock.RUnlock()

}

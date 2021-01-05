package cloud

import (
	"fmt"
	"github.com/alivinco/thingsplex/api"
	"github.com/alivinco/thingsplex/cloud/brsession"
	"github.com/alivinco/thingsplex/model"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
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


//WsNorthBridge accepts WS connections from UI Browser clients.
type WsNorthBridge struct {
	auth           *api.Auth
	sessions       map[string]*brsession.WsToMqttSession
	configs        map[string]model.UserConfigs
	sesLock        *sync.RWMutex
	// each session can have different connection settings
}

func NewWsNorthBridge(auth *api.Auth) *WsNorthBridge {
	upg := &WsNorthBridge{auth: auth}
	upg.sesLock = &sync.RWMutex{}
	upg.configs = make(map[string]model.UserConfigs)
	upg.sessions = make(map[string]*brsession.WsToMqttSession)
	upg.StartSessionMonitor()
	return upg
}

func (wu *WsNorthBridge) UpdateUserConfig(username string, conf model.UserConfigs) {
	wu.configs[username] = conf

	ses,ok := wu.sessions[username]
	if ok {
		ses.Close()
		delete(wu.sessions,username)
	}
}

// Upgrade - the method is invoked by higher HTTP framework . It blocks and reads messages.
// IMPORTANT NOTE : the same user can open multiple browser sessions
func (wu *WsNorthBridge) Upgrade(c echo.Context) error {
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
		session.StartWsToSouthboundRouter(ws)
	} else {
		conf,ok := wu.configs[username]
		if !ok {
			return fmt.Errorf("can't find config for user %s",username)
		}
		wu.sesLock.Lock()
		newSession := brsession.NewWsToMqttSession(username,conf)
		wu.sessions[username] = newSession
		wu.sesLock.Unlock()
		newSession.StartWsToSouthboundRouter(ws)
		log.Debugf("New session added . Active sessions = %d", len(wu.sessions))
	}
	return nil
}

// StartSessionMonitor - monitors for old expired sessions and removes expired ones
func (wu *WsNorthBridge) StartSessionMonitor() {
	go func() {
		for {
			wu.sesLock.Lock()
			for k := range wu.sessions {
				if wu.sessions[k].IsStale() {
					wu.sessions[k].Close()
					delete(wu.sessions,k)
					log.Debug("<MqWsBridge> Stale session deleted")
				}
			}
			wu.sesLock.Unlock()
			time.Sleep(10*time.Second)
		}
		log.Info("<MqWsBridge> Session monitor loop has quit")
	}()
}



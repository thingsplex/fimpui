package cloud

import (
	"fmt"
	"github.com/alivinco/thingsplex/cloud/brsession"
	"github.com/alivinco/thingsplex/user"
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
	auth           *user.Auth
	sessions       map[string]*brsession.WsToMqttSession
	userProfiles   *user.ProfilesDB
	sesLock        *sync.RWMutex
	// each session can have different connection settings
}

func NewWsNorthBridge(auth *user.Auth,profiles *user.ProfilesDB) *WsNorthBridge {
	upg := &WsNorthBridge{auth: auth,userProfiles: profiles}
	upg.sesLock = &sync.RWMutex{}
	upg.sessions = make(map[string]*brsession.WsToMqttSession)
	upg.StartSessionMonitor()
	return upg
}

func (wu *WsNorthBridge) ReloadUserConfig(username string) {
	wu.sesLock.Lock()
	ses,ok := wu.sessions[username]
	if ok {
		ses.Close()
		delete(wu.sessions,username)
	}
	wu.sesLock.Unlock()
}

func (wu *WsNorthBridge) GetSessionCount()int {
	return len(wu.sessions)
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

	var username string
	if wu.auth.AuthType == user.AuthTypeNone {
		username = "unknown"
	}else {
		username = wu.auth.GetUsername(c)
		if username == "" {
			return fmt.Errorf("http session doesn't exist. Can't upgrate WS connection")
		}
	}
	log.Debugf("<MqWsBridge> Starting WS session for user %s ",username)
	wu.sesLock.RLock()
	session, ok := wu.sessions[username]
	wu.sesLock.RUnlock()
	if ok {
		log.Debug("<MqWsBridge> Reusing existing session")
		session.StartWsToSouthboundRouter(ws)
	} else {
		log.Debug("<MqWsBridge> Starting new session  ")

		conf := wu.userProfiles.GetUserProfileByName(username)
		if conf == nil {
			return fmt.Errorf("can't find config for user %s",username)
		}
		wu.sesLock.Lock()
		newSession := brsession.NewWsToMqttSession(username,conf.Configs)
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



package cloud

import (
	"fmt"
	"github.com/alivinco/thingsplex/api"
	"github.com/alivinco/thingsplex/cloud/brsession"
	"github.com/alivinco/thingsplex/model"
	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
	"runtime/debug"
	"sync"
)

//WsSouthBridge is a process that accepts Websocket connections from Hubs or other Edge devices .
// each new connection is stored
type WsSouthBridge struct {
	auth           *api.Auth
	sessions       map[string]*brsession.WsToMqttSession
	configs        map[string]model.UserConfigs
	sesLock        *sync.RWMutex
	// each session can have different connection settings
}

func NewWsSouthBridge(auth *api.Auth) *WsNorthBridge {
	upg := &WsNorthBridge{auth: auth}
	upg.sesLock = &sync.RWMutex{}
	upg.configs = make(map[string]model.UserConfigs)
	upg.sessions = make(map[string]*brsession.WsToMqttSession)
	return upg
}

func (wu *WsSouthBridge) UpdateUserConfig(username string, conf model.UserConfigs) {
	wu.configs[username] = conf

	ses,ok := wu.sessions[username]
	if ok {
		ses.Close()
		delete(wu.sessions,username)
	}
}

// Upgrade - the method is invoked by higher HTTP framework . It blocks and reads messages.
//
func (wu *WsSouthBridge) Upgrade(c echo.Context) error {
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
		defer wu.sesLock.Unlock()
		newSession.StartWsToSouthboundRouter(ws)
		log.Debugf("New session added . Active sessions = %d", len(wu.sessions))
	}
	return nil
}

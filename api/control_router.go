package api

import (
	"fmt"
	"github.com/alivinco/thingsplex/model"
	"github.com/alivinco/thingsplex/user"
	"github.com/alivinco/thingsplex/utils"
	"github.com/futurehomeno/fimpgo"
	"github.com/futurehomeno/fimpgo/discovery"
	"github.com/futurehomeno/fimpgo/edgeapp"
	log "github.com/sirupsen/logrus"
	"path/filepath"
)

type FimpConfigInterface struct {
	AuthType string `json:"auth_type"`
	Username string `json:"username"`
	Password string `json:"password"`
	OneTimeCode string `json:"one_time_code"`
}

type AppControlApiRouter struct {
	inboundMsgCh fimpgo.MessageCh
	mqt          *fimpgo.MqttTransport
	instanceId   string
	appLifecycle *edgeapp.Lifecycle
	configs      *model.Configs
	auth         *user.Auth
	userProfiles *user.ProfilesDB
}

func NewAppControlApiRouter(mqt *fimpgo.MqttTransport, appLifecycle *edgeapp.Lifecycle, configs *model.Configs, auth *user.Auth,profiles *user.ProfilesDB) *AppControlApiRouter {
	fc := AppControlApiRouter{inboundMsgCh: make(fimpgo.MessageCh, 5), mqt: mqt, appLifecycle: appLifecycle, configs: configs,auth: auth,userProfiles: profiles}
	if mqt!=nil {
		fc.mqt.RegisterChannel("ch1", fc.inboundMsgCh)
	}
	return &fc
}

func (fc *AppControlApiRouter) ConfigureMqtt() error {
	fc.mqt = fimpgo.NewMqttTransport(fc.configs.MqttServerURI, fc.configs.MqttClientIdPrefix, fc.configs.MqttUsername, fc.configs.MqttPassword, true, 1, 1)
	err := fc.mqt.Start()
	if err != nil {
		return err
	}
	fc.mqt.RegisterChannel("ch1", fc.inboundMsgCh)
	responder := discovery.NewServiceDiscoveryResponder(fc.mqt)
	responder.RegisterResource(model.GetDiscoveryResource())
	responder.Start()
	return nil
}

func (fc *AppControlApiRouter) Start() {

	if fc.mqt == nil {
		fc.ConfigureMqtt()
	}
	// ------ Application topic -------------------------------------------
	fc.mqt.Subscribe(fmt.Sprintf("pt:j1/+/rt:app/rn:%s/ad:1", model.ServiceName))

	go func(msgChan fimpgo.MessageCh) {
		for {
			select {
			case newMsg := <-msgChan:
				fc.routeFimpMessage(newMsg)
			}
		}
	}(fc.inboundMsgCh)
}

func (fc *AppControlApiRouter) routeFimpMessage(newMsg *fimpgo.Message) {
	log.Debug("New fimp msg")
	switch newMsg.Payload.Service {
	case model.ServiceName:
		adr := &fimpgo.Address{MsgType: fimpgo.MsgTypeEvt, ResourceType: fimpgo.ResourceTypeAdapter, ResourceName: model.ServiceName, ResourceAddress: "1"}
		switch newMsg.Payload.Type {

		case "cmd.app.get_manifest":
			mode,err := newMsg.Payload.GetStringValue()
			if err != nil {
				log.Error("Incorrect request format ")
				return
			}
			manifest := edgeapp.NewManifest()
			err = manifest.LoadFromFile(filepath.Join(fc.configs.GetDefaultDir(), "app-manifest.json"))
			if err != nil {
				log.Error("Failed to load manifest file .Error :", err.Error())
				return
			}

			if uiConfig := manifest.GetAppConfig("local_url_1");uiConfig != nil {
				ip := utils.GetOutboundIP()
				if ip == "" {
					ip = "futurehome-smarthub.local"
				}
				uiConfig.Val.Default = fmt.Sprintf("http://%s:8081",ip)
			}
			configState := FimpConfigInterface{AuthType: fc.auth.AuthType}

			if fc.auth.AuthType == user.AuthTypeCode {

				if uiConfig := manifest.GetAppConfig("one_time_code");uiConfig != nil {
					uiConfig.Hidden = true // This is temp flag
					//uiConfig.Val.Default =
					configState.OneTimeCode = fc.auth.GenerateCode()
				}
				if uiConfig := manifest.GetAppConfig("username");uiConfig != nil {
					uiConfig.Hidden = true
				}
				if uiConfig := manifest.GetAppConfig("password");uiConfig != nil {
					uiConfig.Hidden = true
				}
			}else {
				configState.OneTimeCode = ""
				if uiConfig := manifest.GetAppConfig("one_time_code");uiConfig != nil {
					uiConfig.Hidden = true
				}
				if uiConfig := manifest.GetAppConfig("username");uiConfig != nil {
					uiConfig.Hidden = false
				}
				if uiConfig := manifest.GetAppConfig("password");uiConfig != nil {
					uiConfig.Hidden = false
				}
			}

			manifest.ConfigState = configState
			if mode == "manifest_state" {
				manifest.AppState = *fc.appLifecycle.GetAllStates()
			}



			msg := fimpgo.NewMessage("evt.app.manifest_report", model.ServiceName, fimpgo.VTypeObject, manifest, nil, nil, newMsg.Payload)
			if err := fc.mqt.RespondToRequest(newMsg.Payload, msg); err != nil {
				// if response topic is not set , sending back to default application event topic
				fc.mqt.Publish(adr, msg)
			}

		case "cmd.app.get_state":
			//msg := fimpgo.NewMessage("evt.app.manifest_report",model.ServiceName,fimpgo.VTypeObject,fc.appLifecycle.GetAllStates(),nil,nil,newMsg.Payload)
			//if err := fc.mqt.RespondToRequest(newMsg.Payload,msg); err != nil {
			//	// if response topic is not set , sending back to default application event topic
			//	fc.mqt.Publish(adr,msg)
			//}

		case "cmd.config.get_extended_report":

			msg := fimpgo.NewMessage("evt.config.extended_report", model.ServiceName, fimpgo.VTypeObject, fc.configs, nil, nil, newMsg.Payload)
			if err := fc.mqt.RespondToRequest(newMsg.Payload, msg); err != nil {
				fc.mqt.Publish(adr, msg)
			}

		case "cmd.config.extended_set":
			conf := FimpConfigInterface{}
			err := newMsg.Payload.GetObjectValue(&conf)
			if err != nil {
				log.Error("Can't parse configuration object")
				return
			}
			state := "ok"
			if  conf.AuthType == user.AuthTypePassword {
				if conf.Username != "" && conf.Password != "" {
					userConf := user.Configs{
						MqttServerURI:         fc.configs.MqttServerURI,
						MqttUsername:          fc.configs.MqttUsername,
						MqttPassword:          fc.configs.MqttPassword,
						MqttTopicGlobalPrefix: fc.configs.MqttTopicGlobalPrefix,
						MqttClientIdPrefix:    fc.configs.MqttClientIdPrefix,
						TlsCertDir:            fc.configs.TlsCertDir,
						EnableCbSupport:       fc.configs.EnableCbSupport,
					}
					fc.userProfiles.AddUser(conf.Username,conf.Password,conf.AuthType,userConf)
				}
				fc.auth.SetAuthType(conf.AuthType)
				err = fc.userProfiles.SaveUserDB()
			}else if conf.AuthType == user.AuthTypeCode || conf.AuthType == user.AuthTypeNone {
				fc.auth.SetAuthType(conf.AuthType)
				err = fc.userProfiles.SaveUserDB()
			}else {
				state = "error"
			}

			log.Debugf("App reconfigured . New parameters : %v", fc.configs)

			configReport := model.ConfigReport{
				OpStatus: state,
				AppState:  *fc.appLifecycle.GetAllStates(),
			}
			msg := fimpgo.NewMessage("evt.app.config_report",model.ServiceName,fimpgo.VTypeObject,configReport,nil,nil,newMsg.Payload)
			if err := fc.mqt.RespondToRequest(newMsg.Payload,msg); err != nil {
				fc.mqt.Publish(adr,msg)
			}

		case "cmd.log.set_level":
			// Configure log level
			level, err := newMsg.Payload.GetStringValue()
			if err != nil {
				return
			}
			logLevel, err := log.ParseLevel(level)
			if err == nil {
				log.SetLevel(logLevel)
				fc.configs.LogLevel = level
				fc.configs.SaveToFile()
			}
			log.Info("Log level updated to = ", logLevel)

		}

	}

}

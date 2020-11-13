package discovery

import (
	"github.com/futurehomeno/fimpgo"
	"github.com/sirupsen/logrus"
)

const (
	ResourceTypeApp = "app"
	ResourceTypeAd  = "ad"

	AppCurrentStateNotConfigured = "NOT_CONFIGURED"
	AppCurrentStateRunning       = "RUNNING"
	AppCurrentStateERROR         = "ERROR"

)

type Resource struct {
	ResourceName           string            `json:"resource_name"`      // zigbee , fimpui
	ResourceType           string            `json:"resource_type"`      // ad - adapter , app -  application
	ResourceFullName       string            `json:"resource_full_name"` // full name is a name for app store or another registry
	Description            string            `json:"description"`
	Author                 string            `json:"author"`
	Version                string            `json:"version"`
	PackageName            string            `json:"package_name"` // in some cases package may have different name from service/resource name
	State                  string            `json:"state"`    // Current application state
	AppInfo                AppInfo           `json:"app_info"` // Either App or Adapter , it's defined by ResourceType
	AdapterInfo            AdapterInfo       `json:"adapter_info"`
	ConfigRequired         bool              `json:"config_required"` // if true , the adapter should be configured before it can be used
	Configs                map[string]string `json:"configs"`         // configurations params
	Props                  map[string]string `json:"props"`
	DocUrl                 string            `json:"doc_url"`                  // Url for
	IsInstanceConfigurable bool              `json:"is_instance_configurable"` // if true , the instance of adapter/app has to be configured before it can be used . false - adapter/app can be used without instance configuration
	InstanceId             string            `json:"instance_id"`              // Some system configurations can allow to run multiple instances of the same app or adapter , for instance multiple hubs under the same site and with radio module every hub
}
// Will be removed in future
type AppInfo struct {
}

// Will be removed in future
type AdapterInfo struct {
	FwVersion             string             `json:"fw_version"` // should be in Semantic Versioning format .
	Technology            string             `json:"technology"`
	HwDependency          map[string]string  `json:"hw_dependency"`           //  {"serialPort":"/dev/ttyUSB0"} ,
	NetworkManagementType string             `json:"network_management_type"` // "inclusion_exclusion", "inclusion_dev_remove" , "full_sync"
}

type ServiceDiscoveryResponder struct {
	mqt                   *fimpgo.MqttTransport
	resource              Resource
	discoveryRequestTopic string
	responderTopic        string
	requestsCh            fimpgo.MessageCh
	stopSignal            chan bool
}

func NewServiceDiscoveryResponder(mqt *fimpgo.MqttTransport) *ServiceDiscoveryResponder {
	inst := &ServiceDiscoveryResponder{mqt: mqt, discoveryRequestTopic: "pt:j1/mt:cmd/rt:discovery", responderTopic: "pt:j1/mt:evt/rt:discovery"}
	inst.stopSignal = make(chan bool)
	inst.requestsCh = make(fimpgo.MessageCh)
	return inst
}

// Start responder service listener
func (sr *ServiceDiscoveryResponder) Start() {
	sr.mqt.Subscribe(sr.discoveryRequestTopic)
	sr.mqt.RegisterChannelWithFilter("discovery-responder", sr.requestsCh, struct {
		Topic     string
		Service   string
		Interface string
	}{Topic: sr.discoveryRequestTopic, Service: "*", Interface: "*"})
	go sr.responder()
}

// Stop responder service listener
func (sr *ServiceDiscoveryResponder) Stop() {
	sr.stopSignal <- true
}

// RegisterResource should be invoked to register resource
func (sr *ServiceDiscoveryResponder) RegisterResource(res Resource) {
	sr.resource = res
}

func (sr *ServiceDiscoveryResponder) responder() {
	for {
		select {
		case <-sr.requestsCh:
			logrus.Debug("New responder request")
			msg := fimpgo.NewMessage("evt.discovery.report", "system", fimpgo.VTypeObject, sr.resource, nil, nil, nil)
			adr := fimpgo.Address{MsgType: fimpgo.MsgTypeEvt, ResourceType: fimpgo.ResourceTypeDiscovery}
			sr.mqt.Publish(&adr, msg)
		case <-sr.stopSignal:
			break
		}
	}
}

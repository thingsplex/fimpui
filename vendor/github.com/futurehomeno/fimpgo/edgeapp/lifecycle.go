package edgeapp

import (
	log "github.com/sirupsen/logrus"
	"sync"
)

const (
	SystemEventTypeEvent = "EVENT"
	SystemEventTypeState = "STATE"

	AppStateStarting      = "STARTING"
	AppStateStartupError  = "STARTUP_ERROR"
	AppStateNotConfigured = "NOT_CONFIGURED"
	AppStateError         = "ERROR"
	AppStateRunning       = "RUNNING"
	AppStateTerminate     = "TERMINATING"

	ConfigStateNotConfigured  = "NOT_CONFIGURED"
	ConfigStateConfigured     = "CONFIGURED"
	ConfigStatePartConfigured = "PART_CONFIGURED"
	ConfigStateInProgress     = "IN_PROGRESS"
	ConfigStateNA             = "NA"

	AuthStateNotAuthenticated = "NOT_AUTHENTICATED"
	AuthStateAuthenticated    = "AUTHENTICATED"
	AuthStateInProgress       = "IN_PROGRESS"
	AuthStateNA               = "NA"

	ConnStateConnecting   = "CONNECTING"
	ConnStateConnected    = "CONNECTED"
	ConnStateDisconnected = "DISCONNECTED"
	ConnStateNA           = "NA"

	//EventStarting            = "STARTING"
	EventConfiguring = "CONFIGURING" // All configurations loaded and brokers configured
	EventConfigError = "CONF_ERROR"  // All configurations loaded and brokers configured
	EventConfigured  = "CONFIGURED"  // All configurations loaded and brokers configured
	EventRunning     = "RUNNING"
)

type State string

type AppStates struct {
	App           string `json:"app"`
	Connection    string `json:"connection"`
	Config        string `json:"config"`
	Auth          string `json:"auth"`
	LastErrorText string `json:"last_error_text"`
	LastErrorCode string `json:"last_error_code"`
}

type SystemEvent struct {
	Type   string
	Name   string
	State  State
	Info   string
	Params map[string]string
}

type SystemEventChannel chan SystemEvent

type Lifecycle struct {
	busMux           sync.Mutex
	systemEventBus   map[string]SystemEventChannel
	appState         State
	previousAppState State
	connectionState  State
	authState        State
	configState      State
	lastError        string
}

func NewAppLifecycle() *Lifecycle {
	lf := &Lifecycle{systemEventBus: make(map[string]SystemEventChannel)}
	lf.appState = AppStateStarting
	lf.authState = AuthStateNA
	lf.configState = ConfigStateNotConfigured
	lf.connectionState = ConnStateNA
	return lf
}

func (al *Lifecycle) GetAllStates() *AppStates {
	appStates := AppStates{
		App:           string(al.appState),
		Connection:    string(al.connectionState),
		Config:        string(al.configState),
		Auth:          string(al.authState),
		LastErrorText: "",
		LastErrorCode: "",
	}
	return &appStates
}

func (al *Lifecycle) ConfigState() State {
	return al.configState
}

func (al *Lifecycle) SetConfigState(configState State) {
	log.Debug("<sysEvt> New CONFIG state = ", configState)
	al.configState = configState
}

func (al *Lifecycle) AuthState() State {
	return al.authState
}

func (al *Lifecycle) SetAuthState(authState State) {
	log.Debug("<sysEvt> New AUTH state = ", authState)
	al.authState = authState
}

func (al *Lifecycle) ConnectionState() State {
	return al.connectionState
}

func (al *Lifecycle) SetConnectionState(connectivityState State) {
	log.Debug("<sysEvt> New CONNECTION state = ", connectivityState)
	al.connectionState = connectivityState
}

func (al *Lifecycle) AppState() State {
	return al.appState
}

func (al *Lifecycle) LastError() string {
	return al.lastError
}

func (al *Lifecycle) SetLastError(lastError string) {
	al.lastError = lastError
}

func (al *Lifecycle) SetAppState(currentState State, params map[string]string) {
	al.busMux.Lock()
	al.previousAppState = al.appState
	al.appState = currentState
	log.Debug("<sysEvt> New APP state = ", currentState)
	for i := range al.systemEventBus {
		select {
		case al.systemEventBus[i] <- SystemEvent{Type: SystemEventTypeState, State: currentState, Info: "sys", Params: params}:
		default:
			log.Warnf("<sysEvt> State listener %s is busy , event dropped", i)
		}

	}
	al.busMux.Unlock()
}

func (al *Lifecycle) PublishSystemEvent(name, src string, params map[string]string) {
	event := SystemEvent{Name: name}
	al.Publish(event, src, params)
}

func (al *Lifecycle) Publish(event SystemEvent, src string, params map[string]string) {
	al.busMux.Lock()
	event.Type = SystemEventTypeEvent
	event.State = al.AppState()
	event.Params = params
	for i := range al.systemEventBus {
		select {
		case al.systemEventBus[i] <- event:
		default:
			log.Warnf("<sysEvt> Event listener %s is busy , event dropped", i)
		}

	}
	al.busMux.Unlock()
}

// Subscribe for app events
func (al *Lifecycle) Subscribe(subId string, bufSize int) SystemEventChannel {
	msgChan := make(SystemEventChannel, bufSize)
	al.busMux.Lock()
	al.systemEventBus[subId] = msgChan
	al.busMux.Unlock()
	return msgChan
}

// Unsubscribe from APP events
func (al *Lifecycle) Unsubscribe(subId string) {
	al.busMux.Lock()
	delete(al.systemEventBus, subId)
	al.busMux.Unlock()
}

// WaitForState blocks until target state is reached
func (al *Lifecycle) WaitForState(subId string, targetState State) {
	log.Debugf("<sysEvt> Waiting for state = %s , current state = %s", targetState, al.AppState())
	if al.AppState() == targetState {
		return
	}
	ch := al.Subscribe(subId, 5)
	for evt := range ch {
		if evt.Type == SystemEventTypeState && evt.State == targetState {
			al.Unsubscribe(subId)
			return
		}
	}
}

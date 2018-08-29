package tsdb

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
	"github.com/alivinco/thingsplex/model"
	"github.com/alivinco/thingsplex/registry"
)

// Integration is root level container
type Integration struct {
	processes []*Process
	// in memmory copy of config file
	processConfigs  []ProcessConfig
	StoreLocation   string
	storeFullPath   string
	Name            string
	configSaveMutex *sync.Mutex
	registry *registry.ThingRegistryStore
}

// GetProcessByID returns process by it's ID
func (it *Integration) GetProcessByID(ID IDt) *Process {
	for i := range it.processes {
		if it.processes[i].Config.ID == ID {
			return it.processes[i]
		}
	}
	return nil
}

// GetDefaultIntegrConfig returns default config .
func (it *Integration) GetDefaultIntegrConfig() []ProcessConfig {

	selector := []Selector{
		{ID: 1, Topic: "pt:j1/mt:evt/rt:dev/#"},
		{ID: 2, Topic: "pt:j1/mt:cmd/rt:dev/#"},
		{ID: 3, Topic: "pt:j1/mt:evt/rt:app/#"},
		{ID: 4, Topic: "pt:j1/mt:cmd/rt:app/#"},

	}
	//filters := []Filter{
	//	{
	//		ID:            1,
	//		MsgType:       "evt.sensor.report",
	//		IsAtomic:      true,
	//		MeasurementID: "sensor",
	//	},
	//	{
	//		ID:            2,
	//		MsgType:       "evt.binary.report",
	//		IsAtomic:      true,
	//		MeasurementID: "binary",
	//	},
	//	{
	//		ID:       3,
	//		MsgType:  "evt.meter.report",
	//		IsAtomic: true,
	//		MeasurementID: "meter",
	//	}, {
	//		ID:       4,
	//		MsgType:  "evt.open.report",
	//		IsAtomic: true,
	//		MeasurementID: "open",
	//	}, {
	//		ID:       5,
	//		MsgType:  "evt.presence.report",
	//		IsAtomic: true,
	//		MeasurementID: "presence",
	//	},
	//	{
	//		ID:            6,
	//		MsgType:       "evt.lvl.report",
	//		IsAtomic:      true,
	//		MeasurementID: "binary",
	//	},
	//}

	var filters []Filter


	measurements := []Measurement{
		//{
		//	ID:                      "sensor",
		//	RetentionPolicyDuration: "8w",
		//	RetentionPolicyName:     "sensor_8w",
		//	UseServiceAsMeasurementName:true,
		//},
		//{
		//	ID:                      "binary",
		//	RetentionPolicyDuration: "8w",
		//	RetentionPolicyName:     "binary_8w",
		//	UseServiceAsMeasurementName:true,
		//},
		//{
		//	ID:                      "presence",
		//	RetentionPolicyDuration: "8w",
		//	RetentionPolicyName:     "presence_8w",
		//	UseServiceAsMeasurementName:true,
		//},
		//{
		//	ID:                      "contact",
		//	RetentionPolicyDuration: "8w",
		//	RetentionPolicyName:     "contact_8w",
		//	UseServiceAsMeasurementName:true,
		//},
		//{
		//	ID:                      "meter",
		//	RetentionPolicyDuration: "8w",
		//	RetentionPolicyName:     "meter_8w",
		//	UseServiceAsMeasurementName:true,
		//},
		{
			ID:                      "default",
			RetentionPolicyDuration: "8w",
			RetentionPolicyName:     "default_8w",
			UseServiceAsMeasurementName:true,
		},
	}
	config := ProcessConfig{
		ID:                 1,
		MqttBrokerAddr:     "tcp://localhost:1883",
		MqttBrokerUsername: "",
		MqttBrokerPassword: "",
		MqttClientID:       "",
		InfluxAddr:         "http://localhost:8086",
		InfluxUsername:     "",
		InfluxPassword:     "",
		InfluxDB:           "iotmsg",
		BatchMaxSize:       1000,
		SaveInterval:       1000,
		Filters:            filters,
		Selectors:          selector,
		Measurements:       measurements,
	}

	return []ProcessConfig{config}

}

// Init initilizes integration app
func (it *Integration) Init() {
	it.storeFullPath = filepath.Join(it.StoreLocation, it.Name+".json")
}


// SetConfig config setter
func (it *Integration) SetConfig(processConfigs []ProcessConfig) {
	it.processConfigs = processConfigs
}

// UpdateProcConfig update process configurations
func (it *Integration) UpdateProcConfig(ID IDt, procConfig ProcessConfig, doRestart bool) error {
	proc := it.GetProcessByID(ID)
	err := proc.Configure(procConfig, doRestart)
	if err != nil {
		return err
	}
	err = it.SaveConfigs()
	return err
}

// LoadConfig loads integration configs from json file and saves it into ProcessConfigs
func (it *Integration) LoadConfig() error {


	if it.configSaveMutex == nil {
		it.configSaveMutex = &sync.Mutex{}
	}
	if _, err := os.Stat(it.storeFullPath); os.IsNotExist(err) {
		it.processConfigs = it.GetDefaultIntegrConfig()
		log.Info("Integration configuration is loaded from default.")
		return it.SaveConfigs()
	}
	payload, err := ioutil.ReadFile(it.storeFullPath)
	if err != nil {
		log.Errorf("Integration can't load configuration file from %s, Errro:%s", it.storeFullPath, err)
		return err
	}
	err = json.Unmarshal(payload, &it.processConfigs)
	if err != nil {
		log.Error("Can't load the integration cofig.Unmarshall error :", err)
	}
	return err

}

// SaveConfigs saves configs to json file
func (it *Integration) SaveConfigs() error {
	if it.StoreLocation != "" {

		it.configSaveMutex.Lock()
		defer func() {
			it.configSaveMutex.Unlock()
		}()
		payload, err := json.Marshal(it.processConfigs)
		if err != nil {
			return err
		}
		return ioutil.WriteFile(it.storeFullPath, payload, 0777)

	}
	log.Info("Save to disk was skipped , StoreLocation is empty")
	return nil
}

// InitProcesses loads and starts ALL processes based on ProcessConfigs
func (it *Integration) InitProcesses() error {
	if it.processConfigs == nil {
		return errors.New("Load configurations first.")
	}
	for i := range it.processConfigs {
		it.InitNewProcess(&it.processConfigs[i])
	}
	return nil
}

// InitNewProcess initialize and start single process
func (it *Integration) InitNewProcess(procConfig *ProcessConfig) error {

	proc := NewProcess(procConfig,it.registry)
	it.processes = append(it.processes, proc)
	if procConfig.Autostart {
		err := proc.Init()
		if err == nil {
			log.Infof("Process ID=%d was initialized.", procConfig.ID)
			err := proc.Start()
			if err != nil {
				log.Errorf("Process ID=%d failed to start . Error : %s", procConfig, err)
			}

		} else {
			log.Errorf("Initialization of Process ID=%d FAILED . Error : %s", procConfig.ID, err)
			return err
		}
	}
	return nil
}

// AddProcess adds new process .
func (it *Integration) AddProcess(procConfig ProcessConfig) (IDt, error) {
	defaultProc := it.GetDefaultIntegrConfig()
	procConfig.ID = GetNewID(it.processConfigs)
	if len(procConfig.Filters) == 0 {
		procConfig.Filters = defaultProc[0].Filters
	}
	if len(procConfig.Selectors) == 0 {
		procConfig.Selectors = defaultProc[0].Selectors
	}
	if len(procConfig.Measurements) == 0 {
		procConfig.Measurements = defaultProc[0].Measurements
	}
	it.processConfigs = append(it.processConfigs, procConfig)
	it.SaveConfigs()
	return procConfig.ID, it.InitNewProcess(&procConfig)
}

// RemoveProcess stops process , removes it from config file and removes instance .
func (it *Integration) RemoveProcess(ID IDt) error {
	var err error
	// removing process instance
	for i := range it.processes {
		if it.processes[i].Config.ID == ID {
			err = it.processes[i].Stop()
			it.processes = append(it.processes[:i], it.processes[i+1:]...)
			break
		}
	}
	// removing from config file
	for ic := range it.processConfigs {
		if it.processConfigs[ic].ID == ID {
			it.processConfigs = append(it.processConfigs[:ic], it.processConfigs[ic+1:]...)
			break
		}
	}
	if err == nil {
		it.SaveConfigs()

	}
	return err
}

// Boot initializes integration
func Boot(mainConfig *model.FimpUiConfigs , restHandler *echo.Echo,registry *registry.ThingRegistryStore) *Integration {
	log.Info("<tsdb>Booting InfluxDB integration ")
	if mainConfig.ProcConfigStorePath == "" {
		log.Info("<tsdb> Config path path is not defined  ")
		return nil
	}
	integr := Integration{Name: "influxdb", StoreLocation: mainConfig.ProcConfigStorePath,registry:registry}
	integr.Init()
	integr.LoadConfig()
	integr.InitProcesses()
	if restHandler != nil {
		restAPI := IntegrationAPIRestEndp{&integr, restHandler}
		restAPI.SetupRoutes()
	}
	return &integr
}

package tsdb

import (
	"fmt"
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	influx "github.com/influxdata/influxdb/client/v2"
	"github.com/alivinco/fimpgo"
	"github.com/alivinco/thingsplex/registry"
)

// Process implements integration flow between messaging system and influxdb timeseries database.
// It inserts events into db
type Process struct {
	mqttTransport *fimpgo.MqttTransport
	influxC     influx.Client
	Config      *ProcessConfig
	batchPoints map[string]influx.BatchPoints
	ticker      *time.Ticker
	writeMutex  *sync.Mutex
	apiMutex    *sync.Mutex
	transform   Transform
	State       string
	LastError   string
	registry *registry.ThingRegistryStore
}

// NewProcess is a constructor
func NewProcess(config *ProcessConfig,registry *registry.ThingRegistryStore) *Process {
	proc := Process{Config: config, transform: DefaultTransform}
	proc.writeMutex = &sync.Mutex{}
	proc.apiMutex = &sync.Mutex{}
	proc.State = "LOADED"
	proc.registry = registry
	return &proc
}

// Init doing the process bootrstrap .
func (pr *Process) Init() error {
	var err error
	pr.State = "INIT_FAILED"
	log.Info("<tsdb>Initializing influx client.")
	pr.influxC, err = influx.NewHTTPClient(influx.HTTPConfig{
		Addr:     pr.Config.InfluxAddr, //"http://localhost:8086",
		Username: pr.Config.InfluxUsername,
		Password: pr.Config.InfluxPassword,
	})
	if err != nil {
		log.Fatalln("Error: ", err)
		return err
	}
	// Creating database
	log.Info("<tsdb> Setting up database")
	q := influx.NewQuery(fmt.Sprintf("CREATE DATABASE %s", pr.Config.InfluxDB), "", "")
	if response, err := pr.influxC.Query(q); err == nil && response.Error() == nil {
		log.Infof("<tsdb> Database %s was created with status :%s", pr.Config.InfluxDB, response.Results)
	} else {
		pr.LastError = "InfluxDB is not reachable .Check connection parameters."
		return err
	}
	// Setting up retention policies
	log.Info("Setting up retention policies")
	for _, mes := range pr.GetMeasurements() {
		if mes.RetentionPolicyName == "" {
			mes.RetentionPolicyName = fmt.Sprintf("bf_%s", mes.ID)
		}
		q := influx.NewQuery(fmt.Sprintf("CREATE RETENTION POLICY %s ON %s DURATION %s REPLICATION 1", mes.RetentionPolicyName, pr.Config.InfluxDB, mes.RetentionPolicyDuration), pr.Config.InfluxDB, "")
		if response, err := pr.influxC.Query(q); err == nil && response.Error() == nil {
			log.Infof("<tsdb> Retention policy %s was created with status :%s", mes.RetentionPolicyName, response.Results)
		} else {
			log.Errorf("<tsdb> Configuration of retention policy %s failed with status : %s ", mes.RetentionPolicyName, response.Error())
		}
	}

	pr.batchPoints = make(map[string]influx.BatchPoints)
	err = pr.InitBatchPoint("")
	if err != nil {
		log.Fatalln("Error: ", err)
	}

	log.Info("<tsdb> DB initialization completed.")
	log.Info("<tsdb> Initializing MQTT adapter.")
	//"tcp://localhost:1883", "blackflowint", "", ""
	pr.mqttTransport = fimpgo.NewMqttTransport(pr.Config.MqttBrokerAddr,pr.Config.MqttClientID,pr.Config.MqttBrokerUsername, pr.Config.MqttBrokerPassword,true,1,1)
	pr.mqttTransport.SetMessageHandler(pr.OnMessage)
	log.Info("<tsdb> MQTT adapter initialization completed.")
	pr.State = "INITIALIZED"
	return nil
}

// OnMessage is invoked by an adapter on every new message
// The code is executed in callers goroutine
func (pr *Process) OnMessage(topic string, addr *fimpgo.Address , iotMsg *fimpgo.FimpMessage, rawMessage []byte) {
	// log.Debugf("New msg of class = %s", iotMsg.Class
	context := &MsgContext{time:time.Now()}
	if pr.registry != nil {
		context.service, _ = pr.registry.GetServiceByFullAddress(topic)
	}
	if pr.filter(context, topic, iotMsg, addr.GlobalPrefix, 0) {
		msg, err := pr.transform(context, topic, iotMsg, addr.GlobalPrefix)

		if err != nil {
			log.Errorf("<tsdb> Transformation error: %s", err)
		} else {
			if msg != nil {
				pr.write(context, msg)
			} else {
				log.Debug("<tsdb> Message can't be mapped .Skipping .")
			}

		}
	} else {
		log.Debugf("<tsdb> Message from topic %s is skiped .", topic)
	}
}

// AddMessage is invoked by an adapter on every new message
// Is used by batch loader
// The code is executed in callers goroutine
func (pr *Process) AddMessage(topic string, addr *fimpgo.Address , iotMsg *fimpgo.FimpMessage, modTime time.Time) {
	// log.Debugf("New msg of class = %s", iotMsg.Class
	context := &MsgContext{time:modTime}
	if pr.filter(context, topic, iotMsg, addr.GlobalPrefix, 0) {
		msg, err := pr.transform(context, topic, iotMsg, addr.GlobalPrefix)

		if err != nil {
			log.Errorf("<tsdb> Transformation error: %s", err)
		} else {
			if msg != nil {
				pr.write(context, msg)
			} else {
				log.Debug("<tsdb> Message can't be mapped .Skipping .")
			}

		}
	} else {
		log.Debugf("<tsdb> Message from topic %s is skiped .", topic)
	}
}


// Filter - transforms IotMsg into DB compatable struct
func (pr *Process) filter(context *MsgContext, topic string, iotMsg *fimpgo.FimpMessage, domain string, filterID IDt) bool {
	var result bool
	// no filters defines , everything is allowed
	if len(pr.Config.Filters)==0 {
		measure := pr.Config.getMeasurementByID("default")
		context.measurementName = iotMsg.Service+"."+iotMsg.Type
		if measure == nil {
			log.Errorf("<tsdb> Measurement either is not defined or provided ID is wrong.")
			return false
		}
		context.measurement = measure
		return true
	}
	for i := range pr.Config.Filters {
		if (pr.Config.Filters[i].IsAtomic && filterID == 0) || (pr.Config.Filters[i].ID == filterID) {

			result = true
			//////////////////////////////////////////////////////////
			if pr.Config.Filters[i].Topic != "" {
				if topic != pr.Config.Filters[i].Topic {
					result = false
				}
			}
			if pr.Config.Filters[i].Domain != "" {
				if domain != pr.Config.Filters[i].Domain {
					result = false
				}
			}
			if pr.Config.Filters[i].MsgType != "" {
				if iotMsg.Type != pr.Config.Filters[i].MsgType {
					result = false
				}
			}
			if pr.Config.Filters[i].Service != "" {
				if iotMsg.Service != pr.Config.Filters[i].Service {
					result = false
				}
			}

			////////////////////////////////////////////////////////////
			if pr.Config.Filters[i].Negation {
				result = !(result)
			}
			if pr.Config.Filters[i].LinkedFilterID != 0 {
				// filters chaining
				// log.Debug("Starting recursion. Current result = ", result)
				nextResult := pr.filter(context, topic, iotMsg, domain, pr.Config.Filters[i].LinkedFilterID)
				// log.Debug("Nested call returned ", nextResult)
				switch pr.Config.Filters[i].LinkedFilterBooleanOperation {
				case "or":
					result = result || nextResult
				case "and":
					result = result && nextResult

				}
			}

			//////////////////////////////////////////////////////////////
			if result {
				context.filterID = pr.Config.Filters[i].ID
				measure := pr.Config.getMeasurementByID(pr.Config.Filters[i].MeasurementID)
				if measure == nil {
					log.Errorf("<tsdb> Measurement either is not defined or provided ID is wrong.")
					return false
				}
				context.measurement = measure
				if measure.UseServiceAsMeasurementName {
					context.measurementName = iotMsg.Service+"."+iotMsg.Type
				}else {
					context.measurementName = measure.Name
				}
				// log.Debugf("There is match with filter %+v", filter)
				return true
			}
			if filterID != 0 {
				break
			}

		}
	}

	return false
}

func (pr *Process) getRetentionPolicyName(measurementName string ) string {
	for i := range pr.Config.Measurements {
		if pr.Config.Measurements[i].ID == measurementName {
			return pr.Config.Measurements[i].RetentionPolicyName
		}
	}
	return "default"
}

func (pr *Process) write(context *MsgContext, point *influx.Point) {
	log.Debugf("<tsdb> Writing measurement: %s", context.measurementName)
	// log.Debugf("Point: %+v", point)
	if context.measurementName != "" {
		pr.writeMutex.Lock()
		pr.batchPoints[context.measurement.ID].AddPoint(point)
		pr.writeMutex.Unlock()
		if len(pr.batchPoints[context.measurement.ID].Points()) >= pr.Config.BatchMaxSize {
			pr.WriteIntoDb()
		}
	}
}

// Configure should be used to replace new set of filters and selectors with new set .
// Process should be restarted after Configure call
func (pr *Process) Configure(procConfig ProcessConfig, doRestart bool) error {
	// pr.Config.Selectors = selectors
	// pr.Config.Filters = filters
	*pr.Config = procConfig
	if doRestart {
		pr.Stop()
		return pr.Start()
	}
	return nil
}

// InitBatchPoint initializes new batch point or resets existing one .
func (pr *Process) InitBatchPoint(bpName string) error {
	measurements := pr.GetMeasurements()
	var retentionPolicyName string
	var err error

	for mi := range measurements {
		if measurements[mi].ID == bpName || bpName == "" {
			retentionPolicyName = measurements[mi].RetentionPolicyName
			// Create a new point batch
			pr.batchPoints[measurements[mi].ID], err = influx.NewBatchPoints(influx.BatchPointsConfig{
				Database:        pr.Config.InfluxDB,
				Precision:       "ns",
				RetentionPolicy: retentionPolicyName,
			})
			if bpName != "" {
				return err
			}
		}
	}

	return err
}

// WriteIntoDb - inserts record into db
func (pr *Process) WriteIntoDb() {
	// Mutex is needed to fix condition when the function is invoked by timer and batch size almost at the same time
	defer func() {
		pr.writeMutex.Unlock()
	}()
	pr.writeMutex.Lock()

	for bpKey := range pr.batchPoints {
		if len(pr.batchPoints[bpKey].Points()) == 0 {
			continue
		}
		log.Debugf("<tsdb> Writing batch of size = %d , using retention policy = %s into db = %s", len(pr.batchPoints[bpKey].Points()), pr.batchPoints[bpKey].RetentionPolicy(), pr.batchPoints[bpKey].Database())
		var err error
		err = pr.influxC.Write(pr.batchPoints[bpKey])
		if err != nil {
			log.Error("<tsdb> Batch write error: ", err)
		}
		err = pr.InitBatchPoint(bpKey)

		if err != nil {
			log.Fatalln("Error: ", err)
		}
	}
}

// Start starts the process by starting MQTT adapter ,
// starting scheduler
func (pr *Process) Start() error {
	log.Info("<tsdb> Starting process...")
	// try to initialize process first if current state is not INITIALIZED
	if pr.State == "INIT_FAILED" || pr.State == "LOADED" {
		if err := pr.Init(); err != nil {
			return err
		}
	}
	pr.ticker = time.NewTicker(time.Millisecond * pr.Config.SaveInterval)
	go func() {
		for _ = range pr.ticker.C {
			pr.WriteIntoDb()
		}
	}()
	err := pr.mqttTransport.Start()
	if err != nil {
		log.Fatalln("Error: ", err)
		return err
	}
	for _, selector := range pr.Config.Selectors {
		pr.mqttTransport.Subscribe(selector.Topic)
	}
	pr.State = "RUNNING"
	log.Info("<tsdb> Process started. State = RUNNING ")
	return nil

}

// Stop stops the process by unsubscribing from all topics ,
// stops scheduler and stops adapter.
func (pr *Process) Stop() error {
	log.Info("<tsdb> Stopping process...")
	pr.ticker.Stop()

	for _, selector := range pr.Config.Selectors {
		pr.mqttTransport.Unsubscribe(selector.Topic)
	}
	pr.influxC.Close()
	pr.mqttTransport.Stop()
	pr.State = "STOPPED"
	log.Info("<tsdb> Process stopped")
	return nil
}

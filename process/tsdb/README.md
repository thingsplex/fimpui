### MQTT event stream dump into InfluxDB

**Message processing pipeline** : 
````


                        ------------------
                        |                |
       -----SUB---------|   Selectors    |
       |                | (subsriptions) |
       |                ------------------
      \|/ 
---------------             ------------                    -------------                      ---------                 ---------------       
|             |             |          |                    |           |                      |       |                 |   DataPoint |        
| MQTT broker | ---MSG----> |  Filters | --Context+IotMsg-->| Transform |--Context+DataPoint-->| Write | ---DataPoint--> |     Batch   |
|             |             |          |                    |           |                      |       |                 |             |       
---------------             ------------                    -------------                      ---------                 ---------------       
																															  |	
                           ------------------------Batch size trigger----------------------------------------------------------
                           |
                          \|/
                      --------------           ------------
   ---------          |   Write    |           |          |
   | Timer |--------->|   Batch    |---BATCH-->| InfluxDB |
   ---------          |            |           |          |
                      --------------           ------------





````

**Process configuration**

````                      

                          ------------------------------------------------
                          | ProcessConfig,Selectors,Filters,Measurements | 
                          ------------------------------------------------
                               |
                              \|/ 
----------------         ------------------------          -------------
| MQTT broker  |-------->| Process A instance 1 |--------->| InfluxDB  | 
|              |         |                      |          |           |
----------------         ------------------------          -------------

                          ------------------------------------------------
                          | ProcessConfig,Selectors,Filters,Measurements | 
                          ------------------------------------------------
                               |
                              \|/ 
----------------         ------------------------          -------------
| MQTT broker  |-------->| Process A instance 2 |--------->| InfluxDB  | 
|              |         |                      |          |           |
----------------         ------------------------          -------------

````
Configuration data model :

````

   --------------------------                                               
   |     ProcessConfig      |
   |________________________|
     |                 |
    /|\               /|\
-------------    ------------ 
| Selectors |    |  Filters | 
-------------    ------------ 
                    |    /|\
                    |     |
                    -------

````  
Process lifecycle : 

```
INIT_FAILED -> INITIALIZED -> RUNNING ->STOPPED

```


Filter structure : 

```
type Filter struct {
	ID          int
	Name        string
	Topic       string
	Domain      string
	MsgType     string
	MsgClass    string
	MsgSubClass string
	// If true then returns everythin except matching value
	Negation bool
	// Boolean operation between 2 filters , supported values : and , or
	LinkedFilterBooleanOperation string
	LinkedFilterID               int
	IsAtomic                     bool
	// Optional field , all tags defined here will be converted into influxDb tags
	Tags map[string]string
	// If set , then the value will overrride default measurement name defined in transformation
	MeasurementName string
	// definies if filter is temporary and can be stored in memory or persisted to disk
	InMemory bool
}
```

Selector structure :

``` 
type Selector struct {
	ID    IDt
	Topic string
	// definies if filter is temporary and can be stored in memory or persisted to disk
	InMemory bool
}
```

Tags : 
 TODO 

Measurement structure : 

```
// Measurement stores measurement specific configs like retention policy
type Measurement struct {
	Name string
	// Normally should be composed of Name + RetentionPolicy , for instance : sensor_1d
	RetentionPolicyName string
	// Have to be in format 1d , 1w , 1h .
	RetentionPolicyDuration string
}

```

Process config :

```
type ProcessConfig struct {
	ID                 string
	MqttBrokerAddr     string
	MqttClientID       string
	MqttBrokerUsername string
	MqttBrokerPassword string
	InfluxAddr         string
	InfluxUsername     string
	InfluxPassword     string
	InfluxDB           string
	// DataPoints are saved in batches .
	// Batch is sent to DB once it reaches BatchMaxSize or SaveInterval .
	// depends on what comes first .
	BatchMaxSize int
	// Interval in miliseconds
	SaveInterval time.Duration
	Filters      []Filter
	Selectors    []Selector
	Measurements []Measurement
}

```

Message context :
```
type MsgContext struct {
	FilterID        IDt
	MeasurementName string
}

```

Admin REST endpoints :

- GET /blackflowint/influxdb/api/proc/:id
- GET /blackflowint/influxdb/api/proc/monitoring
- DELETE /blackflowint/influxdb/api/proc/:id
- PUT /blackflowint/influxdb/api/proc
- POST /blackflowint/influxdb/api/proc/:id
- POST /blackflowint/influxdb/api/proc/:id/ctl
- GET /blackflowint/influxdb/api/proc/:id/filters
- PUT /blackflowint/influxdb/api/proc/:id/filters
- DELETE /blackflowint/influxdb/api/proc/:id/filters/:fid
- GET /blackflowint/influxdb/api/proc/:id/selectors
- PUT /blackflowint/influxdb/api/proc/:id/selectors
- ELETE /blackflowint/influxdb/api/proc/:id/selectors/:sid

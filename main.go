package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"runtime"

	log "github.com/Sirupsen/logrus"
	"github.com/alivinco/thingsplex/integr/fhcore"
	"github.com/alivinco/thingsplex/integr/logexport"
	"github.com/alivinco/thingsplex/integr/mqtt"
	"github.com/alivinco/thingsplex/integr/zwave"
	"github.com/alivinco/thingsplex/model"
	"github.com/alivinco/thingsplex/process"
	"github.com/alivinco/thingsplex/process/tsdb"
	"github.com/alivinco/thingsplex/statsdb"
	flow "github.com/alivinco/tpflow/flow"
	fmodel "github.com/alivinco/tpflow"
	"github.com/alivinco/tpflow/registry"
	fapi"github.com/alivinco/tpflow/api"
	"github.com/alivinco/thingsplex/utils"
	"github.com/koding/websocketproxy"
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"gopkg.in/natefinch/lumberjack.v2"
	"strconv"
	"strings"
	//_ "net/http/pprof"
	"os/exec"
)

type SystemInfo struct {
	Version string
}

// SetupLog configures default logger
// Supported levels : info , degug , warn , error
func SetupLog(logfile string, level string) {
	//log.SetFormatter(&log.TextFormatter{FullTimestamp: true, ForceColors: false,TimestampFormat:"2006-01-02T15:04:05.999"})
	log.SetFormatter(&log.JSONFormatter{TimestampFormat:"2006-01-02 15:04:05.999"})
	logLevel, err := log.ParseLevel(level)
	if err == nil {
		log.SetLevel(logLevel)
	} else {
		log.SetLevel(log.DebugLevel)
	}

	if logfile != "" {
		l := lumberjack.Logger{
			Filename:   logfile,
			MaxSize:    5, // megabytes
			MaxBackups: 2,
		}
		log.SetOutput(&l)
	}

}

func startWsCoreProxy(backendUrl string) {
	defer func() {
		if r := recover(); r != nil {
			log.Error("!!!!!!!!!!!!!WsCoreProxy crashed with panic!!!!!!!!!!!", r)
		}
	}()
	u, _ := url.Parse(backendUrl)
	http.Handle("/", http.FileServer(http.Dir("static/fhcore")))
	http.Handle("/ws", websocketproxy.ProxyHandler(u))
	err := http.ListenAndServe(":8082", nil)
	if err != nil {
		fmt.Print(err)
	}
}

func main() {
	// pprof server
	//go func() {
	//	log.Println(http.ListenAndServe("localhost:6060", nil))
	//}()
	configs := &model.FimpUiConfigs{}
	var configFile string
	flag.StringVar(&configFile, "c", "", "Config file")
	flag.Parse()
	if configFile == "" {
		configFile = "/opt/fimpui/config.json"
	} else {
		fmt.Println("Loading configs from file ", configFile)
	}
	configFileBody, err := ioutil.ReadFile(configFile)
	err = json.Unmarshal(configFileBody, configs)
	if err != nil {
		panic("Can't load config file.")
	}

	SetupLog(configs.LogFile, configs.LogLevel)
	log.Info("--------------Starting FIMPUI----------------")

	//---------THINGS REGISTRY-------------
	log.Info("<main>-------------- Starting Things registry ")
	thingRegistryStore := registry.NewThingRegistryStore(configs.RegistryDbFile)
	log.Info("<main> Started ")
	//-------------------------------------
	//---------FLOW------------------------

	fconfig := fmodel.Configs{
		MqttServerURI:configs.MqttServerURI,
		MqttClientIdPrefix:configs.MqttClientIdPrefix,
		MqttUsername: configs.MqttUsername,
		MqttPassword:configs.MqttPassword,
		ContextStorageDir:configs.ContextStorageDir,
		FlowStorageDir:configs.FlowStorageDir,
		ConnectorStorageDir:configs.ConnectorStorageDir,
		MqttTopicGlobalPrefix:configs.MqttTopicGlobalPrefix,
		RegistryDbFile:configs.RegistryDbFile,
		LogFile:configs.LogFile,
		LogLevel:configs.LogLevel,
	}
	log.Info("<main> Starting Flow manager")
	flowManager, err := flow.NewManager(fconfig)
	if err != nil {
		log.Error("Can't Init Flow manager . Error :", err)
	}
	flowManager.GetConnectorRegistry().AddConnection("thing_registry","thing_registry","thing_registry",thingRegistryStore)
	err = flowManager.LoadAllFlowsFromStorage()
	if err != nil {
		log.Error("Can't load Flows from storage . Error :", err)
	}
	log.Info("<main> Started")
	//-------------------------------------

	//---------REGISTRY INTEGRATION--------
	log.Info("<main>-------------- Starting MqttIntegration ")
	mqttRegInt := registry.NewMqttIntegration(&fconfig, thingRegistryStore)
	mqttRegInt.InitMessagingTransport()
	log.Info("<main> Started ")
	//---------STATS STORE-----------------
	log.Info("<main>-------------- Stats store ")
	statsStore := statsdb.NewStatsStore("stats.db")
	streamProcessor := statsdb.NewStreamProcessor(configs,statsStore)
	streamProcessor.InitMessagingTransport()
	log.Info("<main> Started ")

	//----------VINCULUM CLIENT------------
	log.Info("<main>-------------- Starting VinculumClient ")
	vinculumClient := fhcore.NewVinculumClient(configs.VinculumAddress)
	err = vinculumClient.Start()
	if err != nil {
		log.Error("<main> Can't connect to Vinculum")
	} else {
		log.Info("<main> Started ")
	}
    // --------VINCULUM ADAPTER------------
	log.Info("<main>-------------- Starting VinculumAdapter ")
	vinculumAd := fhcore.NewVinculumAdapter(configs,vinculumClient)
	vinculumAd.InitMessagingTransport()

	//---------GOOGLE OBJECT STORE---------
	log.Info("<main>-------------- Initializing Google Object Store ")
	objectStorage, _ := logexport.NewGcpObjectStorage("fh-cube-log")
	log.Info("<main> Done ")
	//-------------------------------------
	sysInfo := SystemInfo{}
	versionFile, err := ioutil.ReadFile("VERSION")
	if err == nil {
		sysInfo.Version = string(versionFile)
	}
	//--------VINCULUM PROXY----------------
	coreUrl := "ws://" + configs.VinculumAddress
	go startWsCoreProxy(coreUrl)
	//--------------------------------------
	var brokerAddress string
	var isSSL bool
	if strings.Contains(configs.MqttServerURI,"ssl") {
		brokerAddress = strings.Replace(configs.MqttServerURI, "ssl://", "", -1)
		isSSL = true
	}else {
		brokerAddress = strings.Replace(configs.MqttServerURI, "tcp://", "", -1)
		isSSL = false
	}
	wsUpgrader := mqtt.WsUpgrader{brokerAddress,isSSL}
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	fapi.NewContextApi(flowManager.GetGlobalContext(),e)
	fapi.NewFlowApi(flowManager,e)
	fapi.NewRegistryApi(thingRegistryStore,e)



	// Uncomment the line below to enable Time Series exporter.
	tsdb.Boot(configs,e,thingRegistryStore)

	e.GET("/fimp/system-info", func(c echo.Context) error {

		return c.JSON(http.StatusOK, sysInfo)
	})
	e.GET("/fimp/api/configs", func(c echo.Context) error {
		return c.JSON(http.StatusOK, configs)
	})
	e.GET("/fimp/fr/upload-log-snapshot", func(c echo.Context) error {

		//logexport.UploadLogToGcp()
		//files := []string {"/var/log/daily.out"}
		hostAlias := c.QueryParam("hostAlias")
		log.Info(hostAlias)
		if hostAlias == "" {
			hostAlias = "unknown"
		}
		uploadStatus := objectStorage.UploadLogSnapshot(configs.ReportLogFiles, hostAlias, configs.ReportLogSizeLimit)
		return c.JSON(http.StatusOK, uploadStatus)
	})
	e.GET("/fimp/api/fr/upload-file", func(c echo.Context) error {

		files := []string {c.QueryParam("fileName")}
		hostAlias := c.QueryParam("hostAlias")
		log.Info(hostAlias)
		if hostAlias == "" {
			hostAlias = "unknown"
		}
		uploadStatus := objectStorage.UploadLogSnapshot(files, hostAlias, 0)
		return c.JSON(http.StatusOK, uploadStatus)
	})

	e.GET("/fimp/api/fr/run-cmd", func(c echo.Context) error {

		cmd := c.QueryParam("cmd")
		out, err := exec.Command("bash", "-c", cmd).Output()
		result := map[string]string{"result":"","error":""}

		if err != nil {
			log.Error(err)
			result["result"] = err.Error()
		}else {
			result["result"] = string(out)
		}
		return c.JSON(http.StatusOK, result)
	})

	e.GET("/fimp/api/get-log", func(c echo.Context) error {

		limitS := c.QueryParam("limit")
		limit , err := strconv.Atoi(limitS)
		if err != nil {
			limit = 10000
		}
		flowId := c.QueryParam("flowId")

		//out, err := exec.Command("bash", "-c", cmd).Output()
		//result := map[string]string{"result":"","error":""}
		filter := utils.LogFilter{FlowId:flowId}
		result := utils.GetLogs(configs.LogFile,&filter,int64(limit),true)

		return c.Blob(http.StatusOK,"text/plain", result)
	})

	e.GET("/fimp/api/get-site-info", func(c echo.Context) error {
		siteId := utils.GetFhSiteId("")
		siteInfoResponse := struct {
			SiteId string
		}{SiteId:siteId}

		return c.JSON(http.StatusOK, siteInfoResponse)
	})

	e.POST("/fimp/api/zwave/products/upload-to-cloud", func(c echo.Context) error {
		cloud,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		err = cloud.UploadProductCacheToCloud()
		if err == nil {
			return c.NoContent(http.StatusOK)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/zwave/products/list-local-templates", func(c echo.Context) error {
		templateType := c.QueryParam("type")
		returnStable := true
		if templateType == "cache" {
			returnStable = false
		}

		cloud,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		if err != nil {
			//return c.JSON(http.StatusInternalServerError, err)
			log.Error("<main> Can't connect to cloud store ")
		}

		templates,err := cloud.ListTemplates(returnStable)
		if err == nil {
			return c.JSON(http.StatusOK,templates)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/zwave/products/template", func(c echo.Context) error {
		templateType := c.QueryParam("type")
		fileName := c.QueryParam("name")
		returnStable := true
		if templateType == "cache" {
			returnStable = false
		}

		store,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		template , err :=store.GetTemplate(returnStable,fileName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}

		if err == nil {
			return c.Blob(http.StatusOK,"application/json",template)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.POST("/fimp/api/zwave/products/template-op/:operation/:name", func(c echo.Context) error {
		operation := c.Param("operation")
		name := c.Param("name")
		store,_  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		var err error
		switch operation {
		case "move":
			err = store.MoveToStable(name)
		case "upload":
			err = store.UploadSingleProductToStageCloud(name)
		}
		if err != nil {
			return c.JSON(http.StatusInternalServerError,err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.DELETE("/fimp/api/zwave/products/template/:type/:name", func(c echo.Context) error {
		templateType := c.Param("type")
		templateName := c.Param("name")
		var isStable bool
		switch templateType {
		case "cache":
			isStable = false
		case "stable":
			isStable = true
		default:
			return c.NoContent(http.StatusInternalServerError)

		}
		store,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		err = store.DeleteTemplate(isStable,templateName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError,err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.POST("/fimp/api/zwave/products/template/:type/:name", func(c echo.Context) error {
		templateType := c.Param("type")
		templateName := c.Param("name")
		var isStable bool
		switch templateType {
		case "cache":
			isStable = false
		case "stable":
			isStable = true
		default:
			return c.NoContent(http.StatusInternalServerError)

		}
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}
		store,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		err = store.UpdateTemplate(isStable,templateName,body)
		if err != nil {
			return c.JSON(http.StatusInternalServerError,err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.POST("/fimp/api/zwave/products/download-from-cloud", func(c echo.Context) error {
		cloud,err  := zwave.NewProductCloudStore( configs.ZwaveProductTemplates,"fh-products")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		prodNames,err := cloud.DownloadProductsFromCloud()
		if err == nil {
			return c.JSON(http.StatusOK,prodNames)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/stats/event-log", func(c echo.Context) error {

		pageSize := 1000
		page := 0
		pageSize, _ = strconv.Atoi(c.QueryParam("pageSize"))
		page, _ = strconv.Atoi(c.QueryParam("page"))
		statsErrors, err := statsStore.GetEvents(pageSize,page)

		if err == nil {
			return c.JSON(http.StatusOK, statsErrors)
		} else {
			log.Error("Faild to fetch errors ",err)
			return c.JSON(http.StatusInternalServerError, err)
		}

	})
	//ClearDb

	e.POST("/fimp/api/stats/drop-eventsdb", func(c echo.Context) error {
		err := statsStore.DropDb()
		if err == nil {
			return c.JSON(http.StatusOK,err)
		} else {
			log.Error("Faild to drop db ",err)
			return c.JSON(http.StatusInternalServerError, err)
		}

	})



	e.GET("/fimp/api/stats/metrics/counters", func(c echo.Context) error {

		result := make(map[string]interface{})
		result["restart_time"] = statsStore.GetResetTime()
		result["metrics"] = statsStore.GetCounterMetrics()

		if err == nil {
			return c.JSON(http.StatusOK, result)
		} else {
			log.Error("Faild to fetch errors ",err)
			return c.JSON(http.StatusInternalServerError, err)
		}

	})

	e.GET("/fimp/api/stats/metrics/meters", func(c echo.Context) error {

		result := make(map[string]interface{})
		result["restart_time"] = statsStore.GetResetTime()
		result["metrics"] = statsStore.GetMeterMetrics()

		if err == nil {
			return c.JSON(http.StatusOK, result)
		} else {
			log.Error("Faild to fetch errors ",err)
			return c.JSON(http.StatusInternalServerError, err)
		}

	})





	//e.POST("/fimp/api/registry/service-fields", func(c echo.Context) error {
	//	// The service update only selected fields and not entire object
	//	service := registry.Service{}
	//	err := c.Bind(&service)
	//	if err == nil {
	//		log.Info("<REST> Saving service fields")
	//		thingRegistryStore.UpsertService(&service)
	//		return c.NoContent(http.StatusOK)
	//	} else {
	//		log.Info("<REST> Can't bind service")
	//		return c.JSON(http.StatusInternalServerError, err)
	//	}
	//})
	//
	//e.POST("/fimp/api/registry/thing-fields", func(c echo.Context) error {
	//	// The service update only selected fields and not entire object
	//	thing := registry.Thing{}
	//	err := c.Bind(&thing)
	//	if err == nil {
	//		log.Info("<REST> Saving thing fields")
	//		thingRegistryStore.UpsertThing(&thing)
	//		return c.NoContent(http.StatusOK)
	//	} else {
	//		log.Info("<REST> Can't bind thing")
	//		return c.JSON(http.StatusInternalServerError, err)
	//	}
	//})

	e.GET("/fimp/vinculum/devices", func(c echo.Context) error {
		resp, _ := vinculumClient.GetMessage([]string{"device"})
		return c.JSON(http.StatusOK, resp.Msg.Data.Param.Device)
	})
	e.GET("/fimp/api/vinculum/areas", func(c echo.Context) error {
		resp, _ := vinculumClient.GetMessage([]string{"area"})
		return c.JSON(http.StatusOK, resp.Msg.Data.Param.Area)
	})

	e.GET("/fimp/api/vinculum/shortcuts", func(c echo.Context) error {
		resp, _ := vinculumClient.GetShortcuts()
		return c.JSON(http.StatusOK, resp)
	})

	e.GET("/fimp/vinculum/import_to_registry", func(c echo.Context) error {
		process.LoadVinculumDeviceInfoToStore(thingRegistryStore, vinculumClient,mqttRegInt)
		return c.NoContent(http.StatusOK)
	})

	e.GET("/debug/mem", func(c echo.Context) error {
		memStats:= runtime.MemStats{}
		runtime.ReadMemStats(&memStats)
		return c.JSON(http.StatusOK,memStats)
	})

	index := "static/fimpui/dist/index.html"
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:4200","http://127.0.0.1:4200", "http:://localhost:8082"},
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE},
	}))
	//e.Use(middleware.BasicAuth(func(username, password string, c echo.Context) (bool, error) {
	//	if username == "fh" && password == "Hemmelig1" {
	//		return true, nil
	//	}
	//	return false, nil
	//}))
	e.GET("/mqtt", wsUpgrader.Upgrade)
	e.File("/fimp", index)
	//e.File("/fhcore", "static/fhcore.html")
	e.File("/fimp/zwave-man", index)
	e.File("/fimp/settings", index)
	e.File("/fimp/timeline", index)
	e.File("/fimp/ikea-man", index)
	e.File("/fimp/systems-man", index)
	e.File("/fimp/flow/context", index)
	e.File("/fimp/flow/overview", index)
	e.File("/fimp/flow/flow/editor/*", index)
	e.File("/fimp/flight-recorder", index)
	e.File("/fimp/thing-view/*", index)
	e.File("/fimp/registry/things/*", index)
	e.File("/fimp/registry/services/*", index)
	e.File("/fimp/registry/locations", index)
	e.File("/fimp/registry/admin", index)
	e.Static("/fimp/static", "static/fimpui/dist/")

	e.Logger.Debug(e.Start(":8081"))
	//e.Shutdown(context.Background())
	log.Info("Exiting the app")


}

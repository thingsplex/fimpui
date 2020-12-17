package main

import (
	"encoding/base64"
	"flag"
	"fmt"
	"github.com/alivinco/thingsplex/api"
	"github.com/alivinco/thingsplex/integr/mqtt"
	"github.com/alivinco/thingsplex/integr/zwave"
	"github.com/alivinco/thingsplex/model"
	"github.com/alivinco/thingsplex/utils"
	"github.com/futurehomeno/fimpgo/edgeapp"
	"github.com/gorilla/securecookie"
	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	log "github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
	"io/ioutil"
	"net/http"
	"runtime"
)

type SystemInfo struct {
	Version    string
	WsMqttPort int
}

type LoginRequest struct {
	Username   string `json:"username" form:"username" query:"username"`
	Password   string `json:"password" form:"password" query:"password"`
	RePassword string `json:"re_password" form:"re_password" query:"re_password"`
	AuthType   string `json:"auth_type" form:"auth_type" query:"auth_type"`
}

// SetupLog configures default logger
// Supported levels : info , degug , warn , error
func SetupLog(logfile string, level string) {
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true, ForceColors: true, TimestampFormat: "2006-01-02T15:04:05.999"})
	//log.SetFormatter(&log.JSONFormatter{TimestampFormat: "2006-01-02 15:04:05.999"})
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

func ConfigureTpFlowApi(configs *model.Configs,e *echo.Echo)  {
	return
}


func main() {
	// pprof server
	//go func() {
	//	log.Println(http.ListenAndServe("localhost:6060", nil))
	//}()
	var port int
	var workDir string
	flag.StringVar(&workDir, "c", "", "Work dir")
	flag.IntVar(&port, "p", 8081, "Port")
	flag.Parse()
	if workDir == "" {
		workDir = "./"
	} else {
		fmt.Println("Work dir = ", workDir)
	}
	configs := model.NewConfigs(workDir)
	if err := configs.LoadFromFile();err != nil {
		log.Error("<main> Failed to load configs from file . Err:",err)
		return
	}
	SetupLog(configs.LogFile, configs.LogLevel)
	log.Info("--------------Starting FIMPUI----------------")
	log.Info("---------------------------------------------")

	log.Info("<main> Started")
	log.Info("<main> Broker address:",configs.MqttServerURI)
	//-------------------------------------

	sysInfo := SystemInfo{}
	sysInfo.WsMqttPort = port
	versionFile, err := ioutil.ReadFile("VERSION")
	if err == nil {
		sysInfo.Version = string(versionFile)
	}
	//--------------------------------------

	authType := "password"
	if configs.IsDevMode {
		authType = api.AuthTypeNone
	}
	auth := api.NewAuth(configs.GetDataDir(), authType)
	auth.LoadUserDB()

	lifecycle := edgeapp.NewAppLifecycle()
	lifecycle.SetConfigState(edgeapp.ConfigStateConfigured)
	lifecycle.SetAppState(edgeapp.AppStateRunning,nil)
	lifecycle.SetConnectionState(edgeapp.ConnStateConnected)

	controlApi := api.NewAppControlApiRouter(nil,lifecycle,configs,auth)
	if !configs.IsDevMode {
		controlApi.Start()
	}

	// TODO : Move to sessions
	wsUpgrader := mqtt.NewWsUpgrader(configs.MqttServerURI, auth,configs.TlsCertDir)

	wsBridge := mqtt.NewWsBridge(auth)

	userConf := model.UserConfigs{
		Username:              "unknown",
		MqttServerURI:         configs.MqttServerURI,
		MqttUsername:          configs.MqttUsername,
		MqttPassword:          configs.MqttPassword,
		MqttTopicGlobalPrefix: configs.MqttTopicGlobalPrefix,
		MqttClientIdPrefix:    configs.MqttClientIdPrefix,
		TlsCertDir:            configs.TlsCertDir,
	}
	wsBridge.UpdateUserConfig("unknown",userConf)

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	log.Info("My outbound IP = ",utils.GetOutboundIP())

	if configs.CookieKey == "" {
		cookie := securecookie.GenerateRandomKey(32)
		configs.CookieKey =  base64.StdEncoding.EncodeToString(cookie)
		configs.SaveToFile()
	}

 	bCookie,err := base64.StdEncoding.DecodeString(configs.CookieKey)
	if err != nil {
		log.Error("Can't decode cookie.Err:",err.Error())
	}
	e.Use(session.Middleware(sessions.NewCookieStore(bCookie)))

	e.GET("/fimp/login",  func(c echo.Context) error {
		c.Response().Header().Set("Cache-Control","no-store")
		if auth.IsUserDdEmpty() {
			c.Redirect(http.StatusMovedPermanently, "/fimp/auth-config")
		}else {
			c.File("static/misc/login.html")
		}
		return nil
	})
	e.POST("/fimp/login", func(c echo.Context) error {
		req := LoginRequest{}
		if err := c.Bind(&req); err != nil {
			return fmt.Errorf("invalid request format")
		}
		log.Info("Login request from user ", req.Username)
		if auth.Authenticate(req.Username, req.Password) {
			auth.SaveUserToSession(c, req.Username)
			c.Redirect(http.StatusMovedPermanently, "/fimp/analytics/dashboard")
		} else {
			c.HTML(http.StatusUnauthorized, "Unauthorized access")
		}
		return err
	})

	e.GET("/fimp/logout", func(c echo.Context) error {
		log.Info("User logged out")
		auth.LogoutUsers(c)
		c.Response().Header().Set("Cache-Control","no-store")
		return c.HTML(http.StatusOK, "User has been logged out from the system")
	})

	e.POST("/fimp/auth-config", func(c echo.Context) error {
		req := LoginRequest{}
		if err := c.Bind(&req); err != nil {
			return fmt.Errorf("invalid request format")
		}
		if req.Password != req.RePassword {
			return c.HTML(http.StatusOK, "Passwords don't match. Try again.")
		}
		log.Info("Auth config request from user ", req.Username)
		if auth.IsRequestAuthenticated(c,false) || auth.IsUserDdEmpty() {
			auth.SetAuthType(req.AuthType)
			auth.AddUser(req.Username, req.Password)
			err := auth.SaveUserDB()
			if err != nil {
				log.Error("<main> Can't save new user to disk. Err:",err.Error())
			}
			auth.SaveUserToSession(c, req.Username)
			c.Redirect(http.StatusMovedPermanently, "/fimp/analytics/dashboard")
		} else {
			c.HTML(http.StatusUnauthorized, "Unauthorized access")
		}
		return err
	})

	e.GET("/fimp/system-info", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		return c.JSON(http.StatusOK, sysInfo)
	})
	e.GET("/fimp/api/configs", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		return c.JSON(http.StatusOK, configs)
	})

	e.POST("/fimp/api/configs", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}

		req:= model.Configs{}
		if err := c.Bind(&req); err != nil {
			log.Error("Invalid configuration request format .Err:",err.Error())
			return fmt.Errorf("invalid request format")
		}
		configs.MqttServerURI = req.MqttServerURI
		configs.MqttUsername = req.MqttUsername
		configs.MqttPassword = req.MqttPassword
		configs.MqttTopicGlobalPrefix = req.MqttTopicGlobalPrefix
		err = configs.SaveToFile()
		if err != nil {
			log.Error("Failed to save config file. Err:",err.Error())
		}
		wsUpgrader.UpdateBrokerConfig(configs.MqttServerURI)

		userConf := model.UserConfigs{
			Username:              "unknown",
			MqttServerURI:         configs.MqttServerURI,
			MqttUsername:          configs.MqttUsername,
			MqttPassword:          configs.MqttPassword,
			MqttTopicGlobalPrefix: configs.MqttTopicGlobalPrefix,
			MqttClientIdPrefix:    configs.MqttClientIdPrefix,
			TlsCertDir:            configs.TlsCertDir,
		}
		wsBridge.UpdateUserConfig("unknown",userConf)

		return c.JSON(http.StatusOK, configs)
	})

	//e.GET("/fimp/api/get-log", func(c echo.Context) error {
	//	if !auth.IsRequestAuthenticated(c,true) {
	//		return nil
	//	}
	//	limitS := c.QueryParam("limit")
	//	limit , err := strconv.Atoi(limitS)
	//	if err != nil {
	//		limit = 10000
	//	}
	//	flowId := c.QueryParam("flowId")
	//
	//	//out, err := exec.Command("bash", "-c", cmd).Output()
	//	//result := map[string]string{"result":"","error":""}
	//	filter := utils.LogFilter{FlowId:flowId}
	//	result := utils.GetLogs(configs.LogFile,&filter,int64(limit),true)
	//
	//	return c.Blob(http.StatusOK,"text/plain", result)
	//})

	e.GET("/fimp/api/get-apps-from-playgrounds", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		resp, err := http.Get("https://app-store.s3-eu-west-1.amazonaws.com/registry/list.json")
		defer resp.Body.Close()
		c.Stream(http.StatusOK, "application/json", resp.Body)
		return err
	})

	e.GET("/fimp/api/get-site-info", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		siteId := utils.GetFhSiteId("")
		if siteId == "" {
			siteId = "unknown"
		}
		siteInfoResponse := struct {
			SiteId string
		}{SiteId: siteId}

		return c.JSON(http.StatusOK, siteInfoResponse)
	})


	e.GET("/fimp/api/zwave/products/list-local-templates", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		templateType := c.QueryParam("type")
		returnStable := true
		if templateType == "cache" {
			returnStable = false
		}

		cloud, err := zwave.NewProductCloudStore(configs.ZwaveProductTemplates, "fh-products")
		if err != nil {
			//return c.JSON(http.StatusInternalServerError, err)
			log.Error("<main> Can't connect to cloud store ")
		}

		templates, err := cloud.ListTemplates(returnStable)
		if err == nil {
			return c.JSON(http.StatusOK, templates)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/zwave/products/template", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		templateType := c.QueryParam("type")
		fileName := c.QueryParam("name")
		returnStable := true
		if templateType == "cache" {
			returnStable = false
		}

		store, err := zwave.NewProductCloudStore(configs.ZwaveProductTemplates, "fh-products")
		template, err := store.GetTemplate(returnStable, fileName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}

		if err == nil {
			return c.Blob(http.StatusOK, "application/json", template)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.POST("/fimp/api/zwave/products/template-op/:operation/:name", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		operation := c.Param("operation")
		name := c.Param("name")
		store, _ := zwave.NewProductCloudStore(configs.ZwaveProductTemplates, "fh-products")
		var err error
		switch operation {
		case "move":
			err = store.MoveToStable(name)
		case "upload":
		}
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.DELETE("/fimp/api/zwave/products/template/:type/:name", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
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
		store, err := zwave.NewProductCloudStore(configs.ZwaveProductTemplates, "fh-products")
		err = store.DeleteTemplate(isStable, templateName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.POST("/fimp/api/zwave/products/template/:type/:name", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
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
		store, err := zwave.NewProductCloudStore(configs.ZwaveProductTemplates, "fh-products")
		err = store.UpdateTemplate(isStable, templateName, body)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.GET("/debug/mem", func(c echo.Context) error {
		if !auth.IsRequestAuthenticated(c,true) {
			return nil
		}
		memStats := runtime.MemStats{}
		runtime.ReadMemStats(&memStats)
		return c.JSON(http.StatusOK, memStats)
	})

	index := "static/fimpui/dist/index.html"
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:4200", "http://127.0.0.1:4200", "https://app-store.s3-eu-west-1.amazonaws.com"},
		AllowMethods: []string{echo.GET, echo.PUT, echo.POST, echo.DELETE},
	}))

	e.GET("/mqtt", wsUpgrader.Upgrade)
	e.GET("/ws-bridge", wsBridge.Upgrade)
	e.File("/fimp", index)
	e.File("/", index)
	e.File("/fimp/auth-config", "static/misc/auth-config.html")
	e.File("/fimp/zwave-man", index)
	e.File("/fimp/zigbee-man", index)
	e.File("/fimp/settings", index)
	e.File("/fimp/timeline", index)
	e.File("/fimp/ikea-man", index)
	e.File("/fimp/generic-ad-man", index)
	e.File("/fimp/systems-man", index)
	e.File("/fimp/flow/context", index)
	e.File("/fimp/flow/overview", index)
	e.File("/fimp/flow/editor/*", index)
	e.File("/fimp/flight-recorder", index)
	e.File("/fimp/thing-view/*", index)
	e.File("/fimp/analytics/*", index)
	e.File("/fimp/registry/things/*", index)
	e.File("/fimp/registry/devices/*", index)
	e.File("/fimp/registry/services/*", index)
	e.File("/fimp/registry/locations", index)
	e.File("/fimp/stats/angrydog", index)
	e.File("/fimp/registry/admin", index)
	e.Static("/fimp/static", "static/fimpui/dist/")
	e.Static("/fimp/help", "static/help/")
	e.Static("/fimp/misc", "static/misc/")
	e.Static("/fimp/libs", "static/libs/")

	e.Logger.Debug(e.Start(fmt.Sprintf(":%d", port)))
	//e.Shutdown(context.Background())
	log.Info("Exiting the app")

}

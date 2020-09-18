package model

import (
	"encoding/json"
	"fmt"
	"github.com/alivinco/thingsplex/utils"
	"github.com/labstack/gommon/log"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"
)



type Configs struct {
	path                  string
	MqttServerURI         string `json:"mqtt_server_uri"`
	MqttUsername          string `json:"mqtt_server_username"`
	MqttPassword          string `json:"mqtt_server_password"`
	MqttTopicGlobalPrefix string `json:"mqtt_topic_global_prefix"`
	MqttClientIdPrefix    string `json:"mqtt_client_id_prefix"`
	LogFile               string `json:"log_file"`
	LogLevel              string `json:"log_level"`
	ZwaveProductTemplates string `json:"zwave_product_templates"`
	IsDevMode             bool   `json:"is_dev_mode"`
	AuthMode              string `json:"auth_mode"`
	WorkDir               string `json:"-"`
	ConfiguredAt          string `json:"configured_at"`
	ConfiguredBy          string `json:"configured_by"`
	CookieKey             string `json:"cookie_key"`
}

func NewConfigs(workDir string) *Configs {
	conf := &Configs{WorkDir: workDir}
	conf.path = filepath.Join(workDir,"data","config.json")
	if !utils.FileExists(conf.path) {
		log.Info("Config file doesn't exist.Loading default config")
		defaultConfigFile := filepath.Join(workDir,"defaults","config.json")
		err := utils.CopyFile(defaultConfigFile,conf.path)
		if err != nil {
			fmt.Print(err)
			panic("Can't copy config file.")
		}
	}
	return conf
}

func (cf * Configs) LoadFromFile() error {
	configFileBody, err := ioutil.ReadFile(cf.path)
	if err != nil {
		return err
	}
	err = json.Unmarshal(configFileBody, cf)
	if err != nil {
		return err
	}
	return nil
}

func (cf *Configs) SaveToFile() error {
	cf.ConfiguredBy = "auto"
	cf.ConfiguredAt = time.Now().Format(time.RFC3339)
	bpayload, err := json.Marshal(cf)
	err = ioutil.WriteFile(cf.path, bpayload, 0664)
	if err != nil {
		return err
	}
	return err
}

func (cf *Configs) GetDataDir()string {
	return filepath.Join(cf.WorkDir,"data")
}

func (cf *Configs) GetDefaultDir()string {
	return filepath.Join(cf.WorkDir,"defaults")
}

func (cf * Configs) LoadDefaults()error {
	configFile := filepath.Join(cf.WorkDir,"data","config.json")
	os.Remove(configFile)
	log.Info("Config file doesn't exist.Loading default config")
	defaultConfigFile := filepath.Join(cf.WorkDir,"defaults","config.json")
	return utils.CopyFile(defaultConfigFile,configFile)
}

func (cf *Configs) IsConfigured()bool {
	// TODO : Add logic here
	return true
}


package model

type FimpUiConfigs struct {
	ReportLogFiles     []string `json:"report_log_files"`
	ReportLogSizeLimit int64    `json:"report_log_size_limit"`
	VinculumAddress    string   `json:"vinculum_address"`
	MqttServerURI      string   `json:"mqtt_server_uri"`
	MqttUsername       string   `json:"mqtt_server_username"`
	MqttPassword       string   `json:"mqtt_server_password"`
	MqttTopicGlobalPrefix string `json:"mqtt_topic_global_prefix"`
	FlowStorageDir     string 	`json:"flow_storage_dir"`
	RegistryDbFile     string   `json:"registry_db_file"`
	ContextStorageDir  string 	`json:"context_storage_dir"`
	MqttClientIdPrefix string   `json:"mqtt_client_id_prefix"`
	LogFile            string   `json:"log_file"`
	LogLevel           string   `json:"log_level"`
	ZwaveProductTemplates string `json:"zwave_product_templates"`
	ProcConfigStorePath string  `json:"proc_config_store_path"`
}

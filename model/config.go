package model

type FimpUiConfigs struct {
	MqttServerURI      string   `json:"mqtt_server_uri"`
	MqttUsername       string   `json:"mqtt_server_username"`
	MqttPassword       string   `json:"mqtt_server_password"`
	MqttTopicGlobalPrefix string `json:"mqtt_topic_global_prefix"`
	MqttClientIdPrefix string   `json:"mqtt_client_id_prefix"`
	LogFile            string   `json:"log_file"`
	LogLevel           string   `json:"log_level"`
	ZwaveProductTemplates string `json:"zwave_product_templates"`
}

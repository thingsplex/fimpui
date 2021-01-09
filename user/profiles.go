package user

import (
	"encoding/json"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
	"io/ioutil"
	"path"
	"sync"
)

type UserProfile struct {
	Username string  `json:"username"`
	Password string  `json:"password"`
	AuthType string  `json:"auth_type"`
	Configs  Configs `json:"configs"`
}

type Configs struct {
	MqttServerURI         string `json:"mqtt_server_uri"`
	MqttUsername          string `json:"mqtt_server_username"`
	MqttPassword          string `json:"mqtt_server_password"`
	MqttTopicGlobalPrefix string `json:"mqtt_topic_global_prefix"`
	MqttClientIdPrefix    string `json:"mqtt_client_id_prefix"`
	TlsCertDir            string `json:"tls_cert_dir"`
	privateKeyFileName    string `json:"private_key_file"`
	certFileName          string `json:"cert_file"`
	EnableCbSupport       bool   `json:"enable_cb_support"` // if set to true , session enables CloudBridge support. This is needed for connecting to FH hubs over cloud broker.
}

type ProfilesDB struct {
	userDbPath      string
	AuthType        string        // "none , password , code
	Users           []UserProfile `json:"users"`
	dbLock          sync.Mutex
	lastOneTimeCode string
}

func NewProfilesDB(dataDir,authType string) *ProfilesDB {
	prof := &ProfilesDB{userDbPath: path.Join(dataDir, "users.json"), AuthType: authType}
	prof.dbLock = sync.Mutex{}
	return prof
}

func (cf *ProfilesDB) LoadUserDB() error {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	configFileBody, err := ioutil.ReadFile(cf.userDbPath)
	if err != nil {
		return err
	}
	err = json.Unmarshal(configFileBody, cf)
	if err != nil {
		return err
	}
	return nil
}

func (cf *ProfilesDB) SaveUserDB() error {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	bpayload, err := json.Marshal(cf)
	err = ioutil.WriteFile(cf.userDbPath, bpayload, 0664)
	if err != nil {
		return err
	}
	return err
}

func (cf *ProfilesDB) AddUser(username, password , authType string,configs Configs) {
	usr := cf.GetUserProfileByName(username)
	if usr != nil {
		return // user alredy exists
	}
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	hashedPass := cf.hashPassword(password)
	cf.Users = append(cf.Users, UserProfile{Username: username, Password: hashedPass,AuthType: authType,Configs: configs})
}

func (cf *ProfilesDB) GetUserProfileByName(username string) *UserProfile {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	for i, _ := range cf.Users {
		if cf.Users[i].Username == username {
			return &cf.Users[i]
		}
	}
	return nil
}

func (cf *ProfilesDB) UpdatePassword(username, password string) {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	for i, _ := range cf.Users {
		if cf.Users[i].Username == username {
			cf.Users[i].Password = cf.hashPassword(password)
		}
	}
}

func (cf *ProfilesDB) IsUserDdEmpty() bool {
	if len(cf.Users) == 0 {
		return true
	}
	return false
}

func (cf *ProfilesDB) hashPassword(pass string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		log.Error("<auth> hash error:", err)
		return ""
	}
	return string(hash)
}
// loadLocalDefaults the method is to ensure backward compatebility
func (cf *ProfilesDB) LoadLocalDefaults() {
	defConf := Configs{
		MqttServerURI:         "tcp://localhost:1883",
		MqttUsername:          "",
		MqttPassword:          "",
		MqttClientIdPrefix:    "thingsplex",
	}
	var changed bool
	for i := range cf.Users {
		if cf.Users[i].Configs.MqttServerURI == "" { // this  is indication that Config section is not present in config file
			cf.Users[i].Configs = defConf
			log.Info("<prof> User config migration.Loading defaults. ")
			changed = true
		}
	}

	if changed {
		cf.SaveUserDB()
	}

}
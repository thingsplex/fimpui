package user

import (
	"encoding/json"
	"fmt"
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
	Configs  Configs `json:"configs"` // TODO : Extend it with array so user could have several config but only one active
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
	Users           []UserProfile `json:"users"`
	dbLock          sync.Mutex
	lastOneTimeCode string
}

func NewProfilesDB(dataDir string) *ProfilesDB {
	prof := &ProfilesDB{userDbPath: path.Join(dataDir, "users.json")}
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

// UpsertUserProfile upsert user profile and returns true if new user was added or false for update operation.
func (cf *ProfilesDB) UpsertUserProfile(username, password , authType string) bool {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	usr := cf.GetUserProfileByName(username)
	if usr != nil {
		if password != "" {
			usr.Password = cf.hashPassword(password)
		}

		if authType != "" {
			usr.AuthType = authType
		}
		return false // existing user updated
	}else {
		hashedPass := cf.hashPassword(password)
		cf.Users = append(cf.Users, UserProfile{Username: username, Password: hashedPass,AuthType: authType})
		return true // new user added
	}
}

func (cf *ProfilesDB) UpdateUserConfig(username string,config Configs) error {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	usr := cf.GetUserProfileByName(username)
	if usr == nil {
		return fmt.Errorf("user not found")
	}
	usr.Configs = config
	return nil
}


func (cf *ProfilesDB) GetUserProfileByName(username string) *UserProfile {
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
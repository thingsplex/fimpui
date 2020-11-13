package api

import (
	"encoding/json"
	"fmt"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
	"io/ioutil"
	"math/rand"
	"net/http"
	"path"
	"sync"
	"time"
)

const (
	AuthTypePassword = "password"
	AuthTypeNone     = "none"
	AuthTypeCode     = "code"
)

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Auth struct {
	userDbPath      string
	AuthType        string // "none , password , code
	Users           []User `json:"users"`
	dbLock          sync.Mutex
	lastOneTimeCode string
}

func NewAuth(dataDir, authType string) *Auth {
	return &Auth{userDbPath: path.Join(dataDir, "users.json"), AuthType: authType}
}

func (cf *Auth) LoadUserDB() error {
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

func (cf *Auth) SaveUserDB() error {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	bpayload, err := json.Marshal(cf)
	err = ioutil.WriteFile(cf.userDbPath, bpayload, 0664)
	if err != nil {
		return err
	}
	return err
}

func (cf *Auth) SaveUserToSession(c echo.Context, username string) {
	sess, _ := session.Get("tplex", c)
	sess.Values["username"] = username
	sess.Values["authenticated"] = true
	sess.Options.MaxAge = 7200 // time in seconds
	sess.Save(c.Request(), c.Response())
}

func (cf *Auth) LogoutUsers(c echo.Context) {
	sess, _ := session.Get("tplex", c)
	sess.Values["username"] = ""
	sess.Values["authenticated"] = false
	sess.Options.MaxAge = -1
	sess.Save(c.Request(), c.Response())
}

func (cf *Auth) IsRequestAuthenticated(c echo.Context, setResponseHeader bool) bool {
	if cf.AuthType == AuthTypeNone {
		return true
	}
	sess, err := session.Get("tplex", c)

	if err != nil {
		log.Info("<auth> Session error:", err.Error())
		return false
	}
	user, ok1 := sess.Values["username"]
	av := sess.Values["authenticated"]
	authenticated, aok := av.(bool)
	log.Debugf("<auth> User %s authenticated", user)
	if !ok1 || !aok || !authenticated {
		log.Info("<auth> Connection is not authenticated")
		if setResponseHeader {
			c.NoContent(http.StatusUnauthorized)
		}
		return false
	} else {
		return true
	}
}

func (cf *Auth) AddUser(username, password string) {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	hashedPass := cf.hashPassword(password)
	cf.Users = append(cf.Users, User{Username: username, Password: hashedPass})
}

func (cf *Auth) SetAuthType(atype string) {
	if atype == AuthTypeNone || atype == AuthTypeCode || atype == AuthTypePassword {
		cf.AuthType = atype
	}
}

func (cf *Auth) UpdatePassword(username, password string) {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	for i, _ := range cf.Users {
		if cf.Users[i].Username == username {
			cf.Users[i].Password = cf.hashPassword(password)
		}
	}
}

func (cf *Auth) IsUserDdEmpty() bool {
	if len(cf.Users) == 0 {
		return true
	}
	return false
}

//Authenticate authenticates user by login and password and returns success true/false
func (cf *Auth) Authenticate(username, password string) bool {
	cf.dbLock.Lock()
	defer cf.dbLock.Unlock()
	for _, usr := range cf.Users {
		switch cf.AuthType {
		case AuthTypePassword:
			if usr.Username == username {
				err := bcrypt.CompareHashAndPassword([]byte(usr.Password), []byte(password))
				if err != nil {
					return false
				}
				return true
			}
		case AuthTypeCode:
			return cf.AuthenticateCode(password)
		default:
			return true
		}
	}
	return false
}

func (cf *Auth) GenerateCode() string {
	rangeLower := 100000
	rangeUpper := 999999
	seed := rand.NewSource(time.Now().UnixNano())
	r := rand.New(seed)
	cf.lastOneTimeCode = fmt.Sprintf("%d",rangeLower+r.Intn(rangeUpper-rangeLower+1) )
	log.Debug("New LTP code = ",cf.lastOneTimeCode)
	return cf.lastOneTimeCode
}

func (cf *Auth) AuthenticateCode(code string) bool {
	if cf.lastOneTimeCode == code {
		cf.lastOneTimeCode = ""
		return true
	}
	log.Infof("LTP code dont match . Last code = %s , request code = %s",cf.lastOneTimeCode,code)
	return false
}

func (cf *Auth) hashPassword(pass string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		log.Error("<auth> hash error:", err)
		return ""
	}
	return string(hash)
}

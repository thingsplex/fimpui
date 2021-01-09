package user

import (
	"fmt"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
	"math/rand"
	"net/http"
	"time"
)

const (
	AuthTypePassword = "password"
	AuthTypeNone     = "none"
	AuthTypeCode     = "code"
)


type Auth struct {
	AuthType        string // "none , password , code
	userProfiles    *ProfilesDB
}

func NewAuth(authType string,userProfiles *ProfilesDB) *Auth {
	return &Auth{AuthType: authType,userProfiles: userProfiles}
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
	log.Debugf("<auth> UserProfile %s authenticated", user)
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

func (cf *Auth) GetSessionID(c echo.Context) string {
	sess, err := session.Get("tplex", c)
	if err != nil {
		log.Info("<auth> Session error:", err.Error())
		return ""
	}
	return sess.ID
}

func (cf *Auth) GetUsername(c echo.Context) string {
	sess, err := session.Get("tplex", c)
	if err != nil {
		log.Info("<auth> Session error:", err.Error())
		return ""
	}
	user, ok := sess.Values["username"]
	var userS string
	if ok {
		userS,_ = user.(string)
	}
	return userS
}

func (cf *Auth) SetAuthType(atype string) {
	if atype == AuthTypeNone || atype == AuthTypeCode || atype == AuthTypePassword {
		cf.AuthType = atype
	}
}

//Authenticate authenticates user by login and password and returns success true/false
func (cf *Auth) Authenticate(username, password string) bool {
	switch cf.AuthType {
		case AuthTypePassword:
			user := cf.userProfiles.GetUserProfileByName(username)
			if user != nil {
				err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
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
	return false
}

func (cf *Auth) GenerateCode() string {
	rangeLower := 100000
	rangeUpper := 999999
	seed := rand.NewSource(time.Now().UnixNano())
	r := rand.New(seed)
	lastOneTimeCode := fmt.Sprintf("%d",rangeLower+r.Intn(rangeUpper-rangeLower+1) )
	log.Debug("New LTP code = ",lastOneTimeCode)
	return lastOneTimeCode
}

func (cf *Auth) AuthenticateCode(code string) bool {
	//if cf.lastOneTimeCode == code {
	//	cf.lastOneTimeCode = ""
	//	return true
	//}
	//log.Infof("LTP code dont match . Last code = %s , request code = %s",cf.lastOneTimeCode,code)
	return false
}



package fhcore

import (
	"github.com/gorilla/websocket"
	"github.com/labstack/echo"
	"net/http"
)

var (
	upgrader = websocket.Upgrader{
		Subprotocols: []string{"mqtt"},
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

type CoreWsUpgrader struct {
	CoreWsAddres string
}

func (wu *CoreWsUpgrader) Upgrade(c echo.Context) error {
	//ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	//if err != nil {
	//	fmt.Println(err)
	//	return err
	//}
	//
	//fmt.Println("Upgraded ")

	return nil
}

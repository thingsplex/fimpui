package fhcore

import (
	"time"
	"encoding/json"
)

type VinculumMsg struct {
	Ver string `json:"ver"`
	Msg Msg    `json:"msg"`
}
type VinculumMsgRequest struct {
	Ver string `json:"ver"`
	Msg MsgRequest `json:"msg"`
}

type Msg struct {
	Type string `json:"type"`
	Src  string `json:"src"`
	Dst  string `json:"dst"`
	Data Data   `json:"data"`
}

type MsgRequest struct {
	Type string `json:"type"`
	Src  string `json:"src"`
	Dst  string `json:"dst"`
	Data DataRequest `json:"data"`
}

// Used to avoid recursion in UnmarshalJSON below.
type msg Msg
func (m *Msg) UnmarshalJSON(b []byte) (err error) {
	jmsg := msg{}
	//log.Debug("Unmarshaling JSON ")
	if err := json.Unmarshal(b, &jmsg); err == nil {
		*m = Msg(jmsg)
		return m.UnmarshalDataParam()
	}else {
		return err
	}
}

func (m *Msg) UnmarshalDataParam() error {
	//log.Debug("Unmarshaling DataParam ")
	//log.Debug("Type = ",m.Type)
	if m.Type == "notify" {
		switch m.Data.Component {
		case "device":
			devices := []Device{{}}
			if err := json.Unmarshal(m.Data.ParamRaw, &devices[0]); err != nil {
				return err
			}
			//log.Debug("Notify from device ")
			m.Data.Param.Device = devices
		case "room":
			rooms := []Room{{}}
			if err := json.Unmarshal(m.Data.ParamRaw, &rooms[0]); err != nil {
				return err
			}
			m.Data.Param.Room = rooms
		case "house":
			house := House{}
			if err := json.Unmarshal(m.Data.ParamRaw, &house); err != nil {
				return err
			}
			m.Data.Param.House = house
		case "shortcut":
			shortcut := []Shortcut{{}}
			if err := json.Unmarshal(m.Data.ParamRaw, &shortcut[0]); err != nil {
				return err
			}
			m.Data.Param.Shortcut = shortcut
		case "mode":
			//mode := []Mode{{}}
			//if err := json.Unmarshal(m.Data.ParamRaw, &shortcut[0]); err != nil {
			//	return err
			//}
			//m.Data.Param.Shortcut = shortcut
		}

	}else {
		var param Param
		if err := json.Unmarshal([]byte(m.Data.ParamRaw), &param); err != nil {
			//log.Debug("Unmarshaling Error ",err)
			return err
		}

		m.Data.Param = param
	}
	return nil
}

type Data struct {
	Errors    interface{} `json:"errors"`
	Cmd       string      `json:"cmd"`
	Component interface{} `json:"component"`
	ParamRaw  json.RawMessage `json:"param"`
	Param     Param       `json:"-"`
	RequestID int         `json:"requestId"`
	Success   bool        `json:"success"`
	Id        interface{} `json:"id,omitempty"`
}

type DataRequest struct {
	Errors    interface{} `json:"errors"`
	Cmd       string      `json:"cmd"`
	Component interface{} `json:"component"`
	Param     Param       `json:"param"`
	RequestID int         `json:"requestId"`
	Success   bool        `json:"success"`
	Id        interface{} `json:"id,omitempty"`
}


type Param struct {
	Mode       string   `json:"mode"`
	Components []string `json:"components"`
	Device     []Device `json:"device,omitempty"`
	Room       []Room   `json:"room,omitempty"`
	Area       []Area   `json:"area,omitempty"`
	House      House    `json:"house,omitempty"`
	Shortcut   []Shortcut `json:"shortcut,omitempty"`
}

type Fimp struct {
	Adapter string `json:"adapter"`
	Address string `json:"address"`
	Group   string `json:"group"`
}

type Client struct {
	Name string `json:"name"`
}

type Device struct {
	Fimp          Fimp                   `json:"fimp"`
	Client        Client                 `json:"client"`
	Functionality string                 `json:"functionality"`
	ID            int                    `json:"id"`
	Lrn           bool                   `json:"lrn"`
	Model         string                 `json:"model"`
	Param         map[string]interface{} `json:"param"`
	Problem       bool                   `json:"problem"`
	Room          int                    `json:"room"`
}

type House struct {
	Learning interface{} `json:"learning"`
	Mode     string      `json:"mode"`
	Time     time.Time   `json:"time"`
	Uptime   int         `json:"uptime"`
}

type Room struct {
	ID     int         `json:"id"`
	Param  interface{} `json:"param"`
	Client Client      `json:"client"`
	Type   string      `json:"type"`
}

type Area struct {
	ID     int         `json:"id"`
	Props  interface{} `json:"props"`
	Name   string      `json:"name"`
	Type   string      `json:"type"`
}


type Shortcut struct {
	ID     int    `json:"id"`
	Client Client `json:"client"`
}

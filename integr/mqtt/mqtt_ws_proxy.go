package mqtt

import (
	"crypto/tls"
	"github.com/alivinco/thingsplex/api"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"net"
	"net/http"
	//"encoding/hex"
	log "github.com/sirupsen/logrus"
	"io"
)

var (
	upgrader = websocket.Upgrader{
		Subprotocols: []string{"mqtt"},
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

// WebSockets begin life as a standard HTTP request and response. Within that request response chain,
// the client asks to open a WebSocket connection, and the server responds (if its able to).
// If this initial handshake is successful, the client and server have agreed to use the existing TCP/IP connection
// that was established for the HTTP request as a WebSocket connection. Data can now flow over this connection using a basic framed message protocol.
// Once both parties acknowledge that the WebSocket connection should be closed, the TCP connection is torn down.

type WsUpgrader struct {
	BrokerAddress string
	IsSSL         bool
	auth          *api.Auth
}

func NewWsUpgrader(brokerAddress string,auth *api.Auth, isSSL bool) *WsUpgrader {
	return &WsUpgrader{BrokerAddress: brokerAddress, IsSSL: isSSL,auth: auth}
}

func (wu *WsUpgrader) UpdateBrokerConfig(brokerAddress string, isSSL bool) {
	wu.BrokerAddress = brokerAddress
	wu.IsSSL = isSSL
}

func (wu *WsUpgrader) Upgrade(c echo.Context) error {
	defer func() {
		if r := recover(); r != nil {
			log.Error("!!!!!!!!!!! Mqtt WS proxy (Upgrade) crashed with panic!!!!!!!!!!!!!!!")
		}
	}()
	if !wu.auth.IsRequestAuthenticated(c,true) {
		return nil
	}

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)

	if err != nil {
		log.Error("<MqWsProxy> Can't upgrade . Error:", err)
		return err
	}

	log.Info("<MqWsProxy> Upgraded ")
	session := MqttWsProxySession{wsConn: ws, isSSL: wu.IsSSL}
	session.Connect(wu.BrokerAddress)
	session.WsReader()
	return nil
}

type MqttWsProxySession struct {
	wsConn     *websocket.Conn
	brokerConn net.Conn
	isSSL      bool
}

func (mp *MqttWsProxySession) Connect(address string) error {
	var err error
	if mp.isSSL {
		mp.brokerConn, err = tls.Dial("tcp", address, nil)
	} else {
		mp.brokerConn, err = net.Dial("tcp", address)
	}
	if err != nil {
		log.Error("<MqWsProxy> Can't connect to broker . Error :", err)
		return err
	}
	go mp.brokerReader()
	return nil
}

func (mp *MqttWsProxySession) WsReader() {

	defer mp.wsConn.Close()
	for {
		msgType, msg, err := mp.wsConn.ReadMessage()
		if err != nil {
			log.Error("<MqWsProxy> Read error :", err)
			break
		} else if msgType == websocket.BinaryMessage {
			//log.Debugf("Sending packet WS -> broker")
			//log.Debugf("%s", hex.Dump(msg))
			mp.brokerConn.Write(msg)
		} else {
			log.Debug(" Message with type = ", msgType)
		}

	}
	log.Info("<MqWsProxy> Quit from WsReader loop")
}

func (mp *MqttWsProxySession) brokerReader() {

	for {
		packet := make([]byte, 1)
		// reading header byte
		_, err := io.ReadFull(mp.brokerConn, packet)
		if err != nil {
			log.Error("<MqWsProxy> Can't read packets from broker error =", err)
			break
		}
		// reading length bytes
		packetLen, lenBytes := decodeLength2(mp.brokerConn)
		packet = append(packet, lenBytes...)
		// reading payload
		if packetLen > 0 {
			payload := make([]byte, packetLen)
			io.ReadFull(mp.brokerConn, payload)
			packet = append(packet, payload...)
		} else {
			//log.Debug("<MqWsProxy> Empty payload")
		}
		err = mp.wsConn.WriteMessage(websocket.BinaryMessage, packet)
		if err != nil {
			log.Error("<MqWsProxy> Write error :", err)
			mp.wsConn.Close()
			break
		}
	}

}

func decodeLength2(r io.Reader) (int, []byte) {
	var rLength uint32
	var multiplier uint32
	b := make([]byte, 1)
	var bytes []byte
	for {
		io.ReadFull(r, b)
		bytes = append(bytes, b...)
		digit := b[0]
		rLength |= uint32(digit&127) << multiplier
		if (digit & 128) == 0 {
			break
		}
		multiplier += 7
	}
	return int(rLength), bytes
}

package mqtt

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"github.com/alivinco/thingsplex/user"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"io/ioutil"
	"net"
	"net/http"
	"path/filepath"
	"strings"

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
	auth          *user.Auth
	certDir       string
}

func NewWsUpgrader(mqttServerURI string, auth *user.Auth,certDir string ) *WsUpgrader {
	upg := &WsUpgrader{auth: auth,certDir: certDir}
	upg.UpdateBrokerConfig(mqttServerURI)
	return upg
}

func (wu *WsUpgrader) UpdateBrokerConfig(mqttServerURI string) {
	var isSSL bool
	if strings.Contains(mqttServerURI, "ssl") {
		wu.BrokerAddress = strings.Replace(mqttServerURI, "ssl://", "", -1)
		isSSL = true
	} else {
		wu.BrokerAddress = strings.Replace(mqttServerURI, "tcp://", "", -1)
		isSSL = false
	}
	wu.IsSSL = isSSL
}
// Upgrade - the method is invoked by Echo on web request. This is the place where we convert HTTP request into WS connection
func (wu *WsUpgrader) Upgrade(c echo.Context) error {
	defer func() {
		if r := recover(); r != nil {
			log.Error("!!!!!!!!!!! WS-MQTT proxy (Upgrade) crashed with panic!!!!!!!!!!!!!!!")
		}
	}()
	if !wu.auth.IsRequestAuthenticated(c, true) {
		return nil
	}

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)

	if err != nil {
		log.Error("<MqWsProxy> Can't upgrade . Error:", err)
		return err
	}



	log.Info("<MqWsProxy> Upgraded ")
	session := MqttWsProxySession{wsConn: ws, isSSL: wu.IsSSL,certDir: wu.certDir}
	session.Connect(wu.BrokerAddress)
	session.WsReader()
	return nil
}

type MqttWsProxySession struct {
	wsConn     *websocket.Conn
	brokerConn net.Conn
	isSSL      bool
	certDir    string
}

func (mp *MqttWsProxySession) Connect(address string) error {
	var err error
	if mp.isSSL {
		err, config := mp.getAwsIotCoreTlsConfig()
		if err == nil {
			mp.brokerConn, err = tls.Dial("tcp", address, config)
		}
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

func (mp *MqttWsProxySession) getAwsIotCoreTlsConfig() (error, *tls.Config) {
	privateKeyFileName := filepath.Join(mp.certDir, "awsiot.private.key")
	certFileName := filepath.Join(mp.certDir, "awsiot.crt")
	TLSConfig := &tls.Config{InsecureSkipVerify: false}
	TLSConfig.NextProtos = []string{"x-amzn-mqtt-ca"}

	certPool, err := mp.getCACertPool()
	if err != nil {
		return err, nil
	}
	TLSConfig.RootCAs = certPool

	if certFileName != "" {
		certPool, err := mp.getCertPool(certFileName)
		if err != nil {
			return err, nil
		}
		TLSConfig.ClientAuth = tls.RequireAndVerifyClientCert
		TLSConfig.ClientCAs = certPool
	}
	if privateKeyFileName != "" {
		if certFileName == "" {
			return fmt.Errorf("key specified but cert is not specified"), nil
		}
		cert, err := tls.LoadX509KeyPair(certFileName, privateKeyFileName)
		if err != nil {
			return err, nil
		}
		TLSConfig.Certificates = []tls.Certificate{cert}
	}
	return nil, TLSConfig
}

// configuring certificate pool
func (mp *MqttWsProxySession) getCertPool(certFile string) (*x509.CertPool, error) {
	certs := x509.NewCertPool()
	pemData, err := ioutil.ReadFile(certFile)
	if err != nil {
		return nil, err
	}
	certs.AppendCertsFromPEM(pemData)
	log.Infof("Certificate is loaded.")
	return certs, nil
}

// configuring CA certificate pool
func (mp *MqttWsProxySession) getCACertPool() (*x509.CertPool, error) {
	certs := x509.NewCertPool()
	cafile := filepath.Join(mp.certDir, "root-ca-1.pem")
	pemData, err := ioutil.ReadFile(cafile)
	if err != nil {
		return nil, err
	}
	certs.AppendCertsFromPEM(pemData)

	cafile = filepath.Join(mp.certDir, "root-ca-2.pem")
	pemData, err = ioutil.ReadFile(cafile)
	certs.AppendCertsFromPEM(pemData)

	cafile = filepath.Join(mp.certDir, "root-ca-3.pem")
	pemData, err = ioutil.ReadFile(cafile)
	certs.AppendCertsFromPEM(pemData)
	log.Infof("CA certificates are loaded.")
	return certs, nil
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

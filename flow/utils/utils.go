package utils

import (
	"github.com/alivinco/thingsplex/flow/model"
	"github.com/dchest/uniuri"
	"github.com/pkg/errors"
	"strings"
	"github.com/ChrisTrenkamp/goxpath/tree/xmltree"
	"github.com/ChrisTrenkamp/goxpath"
	"github.com/labstack/gommon/log"
	"encoding/json"
	"github.com/oliveagle/jsonpath"
	"bytes"
	"strconv"
)

func GenerateId(len int) string {
	return uniuri.NewLen(len)
}

func ConfigValueToNumber(valueType string,value interface{})(float64,error){
	if valueType == "int" {
		switch val := value.(type) {
		case int64 :
			return float64(val),nil
		case float64:
			return val,nil
		default:
			return 0, errors.New("Can't convert interface{} to int64")

		}
	}else
	if valueType == "float" {
		floatVal,ok := value.(float64)
		if ok {
			return floatVal , nil
		}else {
			return 0, errors.New("Can't convert interface{} to float64")
		}
	}
	return 0,errors.New("Not numeric value type")
}

func MsgValueToNumber(msg *model.Message)(float64,error) {
	if msg.Payload.ValueType == "int" {
		intValue , err := msg.Payload.GetIntValue()
		if err  == nil {
			return float64(intValue) ,nil
		}
	}else if msg.Payload.ValueType == "float" {
		return msg.Payload.GetFloatValue()
	}
	return 0 , errors.New("Not numeric value type")
}

func match(route []string, topic []string) bool {
	if len(route) == 0 {
		if len(topic) == 0 {
			return true
		}
		return false
	}

	if len(topic) == 0 {
		if route[0] == "#" {
			return true
		}
		return false
	}

	if route[0] == "#" {
		return true
	}

	if (route[0] == "+") || (route[0] == topic[0]) {
		return match(route[1:], topic[1:])
	}

	return false
}

func RouteIncludesTopic(route, topic string) bool {
	return match(strings.Split(route, "/"), strings.Split(topic, "/"))
}


func GetValueByPath(msg *model.Message,pathType string,path string,targetVariableType string) (interface{},error) {
	if pathType == "xpath" {
		xTree, err := xmltree.ParseXML(bytes.NewReader(msg.RawPayload))
		if err == nil {
			var varValue interface{}
			var xpExec = goxpath.MustParse(path)

			switch targetVariableType {
			case "string":
				result, err := xpExec.Exec(xTree)
				if err == nil {
					log.Debug("<RestActionNode> Xpath result :",result.String())
					varValue = result.String()
				}
			case "bool":
				result, err := xpExec.ExecBool(xTree)
				if err == nil {
					log.Debug("<RestActionNode> Xpath result :",result)
					varValue = result
				}
			case "int":
				result, err := xpExec.ExecNum(xTree)
				if err == nil {
					log.Debug("<RestActionNode> Xpath result :",int(result))
					varValue = int(result)
				}
			case "float":
				result, err := xpExec.ExecNum(xTree)
				if err == nil {
					log.Debug("<RestActionNode> Xpath result :",result)
					varValue = result
				}
			}

			if err != nil {
				log.Error("<RestActionNode> Can't find result :",err)
				return nil,errors.New("Can't extract value.")
			}else {
				return varValue,nil
			}


		}else {
			log.Error("<RestActionNode> Can't parse XML :",err)
		}
		//fmt.Println(res)
	}else if pathType == "jpath" {
		var jData interface{}
		json.Unmarshal(msg.RawPayload, &jData)
		varValue, err := jsonpath.JsonPathLookup(jData, path)
		if err == nil {
			switch targetVariableType {
			case "string":
				switch val := varValue.(type) {
				case string:
					return varValue,nil
				case int64:
					return strconv.Itoa(int(val)),nil
				case float64:
					return strconv.FormatFloat(val, 'f', -1, 64), nil
				case float32:
					return strconv.FormatFloat(float64(val), 'f', -1, 32), nil
				default:
					return "", errors.New("Can't convert interface{} to string")
				}
			case "bool":
				switch val := varValue.(type) {
				case string:
					return strconv.ParseBool(val)
				case int64,float64,float32:
					if val==0 {
						return false,nil
					}else {
						return true,nil
					}
				default:
					return 0, errors.New("Can't convert interface{} to int")
				}

			case "int":
				switch val := varValue.(type) {
				case string:
					return strconv.Atoi(val)
				case int64:
					return val,nil
				case float64:
					return int(val), nil
				case float32:
					return int(val),nil
				default:
					return 0, errors.New("Can't convert interface{} to int")
				}

			case "float":
				switch val := varValue.(type) {
				case string:
					return strconv.ParseFloat(val, 64)
				case int64:
					return float64(val),nil
				case float64:
					return val,nil
				case float32:
					return float64(val),nil
				default:
					return 0, errors.New("Can't convert interface{} to int")
				}
			}

			return varValue,nil
		}else {
			return nil,err
		}
	}
	return nil,errors.New("Unknown path type")
}




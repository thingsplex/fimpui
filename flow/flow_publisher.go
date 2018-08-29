package flow

import (
	"github.com/alivinco/fimpgo/fimptype"
	"strings"
	"github.com/alivinco/thingsplex/flow/node"
	"github.com/mitchellh/mapstructure"
	"github.com/alivinco/fimpgo"
)

func (fl *Flow) SendInclusionReport() {
	fl.getLog().Info("Generating inclusion report")
	report := fimptype.ThingInclusionReport{}
	report.Type = "flow"
	report.Address = fl.Id
	report.Alias = fl.FlowMeta.Name
	report.CommTechnology = "flow"
	report.PowerSource = "ac"
	report.ProductName = fl.FlowMeta.Name
	report.ProductHash = "flow_"+fl.Id
	report.SwVersion = "1.0"
	report.Groups = []string{}
	report.ProductId = "flow_1"
	report.ManufacturerId = "fh"
	report.Security = "tls"
	report.Groups = []string{}

	var services []fimptype.Service

	addGroup := func(group string) {
		for i := range report.Groups {
			if report.Groups[i] == group {
				return
			}
		}
		report.Groups = append(report.Groups, group)
	}

	getService := func(name string,group string) (*fimptype.Service,bool) {
		for i := range services {
			if services[i].Name == name {
				if services[i].Groups[0] == group {
					return &services[i],false
				}

			}
		}
		service := fimptype.Service{}
		service.Name = name
		service.Groups = []string{group}
		service.Enabled = true
		service.Tags = []string{}
		service.Props = map[string]interface{}{}
		addGroup(group)
		return &service,true
	}

	for i := range fl.nodes {
		if fl.nodes[i].IsStartNode() {
			var config node.TriggerConfig
			err := mapstructure.Decode(fl.nodes[i].GetMetaNode().Config,&config)
			if err==nil {
				if config.RegisterAsVirtualService{
					fl.getLog().Debug("New trigger to add ")
					group := config.VirtualServiceGroup
					if group == "" {
						group = string(fl.nodes[i].GetMetaNode().Id)
					}
					service,new := getService(fl.nodes[i].GetMetaNode().Service,group)
					intf := fimptype.Interface{}
					intf.Type = "in"
					intf.MsgType = fl.nodes[i].GetMetaNode().ServiceInterface
					intf.ValueType = config.InputVariableType
					intf.Version = "1"
					if new {
						fl.getLog().Debug("Adding new trigger ")
						service.Alias = fl.nodes[i].GetMetaNode().Label
						address := strings.Replace(fl.nodes[i].GetMetaNode().Address, "pt:j1/mt:cmd", "", -1)
						address = strings.Replace(address, "pt:j1/mt:evt", "", -1)
						service.Address = address
						service.Interfaces = []fimptype.Interface{intf}

					}else {
						service.Interfaces = append(service.Interfaces,intf)
					}

					if len(config.VirtualServiceProps)>0 {
						fl.getLog().Debug("Setting service props from Trigger :",config.VirtualServiceProps)
						service.Props = config.VirtualServiceProps
					}
					if new {
						services = append(services,*service)
					}

				}
			}else {
				fl.getLog().Error("Fail to register trigger.Error ",err)
			}
		}
		if fl.nodes[i].GetMetaNode().Type == "action" {
			//config,ok := fl.nodes[i].GetMetaNode().Config.(node.ActionNodeConfig)
			config := node.ActionNodeConfig{}
			err := mapstructure.Decode(fl.nodes[i].GetMetaNode().Config,&config)
			if err==nil {
				if config.RegisterAsVirtualService {
					group := config.VirtualServiceGroup
					if group == "" {
						group = string(fl.nodes[i].GetMetaNode().Id)
					}
					service,new := getService(fl.nodes[i].GetMetaNode().Service,group)

					intf := fimptype.Interface{}
					intf.Type = "out"
					intf.MsgType = fl.nodes[i].GetMetaNode().ServiceInterface
					intf.ValueType = config.VariableType
					intf.Version = "1"

					if new {
						service.Alias = fl.nodes[i].GetMetaNode().Label
						address := strings.Replace( fl.nodes[i].GetMetaNode().Address,"pt:j1/mt:cmd","",-1)
						address = strings.Replace( address,"pt:j1/mt:evt","",-1)
						service.Address = address
						service.Interfaces = []fimptype.Interface{intf}
					}
					service.Interfaces = append(service.Interfaces,intf)
					if len(config.VirtualServiceProps)>0 {
						fl.getLog().Debug("Setting service props from Action :",config.VirtualServiceProps)
						service.Props = config.VirtualServiceProps
					}
					if new {
						services = append(services,*service)
					}

				}

			}else {
				fl.getLog().Error("Fail to register action .Error  ",err)
			}
		}

	}
	report.Services = services
	msg := fimpgo.NewMessage("evt.thing.inclusion_report", "flow","object", report, nil,nil,nil)
	addrString := "pt:j1/mt:evt/rt:ad/rn:flow/ad:1"
	addr, _ := fimpgo.NewAddressFromString(addrString)
	fl.msgTransport.Publish(addr,msg)
	fl.getLog().Info("Inclusion report is sent")
}

func (fl *Flow) SendExclusionReport() {
	report := fimptype.ThingExclusionReport{Address:fl.Id}
	msg := fimpgo.NewMessage("evt.thing.exclusion_report", "flow","object", report, nil,nil,nil)
	addrString := "pt:j1/mt:evt/rt:ad/rn:flow/ad:1"
	addr, _ := fimpgo.NewAddressFromString(addrString)
	fl.msgTransport.Publish(addr,msg)
}

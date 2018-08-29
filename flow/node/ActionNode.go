package node

import (
	"github.com/alivinco/fimpgo"
	"github.com/alivinco/thingsplex/flow/model"
	"github.com/mitchellh/mapstructure"
	"text/template"
	"errors"
	"bytes"
)

type ActionNode struct {
	BaseNode
	ctx *model.Context
	transport *fimpgo.MqttTransport
	config ActionNodeConfig
	addressTemplate *template.Template
}

type ActionNodeConfig struct {
	DefaultValue model.Variable
	VariableName string
	VariableType string
	IsVariableGlobal bool
	Props fimpgo.Props
	RegisterAsVirtualService bool
	VirtualServiceGroup string
	VirtualServiceProps map[string]interface{} // mostly used to announce supported features of the service , for instance supported modes , states , setpoints , etc...
}

func NewActionNode(flowOpCtx *model.FlowOperationalContext,meta model.MetaNode,ctx *model.Context,transport *fimpgo.MqttTransport) model.Node {
	node := ActionNode{ctx:ctx,transport:transport}
	node.meta = meta
	node.flowOpCtx = flowOpCtx
	node.config = ActionNodeConfig{DefaultValue:model.Variable{}}
	node.SetupBaseNode()
	return &node
}

func (node *ActionNode) LoadNodeConfig() error {
	err := mapstructure.Decode(node.meta.Config,&node.config)
	if err != nil{
		node.getLog().Error("Can't decode config.Err:",err)

	}

	funcMap := template.FuncMap{
		"variable": func(varName string,isGlobal bool)(interface{},error) {
			//node.getLog().Debug("Getting variable by name ",varName)
			var vari model.Variable
			var err error
			if isGlobal {
				vari , err = node.ctx.GetVariable(varName,"global")
			}else {
				vari , err = node.ctx.GetVariable(varName,node.flowOpCtx.FlowId)
			}

			if vari.IsNumber() {
				return vari.ToNumber()
			}
			vstr , ok := vari.Value.(string)
			if ok {
				return vstr,err
			}else {
				node.getLog().Debug("Only simple types are supported ")
				return "",errors.New("Only simple types are supported ")
			}
		},
	}
	node.addressTemplate,err = template.New("address").Funcs(funcMap).Parse(node.meta.Address)
	if err != nil {
		node.getLog().Error(" Failed while parsing url template.Error:",err)
	}
	return err
}

func (node *ActionNode) WaitForEvent(responseChannel chan model.ReactorEvent) {

}

func (node *ActionNode) OnInput( msg *model.Message) ([]model.NodeID,error) {
	node.getLog().Info("Executing ActionNode . Name = ", node.meta.Label)
	fimpMsg := fimpgo.FimpMessage{Type: node.meta.ServiceInterface, Service: node.meta.Service,Properties:node.config.Props}
	if node.config.VariableName != "" {
		node.getLog().Debug("Using variable as input :",node.config.VariableName)
		flowId := node.flowOpCtx.FlowId
		if node.config.IsVariableGlobal {
			flowId = "global"
		}
		variable,err := node.ctx.GetVariable(node.config.VariableName,flowId)
		if err != nil {
			node.getLog().Error("Can't get variable . Error:",err)
			return nil , err
		}
		fimpMsg.ValueType = variable.ValueType
		fimpMsg.Value = variable.Value
	}else {
		if node.config.DefaultValue.Value == "" || node.config.DefaultValue.ValueType == ""{
			fimpMsg.Value = msg.Payload.Value
			fimpMsg.ValueType = msg.Payload.ValueType
		}else {
			fimpMsg.Value = node.config.DefaultValue.Value
			fimpMsg.ValueType = node.config.DefaultValue.ValueType
		}
	}

	msgBa, err := fimpMsg.SerializeToJson()
	if err != nil {
		return nil,err
	}
	var addrTemplateBuffer bytes.Buffer
	node.addressTemplate.Execute(&addrTemplateBuffer,nil)
	address:= addrTemplateBuffer.String()
	node.getLog().Debug(" Address: ",address)
	node.getLog().Debug(" Action message : ", fimpMsg)

	node.transport.PublishRaw(address, msgBa)
	return []model.NodeID{node.meta.SuccessTransition},nil
}


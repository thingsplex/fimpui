package model

import (
	"github.com/alivinco/fimpgo"
	"time"
)

type MsgPipeline chan Message

type Message struct {
	AddressStr string
	Address    fimpgo.Address
	Payload    fimpgo.FimpMessage
	RawPayload []byte
	Header     map[string]string
	CancelOp   bool // if true , listening end should close all operations
}

type ReactorEvent struct {
	Msg Message
	Err error
	TransitionNodeId NodeID
}

type FlowMeta struct {
	Id          string
	Name        string
	Group       string
	Description string
	Nodes       []MetaNode
}

const (
	SIGNAL_STOP = 1

)

type FlowOperationalContext struct {
	FlowId string
	IsFlowRunning bool
	State string
	NodeControlSignalChannel chan int // the channel should be used to stop all waiting nodes .
	NodeIsReady chan bool // Flow should notify message router when next node is ready to process new message .
	StoragePath string
	SharedResources *GlobalSharedResources
}

type FlowStatsReport struct {
	CurrentNodeId NodeID
	CurrentNodeLabel string
	IsAtStartingPoint bool
	StartedAt time.Time
	WaitingSince time.Time
	LastExecutionTime int64
}
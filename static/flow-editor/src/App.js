import logo from './logo.svg';
import './App.css';

import React, {Component} from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
}  from 'react-flow-renderer';

let elements = [
  // {
  //   id: '1',
  //   type: 'input', // input node
  //   data: { label: 'Input Node' },
  //   position: { x: 250, y: 25 },
  // },
  // // default node
  // {
  //   id: '2',
  //   // you can also pass a React component as a label
  //   data: { label: <div>Default Node</div> },
  //   position: { x: 100, y: 125 },
  // },
  // {
  //   id: '3',
  //   type: 'output', // output node
  //   data: { label: 'Output Node' },
  //   position: { x: 250, y: 250 },
  // },
  // // animated edge
  // { id: 'e1-2', source: '1', target: '2', animated: true },
  // { id: 'e2-3', source: '2', target: '3' },
];


class FlowManager {
  constructor() {
    this.ws = null
  }
  async loadFlow(flowId) {
      const msg = {
        "serv": "tpflow",
        "type": "cmd.flow.get_definition",
        "val_t": "string",
        "val": "8YiYVDM7erX9lJv",
        "props": null,
        "tags": null,
        "resp_to": "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1",
        "src": "tplex-ui",
        "ver": "1",
        "uid": "df3f8267-e989-4582-88ba-b2491b40b2f8",
        "topic": "pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1"
      }
      this.wsPublish(msg);
  }

  // Establishes WS connection and configures message handler
  configureWs(msgHandler) {
    this.ws = new WebSocket("ws://localhost:8081/ws-bridge");
    this.ws.onopen = () => (this.loadFlow(""))
    this.ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === "evt.flow.definition_report" && msg.serv === "tpflow") {
        console.log("Flow definition report")
        msgHandler(msg);
      }

    };
    this.ws.onclose = () => {
      setTimeout(function() {this.configureWs();}, 1000);
    };
  }

  wsPublish(msg) {
    this.ws.send(JSON.stringify(msg));
  }

}

class FlowEditor extends Component {
  constructor() {
    super();
    this.state = {
      nodes: []
    };
    this.flowManager = new FlowManager();
  }

  componentDidMount() {
    // this.flowManager.loadFlow("")
    this.flowManager.configureWs( (msg) => {
      console.dir(msg)
      msg.val.Nodes.forEach((node)=>{

        let nType = ""
        if (node.SuccessTransition ==="" && node.ErrorTransition === "" ) {
          nType = "output"
        }

        elements.push( {
          id: node.Id,
          type: nType, // input node
          data: { label: node.Label },
          position: { x: node.Ui.x, y: node.Ui.y },
        })
      })

      elements.push({ id: 'e1-2', source: '1', target: '17', animated: true },{ id: 'e1-16', source: '6', target: '15', animated: true })
      this.setState({ nodes: elements });
    })
  }

  render() {
    return (
        <div style={{ height: 700 }}>
          <ReactFlow elements={this.state.nodes} >

            <MiniMap
                nodeStrokeColor={(n) => {
                  if (n.style?.background) return n.style.background;
                  if (n.type === 'input') return '#0041d0';
                  if (n.type === 'output') return '#ff0072';
                  if (n.type === 'default') return '#1a192b';

                  return '#eee';
                }}
                nodeColor={(n) => {
                  if (n.style?.background) return n.style.background;

                  return '#fff';
                }}
                nodeBorderRadius={2}
            />
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </div>
    )
  }
}

export default FlowEditor;


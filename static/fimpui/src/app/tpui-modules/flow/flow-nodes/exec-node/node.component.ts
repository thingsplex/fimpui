import {MetaNode, ServiceLookupDialog} from "../../flow-editor/flow-editor.component";
import {Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";
// import CodeFlask from 'codeflask';
// import * as Prism from 'prismjs';
import * as ace from "ace-builds";


@Component({
  selector: 'exec-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class ExecNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  @ViewChild('nodeCodeEditor') editorEl: ElementRef;

  localVars:any;
  globalVars:any;
  aceEditor:any;
  constructor(public dialog: MatDialog) {
  }

  ngOnInit() {
    this.loadDefaultConfig();
    // const editorElem = document.getElementById('node-code-editor');

    // let flask = new CodeFlask('#node-code-editor', { language: 'go' });

  }
  ngAfterViewInit() {
    // console.dir(this.myDiv)
    // let flask = new CodeFlask(this.myDiv.nativeElement, { language: 'c' });
    // flask.addLanguage('go', Prism.languages['go']);
    // flask.updateCode(this.node.Config.ScriptBody)
    // 🚨 Added
    // ace.config.set('basePath', 'https://pagecdn.io/lib/ace/1.4.12');
    ace.config.set('basePath', 'https://unpkg.com/ace-builds@1.4.12/src-noconflict');

    this.aceEditor = ace.edit(this.editorEl.nativeElement);
    if (this.node.Config.ExecType =='golang') {
      this.aceEditor.session.setMode("ace/mode/golang");
    }else if (this.node.Config.ExecType =='python') {
      this.aceEditor.session.setMode("ace/mode/python");
    }

    this.aceEditor.session.setValue(this.node.Config.ScriptBody);
    this.aceEditor.on("change", () => {
      this.node.Config.ScriptBody = this.aceEditor.getValue();
    });
  }

  loadDefaultConfig() {
    if (this.node.Config==null) {
      this.node.Config = {
          "ExecType":"golang", // cmd , sh-cmd , python , script
          "Command":"",
          "ScriptBody": "",
          "InputVariableName":"",
          "IsInputVariableGlobal": false,
          "OutputVariableName":"",
          "IsOutputVariableGlobal": false,
          "IsOutputJson": false,
          "IsInputJson":  false
        }
      this.node.Config.ScriptBody = "package ext\n" +
        "\n" +
        "import \"fmt\"\n" +
        "import \"github.com/thingsplex/tpflow/model\"\n" +
        "import \"github.com/thingsplex/tpflow/node/action/exec\"\n" +
        "import \"github.com/futurehomeno/fimpgo\"\n" +
        "\n" +
        "var counter int = 1\n" +
        "\n" +
        "type AppLogic struct {\n" +
        "    mqtt *fimpgo.MqttTransport\n" +
        "    ctx *model.Context\n" +
        "}\n" +
        "\n" +
        "func(al *AppLogic) sendMessage(msg string) {\n" +
        "    fimpMsg := fimpgo.NewMessage(\"evt.script.test\",\"test\",\"string\",msg,nil,nil,nil)\n" +
        "    al.mqtt.PublishToTopic(\"pt:j1/mt:evt/rt:app/rn:testapp/ad:1\",fimpMsg)\n" +
        "    \n" +
        "}\n" +
        "\n" +
        "func(al *AppLogic) CheckHomeMode() {\n" +
        "    hModeVal,err := al.ctx.GetVariable(\"fh.home.mode\",\"global\")\n" +
        "    if err != nil {\n" +
        "        return \n" +
        "    }\n" +
        "    hMode, ok := hModeVal.Value.(string)\n" +
        "    if !ok {\n" +
        "        return\n" +
        "    }\n" +
        "    if hMode == \"home\" {\n" +
        "        al.sendMessage(\"home is set to home mode\")\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "func Run(msg *model.Message,ctx *model.Context,params exec.ScriptParams) string {\n" +
        " appL := AppLogic{mqtt:params.Mqtt,ctx:ctx}\n" +
        " appL.CheckHomeMode()\n" +
        " \n" +
        " counter++\n" +
        " r := fmt.Sprintf(\"Hello %d\",counter)\n" +
        " ctx.SetVariable(\"hello_var\",\"string\",r,\"\",params.FlowId,true)\n" +
        " return \"ok\"\n" +
        "}\n"
    }
  }
  scriptTypeSelected(event) {
    console.log(event);
    if (this.node.Config.ExecType =='golang') {
      this.aceEditor.getSession().setMode("ace/mode/golang");
    }else if (this.node.Config.ExecType =='python') {
      console.log("setting python mode");
      this.aceEditor.getSession().session.setMode("ace/mode/python");
    }
  }
  inputVariableSelected(cvar:ContextVariable) {
    this.node.Config.InputVariableName = cvar.Name;
    this.node.Config.IsInputVariableGlobal = cvar.isGlobal;
  }
  outputVariableSelected(cvar:ContextVariable) {
    this.node.Config.OutputVariableName = cvar.Name;
    this.node.Config.IsOutputVariableGlobal = cvar.isGlobal;
  }

}

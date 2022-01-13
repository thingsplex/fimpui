import {MetaNode} from "../../flow-editor/flow-editor.component";
import {Component, ElementRef, Input, OnInit, ViewChild} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {ContextVariable} from "../../flow-context/variable-selector.component";
import * as ace from "ace-builds";

@Component({
  selector: 'http-action-node',
  templateUrl: './node.html',
  styleUrls: ['../flow-nodes.component.css']
})
export class HttpActionNodeComponent implements OnInit {
  @Input() node :MetaNode;
  @Input() nodes:MetaNode[];
  @Input() flowId:string;
  @ViewChild('nodeCodeEditor') editorEl: ElementRef;
  localVars:any;
  globalVars:any;

  constructor(public dialog: MatDialog) {
  }

  ngOnInit() {
    this.loadDefaultConfig();

  }

  ngAfterViewInit() {
    ace.config.set('basePath', 'https://unpkg.com/ace-builds@1.4.12/src-noconflict');

    const aceEditor = ace.edit(this.editorEl.nativeElement);
    aceEditor.session.setMode("ace/mode/html");
    aceEditor.session.setValue(this.node.Config.ResponseTemplate);
    aceEditor.on("change", () => {
      this.node.Config.ResponseTemplate = aceEditor.getValue();
    });
    // this.transformationTypeChange();
  }

  loadDefaultConfig() {
    if (this.node.Config == null) {
      this.node.Config = {
        "ResponsePayloadFormat": "json",
        "InputVar": {"Name":"","InMemory":true,"IsGlobal":false,"Type":""},
        "IsWs":false,
        "IsPublishOnly":false,
        "ResponseTemplate":""
      }
    }
  }

  inputVariableSelected(cvar:ContextVariable) {
    this.node.Config.InputVar.Name = cvar.Name;
    this.node.Config.InputVar.IsGlobal = cvar.isGlobal;
    this.node.Config.InputVar.InMemory = cvar.InMemory;
    this.node.Config.InputVar.Type = cvar.Type;
  }

  // transformationTypeChange() {
  //   if (this.node.Config.TransformType == "template") {
  //     this.editorEl.nativeElement.style.display = 'block';
  //   }else {
  //     this.editorEl.nativeElement.style.display = 'none';
  //   }
  // }

}

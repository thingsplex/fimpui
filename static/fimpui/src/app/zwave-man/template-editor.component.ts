import {Component, Inject, OnDestroy, OnInit} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";
import {Headers, Http, RequestOptions, Response} from "@angular/http";
import {BACKEND_ROOT} from "../globals";

@Component({
  selector: 'template-editor-dialog',
  templateUrl: './template-editor-dialog.html',
})
export class TemplateEditorDialog implements OnInit, OnDestroy  {
  template : any;
  templateStr : string;
  templateName :string;
  templateType :string;
  constructor(public dialogRef: MatDialogRef<TemplateEditorDialog>,@Inject(MAT_DIALOG_DATA) public data: any,private http : Http) {
    this.templateName = data["name"];
    this.templateType = data["type"]
    this.template = {};
    this.template["auto_configs"] = {"assoc":[],"configs":[]};
    this.template["dev_custom"] = {"service_grouping":[],"service_descriptor":[],"basic_mapping":[],"binary_switch_mapping":[],"retry_policy":{}}
    this.template["docs_ref"] = ""
    this.template["force_zware_interview"] = false;
    console.log("Dialog constructor Opened");
  }

  ngOnInit(){
    this.loadTemplate();
  }

  loadTemplate(){
    this.http.get(BACKEND_ROOT+'/fimp/api/zwave/products/template?name='+this.templateName+'&type='+this.templateType)
      .map(function(res: Response){
        let body = res.json();
        return body;
      }).subscribe ((result) => {
      this.template = result;
      if(this.template.auto_configs == undefined) {
        this.template["auto_configs"] = {"assoc":[],"configs":[]}
      }
      if(this.template.dev_custom == undefined) {
        this.template["dev_custom"] = {"service_grouping":[],"service_fields":[],"service_descriptor":[],"basic_mapping":[]}
      }
      if(this.template.dev_custom.service_fields == undefined) {
        this.template["dev_custom"]["service_fields"] = [];
      }
      if(this.template.dev_custom.retry_policy == undefined) {
        this.template["dev_custom"]["retry_policy"] = {};
        this.addNewRetryPolicy();
      }

      if(this.template.comment == undefined){
        this.template["comment"]=""
      }
      if(this.template.wakeup_interval == undefined){
        this.template.wakeup_interval = this.template.wkup_intv;
      }
      if( this.template["docs_ref"] == undefined){
        this.template["docs_ref"] = "";
      }
      if( this.template["force_zware_interview"] == undefined){
        this.template["force_zware_interview"] = false;
      }

      // Converting json object into string, needed for editor
      // this.template.dev_custom.service_descriptor.forEach(element => {
      //   element.descriptor = JSON.stringify(element.descriptor, null, 2);
      // });
      //  this.templateStr = JSON.stringify(result, null, 2);
    });
  }
  addNewAssoc() {
    this.template.auto_configs.assoc.push({"group":1,"node":1,"comment":""})
  }
  deleteAssoc(assoc:any) {
    var i = this.template.auto_configs.assoc.indexOf(assoc);
    if(i != -1) {
      this.template.auto_configs.assoc.splice(i, 1);
    }
  }
  addNewConfig() {
    this.template.auto_configs.configs.push({"key":1,"value":1,"size":1,"comment":""})
  }
  deleteConfig(configObj:any) {
    var i = this.template.auto_configs.configs.indexOf(configObj);
    if(i != -1) {
      this.template.auto_configs.configs.splice(i, 1);
    }
  }
  addNewServiceGrouping() {
    this.template.dev_custom.service_grouping.push({"endp":1,"service":"sensor_temp","group":"ch_0","comment":""})
  }

  addNewServiceFieldCustomization() {
    this.template.dev_custom.service_fields.push({"endp":1,"service":"","enabled":true,"comment":""})
  }

  deleteServiceGrouping(serviceGrp:any) {
    var i = this.template.dev_custom.service_grouping.indexOf(serviceGrp);
    if(i != -1) {
      this.template.dev_custom.service_grouping.splice(i, 1);
    }
  }
  deleteServiceFieldCustomization(serviceGrp:any) {
    var i = this.template.dev_custom.service_fields.indexOf(serviceGrp);
    if(i != -1) {
      this.template.dev_custom.service_fields.splice(i, 1);
    }
  }


  addNewServiceDescriptor() {
    var sampleDescriptor = {
      "enabled": true,
      "groups": [
        "ch_0"
      ],
      "interfaces": [
        {
          "intf_t": "out",
          "msg_t": "evt.mode.report",
          "val_t": "bool",
          "ver": "1"
        },
        {
          "intf_t": "in",
          "msg_t": "cmd.mode.set",
          "val_t": "string",
          "ver": "1"
        },
        {
          "intf_t": "in",
          "msg_t": "cmd.mode.get_report",
          "val_t": "null",
          "ver": "1"
        }
      ],
      "location": "",
      "name": "siren_ctrl",
      "props": {
        "is_secure": true,
        "is_unsecure": false,
        "sup_modes":["on","off","fire"]
      }
    }
    // var strDescriptor = JSON.stringify(sampleDescriptor,null, 2);
    this.template.dev_custom.service_descriptor.push({"endp":0,"operation":"add","descriptor":sampleDescriptor,"comment":""});
  }
  deleteServiceDescriptor(serviceDescriptor:any) {
    var i = this.template.dev_custom.service_descriptor.indexOf(serviceDescriptor);
    if(i != -1) {
      this.template.dev_custom.service_descriptor.splice(i, 1);
    }
  }
  addNewBasicMapping() {
    this.template.dev_custom.basic_mapping.push({"endp":0,"basic_value":0,"service":"","msg_type":"","fimp_value":{"val":"","val_t":"string"},
      "map_range":false,"is_get_report_cmd":false,"min":0,"max":100,"comment":"" });
  }
  deleteBasicMapping(basicMapping:any) {
    var i = this.template.dev_custom.basic_mapping.indexOf(basicMapping);
    if(i != -1) {
      this.template.dev_custom.basic_mapping.splice(i, 1);
    }
  }

  addNewBinarySwitchMapping() {
    if (this.template.dev_custom.bin_switch_mapping == undefined) {
      this.template.dev_custom.bin_switch_mapping = [];
    }
    this.template.dev_custom.bin_switch_mapping.push(
      {"endp":0,"service":"","msg_type":"",
        "cc_value":true,
        "fimp_value":{"val":"","val_t":"string"},
        "is_get_report_cmd":false,"comment":"" });


  }

  addNewSceneActivationMapping() {
    if (this.template.dev_custom.scene_activation_mapping == undefined) {
      this.template.dev_custom.scene_activation_mapping = [];
    }
    this.template.dev_custom.scene_activation_mapping.push(
      {"endp":0,"service":"","msg_type":"",
        "cc_value":"","location":"",
        "fimp_value":{"val":"","val_t":"string"},
        "is_get_report_cmd":false,"comment":"" });

  }


  deleteBinarySwitchMapping(binSwMapping:any) {
    var i = this.template.dev_custom.bin_switch_mapping.indexOf(binSwMapping);
    if(i != -1) {
      this.template.dev_custom.bin_switch_mapping.splice(i, 1);
    }
  }

  deleteSceneActivationMapping(binSwMapping:any) {
    var i = this.template.dev_custom.scene_activation_mapping.indexOf(binSwMapping);
    if(i != -1) {
      this.template.dev_custom.scene_activation_mapping.splice(i, 1);
    }
  }

  addNewRetryPolicy() {
    if (this.template.dev_custom.retry_policy == undefined) {
      this.template.dev_custom.retry_policy = {
        "is_enabled": false,
        "cmd_retry_count": 3,
        "cmd_retry_delay": 1000,
        "is_cmd_tx_error_retry_enabled": true,
        "tx_error_retry_delay": 1000,
        "enable_guaranteed_delivery": false,
        "guaranteed_delivery_policies": []
      };
    }
  }

  deleteGDPolicy(p:any) {
    var i = this.template.dev_custom.retry_policy.guaranteed_delivery_policies.indexOf(p);
    if(i != -1) {
      this.template.dev_custom.retry_policy.guaranteed_delivery_policies.splice(i, 1);
    }
  }

  addGDPolicy() {
    if(this.template.dev_custom.retry_policy.guaranteed_delivery_policies == undefined) {
      this.template.dev_custom.retry_policy.guaranteed_delivery_policies = [];
    }
    this.template.dev_custom.retry_policy.guaranteed_delivery_policies.push(
      {
        "endpoint":0,
        "request_msg":{
          "serv": "siren_ctrl",
          "type": "cmd.mode.set",
          "val_t": "string",
          "val": "off",
          "props": {},
          "tags": []
        },
        "response_msg":{
          "serv": "alarm_fire",
          "type": "evt.alarm.report",
          "val": {
            "event": "silenced",
            "status": "activ"
          },
          "val_t": "str_map",
          "props": {},
          "tags": []
         },
        "report_on_response_msg":{
          "serv": "siren_ctrl",
          "type": "evt.mode.report",
          "val_t": "string",
          "val": "off",
          "props": {},
          "tags": []
        },
        "max_wait_time":20,
        "max_retry":7,
        "blocking_wait_resp_time":0
      }
    )
  }

  templateOperation(opName:string) {
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
      .post(BACKEND_ROOT+'/fimp/api/zwave/products/template-op/'+opName+'/'+this.templateName,null,  options )
      .subscribe ((result) => {
        console.log("Operation executed");
        this.dialogRef.close();

      });
  }

  deleteTemplate() {
    this.http
      .delete(BACKEND_ROOT+'/fimp/api/zwave/products/template/'+this.templateType+'/'+this.templateName)
      .subscribe ((result) => {
        console.log("Template deleted");
        this.dialogRef.close();
      });
  }

  prepareTemplate(){
    // Converting descriptor back from string to object
    // this.template.dev_custom.service_descriptor.forEach(element => {
    //   element.descriptor = JSON.parse(element.descriptor);
    // });
  }

  showSource() {
    this.prepareTemplate();
    this.templateStr = JSON.stringify(this.template, null, 2);
    // this.template.dev_custom.service_descriptor.forEach(element => {
    //    element.descriptor = JSON.stringify(element.descriptor,null,2);
    // });
  }
  saveSource() {
    this.template = JSON.parse(this.templateStr);
    //  this.template.dev_custom.service_descriptor.forEach(element => {
    //    element.descriptor = JSON.stringify(element.descriptor,null,2);
    // });
  }


  saveTemplate(){
    this.prepareTemplate();
    console.dir(this.template)
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});


    this.http
      .post(BACKEND_ROOT+'/fimp/api/zwave/products/template/'+this.templateType+'/'+this.templateName,JSON.stringify(this.template),  options )
      .subscribe ((result) => {
        console.log("Template is saved");

      });
  }

  ngOnDestroy() {

  }


}

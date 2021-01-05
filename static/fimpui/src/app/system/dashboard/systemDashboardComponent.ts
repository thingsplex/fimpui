import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { Subscription } from "rxjs";
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class SystemDashboardComponent implements OnInit {
  globalSub : Subscription;
  cbInfo : any;
  systemReport : any;
  activityReport : any;
  constructor(private fimp:FimpService) {

  }

  ngOnInit() {

  }
  ngAfterViewInit() {
    console.log("Dashboard initialized");
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      // console.log(msg.payload.toString());
      if (fimpMsg.service == "clbridge" )
      {
        if(fimpMsg.mtype == "evt.clbridge.diagnostics_report" )
        {
          this.cbInfo = fimpMsg.val;

        }
      }else if (fimpMsg.service == "fhbutler") {
        if (fimpMsg.mtype == "evt.systemos.system_report") {
          this.systemReport = fimpMsg.val
        }else if (fimpMsg.mtype == "evt.systemos.activity_report") {
          this.activityReport = fimpMsg.val
          if (this.activityReport) {
            this.activityReport.hdd.total = Math.round(this.activityReport.hdd.total/1000000) ;
            this.activityReport.hdd.free =  Math.round(this.activityReport.hdd.free/1000000);
            this.activityReport.hdd.used =  Math.round(this.activityReport.hdd.used/1000000);
            this.activityReport.hdd.usedPercent =  Math.round(this.activityReport.hdd.usedPercent);

            this.activityReport.mem.total = Math.round(this.activityReport.mem.total/1000000) ;
            this.activityReport.mem.available = Math.round(this.activityReport.mem.available/1000000)
            this.activityReport.mem.used = Math.round(this.activityReport.mem.used/1000000)
            this.activityReport.mem.usedPercent = Math.round(this.activityReport.mem.usedPercent)
            this.activityReport.mem.swapTotal = Math.round(this.activityReport.mem.swapTotal/1000000)
            this.activityReport.mem.swapFree = Math.round(this.activityReport.mem.swapFree/1000000)
            this.activityReport.mem.swapUsed = Math.round(this.activityReport.mem.swapUsed/1000000)
            this.activityReport.mem.swapUsedPercent = Math.round(this.activityReport.mem.swapUsedPercent)
          }
        }
      }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });
    this.requestCBDiagnosticReport();
    this.requestButlerSystemReport();
    this.requestButlerActivitySystemReport();
  }

  syncSiteStruct() {
    console.log("Sync site struct")
    let msg  = new FimpMessage("clbridge","cmd.site.sync","string","full",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",msg);
  }

  getRoutes() {
    console.log("Sync site struct")
    let msg  = new FimpMessage("clbridge","cmd.clbridge.get_routes_report","string","full",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",msg);
  }


  requestCBDiagnosticReport(){
    console.log("Remove device")
    let msg  = new FimpMessage("clbridge","cmd.clbridge.get_diagnostics","string","full",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:clbridge/ad:1",msg);
  }

  requestButlerSystemReport(){
    let msg  = new FimpMessage("fhbutler","cmd.systemos.get_system_report","string","",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }

  requestButlerActivitySystemReport(){
    let msg  = new FimpMessage("fhbutler","cmd.systemos.get_activity_report","string","",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

}


/*
{
    "AppState": "RUNNING",
    "ConnectionState": "CONNECTED",
    "StartTime": "2020-01-17T09:17:14.231872+01:00",
    "BackendVersion": 2,
    "MqttTxBytes": 9762,
    "MqttRxBytes": 1459,
    "MqttTxMsg": 13,
    "MqttRxMsg": 1,
    "ReconnectCounter": 0,
    "LastDisconnectedAt": "0001-01-01T00:00:00Z",
    "LastConnectedAt": "2020-01-17T09:30:36.808732302+01:00",
    "MsgDropped": 0,
    "ActiveSessions": 0,
    "TotalStartedSessions": 0,
    "SiteStruct": {
      "UpdatesCnt": 1,
      "ErrorsCnt": 0,
      "MaxUpdateTime": 14626376637,
      "MinUpdateTime": 0,
      "BatchMaxSize": 0,
      "LastUpdatedAt": "2020-01-17T09:30:55.105181257+01:00",
      "LastError": "",
      "LastErrorAt": "0001-01-01T00:00:00Z"
    }
 */

/*
{
  "type": "evt.systemos.system_report",
  "serv": "fhbutler",
  "val_t": "object",
  "val": {
    "osInfo": {
      "cpu": [
        {
          "cpu": 0,
          "vendorId": "",
          "family": "",
          "model": "",
          "physicalId": "",
          "cores": 1,
          "modelName": "ARMv6-compatible processor rev 7 (v6l)",
          "mhz": 700
        }
      ],
      "host": {
        "hostname": "aleks",
        "uptime": 13400,
        "bootTime": 1579249461,
        "procs": 169,
        "os": "linux",
        "platform": "raspbian",
        "platformFamily": "debian",
        "platformVersion": "8.0",
        "kernelVersion": "4.1.13+",
        "virtualizationSystem": "",
        "virtualizationRole": "",
        "hostid": "f64ca666-47d2-4dd8-8e52-51e391dbf582"
      },
      "netInterfaces": [
        {
          "mtu": 65536,
          "name": "lo",
          "hardwareaddr": "",
          "flags": [
            "up",
            "loopback"
          ],
          "addrs": [
            {
              "addr": "127.0.0.1/8"
            },
            {
              "addr": "::1/128"
            }
          ]
        },
        {
          "mtu": 1500,
          "name": "eth0",
          "hardwareaddr": "b8:27:eb:ff:5f:96",
          "flags": [
            "up",
            "broadcast",
            "multicast"
          ],
          "addrs": [
            {
              "addr": "192.168.1.151/24"
            },
            {
              "addr": "fe80::e2a2:4c58:f77:6c99/64"
            }
          ]
        },
        {
          "mtu": 1500,
          "name": "wlan0",
          "hardwareaddr": "7c:dd:90:85:28:ec",
          "flags": [
            "up",
            "broadcast",
            "multicast"
          ],
          "addrs": [
            {
              "addr": "fe80::95e0:c07f:306:98f7/64"
            }
          ]
        },
        {
          "mtu": 1500,
          "name": "tap0",
          "hardwareaddr": "da:fc:3f:88:5f:21",
          "flags": [
            "up",
            "broadcast",
            "multicast"
          ],
          "addrs": [
            {
              "addr": "169.254.47.205/16"
            },
            {
              "addr": "fd00:aaaa::f7ab:ce14:8139:9057/64"
            },
            {
              "addr": "fe80::d8fc:3fff:fe88:5f21/64"
            }
          ]
        }
      ]
    },
    "hardware": {
      "mobileNet": {
        "operator": "",
        "iccid": ""
      }
    }
  },
  "tags": null,
  "props": null,
  "ver": "1",
  "corid": "5e085a03-3000-4f7e-83d1-7a9d2e2cb718",
  "ctime": "2020-01-17T13:07:41.667+01:00",
  "uid": "fa2a087c-b357-420c-a472-2d21d2f491d3"
}
 */

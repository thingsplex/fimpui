import { Component } from '@angular/core';
import { Http, Response }  from '@angular/http';
import { Observable } from 'rxjs/Rx';
import { FimpService} from 'app/fimp/fimp.service';
@Component({
  moduleId: module.id,
  selector: 'fimp-ui',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showHeading = true;
  public version :String;
  constructor (private http : Http){
    this.loadSystemInfo();
  }
  toggleHeading() {
    this.showHeading = !this.showHeading;
  }

  // loadConfigsAndSetupMqttConnection() {
  //    let MQTT_SERVICE_OPTIONS_1 = {
  //        hostname:mqttHost,
  //        port: mqttPort,
  //        path: '/mqtt'

  //     };
  //    this.fimpService.mqtt.connect(MQTT_SERVICE_OPTIONS_1);


  // }

  loadSystemInfo() {
     console.log("Loading system info")

     this.http
      .get('/fimp/system-info')
      .map(function(res: Response){
        let body = res.json();
        console.log(body.Version);
        return body;
      }).subscribe ((result)=>{
         console.log(result.Version);
         this.version = result.Version;

      });
  }


}

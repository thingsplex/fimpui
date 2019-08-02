### Action node

Action node creates FIMP messages and publishes to MQTT topic .

#### Action config 

 Assisted configuration using service lookup.  

#### Advanced Service binding 

 Advanced action configuration , should be used when service can't be configured using basic config .
 
 Mandatory properties : 
 
 - *Service* - is a name of fimp service 
 - *Interface* - is a name of fimp message type 
 - *Address* - is full topic , the field supports templating . 
 
 Using template variables in *Address* field :
 
 `pt:j1/mt:evt/rt:dev/rn:test/ad:1/sv:sensor_lumin/ad:{{ variable "counter" false }}_0`
 where *counter* is a name of variable 
 *false* is a flag which defines whether the variable is global or local
  In our example, if variable counter == 11 , the address string will be converted into - 
 `pt:j1/mt:evt/rt:dev/rn:test/ad:1/sv:sensor_lumin/ad:11_0` 
 
 
 Properties used for configuring virtual device , the properties are optional:
  - *Register as virtual device (optional)* - if the flag is selected , the service will be added into inclusion report and will be part of virtual device .
 - *Service group (optional)* - name of service group in inclusion report. In a virtual device multiple services can be put into a logical group.
 - *Service properties* - object will be used as service properties. 
 
  
#### Payload configuration 

Defines payload (val) of fimp message . By default Flow engine will send content of input variable ( set by trigger node ) . 
Other 2 options are 
 * set static value 
 * use value of configured variable  


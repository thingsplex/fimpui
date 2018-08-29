export class FimpAddress {
    globalPrefix   : string;
	payloadType    : string; // j1
	msgType        : string; // evt/cmd
	resourceType   : string; // dev,ad
	resourceName   : string;  // zw,ikea
	resourceAddress : string; // Normally address of adapter
	serviceName     : string; // Example - battery , temp_sensor
	serviceAddress  : string; // Normally it's device address but may be not .
}

export function NewFimpAddressFromString(topicString:string):FimpAddress{
    let addr = new FimpAddress()
    let tokens = topicString.split("/");
    for (let token in tokens) {
        let tokenName = token.split(":")[0];
        let tokenValue = token.split(":")[1]
        switch(tokenName) {
            case "pt":
                addr.payloadType = tokenValue;
                break;
            case "mt":
                addr.msgType = tokenValue;    
                break;
            case "rt":
                addr.resourceType = tokenValue; 
                break;
            case "rn":
                addr.resourceName = tokenValue;
                break;
            case "ad":
                if( addr.serviceName == undefined){
                    addr.resourceAddress = tokenValue;
                }else {
                    addr.serviceAddress = tokenValue;
                }
                break;
            case "sv":
                addr.serviceName = tokenValue;
                break;                
        }
    }
    return addr ;


}
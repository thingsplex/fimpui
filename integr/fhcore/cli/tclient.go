package main

import (
	"github.com/alivinco/thingsplex/integr/fhcore"
	"fmt"
)

func main() {
	host := "localhost:1989"
	vc := fhcore.NewVinculumClient(host)
	err := vc.Connect()
	if err != nil {
		fmt.Println("Can't connect to vinc .Error:",err)
		return
	}


	components := []string{"area", "room", "devices"}

	//shortc , err := vc.GetShortcuts()
	msg , err := vc.GetMessage(components)
	if err != nil {
		fmt.Println("Can't get shortcuts .Error:",err)
		return
	}
	fmt.Println("Shortcuts:",msg)
	vc.Stop()

}

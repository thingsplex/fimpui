package model

import (
	"github.com/futurehomeno/fimpgo/discovery"
)

func GetDiscoveryResource() discovery.Resource {
	return discovery.Resource{
		ResourceName:           ServiceName,
		ResourceType:           discovery.ResourceTypeApp,
		ResourceFullName:       "",
		Description:            "",
		Author:                 "aleksandrs.livincovs@gmail.com",
		Version:                "1",
		PackageName:            "",
		State:                  "",
		AppInfo:                discovery.AppInfo{},
		ConfigRequired:         false,
		Configs:                nil,
		Props:                  nil,
		DocUrl:                 "",
		IsInstanceConfigurable: true,
		InstanceId:             "1",
	}

}

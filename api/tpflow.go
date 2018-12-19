package api

import (
	"encoding/json"
	"github.com/alivinco/tpflow/api/client"
	"github.com/alivinco/tpflow/model"
	"github.com/labstack/echo"
	"github.com/labstack/gommon/log"
	"io/ioutil"
	"net/http"
)

func RegisterTpFlowApi(e *echo.Echo,api *client.ApiRemoteClient) {
	e.GET("/fimp/flow/list", func(c echo.Context) error {
		resp,err := api.GetListOfFlows()
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}

	})
	e.GET("/fimp/flow/definition/:id", func(c echo.Context) error {
		id := c.Param("id")
		resp,err := api.GetFlowDefinition(id)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/connector/template/:id", func(c echo.Context) error {
		id := c.Param("id")
		resp,err := api.GetConnectorTemplate(id)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/connector/plugins", func(c echo.Context) error {
		resp,err := api.GetConnectorPlugins()
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/connector/list", func(c echo.Context) error {
		resp,err := api.GetConnectorInstances()
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.POST("/fimp/flow/definition/:id", func(c echo.Context) error {
		//id := c.Param("id")
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		resp,err := api.UpdateFlowBin(body)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.PUT("/fimp/flow/definition/import", func(c echo.Context) error {
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}
		resp,err := api.ImportFlow(body)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}

	})

	e.PUT("/fimp/flow/definition/import_from_url", func(c echo.Context) error {
		var request map[string]string
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}

		err = json.Unmarshal(body, &request)
		if err != nil {
			log.Error("Can't parse request ", err)
		}
		url , _ := request["Url"]
		token, _ := request["Token"]
		resp,err := api.ImportFlowFromUrl(url,token)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.POST("/fimp/flow/ctrl/:id/:op", func(c echo.Context) error {
		id := c.Param("id")
		op := c.Param("op")

		resp,err := api.ControlFlow(op,id)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.DELETE("/fimp/flow/definition/:id", func(c echo.Context) error {
		id := c.Param("id")
		resp,err := api.DeleteFlow(id)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/flow/context/:flowid", func(c echo.Context) error {
		flowid := c.Param("flowid")

		resp,err := api.ContextGetRecords(flowid)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.POST("/fimp/api/flow/context/record/:flowid", func(c echo.Context) error {
		flowId := c.Param("flowid")
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return err
		}
		rec := model.ContextRecord{}
		err = json.Unmarshal(body, &rec)
		if err != nil {
			log.Error("<ContextApi> Can't unmarshal context record.")
			return err
		}
		resp,err := api.ContextUpdateRecord(flowId,&rec)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.DELETE("/fimp/api/flow/context/record/:flowid/:name", func(c echo.Context) error {
		// flowId is variable name here
		name := c.Param("name")
		flowId := c.Param("flowid")
		log.Info("<ctx> Request to delete record with name ", name)
		if name != "" && flowId !="" {
			resp,err := api.ContextDeleteRecord(name,flowId)
			if err == nil {
				return c.JSON(http.StatusOK, resp)
			}else {
				return c.JSON(http.StatusInternalServerError, err)
			}
		}
		return c.JSON(http.StatusOK, nil)
	})


	e.GET("/fimp/api/registry/things", func(c echo.Context) error {
		thingsWithLocation,err := api.RegistryGetListOfThings()
		if err == nil {
			return c.JSON(http.StatusOK, thingsWithLocation)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/registry/thing/:tech/:address", func(c echo.Context) error {
		things, err := api.RegistryGetThing(c.Param("tech"), c.Param("address"))
		if err == nil {
			return c.JSON(http.StatusOK, things)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}

	})

	e.GET("/fimp/api/registry/services", func(c echo.Context) error {
		serviceName := c.QueryParam("serviceName")
		locationIdStr := c.QueryParam("locationId")
		thingIdStr := c.QueryParam("thingId")
		filterWithoutAliasStr := c.QueryParam("filterWithoutAlias")
		services,err := api.RegistryGetListOfServices(serviceName,locationIdStr,thingIdStr,filterWithoutAliasStr)
		if err == nil {
			return c.JSON(http.StatusOK, services)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.GET("/fimp/api/registry/service", func(c echo.Context) error {
		serviceAddress := c.QueryParam("address")
		services,err := api.RegistryGetService(serviceAddress)
		if err == nil {
			return c.JSON(http.StatusOK, services)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.PUT("/fimp/api/registry/service", func(c echo.Context) error {
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		log.Info("<tpflow> Saving service")
		resp,err := api.RegistryUpdateServiceBin(body)
		if err == nil {
			return c.JSON(http.StatusOK,resp)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
		return c.NoContent(http.StatusOK)

	})

	e.PUT("/fimp/api/registry/location", func(c echo.Context) error {
		body, err := ioutil.ReadAll(c.Request().Body)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		log.Info("<tpflow> Saving location")
		resp,err := api.RegistryUpdateLocationBin(body)
		if err == nil {
			return c.JSON(http.StatusOK,resp)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
		return c.NoContent(http.StatusOK)
	})

	e.GET("/fimp/api/registry/locations", func(c echo.Context) error {
		locations,err := api.RegistryGetListOfLocations()
		if err == nil {
			return c.JSON(http.StatusOK, locations)
		} else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.DELETE("/fimp/api/registry/thing/:id", func(c echo.Context) error {
		idStr := c.Param("id")
		resp,err := api.RegistryDeleteThing(idStr)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})

	e.DELETE("/fimp/api/registry/location/:id", func(c echo.Context) error {
		idStr := c.Param("id")
		resp,err := api.RegistryDeleteLocation(idStr)
		if err == nil {
			return c.JSON(http.StatusOK, resp)
		}else {
			return c.JSON(http.StatusInternalServerError, err)
		}
	})



}
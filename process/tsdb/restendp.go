package tsdb

import (
	"net/http"

	"strconv"

	log "github.com/Sirupsen/logrus"
	"github.com/labstack/echo"
)

type DefaultResponse struct {
	ID   IDt
	Code int
	Msg  string
}

type ProcCtlRequest struct {
	Action string
}

type ProcMonitoringResp struct {
	ProcID    IDt
	ProcName  string
	State     string
	LastError string
}

// IntegrationAPIRestEndp admin REST api implementation
type IntegrationAPIRestEndp struct {
	integr *Integration
	Echo   *echo.Echo
}

func (endp *IntegrationAPIRestEndp) SetupRoutes() {
	endp.Echo.GET("/fimproc/tsdb/api/proc/:id", endp.getProcessEndpoint)
	endp.Echo.GET("/fimproc/tsdb/api/proc/monitoring", endp.procMonitoringEndpoint)
	endp.Echo.DELETE("/fimproc/tsdb/api/proc/:id", endp.removeProcessEndpoint)
	endp.Echo.PUT("/fimproc/tsdb/api/proc", endp.addProcessEndpoint)
	endp.Echo.POST("/fimproc/tsdb/api/proc/:id", endp.updateProcessConfigEndpoint)
	endp.Echo.POST("/fimproc/tsdb/api/proc/:id/ctl", endp.ctlProcessEndpoint)

	endp.Echo.GET("/fimproc/tsdb/api/proc/:id/filters", endp.getFiltersEndpoint)
	endp.Echo.PUT("/fimproc/tsdb/api/proc/:id/filters", endp.addFilterEndpoint)
	endp.Echo.DELETE("/fimproc/tsdb/api/proc/:id/filters/:fid", endp.removeFilterEndpoint)

	endp.Echo.GET("/fimproc/tsdb/api/proc/:id/selectors", endp.getSelectorsEndpoint)
	endp.Echo.PUT("/fimproc/tsdb/api/proc/:id/selectors", endp.addSelectorEndpoint)
	endp.Echo.DELETE("/fimproc/tsdb/api/proc/:id/selectors/:sid", endp.removeSelectorEndpoint)

	endp.Echo.PUT("/fimproc/tsdb/api/proc/:id/measurements", endp.addMeasurementEndpoint)
	endp.Echo.DELETE("/fimproc/tsdb/api/proc/:id/measurements/:sid", endp.removeMeasurementEndpoint)
}
func (endp *IntegrationAPIRestEndp) ctlProcessEndpoint(c echo.Context) error {
	log.Info("ctlProcessEndpoint")
	req := ProcCtlRequest{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	if err = c.Bind(&req); err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	if proc == nil {
		return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Process doesn't exist."})
	}
	switch req.Action {
	case "start":
		err = proc.Init()
		if err == nil {
			err = proc.Start()
		}
		break
	case "stop":
		err = proc.Stop()
		break

	case "state":
		return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: proc.State})

	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Action executed"})
}

func (endp *IntegrationAPIRestEndp) procMonitoringEndpoint(c echo.Context) error {
	log.Info("procMonitoringEndpoint")
	procMonitor := []ProcMonitoringResp{}
	for i := range endp.integr.processes {
		procMonitorResp := ProcMonitoringResp{
			endp.integr.processes[i].Config.ID,
			endp.integr.processes[i].Config.Name,
			endp.integr.processes[i].State,
			endp.integr.processes[i].LastError,
		}
		procMonitor = append(procMonitor, procMonitorResp)
	}
	return c.JSON(http.StatusOK, procMonitor)
}

func (endp *IntegrationAPIRestEndp) addFilterEndpoint(c echo.Context) error {
	log.Info("addFilterEndpoint")
	filter := Filter{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	if err := c.Bind(&filter); err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	newID := proc.AddFilter(filter)
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: newID, Msg: "Filter added."})
}
func (endp *IntegrationAPIRestEndp) removeFilterEndpoint(c echo.Context) error {
	log.Info("removeFilterEndpoint")
	// filter := Filter{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	filterID, err := strconv.Atoi(c.Param("fid"))
	if err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	proc.RemoveFilter(IDt(filterID))
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Filter removed."})
}
func (endp *IntegrationAPIRestEndp) getProcessEndpoint(c echo.Context) error {
	log.Info("getProcessEndpoint")
	resp := []ProcessConfig{}
	// var procID IDt
	// var err error
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.NoContent(http.StatusNoContent)
	}
	log.Infof("Getting filters for process = %d", IDt(procID))
	for _, proc := range endp.integr.processConfigs {
		if (proc.ID == IDt(procID)) || (proc.ID == 0) {
			// log.Debugf("Proc = %+v", proc.Config)
			resp = append(resp, proc)
		}

	}
	return c.JSON(http.StatusOK, resp)
}
func (endp *IntegrationAPIRestEndp) getFiltersEndpoint(c echo.Context) error {
	log.Info("getFiltersEndpoint")
	resp := []Filter{}
	// var procID IDt
	// var err error
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.NoContent(http.StatusNoContent)
	}
	log.Infof("Getting filters for process = %d", IDt(procID))
	for _, proc := range endp.integr.processes {
		if (proc.Config.ID == IDt(procID)) || (proc.Config.ID == 0) {
			// log.Debugf("Proc = %+v", proc.Config)
			resp = append(resp, proc.GetFilters()...)
		}

	}
	return c.JSON(http.StatusCreated, resp)
	// return nil
}
func (endp *IntegrationAPIRestEndp) getSelectorsEndpoint(c echo.Context) error {
	log.Info("getSelectorssEndpoint")
	resp := []Selector{}
	// var procID IDt
	// var err error
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.NoContent(http.StatusNoContent)
	}
	log.Infof("Getting filters for process = %d", IDt(procID))
	for _, proc := range endp.integr.processes {
		if (proc.Config.ID == IDt(procID)) || (proc.Config.ID == 0) {
			// log.Debugf("Proc = %+v", proc.Config)
			resp = append(resp, proc.GetSelectors()...)
		}

	}
	return c.JSON(http.StatusOK, resp)
}
func (endp *IntegrationAPIRestEndp) addSelectorEndpoint(c echo.Context) error {
	log.Info("addSelectorEndpoint")
	selector := Selector{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	if err := c.Bind(&selector); err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	newID := proc.AddSelector(selector)
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: newID, Msg: "Selector added."})
}
func (endp *IntegrationAPIRestEndp) removeSelectorEndpoint(c echo.Context) error {
	log.Info("removeSelectorEndpoint")
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	selectorID, err := strconv.Atoi(c.Param("sid"))
	if err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	proc.RemoveSelector(IDt(selectorID))
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Selector removed."})
}

func (endp *IntegrationAPIRestEndp) addMeasurementEndpoint(c echo.Context) error {
	log.Info("addMeasurementEndpoint")
	selector := Measurement{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	if err := c.Bind(&selector); err != nil {
		return err
	}
	proc := endp.integr.GetProcessByID(IDt(procID))
	proc.AddMeasurement(selector)
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: -1, Msg: "Measurement added."})
}

func (endp *IntegrationAPIRestEndp) removeMeasurementEndpoint(c echo.Context) error {
	log.Info("removeMeasurementEndpoint")
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	selectorID := c.Param("sid")
	proc := endp.integr.GetProcessByID(IDt(procID))
	proc.RemoveMeasurement(selectorID)
	endp.integr.SaveConfigs()
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Measurement removed."})
}

func (endp *IntegrationAPIRestEndp) addProcessEndpoint(c echo.Context) error {
	log.Info("addProcessEndpoint")
	procConf := ProcessConfig{}
	if err := c.Bind(&procConf); err != nil {
		return err
	}
	newID, err := endp.integr.AddProcess(procConf)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, DefaultResponse{ID: newID, Msg: "Project added."})
}
func (endp *IntegrationAPIRestEndp) updateProcessConfigEndpoint(c echo.Context) error {
	log.Info("updateProcessConfigEndpoint")
	procConf := ProcessConfig{}
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	if err := c.Bind(&procConf); err != nil {
		return err
	}
	procConf.ID = IDt(procID)
	err = endp.integr.UpdateProcConfig(IDt(procID), procConf, false)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Project reconfigured."})
}
func (endp *IntegrationAPIRestEndp) removeProcessEndpoint(c echo.Context) error {
	log.Info("removeProcessEndpoint")
	procID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}
	err = endp.integr.RemoveProcess(IDt(procID))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, DefaultResponse{ID: IDt(procID), Msg: "Project removed."})
}

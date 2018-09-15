package utils

import (
	"os"
	"bytes"
	"bufio"
	"github.com/buger/jsonparser"
)


type LogFilter struct {
	Component string
	FlowId string
}



func GetLogs(logFile string,filter *LogFilter,limit int64,isLogJsonFormated bool) []byte {
	file, err := os.Open(logFile)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	buf := make([]byte, limit)
	stat, err := os.Stat(logFile)
	start := stat.Size() - limit
	_, err = file.ReadAt(buf, start)
	//if err == nil {
	//	if filter.FlowId == "" {
	//		return buf
	//	}
	//}

	if err != nil {
		return nil
	}

	bytesReader := bytes.NewReader(buf)
	scanner := bufio.NewScanner(bytesReader)
	result := []byte{'['}
	scanner.Scan() // skipping first line in case if it's incomplete
	for scanner.Scan() {
		if filter.FlowId == "" {
			result = append(result, scanner.Bytes()...)
			result = append(result,',')
		}else {
			flowId ,err := jsonparser.GetString(scanner.Bytes(),"fid")
			if err == nil && flowId == filter.FlowId {
				result = append(result, scanner.Bytes()...)
				result = append(result,',')

			}
		}

	}
	result[len(result)-1]= ']'
	return result
}


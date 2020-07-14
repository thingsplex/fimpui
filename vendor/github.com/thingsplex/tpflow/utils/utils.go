package utils

import (
	"github.com/dchest/uniuri"
	"github.com/pkg/errors"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
)

func GenerateId(len int) string {
	return uniuri.NewLen(len)
}

func GenerateRandomNumber() int32 {
	s1 := rand.NewSource(time.Now().UnixNano())
	r1 := rand.New(s1)
	return r1.Int31()
}

func ConfigValueToNumber(valueType string, value interface{}) (float64, error) {
	if valueType == "int" {
		switch val := value.(type) {
		case int :
			return float64(val), nil
		case int16:
			return float64(val), nil
		case int64:
			return float64(val), nil
		case float32:
			return float64(val), nil
		case float64:
			return val, nil
		default:
			return 0, errors.New("can't convert interface{} to float64")

		}
	} else if valueType == "float" {
		floatVal, ok := value.(float64)
		if ok {
			return floatVal, nil
		} else {
			return 0, errors.New("Can't convert interface{} to float64")
		}
	}
	return 0, errors.New("not numeric value type")
}

func IsNumber(valueType string) bool {
	switch valueType {
	case "int":
		return true
	case "float":
		return true
	default:
		return false
	}
}

func match(route []string, topic []string) bool {
	if len(route) == 0 {
		if len(topic) == 0 {
			return true
		}
		return false
	}

	if len(topic) == 0 {
		if route[0] == "#" {
			return true
		}
		return false
	}

	if route[0] == "#" {
		return true
	}

	if (route[0] == "+") || (route[0] == topic[0]) {
		return match(route[1:], topic[1:])
	}

	return false
}

func RouteIncludesTopic(route, topic string) bool {
	return match(strings.Split(route, "/"), strings.Split(topic, "/"))
}

func DownloadFileFromUrl(filepath string, url string) error {

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	return nil
}

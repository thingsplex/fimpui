package zwave

import (
	"encoding/json"
	log "github.com/sirupsen/logrus"
	"golang.org/x/net/context"
	"io/ioutil"
	"os"
)


type ProductCloudStore struct {
	ctx    context.Context
	productDir string
	bucketName string
}

type Template struct {
	Alias string     `json:"alias"`
	FileName string  `json:"file_name"`
}

func NewProductCloudStore(productDir string,bucketName string) (*ProductCloudStore,error) {
	var err error
	pcs := ProductCloudStore{productDir:productDir,bucketName:bucketName}

	pcs.ctx = context.Background()
	return &pcs,err
}

func(cl *ProductCloudStore) ListTemplates(returnStable bool) ([]Template,error ){
	path:= cl.productDir
	if !returnStable {
		path = cl.productDir+"/cache"
	}
	files, err := ioutil.ReadDir(path)
	if err != nil {
		log.Error(err)
		return nil,err
	}
	var result []Template
	for _, file := range files {
		if !file.IsDir(){
			bfile,_ := ioutil.ReadFile(path+"/"+file.Name())
			template := Template{}
			json.Unmarshal(bfile,&template)
			template.FileName = file.Name()
			result = append(result,template)
		}

	}
	return result,nil
}
func(cl *ProductCloudStore) getFullPath(isStable bool,fileName string) string {
	if isStable {
		return cl.productDir+"/"+fileName
	}else {
		return cl.productDir+"/cache/"+fileName
	}
}

func(cl *ProductCloudStore) DeleteTemplate(isStable bool,fileName string ) error {
	templatePath := cl.getFullPath(isStable,fileName)
	return os.Remove(templatePath)
}

func(cl *ProductCloudStore) GetTemplate(isStable bool,fileName string) ([]byte,error) {
	templatePath := cl.getFullPath(isStable,fileName)
	return ioutil.ReadFile(templatePath)
}

func(cl *ProductCloudStore) MoveToStable(fileName string ) error {
	oldPath := cl.productDir+"/cache/"+fileName
	newPath := cl.productDir+"/"+fileName
	return os.Rename(oldPath,newPath)
}

func(cl *ProductCloudStore) UpdateTemplate(isStable bool,fileName string,content []byte) error {
	templatePath := cl.getFullPath(isStable,fileName)
	return ioutil.WriteFile(templatePath,content,0777)
}

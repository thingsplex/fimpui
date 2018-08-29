package zwave

import (
	"strings"
	"io/ioutil"
	log "github.com/Sirupsen/logrus"
	"path/filepath"
	"cloud.google.com/go/storage"
	"golang.org/x/net/context"
	"fmt"
	"google.golang.org/api/iterator"
	"encoding/json"
	"os"
)


type ProductCloudStore struct {
	bucket *storage.BucketHandle
	ctx    context.Context
	client *storage.Client
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
	pcs.client, err = storage.NewClient(pcs.ctx)
	if err != nil {
		fmt.Println("Failed to create client: %v", err)
		return &pcs, err
	}
	pcs.bucket = pcs.client.Bucket(bucketName)
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

func(cl *ProductCloudStore) DownloadProductsFromCloud() ([]string,error){
	it := cl.bucket.Objects(cl.ctx,&storage.Query{Prefix:"stable/"})
	var prodNames []string
	var err error
	for {
		objAttrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Error("Can't download products . Error :",err)
		}

		log.Debug("Object found : ",objAttrs.Name)
		prodNames = append(prodNames,objAttrs.Name)
		objReader,err := cl.bucket.Object(objAttrs.Name).NewReader(cl.ctx)
		binObj, err := ioutil.ReadAll(objReader)
		name := strings.Replace(objAttrs.Name,"stable/","",-1)
		err = ioutil.WriteFile(cl.productDir+"/"+name,binObj,0777)
		if err != nil {
			log.Error("Can't save file . Error :",err)
		}
		objReader.Close()

	}
	return prodNames, err
}

func (cl *ProductCloudStore) UploadSingleProductToStageCloud(fileName string) error {
	log.Info("<ProductCloudStore> Uploading file : ",fileName)
	err := cl.UploadTextFileToObject("stage",fileName,filepath.Join(cl.productDir,fileName),nil)
	if err != nil {
		log.Error("<ProductCloudStore> Can't upload file . Error:",err)
	}
	return err
}

func (cl *ProductCloudStore) UploadProductCacheToCloud() error {
	files, err := ioutil.ReadDir(cl.productDir+"/cache")
	if err != nil {
		log.Error(err)
		return err
	}
	for _, file := range files {
		if strings.Contains(file.Name(),".json"){
			log.Info("<ProductCloudStore> Uploading file : ",file.Name())
			err := cl.UploadTextFileToObject("stage",file.Name(),filepath.Join(cl.productDir+"/cache",file.Name()),nil)
			if err != nil {
				log.Error("<ProductCloudStore> Can't upload file . Error:",err)
			}
		}
	}
	return nil
}

func (ost *ProductCloudStore) UploadTextFileToObject(objectPath string,objectName string,filePath string,metadata map[string]string) error {
	fileBody, err := ioutil.ReadFile(filePath)
	name := objectPath +"/"+ objectName
	wc := ost.bucket.Object(name).NewWriter(ost.ctx)
	wc.ContentType = "text/plain"
	if metadata != nil {
		wc.Metadata = metadata
	}
	if _, err := wc.Write(fileBody); err != nil {
		fmt.Printf("createFile: unable to write data to bucket %q, file %q: %v", ost.bucket, "test", err)
		return err
	}
	err = wc.Close()
	if err != nil {
		fmt.Println("Failed to create object: %v", err)
	}

	return nil
}